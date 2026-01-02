import { createClient } from '@supabase/supabase-js';

// 1. Lấy biến môi trường (Hỗ trợ cả 2 cách đặt tên để tránh lỗi)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
// Thử lấy ROLE_KEY trước, nếu không có thì lấy SERVICE_KEY
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || import.meta.env.VITE_SUPABASE_SERVICE_KEY;

// 2. Debug: Kiểm tra xem biến có được nạp không (F12 để xem)
console.log("Supabase Config Check:");
console.log("- URL:", supabaseUrl ? "OK" : "MISSING");
console.log("- Anon Key:", supabaseAnonKey ? "OK" : "MISSING");
console.log("- Service Key:", supabaseServiceKey ? "OK" : "MISSING");

if (!supabaseUrl || !supabaseAnonKey) {
  // Ném lỗi rõ ràng để không bị crash ngầm
  throw new Error("❌ Lỗi: Thiếu VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY. Hãy kiểm tra Settings trên Vercel!");
}

// 3. Khởi tạo Client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Dùng Service Key để tạo User (Nếu thiếu key này thì tính năng tạo User sẽ lỗi)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});