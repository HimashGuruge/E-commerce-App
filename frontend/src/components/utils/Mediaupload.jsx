import api from '@/utils/api'

// Keep in sync with backend `MAX_UPLOAD_MB` (15 MB default)
export const MAX_UPLOAD_MB = 15
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024

function formatMB(bytes) {
  return Math.round((bytes / 1048576) * 10) / 10
}

function assertSizeOK(file) {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`${file.name} is ${formatMB(file.size)} MB - max upload size is ${MAX_UPLOAD_MB} MB`)
  }
}

const TYPE_MAP = {
  product:  "products",
  profile:  "profiles",
  ad:       "ads",
  category: "products",
  review:   "products",
  chat:     "misc",
  service:  "misc",
  logo:     "misc",
  media:    "products",
}

const getBackendType = (type) => TYPE_MAP[type] || "media"

export default async function uploadToMedia(file, type = "media", options = {}) {
  if (!file) throw new Error("File is required")
  assertSizeOK(file)
  const formData = new FormData()
  formData.append("file", file)
  formData.append("type", getBackendType(type))
  const res = await api.post("/api/upload/media", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return res.data?.url
}

export async function uploadMedia(file) {
  if (!file) throw new Error("File is required")
  assertSizeOK(file)
  const formData = new FormData()
  formData.append("file", file)
  formData.append("type", "media")
  const res = await api.post("/api/upload/media", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return res.data?.url
}
