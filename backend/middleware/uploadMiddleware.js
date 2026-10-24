import path from 'path'
import busboy from 'busboy'

// ── Allowed file types ────────────────────────────────────────────────────
const allowedImageMimes = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
]

const allowedPdfMimes = ['application/pdf']

// Extension -> MIME types it may carry. Uploaded files are served publicly
// (the extension controls the delivered Content-Type), so a file's
// extension must match its declared MIME type.
const EXT_TO_MIMES = {
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.gif': ['image/gif'],
  '.webp': ['image/webp'],
  '.heic': ['image/heic'],
  '.heif': ['image/heif'],
  '.pdf': ['application/pdf'],
}

const isAllowedFile = (filename, mimeType, allowedMimes) => {
  const ext = path.extname(filename).toLowerCase()
  return (
    allowedMimes.includes(mimeType) &&
    (EXT_TO_MIMES[ext] || []).includes(mimeType)
  )
}

// Per-endpoint upload rules: field name, max files, allowed types, error text
const UPLOAD_RULES = {
  single: {
    field: 'file',
    maxCount: 1,
    mimes: [...allowedImageMimes, ...allowedPdfMimes],
    error: 'Only JPG, JPEG, PNG, GIF, WebP, HEIC, and PDF files are allowed',
  },
  multiple: {
    field: 'files',
    maxCount: 10,
    mimes: [...allowedImageMimes, ...allowedPdfMimes],
    error: 'Only JPG, JPEG, PNG, GIF, WebP, HEIC, and PDF files are allowed',
  },
  profile: {
    field: 'profileImage',
    maxCount: 1,
    mimes: allowedImageMimes,
    error: 'Profile image must be JPG, PNG, WebP, or GIF',
  },
  settings: {
    field: 'logo',
    maxCount: 1,
    mimes: ['image/jpeg', 'image/png', 'image/webp'],
    error: 'Logo must be JPG, PNG, or WebP',
  },
  category: {
    field: 'categoryImage',
    maxCount: 1,
    mimes: allowedImageMimes,
    error: 'Category image must be an image file',
  },
  product: {
    field: 'images',
    maxCount: 10,
    mimes: allowedImageMimes,
    error: 'Product image must be an image file',
  },
}

// Max upload size — 15 MB default, override with `MAX_UPLOAD_MB` in .env
const MAX_FILE_MB = parseInt(process.env.MAX_UPLOAD_MB, 10) || 15
const MAX_FILE_SIZE = MAX_FILE_MB * 1024 * 1024

/**
 * Multer-free multipart upload middleware.
 *
 * Parses the request with busboy, validates file type / extension / size,
 * buffers the accepted file(s) into `req.file` (single) or `req.files`
 * (multiple — buffer, mimetype, originalname shape), and collects plain
 * form fields into `req.body`.
 */
const makeUploadMiddleware = (rule) => (req, res, next) => {
  // Non-multipart requests pass through (handler reports the missing file)
  if (!req.is('multipart/form-data')) return next()

  req.body = req.body || {}
  const files = []
  const errors = []
  let oversized = false

  const bb = busboy({
    headers: req.headers,
    limits: {
      fileSize: MAX_FILE_SIZE,
      fieldSize: 1e6,
      files: rule.maxCount,
    },
  })

  bb.on('file', (fieldName, fileStream, info) => {
    if (fieldName !== rule.field) {
      fileStream.resume() // discard unexpected fields
      return
    }
    const { filename, mimeType } = info

    if (!isAllowedFile(filename, mimeType, rule.mimes)) {
      fileStream.resume()
      errors.push(rule.error)
      return
    }

    const chunks = []
    let count = 0
    fileStream.on('data', (chunk) => {
      count += chunk.length
      chunks.push(chunk)
    })
    fileStream.once('limit', () => {
      oversized = true
      errors.push(`File too large — max upload size is ${MAX_FILE_MB} MB`)
    })
    fileStream.on('close', () => {
      files.push({
        originalname: filename,
        mimetype: mimeType,
        buffer: Buffer.concat(chunks),
        size: count,
      })
    })
  })

  bb.on('field', (name, value) => {
    req.body[name] = value
  })

  bb.on('error', (err) => {
    errors.push(
      err.message === 'Too many files'
        ? `At most ${rule.maxCount} file${rule.maxCount > 1 ? 's' : ''} are allowed in the "images" field`
        : err.message
    )
  })

  req.on('error', (err) => errors.push(err.message))

  bb.on('finish', () => {
    if (errors.length) {
      if (oversized) {
        const msg =
          errors.find((m) => String(m).startsWith('File too large')) ||
          `File too large — max upload size is ${MAX_FILE_MB} MB`
        return res.status(413).json({ success: false, error: msg })
      }
      return res.status(400).json({ success: false, error: errors[0] })
    }
    if (files.length === 1) req.file = files[0]
    else if (files.length > 1) req.files = files
    next()
  })

  req.pipe(bb)
}

export const singleUpload = makeUploadMiddleware(UPLOAD_RULES.single)
export const multipleUpload = makeUploadMiddleware(UPLOAD_RULES.multiple)
export const profileUpload = makeUploadMiddleware(UPLOAD_RULES.profile)
export const settingsUpload = makeUploadMiddleware(UPLOAD_RULES.settings)
export const categoryUpload = makeUploadMiddleware(UPLOAD_RULES.category)
export const productUpload = makeUploadMiddleware(UPLOAD_RULES.product)
