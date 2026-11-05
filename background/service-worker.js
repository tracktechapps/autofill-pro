/**
 * AutoFill Pro - Service Worker
 * Handles background tasks, file parsing coordination, and message routing
 */

// ===== Storage Keys =====
const STORAGE_KEYS = {
    DATA: 'autofill_data',
    HEADERS: 'autofill_headers',
    CURRENT_INDEX: 'autofill_current_index'
};

// ===== Message Handler =====
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'PARSE_FILE') {
        handleFileParsing(message.payload)
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Keep channel open for async response
    }

    if (message.type === 'GET_CURRENT_RECORD') {
        getCurrentRecord()
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }

    if (message.type === 'ADVANCE_INDEX') {
        advanceIndex()
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
});

// ===== File Parsing =====
async function handleFileParsing(payload) {
    const { data, fileName, fileType } = payload;

    try {
        let result;

        switch (fileType) {
            case 'csv':
                result = parseCSV(data);
                break;
            case 'xlsx':
            case 'xls':
                result = await parseExcel(data);
                break;
            case 'json':
                result = parseJSON(data);
                break;
            case 'txt':
            case 'tsv':
                result = parseTSV(data);
                break;
            default:
                throw new Error(`Unsupported file type: ${fileType}`);
        }

        return {
            success: true,
            headers: result.headers,
            data: result.data
        };
    } catch (error) {
        console.error('Parsing error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}


// ===== CSV Parser (Built-in) =====
function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) {
        throw new Error('CSV file is empty');
    }

    // Parse header
    const headers = parseCSVLine(lines[0]);

    // Parse data rows
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length > 0) {
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            data.push(row);
        }
    }

    return { headers, data };
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (inQuotes) {
            if (char === '"') {
                if (line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                current += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
    }

    result.push(current.trim());
    return result;
}

// ===== JSON Parser =====
function parseJSON(text) {
    const jsonData = JSON.parse(text);

    // Handle array of objects
    if (Array.isArray(jsonData) && jsonData.length > 0) {
        const headers = Object.keys(jsonData[0]);
        const data = jsonData.map(item => {
            const row = {};
            headers.forEach(h => {
                row[h] = item[h] !== undefined ? String(item[h]) : '';
            });
            return row;
        });
        return { headers, data };
    }

    // Handle object with data array
    if (jsonData.data && Array.isArray(jsonData.data)) {
        const headers = jsonData.headers || Object.keys(jsonData.data[0] || {});
        const data = jsonData.data.map(item => {
            const row = {};
            headers.forEach(h => {
                row[h] = item[h] !== undefined ? String(item[h]) : '';
            });
            return row;
        });
        return { headers, data };
    }

    throw new Error('Invalid JSON structure. Expected array of objects or { headers, data }');
}

// ===== TSV/TXT Parser (Tab-separated) =====
function parseTSV(text) {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) {
        throw new Error('File is empty');
    }

    // Detect delimiter (tab or space)
    const delimiter = lines[0].includes('\t') ? '\t' : /\s{2,}/;

    const headers = lines[0].split(delimiter).map(h => h.trim());

    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(delimiter).map(v => v.trim());
        if (values.length > 0) {
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            data.push(row);
        }
    }

    return { headers, data };
}

// ===== Excel Parser (Uses SheetJS via offscreen document) =====

async function parseExcel(arrayBuffer) {
    // Create offscreen document for parsing
    await ensureOffscreenDocument();

    // Convert ArrayBuffer to base64 for message passing
    const base64 = arrayBufferToBase64(arrayBuffer);

    // Send to offscreen document for parsing
    const response = await chrome.runtime.sendMessage({
        type: 'PARSE_EXCEL_OFFSCREEN',
        payload: { data: base64 }
    });

    if (!response.success) {
        throw new Error(response.error || 'Failed to parse Excel file');
    }

    return {
        headers: response.headers,
        data: response.data
    };
}

// ===== Offscreen Document Management =====
let creatingOffscreen;

async function ensureOffscreenDocument() {
    const offscreenUrl = 'background/offscreen.html';

    // Check if already exists
    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [chrome.runtime.getURL(offscreenUrl)]
    });

    if (existingContexts.length > 0) {
        return;
    }

    // Create if doesn't exist
    if (creatingOffscreen) {
        await creatingOffscreen;
    } else {
        creatingOffscreen = chrome.offscreen.createDocument({
            url: offscreenUrl,
            reasons: ['DOM_PARSER'],
            justification: 'Parse Excel files using SheetJS library'
        });
        await creatingOffscreen;
        creatingOffscreen = null;
    }
}

// ===== Get Current Record =====
async function getCurrentRecord() {
    const result = await chrome.storage.local.get([
        STORAGE_KEYS.DATA,
        STORAGE_KEYS.HEADERS,
        STORAGE_KEYS.CURRENT_INDEX
    ]);

    const data = result[STORAGE_KEYS.DATA] || [];
    const headers = result[STORAGE_KEYS.HEADERS] || [];
    const currentIndex = result[STORAGE_KEYS.CURRENT_INDEX] || 0;

    if (data.length === 0 || currentIndex >= data.length) {
        return { success: false, error: 'No data available' };
    }

    return {
        success: true,
        record: data[currentIndex],
        headers: headers,
        currentIndex: currentIndex,
        totalRecords: data.length
    };
}

// ===== Advance Index =====
async function advanceIndex() {
    const result = await chrome.storage.local.get([
        STORAGE_KEYS.DATA,
        STORAGE_KEYS.CURRENT_INDEX,
        'autofill_settings'
    ]);

    const settings = result['autofill_settings'] || {};
    if (!settings.autoAdvance) {
        return { success: false, reason: 'autoAdvance is disabled' };
    }

    const data = result[STORAGE_KEYS.DATA] || [];
    let currentIndex = result[STORAGE_KEYS.CURRENT_INDEX] || 0;

    if (currentIndex < data.length - 1) {
        currentIndex++;
        await chrome.storage.local.set({
            [STORAGE_KEYS.CURRENT_INDEX]: currentIndex
        });
    }

    return {
        success: true,
        currentIndex: currentIndex,
        totalRecords: data.length,
        isComplete: currentIndex >= data.length - 1
    };
}

// ===== Helpers =====
function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

// ===== Installation Handler =====
chrome.runtime.onInstalled.addListener(() => {
    console.log('AutoFill Pro installed');
});
