# Asset Inventory Scanner Pro 🚀

Hệ thống quản lý và kiểm kê tài sản tốc độ cao, kết hợp sức mạnh của **Google Apps Script (GAS)** và **GitHub Pages**.

## 🏗️ Kiến trúc hệ thống

Dự án được xây dựng dựa trên mô hình Client-Server gọn nhẹ:

1.  **GitHub Pages (Frontend - Giao diện người dùng):**
    *   **Nhiệm vụ:** Cung cấp giao diện quét mã vạch, hiển thị thông tin tài sản và Dashboard báo cáo.
    *   **Công nghệ:** HTML5, CSS3 (Glassmorphism), JavaScript (Vanilla).
    *   **Quét mã vạch:** Sử dụng **Native BarcodeDetector API** (tăng tốc phần cứng) trên Chrome/Android cho tốc độ cực nhanh, và thư viện **ZXing** làm fallback trên iOS/Safari.
    *   **Giao tiếp:** Sử dụng kỹ thuật **JSONP** để gọi API từ Google Apps Script mà không bị chặn bởi chính sách CORS.

2.  **Google Apps Script (Backend - Xử lý dữ liệu):**
    *   **Nhiệm vụ:** Đóng vai trò là API trung gian, đọc/ghi dữ liệu trực tiếp vào Google Sheets.
    *   **Tính năng:**
        *   `lookupBarcode`: Tìm kiếm thông tin tài sản trong bảng tính.
        *   `confirmAsset`: Cập nhật trạng thái "Đã kiểm" cho tài sản.
        *   `getDashboardData`: Tổng hợp số liệu tiến độ theo Phòng và theo Người quản lý.
        *   `getManagerAssets`: Lấy danh sách chi tiết các tài sản chưa kiểm của một người cụ thể.

3.  **Google Sheets (Database - Cơ sở dữ liệu):**
    *   **Sheet "Chinh cho 3 phong":** Lưu trữ dữ liệu tài sản gốc (Barcode, Tên tài sản, Người quản lý, Trạng thái...).
    *   **Sheet "Phong":** Lưu trữ danh mục nhân viên theo từng phòng để phục vụ báo cáo Dashboard.

## ✨ Tính năng nổi bật

*   **Siêu nhanh:** Nhận diện mã vạch gần như ngay lập tức nhờ Native API.
*   **Tiện lợi:** Hỗ trợ bật đèn Flash, Zoom camera trực tiếp trên giao diện web.
*   **Dashboard trực quan:** Biểu đồ vòng (Progress ring) và thanh tiến trình (Progress bar) cho từng phòng ban.
*   **Theo dõi chi tiết:** Lọc theo người quản lý, xem danh sách chính xác các món đồ "Chưa kiểm" để đôn đốc.
*   **Không cần cài đặt:** Chạy trực tiếp trên trình duyệt điện thoại (Safar, Chrome).

## ❓ Tại sao dùng GitHub Pages frontend thay vì GAS Web App URL?

Mặc dù Google Apps Script (GAS) có thể render HTML trực tiếp, nhưng việc sử dụng GitHub Pages làm Frontend mang lại nhiều lợi thế kỹ thuật quan trọng:

1.  **Vượt qua rào cản Iframe:** Các Web App chạy trực tiếp trên `script.google.com` bị bao bọc trong một `iframe` bảo mật (sandbox). Điều này thường gây ra lỗi khi yêu cầu quyền truy cập Camera hoặc sử dụng các API phần cứng nâng cao như **BarcodeDetector** trên nhiều dòng điện thoại. GitHub Pages chạy như một trang web độc lập, giúp việc xin quyền Camera ổn định hơn 100%.
2.  **Tốc độ và Hiệu năng:** GitHub Pages phục vụ file tĩnh cực nhanh qua CDN toàn cầu, giảm độ trễ khi tải trang so với việc GAS phải render template phía server mỗi lần truy cập.
3.  **Hỗ trợ Native Barcode API:** Một số trình duyệt di động hạn chế các API quét mã vạch tốc độ cao khi trang web nằm trong iframe của Google. Dùng GitHub Pages đảm bảo tính năng quét mã vạch hoạt động ở hiệu suất tối đa.
4.  **Trải nghiệm người dùng (UX):** URL của GitHub Pages ngắn gọn, dễ nhớ và có thể cài đặt như một ứng dụng (PWA) dễ dàng hơn so với đường dẫn dài dằng dặc của Google Script.

## 🛠️ Hướng dẫn thiết lập

1.  **Google Sheets:** Đảm bảo có 2 sheet tên là `Chinh cho 3 phong` và `Phong` với cấu trúc như đã thống nhất.
2.  **Google Apps Script (Code.gs):**
    *   Copy nội dung file `Code.gs` vào dự án GAS của bạn.
    *   Thay đổi `spreadsheetId` trong code thành ID bảng tính của bạn.
    *   **Deploy** dưới dạng "Web App", cấu hình quyền truy cập thành **"Anyone"**.
    *   Copy URL của Web App sau khi deploy.
3.  **GitHub Pages (index.html):**
    *   Mở file `index.html`, tìm biến `GAS_URL` và dán URL Web App của bạn vào.
    *   Push mã nguồn lên GitHub và bật tính năng GitHub Pages trong phần Settings.

## 📄 Ghi chú lịch sử
Tài liệu hướng dẫn về phiên bản cũ (AppSheet) đã được chuyển sang file [appsheetreadme.md](file:///c:/Users/lyhan/Documents/GitHub/taisan/appsheetreadme.md).
