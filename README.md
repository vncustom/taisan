# Asset Inventory Scanner Pro 🚀

Hệ thống quản lý và kiểm kê tài sản tốc độ cao, tích hợp trí tuệ nhân tạo **Gemini AI Vision**, kết hợp sức mạnh của **Google Apps Script (GAS)** và **GitHub Pages**.

## 🏗️ Kiến trúc hệ thống

Dự án được xây dựng dựa trên mô hình Client-Server gọn nhẹ:

1.  **GitHub Pages (Frontend - Giao diện người dùng):**
    *   **Nhiệm vụ:** Cung cấp giao diện quét mã vạch trực tiếp qua camera, tải ảnh từ thư viện để AI đọc mã, hiển thị thông tin tài sản, đổi vị trí tài sản và Dashboard báo cáo.
    *   **Công nghệ:** HTML5, CSS3 (Glassmorphism), JavaScript (Vanilla).
    *   **Quét mã vạch camera:** Sử dụng **Native BarcodeDetector API** (tăng tốc phần cứng) trên Chrome/Android và thư viện **ZXing** làm fallback trên iOS/Safari.
    *   **Quét ảnh bằng AI (Gemini Vision):** Tự động gửi ảnh tải lên tới model `gemini-2.0-flash-lite` qua Google Apps Script để nhận diện chuỗi mã tài sản ngay dưới barcode/QRcode (đặc biệt hiệu quả với ảnh mờ, chói hoặc góc chụp khó).
    *   **Giao tiếp:** Sử dụng **JSONP** (GET) cho các thao tác tra cứu/xác nhận và **Fetch POST** cho tải ảnh base64 lớn lên GAS.

2.  **Google Apps Script (Backend - Xử lý dữ liệu):**
    *   **Nhiệm vụ:** Đóng vai trò là API trung gian, xử lý gọi Gemini API và đọc/ghi dữ liệu trực tiếp vào Google Sheets.
    *   **Các API endpoint (Action):**
        *   `lookup`: Tìm kiếm thông tin tài sản trong bảng tính.
        *   `confirm`: Cập nhật trạng thái "Đã kiểm" (Cột V) và thời gian quét (Cột W).
        *   `relocate`: Cập nhật vị trí mới (Cột M) và lưu nối tiếp lịch sử đổi vị trí kèm thời gian (Cột X).
        *   `readImageBarcode`: Đọc ảnh dạng Base64 và gọi Gemini Vision API để bóc tách mã tài sản.
        *   `dashboard`: Tổng hợp số liệu tiến độ theo Phòng ban và theo Người quản lý.
        *   `managerAssets`: Lấy danh sách chi tiết các tài sản chưa kiểm của một người cụ thể.
        *   `newscan`: Ghi nhận mã tài sản mới (chưa có trong danh mục) vào sheet `Newscan`.

3.  **Google Sheets (Database - Cơ sở dữ liệu):**
    *   **Sheet "Chinh cho 3 phong":** Dữ liệu tài sản chính.
    *   **Sheet "Phong":** Danh mục nhân viên theo từng phòng để phục vụ báo cáo Dashboard.
    *   **Sheet "Newscan":** Lưu trữ mã vạch khai báo mới.

---

## ✨ Tính năng nổi bật

*   **⚡ Quét siêu nhanh:** Nhận diện mã vạch camera gần như ngay lập tức nhờ Native API.
*   **🤖 Đọc ảnh bằng AI (Gemini Vision):** Đọc chuỗi mã tài sản ngay dưới barcode/QRcode từ ảnh tải lên (chuỗi số như `3010101088001001` hoặc chuỗi chữ+số như `PHOTOS00040001`).
*   **📍 Đổi vị trí tài sản linh hoạt:** Hỗ trợ cập nhật vị trí mới vào cột M và tự động lưu nối tiếp (append) lịch sử đổi vị trí cũ kèm mốc thời gian vào cột X.
*   **💡 Tiện ích camera:** Hỗ trợ bật đèn Flash, Zoom 2x camera trực tiếp trên giao diện web.
*   **📊 Dashboard trực quan:** Biểu đồ vòng (Progress ring) và thanh tiến trình cho từng phòng ban & người quản lý.
*   **🔍 Quản lý danh mục chưa kiểm:** Lọc theo người quản lý, xem danh sách chính xác các món đồ "Chưa kiểm" để đôn đốc.
*   **📱 Không cần cài đặt:** Chạy trực tiếp trên trình duyệt điện thoại (Safari, Chrome).

---

## 🛠️ Hướng dẫn thiết lập

### 1. Cấu trúc Google Sheets (Database)

Ứng dụng sử dụng các Sheet với cấu trúc cột chính xác như sau:

#### Sheet: `Chinh cho 3 phong` (Dữ liệu tài sản)
*   **Cột E (Cột 5):** Mã vạch / Mã tài sản (Barcode).
*   **Cột F (Cột 6):** Tên tài sản.
*   **Cột L (Cột 12):** Người quản lý (Dùng để lọc dữ liệu từng cá nhân).
*   **Cột M (Cột 13):** Vị trí tài sản hiện tại.
*   **Cột V (Cột 22):** Trạng thái kiểm kê (Hệ thống ghi "Đã kiểm").
*   **Cột W (Cột 23):** Ngày giờ quét thực tế (`dd/MM/yyyy HH:mm:ss`).
*   **Cột X (Cột 24):** Lịch sử đổi vị trí tài sản (Ghi nối tiếp dạng: `Vị trí cũ → dd/MM/yyyy HH:mm`).

#### Sheet: `Phong` (Danh mục nhân viên theo phòng)
*   **Hàng 1:** Tên các Phòng/Ban (Mỗi cột là một phòng).
*   **Hàng 2 trở đi:** Tên nhân viên thuộc phòng đó (Liệt kê theo chiều dọc).

#### Sheet: `Newscan` (Khai báo mã mới - Tự động tạo)
*   **Cột A:** Mã tài sản mới quét.
*   **Cột B:** Ngày giờ thực hiện khai báo (`dd/MM/yyyy HH:mm:ss`).

---

### 2. Google Apps Script (Backend) & Cấu hình Gemini API

1. Copy nội dung file `Code.gs` vào dự án GAS của bạn.
2. Thay đổi `spreadsheetId` trong code thành ID bảng tính Google Sheet của bạn.
3. **Cấu hình Gemini API Key:**
   * Mở **Project Settings (⚙️)** trong GAS.
   * Tại mục **Script Properties**, thêm property:
     * **Name:** `GEMINI_API_KEY`
     * **Value:** *(Nhập API Key Gemini lấy từ Google AI Studio)*
4. **Cấp quyền UrlFetchApp (Quan trọng):**
   * Trong giao diện chỉnh sửa mã GAS, tại danh sách chọn hàm, chọn hàm **`testUrlFetch`**.
   * Nhấn nút **▶️ Run (Chạy)**.
   * Hệ thống sẽ hiển thị hộp thoại xin cấp quyền: Chọn **Xem lại quyền** ➔ Chọn tài khoản ➔ **Nâng cao** ➔ **Đi tới... (không an toàn)** ➔ **Cho phép**.
5. **Triển khai Web App:**
   * Bấm **Triển khai (Deploy)** ➔ **Quản lý bản triển khai (Manage deployments)**.
   * Chọn **Tạo bản triển khai mới**, cấu hình:
     * *Thực thi dưới danh nghĩa (Execute as):* **Tôi (Me)**
     * *Người có quyền truy cập (Who has access):* **Bất kỳ ai (Anyone)**
   * Copy **URL của Web App** thu được.

---

### 3. Frontend (index.html)

1. Mở file `index.html`, tìm biến `GAS_URL` và dán URL Web App bạn vừa copy ở bước trên vào:
   ```javascript
   const GAS_URL = "https://script.google.com/macros/s/.../exec";
   ```
2. Host file `index.html` lên GitHub Pages hoặc bất kỳ hosting HTTPS nào.

---

## 📱 Hướng dẫn sử dụng

### 1. Quét mã & Đọc ảnh bằng AI
* **Quét trực tiếp qua Camera:** Nhấn **"Mở Camera"**, đưa mã vạch vào khung quét. Có thể bật **Flash** hoặc **Zoom 2x**.
* **Đọc mã từ Ảnh:** Nhấn vào khung **"Tải ảnh lên để quét mã"**, chọn ảnh chụp tài sản từ thư viện. Hệ thống sẽ thử giải mã nội bộ, nếu không được sẽ tự động chuyển sang **Gemini AI Vision** để nhận diện chuỗi mã tài sản ngay dưới tem barcode/QRcode.

### 2. Xác nhận kiểm kê & Đổi vị trí
Sau khi quét hoặc tra cứu tìm thấy tài sản:
* **Xác nhận kiểm:** Nhấn nút **"Xác nhận Đã kiểm"** để ghi mốc kiểm kê vào Sheet (Cột V & W).
* **Đổi vị trí:** Nhấn nút **"Đổi vị trí"**, nhập tên vị trí mới (ví dụ: *Phòng 302 - Bàn kỹ thuật*) ➔ Nhấn **"Lưu vị trí mới"**. Vị trí mới sẽ được cập nhật vào **Cột M**, đồng thời vị trí cũ kèm mốc thời gian sẽ được ghi nối tiếp vào **Cột X**.

### 3. Khai báo mã mới & Dashboard
* Nếu quét mã không có trong danh mục, nhấn **"📋 Khai báo mới?"** để ghi thông tin vào sheet `Newscan`.
* Bấm **"Dashboard"** để theo dõi tiến độ tổng thể, xem báo cáo theo từng Phòng/Ban hoặc Người quản lý. Bấm vào tên nhân viên để xem danh sách chi tiết các tài sản **Chưa kiểm**.
