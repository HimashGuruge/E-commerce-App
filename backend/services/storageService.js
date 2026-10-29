import { createClient } from '@supabase/supabase-js'
import WebSocket from 'ws'
import path from 'path'
import mongoose from 'mongoose'
import logger from '../utils/logger.js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY

const isConfigured = !!(supabaseUrl && supabaseKey)
let supabase = null

if (isConfigured) {
  supabase = createClient(supabaseUrl, supabaseKey, {
    realtime: { transport: WebSocket }
  })
}

const BUCKET_MAP = {
  media:    'products',
  profile:  'profiles',
  settings: 'misc',
  category: 'products',
  document: 'products',
  product:  'products',
  ads:      'ads',
}

const getBucket = (type) => BUCKET_MAP[type] || 'products'

// PRIVATE bucket for seller commission payment proofs. Objects are never
// served via a public URL — access is only through short-lived signed URLs.
const PROOF_BUCKET = 'commission-proofs'
const PROOF_SIGNED_URL_TTL = 600 // seconds

const generateFileName = (file) => {
  const ext = path.extname(file.originalname).toLowerCase() || '.bin'
  return `${Date.now()}-${Math.random().toString(36).substring(2, 10)}${ext}`
}

const notConfigured = () => Promise.reject(new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY env vars.'))

export const uploadToSupabase = (file, type = 'media') => {
  if (!isConfigured || !supabase) return notConfigured()
  return new Promise(async (resolve, reject) => {
    try {
      if (!file) return reject('No file provided')
      const bucket = getBucket(type)
      const fileName = generateFileName(file)

      const { error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        })

      if (error) return reject(error)

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName)

      resolve(publicUrl)
    } catch (err) {
      reject(err.message || err)
    }
  })
}

export const uploadToBucket = (file, bucket) => {
  if (!isConfigured || !supabase) return notConfigured()
  return new Promise(async (resolve, reject) => {
    try {
      if (!file) return reject('No file provided')
      if (!bucket) return reject('Bucket name required')
      const fileName = generateFileName(file)

      const { error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        })

      if (error) return reject(error)

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName)

      resolve(publicUrl)
    } catch (err) {
      reject(err.message || err)
    }
  })
}

const supabaseProject = () => {
  try {
    return new URL(supabaseUrl).host
  } catch {
    return ''
  }
}

/**
 * True when `value` is a public URL from this Supabase project.
 * Only those are deleted from Storage — foreign URLs are skipped so a
 * typo or a pasted third-party image can never cause a wrong deletion.
 */
export const isOwnSupabaseUrl = (value) => {
  if (typeof value !== 'string' || !value.startsWith('http')) return false
  let u
  try {
    u = new URL(value)
  } catch {
    return false
  }
  const host = u.host
  const project = supabaseProject()
  if (host !== project && !(host === 'supabase.co' || host.endsWith('.supabase.co'))) {
    return false
  }
  return u.pathname.includes('/storage/v1/object/')
}

/**
 * Delete one or more objects from Supabase Storage by their public URL(s).
 * Accepts a URL string or array. Non-owned URLs are skipped quietly.
 * Missing files are not treated as errors (idempotent delete).
 */
export const deleteFromSupabase = async (urls) => {
  const list = Array.isArray(urls) ? urls : [urls]
  const jobs = []
  const byBucket = new Map()

  for (const url of list) {
    if (!isOwnSupabaseUrl(url)) continue
    const rel = url.split('/object/public/')[1]
    if (!rel) continue
    const [bucket, ...rest] = rel.split('/')
    const filePath = rest.join('/')
    if (!bucket || !filePath) continue
    if (!byBucket.has(bucket)) byBucket.set(bucket, [])
    byBucket.get(bucket).push(filePath)
    jobs.push({ bucket, filePath })
  }

  const results = Promise.allSettled(
    [...byBucket.entries()].map(([bucket, files]) =>
      supabase.storage.from(bucket).remove(files)
    )
  )

  const failed = []
  for (const [i, r] of results.entries()) {
    if (r.status === 'rejected' || r.value?.error) {
      const bucket = [...byBucket.keys()][i]
      const files = byBucket.get(bucket)
      logger.warn(`Supabase delete failed for bucket "${bucket}": ${r.reason?.message || r.value?.error?.message || 'unknown'}`)
      failed.push(...files.map((f) => `${bucket}/${f}`))
    }
  }

  const deleted = jobs.length - failed.length
  return { deleted, failed }
}

/**
 * Delete every Supabase image stored in Product `images` arrays for the
 * given product and/or variant ids. Used when products/variants are
 * deleted, or when a product's image list is replaced.
 */
export const deleteProductImages = async ({ products = [], variants = [] }) => {
  const urls = new Set()
  for (const doc of [...products, ...variants]) {
    for (const u of doc?.images || []) {
      if (isOwnSupabaseUrl(u)) urls.add(u)
    }
  }
  if (urls.size === 0) return { deleted: 0, failed: [] }
  return deleteFromSupabase([...urls])
}

/**
 * Compare old vs new product (and optionally variant) documents and delete
 * the Supabase images that are present only in the old ones.
 */
export const deleteReplacedImages = async (oldDoc, newDoc) => {
  const removed = (oldDoc?.images || []).filter(
    (u) => isOwnSupabaseUrl(u) && !(newDoc?.images || []).includes(u)
  )
  if (removed.length === 0) return { deleted: 0, failed: [] }
  return deleteFromSupabase(removed)
}

/**
 * Upload a proof file to the PRIVATE "commission-proofs" bucket and return
 * ONLY the object path (never a URL). Path shape: "<sellerId>/<timestamp>-rand<ext>".
 * The path is what gets persisted on the CommissionPayment doc.
 */
export const uploadProof = async (file, ownerKey) => {
  if (!isConfigured || !supabase) throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY env vars.')
  if (!file) throw new Error('No file provided')
  if (!ownerKey) throw new Error('Owner key required for proof upload')

  const ext = path.extname(file.originalname).toLowerCase() || '.bin'
  const safeOwner = String(ownerKey).replace(/[^0-9a-f-]/g, '')
  const fileName = `${safeOwner}/${Date.now()}-${Math.random().toString(36).substring(2, 10)}${ext}`

  const { error } = await supabase.storage.from(PROOF_BUCKET).upload(fileName, file.buffer, {
    contentType: file.mimetype,
    upsert: false,
  })
  if (error) throw error

  // Store only the relative path — the bucket is private.
  return fileName
}

/**
 * Mint a short-lived signed URL for a private proof object. Returns
 * { signedUrl, expiresIn } (seconds). Never returns a public URL.
 */
export const getSignedProofUrl = async (proofPath, ttlSeconds = PROOF_SIGNED_URL_TTL) => {
  if (!isConfigured || !supabase) throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY env vars.')
  if (!proofPath) throw new Error('proofPath is required')

  const { data, error } = await supabase.storage
    .from(PROOF_BUCKET)
    .createSignedUrl(proofPath, ttlSeconds)
  if (error) throw error

  return { signedUrl: data.signedUrl, expiresIn: ttlSeconds }
}

/**
 * Delete a proof object by its stored path (ownerKey + filename).
 * Idempotent: a missing object is not an error.
 */
export const deleteProof = async (proofPath) => {
  if (!isConfigured || !supabase) return { deleted: 0, failed: [] }
  if (!proofPath) return { deleted: 0, failed: [] }

  const { error } = await supabase.storage.from(PROOF_BUCKET).remove([proofPath])
  if (error) {
    logger.warn(`Supabase proof delete failed for "${proofPath}": ${error.message || error}`)
    return { deleted: 0, failed: [proofPath] }
  }
  return { deleted: 1, failed: [] }
}

export const listBucket = (bucket, folder = '') => {
  if (!isConfigured || !supabase) return notConfigured()
  return new Promise(async (resolve, reject) => {
    const { data, error } = await supabase.storage.from(bucket).list(folder)
    if (error) return reject(error)
    resolve(data)
  })
}

export const getConfig = () => ({ ...BUCKET_MAP })

export { isConfigured as isSupabaseConfigured }
