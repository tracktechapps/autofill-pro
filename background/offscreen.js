/**
 * AutoFill Pro - Offscreen Document Script
 * Handles heavy file parsing using SheetJS library
 */

// Listen for parsing requests
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'PARSE_EXCEL_OFFSCREEN') {
        try {
            const result = parseExcelData(message.payload.data);
            sendResponse(result);
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
        return true;
    }
});

function formatCellValue(val) {
    if (val === undefined || val === null) return '';
    if (val instanceof Date) {
        if (isNaN(val.getTime())) return '';
        if (val.getUTCHours() === 0 && val.getUTCMinutes() === 0 && val.getUTCSeconds() === 0) {
            const y = String(val.getUTCFullYear()).padStart(4, '0');
            const m = String(val.getUTCMonth() + 1).padStart(2, '0');
            const d = String(val.getUTCDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }
        if (val.getHours() === 0 && val.getMinutes() === 0 && val.getSeconds() === 0) {
            const y = String(val.getFullYear()).padStart(4, '0');
            const m = String(val.getMonth() + 1).padStart(2, '0');
            const d = String(val.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }
        const y = String(val.getFullYear()).padStart(4, '0');
        const m = String(val.getMonth() + 1).padStart(2, '0');
        const d = String(val.getDate()).padStart(2, '0');
        const hh = String(val.getHours()).padStart(2, '0');
        const mm = String(val.getMinutes()).padStart(2, '0');
        return `${y}-${m}-${d} ${hh}:${mm}`;
    }
    return String(val);
}

/**
 * Parse Excel data from base64 string
 */
function parseExcelData(base64Data) {
    try {
        // Convert base64 to array buffer
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        // Parse workbook using SheetJS with date parsing enabled
        const workbook = XLSX.read(bytes, { type: 'array', cellDates: true, dateNF: 'yyyy-mm-dd' });

        // Get first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length === 0) {
            throw new Error('Excel file is empty');
        }

        // First row is headers
        const headers = jsonData[0].map(h => String(h).trim());

        // Remaining rows are data
        const data = [];
        for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (row && row.some(cell => cell !== null && cell !== undefined && cell !== '')) {
                const rowObj = {};
                headers.forEach((header, index) => {
                    rowObj[header] = formatCellValue(row[index]);
                });
                data.push(rowObj);
            }
        }

        return {
            success: true,
            headers: headers,
            data: data
        };
    } catch (error) {
        console.error('Excel parsing error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}
