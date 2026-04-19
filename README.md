# 🚀 Asset Scanner Pro (Phiên bản Live Camera)

Giải pháp kiểm kê tài sản cơ quan dùng Google Apps Script làm Backend và GitHub Pages làm Frontend để vượt rào giới hạn camera trên Apps Script Iframe.

## 🌟 Tính năng
- **Quét trực tiếp (Live Streaming):** Camera quét liên tục như một ứng dụng native, không cần chụp ảnh.
- **Tốc độ cao:** Nhận diện barcode (Code 128, EAN 13, Code 39) trong tích tắc.
- **Không giới hạn:** Hỗ trợ số lượng người dùng đồng thời không giới hạn (vượt giới hạn 10 người của AppSheet).
- **Thiết kế Premium:** Giao diện hiện đại, tối ưu cho di động với hiệu ứng Glassmorphism.
- **Tự động hóa:** Tự động tra cứu thông tin và cập nhật trạng thái "Đã kiểm" vào Google Sheet.

## 🏗️ Kiến trúc Hệ thống
1. **Frontend (GitHub Pages):** Host giao diện quét mã vạch và xử lý camera.
2. **Backend (Google Apps Script):** API nhận yêu cầu từ Frontend, giao tiếp với Google Sheet.
3. **Database (Google Sheet):** Lưu trữ dữ liệu tài sản.

## 🛠️ Hướng dẫn Cài đặt cho Admin

### Bước 1: Thiết lập Google Apps Script (Backend)
1. Truy cập file Google Sheet của bạn.
2. Vào **Tiện ích mở rộng** > **Apps Script**.
3. Copy toàn bộ nội dung file `Code.gs` từ máy tính và dán vào.
4. Bấm **Triển khai** > **Bản triển khai mới**.
5. Cấu hình:
   - Loại: **Ứng dụng web**.
   - Thực thi với tư cách: **Tôi (Me)**.
   - Ai có quyền truy cập: **Bất kỳ ai (Anyone)**. (Đây là điểm quan trọng để API nhận được request từ GitHub).
6. Copy đường dẫn **URL ứng dụng web** (có dạng `.../exec`).

### Bước 2: Thiết lập GitHub Pages (Frontend)
1. Mở file `index.html` trên máy tính.
2. Tìm dòng `const GAS_URL = "..."` (khoảng dòng 276) và dán URL bạn vừa copy ở Bước 1 vào.
3. Push toàn bộ code lên một repository GitHub mới:
   ```bash
   git add .
   git commit -m "Cập nhật GAS URL"
   git push origin main
   ```
4. Trên GitHub: Vào **Settings** > **Pages** > **Build and deployment**.
5. Chọn Branch: `main`, Folder: `/ (root)`. Bấm **Save**.
6. GitHub sẽ cung cấp cho bạn một link (Dạng `https://username.github.io/taisan/`). Đây là link để nhân viên sử dụng.

## 📱 Hướng dẫn dành cho Nhân viên
1. Mở link GitHub Pages trên trình duyệt điện thoại.
2. Cho phép truy cập Camera khi được hỏi.
3. Đưa camera vào mã vạch trên tem tài sản.
4. Sau khi hệ thống nhận mã và hiển thị tên tài sản, nhấn **Xác nhận Đã kiểm**.
5. Hệ thống báo thành công là hoàn tất 1 tài sản. Quét tiếp tài sản khác sau 2 giây.

## ⚠️ Lưu ý kỹ thuật
- **CORS:** Chúng tôi sử dụng kỹ thuật **JSONP** để giao tiếp giữa GitHub và Google Script, đảm bảo không bị chặn bởi chính sách bảo mật trình duyệt.
- **Camera:** Nếu camera không hiện, hãy kiểm tra xem bạn đã mở link qua **HTTPS** chưa (GitHub Pages mặc định là HTTPS).
