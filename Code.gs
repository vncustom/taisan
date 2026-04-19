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
