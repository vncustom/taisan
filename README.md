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

### 1. Cấu trúc Google Sheets (Database)
Ứng dụng sử dụng 2 Sheet với cấu trúc cột chính xác như sau:

#### Sheet: `Chinh cho 3 phong` (Dữ liệu tài sản)
*   **Cột E (Cột 5):** Mã vạch / Mã tài sản (Barcode).
*   **Cột F (Cột 6):** Tên tài sản.
*   **Cột L (Cột 12):** Người quản lý (Dùng để lọc dữ liệu từng cá nhân).
*   **Cột M (Cột 13):** Vị trí tài sản (Hiển thị chi tiết khi xem danh sách theo người).
*   **Cột V (Cột 22):** Trạng thái kiểm kê (Hệ thống sẽ ghi "Đã kiểm" vào đây).

#### Sheet: `Phong` (Danh mục nhân viên theo phòng)
*   **Hàng 1:** Tên các Phòng/Ban (Mỗi cột là một phòng).
*   **Hàng 2 trở đi:** Tên nhân viên thuộc phòng đó (Liệt kê theo chiều dọc dưới tên phòng).

### 2. Google Apps Script (Backend)
*   Copy nội dung file `Code.gs` vào dự án GAS của bạn.
*   Thay đổi `spreadsheetId` trong code thành ID bảng tính của bạn.
*   **Deploy** dưới dạng "Web App", cấu hình quyền truy cập thành **"Anyone"**.
*   Copy URL của Web App sau khi deploy.

### 3. Frontend (index.html)
*   Mở file `index.html`, tìm biến `GAS_URL` và dán URL Web App bạn vừa copy ở bước trên vào.
*   Host file này lên GitHub Pages hoặc bất kỳ dịch vụ hosting nào hỗ trợ HTTPS.

## 📱 Hướng dẫn sử dụng

### 1. Quét mã tài sản
*   Truy cập vào ứng dụng, nhấn **"Mở Camera"** và cấp quyền truy cập camera.
*   Đưa mã vạch vào khung quét. Bạn có thể sử dụng biểu tượng **Đèn Flash** ⚡ nếu thiếu sáng hoặc **Zoom** 🔍 nếu mã vạch ở xa.
*   Sau khi phát hiện mã, hệ thống sẽ hiển thị thông tin: Tên tài sản, Mã và Trạng thái.
*   Nhấn **"Xác nhận Đã kiểm"** để gửi dữ liệu về Google Sheet.

### 2. Dashboard và Theo dõi tiến độ
*   Nhấn nút **"Dashboard"** ở góc trên bên phải màn hình.
*   **Báo cáo tổng quát:** Xem tổng số tài sản, số lượng đã kiểm và tỉ lệ phần trăm hoàn thành.
*   **Theo phòng ban:** Xem thanh tiến trình của từng phòng.
*   **Theo từng người:** Danh sách các cá nhân quản lý tài sản.
    *   Bạn có thể tìm kiếm tên hoặc lọc theo phòng ban.
    *   **Nhấn vào tên một người** để xem danh sách chi tiết các tài sản **Chưa kiểm** của người đó (bao gồm Tên, Mã và Vị trí tài sản).
    *   Nhấn nút **"Tải lại"** 🔄 trong Dashboard để nhận dữ liệu mới nhất nếu có người khác vừa cập nhật.



