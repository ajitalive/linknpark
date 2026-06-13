const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Testing zones table...");
  const { data, error } = await supabase.from('zones').select('*').limit(1);
  if (error) {
    console.log("ERROR selecting from zones:", error);
  } else {
    console.log("SUCCESS selecting from zones:", data);
  }
  
  console.log("Testing zone_members table...");
  const { data: d2, error: e2 } = await supabase.from('zone_members').select('*').limit(1);
  if (error) {
    console.log("ERROR selecting from zone_members:", e2);
  } else {
    console.log("SUCCESS selecting from zone_members:", d2);
  }
}

test();
