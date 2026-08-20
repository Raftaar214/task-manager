const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment (.env).');
}

// Service-role key is used here on purpose — this file only ever runs on the
// server (Node process). It is never sent to the browser, never appears in
// any HTML/JS served to the client, so it can't be seen via "inspect".
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);

module.exports = supabase;
