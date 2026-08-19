import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://fucbnakryykklsowoacc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1Y2JuYWtyeXlra2xzb3dvYWNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MzY0MjcsImV4cCI6MjA5NjQxMjQyN30.BmwyUTcm4alhZhsLN1hB8Bh9hSawjc5jgswZHoDXtBY"
);

const { data, error } = await supabase.auth.signInWithPassword({
  email: "hibasahbane3@gmail.com",
  password: "Tsuya2001",
});

if (error) {
  console.log("❌ Echec login:", error.message);
} else {
  console.log("✅ Login OK ! User:", data.user.email);
}
