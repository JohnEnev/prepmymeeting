/**
 * Migration runner script
 * Runs the rate limiting migration by executing SQL via Supabase REST API
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, "..", ".env.local");
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase credentials in .env.local");
  console.error("   Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

async function runMigration() {
  try {
    console.log("🔄 Running rate limiting migration...\n");

    // Read migration file
    const migrationPath = join(__dirname, "..", "supabase", "migrations", "006_add_rate_limiting.sql");
    const sql = readFileSync(migrationPath, "utf8");

    console.log("📄 Migration file loaded");
    console.log("─".repeat(60));

    // Use Supabase's SQL execution endpoint (requires service role key)
    const endpoint = `${supabaseUrl}/rest/v1/rpc/exec_sql`;

    console.log("\n📦 Executing SQL migration...\n");

    // Try to execute the migration using the query endpoint
    // Note: This requires the pg_net extension and proper permissions
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseServiceKey,
        "Authorization": `Bearer ${supabaseServiceKey}`,
        "Prefer": "return=minimal"
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      console.log("⚠️  Direct SQL execution not available via REST API");
      console.log("   This is expected - Supabase REST API doesn't support arbitrary SQL execution");
      console.log("\n📋 Manual migration steps:\n");
      console.log("   1. Go to: https://supabase.com/dashboard/project/_/sql");
      console.log("   2. Open SQL Editor");
      console.log("   3. Run the following SQL:\n");
      console.log("─".repeat(60));
      console.log(sql);
      console.log("─".repeat(60));
      console.log("\n   4. After running, execute: ./test-rate-limit.sh\n");
      return;
    }

    console.log("✅ Migration executed successfully!\n");

  } catch (error) {
    console.log("\n⚠️  Unable to run migration automatically");
    console.log("\n📋 Manual steps to run the migration:\n");
    console.log("   1. Go to your Supabase dashboard: https://supabase.com/dashboard");
    console.log("   2. Select your project");
    console.log("   3. Go to SQL Editor (left sidebar)");
    console.log("   4. Create a new query");
    console.log("   5. Copy the contents of:");
    console.log("      → supabase/migrations/006_add_rate_limiting.sql");
    console.log("   6. Paste and click 'Run'");
    console.log("   7. After successful execution, run: ./test-rate-limit.sh\n");
  }
}

runMigration();
