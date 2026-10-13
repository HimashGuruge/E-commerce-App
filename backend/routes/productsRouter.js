import express from "express";
import {
  addproduct,
  deleteProduct,
  getAllProducts,
  getProductBreadcrumb,
  getProductRecommendations,
  getProductsByCategory,
  getProductsByIds,
  getRatingsOverview,
  getSellerStats,
  productFindById,
  updateProduct,
  onUpload,
  adminApproveProduct,
  adminGetPendingApprovals,
} from "../controller/productsController.js";
import {
  createParentProduct,
  createVariants,
  generateVariants,
  getVariantsByParentId,
  getVariantBySku,
  updateVariant,
  updateVariantStock,
  deleteVariant,
  getProductWithVariants,
  checkVariantStock,
  batchStockCheck,
} from "../controller/productVariantController.js";
import authMiddleware, { adminOnly, sellerOrAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes (no auth required)
// Specific routes must come before parameterized routes
router.get("/", getAllProducts);
router.get("/category/:category", getProductsByCategory);
router.get("/by-ids", getProductsByIds); // IDs filter endpoint
router.get("/ratings-overview", getRatingsOverview); // Rating stats for product list
router.get("/seller-stats", getSellerStats); // Aggregated seller stats by brand

// Variant routes MUST come BEFORE :id routes to avoid conflicts
router.get("/:id/with-variants", getProductWithVariants);

// Recommendations endpoint - specific path before :id
router.get("/:id/recommendations", getProductRecommendations);
router.get("/:id/breadcrumb", getProductBreadcrumb);
router.get("/:id", productFindById); // Dynamic route

// Admin/Seller routes
router.get("/admin/pending-approvals", adminOnly, adminGetPendingApprovals);
router.post("/", sellerOrAdmin, addproduct);
router.patch("/:id", sellerOrAdmin, updateProduct);
router.delete("/:id", sellerOrAdmin, deleteProduct);
router.put("/:id/approve", adminOnly, adminApproveProduct);

// Product image upload endpoint
router.post("/:productId/images", authMiddleware, onUpload);

// Variant routes (parent-child product system)
router.post("/parent", sellerOrAdmin, createParentProduct);
router.get("/:parentProductId/variants", getVariantsByParentId);
router.post("/:parentProductId/variants", sellerOrAdmin, createVariants);
router.post("/:parentProductId/variants/generate", sellerOrAdmin, generateVariants);
router.patch("/variants/:variantId", sellerOrAdmin, updateVariant);
router.patch("/variants/:variantId/stock", sellerOrAdmin, updateVariantStock);
router.delete("/variants/:variantId", sellerOrAdmin, deleteVariant);
router.get("/variants/sku/:sku", getVariantBySku);
router.post("/check-variant-stock", checkVariantStock);
router.post("/batch-stock-check", batchStockCheck);

export default router;


