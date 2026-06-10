process.env.NODE_ENV = "test";
process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://fakefakefake.supabase.co";
process.env.SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZha2VmYWtlZmFrZSIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MjAwMDAwMDAwMH0.fake";
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
