import { createClient } from '@supabase/supabase-js';

// 1. Lấy thông tin từ file .env.local (An toàn hơn)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY; // Key quan trọng để tạo User

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error("Thiếu thông tin cấu hình Supabase trong file .env.local");
}

// 2. Client thường (Dùng để đọc dữ liệu, hiển thị danh sách)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 3. Client Admin (Dùng để TẠO TÀI KHOẢN User mà không cần đăng nhập)
// persistSession: false giúp không lưu session admin vào trình duyệt, tránh xung đột
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});