import { createClient } from '@supabase/supabase-js'
import WebSocket from 'ws'
import path from 'path'

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

export const deleteFromSupabase = (url) => {
  if (!isConfigured || !supabase) return notConfigured()
  return new Promise(async (resolve, reject) => {
    try {
      const path = url.split('/object/public/')[1]
      if (!path) return resolve()
      const [bucket, ...rest] = path.split('/')
      const filePath = rest.join('/')
      const { error } = await supabase.storage.from(bucket).remove([filePath])
      if (error) return reject(error)
      resolve()
    } catch (err) {
      reject(err.message || err)
    }
  })
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
