import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import Product from "../models/Product.js";
import Seller from "../models/Seller.js";
import Category from "../models/Category.js";
import Feedback from "../models/Feedback.js";
import Order from "../models/Order.js";
import Notification from "../models/Notification.js";
import Message from "../models/Message.js";
import logger from "../utils/logger.js";
import { emitToUser, emitToAdmins } from "../services/socketService.js";
import { productUpload } from "../middleware/uploadMiddleware.js";
import { recalcParentStock } from "./productVariantController.js";
import { notifyAdminsOfSellerEvent, createSellerAlert } from "./notificationController.js";

export const onUpload = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, message: "No files uploaded" });
  }

  const uploadedUrls = req.files.map(file => `/uploads/${file.filename}`);
  
  const productId = req.params.productId;
  
  // Get existing product and add new images
  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }

  const currentImages = product.images || [];
  const newImages = [...currentImages, ...uploadedUrls];

  await Product.findByIdAndUpdate(productId, { images: newImages }, { new: true });

  logger.info(`Product images uploaded: ${uploadedUrls.length} images for product ${productId}`);
  
  res.json({
    success: true,
    urls: uploadedUrls,
    totalImages: newImages.length,
    message: "Product images uploaded successfully"
  });
});

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Keep the storefront contract: `price` is the list/crossed-out price and
// `sellingPrice` is the price actually charged (stored as `price` in the DB).
const formatProduct = (p) => {
  const doc = typeof p.toObject === "function" ? p.toObject() : { ...p };
  const rawList = doc.originalPrice;
  const charged = doc.price;
  const listPrice =
    rawList != null && Number(rawList) !== Number(charged) ? rawList : null;
  return {
    ...doc,
    price: listPrice != null ? listPrice : charged,
    originalPrice: listPrice,
    sellingPrice: charged,
    productName: doc.name,
    productId: doc._id.toString(),
  };
};

const SORT_FIELDS = {
  "price-asc": { price: 1 },
  "price-desc": { price: -1 },
  "selling-price-asc": { price: 1 },
  "selling-price-desc": { price: -1 },
  "sellingprice-asc": { price: 1 },
  "sellingprice-desc": { price: -1 },
  "sellingPrice-asc": { price: 1 },
  "sellingPrice-desc": { price: -1 },
  newest: { createdAt: -1 },
  "created-at-desc": { createdAt: -1 },
  "createdat-desc": { createdAt: -1 },
  oldest: { createdAt: 1 },
  rating: { rating: -1 },
  name: { name: 1 },
  "name-asc": { name: 1 },
};

const applyFilters = (query, {
  category,
  categories,
  search,
  minPrice,
  maxPrice,
  brand,
  includeAll,
  isParent,
  seller,
  minRating,
  inStock,
}) => {
  if (includeAll !== "true") {
    query.status = { $in: ["active", "ready"] };
    // For public requests, only show admin-approved products
    query.approvedByAdmin = true;
  }

  if (seller) query.seller = seller;

  if (isParent === "true") {
    query.isVariantParent = true;
  } else if (isParent === "false") {
    query.isVariantParent = { $ne: true };
  }

  if (category) query.category = category;

  if (categories) {
    const list = String(categories).split(",").map((c) => c.trim()).filter(Boolean);
    if (list.length > 0) {
      const conditions = [];
      for (const c of list) {
        conditions.push(new RegExp(`^${escapeRegExp(c)}$`, "i"));
      }
      query.category = { $in: conditions };
    }
  }

  if (brand) query.brand = brand;

  if (search) {
    query.name = { $regex: escapeRegExp(search), $options: "i" };
  }

  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  if (minRating !== undefined && minRating !== "" && !Number.isNaN(Number(minRating))) {
    const threshold = Number(minRating);
    if (threshold > 0) {
      query.rating = { $gte: threshold };
    }
  }

  if (inStock === "true") {
    query.stock = { $gt: 0 };
  }

  return query;
};

const normalizeSortParam = (raw) => {
  if (!raw) return null;
  const value = String(raw).trim();
  if (value in SORT_FIELDS) return SORT_FIELDS[value];
  const [field, dir] = value.split(":");
  const direction = dir === "desc" ? -1 : 1;
  const fieldMap = {
    price: "price",
    sellingPrice: "price",
    "selling-price": "price",
    rating: "rating",
    name: "name",
    createdAt: "createdAt",
  };
  if (fieldMap[field]) return { [fieldMap[field]]: direction };
  return null;
};

const paginateResponse = ({ results, totalCount, page, limit }) => ({
  success: true,
  products: results.map(formatProduct),
  page,
  limit,
  totalCount,
  totalPages: Math.max(Math.ceil(totalCount / limit), 1),
  hasNextPage: page < Math.ceil(totalCount / limit),
});

export const getAllProducts = asyncHandler(async (req, res) => {
  const {
    category, categories, search, minPrice, maxPrice, brand,
    sortBy, sort, includeAll, isParent, seller, minRating, inStock, page, limit,
  } = req.query;

  const query = applyFilters({}, {
    category, categories, search, minPrice, maxPrice, brand,
    includeAll, isParent, seller, minRating, inStock,
  });

  const sortSpec = normalizeSortParam(sortBy || sort);
  let base = Product.find(query).populate("variants");
  if (sortSpec) base = base.sort(sortSpec);

  const pageNum = page && Number(page) > 0 ? Math.floor(Number(page)) : null;
  const pageSize = Math.min(Math.max(Number(limit) || 24, 1), 100);

  if (pageNum === null) {
    const products = await base;
    return res.json({ success: true, products: products.map(formatProduct) });
  }

  const [results, totalCount] = await Promise.all([
    base.skip((pageNum - 1) * pageSize).limit(pageSize),
    Product.countDocuments(query),
  ]);
  res.json(paginateResponse({ results, totalCount, page: pageNum, limit: pageSize }));
});

export const productFindById = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(404);
    throw new Error("Product not found");
  }
  const product = await Product.findById(req.params.id).populate("variants");
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  res.json({ success: true, product: formatProduct(product) });
});

export const getProductsByCategory = asyncHandler(async (req, res) => {
  const { sort, sortBy, page, limit } = req.query;
  const raw = String(req.params.category).trim();
  // Products store the category NAME (e.g. "Electronics"), but the route
  // param is the slug (e.g. "electronics"). Resolve it once, case-insensitive.
  let categoryName = raw;
  if (raw) {
    const cat = await Category.findOne({
      $or: [
        { slug: new RegExp(`^${escapeRegExp(raw)}$`, "i") },
        { name: new RegExp(`^${escapeRegExp(raw)}$`, "i") },
      ],
    }).catch(() => null);
    if (cat?.name) categoryName = cat.name;
  }
  const query = applyFilters(
    { category: new RegExp(`^${escapeRegExp(categoryName)}$`, "i") },
    { category: new RegExp(`^${escapeRegExp(categoryName)}$`, "i"), includeAll: "true" }
  );

  let base = Product.find(query).populate("variants");
  const sortSpec = normalizeSortParam(sortBy || sort);
  base = sortSpec ? base.sort(sortSpec) : base.sort("-createdAt");

  const pageNum = page && Number(page) > 0 ? Math.floor(Number(page)) : null;
  const pageSize = Math.min(Math.max(Number(limit) || 24, 1), 100);

  const [results, totalCount] = await Promise.all([
    pageNum === null ? base : base.skip((pageNum - 1) * pageSize).limit(pageSize),
    Product.countDocuments(query),
  ]);

  res.json(paginateResponse({ results, totalCount, page: pageNum ?? 1, limit: pageSize }));
});

export const getProductsByIds = asyncHandler(async (req, res) => {
  const ids = req.query.ids?.split(",");
  if (!ids) {
    res.status(400);
    throw new Error("IDs required");
  }
  const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
  const products = await Product.find({ _id: { $in: validIds } });
  const formattedProducts = products.map(formatProduct);
  res.json({ success: true, products: formattedProducts });
});

// The form sends `highlights[]`; persist it into the model's `tags` array so
// nothing typed by an admin is silently discarded.
const normalizeHighlights = (data) => {
  if (Array.isArray(data.highlights)) {
    data.tags = data.highlights;
  }
  delete data.highlights;
  return data;
};

export const addproduct = asyncHandler(async (req, res) => {
  const productData = normalizeHighlights({ ...req.body });
  if (productData.productName) {
    productData.name = productData.productName;
    delete productData.productName;
  }
  // If seller is creating the product, attach seller and mark for approval
  if (req.user.role === "seller") {
    productData.seller = req.user._id;
    productData.approvedByAdmin = false;
  }
  const product = await Product.create(productData);

  // Notify admins in their Notification center (pending-approvals queue + badge)
  if (req.user.role === "seller") {
    notifyAdminsOfSellerEvent(req.user, `New product "${product.name}" submitted, awaiting approval`);
  }

  res.status(201).json({ success: true, product: formatProduct(product) });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const productData = normalizeHighlights({ ...req.body });
  if (productData.productName) {
    productData.name = productData.productName;
    delete productData.productName;
  }

  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  // Seller can only edit own products
  if (req.user.role === "seller" && product.seller?.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("You can only edit your own products");
  }

  // For variant parents, stock is always the sum of variant stocks — ignore any manual value
  if (product.isVariantParent) {
    delete productData.stock;
  }
  const updated = await Product.findByIdAndUpdate(req.params.id, productData, {
    new: true,
    runValidators: true
  });
  let finalUpdated = updated;
  if (product.isVariantParent) {
    await recalcParentStock(updated._id);
    finalUpdated = await Product.findById(updated._id);
  }
  res.json({ success: true, product: formatProduct(finalUpdated) });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404);
      throw new Error("Product not found");
    }
    // Seller can only delete own products
    if (req.user.role === "seller" && product.seller?.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("You can only delete your own products");
    }
    const wasRejected = req.user.role === "admin" && !product.approvedByAdmin;
    const rejectNotify =
      wasRejected &&
      product.seller && {
        name: product.name,
        sellerId: product.seller,
      };
    await Product.findByIdAndDelete(req.params.id);
    if (product.isVariantParent && product.variants?.length > 0) {
      const Variant = mongoose.model("Variant");
      await Variant.deleteMany({ _id: { $in: product.variants } });
    }

    // Admin rejecting a pending (unapproved) product = the Pending Approvals
    // page "Reject" action. Notify the seller through the existing
    // seller-alert system (badge + live "seller:alert" event). A seller
    // deleting their own product is not a rejection — no notification.
    if (rejectNotify) {
      try {
        // Deduped: one open alert per seller per title+text
        const { notification } = await createSellerAlert({
          user: rejectNotify.sellerId,
          title: "Product Rejected",
          message: `Your product "${rejectNotify.name}" was rejected and removed from the marketplace.`,
        });
        emitToUser(String(rejectNotify.sellerId), "seller:alert", notification);
      } catch (err) {
        logger.error("Failed to notify seller of product rejection:", err);
      }
    }

    if (wasRejected) {
      // Real-time: refresh the admin sidebar Pending Approvals badge
      emitToAdmins("admin:stats-changed", { orderId: product._id, type: "product" });
    }

    res.json({ success: true, message: "Product deleted" });
  } catch (error) {
    logger.error("Delete product error:", error);
    throw error;
  }
});

export const deleteProductsBulk = asyncHandler(async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (ids.length === 0) {
      res.status(400);
      throw new Error("No product ids provided");
    }
    const validIds = ids.filter((id) => mongoose.isValidObjectId(id));
    if (validIds.length === 0) {
      res.status(400);
      throw new Error("No valid product ids provided");
    }

    const toDelete = await Product.find({ _id: { $in: validIds } });
    // Seller can only delete own products; admin can delete anything.
    const forbidden = toDelete.filter(
      (p) => req.user.role === "seller" && p.seller?.toString() !== req.user._id.toString()
    );
    if (forbidden.length > 0) {
      res.status(403);
      throw new Error("You can only delete your own products");
    }
    if (toDelete.length === 0) {
      res.status(404);
      throw new Error("No products found to delete");
    }

    // Collect rejections (admin removing pending/unapproved products) so we
    // can alert the sellers, mirroring the single-delete behaviour.
    const rejections = toDelete.filter(
      (p) => req.user.role === "admin" && !p.approvedByAdmin && p.seller
    );

    await Product.deleteMany({ _id: { $in: toDelete.map((p) => p._id) } });

    // Cascade child variants for parent products (same as single delete).
    const parents = toDelete.filter((p) => p.isVariantParent && p.variants?.length > 0);
    if (parents.length > 0) {
      const Variant = mongoose.model("Variant");
      const variantIds = parents.flatMap((p) => p.variants);
      await Variant.deleteMany({ _id: { $in: variantIds } });
    }

    for (const p of rejections) {
      try {
        // Deduped: one open alert per seller per title+text
        const { notification } = await createSellerAlert({
          user: p.seller,
          title: "Product Rejected",
          message: `Your product "${p.name}" was rejected and removed from the marketplace.`,
        });
        emitToUser(String(p.seller), "seller:alert", notification);
      } catch (err) {
        logger.error("Failed to notify seller of product rejection:", err);
      }
    }

    if (rejections.length > 0) {
      // Real-time: refresh the admin sidebar Pending Approvals badge
      emitToAdmins("admin:stats-changed", { count: rejections.length, type: "product" });
    }

    res.json({ success: true, deleted: toDelete.length });
  } catch (error) {
    logger.error("Bulk delete products error:", error);
    throw error;
  }
});

export const getProductBreadcrumb = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(404);
    throw new Error("Product not found");
  }
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  const Category = mongoose.model("Category");
  const buildChain = async (name) => {
    const cat = await Category.findOne({ name }).populate("parent");
    if (!cat) return [{ name, slug: null }];
    const chain = [{ name: cat.name, slug: cat.slug }];
    let current = cat.parent;
    while (current) {
      chain.unshift({ name: current.name, slug: current.slug });
      current = current.parent;
    }
    return chain;
  };
  const chain = await buildChain(product.category);
  const breadcrumb = [
    { name: "Home", slug: "/" },
    ...chain,
    { name: product.name, slug: null },
  ];
  res.json({ success: true, breadcrumb });
});

export const getRatingsOverview = asyncHandler(async (req, res) => {
  const { productIds } = req.query;
  if (!productIds) return res.json({ success: true, data: {} });
  const ids = productIds.split(",").filter((id) => mongoose.Types.ObjectId.isValid(id));

  const stats = await Feedback.aggregate([
    { $match: { product: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) }, status: "approved" } },
    { $group: {
      _id: "$product",
      avgRating: { $avg: "$rating" },
      totalReviews: { $sum: 1 },
    }},
  ]);

  const result = {};
  stats.forEach((s) => {
    result[s._id.toString()] = { avg: s.avgRating, total: s.totalReviews };
  });
  res.json({ success: true, data: result });
});

export const getSellerStats = asyncHandler(async (req, res) => {
  const { brand } = req.query;
  if (!brand) {
    res.status(400);
    throw new Error("Brand query parameter is required");
  }

  const brandProducts = await Product.find({ brand }).select("_id seller");
  const productIds = brandProducts.map((p) => p._id);
  const brandSellerIds = [
    ...new Set(brandProducts.map((p) => p.seller && String(p.seller)).filter(Boolean)),
  ];

  if (productIds.length === 0) {
    return res.json({
      success: true,
      stats: { rating: 0, shipOnTime: 0, totalOrders: 0, chatResponseRate: null },
    });
  }

  // 1. Rating — avg from approved feedback, converted to 0-100 percentage
  const ratingResult = await Feedback.aggregate([
    {
      $match: { product: { $in: productIds }, status: "approved" },
    },
    { $group: { _id: null, avgRating: { $avg: "$rating" } } },
  ]);

  const avgRating = ratingResult.length > 0 ? ratingResult[0].avgRating : 0;
  const rating = Math.round((avgRating / 5) * 100);

  // 2. Ship-on-time + total orders
  const allBrandOrders = await Order.find({
    "items.product": { $in: productIds },
  });

  const totalOrders = allBrandOrders.length;
  const deliveredOrders = allBrandOrders.filter(
    (o) => o.orderStatus === "delivered"
  ).length;
  const nonCancelledOrders = allBrandOrders.filter(
    (o) => o.orderStatus !== "cancelled"
  ).length;

  const shipOnTime =
    nonCancelledOrders > 0
      ? Math.round((deliveredOrders / nonCancelledOrders) * 100)
      : 0;

  // 3. Chat response rate — % of distinct buyers who messaged the brand's
  // seller(s) in an order conversation (orderRef scope, same rules as the
  // seller dashboard) that received at least one reply from a seller.
  // -> null (UI keeps its "not enough data" fallback) when no buyer messages.
  let chatResponseRate = null;
  if (brandSellerIds.length) {
    const incoming = await Message.find({ orderRef: { $in: allBrandOrders.map((o) => o._id) } }).select("sender");
    const distinctBuyers = new Set(incoming.filter((m) => m.sender).map((m) => m.sender.toString()));
    if (distinctBuyers.size) {
      const repliedBuyers = new Set();
      for (const sellerId of brandSellerIds) {
        const replies = await Message.find({
          sender: new mongoose.Types.ObjectId(sellerId),
          recipient: { $in: [...distinctBuyers] },
        }).select("recipient");
        replies.forEach((m) => m.recipient && repliedBuyers.add(m.recipient.toString()));
      }
      chatResponseRate = Math.round((repliedBuyers.size / distinctBuyers.size) * 100);
    }
  }

  res.json({ success: true, stats: { rating, shipOnTime, totalOrders, chatResponseRate } });
});

export const getProductRecommendations = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  const recommendations = await Product.find({
    category: product.category,
    _id: { $ne: product._id },
    status: { $in: ["active", "ready"] },
  }).limit(parseInt(req.query.limit) || 6);
  const formattedRecommendations = recommendations.map(formatProduct);
  res.json({ success: true, recommendations: formattedRecommendations });
});

// @desc    Admin approve a seller's product
// @route   PUT /api/products/:id/approve
export const adminApproveProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  const wasApproved = product.approvedByAdmin;
  product.approvedByAdmin = true;
  product.status = "active";
  await product.save();

  if (!wasApproved) {
    // Real-time: refresh the admin sidebar Pending Approvals badge
    emitToAdmins("admin:stats-changed", { orderId: product._id, type: "product" });
  }

  // Notify the seller of the approval through the existing seller-alert system
  // (badge + live "seller:alert" event; no duplicate if already approved)
  if (!wasApproved && product.seller) {
    try {
      // Deduped: one open alert per seller per title+text
      const { notification } = await createSellerAlert({
        user: product.seller,
        title: "Product Approved",
        message: `Your product "${product.name}" has been approved and is now live on the marketplace.`,
        product: product._id,
      });
      emitToUser(String(product.seller), "seller:alert", notification);
    } catch (err) {
      logger.error("Failed to notify seller of product approval:", err);
    }
  }

  res.json({ success: true, product: formatProduct(product) });
});

// @desc    Admin approve several seller products at once
// @route   PUT /api/products/bulk/approve
export const approveProductsBulk = asyncHandler(async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  if (ids.length === 0) {
    res.status(400);
    throw new Error("No product ids provided");
  }
  const validIds = ids.filter((id) => mongoose.isValidObjectId(id));
  if (validIds.length === 0) {
    res.status(400);
    throw new Error("No valid product ids provided");
  }

  // Mirror single-product approval (adminApproveProduct) over every id, in one pass.
  const results = await Promise.all(
    validIds.map(async (id) => {
      const product = await Product.findById(id);
      if (!product) return { id, ok: false, reason: "not_found" };
      const wasApproved = product.approvedByAdmin;
      product.approvedByAdmin = true;
      product.status = "active";
      await product.save();

      if (!wasApproved && product.seller) {
        try {
          // Deduped: one open alert per seller per title+text
          const { notification } = await createSellerAlert({
            user: product.seller,
            title: "Product Approved",
            message: `Your product "${product.name}" has been approved and is now live on the marketplace.`,
            product: product._id,
          });
          emitToUser(String(product.seller), "seller:alert", notification);
        } catch (err) {
          logger.error("Failed to notify seller of product approval:", err);
        }
      }
      return { id, ok: true, wasApproved };
    })
  );

  const approved = results.filter((r) => r.ok).length;
  // Real-time: refresh the admin sidebar Pending Approvals badge once for all new approvals (same as single-approve).
  if (results.some((r) => r.ok && !r.wasApproved)) {
    emitToAdmins("admin:stats-changed", { count: approved, type: "product" });
  }

  res.json({ success: true, approved, total: validIds.length });
});

// @desc    Admin: list all unapproved seller products (pending-approval queue)
// @route   GET /api/products/admin/pending-approvals
export const adminGetPendingApprovals = asyncHandler(async (req, res) => {
  const products = await Product.find({ approvedByAdmin: false, seller: { $ne: null } })
    .populate("seller", "name email")
    .select("name price stock category brand sku images status createdAt seller")
    .sort({ createdAt: -1 });

  // Shop info per seller (Seller doc is keyed by user id)
  const sellerUserIds = [...new Set(products.map((p) => p.seller?._id ? String(p.seller._id) : null).filter(Boolean))];
  const sellerDocs = await Seller.find({ user: { $in: sellerUserIds } }).select("user shopName status");
  const sellerMap = new Map(sellerDocs.map((s) => [String(s.user), s]));

  const pending = products.map((p) => {
    const sid = p.seller?._id ? String(p.seller._id) : null;
    const sellerDoc = sid ? sellerMap.get(sid) : null;
    return {
      productId: p._id.toString(),
      name: p.name,
      price: p.price,
      stock: p.stock,
      category: p.category,
      brand: p.brand,
      sku: p.sku,
      status: p.status,
      images: p.images,
      createdAt: p.createdAt,
      sellerId: sid,
      sellerName: p.seller?.name || "",
      sellerEmail: p.seller?.email || "",
      shopName: sellerDoc?.shopName || "",
      sellerStatus: sellerDoc?.status || "",
    };
  });

  res.json({
    success: true,
    count: pending.length,
    products: pending,
  });
});

