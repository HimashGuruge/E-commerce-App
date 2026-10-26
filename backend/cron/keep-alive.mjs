import { createClient } from '@supabase/supabase-js'

// Read from backend/.env (set when STORAGE=supabase). Never hard-code keys here.
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('[keep-alive] SUPABASE_URL / SUPABASE_SERVICE_KEY not set — skipping.')
  // Exit so we do not keep a process alive with no config.
  process.exit(0)
}

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
