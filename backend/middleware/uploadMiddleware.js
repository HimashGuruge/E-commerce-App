import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import multer from 'multer';

// Get directory name for uploads root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Allowed MIME types based on file fieldname
const getFileType = (fieldname) => {
  if (fieldname === 'profileImage') return 'profile';
  if (fieldname === 'logo') return 'settings';
  if (fieldname === 'categoryImage') return 'category';
  return 'media';
};

const allowedImageMimes = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif'
];

const allowedPdfMimes = ['application/pdf'];

// Storage configuration - local filesystem or memory (for cloud uploads)
const useCloud = process.env.STORAGE === 'supabase';

const storage = useCloud
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: function (req, file, cb) {
        cb(null, './public/uploads/');
      },
      
      filename: function (req, file, cb) {
        const timestamp = Date.now();
        const randomHash = Math.random().toString(36).substring(2, 10);
        let ext = path.extname(file.originalname).toLowerCase();
        
        if (!ext || ext === '.') {
          const mimeMap = {
            'image/jpeg': '.jpg',
            'image/jpg': '.jpg',
            'image/png': '.png',
            'image/webp': '.webp',
            'image/gif': '.gif',
            'image/heic': '.heic',
            'image/heif': '.heif',
            'application/pdf': '.pdf'
          };
          ext = mimeMap[file.mimetype] || '.bin';
        }
        
        const uniqueFilename = `${timestamp}-${randomHash}${ext}`;
        cb(null, uniqueFilename);
      }
    });

// File filter to validate MIME types based on file fieldname
const fileFilter = (req, file, cb) => {
  const allowedMimes = [...allowedImageMimes, ...allowedPdfMimes];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    req.error = 'File type not allowed';
    cb(new Error('Only JPG, JPEG, PNG, GIF, WebP, HEIC, and PDF files are allowed'));
  }
};

// Multer configuration with size limit (5MB for images, 10MB for documents)
const uploadConfig = {
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB default
  }
};

// Create multer instances with proper field validation
export const singleUpload = multer(uploadConfig).single('file');
export const multipleUpload = multer(uploadConfig).array('files', 10);

export const profileUpload = multer({
  ...uploadConfig,
  fileFilter: (req, file, cb) => {
    if (allowedImageMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      req.error = 'Profile image must be an image file';
      cb(new Error('Profile image must be JPG, PNG, WebP, or GIF'));
    }
  }
}).single('profileImage');

// Settings upload (logo)
export const settingsUpload = multer({
  ...uploadConfig,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || 
        file.mimetype === 'image/png' || 
        file.mimetype === 'image/webp') {
      cb(null, true);
    } else {
      req.error = 'Invalid file type';
      cb(new Error('Logo must be JPG, PNG, or WebP'));
    }
  }
}).single('logo');

// Category upload
export const categoryUpload = multer({
  ...uploadConfig,
  fileFilter: (req, file, cb) => {
    if (allowedImageMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      req.error = 'Category image must be an image file';
      cb(new Error('Category image must be an image file'));
    }
  }
}).single('categoryImage');

// Product upload
export const productUpload = multer({
  ...uploadConfig,
  fileFilter: (req, file, cb) => {
    if (allowedImageMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      req.error = 'Product image must be an image file';
      cb(new Error('Product image must be JPG, PNG, GIF, or WebP'));
    }
  }
}).array('images', 10);

// Export serve static route path
export const uploadsPath = '/public/uploads';
export const publicUploadUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}${uploadsPath}`;
