// Quick test script to verify Supabase connection
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("Testing Supabase connection...");
console.log("URL:", supabaseUrl ? "✓ Set" : "✗ Missing");
console.log("Key:", supabaseAnonKey ? "✓ Set" : "✗ Missing");

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("\n❌ Missing environment variables!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    // Test 1: Check if we can connect
    console.log("\n1. Testing database connection...");
    const { data, error } = await supabase.from("users").select("count").limit(1);

    if (error) {
      console.error("❌ Connection error:", error.message);
      return false;
    }

    console.log("✓ Connected to database successfully!");

    // Test 2: Try to insert a test user
    console.log("\n2. Testing user creation...");
    const testUser = {
      telegram_id: 999999999,
      username: "test_user",
      first_name: "Test",
      last_name: "User"
    };

    const { data: user, error: insertError } = await supabase
      .from("users")
      .upsert(testUser, { onConflict: "telegram_id" })
      .select()
      .single();

    if (insertError) {
      console.error("❌ Insert error:", insertError.message);
      return false;
    }

    console.log("✓ Test user created/updated:", user.id);

    // Test 3: Test conversation logging
    console.log("\n3. Testing conversation logging...");
    const { error: convError } = await supabase.from("conversations").insert({
      user_id: user.id,
      message_text: "Test message",
      message_type: "user"
    });

    if (convError) {
      console.error("❌ Conversation insert error:", convError.message);
      return false;
    }

    console.log("✓ Conversation logged successfully!");

    // Test 4: Test checklist saving
    console.log("\n4. Testing checklist saving...");
    const { error: checklistError } = await supabase.from("checklists").insert({
      user_id: user.id,
      topic: "Test meeting",
      content: "- Test item 1\n- Test item 2"
    });

    if (checklistError) {
      console.error("❌ Checklist insert error:", checklistError.message);
      return false;
    }

    console.log("✓ Checklist saved successfully!");

    // Clean up test data
    console.log("\n5. Cleaning up test data...");
    await supabase.from("users").delete().eq("telegram_id", 999999999);
    console.log("✓ Test data cleaned up!");

    console.log("\n✅ All tests passed! Supabase is configured correctly.");
    return true;

  } catch (err) {
    console.error("\n❌ Unexpected error:", err.message);
    return false;
  }
}

testConnection().then((success) => {
  process.exit(success ? 0 : 1);
});
