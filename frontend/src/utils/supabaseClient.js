import { createClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase credentials missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_KEY in .env")
}

const supabase = createClient(supabaseUrl, supabaseKey)

export default function uploadMediaToSupabase(file, bucketName = "images") {
  return new Promise((resolve, reject) => {
    if (file == null) {
      reject("File not added")
      return
    }

    const timestamp = new Date().getTime()
    const fileName = `${timestamp}_${file.name.replace(/\s/g, '_')}`

    supabase.storage
      .from(bucketName)
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      })
      .then((result) => {
        if (result.error) {
          reject(result.error)
          return
        }
        const { data } = supabase.storage.from(bucketName).getPublicUrl(fileName)
        resolve(data.publicUrl)
      })
      .catch((err) => {
        reject(err)
      })
  })
}
