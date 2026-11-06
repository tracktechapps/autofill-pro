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
    if (!field || !field.identifiers) return null;
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

    // Safely normalize headers for matching, filtering out null/undefined/empty
    const safeHeaders = (Array.isArray(headers) ? headers : [])
        .filter(h => h !== undefined && h !== null && String(h).trim() !== '');

    const normalizedHeaders = safeHeaders.map(h => ({
        original: h,
        normalized: String(h).toLowerCase().replace(/[^a-z0-9]/g, '')
    })).filter(h => h.normalized.length > 0);

    for (const identifier of identifiers) {
        const normalizedId = String(identifier).toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!normalizedId) continue;

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
            if (aliases.some(alias => normalizedId.includes(alias.replace(/_/g, '')) || alias.replace(/_/g, '').includes(normalizedId))) {
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
    if (!record || typeof record !== 'object') {
        console.warn('AutoFill Pro: No record data provided to fillForm');
        return 0;
    }

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

    const safeHeaders = (Array.isArray(headers) && headers.length > 0)
        ? headers.filter(h => h !== undefined && h !== null)
        : Object.keys(record);

    console.log('AutoFill Pro: Detected fields:', fields.map(f => ({ name: f.name, id: f.id, type: f.type, identifiers: f.identifiers })));
    console.log('AutoFill Pro: Headers:', safeHeaders);
    console.log('AutoFill Pro: Record data:', record);

    const preferredFormat = settings?.preferredDateFormat || settings?.dateFormat || 'DMY';

    // Find composite date column if any
    let compositeDateParts = null;
    let dateHeaderKey = null;
    for (const h of safeHeaders) {
        if (!h) continue;
        const normH = String(h).toLowerCase().replace(/[^a-z0-9]/g, '');
        if (/^(dob|dateofbirth|birthdate|birthday|date|entrydate|appointmentdate)$/.test(normH)) {
            dateHeaderKey = h;
            break;
        }
    }
    if (dateHeaderKey && record[dateHeaderKey]) {
        compositeDateParts = parseAnyDate(record[dateHeaderKey], preferredFormat);
    }

    for (const field of fields) {
        let matchedHeader = matchFieldToHeader(field, safeHeaders);
        let value = null;

        // Check if field is an explicit split date component (standalone day, month, year)
        const splitType = getSplitDateFieldType(field);
        if (splitType && compositeDateParts && (!matchedHeader || record[matchedHeader] === undefined || record[matchedHeader] === '')) {
            if (splitType === 'day') {
                value = field.element.tagName === 'SELECT'
                    ? [String(compositeDateParts.day), String(compositeDateParts.day).padStart(2, '0')]
                    : String(compositeDateParts.day);
                matchedHeader = dateHeaderKey + ' (Day)';
            } else if (splitType === 'month') {
                value = field.element.tagName === 'SELECT'
                    ? getMonthCandidates(compositeDateParts.month)
                    : String(compositeDateParts.month);
                matchedHeader = dateHeaderKey + ' (Month)';
            } else if (splitType === 'year') {
                value = field.element.tagName === 'SELECT'
                    ? [String(compositeDateParts.year), String(compositeDateParts.year).slice(-2)]
                    : String(compositeDateParts.year);
                matchedHeader = dateHeaderKey + ' (Year)';
            }
        } else if (matchedHeader && record[matchedHeader] !== undefined && record[matchedHeader] !== '') {
            value = record[matchedHeader];
        }

        console.log('AutoFill Pro: Field', field.name || field.id, 'type:', field.type, '-> matched header:', matchedHeader, 'value:', value);

        if (value !== null && value !== undefined && (Array.isArray(value) ? value.length > 0 : value !== '')) {
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
                } else if (['date', 'datetime-local', 'time', 'month', 'week'].includes(type) || isDateField(field.element)) {
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
const MONTH_NAMES = {
    jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
    may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8,
    sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12
};

const MONTH_NAMES_LIST = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

function getMonthCandidates(monthNum) {
    if (!monthNum || monthNum < 1 || monthNum > 12) return [];
    const full = MONTH_NAMES_LIST[monthNum];
    const short = full.slice(0, 3);
    return [
        String(monthNum),
        String(monthNum).padStart(2, '0'),
        full,
        short,
        full.toLowerCase(),
        short.toLowerCase()
    ];
}

function parseAnyDate(val, preferredFormat = 'DMY') {
    if (val === undefined || val === null || val === "") return null;

    if (val instanceof Date) {
        if (isNaN(val.getTime())) return null;
        const isUtcMidnight = val.getUTCHours() === 0 && val.getUTCMinutes() === 0 && val.getUTCSeconds() === 0 &&
                              (val.getHours() !== 0 || val.getMinutes() !== 0);
        return {
            year: isUtcMidnight ? val.getUTCFullYear() : val.getFullYear(),
            month: isUtcMidnight ? val.getUTCMonth() + 1 : val.getMonth() + 1,
            day: isUtcMidnight ? val.getUTCDate() : val.getDate(),
            hours: isUtcMidnight ? 0 : val.getHours(),
            minutes: isUtcMidnight ? 0 : val.getMinutes(),
            seconds: isUtcMidnight ? 0 : val.getSeconds()
        };
    }

    // Number or numeric string: Excel serial date or Unix timestamp
    if (typeof val === "number" || (typeof val === "string" && /^\d+(\.\d+)?$/.test(val.trim()))) {
        const num = Number(val);
        // Excel serial date range: ~1000 to ~100000
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
    const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
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

    // 2. Text month formats: e.g. '05-Nov-1990', '5 Nov 1990', '5th November 1990'
    const dMonthYMatch = str.match(/^(\d{1,2})(?:st|nd|rd|th)?[\s\-_/]+([A-Za-z]+)[\s\-_/,]+(\d{2,4})(?:[T\s](\d{1,2}):(\d{1,2}))?/i);
    if (dMonthYMatch) {
        const monthKey = dMonthYMatch[2].toLowerCase().substring(0, 3);
        const m = MONTH_NAMES[dMonthYMatch[2].toLowerCase()] || MONTH_NAMES[monthKey];
        if (m) {
            let y = parseInt(dMonthYMatch[3], 10);
            if (y < 100) y = y < 50 ? 2000 + y : 1900 + y;
            return {
                year: y,
                month: m,
                day: parseInt(dMonthYMatch[1], 10),
                hours: dMonthYMatch[4] ? parseInt(dMonthYMatch[4], 10) : 0,
                minutes: dMonthYMatch[5] ? parseInt(dMonthYMatch[5], 10) : 0,
                seconds: 0
            };
        }
    }

    // Text month formats: e.g. 'Nov 5, 1990', 'November 05 1990'
    const monthDYMatch = str.match(/^([A-Za-z]+)[\s\-_/]+(\d{1,2})(?:st|nd|rd|th)?[\s\-_/,]+(\d{2,4})(?:[T\s](\d{1,2}):(\d{1,2}))?/i);
    if (monthDYMatch) {
        const monthKey = monthDYMatch[1].toLowerCase().substring(0, 3);
        const m = MONTH_NAMES[monthDYMatch[1].toLowerCase()] || MONTH_NAMES[monthKey];
        if (m) {
            let y = parseInt(monthDYMatch[3], 10);
            if (y < 100) y = y < 50 ? 2000 + y : 1900 + y;
            return {
                year: y,
                month: m,
                day: parseInt(monthDYMatch[2], 10),
                hours: monthDYMatch[4] ? parseInt(monthDYMatch[4], 10) : 0,
                minutes: monthDYMatch[5] ? parseInt(monthDYMatch[5], 10) : 0,
                seconds: 0
            };
        }
    }

    // 3. Delimited numeric dates: DD/MM/YYYY or MM/DD/YYYY or DD-MM-YYYY or DD.MM.YYYY
    const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
    if (dmyMatch) {
        const p1 = parseInt(dmyMatch[1], 10);
        const p2 = parseInt(dmyMatch[2], 10);
        let y = parseInt(dmyMatch[3], 10);
        if (y < 100) y = y < 50 ? 2000 + y : 1900 + y;

        let m, d;
        if (p1 > 12 && p2 <= 12) {
            d = p1;
            m = p2;
        } else if (p2 > 12 && p1 <= 12) {
            m = p1;
            d = p2;
        } else {
            if (preferredFormat === 'MDY') {
                m = p1;
                d = p2;
            } else {
                d = p1;
                m = p2;
            }
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

    return null;
}

function formatDateForTarget(parts, element, type = "date", preferredFormat = "DMY") {
    if (!parts) return "";
    const y = String(parts.year).padStart(4, "0");
    const m = String(parts.month).padStart(2, "0");
    const d = String(parts.day).padStart(2, "0");
    const hh = String(parts.hours || 0).padStart(2, "0");
    const mm = String(parts.minutes || 0).padStart(2, "0");

    const inputType = (element?.type || type || "date").toLowerCase();
    if (inputType === "date") {
        return `${y}-${m}-${d}`;
    } else if (inputType === "datetime-local") {
        return `${y}-${m}-${d}T${hh}:${mm}`;
    } else if (inputType === "time") {
        return `${hh}:${mm}`;
    } else if (inputType === "month") {
        return `${y}-${m}`;
    } else if (inputType === "week") {
        const weekNum = getISOWeek(parts);
        return `${y}-W${String(weekNum).padStart(2, "0")}`;
    }

    // Text inputs (e.g. datepicker attached to <input type="text">)
    const placeholder = ((element?.placeholder || "") + " " + (element?.getAttribute?.("pattern") || "") + " " + (element?.getAttribute?.("data-date-format") || "")).toLowerCase();

    let sep = "/";
    if (placeholder.includes("-")) sep = "-";
    else if (placeholder.includes(".")) sep = ".";

    let format = preferredFormat || "DMY";
    if (/d{1,2}[-/.]m{1,2}[-/.]y{2,4}/.test(placeholder)) format = "DMY";
    else if (/m{1,2}[-/.]d{1,2}[-/.]y{2,4}/.test(placeholder)) format = "MDY";
    else if (/y{4}[-/.]m{1,2}[-/.]d{1,2}/.test(placeholder)) format = "YMD";

    if (format === "MDY") return `${m}${sep}${d}${sep}${y}`;
    if (format === "YMD") return `${y}${sep === "/" ? "-" : sep}${m}${sep === "/" ? "-" : sep}${d}`;
    return `${d}${sep}${m}${sep}${y}`;
}

function formatDateForInput(val, type = "date", preferredFormat = "DMY") {
    const parts = parseAnyDate(val, preferredFormat);
    if (!parts) return String(val ?? "");
    return formatDateForTarget(parts, null, type, preferredFormat);
}

// ===== Split Date Field Detection =====
function getSplitDateFieldType(field) {
    if (!field) return null;
    const element = field.element;
    const type = (field.type || element?.type || '').toLowerCase();
    if (['date', 'datetime-local', 'month', 'week', 'time'].includes(type)) {
        return null;
    }

    const name = (field.name || element?.name || '').toLowerCase();
    const id = (field.id || element?.id || '').toLowerCase();
    const placeholder = (field.placeholder || element?.placeholder || '').toLowerCase();

    // If placeholder represents a full date format (e.g. "dd/mm/yyyy", "yyyy-mm-dd"), it's a full date field, NOT split
    if (/(yyyy|yy).*(mm|m).*(dd|d)|(dd|d).*(mm|m).*(yyyy|yy)|(mm|m).*(dd|d).*(yyyy|yy)/i.test(placeholder)) {
        return null;
    }

    // Check for explicit standalone day field: e.g. name="dob_day", name="birth_day", name="day", id="day", name="day_of_birth"
    if (/^(day|dd|birth_day|dob_day|bday_day|dob-day|birth-day|day_of_birth|birthdate_day)$/i.test(name) ||
        /^(day|dd|birth_day|dob_day|bday_day|dob-day|birth-day|day_of_birth|birthdate_day)$/i.test(id) ||
        /(^|[^a-z])(dob_day|birth_day|day_of_birth)([^a-z]|$)/i.test(name + ' ' + id)) {
        return 'day';
    }

    // Check for explicit standalone month field: e.g. name="dob_month", name="birth_month", name="month", id="month", name="month_of_birth"
    if (/^(month|mm|birth_month|dob_month|bday_month|dob-month|birth-month|month_of_birth|birthdate_month)$/i.test(name) ||
        /^(month|mm|birth_month|dob_month|bday_month|dob-month|birth-month|month_of_birth|birthdate_month)$/i.test(id) ||
        /(^|[^a-z])(dob_month|birth_month|month_of_birth)([^a-z]|$)/i.test(name + ' ' + id)) {
        return 'month';
    }

    // Check for explicit standalone year field: e.g. name="dob_year", name="birth_year", name="year", id="year", name="year_of_birth"
    if (/^(year|yyyy|yy|birth_year|dob_year|bday_year|dob-year|birth-year|year_of_birth|birthdate_year)$/i.test(name) ||
        /^(year|yyyy|yy|birth_year|dob_year|bday_year|dob-year|birth-year|year_of_birth|birthdate_year)$/i.test(id) ||
        /(^|[^a-z])(dob_year|birth_year|year_of_birth)([^a-z]|$)/i.test(name + ' ' + id)) {
        return 'year';
    }

    return null;
}

function isDateField(element) {
    if (!element) return false;
    const type = element.type?.toLowerCase();
    if (["date", "datetime-local", "time", "month", "week"].includes(type)) return true;

    // Do not treat explicit standalone split day/month/year components as single date fields
    if (getSplitDateFieldType({ element, name: element.name, id: element.id, placeholder: element.placeholder })) {
        return false;
    }

    const name = (element.name || "").toLowerCase();
    const id = (element.id || "").toLowerCase();
    const placeholder = (element.placeholder || "").toLowerCase();
    const className = (element.className || "").toString().toLowerCase();
    const dataDate = (element.getAttribute("data-date") || element.getAttribute("data-type") || "").toLowerCase();

    if (dataDate && dataDate.includes("date")) return true;
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
    await new Promise(r => setTimeout(r, 50));

    if (tagName === "select") {
        console.log("AutoFill Pro: Handling as SELECT");
        fillSelect(element, value);
    } else if (type === "checkbox") {
        fillCheckbox(element, value);
    } else if (type === "radio") {
        fillRadio(element, value);
    } else if (["date", "datetime-local", "time", "month", "week"].includes(type) || isDateField(element)) {
        await fillDateTimeField(element, value, type || "date", settings);
    } else {
        // Regular text / textarea input
        const stringValue = Array.isArray(value) ? String(value[0] ?? "") : String(value ?? "");

        try {
            const proto = Object.getPrototypeOf(element);
            const descriptor = Object.getOwnPropertyDescriptor(proto, "value") ||
                               Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
            if (descriptor && descriptor.set) {
                descriptor.set.call(element, stringValue);
            } else {
                element.value = stringValue;
            }
        } catch (e) {
            element.value = stringValue;
        }

        const tracker = element._valueTracker;
        if (tracker) {
            tracker.setValue("");
        }

        // Dispatch multiple events for React, Vue, Angular compatibility
        element.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
        element.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
        element.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, composed: true }));
    }

    // Blur to trigger validation
    await new Promise(r => setTimeout(r, 50));
    element.blur();
}

function fillSelect(element, value) {
    if (!element || !element.options || element.options.length === 0) return false;

    const candidates = Array.isArray(value) ? value : [value];
    const normalizedCandidates = candidates
        .map(c => String(c ?? '').toLowerCase().trim())
        .filter(c => c.length > 0);

    console.log("AutoFill Pro: Filling select", element.name || element.id, "with candidates:", normalizedCandidates);

    // 1. Exact match on value or text
    for (const cand of normalizedCandidates) {
        for (const option of element.options) {
            const optVal = option.value.toLowerCase().trim();
            const optText = option.text.toLowerCase().trim();

            if (optVal === cand || optText === cand) {
                console.log("AutoFill Pro: Exact match found:", option.value);
                element.value = option.value;
                element.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
                return true;
            }
        }
    }

    // 2. Contains match
    for (const cand of normalizedCandidates) {
        for (const option of element.options) {
            const optVal = option.value.toLowerCase().trim();
            const optText = option.text.toLowerCase().trim();

            if (optText.includes(cand) || optVal.includes(cand) ||
                (cand.length > 3 && (cand.includes(optText) || cand.includes(optVal)))) {
                console.log("AutoFill Pro: Match found:", option.value);
                element.value = option.value;
                element.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
                return true;
            }
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
        element.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    }
}

function fillRadio(element, value) {
    const normalizedValue = value.toString().toLowerCase().trim();
    const radioValue = element.value.toLowerCase().trim();

    if (radioValue === normalizedValue || normalizedValue.includes(radioValue) || radioValue.includes(normalizedValue)) {
        element.checked = true;
        element.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    }
}

async function fillDateTimeField(element, value, type = "date", settings = {}) {
    const preferredFormat = settings?.preferredDateFormat || settings?.dateFormat || 'DMY';
    const parts = parseAnyDate(value, preferredFormat);
    const formattedValue = parts ? formatDateForTarget(parts, element, type, preferredFormat) : String(value ?? "");
    console.log("AutoFill Pro: Filling date field", type, "raw:", value, "parts:", parts, "formatted:", formattedValue);

    // Focus the element
    element.focus();
    await new Promise(r => setTimeout(r, 50));

    if (parts) {
        const jsDate = new Date(parts.year, parts.month - 1, parts.day, parts.hours || 0, parts.minutes || 0);

        // Support Flatpickr: pass native JS Date to completely eliminate string format confusion
        if (element._flatpickr && typeof element._flatpickr.setDate === "function") {
            try {
                element._flatpickr.setDate(jsDate, true);
            } catch (e) {
                try {
                    element._flatpickr.setDate(formattedValue, true);
                } catch (err) {}
            }
        }

        // Support jQuery UI datepicker: pass native JS Date
        if (window.jQuery && typeof window.jQuery(element).datepicker === "function") {
            try {
                window.jQuery(element).datepicker("setDate", jsDate);
            } catch (e) {
                try {
                    window.jQuery(element).datepicker("setDate", formattedValue);
                } catch (err) {}
            }
        }

        // Support Pikaday if attached
        if (element._pikaday && typeof element._pikaday.setDate === "function") {
            try {
                element._pikaday.setDate(jsDate);
            } catch (e) {}
        }
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

    // If native date input, set valueAsDate (UTC midnight)
    if (parts && (type === "date" || element.type?.toLowerCase() === "date")) {
        try {
            element.value = `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
            element.valueAsDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
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
