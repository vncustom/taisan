function doGet(e) {
  // Nếu có action, xử lý như một API request (trả về JSON/JSONP)
  if (e && e.parameter && e.parameter.action) {
    const action = e.parameter.action;
    let result = { found: false, error: 'Action không hợp lệ' };
    
    if (action === 'lookup') {
      const barcode = e.parameter.barcode;
      result = lookupBarcode(barcode);
    } else if (action === 'confirm') {
      const row = parseInt(e.parameter.row);
      result = confirmAsset(row);
    } else if (action === 'dashboard') {
      result = getDashboardData();
    } else if (action === 'managerAssets') {
      result = getManagerAssets(e.parameter.manager);
    } else if (action === 'newscan') {
      result = recordNewscan(e.parameter.barcode);
    } else if (action === 'relocate') {
      const row = parseInt(e.parameter.row);
      result = relocateAsset(row, e.parameter.newLocation);
    } else if (action === 'readImageBarcode') {
      result = readBarcodeWithGemini(e.parameter.imageBase64, e.parameter.mimeType);
    }
    
    // Xử lý JSONP nếu có callback parameter (giải quyết CORS cho GitHub Pages)
    const callback = e.parameter.callback;
    if (callback) {
      const output = callback + '(' + JSON.stringify(result) + ')';
      return ContentService.createTextOutput(output)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    } else {
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // Nếu không có action, trả về giao diện HTML (phiên bản chụp ảnh cũ)
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Kiểm Kê Tài Sản')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Xử lý POST request từ browser (dùng cho Gemini image reading với base64 lớn).
 * Browser gọi fetch POST đến GAS URL.
 */
function doPost(e) {
  let result = { success: false, error: 'Action không hợp lệ' };
  try {
    const params = e.parameter || {};
    const action = params.action;
    if (action === 'readImageBarcode') {
      result = readBarcodeWithGemini(params.imageBase64, params.mimeType);
    } else if (action === 'relocate') {
      result = relocateAsset(parseInt(params.row), params.newLocation);
    }
  } catch (err) {
    result = { success: false, error: err.message };
  }
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Tra cứu mã vạch trong Google Sheet.
 */
function lookupBarcode(barcode) {
  const sheetName = 'Chinh cho 3 phong';
  const spreadsheetId = '1iaLw6iQLnTMTtOTYJLanfoULWCrAOsTa33tubSpxRnQ';
  
  try {
    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(sheetName);
    if (!sheet) {
      return { found: false, error: 'Không tìm thấy Sheet "Chinh cho 3 phong"' };
    }

    const startRow = 7;
    const lastRow = sheet.getLastRow();
    
    if (lastRow < startRow) {
      return { found: false, error: 'Sheet không có dữ liệu' };
    }

    const dataRange = sheet.getRange(startRow, 1, lastRow - startRow + 1, 22);
    const data = dataRange.getValues();

    for (let i = 0; i < data.length; i++) {
      const rowBarcode = String(data[i][4]).trim();
      if (rowBarcode === String(barcode).trim() && rowBarcode !== '') {
        const assetName = data[i][5];
        const manager = data[i][11];
        const location = data[i][12];
        const currentStatus = data[i][21];
        const actualRow = startRow + i;
        
        return {
          found: true,
          row: actualRow,
          assetName: assetName,
          manager: manager || 'Chưa rõ',
          location: location || '',
          status: currentStatus || 'Chưa kiểm',
          barcode: rowBarcode
        };
      }
    }
    return { found: false };
  } catch (e) {
    return { found: false, error: e.message };
  }
}

/**
 * Xác nhận đã kiểm kê bằng cách ghi "Đã kiểm" vào cột V.
 */
function confirmAsset(row) {
  const sheetName = 'Chinh cho 3 phong';
  const spreadsheetId = '1iaLw6iQLnTMTtOTYJLanfoULWCrAOsTa33tubSpxRnQ';
  
  const lock = LockService.getScriptLock();
  if (lock.tryLock(10000)) {
    try {
      const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(sheetName);
      const actualRow = parseInt(row);
      const scanTime = Utilities.formatDate(
        new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss'
      );
      sheet.getRange(actualRow, 22).setValue('Đã kiểm');   // Cột V
      sheet.getRange(actualRow, 23).setValue(scanTime);     // Cột W – ngày giờ quét
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    } finally {
      lock.releaseLock();
    }
  } else {
    return { success: false, error: 'Hệ thống đang bận. Vui lòng thử lại.' };
  }
}

/**
 * Lấy dữ liệu tổng hợp để hiển thị Dashboard kiểm kê tài sản.
 * - Đọc cột E (barcode), L (người quản lý), V (trạng thái) từ Sheet chính.
 * - Join với Sheet "Phong":
 *     Hàng 1 = tên phòng (header) ở các cột A, B, C, D...
 *     Hàng 2 trở đi = tên nhân viên liệt kê dọc theo từng cột phòng.
 * - Trả về: tổng asset, tổng đã kiểm, danh sách phòng + người kèm số liệu.
 */
function getDashboardData() {
  const spreadsheetId = '1iaLw6iQLnTMTtOTYJLanfoULWCrAOsTa33tubSpxRnQ';
  const mainSheetName = 'Chinh cho 3 phong';
  const roomSheetName = 'Phong';
  const startRow = 7;

  try {
    const ss = SpreadsheetApp.openById(spreadsheetId);

    // ── 1. Đọc Sheet "Phong" ──
    // Cấu trúc thực tế:
    //   Hàng 1  → tên phòng (A1=Phòng Kỹ thuật, B1=Phòng MCR, C1=Phòng Phát hình, D1=Khác…)
    //   Hàng 2+ → tên nhân viên liệt kê dọc dưới mỗi cột phòng
    const roomSheet = ss.getSheetByName(roomSheetName);
    const managerToRoom = {};
    if (roomSheet) {
      const roomLastRow  = roomSheet.getLastRow();
      const roomLastCol  = roomSheet.getLastColumn();
      if (roomLastRow >= 2 && roomLastCol >= 1) {
        const roomData = roomSheet.getRange(1, 1, roomLastRow, roomLastCol).getValues();
        // Hàng đầu (index 0) = tên phòng
        const deptNames = roomData[0].map(function(h) { return String(h).trim(); });
        // Từ hàng thứ 2 (index 1) trở đi = tên nhân viên
        for (var r = 1; r < roomData.length; r++) {
          for (var c = 0; c < roomLastCol; c++) {
            var empName = String(roomData[r][c]).trim();
            var deptName = deptNames[c] || ('Phòng ' + (c + 1));
            if (empName) {
              managerToRoom[empName] = deptName;
            }
          }
        }
      }
    }

    // ── 2. Đọc Sheet chính ──
    const mainSheet = ss.getSheetByName(mainSheetName);
    if (!mainSheet) return { error: 'Không tìm thấy Sheet chính' };

    const lastRow = mainSheet.getLastRow();
    if (lastRow < startRow) return { error: 'Sheet không có dữ liệu' };

    const data = mainSheet.getRange(startRow, 1, lastRow - startRow + 1, 22).getValues();

    // ── 3. Tổng hợp ──
    var totalAll = 0, checkedAll = 0;
    var byManager = {};
    var byRoom    = {};

    data.forEach(function(row) {
      const barcode = String(row[4]).trim();   // cột E (index 4)
      if (!barcode) return;

      const manager   = String(row[11]).trim(); // cột L (index 11)
      const status    = String(row[21]).trim(); // cột V (index 21)
      const isChecked = (status === 'Đã kiểm');
      const room      = managerToRoom[manager] || 'Chưa phân phòng';

      totalAll++;
      if (isChecked) checkedAll++;

      if (!byManager[manager]) byManager[manager] = { total: 0, checked: 0, room: room };
      byManager[manager].total++;
      if (isChecked) byManager[manager].checked++;

      if (!byRoom[room]) byRoom[room] = { total: 0, checked: 0 };
      byRoom[room].total++;
      if (isChecked) byRoom[room].checked++;
    });

    // Chuyển → array, sắp xếp
    const managers = Object.keys(byManager).map(function(name) {
      const d = byManager[name];
      return { name: name, room: d.room, total: d.total, checked: d.checked,
               pct: d.total > 0 ? Math.round(d.checked / d.total * 100) : 0 };
    }).sort(function(a, b) { return a.pct - b.pct; });

    const rooms = Object.keys(byRoom).map(function(name) {
      const d = byRoom[name];
      return { name: name, total: d.total, checked: d.checked,
               pct: d.total > 0 ? Math.round(d.checked / d.total * 100) : 0 };
    }).sort(function(a, b) { return a.name.localeCompare(b.name, 'vi'); });

    return {
      success: true,
      totalAll: totalAll,
      checkedAll: checkedAll,
      pctAll: totalAll > 0 ? Math.round(checkedAll / totalAll * 100) : 0,
      rooms: rooms,
      managers: managers
    };

  } catch (err) {
    return { error: err.message };
  }
}

/**
 * Trả về danh sách tài sản CHƯA KIỂM của một người quản lý cụ thể.
 * @param {string} manager - Tên người quản lý (khớp với cột L)
 */
function getManagerAssets(manager) {
  const spreadsheetId = '1iaLw6iQLnTMTtOTYJLanfoULWCrAOsTa33tubSpxRnQ';
  const mainSheetName = 'Chinh cho 3 phong';
  const startRow = 7;

  if (!manager) return { success: false, error: 'Thiếu tên người quản lý' };

  try {
    const ss    = SpreadsheetApp.openById(spreadsheetId);
    const sheet = ss.getSheetByName(mainSheetName);
    if (!sheet) return { success: false, error: 'Không tìm thấy Sheet chính' };

    const lastRow = sheet.getLastRow();
    if (lastRow < startRow) return { success: true, manager: manager, assets: [] };

    const data = sheet.getRange(startRow, 1, lastRow - startRow + 1, 22).getValues();
    const assets = [];

    data.forEach(function(row, i) {
      const barcode   = String(row[4]).trim();   // cột E
      const assetName = String(row[5]).trim();   // cột F
      const mgr       = String(row[11]).trim();  // cột L
      const location  = String(row[12]).trim();  // cột M - vị trí
      const status    = String(row[21]).trim();  // cột V

      if (!barcode) return;
      if (mgr !== String(manager).trim()) return;
      if (status === 'Đã kiểm') return;

      assets.push({ barcode: barcode, assetName: assetName, location: location, row: startRow + i });
    });

    return { success: true, manager: manager, assets: assets };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Ghi mã tài sản mới (không có trong danh sách) vào Sheet "Newscan".
 * Sheet "Newscan" có 2 cột: A = mã tài sản, B = ngày quét.
 */
function recordNewscan(barcode) {
  if (!barcode) return { success: false, error: 'Thiếu mã tài sản' };

  const spreadsheetId = '1iaLw6iQLnTMTtOTYJLanfoULWCrAOsTa33tubSpxRnQ';
  const sheetName = 'Newscan';

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return { success: false, error: 'Hệ thống đang bận. Vui lòng thử lại.' };
  }

  try {
    const ss = SpreadsheetApp.openById(spreadsheetId);
    let sheet = ss.getSheetByName(sheetName);

    // Tạo sheet nếu chưa tồn tại
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.getRange(1, 1).setValue('Mã tài sản');
      sheet.getRange(1, 2).setValue('Ngày quét');
    }

    const scanDate = Utilities.formatDate(
      new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss'
    );

    sheet.appendRow([String(barcode).trim(), scanDate]);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Gọi Gemini Vision API để đọc mã tài sản từ ảnh.
 * imageBase64: chuỗi base64 của ảnh (không có data URI prefix).
 * mimeType: 'image/jpeg', 'image/png', v.v.
 */
function readBarcodeWithGemini(imageBase64, mimeType) {
  if (!imageBase64) return { success: false, error: 'Thiếu dữ liệu ảnh' };

  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) return { success: false, error: 'Chưa cấu hình GEMINI_API_KEY trong Script Properties' };

  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=' + apiKey;

  const prompt = `Hãy đọc ảnh này và tìm mã tài sản. Mã tài sản thường là:
- Chuỗi số như 3010101088001001
- Hoặc bắt đầu bằng chữ rồi tới số như PHOTOS00040001
Mã thường nằm ngay bên dưới barcode hoặc QR code.
Nếu tìm thấy, chỉ trả về MÃ ĐÓ (không thêm gì khác).
Nếu không thấy mã dạng trên nhưng thấy barcode/QR code, trả về "BARCODE" hoặc "QRCODE".
Nếu không thấy gì, trả về "NOTFOUND".`;

  const payload = {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } }
      ]
    }],
    generationConfig: { temperature: 0, maxOutputTokens: 64 }
  };

  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    const json = JSON.parse(response.getContentText());
    if (json.error) return { success: false, error: json.error.message };
    const candidate = ((json.candidates || [])[0] || {});
    const rawText = ((candidate.content || {}).parts || [{}])[0].text || '';
    const code = rawText.trim();
    return { success: true, code: code };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Đổi vị trí tài sản:
 * - Ghi vị trí mới vào cột M (index 13)
 * - Append lịch sử "vị trí cũ → ngày" vào cột X (index 24)
 */
function relocateAsset(row, newLocation) {
  if (!row || !newLocation) return { success: false, error: 'Thiếu thông tin hàng hoặc vị trí mới' };

  const sheetName = 'Chinh cho 3 phong';
  const spreadsheetId = '1iaLw6iQLnTMTtOTYJLanfoULWCrAOsTa33tubSpxRnQ';

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return { success: false, error: 'Hệ thống đang bận. Vui lòng thử lại.' };

  try {
    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(sheetName);
    const actualRow = parseInt(row);

    // Đọc vị trí cũ ở cột M (cột 13)
    const oldLocation = String(sheet.getRange(actualRow, 13).getValue()).trim();

    const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');

    // Ghi vị trí mới vào cột M
    sheet.getRange(actualRow, 13).setValue(String(newLocation).trim());

    // Append lịch sử vào cột X (cột 24)
    // Format: "vị trí cũ → ngày"
    if (oldLocation) {
      const historyCell = sheet.getRange(actualRow, 24);
      const existing = String(historyCell.getValue()).trim();
      const newEntry = oldLocation + ' → ' + now;
      const updated = existing ? existing + '\n' + newEntry : newEntry;
      historyCell.setValue(updated);
    }

    return { success: true, newLocation: String(newLocation).trim(), oldLocation: oldLocation };
  } catch (e) {
    return { success: false, error: e.message };
  } finally {
    lock.releaseLock();
  }
}
