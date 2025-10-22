/**
 * Script to run database migrations
 * Usage: npx tsx scripts/run-migration.ts <migration-file>
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration(migrationFile: string) {
  const migrationPath = path.join(process.cwd(), "supabase", "migrations", migrationFile);

  if (!fs.existsSync(migrationPath)) {
    console.error(`Migration file not found: ${migrationPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, "utf-8");

  console.log(`Running migration: ${migrationFile}`);
  console.log("SQL:", sql);

  // Split by semicolons and run each statement
  const statements = sql
    .split(";")
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith("--"));

  for (const statement of statements) {
    console.log(`\nExecuting: ${statement.substring(0, 100)}...`);
    const { error } = await supabase.rpc("exec_sql", { sql_query: statement });

    if (error) {
      console.error("Migration error:", error);
      process.exit(1);
    }
  }

  console.log("\n✅ Migration completed successfully!");
}

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error("Usage: npx tsx scripts/run-migration.ts <migration-file>");
  process.exit(1);
}

runMigration(migrationFile);
