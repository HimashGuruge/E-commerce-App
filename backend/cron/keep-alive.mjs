import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://gytxjxoqosdhtnzzivjw.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5dHhqeG9xb3NkaHRuenppdmp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NTkyNzksImV4cCI6MjA5NTEzNTI3OX0.ds8leRZchEPyKhAqWYROSZ6c1gW-LTWWsQxVnkQEKyE'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const BUCKETS = ['products', 'profiles', 'ads', 'misc']

async function ping() {
  const ts = new Date().toISOString()
  const results = []

  // Ping auth
  try {
    const { error } = await supabase.auth.getSession()
    results.push(`auth: ${error ? 'FAIL ' + error.message : 'OK'}`)
  } catch (e) {
    results.push(`auth: FAIL ` + e.message)
  }

  // Ping storage — list each bucket
  for (const bucket of BUCKETS) {
    try {
      const { error } = await supabase.storage.from(bucket).list('', { limit: 1 })
      results.push(`${bucket}: ${error ? 'FAIL ' + error.message : 'OK'}`)
    } catch (e) {
      results.push(`${bucket}: FAIL ` + e.message)
    }
  }

  console.log(`[${ts}] ${results.join(' | ')}`)
}

// Ping immediately, then every 12 hours
const INTERVAL_MS = 12 * 60 * 60 * 1000 // twice a day

console.log(`Supabase keep-alive started — pinging every ${INTERVAL_MS / 60000} minutes (twice daily)`)
ping()
setInterval(ping, INTERVAL_MS)
