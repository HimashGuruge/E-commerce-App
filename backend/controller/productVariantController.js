import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import Product from "../models/Product.js";
import Variant from "../models/Variant.js";

export const createParentProduct = asyncHandler(async (req, res) => {
  const productData = { ...req.body };
  if (productData.productName) {
    productData.name = productData.productName;
    delete productData.productName;
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

export const createVariants = asyncHandler(async (req, res) => {
  const { variants } = req.body;
  if (!variants || !Array.isArray(variants) || variants.length === 0) {
    res.status(400);
    throw new Error("Variants array is required");
  }
  const parentProductId = req.params.parentProductId;
  for (const v of variants) {
    if (v.price !== undefined && v.price <= 0 && v.sellingPrice !== undefined && v.sellingPrice <= 0) {
      res.status(400);
      throw new Error("Variant price must be greater than 0");
    }
    if (v.stock !== undefined && v.stock < 0) {
      res.status(400);
      throw new Error("Variant stock cannot be negative");
    }
  }
  const variantsWithSku = variants.map((v, idx) => ({
    ...v,
    parentProduct: parentProductId,
    sku: v.sku || `SKU-${parentProductId}-${idx + 1}`,
    price: v.price || v.sellingPrice || 0,
    attributes: v.attributes || {},
    sellingPrice: v.sellingPrice || v.price || 0,
    stock: v.stock ?? 0,
  }));
  const createdVariants = await Variant.insertMany(variantsWithSku);
  await Product.findByIdAndUpdate(parentProductId, {
    $push: { variants: { $each: createdVariants.map((v) => v._id) } },
  });
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
  const variantsWithSku = variants.map((v, idx) => ({
    ...v,
    sku: `SKU-${parentProductId}-gen-${idx + 1}`,
    stock: v.stock ?? 0,
  }));
  const created = await Variant.insertMany(variantsWithSku);
  await Product.findByIdAndUpdate(parentProductId, {
    $push: { variants: { $each: created.map((v) => v._id) } },
  });
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
  });
  if (!variant) {
    res.status(404);
    throw new Error("Variant not found");
  }
  res.json({ success: true, variant });
});

export const updateVariantStock = asyncHandler(async (req, res) => {
  const { stock } = req.body;
  const variant = await Variant.findByIdAndUpdate(
    req.params.variantId,
    { stock },
    { new: true }
  );
  if (!variant) {
    res.status(404);
    throw new Error("Variant not found");
  }
  res.json({ success: true, variant });
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
  res.json({ success: true, message: "Variant deleted" });
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
