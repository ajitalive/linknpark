require('dotenv').config();

const url = process.env.SUPABASE_URL + '/rest/v1/';
const key = process.env.SUPABASE_KEY;

async function check() {
  const res = await fetch(url, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });
  const data = await res.json();
  const tables = Object.keys(data.definitions || {}).filter(k => !k.includes('_'));
  console.log("Found tables:", tables.join(', '));
  console.log("All definitions:", Object.keys(data.definitions || {}));
}
check();
