import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import Product from "../models/Product.js";
import Variant from "../models/Variant.js";
import logger from "../utils/logger.js";

// Recompute a parent product's total stock from its variants
export const recalcParentStock = async (parentProductId) => {
  try {
    if (!parentProductId || !mongoose.Types.ObjectId.isValid(parentProductId)) return null;
    const parentId = new mongoose.Types.ObjectId(parentProductId);
    const agg = await Variant.aggregate([
      { $match: { parentProduct: parentId } },
      { $group: { _id: null, total: { $sum: "$stock" } } },
    ]);
    const total = agg[0]?.total || 0;
    await Product.findByIdAndUpdate(parentId, { stock: total });
    return total;
  } catch (err) {
    logger.warn(`Failed to recalc parent stock for ${parentProductId}`, { error: err.message });
    return null;
  }
};

export const createParentProduct = asyncHandler(async (req, res) => {
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
  const product = await Product.create({ ...productData, isVariantParent: true });
  res.status(201).json({
    success: true,
    data: {
      _id: product._id.toString(),
      productId: product._id.toString(),
      productName: product.name,
      isParent: true,
      variantAttributes: product.variantAttributes || [],
    },
  });
});

const buildVariantSku = (attributes) => {
  const entries = Object.entries(attributes || {}).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) return "";
  return entries.map(([key, value]) => `${key}_` + String(value)).join("-");
};

const resolveSku = (v, parentProductId) => {
  const suffix = buildVariantSku(v.attributes);
  return v.sku || (suffix ? `SKU-${suffix}-${parentProductId}` : `SKU-${parentProductId}`);
};

let txnCapable = null;
const canUseTransactions = async () => {
  if (txnCapable === null) {
    try {
      const hello = await mongoose.connection.db.adminCommand({ hello: 1 });
      txnCapable = Boolean(hello.isreplicaset);
    } catch {
      txnCapable = false;
    }
  }
  return txnCapable;
};

const saveVariantsAndLink = async (parentProductId, variantsWithSku) => {
  const useTxn = await canUseTransactions();
  if (!useTxn) {
    const docs = await Variant.insertMany(variantsWithSku);
    await Product.findByIdAndUpdate(parentProductId, {
      $push: { variants: { $each: docs.map((v) => v._id) } },
    });
    await recalcParentStock(parentProductId);
    return docs;
  }
  const session = await mongoose.startSession();
  try {
    let docs;
    await session.withTransaction(async () => {
      docs = await Variant.insertMany(variantsWithSku, { session });
      await Product.findByIdAndUpdate(
        parentProductId,
        { $push: { variants: { $each: docs.map((v) => v._id) } } },
        { session }
      );
    });
    await recalcParentStock(parentProductId);
    return docs;
  } finally {
    await session.endSession();
  }
};

export const createVariants = asyncHandler(async (req, res) => {
  const { variants } = req.body;
  if (!variants || !Array.isArray(variants) || variants.length === 0) {
    res.status(400);
    throw new Error("Variants array is required");
  }
  const parentProductId = req.params.parentProductId;
  for (const v of variants) {
    const resolvedSku = resolveSku(v, parentProductId);
    if (await Variant.findOne({ sku: resolvedSku })) {
      res.status(409);
      throw new Error(`Variant with SKU "${resolvedSku}" already exists`);
    }
    if (v.price !== undefined && v.price <= 0 && v.sellingPrice !== undefined && v.sellingPrice <= 0) {
      res.status(400);
      throw new Error("Variant price must be greater than 0");
    }
    if (v.stock !== undefined && v.stock < 0) {
      res.status(400);
      throw new Error("Variant stock cannot be negative");
    }
  }
  const variantsWithSku = variants.map((v) => ({
    ...v,
    parentProduct: parentProductId,
    sku: resolveSku(v, parentProductId),
    variantSku: buildVariantSku(v.attributes),
    price: v.price || v.sellingPrice || 0,
    attributes: v.attributes || {},
    sellingPrice: v.sellingPrice || v.price || 0,
    stock: v.stock ?? 0,
  }));
  let createdVariants;
  try {
    createdVariants = await saveVariantsAndLink(parentProductId, variantsWithSku);
  } catch (err) {
    if (err.code === 11000) {
      res.status(409);
      throw new Error("Duplicate variant: an identical variant already exists for this product");
    }
    throw err;
  }
  res.status(201).json({ success: true, variants: createdVariants });
});

export const generateVariants = asyncHandler(async (req, res) => {
  const { options } = req.body;
  const parentProductId = req.params.parentProductId;
  const variants = [];

  const generate = (optionIndex, current) => {
    if (optionIndex === options.length) {
      variants.push({ ...current, parentProduct: parentProductId });
      return;
    }
    for (const value of options[optionIndex].values) {
      generate(optionIndex + 1, { ...current, [options[optionIndex].name]: value });
    }
  };

  generate(0, {});
  const variantsWithSku = variants.map((v) => {
    const attrs = {};
    for (const opt of options) attrs[opt.name] = v[opt.name];
    return {
      parentProduct: parentProductId,
      sku: resolveSku({ sku: undefined, attributes: attrs }, parentProductId),
      variantSku: buildVariantSku(attrs),
      attributes: attrs,
      price: v.price || 0,
      sellingPrice: v.price || 0,
      stock: v.stock ?? 0,
    };
  });
  const created = await saveVariantsAndLink(parentProductId, variantsWithSku);
  res.status(201).json({ success: true, variants: created });
});

export const getVariantsByParentId = asyncHandler(async (req, res) => {
  const variants = await Variant.find({ parentProduct: req.params.parentProductId });
  res.json({ success: true, variants });
});

export const getVariantBySku = asyncHandler(async (req, res) => {
  const variant = await Variant.findOne({ sku: req.params.sku });
  if (!variant) {
    res.status(404);
    throw new Error("Variant not found");
  }
  res.json({ success: true, variant });
});

export const updateVariant = asyncHandler(async (req, res) => {
  const variant = await Variant.findByIdAndUpdate(req.params.variantId, req.body, {
    new: true,
    runValidators: true,
  });
  if (!variant) {
    res.status(404);
    throw new Error("Variant not found");
  }
  const total = await recalcParentStock(variant.parentProduct);
  res.json({ success: true, variant, totalStock: total ?? undefined });
});

export const updateVariantStock = asyncHandler(async (req, res) => {
  const { stock } = req.body;
  const variant = await Variant.findByIdAndUpdate(
    req.params.variantId,
    { stock },
    { new: true, runValidators: true }
  );
  if (!variant) {
    res.status(404);
    throw new Error("Variant not found");
  }
  const total = await recalcParentStock(variant.parentProduct);
  res.json({ success: true, variant, totalStock: total ?? undefined });
});

export const deleteVariant = asyncHandler(async (req, res) => {
  const variant = await Variant.findByIdAndDelete(req.params.variantId);
  if (!variant) {
    res.status(404);
    throw new Error("Variant not found");
  }
  await Product.findByIdAndUpdate(variant.parentProduct, {
    $pull: { variants: variant._id },
  });
  const total = await recalcParentStock(variant.parentProduct);
  res.json({ success: true, message: "Variant deleted", totalStock: total ?? undefined });
});

export const getProductWithVariants = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(404);
    throw new Error("Product not found");
  }
  const product = await Product.findById(req.params.id).populate("variants").populate("seller", "shopName");

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
      isParent: product.isVariantParent,
      variantAttributes: product.variantAttributes || [],
      sellerShopName: product.seller?.shopName || null,
    },
    variants: product.variants || [],
  });
});

export const checkVariantStock = asyncHandler(async (req, res) => {
  const { items } = req.body;
  const results = await Promise.all(
    items.map(async ({ variantId, quantity }) => {
      const variant = await Variant.findById(variantId);
      return {
        variantId,
        inStock: variant && variant.stock >= quantity,
        availableStock: variant?.stock || 0,
      };
    })
  );
  res.json({ success: true, results });
});


export const batchStockCheck = asyncHandler(async (req, res) => {
  const { productIds } = req.body;
  const products = await Product.find({ _id: { $in: productIds } });
  const stockData = products.map((p) => ({
    productId: p._id.toString(),
    productName: p.name,
    stock: p.stock,
  }));
  res.json({ success: true, stockData });
});
