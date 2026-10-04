import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import Product from "../models/Product.js";
import Feedback from "../models/Feedback.js";
import Order from "../models/Order.js";
import logger from "../utils/logger.js";
import { productUpload } from "../middleware/uploadMiddleware.js";

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

export const getAllProducts = asyncHandler(async (req, res) => {
  const { category, search, minPrice, maxPrice, brand, sortBy, sort, includeAll, isParent, seller } = req.query;
  let query = {};

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
  if (brand) query.brand = brand;
  if (search) query.name = { $regex: search, $options: "i" };
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  let productsQuery = Product.find(query).populate("variants");
  const effectiveSort = sortBy || sort;
  if (effectiveSort === "price-asc") productsQuery.sort({ price: 1 });
  else if (effectiveSort === "price-desc") productsQuery.sort({ price: -1 });
  else if (effectiveSort === "sellingPrice-asc") productsQuery.sort({ sellingPrice: 1 });
  else if (effectiveSort === "sellingPrice-desc") productsQuery.sort({ sellingPrice: -1 });
  else if (effectiveSort === "newest") productsQuery.sort({ createdAt: -1 });
  else if (effectiveSort === "rating") productsQuery.sort({ rating: -1 });

  const products = await productsQuery;
  const formattedProducts = products.map((p) => ({
    ...p.toObject(),
    productName: p.name,
    productId: p._id.toString(),
  }));
  res.json({ success: true, products: formattedProducts });
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
  res.json({
    success: true,
    product: {
      ...product.toObject(),
      productName: product.name,
      productId: product._id.toString(),
    },
  });
});

export const getProductsByCategory = asyncHandler(async (req, res) => {
  const products = await Product.find({
    category: req.params.category,
    status: { $in: ["active", "ready"] },
  });
  const formattedProducts = products.map((p) => ({
    ...p.toObject(),
    productName: p.name,
    productId: p._id.toString(),
  }));
  res.json({ success: true, products: formattedProducts });
});

export const getProductsByIds = asyncHandler(async (req, res) => {
  const ids = req.query.ids?.split(",");
  if (!ids) {
    res.status(400);
    throw new Error("IDs required");
  }
  const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
  const products = await Product.find({ _id: { $in: validIds } });
  const formattedProducts = products.map((p) => ({
    ...p.toObject(),
    productName: p.name,
    productId: p._id.toString(),
  }));
  res.json({ success: true, products: formattedProducts });
});

export const addproduct = asyncHandler(async (req, res) => {
  const productData = { ...req.body };
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
  res.status(201).json({
    success: true,
    product: {
      ...product.toObject(),
      productName: product.name,
      productId: product._id.toString(),
    },
  });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const productData = { ...req.body };
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

  const updated = await Product.findByIdAndUpdate(req.params.id, productData, { 
    new: true, 
    runValidators: true 
  });
  res.json({
    success: true,
    product: {
      ...updated.toObject(),
      productName: updated.name,
      productId: updated._id.toString(),
    },
  });
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
    await Product.findByIdAndDelete(req.params.id);
    if (product.isVariantParent && product.variants?.length > 0) {
      const Variant = mongoose.model("Variant");
      await Variant.deleteMany({ _id: { $in: product.variants } });
    }
    res.json({ success: true, message: "Product deleted" });
  } catch (error) {
    logger.error("Delete product error:", error);
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

  const brandProducts = await Product.find({ brand }).select("_id");
  const productIds = brandProducts.map((p) => p._id);

  if (productIds.length === 0) {
    return res.json({
      success: true,
      stats: { rating: 0, shipOnTime: 0, totalOrders: 0 },
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

  res.json({ success: true, stats: { rating, shipOnTime, totalOrders } });
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
  const formattedRecommendations = recommendations.map((p) => ({
    ...p.toObject(),
    productName: p.name,
    productId: p._id.toString(),
  }));
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
  product.approvedByAdmin = true;
  product.status = "active";
  await product.save();
  res.json({ success: true, product });
});

