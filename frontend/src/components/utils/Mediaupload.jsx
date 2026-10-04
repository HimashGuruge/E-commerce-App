import api from '@/utils/api'

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
  const formData = new FormData()
  formData.append("file", file)
  formData.append("type", "media")
  const res = await api.post("/api/upload/media", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return res.data?.url
}
