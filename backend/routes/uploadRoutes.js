import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { singleUpload, profileUpload, settingsUpload, productUpload } from '../middleware/uploadMiddleware.js';
import { uploadToSupabase, deleteFromSupabase } from '../services/storageService.js';
import User from '../models/User.js';
import SiteConfig from '../models/SiteConfig.js';
import Product from '../models/Product.js';
import logger from '../utils/logger.js';

const router = express.Router();

const useCloud = process.env.STORAGE === 'supabase';

// Resolve file path: local filesystem or Supabase URL
const resolveFilePath = async (file, type = 'media') => {
  if (useCloud) {
    return await uploadToSupabase(file, type);
  }
  return `/uploads/${file.filename}`;
};

// Helper to create a success response with uploaded file URL
const handleUploadSuccess = (req, res, filePath) => {
  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';
  const publicUrl = useCloud ? filePath : `${BACKEND_URL}${filePath}`;
  
  logger.info(`File uploaded successfully: ${publicUrl}`);
  
  res.json({
    success: true,
    url: publicUrl,
    filename: filePath,
    message: 'File uploaded successfully'
  });
};

// Helper to handle upload failure
const handleUploadError = (req, res, error) => {
  logger.error(`Upload failed: ${error.message}`);
  res.status(400).json({
    success: false,
    error: error.message || 'File upload failed'
  });
};

/**
 * @route   POST /api/upload/profile
 * @desc    Upload profile picture (requires auth)
 * @access  Private
 */
router.post('/profile', authMiddleware, profileUpload, async (req, res) => {
  if (!req.file) {
    return handleUploadError(req, res);
  }
  
  try {
    const filePath = await resolveFilePath(req.file, 'profiles');
    const userId = req.user._id;
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profileImage: filePath },
      { new: true }
    );
    
    if (!updatedUser) {
      return handleUploadError(req, res, 'User not found');
    }
    
    return handleUploadSuccess(req, res, filePath);
  } catch (err) {
    logger.error('Failed to update user profile:', err);
    return handleUploadError(req, res, err);
  }
});

/**
 * @route   POST /api/upload/settings
 * @desc    Upload site settings logo (requires admin)
 * @access  Private/Admin only
 */
router.post('/settings', authMiddleware, settingsUpload, async (req, res) => {
  const allowedTypes = ['logo'];
  
  if (!allowedTypes.includes(req.body.type)) {
    return handleUploadError(req, res, 'Invalid upload type');
  }

  // Check admin access
  if (req.user.role !== 'admin') {
    return handleUploadError(req, res, 'Only admins can upload settings');
  }

  try {
    let config = await SiteConfig.findOne();
    if (!config) {
      config = await SiteConfig.create({});
    }
    
    // Update based on type
    if (req.body.type === 'logo' && req.file) {
      const filePath = await resolveFilePath(req.file, 'settings');
      config.logo = filePath;
    } else if (req.body.type === 'iconLetter' && req.file) {
      const filePath = await resolveFilePath(req.file, 'settings');
      config.iconLetter = filePath;
    }
    
    await config.save();
    
    return handleUploadSuccess(req, res, config.logo);
  } catch (error) {
    logger.error('Settings upload failed:', error);
    handleUploadError(req, res, error);
  }
});

/**
 * @route   POST /api/upload/media
 * @desc    Upload general media (products, categories, ads, etc.) - public endpoint
 * @access  Public
 */
router.post('/media', singleUpload, async (req, res) => {
  // Rename 'images' to 'file' for backward compatibility with product upload
  if (!req.file && req.body.images?.[0]) {
    req.file = req.body.images[0];
  }

  if (!req.file) {
    return handleUploadError(req, res);
  }

  try {
    const filePath = await resolveFilePath(req.file, 'media');
    return handleUploadSuccess(req, res, filePath);
  } catch (error) {
    logger.error('Media upload failed:', error);
    handleUploadError(req, res, error);
  }
});

/**
 * @route   POST /api/upload/category
 * @desc    Upload category image
 * @access  Public
 */
router.post('/category', singleUpload, async (req, res) => {
  if (!req.file) {
    return handleUploadError(req, res);
  }

  try {
    const filePath = await resolveFilePath(req.file, 'categories');
    return handleUploadSuccess(req, res, filePath);
  } catch (error) {
    logger.error('Category image upload failed:', error);
    handleUploadError(req, res, error);
  }
});

/**
 * @route   POST /api/upload/documents
 * @desc    Upload documents/files (PDFs, etc.)
 * @access  Private
 */
router.post('/documents', authMiddleware, singleUpload, async (req, res) => {
  if (!req.file) {
    return handleUploadError(req, res);
  }

  try {
    const filePath = await resolveFilePath(req.file, 'documents');
    return handleUploadSuccess(req, res, filePath);
  } catch (error) {
    logger.error('Document upload failed:', error);
    handleUploadError(req, res, error);
  }
});

/**
 * @route   POST /api/products/:productId/images
 * @desc    Upload product images (requires auth)
 * @access  Private
 */
router.post('/products/:productId/images', authMiddleware, productUpload, async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return handleUploadError(req, res);
  }

  const productId = req.params.productId;
  
  // Verify product exists and user has permission
  const product = await Product.findById(productId);
  if (!product) {
    return handleUploadError(req, res, 'Product not found');
  }

  if (product.user && product.user.toString() !== req.user._id.toString()) {
    return handleUploadError(req, res, 'Unauthorized to upload images for this product');
  }

  try {
    const uploadedUrls = await Promise.all(
      req.files.map(file => resolveFilePath(file, 'products'))
    );
    
    // Add new images to existing images array
    const currentImages = product.images || [];
    const newImages = [...currentImages, ...uploadedUrls];
    
    await Product.findByIdAndUpdate(productId, { images: newImages }, { new: true });

    logger.info(`Product images uploaded: ${uploadedUrls.length} images for product ${productId}`);
    
    res.json({
      success: true,
      urls: uploadedUrls,
      totalImages: newImages.length,
      message: 'Product images uploaded successfully'
    });
  } catch (error) {
    logger.error('Product image upload failed:', error);
    handleUploadError(req, res, error);
  }
});

/**
 * @route   DELETE /api/products/:productId/images
 * @desc    Delete product images (requires auth)
 * @access  Private/Admin only
 */
router.delete('/products/:productId/images', authMiddleware, async (req, res) => {
  const productId = req.params.productId;
  
  // Verify product exists and user has permission
  const product = await Product.findById(productId);
  if (!product) {
    return handleUploadError(req, res, 'Product not found');
  }

  if (product.user && product.user.toString() !== req.user._id.toString()) {
    return handleUploadError(req, res, 'Unauthorized to delete images for this product');
  }

  const { imageUrlsToDelete } = req.body; // Array of URLs to delete

  try {
    let updatedImages = [...(product.images || [])];
    
    // Remove specified images from array
    const filteredUrls = updatedImages.filter(url => !imageUrlsToDelete.includes(url));
    
    await Product.findByIdAndUpdate(productId, { images: filteredUrls }, { new: true });

    logger.info(`Product images deleted: ${imageUrlsToDelete.length} images for product ${productId}`);
    
    res.json({
      success: true,
      remainingImages: filteredUrls.length,
      message: 'Product images deleted successfully'
    });
  } catch (error) {
    logger.error('Product image deletion failed:', error);
    handleUploadError(req, res, error);
  }
});

/**
 * @route   GET /uploads/*
 * @desc    Serve uploaded files publicly
 * @access  Public
 */
router.use('/serve', express.static('public/uploads'));

export default router;
