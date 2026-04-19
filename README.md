# 📱 Ứng Dụng Di Động Kiểm Kê Tài Sản (Asset Inventory App)

Ứng dụng web dành cho di động được xây dựng trên nền tảng **Google Apps Script (GAS)**, kết nối trực tiếp với **Google Sheets**, giúp tự động hóa quy trình kiểm kê định kỳ bằng cách quét mã vạch (Barcode/QR Code) thông qua camera điện thoại.

## 🚀 Tính Năng Chính
- **Quét Mã Vạch (Fast Scanner):** Sử dụng camera điện thoại để nhận diện số hiệu tài sản (Code-128, EAN-13) thông qua thư viện Html5-QRCode.
- **Tra Cứu Tự Động:** Tìm đúng thông tin tài sản (Tên, Mã, Trạng thái) trong danh sách hàng nghìn dòng dữ liệu chỉ trong < 1 giây. Có tính năng nhập tay nếu quét lỗi.
- **Cập Nhật Một Chạm:** Nút bấm xác nhận "Đã kiểm" để cập nhật trực tiếp vào file báo cáo trung tâm mà không cần nhập liệu tay.
- **Không Giới Hạn Người Dùng:** Deploy dưới dạng Web App với quyền "Anyone with Google Account", thay thế giải pháp AppSheet cũ (bị giới hạn 10 users).

## 🛠 Cấu Trúc Dữ Liệu (Google Sheets)
Hệ thống sử dụng file Google Sheet làm cơ sở dữ liệu:
- Sheet ưu tiên: `Chinh cho 3 phong`
- **Cột E (Số hiệu):** Mã vạch của tài sản (Key - Khóa chính, ví dụ `3010101111001`).
- **Cột F (Tên tài sản):** Thông tin hiển thị để đối soát.
- **Cột V (Kiểm tra):** Cột ghi nhận trạng thái kiểm kê thực tế ("Đã kiểm").

## 📋 Hướng Dẫn Cài Đặt (Dành cho Quản trị viên)

### 1. Phân quyền dữ liệu
- File Google Sheets chỉ cần cấp quyền Viewer hoặc Editor cho người quản lý. Người dùng quét mã chỉ tương tác qua Web App (Script chạy dưới quyền của tài khoản tạo Script).

### 2. Triển khai Google Apps Script (GAS)
1. Mở file Google Sheets, chọn **Extensions (Tiện ích mở rộng) > Apps Script**.
2. Tạo 2 file trong project:
   - `Code.gs` và dán mã nguồn từ file [Code.gs](./Code.gs)
   - `Index.html` và dán mã nguồn từ file [Index.html](./Index.html)
3. Bấm **Deploy (Triển khai) > New deployment (Triển khai mới)**.
4. Chọn loại: **Web app**.
   - Execute as (Thực thi dưới quyền): **Me (Tài khoản của bạn)**.
   - Who has access (Ai có quyền truy cập): **Anyone with Google account (Bất kỳ ai có tài khoản Google)** (để giới hạn nội bộ) hoặc **Anyone** tuỳ nhu cầu.
5. Sao chép URL Web app cung cấp cho nhân viên.

## 📱 Hướng Dẫn Sử Dụng (Dành cho Nhân viên kiểm kê)

1. **Truy cập App:** Mở link Web App (trên trình duyệt Safari ở iOS hoặc Chrome ở Android) và cấp quyền truy cập Camera.
2. **Thao tác quét:**
   - Đưa camera vào tem tài sản (barcode 1D) để hệ thống tự động quét và lọc ra thông tin.
   - Nếu camera mờ hoặc không nhận, có thể nhập tay mã số vào ô văn bản và nhấn "Tìm".
3. **Xác nhận:** Bấm nút **"✅ Xác nhận Đã kiểm"** sau khi kiểm tra đúng thông tin. 
4. Hệ thống sẽ ghi nhận và hồi đáp, bạn có thể nhấn "Quét mã khác" để tiếp tục.

## ⚠️ Lưu Ý Quan Trọng
- **Bảo mật dữ liệu:** Ứng dụng chỉ có thể ghi vào cột `V` và không có quyền sửa xoá các cột khác. LockService được sử dụng để chống ghi đè khi nhiều nhân viên quét cùng lúc.
- **Kết nối mạng:** Yêu cầu điện thoại phải có kết nối Internet (WiFi/4G) mở được liên kết HTTPS để hoạt động.
- **Chu kỳ kiểm kê:** Để bắt đầu đợt kiểm kê mới vào tháng sau, Quản trị viên chỉ cần xóa toàn bộ nội dung trong Cột V trên Google Sheets.

---
*Dự án được tái cấu trúc từ AppSheet sang Google Apps Script.*
