/**
 * AutoFill Pro v2 - Content Script
 * Handles form detection, scanning, file uploads, auto-fill, and page interaction
 */

// ===== Storage Keys =====
const STORAGE_KEYS = {
    DATA: 'autofill_data',
    HEADERS: 'autofill_headers',
    CURRENT_INDEX: 'autofill_current_index',
    MODE: 'autofill_mode',
    SETTINGS: 'autofill_settings'
};

// ===== State =====
let statusBadge = null;

// ===== Initialize =====
function init() {
    createStatusBadge();
    checkForAutoFill();
    setupFormSubmitListener();
    setupKeyboardShortcuts();
}

// ===== Status Badge =====
function createStatusBadge() {
    if (document.getElementById('autofill-pro-badge')) return;

    statusBadge = document.createElement('div');
    statusBadge.id = 'autofill-pro-badge';
    statusBadge.className = 'autofill-badge hidden';
    statusBadge.innerHTML = `
    <span class="badge-icon">⚡</span>
    <span class="badge-text">AutoFill Pro</span>
    <span class="badge-status">Ready</span>
    <button class="badge-close" title="Close">✕</button>
  `;
    document.body.appendChild(statusBadge);

    // Add close button handler
    const closeBtn = statusBadge.querySelector('.badge-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            hideBadge();
        });
    }
}

function updateBadge(text, type = 'info') {
    if (!statusBadge) createStatusBadge();

    const statusEl = statusBadge.querySelector('.badge-status');
    statusEl.textContent = text;

    statusBadge.className = `autofill-badge ${type}`;
    statusBadge.classList.remove('hidden');

    if (type === 'success') {
        setTimeout(() => {
            statusBadge.classList.add('hidden');
        }, 3000);
    }
}

function hideBadge() {
    if (statusBadge) {
        statusBadge.classList.add('hidden');
    }
}

// ===== Check for Auto-Fill on Page Load =====
async function checkForAutoFill() {
    try {
        const result = await chrome.storage.local.get([
            STORAGE_KEYS.DATA,
            STORAGE_KEYS.HEADERS,
            STORAGE_KEYS.CURRENT_INDEX,
            STORAGE_KEYS.MODE,
            STORAGE_KEYS.SETTINGS
        ]);

        const data = result[STORAGE_KEYS.DATA] || [];

        if (data.length === 0) return;

        const currentIndex = result[STORAGE_KEYS.CURRENT_INDEX] || 0;

        updateBadge(`Record ${currentIndex + 1} of ${data.length}`, 'info');

    } catch (error) {
        console.error('AutoFill Pro: Error checking state', error);
    }
}

// ===== Keyboard Shortcuts =====
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', async (e) => {
        // Ctrl+Shift+F to quick fill
        if (e.ctrlKey && e.shiftKey && e.key === 'F') {
            e.preventDefault();
            await quickFillFromStorage();
        }
    });
}

async function quickFillFromStorage() {
    try {
        const result = await chrome.storage.local.get([
            STORAGE_KEYS.DATA,
            STORAGE_KEYS.HEADERS,
            STORAGE_KEYS.CURRENT_INDEX,
            STORAGE_KEYS.SETTINGS
        ]);

        const data = result[STORAGE_KEYS.DATA] || [];
        const headers = result[STORAGE_KEYS.HEADERS] || [];
        const currentIndex = result[STORAGE_KEYS.CURRENT_INDEX] || 0;
        const settings = result[STORAGE_KEYS.SETTINGS] || {};

        if (data.length === 0 || currentIndex >= data.length) {
            updateBadge('No data available', 'error');
            return;
        }

        const record = data[currentIndex];
        updateBadge(`Filling record ${currentIndex + 1}...`, 'filling');

        const filledCount = await fillForm(record, headers, settings);
        updateBadge(`Filled ${filledCount} fields`, 'success');

    } catch (error) {
        console.error('Quick fill error:', error);
        updateBadge('Fill error', 'error');
    }
}

// ===== Form Scanning =====
function scanForm() {
    const fields = [];

    // Input fields
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        const fieldInfo = extractFieldInfo(input);
        if (fieldInfo) fields.push(fieldInfo);
    });

    // Textareas
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach(textarea => {
        const fieldInfo = extractFieldInfo(textarea);
        if (fieldInfo) fields.push(fieldInfo);
    });

    // Selects
    const selects = document.querySelectorAll('select');
    selects.forEach(select => {
        const fieldInfo = extractFieldInfo(select);
        if (fieldInfo) fields.push(fieldInfo);
    });

    return fields;
}

function extractFieldInfo(element) {
    const name = element.name || '';
    const id = element.id || '';
    const label = findLabel(element);
    const placeholder = element.placeholder || '';
    const type = element.type || element.tagName.toLowerCase();
    const required = element.required || element.getAttribute('aria-required') === 'true';
    const accept = element.accept || '';

    // Skip hidden and submit-type fields for scanning display
    if (type === 'hidden') return null;

    // Generate a smart display name
    let displayName = '';

    // Priority order for display name
    if (label && label.length > 0) {
        displayName = label;
    } else if (name && name.length > 0) {
        displayName = formatFieldName(name);
    } else if (id && id.length > 0) {
        displayName = formatFieldName(id);
    } else if (placeholder && placeholder.length > 0) {
        displayName = placeholder;
    } else {
        // Try data attributes
        const dataLabel = element.dataset.label || element.dataset.name || element.dataset.field;
        if (dataLabel) {
            displayName = dataLabel;
        } else {
            // Try aria attributes
            const ariaLabel = element.getAttribute('aria-label') || element.getAttribute('aria-labelledby');
            if (ariaLabel) {
                const labelledBy = document.getElementById(ariaLabel);
                displayName = labelledBy ? labelledBy.textContent.trim() : ariaLabel;
            } else {
                // Generate from type and index
                const siblings = document.querySelectorAll(`${element.tagName}[type="${type}"]`);
                const index = Array.from(siblings).indexOf(element) + 1;
                displayName = `${formatFieldName(type)} Field ${index}`;
            }
        }
    }

    return {
        element: element,
        name: name || displayName,
        id: id,
        label: displayName,
        placeholder: placeholder,
        type: type,
        required: required,
        accept: accept,
        identifiers: [name, id, label, placeholder, displayName].filter(Boolean).map(s => s.toLowerCase())
    };
}

// Convert field_name or fieldName to "Field Name"
function formatFieldName(name) {
    if (!name) return '';
    return name
        .replace(/[_-]/g, ' ')  // Replace underscores and hyphens with spaces
        .replace(/([a-z])([A-Z])/g, '$1 $2')  // Split camelCase
        .replace(/\b\w/g, c => c.toUpperCase())  // Capitalize each word
        .trim();
}

function findLabel(element) {
    // Check for associated label by ID
    if (element.id) {
        const label = document.querySelector(`label[for="${element.id}"]`);
        if (label) return cleanLabelText(label.textContent);
    }

    // Check for parent label
    const parentLabel = element.closest('label');
    if (parentLabel) {
        const text = parentLabel.textContent.replace(element.value || '', '').trim();
        if (text) return cleanLabelText(text);
    }

    // Check previous siblings - common pattern for inline labels/badges
    let sibling = element.previousElementSibling;
    while (sibling) {
        if (sibling.tagName === 'LABEL' || sibling.tagName === 'SPAN' || sibling.tagName === 'DIV') {
            const text = sibling.textContent.trim();
            if (text && text.length > 0 && text.length < 50 && !sibling.querySelector('input, select, textarea')) {
                return cleanLabelText(text);
            }
        }
        sibling = sibling.previousElementSibling;
    }

    // Check parent container and its children for inline label patterns
    // Go up to 3 levels to find input-group style containers
    let container = element.parentElement;
    for (let level = 0; level < 3 && container; level++) {
        // Look for any text element that appears before the input in DOM order
        const allChildren = Array.from(container.children);
        const inputIndex = allChildren.indexOf(element) >= 0 ? allChildren.indexOf(element) :
            allChildren.findIndex(child => child.contains(element));

        for (let i = 0; i < inputIndex && i < allChildren.length; i++) {
            const child = allChildren[i];
            if (!child.querySelector('input, select, textarea') && !child.matches('input, select, textarea')) {
                const text = child.textContent.trim();
                if (text && text.length > 0 && text.length < 50) {
                    return cleanLabelText(text);
                }
            }
        }

        // Check for specific label patterns in this container
        const labelPatterns = [
            'label', '.label', '.field-label', '.form-label', '.input-label',
            '.control-label', '.col-form-label', '.input-group-text', '.input-group-addon',
            '.form-control-label', '[class*="label"]', '[class*="Label"]',
            'span.badge', '.tag', '.chip', 'legend'
        ];

        for (const pattern of labelPatterns) {
            try {
                const labelEl = container.querySelector(pattern);
                if (labelEl && !labelEl.querySelector('input, select, textarea') &&
                    !labelEl.matches('input, select, textarea')) {
                    const text = labelEl.textContent.trim();
                    if (text && text.length > 1 && text.length < 50) {
                        return cleanLabelText(text);
                    }
                }
            } catch (e) { /* Invalid selector, skip */ }
        }

        container = container.parentElement;
    }

    // Check aria-label and aria-labelledby
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;

    const ariaLabelledBy = element.getAttribute('aria-labelledby');
    if (ariaLabelledBy) {
        const labelEl = document.getElementById(ariaLabelledBy);
        if (labelEl) return cleanLabelText(labelEl.textContent);
    }

    // Check title attribute
    if (element.title) return element.title;

    // Check for form-row or form-group parent with label
    const formGroup = element.closest('.form-group, .form-row, .form-field, .field, .input-group, .input-row');
    if (formGroup) {
        const groupLabel = formGroup.querySelector('label, .label, legend, .field-label');
        if (groupLabel && !groupLabel.contains(element)) {
            const text = groupLabel.textContent.trim();
            if (text && text.length > 1 && text.length < 50) {
                return cleanLabelText(text);
            }
        }

        // Check first child text node or element
        const firstChild = formGroup.firstElementChild;
        if (firstChild && !firstChild.matches('input, select, textarea') &&
            !firstChild.querySelector('input, select, textarea')) {
            const text = firstChild.textContent.trim();
            if (text && text.length > 1 && text.length < 50) {
                return cleanLabelText(text);
            }
        }
    }

    return '';
}

// Clean up label text
function cleanLabelText(text) {
    if (!text) return '';
    return text
        .replace(/\s+/g, ' ')  // Normalize whitespace
        .replace(/[*:?]/g, '')  // Remove asterisks, colons, question marks
        .replace(/^\s*[-–—]\s*/, '')  // Remove leading dashes
        .trim()
        .substring(0, 50);  // Limit length
}


// ===== Get File Upload Fields =====
function getFileUploads() {
    const uploads = [];
    const fileInputs = document.querySelectorAll('input[type="file"]');

    fileInputs.forEach(input => {
        const label = findLabel(input);
        uploads.push({
            name: input.name || input.id || 'file',
            label: label,
            accept: input.accept || '*',
            multiple: input.multiple,
            required: input.required
        });
    });

    return uploads;
}

// ===== Form Detection =====
function detectFormFields() {
    const fields = [];

    // Input fields (excluding hidden, submit, button, reset, file)
    const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="file"])');
    inputs.forEach(input => {
        const fieldInfo = extractFieldInfo(input);
        if (fieldInfo) fields.push(fieldInfo);
    });

    // Textareas
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach(textarea => {
        const fieldInfo = extractFieldInfo(textarea);
        if (fieldInfo) fields.push(fieldInfo);
    });

    // Selects
    const selects = document.querySelectorAll('select');
    selects.forEach(select => {
        const fieldInfo = extractFieldInfo(select);
        if (fieldInfo) fields.push(fieldInfo);
    });

    return fields;
}

// ===== Field Matching =====
function matchFieldToHeader(field, headers) {
    const identifiers = field.identifiers;

    // Common field name mappings
    const mappings = {
        'first_name': ['firstname', 'first_name', 'first', 'fname', 'given_name', 'givenname'],
        'last_name': ['lastname', 'last_name', 'last', 'lname', 'surname', 'family_name', 'familyname'],
        'email': ['email', 'e-mail', 'mail', 'email_address', 'emailaddress'],
        'phone': ['phone', 'telephone', 'tel', 'mobile', 'cell', 'phone_number', 'phonenumber'],
        'address': ['address', 'street', 'street_address', 'address1', 'address_line_1'],
        'city': ['city', 'town', 'locality'],
        'state': ['state', 'province', 'region'],
        'zip': ['zip', 'zipcode', 'zip_code', 'postal', 'postal_code', 'postcode'],
        'country': ['country', 'nation'],
        'name': ['name', 'full_name', 'fullname'],
        'company': ['company', 'organization', 'organisation', 'business'],
        'date': ['date', 'dated', 'appointment_date', 'event_date', 'entry_date', 'recorded_date', 'form_date'],
        'date_of_birth': ['dob', 'date_of_birth', 'dateofbirth', 'birthdate', 'birth_date', 'birthday', 'birth_day', 'bday'],
        'gender': ['gender', 'sex'],
        'username': ['username', 'user_name', 'user', 'login'],
        'password': ['password', 'pass', 'pwd'],
        'age': ['age'],
        'occupation': ['occupation', 'job', 'profession'],
        'website': ['website', 'url', 'site'],
        'notes': ['notes', 'comments', 'message', 'description'],
        'title': ['title', 'prefix'],
        'middle_name': ['middlename', 'middle_name', 'mname']
    };

    // Normalize headers for matching
    const normalizedHeaders = headers.map(h => ({
        original: h,
        normalized: h.toLowerCase().replace(/[^a-z0-9]/g, '')
    }));

    for (const identifier of identifiers) {
        const normalizedId = identifier.replace(/[^a-z0-9]/g, '');

        // Direct match
        for (const header of normalizedHeaders) {
            if (header.normalized === normalizedId ||
                header.normalized.includes(normalizedId) ||
                normalizedId.includes(header.normalized)) {
                return header.original;
            }
        }

        // Check common mappings
        for (const [key, aliases] of Object.entries(mappings)) {
            if (aliases.some(alias => normalizedId.includes(alias) || alias.includes(normalizedId))) {
                for (const header of normalizedHeaders) {
                    const headerNorm = header.normalized;
                    if (aliases.some(alias => headerNorm.includes(alias.replace(/_/g, '')) || alias.replace(/_/g, '').includes(headerNorm))) {
                        return header.original;
                    }
                    if (headerNorm.includes(key.replace(/_/g, '')) || key.replace(/_/g, '').includes(headerNorm)) {
                        return header.original;
                    }
                }
            }
        }
    }

    return null;
}

// ===== Auto-Fill =====
async function fillForm(record, headers, settings) {
    const fields = detectFormFields();
    let filledCount = 0;

    // Statistics tracking
    const stats = {
        text: 0,
        select: 0,
        date: 0,
        checkbox: 0,
        radio: 0,
        other: 0,
        total: fields.length,
        matched: 0,
        filled: 0
    };

    console.log('AutoFill Pro: Detected fields:', fields.map(f => ({ name: f.name, id: f.id, type: f.type, identifiers: f.identifiers })));
    console.log('AutoFill Pro: Headers from CSV:', headers);
    console.log('AutoFill Pro: Record data:', record);

    for (const field of fields) {
        const matchedHeader = matchFieldToHeader(field, headers);
        console.log('AutoFill Pro: Field', field.name || field.id, 'type:', field.type, '-> matched header:', matchedHeader);

        if (matchedHeader && record[matchedHeader] !== undefined && record[matchedHeader] !== '') {
            const value = record[matchedHeader];
            stats.matched++;
            console.log('AutoFill Pro: Filling field', field.name || field.id, 'with value:', value);

            try {
                await fillField(field.element, value, settings);
                filledCount++;
                stats.filled++;

                // Track by type
                const type = field.type?.toLowerCase() || 'text';
                if (type === 'select' || field.element.tagName === 'SELECT') {
                    stats.select++;
                } else if (['date', 'datetime-local', 'time', 'month', 'week'].includes(type)) {
                    stats.date++;
                } else if (type === 'checkbox') {
                    stats.checkbox++;
                } else if (type === 'radio') {
                    stats.radio++;
                } else if (['text', 'email', 'tel', 'number', 'url', 'password'].includes(type)) {
                    stats.text++;
                } else {
                    stats.other++;
                }

                console.log('AutoFill Pro: Successfully filled', field.name || field.id);

                if (settings?.highlightFields) {
                    highlightField(field.element);
                }
            } catch (error) {
                console.error('AutoFill Pro: Error filling field', field.name, error);
            }
        } else if (matchedHeader) {
            console.log('AutoFill Pro: Header matched but no value in record for:', matchedHeader);
        }
    }

    console.log('AutoFill Pro: Total fields filled:', filledCount);
    console.log('AutoFill Pro: Statistics:', stats);

    // Show completion notification (if enabled)
    if (settings?.showNotifications !== false) {
        showCompletionNotification(stats);
    }

    return filledCount;
}

// ===== Completion Notification =====
function showCompletionNotification(stats) {
    // Remove existing notification if any
    const existing = document.getElementById('autofill-completion');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.id = 'autofill-completion';
    notification.innerHTML = `
        <div class="autofill-notification">
            <div class="notif-header">
                <span class="notif-icon">✅</span>
                <span class="notif-title">AutoFill Complete!</span>
                <button class="notif-close" onclick="this.closest('.autofill-notification').remove()">✕</button>
            </div>
            <div class="notif-stats">
                <div class="stat-main">
                    <span class="stat-number">${stats.filled}</span>
                    <span class="stat-label">fields filled</span>
                </div>
                <div class="stat-breakdown">
                    ${stats.text > 0 ? `<span class="stat-item">📝 ${stats.text} text</span>` : ''}
                    ${stats.select > 0 ? `<span class="stat-item">📋 ${stats.select} dropdown</span>` : ''}
                    ${stats.date > 0 ? `<span class="stat-item">📅 ${stats.date} date</span>` : ''}
                    ${stats.checkbox > 0 ? `<span class="stat-item">☑️ ${stats.checkbox} checkbox</span>` : ''}
                    ${stats.radio > 0 ? `<span class="stat-item">⭕ ${stats.radio} radio</span>` : ''}
                </div>
                <div class="stat-summary">
                    ${stats.total - stats.matched} fields unmatched
                </div>
            </div>
        </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        #autofill-completion {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 2147483647;
            font-family: 'Segoe UI', system-ui, sans-serif;
            animation: slideIn 0.3s ease;
        }
        @keyframes slideIn {
            from { opacity: 0; transform: translateX(50px); }
            to { opacity: 1; transform: translateX(0); }
        }
        .autofill-notification {
            background: linear-gradient(135deg, #1a1a2e 0%, #252542 100%);
            border: 1px solid rgba(0, 217, 165, 0.3);
            border-radius: 12px;
            padding: 16px;
            min-width: 240px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 217, 165, 0.2);
            color: white;
        }
        .notif-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 12px;
        }
        .notif-icon {
            font-size: 20px;
        }
        .notif-title {
            font-size: 14px;
            font-weight: 600;
            flex: 1;
            background: linear-gradient(135deg, #00d9a5 0%, #6c5ce7 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .notif-close {
            background: none;
            border: none;
            color: #888;
            cursor: pointer;
            font-size: 14px;
            padding: 4px;
        }
        .notif-close:hover {
            color: white;
        }
        .notif-stats {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .stat-main {
            display: flex;
            align-items: baseline;
            gap: 6px;
        }
        .stat-number {
            font-size: 32px;
            font-weight: 700;
            color: #00d9a5;
        }
        .stat-label {
            font-size: 12px;
            color: #a0a0b0;
        }
        .stat-breakdown {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }
        .stat-item {
            font-size: 11px;
            background: rgba(255, 255, 255, 0.1);
            padding: 4px 8px;
            border-radius: 4px;
            color: #e0e0e0;
        }
        .stat-summary {
            font-size: 10px;
            color: #888;
            margin-top: 4px;
        }
    `;

    notification.appendChild(style);
    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// ===== Date Parsing and Formatting Helpers =====
function parseAnyDate(val) {
    if (val === undefined || val === null || val === "") return null;

    if (val instanceof Date) {
        if (isNaN(val.getTime())) return null;
        return {
            year: val.getFullYear(),
            month: val.getMonth() + 1,
            day: val.getDate(),
            hours: val.getHours(),
            minutes: val.getMinutes(),
            seconds: val.getSeconds()
        };
    }

    // Number or numeric string: Excel serial date or Unix timestamp
    if (typeof val === "number" || (typeof val === "string" && /^\d+(\.\d+)?$/.test(val.trim()))) {
        const num = Number(val);
        // Excel serial date range: ~1000 to ~100000 (e.g. 33008 = 1990-05-15, 45230 = 2023-10-31)
        if (num > 1000 && num < 100000) {
            const excelEpochMs = Date.UTC(1899, 11, 30);
            const ms = Math.round(num * 86400 * 1000);
            const d = new Date(excelEpochMs + ms);
            return {
                year: d.getUTCFullYear(),
                month: d.getUTCMonth() + 1,
                day: d.getUTCDate(),
                hours: d.getUTCHours(),
                minutes: d.getUTCMinutes(),
                seconds: d.getUTCSeconds()
            };
        } else if (num >= 1000000000 && num <= 9999999999) {
            // 10-digit Unix timestamp (seconds)
            const d = new Date(num * 1000);
            return {
                year: d.getUTCFullYear(),
                month: d.getUTCMonth() + 1,
                day: d.getUTCDate(),
                hours: d.getUTCHours(),
                minutes: d.getUTCMinutes(),
                seconds: d.getUTCSeconds()
            };
        } else if (num >= 1000000000000 && num <= 9999999999999) {
            // 13-digit Unix timestamp (ms)
            const d = new Date(num);
            return {
                year: d.getUTCFullYear(),
                month: d.getUTCMonth() + 1,
                day: d.getUTCDate(),
                hours: d.getUTCHours(),
                minutes: d.getUTCMinutes(),
                seconds: d.getUTCSeconds()
            };
        }
    }

    const str = String(val).trim();

    // 1. ISO date: YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD (with optional time)
    const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (isoMatch) {
        return {
            year: parseInt(isoMatch[1], 10),
            month: parseInt(isoMatch[2], 10),
            day: parseInt(isoMatch[3], 10),
            hours: isoMatch[4] ? parseInt(isoMatch[4], 10) : 0,
            minutes: isoMatch[5] ? parseInt(isoMatch[5], 10) : 0,
            seconds: isoMatch[6] ? parseInt(isoMatch[6], 10) : 0
        };
    }

    // 2. DD/MM/YYYY, MM/DD/YYYY, DD-MM-YYYY, DD.MM.YYYY
    const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (dmyMatch) {
        const p1 = parseInt(dmyMatch[1], 10);
        const p2 = parseInt(dmyMatch[2], 10);
        const y = parseInt(dmyMatch[3], 10);
        let m, d;

        if (p1 > 12 && p2 <= 12) {
            d = p1;
            m = p2;
        } else if (p2 > 12 && p1 <= 12) {
            m = p1;
            d = p2;
        } else {
            m = p1;
            d = p2;
        }
        return {
            year: y,
            month: m,
            day: d,
            hours: dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0,
            minutes: dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0,
            seconds: dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0
        };
    }

    // 3. Natural language strings like "May 15, 1990", "15 May 1990"
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
        return {
            year: parsed.getFullYear(),
            month: parsed.getMonth() + 1,
            day: parsed.getDate(),
            hours: parsed.getHours(),
            minutes: parsed.getMinutes(),
            seconds: parsed.getSeconds()
        };
    }

    return null;
}

function formatDateForInput(val, type = "date") {
    const parts = parseAnyDate(val);
    if (!parts) return String(val ?? "");

    const y = String(parts.year).padStart(4, "0");
    const m = String(parts.month).padStart(2, "0");
    const d = String(parts.day).padStart(2, "0");
    const hh = String(parts.hours).padStart(2, "0");
    const mm = String(parts.minutes).padStart(2, "0");

    if (type === "date") {
        return `${y}-${m}-${d}`;
    } else if (type === "datetime-local") {
        return `${y}-${m}-${d}T${hh}:${mm}`;
    } else if (type === "time") {
        return `${hh}:${mm}`;
    } else if (type === "month") {
        return `${y}-${m}`;
    } else if (type === "week") {
        const weekNum = getISOWeek(parts);
        return `${y}-W${String(weekNum).padStart(2, "0")}`;
    }
    return `${y}-${m}-${d}`;
}

function isDateField(element) {
    if (!element) return false;
    const type = element.type?.toLowerCase();
    if (["date", "datetime-local", "time", "month", "week"].includes(type)) return true;

    const name = (element.name || "").toLowerCase();
    const id = (element.id || "").toLowerCase();
    const placeholder = (element.placeholder || "").toLowerCase();
    const className = (element.className || "").toString().toLowerCase();
    const dataDate = element.getAttribute("data-date") || element.getAttribute("data-type");

    if (dataDate && dataDate.toLowerCase().includes("date")) return true;
    if (className.includes("datepicker") || className.includes("date-picker") || className.includes("flatpickr")) return true;
    if (/\b(yyyy|mm|dd)\b/i.test(placeholder)) return true;
    if (/\b(dob|birthdate|birth_date|date_of_birth|appointment_date|expiry_date|issue_date|start_date|end_date)\b/i.test(name) ||
        /\b(dob|birthdate|birth_date|date_of_birth|appointment_date|expiry_date|issue_date|start_date|end_date)\b/i.test(id)) {
        return true;
    }
    return false;
}

async function fillField(element, value, settings) {
    if (!element || value === undefined || value === null) return;

    const tagName = element.tagName.toLowerCase();
    const type = element.type?.toLowerCase();

    console.log("AutoFill Pro: fillField called for", tagName, "type:", type, "name:", element.name || element.id, "value:", value);

    // Focus the element first
    element.focus();

    // Small delay to ensure focus is registered
    await new Promise(r => setTimeout(r, 50));

    if (tagName === "select") {
        console.log("AutoFill Pro: Handling as SELECT");
        fillSelect(element, value);
    } else if (type === "checkbox") {
        fillCheckbox(element, value);
    } else if (type === "radio") {
        fillRadio(element, value);
    } else if (["date", "datetime-local", "time", "month", "week"].includes(type) || isDateField(element)) {
        await fillDateTimeField(element, value, type || "date");
    } else {
        // Regular text input
        element.value = value;

        // Dispatch multiple events for framework compatibility
        element.dispatchEvent(new Event("input", { bubbles: true }));
        element.dispatchEvent(new Event("change", { bubbles: true }));
        element.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
    }

    // Blur to trigger validation
    await new Promise(r => setTimeout(r, 50));
    element.blur();
}

function fillSelect(element, value) {
    const normalizedValue = value.toString().toLowerCase().trim();
    console.log("AutoFill Pro: Filling select", element.name || element.id, "with value:", normalizedValue);
    console.log("AutoFill Pro: Available options:", Array.from(element.options).map(o => ({ text: o.text, value: o.value })));

    // First try exact match on value or text
    for (const option of element.options) {
        const optionText = option.text.toLowerCase().trim();
        const optionValue = option.value.toLowerCase().trim();

        if (optionValue === normalizedValue || optionText === normalizedValue) {
            console.log("AutoFill Pro: Exact match found:", option.value);
            element.value = option.value;
            element.dispatchEvent(new Event("change", { bubbles: true }));
            return true;
        }
    }

    // Then try partial/contains match
    for (const option of element.options) {
        const optionText = option.text.toLowerCase().trim();
        const optionValue = option.value.toLowerCase().trim();

        if (optionText.includes(normalizedValue) || normalizedValue.includes(optionText) ||
            optionValue.includes(normalizedValue) || normalizedValue.includes(optionValue)) {
            console.log("AutoFill Pro: Partial match found:", option.value);
            element.value = option.value;
            element.dispatchEvent(new Event("change", { bubbles: true }));
            return true;
        }
    }

    console.log("AutoFill Pro: No match found for select");
    return false;
}

function fillCheckbox(element, value) {
    const normalizedValue = value.toString().toLowerCase().trim();
    const shouldCheck = ["true", "yes", "1", "checked", "on", "y"].includes(normalizedValue);

    if (element.checked !== shouldCheck) {
        element.checked = shouldCheck;
        element.dispatchEvent(new Event("change", { bubbles: true }));
    }
}

function fillRadio(element, value) {
    const normalizedValue = value.toString().toLowerCase().trim();
    const radioValue = element.value.toLowerCase().trim();

    if (radioValue === normalizedValue || normalizedValue.includes(radioValue) || radioValue.includes(normalizedValue)) {
        element.checked = true;
        element.dispatchEvent(new Event("change", { bubbles: true }));
    }
}

async function fillDateTimeField(element, value, type = "date") {
    const formattedValue = formatDateForInput(value, type);
    console.log("AutoFill Pro: Filling date field", type, "raw:", value, "formatted:", formattedValue);

    // Focus the element
    element.focus();
    await new Promise(r => setTimeout(r, 50));

    // Support Flatpickr if attached
    if (element._flatpickr && typeof element._flatpickr.setDate === "function") {
        try {
            element._flatpickr.setDate(formattedValue, true);
        } catch (e) {
            console.log("AutoFill Pro: Flatpickr setDate error", e);
        }
    }

    // Support jQuery UI datepicker if attached
    if (window.jQuery && typeof window.jQuery(element).datepicker === "function") {
        try {
            window.jQuery(element).datepicker("setDate", formattedValue);
        } catch (e) {}
    }

    // Set value using prototype setter for React / Vue / Angular compatibility
    try {
        const proto = Object.getPrototypeOf(element);
        const descriptor = Object.getOwnPropertyDescriptor(proto, "value") ||
                           Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
        if (descriptor && descriptor.set) {
            descriptor.set.call(element, formattedValue);
        } else {
            element.value = formattedValue;
        }
    } catch (e) {
        element.value = formattedValue;
    }

    // If native date input and has valueAsDate, verify or set
    if (type === "date" && !element.value && formattedValue) {
        try {
            const parts = parseAnyDate(formattedValue);
            if (parts) {
                element.valueAsDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
            }
        } catch (e) {}
    }

    // React controlled component value tracker update
    const tracker = element._valueTracker;
    if (tracker) {
        tracker.setValue("");
    }

    // Dispatch input and change events
    try {
        element.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    } catch (e) {}

    try {
        element.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    } catch (e) {}
}

function getISOWeek(dateInput) {
    let year, month, day;
    if (dateInput && dateInput.year) {
        year = dateInput.year;
        month = dateInput.month;
        day = dateInput.day;
    } else {
        const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
        year = date.getFullYear();
        month = date.getMonth() + 1;
        day = date.getDate();
    }
    const d = new Date(Date.UTC(year, month - 1, day));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function highlightField(element) {
    element.classList.add('autofill-highlight');
    setTimeout(() => {
        element.classList.remove('autofill-highlight');
    }, 2000);
}

// ===== Form Submit Listener =====
let lastSubmitNotification = 0;

function setupFormSubmitListener() {
    document.addEventListener('submit', handleFormSubmit, true);
}

function handleFormSubmit(e) {
    const now = Date.now();
    if (now - lastSubmitNotification < 1000) {
        return; // Debounce duplicate submissions within 1s
    }
    lastSubmitNotification = now;
    notifyFormSubmitted();
}

async function notifyFormSubmitted() {
    try {
        await chrome.runtime.sendMessage({ type: 'FORM_SUBMITTED' });
    } catch (error) {
        // Popup might be closed; inform background to advance index in storage
        try {
            await chrome.runtime.sendMessage({ type: 'ADVANCE_INDEX' });
        } catch (e) {}
    }
}

// ===== Message Listener =====
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'FILL_FORM') {
        const { record, headers, settings, currentIndex, totalRecords } = message.payload;

        updateBadge(`Filling record ${currentIndex + 1}/${totalRecords}...`, 'filling');

        fillForm(record, headers, settings)
            .then(filledCount => {
                updateBadge(`Filled ${filledCount} fields (${currentIndex + 1}/${totalRecords})`, 'success');
                sendResponse({ success: true, filledCount });
            })
            .catch(error => {
                updateBadge('Fill error', 'error');
                sendResponse({ success: false, error: error.message });
            });

        return true;
    }

    if (message.type === 'SCAN_FORM') {
        try {
            const fields = scanForm();
            sendResponse({
                success: true,
                fields: fields.map(f => ({
                    name: f.name,
                    id: f.id,
                    label: f.label,
                    placeholder: f.placeholder,
                    type: f.type,
                    required: f.required,
                    accept: f.accept
                }))
            });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
        return true;
    }

    if (message.type === 'GET_FILE_UPLOADS') {
        try {
            const uploads = getFileUploads();
            sendResponse({ success: true, uploads });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
        return true;
    }

    if (message.type === 'GET_FORM_FIELDS') {
        const fields = detectFormFields();
        sendResponse({
            success: true,
            fields: fields.map(f => ({
                name: f.name,
                id: f.id,
                label: f.label,
                placeholder: f.placeholder,
                type: f.type
            }))
        });
        return true;
    }

    if (message.type === 'TRIGGER_FILE_UPLOAD') {
        const { fieldName } = message.payload;
        try {
            // Find the file input by name or id
            let fileInput = document.querySelector(`input[type="file"][name="${fieldName}"]`);
            if (!fileInput) {
                fileInput = document.querySelector(`input[type="file"][id="${fieldName}"]`);
            }
            if (!fileInput) {
                // Try to find any file input if specific one not found
                const allFileInputs = document.querySelectorAll('input[type="file"]');
                for (const input of allFileInputs) {
                    const label = findLabel(input);
                    if (label.toLowerCase().includes(fieldName.toLowerCase()) ||
                        (input.name && input.name.toLowerCase().includes(fieldName.toLowerCase())) ||
                        (input.id && input.id.toLowerCase().includes(fieldName.toLowerCase()))) {
                        fileInput = input;
                        break;
                    }
                }
            }

            if (fileInput) {
                // Click the file input to trigger the file picker
                fileInput.click();
                sendResponse({ success: true });
            } else {
                sendResponse({ success: false, error: 'File input not found' });
            }
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
        return true;
    }

    if (message.type === 'FILL_FORM_WITH_UPLOADS') {
        const { record, headers, settings, fileUploads, currentIndex, totalRecords } = message.payload;

        updateBadge(`Filling record ${currentIndex + 1}/${totalRecords}...`, 'filling');

        (async () => {
            try {
                // First fill regular fields
                const filledCount = await fillForm(record, headers, settings);

                // Then handle file uploads - highlight them for user to click
                if (fileUploads && fileUploads.length > 0) {
                    console.log('AutoFill Pro: File uploads to handle:', fileUploads.length);
                    updateBadge(`Click to upload ${fileUploads.length} file(s)`, 'info');

                    // Highlight ALL file inputs on the page
                    const allFileInputs = document.querySelectorAll('input[type="file"]');
                    console.log('AutoFill Pro: Found', allFileInputs.length, 'file inputs on page');

                    allFileInputs.forEach((fileInput, idx) => {
                        console.log('AutoFill Pro: Highlighting file input', idx, fileInput.name || fileInput.id);

                        // Add CSS class
                        fileInput.classList.add('autofill-file-pending');

                        // Apply inline styles as fallback
                        fileInput.style.outline = '3px dashed #ffc107';
                        fileInput.style.outlineOffset = '4px';
                        fileInput.style.backgroundColor = 'rgba(255, 193, 7, 0.3)';

                        // Highlight parent wrapper too
                        const wrapper = fileInput.closest('.file-input-wrapper') || fileInput.parentElement;
                        if (wrapper && wrapper !== document.body) {
                            wrapper.classList.add('autofill-file-pending');
                            wrapper.style.outline = '3px dashed #ffc107';
                            wrapper.style.outlineOffset = '4px';
                            wrapper.style.backgroundColor = 'rgba(255, 193, 7, 0.3)';
                        }

                        // Scroll first one into view
                        if (idx === 0) {
                            fileInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }

                        // Add change listener
                        fileInput.addEventListener('change', function onFileChange() {
                            console.log('AutoFill Pro: File selected for input', idx);
                            fileInput.classList.remove('autofill-file-pending');
                            fileInput.style.outline = '';
                            fileInput.style.outlineOffset = '';
                            fileInput.style.backgroundColor = '';
                            if (wrapper) {
                                wrapper.classList.remove('autofill-file-pending');
                                wrapper.style.outline = '';
                                wrapper.style.outlineOffset = '';
                                wrapper.style.backgroundColor = '';
                            }
                            highlightField(fileInput);
                            updateBadge('File selected!', 'success');
                        }, { once: true });
                    });

                    // Keep the badge visible longer for file uploads
                    setTimeout(() => {
                        if (document.querySelector('.autofill-file-pending')) {
                            updateBadge('Click the yellow highlighted fields to upload files', 'info');
                        }
                    }, 3000);
                } else {
                    updateBadge(`Filled ${filledCount} fields (${currentIndex + 1}/${totalRecords})`, 'success');
                }

                sendResponse({ success: true, filledCount });
            } catch (error) {
                updateBadge('Fill error', 'error');
                sendResponse({ success: false, error: error.message });
            }
        })();

        return true;
    }
});

// ===== Start =====
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
