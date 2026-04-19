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
        const currentStatus = data[i][21];
        const actualRow = startRow + i;
        
        return {
          found: true,
          row: actualRow,
          assetName: assetName,
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
      sheet.getRange(parseInt(row), 22).setValue('Đã kiểm');
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
 * - Join với Sheet "Phong" (cột A: tên người, cột B: tên phòng).
 * - Trả về: tổng asset, tổng đã kiểm, danh sách phòng + người kèm số liệu.
 */
function getDashboardData() {
  const spreadsheetId = '1iaLw6iQLnTMTtOTYJLanfoULWCrAOsTa33tubSpxRnQ';
  const mainSheetName = 'Chinh cho 3 phong';
  const roomSheetName = 'Phong';
  const startRow = 7;

  try {
    const ss = SpreadsheetApp.openById(spreadsheetId);

    // ── 1. Đọc Sheet "Phong": cột A = tên người quản lý, cột B = tên phòng ──
    const roomSheet = ss.getSheetByName(roomSheetName);
    const managerToRoom = {};
    if (roomSheet) {
      const roomLastRow = roomSheet.getLastRow();
      if (roomLastRow >= 1) {
        const roomData = roomSheet.getRange(1, 1, roomLastRow, 2).getValues();
        roomData.forEach(function(row) {
          const name = String(row[0]).trim();
          const room = String(row[1]).trim();
          if (name && room) managerToRoom[name] = room;
        });
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
