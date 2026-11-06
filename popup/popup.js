/**
 * AutoFill Pro v2 - Popup Script
 * Handles UI interactions, file loading, mode switching, form scanning, and review
 */

// ===== Storage Keys =====
const STORAGE_KEYS = {
  DATA: 'autofill_data',
  HEADERS: 'autofill_headers',
  CURRENT_INDEX: 'autofill_current_index',
  MODE: 'autofill_mode',
  MAPPINGS: 'autofill_mappings',
  SETTINGS: 'autofill_settings',
  HISTORY: 'autofill_history',
  SCANNED_FIELDS: 'autofill_scanned_fields',
  THEME: 'autofill_theme',
  SITE_MAPPINGS: 'autofill_site_mappings'
};

// ===== State =====
let state = {
  mode: 'sequential',
  theme: 'dark',
  data: [],
  headers: [],
  currentIndex: 0,
  scannedFields: [],
  fileUploads: [],
  history: [],
  siteMappings: {},
  pendingRecord: null,
  settings: {
    autoAdvance: false,
    highlightFields: true,
    reviewMode: true,
    showNotifications: true,
    dateFormat: 'auto'
  },
  detectedDateFormat: 'DMY',
  // Data Manager state
  dataManager: {
    mode: 'standard', // 'standard' or 'pilot'
    dataset1: { files: [], data: [], headers: [] },
    dataset2: { files: [], data: [], headers: [] },
    columnMerges: [],
    fuzzyMatch: false,
    fieldMappings: [],
    sortConfig: { column: '', order: 'asc' },
    filterConfig: { column: '', operator: 'contains', value: '' },
    joinType: 'inner',
    outputData: [],
    outputHeaders: [],
    // Cleaning options
    cleaning: {
      trim: true,
      dedupe: false,
      dedupeColumn: '',
      normalizeCase: false,
      caseType: 'title',
      fillEmpty: false,
      fillEmptyValue: ''
    },
    // Validation rules
    validationRules: [],
    // Search
    searchQuery: '',
    searchRegex: false,
    // Analytics
    analytics: {
      processed: 0,
      unprocessed: 0,
      warnings: 0,
      reasons: {}
    },
    // Debug log
    debugLog: [],
    // Pilot Mode
    pilot: {
      data: [],
      headers: [],
      fileName: ''
    },
    references: [], // { id, name, data, headers }
    pilotKeyColumn: '',
    refKeyColumn: '',
    pilotFuzzyMatch: false,
    selectedOutputColumns: []
  }
};




// ===== DOM Elements =====
let elements = {};

// ===== Initialize DOM Elements =====
function initializeElements() {
  elements = {
    // Tabs
    tabBtns: document.querySelectorAll('.tab-btn'),
    tabFill: document.getElementById('tabFill'),
    tabScan: document.getElementById('tabScan'),
    tabHistory: document.getElementById('tabHistory'),

    // Mode toggle
    modeBtns: document.querySelectorAll('.mode-btn'),

    // Upload
    uploadZone: document.getElementById('uploadZone'),
    fileInput: document.getElementById('fileInput'),
    fileInfo: document.getElementById('fileInfo'),
    fileName: document.getElementById('fileName'),
    fileRecords: document.getElementById('fileRecords'),
    removeFile: document.getElementById('removeFile'),

    // Progress (Sequential)
    progressSection: document.getElementById('progressSection'),
    progressCount: document.getElementById('progressCount'),
    progressFill: document.getElementById('progressFill'),
    progressStatus: document.getElementById('progressStatus'),

    // Record Selector (Quick)
    recordSelector: document.getElementById('recordSelector'),
    recordInput: document.getElementById('recordInput'),
    totalRecords: document.getElementById('totalRecords'),
    prevRecord: document.getElementById('prevRecord'),
    nextRecord: document.getElementById('nextRecord'),

    // Uploads Required
    uploadsRequired: document.getElementById('uploadsRequired'),
    uploadsList: document.getElementById('uploadsList'),

    // Preview
    previewSection: document.getElementById('previewSection'),
    togglePreview: document.getElementById('togglePreview'),
    previewWrap: document.getElementById('previewWrap'),
    previewHead: document.getElementById('previewHead'),
    previewBody: document.getElementById('previewBody'),

    // Controls
    seqControls: document.getElementById('seqControls'),
    quickControls: document.getElementById('quickControls'),
    btnPrev: document.getElementById('btnPrev'),
    btnFill: document.getElementById('btnFill'),
    btnSkip: document.getElementById('btnSkip'),
    btnQuickFill: document.getElementById('btnQuickFill'),

    // Scan
    btnScanForm: document.getElementById('btnScanForm'),
    scanResults: document.getElementById('scanResults'),
    statFields: document.getElementById('statFields'),
    statUploads: document.getElementById('statUploads'),
    statRequired: document.getElementById('statRequired'),
    fieldsList: document.getElementById('fieldsList'),
    btnDownloadCSV: document.getElementById('btnDownloadCSV'),
    btnDownloadExcel: document.getElementById('btnDownloadExcel'),

    // History
    historyList: document.getElementById('historyList'),
    clearHistory: document.getElementById('clearHistory'),
    exportHistory: document.getElementById('exportHistory'),

    // Mappings
    mappingsList: document.getElementById('mappingsList'),
    addMapping: document.getElementById('addMapping'),

    // Theme
    themeToggle: document.getElementById('themeToggle'),

    // Review Modal
    reviewModal: document.getElementById('reviewModal'),
    reviewList: document.getElementById('reviewList'),
    uploadPrompts: document.getElementById('uploadPrompts'),
    closeReview: document.getElementById('closeReview'),
    btnCancelFill: document.getElementById('btnCancelFill'),
    btnConfirmFill: document.getElementById('btnConfirmFill'),

    // Settings
    settingsToggle: document.getElementById('settingsToggle'),
    settingsPanel: document.getElementById('settingsPanel'),
    autoAdvance: document.getElementById('autoAdvance'),
    highlightFields: document.getElementById('highlightFields'),
    reviewMode: document.getElementById('reviewMode'),
    showNotifications: document.getElementById('showNotifications'),
    dateFormat: document.getElementById('dateFormat'),
    btnReset: document.getElementById('btnReset'),

    // Data Manager
    tabData: document.getElementById('tabData'),
    dataset1Zone: document.getElementById('dataset1Zone'),
    dataset1Input: document.getElementById('dataset1Input'),
    dataset1Count: document.getElementById('dataset1Count'),
    dataset1Files: document.getElementById('dataset1Files'),
    dataset2Zone: document.getElementById('dataset2Zone'),
    dataset2Input: document.getElementById('dataset2Input'),
    dataset2Count: document.getElementById('dataset2Count'),
    dataset2Files: document.getElementById('dataset2Files'),
    mergeList: document.getElementById('mergeList'),
    addMergeRow: document.getElementById('addMergeRow'),
    fuzzyMatch: document.getElementById('fuzzyMatch'),
    fieldMappingList: document.getElementById('fieldMappingList'),
    autoMapBtn: document.getElementById('autoMapBtn'),
    addMappingRow: document.getElementById('addMappingRow'),
    sortColumn: document.getElementById('sortColumn'),
    sortOrder: document.getElementById('sortOrder'),
    filterColumn: document.getElementById('filterColumn'),
    filterOperator: document.getElementById('filterOperator'),
    filterValue: document.getElementById('filterValue'),
    joinType: document.getElementById('joinType'),
    btnGenerateOutput: document.getElementById('btnGenerateOutput'),
    outputSection: document.getElementById('outputSection'),
    outputCount: document.getElementById('outputCount'),
    outputPreview: document.getElementById('outputPreview'),
    btnExportCSV: document.getElementById('btnExportCSV'),
    btnExportExcel: document.getElementById('btnExportExcel'),
    btnUseForAutofill: document.getElementById('btnUseForAutofill'),

    // Cleaning
    cleanTrim: document.getElementById('cleanTrim'),
    cleanDedupe: document.getElementById('cleanDedupe'),
    cleanCase: document.getElementById('cleanCase'),
    cleanCaseType: document.getElementById('cleanCaseType'),
    cleanEmpty: document.getElementById('cleanEmpty'),
    cleanEmptyValue: document.getElementById('cleanEmptyValue'),

    // Validation
    validationList: document.getElementById('validationList'),
    addValidationRule: document.getElementById('addValidationRule'),

    // Search
    searchInput: document.getElementById('searchInput'),
    searchRegex: document.getElementById('searchRegex'),
    searchResults: document.getElementById('searchResults'),
    searchResultCount: document.getElementById('searchResultCount'),

    // Progress
    processProgress: document.getElementById('processProgress'),
    progressFillMini: document.getElementById('progressFillMini'),
    progressText: document.getElementById('progressText'),

    // Analytics
    analyticsSection: document.getElementById('analyticsSection'),
    analyticsProcessed: document.getElementById('analyticsProcessed'),
    analyticsUnprocessed: document.getElementById('analyticsUnprocessed'),
    analyticsWarnings: document.getElementById('analyticsWarnings'),
    analyticsReasons: document.getElementById('analyticsReasons'),
    btnExportReport: document.getElementById('btnExportReport'),

    // Debug
    debugToggle: document.getElementById('debugToggle'),
    debugPanel: document.getElementById('debugPanel'),
    debugLog: document.getElementById('debugLog'),
    clearDebugLog: document.getElementById('clearDebugLog'),
    exportDebugLog: document.getElementById('exportDebugLog'),

    // Mode Toggle
    modeStandard: document.getElementById('modeStandard'),
    modePilot: document.getElementById('modePilot'),
    modeDescription: document.getElementById('modeDescription'),
    standardModeSection: document.getElementById('standardModeSection'),
    pilotModeSection: document.getElementById('pilotModeSection'),

    // Pilot Mode
    pilotZone: document.getElementById('pilotZone'),
    pilotInput: document.getElementById('pilotInput'),
    pilotCount: document.getElementById('pilotCount'),
    pilotFiles: document.getElementById('pilotFiles'),
    clearPilotBtn: document.getElementById('clearPilotBtn'),
    referencesList: document.getElementById('referencesList'),
    addReferenceBtn: document.getElementById('addReferenceBtn'),
    clearAllRefsBtn: document.getElementById('clearAllRefsBtn'),
    referenceInput: document.getElementById('referenceInput'),
    keyPairsList: document.getElementById('keyPairsList'),
    addKeyPairBtn: document.getElementById('addKeyPairBtn'),
    pilotFuzzyMatch: document.getElementById('pilotFuzzyMatch'),
    wordBasedMatch: document.getElementById('wordBasedMatch'),
    allWordsMatch: document.getElementById('allWordsMatch'),
    formulasList: document.getElementById('formulasList'),
    addFormulaBtn: document.getElementById('addFormulaBtn'),
    matchPreviewSection: document.getElementById('matchPreviewSection'),
    previewStats: document.getElementById('previewStats'),
    previewResults: document.getElementById('previewResults'),
    outputRecordsFrom: document.getElementById('outputRecordsFrom'),
    outputDataPriority: document.getElementById('outputDataPriority'),
    outputColumnsList: document.getElementById('outputColumnsList'),
    selectAllColumns: document.getElementById('selectAllColumns'),
    btnPilotGenerate: document.getElementById('btnPilotGenerate')
  };
}


// ===== Initialize =====
async function init() {
  try {
    console.log('AutoFill Pro: Initializing popup...');

    // Initialize DOM elements first
    initializeElements();
    console.log('AutoFill Pro: DOM elements initialized');

    await loadState();
    console.log('AutoFill Pro: State loaded');

    setupEventListeners();
    console.log('AutoFill Pro: Event listeners set up');

    updateUI();
    console.log('AutoFill Pro: UI updated, initialization complete');
  } catch (error) {
    console.error('AutoFill Pro: Initialization error:', error);
  }
}


// ===== Load State from Storage =====
async function loadState() {
  try {
    const result = await chrome.storage.local.get([
      STORAGE_KEYS.DATA,
      STORAGE_KEYS.HEADERS,
      STORAGE_KEYS.CURRENT_INDEX,
      STORAGE_KEYS.MODE,
      STORAGE_KEYS.SETTINGS,
      STORAGE_KEYS.HISTORY,
      STORAGE_KEYS.SCANNED_FIELDS,
      STORAGE_KEYS.THEME,
      STORAGE_KEYS.SITE_MAPPINGS
    ]);

    state.data = result[STORAGE_KEYS.DATA] || [];
    state.headers = result[STORAGE_KEYS.HEADERS] || [];
    state.currentIndex = result[STORAGE_KEYS.CURRENT_INDEX] || 0;
    state.mode = result[STORAGE_KEYS.MODE] || 'sequential';
    state.settings = result[STORAGE_KEYS.SETTINGS] || state.settings;
    state.history = result[STORAGE_KEYS.HISTORY] || [];
    state.scannedFields = result[STORAGE_KEYS.SCANNED_FIELDS] || [];
    state.theme = result[STORAGE_KEYS.THEME] || 'dark';
    state.siteMappings = result[STORAGE_KEYS.SITE_MAPPINGS] || {};

    // Apply theme
    applyTheme(state.theme);

    // Apply settings to checkboxes
    if (elements.autoAdvance) elements.autoAdvance.checked = state.settings.autoAdvance;
    if (elements.highlightFields) elements.highlightFields.checked = state.settings.highlightFields;
    if (elements.reviewMode) elements.reviewMode.checked = state.settings.reviewMode;
    if (elements.showNotifications) elements.showNotifications.checked = state.settings.showNotifications;
    if (elements.dateFormat) elements.dateFormat.value = state.settings.dateFormat || 'auto';
    if (state.data && state.data.length > 0) {
      state.detectedDateFormat = detectDatasetDateFormat(state.data, state.headers);
    }
  } catch (error) {
    console.error('AutoFill Pro: Error loading state:', error);
  }
}


// ===== Save State to Storage =====
async function saveState() {
  await chrome.storage.local.set({
    [STORAGE_KEYS.DATA]: state.data,
    [STORAGE_KEYS.HEADERS]: state.headers,
    [STORAGE_KEYS.CURRENT_INDEX]: state.currentIndex,
    [STORAGE_KEYS.MODE]: state.mode,
    [STORAGE_KEYS.SETTINGS]: state.settings,
    [STORAGE_KEYS.HISTORY]: state.history
  });
}

// ===== Event Listeners =====
function setupEventListeners() {
  // Tabs
  elements.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Mode toggle
  elements.modeBtns.forEach(btn => {
    btn.addEventListener('click', () => switchMode(btn.dataset.mode));
  });

  // File upload
  elements.uploadZone?.addEventListener('click', () => elements.fileInput?.click());
  elements.fileInput?.addEventListener('change', handleFileSelect);
  elements.uploadZone?.addEventListener('dragover', handleDragOver);
  elements.uploadZone?.addEventListener('dragleave', handleDragLeave);
  elements.uploadZone?.addEventListener('drop', handleDrop);
  elements.removeFile?.addEventListener('click', removeFile);

  // Record selector
  elements.prevRecord?.addEventListener('click', () => navigateRecord(-1));
  elements.nextRecord?.addEventListener('click', () => navigateRecord(1));
  elements.recordInput?.addEventListener('change', handleRecordInputChange);

  // Preview toggle
  elements.togglePreview?.addEventListener('click', togglePreview);

  // Controls
  elements.btnPrev?.addEventListener('click', () => navigateRecord(-1));
  elements.btnFill?.addEventListener('click', handleFillClick);
  elements.btnSkip?.addEventListener('click', () => navigateRecord(1));
  elements.btnQuickFill?.addEventListener('click', handleFillClick);

  // Scan
  elements.btnScanForm?.addEventListener('click', scanCurrentForm);
  elements.btnDownloadCSV?.addEventListener('click', () => downloadTemplate('csv'));
  elements.btnDownloadExcel?.addEventListener('click', () => downloadTemplate('xlsx'));

  // History
  elements.clearHistory?.addEventListener('click', clearHistory);
  elements.exportHistory?.addEventListener('click', exportHistory);

  // Mappings
  elements.addMapping?.addEventListener('click', addNewMapping);

  // Theme toggle
  elements.themeToggle?.addEventListener('click', toggleTheme);

  // Review Modal
  elements.closeReview?.addEventListener('click', closeReviewModal);
  elements.btnCancelFill?.addEventListener('click', closeReviewModal);
  elements.btnConfirmFill?.addEventListener('click', confirmAndFill);
  document.querySelector('.modal-backdrop')?.addEventListener('click', closeReviewModal);

  // Settings
  elements.settingsToggle?.addEventListener('click', toggleSettings);
  elements.autoAdvance?.addEventListener('change', updateSettings);
  elements.highlightFields?.addEventListener('change', updateSettings);
  elements.reviewMode?.addEventListener('change', updateSettings);
  elements.showNotifications?.addEventListener('change', updateSettings);
  elements.dateFormat?.addEventListener('change', updateSettings);
  elements.btnReset?.addEventListener('click', resetAllData);

  // Data Manager events
  elements.dataset1Zone?.addEventListener('click', () => elements.dataset1Input?.click());
  elements.dataset1Input?.addEventListener('change', (e) => handleDatasetUpload(e, 1));
  elements.dataset1Zone?.addEventListener('dragover', (e) => handleDatasetDragOver(e, 1));
  elements.dataset1Zone?.addEventListener('dragleave', (e) => handleDatasetDragLeave(e, 1));
  elements.dataset1Zone?.addEventListener('drop', (e) => handleDatasetDrop(e, 1));

  elements.dataset2Zone?.addEventListener('click', () => elements.dataset2Input?.click());
  elements.dataset2Input?.addEventListener('change', (e) => handleDatasetUpload(e, 2));
  elements.dataset2Zone?.addEventListener('dragover', (e) => handleDatasetDragOver(e, 2));
  elements.dataset2Zone?.addEventListener('dragleave', (e) => handleDatasetDragLeave(e, 2));
  elements.dataset2Zone?.addEventListener('drop', (e) => handleDatasetDrop(e, 2));

  elements.autoMapBtn?.addEventListener('click', autoDetectMappings);
  elements.addMappingRow?.addEventListener('click', addFieldMappingRow);
  elements.sortColumn?.addEventListener('change', updateSortConfig);
  elements.sortOrder?.addEventListener('change', updateSortConfig);
  elements.filterColumn?.addEventListener('change', updateFilterConfig);
  elements.filterOperator?.addEventListener('change', updateFilterConfig);
  elements.filterValue?.addEventListener('input', updateFilterConfig);
  elements.joinType?.addEventListener('change', updateJoinType);
  elements.btnGenerateOutput?.addEventListener('click', generateOutput);
  elements.btnExportCSV?.addEventListener('click', () => exportOutput('csv'));
  elements.btnExportExcel?.addEventListener('click', () => exportOutput('xlsx'));
  elements.btnUseForAutofill?.addEventListener('click', useOutputForAutofill);

  // Column merge
  elements.addMergeRow?.addEventListener('click', addColumnMergeRow);

  // Validation
  elements.addValidationRule?.addEventListener('click', addValidationRuleRow);

  // Search
  elements.searchInput?.addEventListener('input', debounce(performSearch, 300));
  elements.searchRegex?.addEventListener('change', performSearch);

  // Analytics
  elements.btnExportReport?.addEventListener('click', exportAnalyticsReport);

  // Debug
  elements.debugToggle?.addEventListener('click', toggleDebugPanel);
  elements.clearDebugLog?.addEventListener('click', clearDebugLogEntries);
  elements.exportDebugLog?.addEventListener('click', exportDebugLogToFile);

  // Mode Toggle
  elements.modeStandard?.addEventListener('click', () => switchDataManagerMode('standard'));
  elements.modePilot?.addEventListener('click', () => switchDataManagerMode('pilot'));

  // Pilot Mode
  elements.pilotZone?.addEventListener('click', () => elements.pilotInput?.click());
  elements.pilotInput?.addEventListener('change', handlePilotUpload);
  elements.clearPilotBtn?.addEventListener('click', clearPilotData);
  elements.addReferenceBtn?.addEventListener('click', () => elements.referenceInput?.click());
  elements.referenceInput?.addEventListener('change', handleReferenceUpload);
  elements.clearAllRefsBtn?.addEventListener('click', clearAllReferences);
  elements.addKeyPairBtn?.addEventListener('click', addKeyPair);
  elements.addFormulaBtn?.addEventListener('click', addFormula);
  elements.selectAllColumns?.addEventListener('click', toggleAllOutputColumns);
  elements.btnPilotGenerate?.addEventListener('click', generatePilotOutput);
}




// ===== Update Settings =====
function updateSettings() {
  state.settings.autoAdvance = elements.autoAdvance?.checked ?? false;
  state.settings.highlightFields = elements.highlightFields?.checked ?? true;
  state.settings.reviewMode = elements.reviewMode?.checked ?? true;
  state.settings.showNotifications = elements.showNotifications?.checked ?? true;
  state.settings.dateFormat = elements.dateFormat?.value || 'auto';
  saveState();
  updateUI();
}

function toggleSettings() {
  elements.settingsPanel.classList.toggle('hidden');
  const arrow = elements.settingsToggle.querySelector('.arrow');
  if (arrow) {
    arrow.style.transform = elements.settingsPanel.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
  }
}

function resetAllData() {
  if (confirm('Are you sure you want to reset all data? This will clear all stored data, history, and mappings.')) {
    chrome.storage.local.clear();
    state.data = [];
    state.headers = [];
    state.currentIndex = 0;
    state.history = [];
    state.siteMappings = {};
    state.scannedFields = [];
    updateUI();
    alert('All data has been reset.');
  }
}

function togglePreview() {
  elements.previewWrap.classList.toggle('hidden');
  elements.togglePreview.textContent = elements.previewWrap.classList.contains('hidden') ? 'Show' : 'Hide';
}

// ===== Theme =====
function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme(state.theme);
  saveState();
}

function applyTheme(theme) {
  if (theme === 'light') {
    document.body.classList.add('light-theme');
  } else {
    document.body.classList.remove('light-theme');
  }

  if (elements.themeToggle) {
    elements.themeToggle.textContent = theme === 'dark' ? '🌙' : '☀️';
  }
}

// ===== UI Update =====
function updateUI() {
  // Update mode buttons
  elements.modeBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === state.mode);
  });

  // Show/hide mode-specific controls
  if (elements.seqControls) {
    elements.seqControls.classList.toggle('hidden', state.mode !== 'sequential');
  }
  if (elements.quickControls) {
    elements.quickControls.classList.toggle('hidden', state.mode !== 'quick');
  }

  // Update progress
  updateProgress();

  // Enable/disable controls based on data
  const hasData = state.data.length > 0;
  if (elements.btnFill) elements.btnFill.disabled = !hasData;
  if (elements.btnSkip) elements.btnSkip.disabled = !hasData;
  if (elements.btnPrev) elements.btnPrev.disabled = !hasData || state.currentIndex === 0;
  if (elements.btnQuickFill) elements.btnQuickFill.disabled = !hasData;

  // Show file info if data is loaded
  if (hasData) {
    if (elements.uploadZone) elements.uploadZone.classList.add('hidden');
    if (elements.fileInfo) elements.fileInfo.classList.remove('hidden');
    if (elements.progressSection) elements.progressSection.classList.remove('hidden');
    if (elements.recordSelector) elements.recordSelector.classList.remove('hidden');
    if (elements.previewSection) elements.previewSection.classList.remove('hidden');
    updatePreview();
  } else {
    if (elements.uploadZone) elements.uploadZone.classList.remove('hidden');
    if (elements.fileInfo) elements.fileInfo.classList.add('hidden');
    if (elements.progressSection) elements.progressSection.classList.add('hidden');
    if (elements.recordSelector) elements.recordSelector.classList.add('hidden');
    if (elements.previewSection) elements.previewSection.classList.add('hidden');
  }
}

function updateProgress() {
  const total = state.data.length;
  const current = state.currentIndex + 1;

  if (elements.progressCount) {
    elements.progressCount.textContent = `${total > 0 ? current : 0} / ${total}`;
  }

  if (elements.progressFill) {
    const percentage = total > 0 ? (current / total) * 100 : 0;
    elements.progressFill.style.width = `${percentage}%`;
  }

  if (elements.progressStatus) {
    if (total === 0) {
      elements.progressStatus.textContent = 'No data loaded';
    } else if (current >= total) {
      elements.progressStatus.textContent = 'All records completed';
    } else {
      elements.progressStatus.textContent = `Record ${current} of ${total}`;
    }
  }

  if (elements.recordInput) {
    elements.recordInput.value = total > 0 ? current : 0;
    elements.recordInput.max = total;
  }

  if (elements.totalRecords) {
    elements.totalRecords.textContent = total;
  }
}

function updatePreview() {
  if (!elements.previewHead || !elements.previewBody) return;
  if (state.headers.length === 0 || state.data.length === 0) {
    elements.previewHead.innerHTML = '';
    elements.previewBody.innerHTML = '';
    return;
  }

  // Display top headers (up to 6)
  const displayHeaders = state.headers.slice(0, 6);
  let headerHtml = '<tr><th>#</th>';
  for (const header of displayHeaders) {
    headerHtml += `<th>${escapeHtml(formatFieldName(header))}</th>`;
  }
  headerHtml += '</tr>';
  elements.previewHead.innerHTML = headerHtml;

  // Render context rows: previous, current, and next
  const start = Math.max(0, state.currentIndex - 1);
  const end = Math.min(state.data.length, state.currentIndex + 3);

  let bodyHtml = '';
  for (let i = start; i < end; i++) {
    const row = state.data[i];
    const isCurrent = i === state.currentIndex;
    bodyHtml += `<tr class="${isCurrent ? 'current' : ''}">`;
    bodyHtml += `<td>${i + 1}</td>`;
    for (const header of displayHeaders) {
      let val = row[header] || '';
      if (/date|dob|birth/i.test(header) && val) {
        const parsed = parseAnyDate(val);
        if (parsed) val = formatDateForInput(val, 'display', getEffectiveDateFormat());
      }
      bodyHtml += `<td>${escapeHtml(val)}</td>`;
    }
    bodyHtml += '</tr>';
  }
  elements.previewBody.innerHTML = bodyHtml;
}

// ===== Tab & Mode Switching =====
function switchTab(tabName) {
  elements.tabBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });

  const targetTab = document.getElementById(`tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
  if (targetTab) {
    targetTab.classList.add('active');
  }

  if (tabName === 'history') {
    renderHistory();
  } else if (tabName === 'mappings') {
    renderMappings();
  }
}

function switchMode(mode) {
  state.mode = mode;
  saveState();
  updateUI();
}

// ===== File Drag & Drop =====
function handleDragOver(e) {
  e.preventDefault();
  elements.uploadZone?.classList.add('drag-over');
}

function handleDragLeave(e) {
  e.preventDefault();
  elements.uploadZone?.classList.remove('drag-over');
}

function handleDrop(e) {
  e.preventDefault();
  elements.uploadZone?.classList.remove('drag-over');
  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    processSelectedFile(files[0]);
  }
}

function handleFileSelect(e) {
  const file = e.target.files?.[0];
  if (file) {
    processSelectedFile(file);
  }
}

async function processSelectedFile(file) {
  const extension = file.name.split('.').pop().toLowerCase();
  const supported = ['csv', 'xlsx', 'xls', 'json', 'txt', 'tsv'];
  if (!supported.includes(extension)) {
    alert(`Unsupported file format: .${extension}. Please upload CSV, Excel, JSON, or TSV.`);
    return;
  }

  const reader = new FileReader();

  if (['xlsx', 'xls'].includes(extension)) {
    reader.onload = async (e) => {
      try {
        const result = parseExcelLocal(e.target.result);
        state.headers = result.headers;
        state.data = result.data;
        state.currentIndex = 0;
        state.detectedDateFormat = detectDatasetDateFormat(state.data, state.headers);
        await saveState();
        showFileInfo(file.name, result.data.length);
        updateUI();
      } catch (err) {
        alert('Error parsing Excel file: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  } else {
    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        let result;
        if (extension === 'csv') {
          result = parseCSVLocal(text);
        } else if (extension === 'json') {
          result = parseJSONLocal(text);
        } else {
          result = parseTSVLocal(text);
        }
        state.headers = result.headers;
        state.data = result.data;
        state.currentIndex = 0;
        state.detectedDateFormat = detectDatasetDateFormat(state.data, state.headers);
        await saveState();
        showFileInfo(file.name, result.data.length);
        updateUI();
      } catch (err) {
        alert('Error parsing file: ' + err.message);
      }
    };
    reader.readAsText(file);
  }
}

// ===== Smart Date Helpers & Parsers =====
const MONTH_NAMES = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8,
  sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12
};

function getEffectiveDateFormat() {
  if (state.settings?.dateFormat && state.settings.dateFormat !== 'auto') {
    return state.settings.dateFormat;
  }
  return state.detectedDateFormat || 'DMY';
}

function detectDatasetDateFormat(data, headers) {
  let dmyEvidence = 0;
  let mdyEvidence = 0;

  if (!Array.isArray(data) || data.length === 0) return 'DMY';

  const checkValue = (val) => {
    if (!val || typeof val !== 'string') return;
    const str = val.trim();
    const match = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.]\d{2,4}/);
    if (match) {
      const p1 = parseInt(match[1], 10);
      const p2 = parseInt(match[2], 10);
      if (p1 > 12 && p2 <= 12) {
        dmyEvidence++;
      } else if (p2 > 12 && p1 <= 12) {
        mdyEvidence++;
      }
    }
  };

  const sampleLimit = Math.min(data.length, 300);
  for (let i = 0; i < sampleLimit; i++) {
    const row = data[i];
    if (!row) continue;
    if (Array.isArray(row)) {
      row.forEach(checkValue);
    } else if (typeof row === 'object') {
      Object.values(row).forEach(checkValue);
    }
  }

  if (dmyEvidence > mdyEvidence) return 'DMY';
  if (mdyEvidence > dmyEvidence) return 'MDY';
  return 'DMY';
}

function parseAnyDate(val, preferredFormat = null) {
  if (val === undefined || val === null || val === '') return null;
  const pref = preferredFormat || getEffectiveDateFormat();

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

  if (typeof val === 'number' || (typeof val === 'string' && /^\d+(\.\d+)?$/.test(val.trim()))) {
    const num = Number(val);
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

  // 1. ISO date: YYYY-MM-DD or YYYY/MM/DD
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
      if (pref === 'MDY') {
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

function formatDateForInput(val, type = 'date', preferredFormat = null) {
  const pref = preferredFormat || getEffectiveDateFormat();
  const parts = parseAnyDate(val, pref);
  if (!parts) return String(val ?? '');

  const y = String(parts.year).padStart(4, '0');
  const m = String(parts.month).padStart(2, '0');
  const d = String(parts.day).padStart(2, '0');
  const hh = String(parts.hours).padStart(2, '0');
  const mm = String(parts.minutes).padStart(2, '0');

  if (type === 'date') {
    return `${y}-${m}-${d}`;
  } else if (type === 'datetime-local') {
    return `${y}-${m}-${d}T${hh}:${mm}`;
  } else if (type === 'time') {
    return `${hh}:${mm}`;
  } else if (type === 'month') {
    return `${y}-${m}`;
  } else if (type === 'display') {
    if (pref === 'MDY') return `${m}/${d}/${y}`;
    if (pref === 'YMD') return `${y}-${m}-${d}`;
    return `${d}/${m}/${y}`;
  }
  return `${y}-${m}-${d}`;
}

function formatFieldName(name) {
  if (!name) return '';
  return name
    .replace(/[_-]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

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

// ===== Local File Parsers =====
function parseCSVLocal(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  const headers = parseCSVLine(lines[0]);
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length > 0) {
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] !== undefined ? values[index] : '';
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

function parseExcelLocal(arrayBuffer) {
  if (typeof XLSX === 'undefined') {
    throw new Error('Excel parsing library not loaded. Please try CSV format.');
  }

  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true, dateNF: 'yyyy-mm-dd' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (jsonData.length === 0) throw new Error('Excel file is empty');

  const headers = jsonData[0].map(h => String(h || '').trim());
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
  return { headers, data };
}

function parseJSONLocal(text) {
  const jsonData = JSON.parse(text);

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

function parseTSVLocal(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) {
    throw new Error('File is empty');
  }

  const delimiter = lines[0].includes('\t') ? '\t' : /\s{2,}/;
  const headers = lines[0].split(delimiter).map(h => h.trim());
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map(v => v.trim());
    if (values.length > 0) {
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] !== undefined ? values[index] : '';
      });
      data.push(row);
    }
  }

  return { headers, data };
}

// ===== File Info & Removal =====
function showFileInfo(name, recordCount) {
  if (elements.fileName) elements.fileName.textContent = name;
  if (elements.fileRecords) elements.fileRecords.textContent = `${recordCount} records`;
  if (elements.uploadZone) elements.uploadZone.classList.add('hidden');
  if (elements.fileInfo) elements.fileInfo.classList.remove('hidden');
}

async function removeFile() {
  state.data = [];
  state.headers = [];
  state.currentIndex = 0;
  if (elements.fileInput) elements.fileInput.value = '';
  await saveState();
  updateUI();
}

// ===== Record Navigation =====
function navigateRecord(delta) {
  const newIndex = state.currentIndex + delta;
  if (newIndex >= 0 && newIndex < state.data.length) {
    state.currentIndex = newIndex;
    chrome.storage.local.set({ [STORAGE_KEYS.CURRENT_INDEX]: state.currentIndex });
    updateUI();
  }
}

function handleRecordInputChange(e) {
  const val = parseInt(e.target.value, 10);
  if (!isNaN(val) && val >= 1 && val <= state.data.length) {
    state.currentIndex = val - 1;
    chrome.storage.local.set({ [STORAGE_KEYS.CURRENT_INDEX]: state.currentIndex });
    updateUI();
  } else {
    updateProgress();
  }
}

// ===== Fill & Review Handlers =====
async function handleFillClick() {
  if (state.data.length === 0 || state.currentIndex >= state.data.length) return;

  const record = state.data[state.currentIndex];
  state.pendingRecord = record;

  await detectFileUploads();

  if (state.settings.reviewMode) {
    showReviewModal(record);
  } else {
    await fillCurrentRecord();
  }
}

async function detectFileUploads() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      const response = await sendMessageToTab(tabs[0].id, {
        type: 'GET_FILE_UPLOADS'
      });

      if (response?.success) {
        state.fileUploads = response.uploads || [];
        showUploadsRequired();
      }
    }
  } catch (error) {
    console.error('Error detecting file uploads:', error);
    state.fileUploads = [];
  }
}

function showUploadsRequired() {
  if (state.fileUploads.length > 0) {
    let html = '';
    for (const upload of state.fileUploads) {
      html += `
        <div class="upload-item">
          <span class="upload-item-icon">📎</span>
          <div class="upload-item-info">
            <span class="upload-item-name">${escapeHtml(upload.label || upload.name)}</span>
            <span class="upload-item-type">${escapeHtml(upload.accept || 'Any file')}</span>
          </div>
        </div>
      `;
    }
    elements.uploadsList.innerHTML = html;
    elements.uploadsRequired.classList.remove('hidden');
  } else {
    elements.uploadsRequired.classList.add('hidden');
  }
}

function showReviewModal(record) {
  let reviewHtml = '';
  for (const [key, value] of Object.entries(record)) {
    if (value !== undefined && value !== null && value !== '') {
      const isDate = /date|dob|birth/i.test(key);
      const displayKey = formatFieldName(key);
      let displayValue = String(value);
      if (isDate) {
        const parsed = parseAnyDate(value);
        if (parsed) {
          displayValue = `📅 ${formatDateForInput(value, 'display', getEffectiveDateFormat())}`;
        }
      }
      reviewHtml += `
        <div class="review-item">
          <span class="review-field">${escapeHtml(displayKey)}</span>
          <span class="review-value">${escapeHtml(displayValue)}</span>
        </div>
      `;
    }
  }
  elements.reviewList.innerHTML = reviewHtml;

  let uploadsHtml = '';
  for (const upload of state.fileUploads) {
    uploadsHtml += `
      <div class="upload-prompt" data-field="${escapeHtml(upload.name)}">
        <div class="prompt-info">
          <span class="prompt-icon">📎</span>
          <div>
            <div class="prompt-name">${escapeHtml(upload.label || upload.name)}</div>
            <div class="prompt-status" id="status-${upload.name}">Click to select file</div>
          </div>
        </div>
        <button class="btn btn-secondary btn-upload" onclick="selectUploadFile('${upload.name}')">
          Browse
        </button>
      </div>
    `;
  }
  elements.uploadPrompts.innerHTML = uploadsHtml;
  elements.reviewModal.classList.remove('hidden');
}

function closeReviewModal() {
  elements.reviewModal.classList.add('hidden');
}

async function confirmAndFill() {
  const recordToFill = state.pendingRecord || state.data[state.currentIndex];
  elements.reviewModal.classList.add('hidden');
  await fillCurrentRecordWithData(recordToFill);
}

async function fillCurrentRecord() {
  if (state.data.length === 0 || state.currentIndex >= state.data.length) return;
  const record = state.pendingRecord || state.data[state.currentIndex];
  await fillCurrentRecordWithData(record);
}

// ===== Safe Message Sender with Auto-Injection =====
async function sendMessageToTab(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    if (error.message?.includes('Receiving end does not exist') ||
        error.message?.includes('Could not establish connection')) {
      console.log('AutoFill Pro: Content script not found in tab, auto-injecting...');
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content/autofill.js']
        });
        await new Promise(r => setTimeout(r, 200));
        return await chrome.tabs.sendMessage(tabId, message);
      } catch (injectErr) {
        console.error('AutoFill Pro: Auto-injection failed:', injectErr);
        throw injectErr;
      }
    }
    throw error;
  }
}

async function fillCurrentRecordWithData(record) {
  if (!record) {
    console.error('No record data to fill');
    return;
  }

  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      const headersToSend = (Array.isArray(state.headers) && state.headers.length > 0)
        ? state.headers
        : Object.keys(record);

      const effectiveSettings = {
        ...state.settings,
        preferredDateFormat: getEffectiveDateFormat()
      };

      if (state.fileUploads && state.fileUploads.length > 0) {
        await sendMessageToTab(tabs[0].id, {
          type: 'FILL_FORM_WITH_UPLOADS',
          payload: {
            record: record,
            headers: headersToSend,
            settings: effectiveSettings,
            fileUploads: state.fileUploads,
            currentIndex: state.currentIndex,
            totalRecords: state.data.length
          }
        });
      } else {
        await sendMessageToTab(tabs[0].id, {
          type: 'FILL_FORM',
          payload: {
            record: record,
            headers: headersToSend,
            settings: effectiveSettings,
            currentIndex: state.currentIndex,
            totalRecords: state.data.length
          }
        });
      }

      addToHistory(record, tabs[0].url);

      const fieldMappings = {};
      for (const header of state.headers) {
        fieldMappings[header] = header;
      }
      await saveSiteMapping(tabs[0].url, fieldMappings);
    }
  } catch (error) {
    console.error('Fill error:', error);
  }

  state.pendingRecord = null;
  state.fileUploads = [];
}

// ===== Form Scanning =====
async function scanCurrentForm() {
  elements.btnScanForm.disabled = true;
  elements.btnScanForm.innerHTML = '<span>🔍 Scanning...</span>';

  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      const response = await sendMessageToTab(tabs[0].id, {
        type: 'SCAN_FORM'
      });

      if (response?.success) {
        state.scannedFields = response.fields;
        await chrome.storage.local.set({
          [STORAGE_KEYS.SCANNED_FIELDS]: state.scannedFields
        });
        displayScanResults(response.fields);
      } else {
        throw new Error(response?.error || 'Failed to scan form');
      }
    }
  } catch (error) {
    console.error('Scan error:', error);
    alert('Error scanning form: ' + error.message);
  }

  elements.btnScanForm.disabled = false;
  elements.btnScanForm.innerHTML = '<span>🔍 Scan Current Page</span>';
}

function displayScanResults(fields) {
  const textFields = fields.filter(f => !['file', 'submit', 'button', 'reset'].includes(f.type));
  const uploadFields = fields.filter(f => f.type === 'file');
  const requiredFields = fields.filter(f => f.required);

  elements.statFields.textContent = textFields.length;
  elements.statUploads.textContent = uploadFields.length;
  elements.statRequired.textContent = requiredFields.length;

  const typeIcons = {
    text: '📝',
    email: '📧',
    tel: '📞',
    number: '🔢',
    date: '📅',
    'datetime-local': '📅',
    time: '⏰',
    month: '🗓️',
    week: '📆',
    file: '📎',
    select: '📋',
    textarea: '📄',
    checkbox: '☑️',
    radio: '⭕',
    password: '🔒',
    url: '🔗'
  };

  let fieldsHtml = '';
  for (const field of textFields.slice(0, 15)) {
    const icon = typeIcons[field.type] || '📝';
    fieldsHtml += `
      <div class="field-item">
        <span class="field-type">${icon}</span>
        <div class="field-info">
          <div class="field-name">${escapeHtml(field.name || field.id || 'unnamed')}</div>
          <div class="field-label">${escapeHtml(field.label || field.placeholder || field.type)}</div>
        </div>
      </div>
    `;
  }

  if (textFields.length > 15) {
    fieldsHtml += `<div class="field-item"><span>... and ${textFields.length - 15} more fields</span></div>`;
  }

  elements.fieldsList.innerHTML = fieldsHtml;
  elements.scanResults.classList.remove('hidden');
}

function downloadTemplate(format) {
  if (state.scannedFields.length === 0) {
    alert('Please scan a form first');
    return;
  }

  const textFields = state.scannedFields.filter(f =>
    !['file', 'submit', 'button', 'reset', 'hidden'].includes(f.type)
  );

  const headers = textFields.map(f => f.name || f.id || f.label || 'field');

  if (format === 'csv') {
    const csvContent = headers.join(',') + '\n' + headers.map(() => '').join(',');
    downloadFile(csvContent, 'form_template.csv', 'text/csv');
  } else {
    // For Excel
    const csvContent = headers.join(',') + '\n' + headers.map(() => '').join(',');
    downloadFile(csvContent, 'form_template.csv', 'text/csv');
  }
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ===== History =====
function addToHistory(record, url) {
  const historyItem = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    url: url || '',
    recordPreview: Object.values(record).slice(0, 2).join(', ')
  };

  state.history.unshift(historyItem);
  if (state.history.length > 50) {
    state.history = state.history.slice(0, 50);
  }
  chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: state.history });
}

function renderHistory() {
  if (!elements.historyList) return;

  if (state.history.length === 0) {
    elements.historyList.innerHTML = '<div class="history-empty">No history yet</div>';
    return;
  }

  let html = '';
  for (const item of state.history) {
    const date = new Date(item.timestamp);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = date.toLocaleDateString();

    html += `
      <div class="history-item">
        <div class="history-info">
          <div class="history-preview">${escapeHtml(item.recordPreview)}</div>
          <div class="history-meta">${timeStr} · ${dateStr}</div>
        </div>
      </div>
    `;
  }
  elements.historyList.innerHTML = html;
}

function clearHistory() {
  if (confirm('Are you sure you want to clear autofill history?')) {
    state.history = [];
    chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: [] });
    renderHistory();
  }
}

function exportHistory() {
  if (state.history.length === 0) {
    alert('No history to export');
    return;
  }

  const headers = ['Date', 'Time', 'Record', 'URL'];
  const rows = state.history.map(item => {
    const date = new Date(item.timestamp);
    return [
      date.toLocaleDateString(),
      date.toLocaleTimeString(),
      `"${(item.recordPreview || '').replace(/"/g, '""')}"`,
      `"${(item.url || '').replace(/"/g, '""')}"`
    ].join(',');
  });

  const csvContent = headers.join(',') + '\n' + rows.join('\n');
  downloadFile(csvContent, 'autofill_history.csv', 'text/csv');
}

// ===== Mappings =====
function renderMappings() {
  if (!elements.mappingsList) return;

  const entries = Object.entries(state.siteMappings);
  if (entries.length === 0) {
    elements.mappingsList.innerHTML = '<div class="mappings-empty">No saved mappings</div>';
    return;
  }

  let html = '';
  for (const [url, mappings] of entries) {
    const count = Object.keys(mappings).length;
    html += `
      <div class="mapping-item">
        <div class="mapping-info">
          <div class="mapping-url">${escapeHtml(url)}</div>
          <div class="mapping-count">${count} fields mapped</div>
        </div>
      </div>
    `;
  }
  elements.mappingsList.innerHTML = html;
}

function addNewMapping() {
  alert('Site mappings are automatically saved when you fill forms on any page.');
}

async function saveSiteMapping(url, fieldMappings) {
  try {
    const domain = new URL(url).hostname;
    state.siteMappings[domain] = fieldMappings;
    await chrome.storage.local.set({
      [STORAGE_KEYS.SITE_MAPPINGS]: state.siteMappings
    });
  } catch (error) {
    console.error('Error saving site mapping:', error);
  }
}

// ===== Global function for upload file selection =====
window.selectUploadFile = async function (fieldName) {
  alert(`File selection for "${fieldName}" will be prompted during fill.`);
};

// ===== Listen for messages and storage changes =====
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FORM_SUBMITTED') {
    if (state.mode === 'sequential' && state.settings.autoAdvance) {
      navigateRecord(1);
    }
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes[STORAGE_KEYS.CURRENT_INDEX]) {
    const newIdx = changes[STORAGE_KEYS.CURRENT_INDEX].newValue;
    if (typeof newIdx === 'number' && newIdx !== state.currentIndex) {
      state.currentIndex = newIdx;
      updateUI();
    }
  }
});

// ===== Helper Functions =====
function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}


// ===== Data Manager Functions =====

// Dataset Upload Handlers
function handleDatasetDragOver(e, datasetNum) {
  e.preventDefault();
  const zone = datasetNum === 1 ? elements.dataset1Zone : elements.dataset2Zone;
  zone?.classList.add('drag-over');
}

function handleDatasetDragLeave(e, datasetNum) {
  e.preventDefault();
  const zone = datasetNum === 1 ? elements.dataset1Zone : elements.dataset2Zone;
  zone?.classList.remove('drag-over');
}

function handleDatasetDrop(e, datasetNum) {
  e.preventDefault();
  const zone = datasetNum === 1 ? elements.dataset1Zone : elements.dataset2Zone;
  zone?.classList.remove('drag-over');
  const files = Array.from(e.dataTransfer.files);
  processDatasetFiles(files, datasetNum);
}

function handleDatasetUpload(e, datasetNum) {
  const files = Array.from(e.target.files);
  processDatasetFiles(files, datasetNum);
}

async function processDatasetFiles(files, datasetNum) {
  const dataset = datasetNum === 1 ? state.dataManager.dataset1 : state.dataManager.dataset2;
  const supportedFormats = ['csv', 'xlsx', 'xls', 'json', 'txt', 'tsv'];

  for (const file of files) {
    const extension = file.name.split('.').pop().toLowerCase();
    if (!supportedFormats.includes(extension)) {
      logDebug(`Skipped unsupported file: ${file.name}`, 'warning');
      continue;
    }

    try {
      const reader = new FileReader();

      reader.onload = async (e) => {
        const data = e.target.result;
        let result;

        try {
          // Parse directly using local parsers
          switch (extension) {
            case 'csv':
              result = parseCSVLocal(data);
              break;
            case 'xlsx':
            case 'xls':
              result = parseExcelLocal(data);
              break;
            case 'json':
              result = parseJSONLocal(data);
              break;
            case 'txt':
            case 'tsv':
              result = parseTSVLocal(data);
              break;
            default:
              throw new Error(`Unsupported file type: ${extension}`);
          }

          // Merge headers and data
          const newHeaders = result.headers.filter(h => !dataset.headers.includes(h));
          dataset.headers = [...dataset.headers, ...newHeaders];
          dataset.data = [...dataset.data, ...result.data];
          dataset.files.push({ name: file.name, rows: result.data.length });

          updateDatasetUI(datasetNum);
          updateMappingSelectors();
          updateSortFilterSelectors();
          logDebug(`Loaded ${file.name}: ${result.data.length} records`, 'success');

        } catch (parseError) {
          logDebug(`Failed to parse ${file.name}: ${parseError.message}`, 'error');
        }
      };

      // Use text reading for text-based formats, ArrayBuffer for Excel
      if (['csv', 'json', 'txt', 'tsv'].includes(extension)) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    } catch (error) {
      console.error('Dataset file processing error:', error);
      logDebug(`Error processing ${file.name}: ${error.message}`, 'error');
    }
  }
}


function updateDatasetUI(datasetNum) {
  const dataset = datasetNum === 1 ? state.dataManager.dataset1 : state.dataManager.dataset2;
  const countEl = datasetNum === 1 ? elements.dataset1Count : elements.dataset2Count;
  const filesEl = datasetNum === 1 ? elements.dataset1Files : elements.dataset2Files;

  if (countEl) countEl.textContent = `${dataset.data.length} records`;

  if (filesEl && dataset.files.length > 0) {
    filesEl.classList.remove('hidden');
    filesEl.innerHTML = dataset.files.map((f, i) => `
      <div class="dataset-file-item">
        <div class="dataset-file-info">
          <span class="dataset-file-name">📄 ${escapeHtml(f.name)}</span>
          <span class="dataset-file-rows">${f.rows} rows</span>
        </div>
        <button class="dataset-file-remove" onclick="removeDatasetFile(${datasetNum}, ${i})">✕</button>
      </div>
    `).join('');
  }
}

window.removeDatasetFile = function (datasetNum, fileIndex) {
  const dataset = datasetNum === 1 ? state.dataManager.dataset1 : state.dataManager.dataset2;
  dataset.files.splice(fileIndex, 1);
  // Note: For simplicity, we're not removing the actual data rows (would need to track which rows came from which file)
  updateDatasetUI(datasetNum);
};

// Mapping Functions
function updateMappingSelectors() {
  const ds1Headers = state.dataManager.dataset1.headers;
  const ds2Headers = state.dataManager.dataset2.headers;

  if (ds1Headers.length > 0 && ds2Headers.length > 0) {
    elements.fieldMappingList.innerHTML = '';
    addFieldMappingRow();
  }
}

function addFieldMappingRow() {
  const ds1Headers = state.dataManager.dataset1.headers;
  const ds2Headers = state.dataManager.dataset2.headers;

  if (ds1Headers.length === 0 || ds2Headers.length === 0) {
    return;
  }

  const rowId = Date.now();
  const row = document.createElement('div');
  row.className = 'mapping-row';
  row.dataset.id = rowId;
  row.innerHTML = `
    <select class="select-control mapping-ds1" data-row="${rowId}">
      <option value="">Select DS1 field...</option>
      ${ds1Headers.map(h => `<option value="${escapeHtml(h)}">${escapeHtml(h)}</option>`).join('')}
    </select>
    <span class="mapping-arrow">↔</span>
    <select class="select-control mapping-ds2" data-row="${rowId}">
      <option value="">Select DS2 field...</option>
      ${ds2Headers.map(h => `<option value="${escapeHtml(h)}">${escapeHtml(h)}</option>`).join('')}
    </select>
    <button class="mapping-remove" onclick="removeMappingRow(${rowId})">✕</button>
  `;

  elements.fieldMappingList.appendChild(row);

  // Add change listeners
  row.querySelector('.mapping-ds1').addEventListener('change', updateFieldMappings);
  row.querySelector('.mapping-ds2').addEventListener('change', updateFieldMappings);
}

window.removeMappingRow = function (rowId) {
  const row = document.querySelector(`.mapping-row[data-id="${rowId}"]`);
  if (row) row.remove();
  updateFieldMappings();
};

function updateFieldMappings() {
  const rows = elements.fieldMappingList.querySelectorAll('.mapping-row');
  state.dataManager.fieldMappings = [];

  rows.forEach(row => {
    const ds1Select = row.querySelector('.mapping-ds1');
    const ds2Select = row.querySelector('.mapping-ds2');
    if (ds1Select?.value && ds2Select?.value) {
      state.dataManager.fieldMappings.push({
        ds1Field: ds1Select.value,
        ds2Field: ds2Select.value
      });
    }
  });
}

function autoDetectMappings() {
  const ds1Headers = state.dataManager.dataset1.headers;
  const ds2Headers = state.dataManager.dataset2.headers;

  if (ds1Headers.length === 0 || ds2Headers.length === 0) {
    alert('Please load both datasets first');
    return;
  }

  elements.fieldMappingList.innerHTML = '';
  state.dataManager.fieldMappings = [];

  // Find matching headers
  ds1Headers.forEach(h1 => {
    const normalized1 = h1.toLowerCase().replace(/[^a-z0-9]/g, '');

    for (const h2 of ds2Headers) {
      const normalized2 = h2.toLowerCase().replace(/[^a-z0-9]/g, '');

      if (normalized1 === normalized2 || normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
        // Create mapping row with pre-selected values
        const rowId = Date.now() + Math.random();
        const row = document.createElement('div');
        row.className = 'mapping-row';
        row.dataset.id = rowId;
        row.innerHTML = `
          <select class="select-control mapping-ds1" data-row="${rowId}">
            <option value="">Select DS1 field...</option>
            ${ds1Headers.map(h => `<option value="${escapeHtml(h)}" ${h === h1 ? 'selected' : ''}>${escapeHtml(h)}</option>`).join('')}
          </select>
          <span class="mapping-arrow">↔</span>
          <select class="select-control mapping-ds2" data-row="${rowId}">
            <option value="">Select DS2 field...</option>
            ${ds2Headers.map(h => `<option value="${escapeHtml(h)}" ${h === h2 ? 'selected' : ''}>${escapeHtml(h)}</option>`).join('')}
          </select>
          <button class="mapping-remove" onclick="removeMappingRow(${rowId})">✕</button>
        `;

        elements.fieldMappingList.appendChild(row);
        state.dataManager.fieldMappings.push({ ds1Field: h1, ds2Field: h2 });
        break;
      }
    }
  });

  if (state.dataManager.fieldMappings.length === 0) {
    elements.fieldMappingList.innerHTML = '<div class="mapping-empty"><p>No matching fields found</p></div>';
  }
}

// Sort & Filter Functions
function updateSortFilterSelectors() {
  const allHeaders = [...new Set([
    ...state.dataManager.dataset1.headers,
    ...state.dataManager.dataset2.headers
  ])];

  const sortOptions = '<option value="">Sort by column...</option>' +
    allHeaders.map(h => `<option value="${escapeHtml(h)}">${escapeHtml(h)}</option>`).join('');
  const filterOptions = '<option value="">Filter column...</option>' +
    allHeaders.map(h => `<option value="${escapeHtml(h)}">${escapeHtml(h)}</option>`).join('');

  if (elements.sortColumn) elements.sortColumn.innerHTML = sortOptions;
  if (elements.filterColumn) elements.filterColumn.innerHTML = filterOptions;
}

function updateSortConfig() {
  state.dataManager.sortConfig.column = elements.sortColumn?.value || '';
  state.dataManager.sortConfig.order = elements.sortOrder?.value || 'asc';
}

function updateFilterConfig() {
  state.dataManager.filterConfig.column = elements.filterColumn?.value || '';
  state.dataManager.filterConfig.operator = elements.filterOperator?.value || 'contains';
  state.dataManager.filterConfig.value = elements.filterValue?.value || '';
}

function updateJoinType() {
  state.dataManager.joinType = elements.joinType?.value || 'inner';
}

// Output Generation with Full Processing Pipeline
function generateOutput() {
  const { dataset1, dataset2, columnMerges, fieldMappings, joinType, sortConfig, filterConfig, validationRules } = state.dataManager;

  // Update fuzzy match from checkbox
  state.dataManager.fuzzyMatch = elements.fuzzyMatch?.checked || false;

  if (dataset1.data.length === 0) {
    alert('Please load Dataset 1');
    return;
  }

  // Reset analytics and start logging
  resetAnalytics();
  logDebug('Starting output generation...', 'info');
  showProgress(0, 'Initializing...');

  try {
    // Step 1: Apply cleaning to dataset1
    showProgress(10, 'Cleaning data...');
    const cleaningConfig = getCleaningConfig();
    const cleanResult = cleanData(dataset1.data, dataset1.headers, cleaningConfig);
    let ds1DataCleaned = cleanResult.data;
    state.dataManager.analytics.warnings += cleanResult.warnings;

    // Step 2: Apply column merges
    showProgress(25, 'Applying column merges...');
    let ds1Data = applyColumnMerges(ds1DataCleaned, columnMerges);
    let ds1Headers = [...dataset1.headers];

    // Add merged column names to headers
    columnMerges.forEach(merge => {
      if (merge.outputName && !ds1Headers.includes(merge.outputName)) {
        ds1Headers.push(merge.outputName);
      }
    });

    // Step 3: Run validation
    showProgress(40, 'Validating data...');
    let validatedData = ds1Data;
    if (validationRules && validationRules.length > 0) {
      const validationResult = validateData(ds1Data, validationRules);
      validatedData = validationResult.valid;
      state.dataManager.analytics.unprocessed += validationResult.invalid.length;
      Object.assign(state.dataManager.analytics.reasons, validationResult.reasons);
    }

    // Step 4: Perform join
    showProgress(60, 'Performing join operation...');
    let output = [];
    let outputHeaders = [];



    switch (joinType) {
      case 'append':
        output = [...validatedData, ...dataset2.data];
        outputHeaders = [...new Set([...ds1Headers, ...dataset2.headers])];
        break;

      case 'inner':
      case 'left':
      case 'right':
      case 'lookup':
        if (fieldMappings.length === 0) {
          hideProgress();
          alert('Please create at least one field mapping for join operations');
          return;
        }
        output = performJoin(validatedData, dataset2.data, fieldMappings, joinType, state.dataManager.fuzzyMatch);
        outputHeaders = [...new Set([...ds1Headers, ...dataset2.headers])];
        break;

      default:
        output = validatedData;
        outputHeaders = ds1Headers;
    }

    // Step 5: Apply filter
    showProgress(75, 'Applying filters...');
    if (filterConfig.column && filterConfig.value) {
      const beforeFilter = output.length;
      output = applyFilter(output, filterConfig);
      logDebug(`Filtered: ${beforeFilter - output.length} records removed`, 'info');
    }

    // Step 6: Apply sort
    showProgress(85, 'Sorting results...');
    if (sortConfig.column) {
      output = applySort(output, sortConfig);
      logDebug(`Sorted by ${sortConfig.column} (${sortConfig.order})`, 'success');
    }

    // Step 7: Finalize
    showProgress(95, 'Finalizing...');
    state.dataManager.outputData = output;
    state.dataManager.outputHeaders = outputHeaders;
    state.dataManager.analytics.processed = output.length;

    displayOutput(output, outputHeaders);
    updateAnalyticsDisplay();

    showProgress(100, 'Complete!');
    setTimeout(hideProgress, 1500);
    logDebug(`Output generated: ${output.length} records`, 'success');

  } catch (error) {
    logDebug(`Error: ${error.message}`, 'error');
    hideProgress();
    alert(`Processing error: ${error.message}`);
  }
}

// Fuzzy comparison helper
function fuzzyCompare(val1, val2, useFuzzy) {
  const str1 = String(val1 || '').toLowerCase().trim();
  const str2 = String(val2 || '').toLowerCase().trim();

  if (!useFuzzy) {
    return str1 === str2;
  }

  // Fuzzy: check if either contains the other, or partial word match
  if (str1 === str2) return true;
  if (str1.includes(str2) || str2.includes(str1)) return true;

  // Word-by-word match (any word matches)
  const words1 = str1.split(/\s+/);
  const words2 = str2.split(/\s+/);

  for (const w1 of words1) {
    for (const w2 of words2) {
      if (w1.length > 2 && w2.length > 2 && (w1.includes(w2) || w2.includes(w1))) {
        return true;
      }
    }
  }

  return false;
}

function performJoin(data1, data2, mappings, joinType, useFuzzy = false) {
  const result = [];
  const keyMapping = mappings[0]; // Use first mapping as join key

  if (joinType === 'lookup') {
    data1.forEach(row1 => {
      const matchKey = row1[keyMapping.ds1Field];
      const match = data2.find(row2 => fuzzyCompare(matchKey, row2[keyMapping.ds2Field], useFuzzy));

      if (match) {
        result.push({ ...row1, ...match });
      } else {
        result.push({ ...row1 });
      }
    });
    return result;
  }

  if (joinType === 'inner') {
    data1.forEach(row1 => {
      const matchKey = row1[keyMapping.ds1Field];
      const matches = data2.filter(row2 => fuzzyCompare(matchKey, row2[keyMapping.ds2Field], useFuzzy));

      matches.forEach(match => {
        result.push({ ...row1, ...match });
      });
    });
    return result;
  }

  if (joinType === 'left') {
    data1.forEach(row1 => {
      const matchKey = row1[keyMapping.ds1Field];
      const matches = data2.filter(row2 => fuzzyCompare(matchKey, row2[keyMapping.ds2Field], useFuzzy));

      if (matches.length > 0) {
        matches.forEach(match => {
          result.push({ ...row1, ...match });
        });
      } else {
        result.push({ ...row1 });
      }
    });
    return result;
  }

  if (joinType === 'right') {
    data2.forEach(row2 => {
      const matchKey = row2[keyMapping.ds2Field];
      const matches = data1.filter(row1 => fuzzyCompare(row1[keyMapping.ds1Field], matchKey, useFuzzy));

      if (matches.length > 0) {
        matches.forEach(match => {
          result.push({ ...match, ...row2 });
        });
      } else {
        result.push({ ...row2 });
      }
    });
    return result;
  }

  return result;
}

// Column Merge Functions
function applyColumnMerges(data, merges) {
  if (!merges || merges.length === 0) return data;

  return data.map(row => {
    const newRow = { ...row };

    merges.forEach(merge => {
      if (merge.columns && merge.columns.length >= 2 && merge.outputName) {
        const values = merge.columns.map(col => row[col] || '').filter(v => v);
        newRow[merge.outputName] = values.join(merge.separator || ' ');
      }
    });

    return newRow;
  });
}

function addColumnMergeRow() {
  const ds1Headers = state.dataManager.dataset1.headers;

  if (ds1Headers.length < 2) {
    alert('Please load Dataset 1 with at least 2 columns to create a merge');
    return;
  }

  const rowId = Date.now();
  const row = document.createElement('div');
  row.className = 'merge-row';
  row.dataset.id = rowId;
  row.innerHTML = `
    <div class="merge-row-header">
      <span class="merge-row-label">Merge columns:</span>
      <button class="mapping-remove" onclick="removeMergeRow(${rowId})">✕</button>
    </div>
    <div class="merge-columns">
      <select class="select-control merge-col1" data-row="${rowId}">
        <option value="">Column 1...</option>
        ${ds1Headers.map(h => `<option value="${escapeHtml(h)}">${escapeHtml(h)}</option>`).join('')}
      </select>
      <span>+</span>
      <select class="select-control merge-col2" data-row="${rowId}">
        <option value="">Column 2...</option>
        ${ds1Headers.map(h => `<option value="${escapeHtml(h)}">${escapeHtml(h)}</option>`).join('')}
      </select>
    </div>
    <div class="merge-separator-control">
      <label>Separator:</label>
      <input type="text" class="input-control merge-sep" data-row="${rowId}" value=" " placeholder=" ">
    </div>
    <div class="merge-output-name">
      <label>New column name:</label>
      <input type="text" class="input-control merge-name" data-row="${rowId}" placeholder="merged_column">
    </div>
  `;

  elements.mergeList?.appendChild(row);

  // Add change listeners
  row.querySelectorAll('select, input').forEach(el => {
    el.addEventListener('change', updateColumnMerges);
    el.addEventListener('input', updateColumnMerges);
  });
}

window.removeMergeRow = function (rowId) {
  const row = document.querySelector(`.merge-row[data-id="${rowId}"]`);
  if (row) row.remove();
  updateColumnMerges();
};

function updateColumnMerges() {
  const rows = elements.mergeList?.querySelectorAll('.merge-row') || [];
  state.dataManager.columnMerges = [];

  rows.forEach(row => {
    const col1 = row.querySelector('.merge-col1')?.value;
    const col2 = row.querySelector('.merge-col2')?.value;
    const separator = row.querySelector('.merge-sep')?.value ?? ' ';
    const outputName = row.querySelector('.merge-name')?.value;

    if (col1 && col2 && outputName) {
      state.dataManager.columnMerges.push({
        columns: [col1, col2],
        separator: separator,
        outputName: outputName
      });
    }
  });
}


function applyFilter(data, filterConfig) {
  const { column, operator, value } = filterConfig;

  return data.filter(row => {
    const cellValue = String(row[column] || '').toLowerCase();
    const filterValue = value.toLowerCase();

    switch (operator) {
      case 'contains': return cellValue.includes(filterValue);
      case 'equals': return cellValue === filterValue;
      case 'startswith': return cellValue.startsWith(filterValue);
      case 'gt': return parseFloat(cellValue) > parseFloat(filterValue);
      case 'lt': return parseFloat(cellValue) < parseFloat(filterValue);
      default: return true;
    }
  });
}

function applySort(data, sortConfig) {
  const { column, order } = sortConfig;

  return [...data].sort((a, b) => {
    const valA = String(a[column] || '');
    const valB = String(b[column] || '');

    // Try numeric comparison first
    const numA = parseFloat(valA);
    const numB = parseFloat(valB);

    if (!isNaN(numA) && !isNaN(numB)) {
      return order === 'asc' ? numA - numB : numB - numA;
    }

    // Fall back to string comparison
    const comparison = valA.localeCompare(valB);
    return order === 'asc' ? comparison : -comparison;
  });
}

function displayOutput(data, headers) {
  elements.outputSection?.classList.remove('hidden');

  if (elements.outputCount) {
    elements.outputCount.textContent = `${data.length} records`;
  }

  if (elements.outputPreview && data.length > 0) {
    let html = '<table><thead><tr>';
    headers.forEach(h => {
      html += `<th>${escapeHtml(h)}</th>`;
    });
    html += '</tr></thead><tbody>';

    // Show first 5 rows as preview
    const previewData = data.slice(0, 5);
    previewData.forEach(row => {
      html += '<tr>';
      headers.forEach(h => {
        html += `<td>${escapeHtml(row[h] || '')}</td>`;
      });
      html += '</tr>';
    });

    if (data.length > 5) {
      html += `<tr><td colspan="${headers.length}" style="text-align:center;color:var(--text-muted)">... and ${data.length - 5} more rows</td></tr>`;
    }

    html += '</tbody></table>';
    elements.outputPreview.innerHTML = html;
  }
}

// Export Functions
function exportOutput(format) {
  const { outputData, outputHeaders } = state.dataManager;

  if (outputData.length === 0) {
    alert('No output data to export. Please generate output first.');
    return;
  }

  if (format === 'csv') {
    exportAsCSV(outputData, outputHeaders);
  } else {
    alert('Excel export requires the full Data Manager page. CSV exported instead.');
    exportAsCSV(outputData, outputHeaders);
  }
}

function exportAsCSV(data, headers) {
  let csv = headers.join(',') + '\n';

  data.forEach(row => {
    const values = headers.map(h => {
      const val = row[h] || '';
      // Escape quotes and wrap in quotes if contains comma
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    });
    csv += values.join(',') + '\n';
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `autofill-output-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function useOutputForAutofill() {
  const { outputData, outputHeaders } = state.dataManager;

  if (outputData.length === 0) {
    alert('No output data to use. Please generate output first.');
    return;
  }

  // Set as main autofill data
  state.data = outputData;
  state.headers = outputHeaders;
  state.currentIndex = 0;

  saveState();

  // Switch to Fill tab
  switchTab('fill');
  updateUI();

  alert(`Loaded ${outputData.length} records for AutoFill!`);
}

// ===== Utility Functions =====
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ===== Debug Logging System =====
function logDebug(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const entry = { timestamp, message, type };
  state.dataManager.debugLog.push(entry);

  if (elements.debugLog) {
    const entryDiv = document.createElement('div');
    entryDiv.className = `debug-entry ${type}`;
    entryDiv.innerHTML = `<span class="timestamp">[${timestamp}]</span> ${escapeHtml(message)}`;
    elements.debugLog.appendChild(entryDiv);
    elements.debugLog.scrollTop = elements.debugLog.scrollHeight;
  }
}

function toggleDebugPanel() {
  elements.debugToggle?.classList.toggle('active');
  elements.debugPanel?.classList.toggle('hidden');
}

function clearDebugLogEntries() {
  state.dataManager.debugLog = [];
  if (elements.debugLog) {
    elements.debugLog.innerHTML = '<div class="debug-entry info">Debug log cleared.</div>';
  }
}

function exportDebugLogToFile() {
  const log = state.dataManager.debugLog.map(e => `[${e.timestamp}] [${e.type.toUpperCase()}] ${e.message}`).join('\n');
  const blob = new Blob([log], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `autofill-debug-log-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ===== Data Cleaning Functions =====
function getCleaningConfig() {
  return {
    trim: elements.cleanTrim?.checked ?? true,
    dedupe: elements.cleanDedupe?.checked ?? false,
    normalizeCase: elements.cleanCase?.checked ?? false,
    caseType: elements.cleanCaseType?.value ?? 'title',
    fillEmpty: elements.cleanEmpty?.checked ?? false,
    fillEmptyValue: elements.cleanEmptyValue?.value ?? ''
  };
}

function cleanData(data, headers, config) {
  logDebug(`Starting data cleaning on ${data.length} records...`);
  let cleaned = [...data];
  let warnings = 0;

  // Trim whitespace
  if (config.trim) {
    cleaned = cleaned.map(row => {
      const newRow = {};
      for (const key of Object.keys(row)) {
        newRow[key] = typeof row[key] === 'string' ? row[key].trim() : row[key];
      }
      return newRow;
    });
    logDebug('Applied: Trim whitespace', 'success');
  }

  // Normalize case
  if (config.normalizeCase) {
    cleaned = cleaned.map(row => {
      const newRow = {};
      for (const key of Object.keys(row)) {
        let val = row[key];
        if (typeof val === 'string') {
          switch (config.caseType) {
            case 'upper': val = val.toUpperCase(); break;
            case 'lower': val = val.toLowerCase(); break;
            case 'title': val = val.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase()); break;
          }
        }
        newRow[key] = val;
      }
      return newRow;
    });
    logDebug(`Applied: Normalize case (${config.caseType})`, 'success');
  }

  // Fill empty values
  if (config.fillEmpty && config.fillEmptyValue) {
    let filledCount = 0;
    cleaned = cleaned.map(row => {
      const newRow = { ...row };
      for (const key of Object.keys(newRow)) {
        if (!newRow[key] || newRow[key] === '') {
          newRow[key] = config.fillEmptyValue;
          filledCount++;
        }
      }
      return newRow;
    });
    if (filledCount > 0) {
      logDebug(`Filled ${filledCount} empty cells with "${config.fillEmptyValue}"`, 'success');
      warnings++;
    }
  }

  // Remove duplicates
  if (config.dedupe) {
    const before = cleaned.length;
    const seen = new Set();
    cleaned = cleaned.filter(row => {
      const key = JSON.stringify(row);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const removed = before - cleaned.length;
    if (removed > 0) {
      logDebug(`Removed ${removed} duplicate records`, 'warning');
    }
  }

  logDebug(`Cleaning complete. ${cleaned.length} records remain.`, 'success');
  return { data: cleaned, warnings };
}

// ===== Validation Functions =====
function addValidationRuleRow() {
  const allHeaders = [...new Set([
    ...state.dataManager.dataset1.headers,
    ...state.dataManager.dataset2.headers
  ])];

  if (allHeaders.length === 0) {
    alert('Please load datasets first');
    return;
  }

  const rowId = Date.now();
  const row = document.createElement('div');
  row.className = 'validation-row';
  row.dataset.id = rowId;
  row.innerHTML = `
    <select class="select-control val-column" data-row="${rowId}">
      <option value="">Column...</option>
      ${allHeaders.map(h => `<option value="${escapeHtml(h)}">${escapeHtml(h)}</option>`).join('')}
    </select>
    <select class="select-control val-type" data-row="${rowId}">
      <option value="required">Required</option>
      <option value="email">Email format</option>
      <option value="number">Number only</option>
      <option value="unique">Unique</option>
      <option value="regex">Regex match</option>
    </select>
    <input type="text" class="input-control val-param" data-row="${rowId}" placeholder="Pattern (regex)">
    <button class="mapping-remove" onclick="removeValidationRow(${rowId})">✕</button>
  `;

  elements.validationList?.appendChild(row);
  row.querySelectorAll('select, input').forEach(el => el.addEventListener('change', updateValidationRules));
}

window.removeValidationRow = function (rowId) {
  const row = document.querySelector(`.validation-row[data-id="${rowId}"]`);
  if (row) row.remove();
  updateValidationRules();
};

function updateValidationRules() {
  const rows = elements.validationList?.querySelectorAll('.validation-row') || [];
  state.dataManager.validationRules = [];

  rows.forEach(row => {
    const column = row.querySelector('.val-column')?.value;
    const type = row.querySelector('.val-type')?.value;
    const param = row.querySelector('.val-param')?.value;

    if (column && type) {
      state.dataManager.validationRules.push({ column, type, param });
    }
  });
}

function validateData(data, rules) {
  logDebug(`Validating ${data.length} records with ${rules.length} rules...`);
  const results = { valid: [], invalid: [], reasons: {} };

  data.forEach((row, index) => {
    let isValid = true;
    let rowReasons = [];

    for (const rule of rules) {
      const value = row[rule.column] || '';
      let passed = true;

      switch (rule.type) {
        case 'required':
          passed = value !== '' && value !== null && value !== undefined;
          if (!passed) rowReasons.push(`Missing required: ${rule.column}`);
          break;
        case 'email':
          passed = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
          if (!passed && value) rowReasons.push(`Invalid email: ${rule.column}`);
          break;
        case 'number':
          passed = !isNaN(parseFloat(value)) || value === '';
          if (!passed) rowReasons.push(`Not a number: ${rule.column}`);
          break;
        case 'regex':
          try {
            const regex = new RegExp(rule.param);
            passed = regex.test(value);
            if (!passed) rowReasons.push(`Regex fail: ${rule.column}`);
          } catch (e) {
            passed = true; // Skip invalid regex
          }
          break;
        case 'unique':
          // Check is done separately
          break;
      }

      if (!passed) isValid = false;
    }

    if (isValid) {
      results.valid.push(row);
    } else {
      results.invalid.push({ row, index, reasons: rowReasons });
      rowReasons.forEach(reason => {
        const simpleReason = reason.split(':')[0];
        results.reasons[simpleReason] = (results.reasons[simpleReason] || 0) + 1;
      });
    }
  });

  logDebug(`Validation complete: ${results.valid.length} valid, ${results.invalid.length} invalid`, results.invalid.length > 0 ? 'warning' : 'success');
  return results;
}

// ===== Search Functions =====
function performSearch() {
  const query = elements.searchInput?.value || '';
  const useRegex = elements.searchRegex?.checked || false;

  if (!query) {
    elements.searchResults?.classList.add('hidden');
    return;
  }

  const allData = [...state.dataManager.dataset1.data, ...state.dataManager.dataset2.data];
  let matches = 0;

  try {
    const pattern = useRegex ? new RegExp(query, 'i') : null;

    allData.forEach(row => {
      for (const value of Object.values(row)) {
        const str = String(value || '');
        if ((useRegex && pattern.test(str)) || (!useRegex && str.toLowerCase().includes(query.toLowerCase()))) {
          matches++;
          break;
        }
      }
    });
  } catch (e) {
    logDebug(`Search error: ${e.message}`, 'error');
  }

  elements.searchResults?.classList.remove('hidden');
  if (elements.searchResultCount) {
    elements.searchResultCount.textContent = `${matches} matches found`;
  }
}

// ===== Analytics Functions =====
function resetAnalytics() {
  state.dataManager.analytics = {
    processed: 0,
    unprocessed: 0,
    warnings: 0,
    reasons: {}
  };
}

function updateAnalyticsDisplay() {
  const { processed, unprocessed, warnings, reasons } = state.dataManager.analytics;

  elements.analyticsSection?.classList.remove('hidden');

  if (elements.analyticsProcessed) elements.analyticsProcessed.textContent = processed;
  if (elements.analyticsUnprocessed) elements.analyticsUnprocessed.textContent = unprocessed;
  if (elements.analyticsWarnings) elements.analyticsWarnings.textContent = warnings;

  if (elements.analyticsReasons) {
    const reasonItems = Object.entries(reasons).map(([key, count]) =>
      `<div class="reason-item"><span class="reason-name">${escapeHtml(key)}</span><span class="reason-count">${count}</span></div>`
    ).join('');
    elements.analyticsReasons.innerHTML = reasonItems || '<div class="reason-item"><span class="reason-name">No issues found</span></div>';
  }
}

function exportAnalyticsReport() {
  const { processed, unprocessed, warnings, reasons } = state.dataManager.analytics;
  const report = `AutoFill Pro - Processing Report
Generated: ${new Date().toLocaleString()}

=== SUMMARY ===
Processed: ${processed}
Unprocessed: ${unprocessed}
Warnings: ${warnings}

=== FAILURE REASONS ===
${Object.entries(reasons).map(([k, v]) => `${k}: ${v}`).join('\n') || 'None'}

=== DEBUG LOG ===
${state.dataManager.debugLog.map(e => `[${e.timestamp}] [${e.type}] ${e.message}`).join('\n')}
`;

  const blob = new Blob([report], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `autofill-report-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ===== Progress Indicator =====
function showProgress(percent, text) {
  elements.processProgress?.classList.remove('hidden');
  if (elements.progressFillMini) elements.progressFillMini.style.width = `${percent}%`;
  if (elements.progressText) elements.progressText.textContent = text;
}

function hideProgress() {
  elements.processProgress?.classList.add('hidden');
}

// ===== Enhanced Generate Output with Processing Pipeline =====
// Override the original generateOutput to include cleaning, validation, and analytics
const originalGenerateOutput = generateOutput;

// Update generateOutput reference in event listener to use enhanced version will be automatic

// ===== Pilot Mode Functions =====

function switchDataManagerMode(mode) {
  state.dataManager.mode = mode;

  // Update UI
  elements.modeStandard?.classList.toggle('active', mode === 'standard');
  elements.modePilot?.classList.toggle('active', mode === 'pilot');

  elements.standardModeSection?.classList.toggle('hidden', mode !== 'standard');
  elements.pilotModeSection?.classList.toggle('hidden', mode !== 'pilot');

  // Update description
  if (elements.modeDescription) {
    elements.modeDescription.textContent = mode === 'standard'
      ? 'Compare and merge two datasets'
      : 'Lookup pilot records across multiple references';
  }

  logDebug(`Switched to ${mode} mode`, 'info');
}

async function handlePilotUpload(e) {
  const files = Array.from(e.target.files);
  if (files.length === 0) return;

  const supportedFormats = ['csv', 'xlsx', 'xls', 'json', 'txt', 'tsv'];

  for (const file of files) {
    const extension = file.name.split('.').pop().toLowerCase();

    if (!supportedFormats.includes(extension)) {
      logDebug(`Skipped unsupported file: ${file.name}`, 'warning');
      continue;
    }


    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const data = event.target.result;
        let result;

        try {
          switch (extension) {
            case 'csv': result = parseCSVLocal(data); break;
            case 'xlsx':
            case 'xls': result = parseExcelLocal(data); break;
            case 'json': result = parseJSONLocal(data); break;
            case 'txt':
            case 'tsv': result = parseTSVLocal(data); break;
          }

          // Merge with existing pilot data
          if (state.dataManager.pilot.data.length === 0) {
            state.dataManager.pilot = {
              data: result.data,
              headers: result.headers,
              fileNames: [file.name]
            };
          } else {
            // Merge headers
            const newHeaders = result.headers.filter(h => !state.dataManager.pilot.headers.includes(h));
            state.dataManager.pilot.headers = [...state.dataManager.pilot.headers, ...newHeaders];
            // Merge data
            state.dataManager.pilot.data = [...state.dataManager.pilot.data, ...result.data];
            state.dataManager.pilot.fileNames = state.dataManager.pilot.fileNames || [];
            state.dataManager.pilot.fileNames.push(file.name);
          }

          updatePilotUI();
          updatePilotKeySelectors();
          updateOutputColumnsUI();
          logDebug(`Added pilot: ${file.name} (${result.data.length} records)`, 'success');

        } catch (parseError) {
          logDebug(`Failed to parse pilot: ${parseError.message}`, 'error');
          alert('Error parsing file: ' + parseError.message);
        }
      };

      if (['csv', 'json', 'txt', 'tsv'].includes(extension)) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    } catch (error) {
      console.error('Pilot upload error:', error);
    }
  }

  // Reset input for same file selection
  e.target.value = '';
}

async function handleReferenceUpload(e) {
  const files = Array.from(e.target.files);
  if (files.length === 0) return;

  const supportedFormats = ['csv', 'xlsx', 'xls', 'json', 'txt', 'tsv'];

  for (const file of files) {
    const extension = file.name.split('.').pop().toLowerCase();

    if (!supportedFormats.includes(extension)) {

      logDebug(`Skipped unsupported file: ${file.name}`, 'warning');
      continue;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const data = event.target.result;
        let result;

        try {
          switch (extension) {
            case 'csv': result = parseCSVLocal(data); break;
            case 'xlsx':
            case 'xls': result = parseExcelLocal(data); break;
            case 'json': result = parseJSONLocal(data); break;
            case 'txt':
            case 'tsv': result = parseTSVLocal(data); break;
          }

          const refId = Date.now() + Math.random();
          state.dataManager.references.push({
            id: refId,
            name: file.name,
            data: result.data,
            headers: result.headers
          });

          updateReferencesUI();
          updatePilotKeySelectors();
          updateOutputColumnsUI();
          logDebug(`Added reference: ${file.name} (${result.data.length} records)`, 'success');

        } catch (parseError) {
          logDebug(`Failed to parse reference: ${parseError.message}`, 'error');
        }
      };

      if (['csv', 'json', 'txt', 'tsv'].includes(extension)) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    } catch (error) {
      console.error('Reference upload error:', error);
    }
  }

  // Reset input for same file selection
  e.target.value = '';
}

function clearPilotData() {
  state.dataManager.pilot = {
    data: [],
    headers: [],
    fileNames: []
  };
  updatePilotUI();
  updatePilotKeySelectors();
  updateOutputColumnsUI();
  logDebug('Cleared pilot data', 'info');
}

function clearAllReferences() {
  state.dataManager.references = [];
  updateReferencesUI();
  updatePilotKeySelectors();
  updateOutputColumnsUI();
  logDebug('Cleared all references', 'info');
}

function updatePilotUI() {
  const { pilot } = state.dataManager;
  if (elements.pilotCount) {
    elements.pilotCount.textContent = `${pilot.data.length} records`;
  }
  if (elements.pilotFiles) {
    if (pilot.fileNames && pilot.fileNames.length > 0) {
      elements.pilotFiles.classList.remove('hidden');
      elements.pilotFiles.innerHTML = pilot.fileNames.map(name =>
        `<div class="file-tag">${escapeHtml(name)} <button class="file-tag-remove" onclick="removePilotFile('${escapeHtml(name)}')">×</button></div>`
      ).join('');
    } else {
      elements.pilotFiles.classList.add('hidden');
      elements.pilotFiles.innerHTML = '';
    }
  }
}

window.removePilotFile = function (fileName) {
  // For simplicity, just clear all pilot data when removing
  // A more complex implementation would track data per file
  clearPilotData();
};


function updateReferencesUI() {
  const { references } = state.dataManager;
  if (!elements.referencesList) return;

  if (references.length === 0) {
    elements.referencesList.innerHTML = '<p class="dataset-hint">No references added yet</p>';
    return;
  }

  // Calculate total records
  const totalRecords = references.reduce((sum, ref) => sum + ref.data.length, 0);

  elements.referencesList.innerHTML = `
    <div class="references-summary">
      <span class="references-total">${references.length} files • ${totalRecords} total records</span>
    </div>
    ${references.map(ref => `
      <div class="reference-item" data-id="${ref.id}">
        <div class="reference-info">
          <span class="reference-name">${escapeHtml(ref.name)}</span>
          <span class="reference-count">${ref.data.length} rows</span>
        </div>
        <button class="reference-remove" onclick="removeReference(${ref.id})">✕</button>
      </div>
    `).join('')}
  `;
}

window.removeReference = function (refId) {
  state.dataManager.references = state.dataManager.references.filter(r => r.id !== refId);
  updateReferencesUI();
  updateAllKeyPairSelectors();
  updateOutputColumnsUI();
  logDebug(`Removed reference`, 'info');
};

// Key Pair Management
let keyPairCount = 1;

function addKeyPair() {
  const pairIndex = keyPairCount++;
  const newRow = document.createElement('div');
  newRow.className = 'key-pair-row';
  newRow.dataset.pair = pairIndex;

  const { pilot, references } = state.dataManager;
  const pilotOptions = pilot.headers.map(h => `<option value="${escapeHtml(h)}">${escapeHtml(h)}</option>`).join('');
  const allRefHeaders = [...new Set(references.flatMap(r => r.headers))];
  const refOptions = allRefHeaders.map(h => `<option value="${escapeHtml(h)}">${escapeHtml(h)}</option>`).join('');

  newRow.innerHTML = `
    <select class="select-control pilot-key-select" data-pair="${pairIndex}">
      <option value="">Pilot key...</option>
      ${pilotOptions}
    </select>
    <span class="key-arrow">↔</span>
    <select class="select-control ref-key-select" data-pair="${pairIndex}">
      <option value="">Reference key...</option>
      ${refOptions}
    </select>
    <button class="key-pair-remove" data-pair="${pairIndex}" onclick="removeKeyPair(${pairIndex})">✕</button>
  `;

  elements.keyPairsList?.appendChild(newRow);

  // Show remove buttons on all rows when more than one
  updateKeyPairRemoveButtons();
}

window.removeKeyPair = function (pairIndex) {
  const row = elements.keyPairsList?.querySelector(`.key-pair-row[data-pair="${pairIndex}"]`);
  if (row) row.remove();
  updateKeyPairRemoveButtons();
};

function updateKeyPairRemoveButtons() {
  const rows = elements.keyPairsList?.querySelectorAll('.key-pair-row') || [];
  rows.forEach(row => {
    const removeBtn = row.querySelector('.key-pair-remove');
    if (removeBtn) {
      removeBtn.classList.toggle('hidden', rows.length <= 1);
    }
  });
}

function updateAllKeyPairSelectors() {
  const rows = elements.keyPairsList?.querySelectorAll('.key-pair-row') || [];
  const { pilot, references } = state.dataManager;

  const pilotOptions = pilot.headers.map(h => `<option value="${escapeHtml(h)}">${escapeHtml(h)}</option>`).join('');
  const allRefHeaders = [...new Set(references.flatMap(r => r.headers))];
  const refOptions = allRefHeaders.map(h => `<option value="${escapeHtml(h)}">${escapeHtml(h)}</option>`).join('');

  rows.forEach(row => {
    const pilotSelect = row.querySelector('.pilot-key-select');
    const refSelect = row.querySelector('.ref-key-select');

    const currentPilotVal = pilotSelect?.value || '';
    const currentRefVal = refSelect?.value || '';

    if (pilotSelect) {
      pilotSelect.innerHTML = `<option value="">Pilot key...</option>${pilotOptions}`;
      pilotSelect.value = currentPilotVal;
    }
    if (refSelect) {
      refSelect.innerHTML = `<option value="">Reference key...</option>${refOptions}`;
      refSelect.value = currentRefVal;
    }
  });
}

function getKeyPairs() {
  const rows = elements.keyPairsList?.querySelectorAll('.key-pair-row') || [];
  const pairs = [];

  rows.forEach(row => {
    const pilotKey = row.querySelector('.pilot-key-select')?.value || '';
    const refKey = row.querySelector('.ref-key-select')?.value || '';
    if (pilotKey && refKey) {
      pairs.push({ pilotKey, refKey });
    }
  });

  return pairs;
}

// ===== Column Formula Management =====
let formulaCount = 0;

function addFormula() {
  const formulaIndex = formulaCount++;
  const { references } = state.dataManager;

  const allRefHeaders = [...new Set(references.flatMap(r => r.headers))];
  const colOptions = allRefHeaders.map(h => `<option value="${escapeHtml(h)}">${escapeHtml(h)}</option>`).join('');

  const formulaRow = document.createElement('div');
  formulaRow.className = 'formula-row';
  formulaRow.dataset.formula = formulaIndex;

  formulaRow.innerHTML = `
    <input type="text" class="formula-name" placeholder="New Column Name" data-formula="${formulaIndex}">
    <span>=</span>
    <select class="formula-col select-control" data-formula="${formulaIndex}" data-colindex="0">
      <option value="">Select...</option>
      ${colOptions}
    </select>
    <input type="text" class="formula-separator" value=" " placeholder="sep" data-formula="${formulaIndex}" data-sepindex="0">
    <select class="formula-col select-control" data-formula="${formulaIndex}" data-colindex="1">
      <option value="">Select...</option>
      ${colOptions}
    </select>
    <button class="formula-add-col" onclick="addFormulaColumn(${formulaIndex})">+</button>
    <button class="formula-remove" onclick="removeFormula(${formulaIndex})">✕</button>
  `;

  elements.formulasList?.appendChild(formulaRow);
  updateKeyPairSelectorsWithFormulas();
}

window.removeFormula = function (formulaIndex) {
  const row = elements.formulasList?.querySelector(`.formula-row[data-formula="${formulaIndex}"]`);
  if (row) row.remove();
  updateKeyPairSelectorsWithFormulas();
};

window.addFormulaColumn = function (formulaIndex) {
  const row = elements.formulasList?.querySelector(`.formula-row[data-formula="${formulaIndex}"]`);
  if (!row) return;

  const { references } = state.dataManager;
  const allRefHeaders = [...new Set(references.flatMap(r => r.headers))];
  const colOptions = allRefHeaders.map(h => `<option value="${escapeHtml(h)}">${escapeHtml(h)}</option>`).join('');

  const selects = row.querySelectorAll('.formula-col');
  const newIndex = selects.length;
  const addBtn = row.querySelector('.formula-add-col');

  const sepInput = document.createElement('input');
  sepInput.type = 'text';
  sepInput.className = 'formula-separator';
  sepInput.value = ' ';
  sepInput.dataset.formula = formulaIndex;

  const newSelect = document.createElement('select');
  newSelect.className = 'formula-col select-control';
  newSelect.dataset.formula = formulaIndex;
  newSelect.dataset.colindex = newIndex;
  newSelect.innerHTML = `<option value="">Select...</option>${colOptions}`;

  addBtn.insertAdjacentElement('beforebegin', sepInput);
  addBtn.insertAdjacentElement('beforebegin', newSelect);
};

function getFormulas() {
  const formulas = [];
  const rows = elements.formulasList?.querySelectorAll('.formula-row') || [];

  rows.forEach(row => {
    const nameInput = row.querySelector('.formula-name');
    const name = nameInput?.value?.trim() || '';
    if (!name) return;

    const colSelects = row.querySelectorAll('.formula-col');
    const sepInputs = row.querySelectorAll('.formula-separator');

    const columns = [];
    const separators = [];

    colSelects.forEach((select, i) => {
      if (select.value) {
        columns.push(select.value);
        if (sepInputs[i]) separators.push(sepInputs[i].value || ' ');
      }
    });

    if (columns.length > 0) formulas.push({ name, columns, separators });
  });

  return formulas;
}

function applyFormulas(row) {
  const formulas = getFormulas();
  const result = { ...row };

  formulas.forEach(formula => {
    const parts = formula.columns.map(col => String(row[col] || '').trim());
    let computed = parts[0] || '';
    for (let i = 1; i < parts.length; i++) {
      computed += (formula.separators[i - 1] || ' ') + parts[i];
    }
    result[formula.name] = computed.trim();
  });

  return result;
}

function updateKeyPairSelectorsWithFormulas() {
  const rows = elements.keyPairsList?.querySelectorAll('.key-pair-row') || [];
  const { pilot, references } = state.dataManager;
  const formulas = getFormulas();

  const pilotOptions = pilot.headers.map(h => `<option value="${escapeHtml(h)}">${escapeHtml(h)}</option>`).join('');
  const allRefHeaders = [...new Set(references.flatMap(r => r.headers))];
  const formulaOptions = formulas.map(f =>
    `<option value="__FORMULA__${escapeHtml(f.name)}" style="color: #6c5ce7;">📐 ${escapeHtml(f.name)} (computed)</option>`
  ).join('');
  const refOptions = allRefHeaders.map(h => `<option value="${escapeHtml(h)}">${escapeHtml(h)}</option>`).join('');

  rows.forEach(row => {
    const pilotSelect = row.querySelector('.pilot-key-select');
    const refSelect = row.querySelector('.ref-key-select');
    const currentPilotVal = pilotSelect?.value || '';
    const currentRefVal = refSelect?.value || '';

    if (pilotSelect) {
      pilotSelect.innerHTML = `<option value="">Pilot key...</option>${pilotOptions}`;
      pilotSelect.value = currentPilotVal;
    }
    if (refSelect) {
      refSelect.innerHTML = `<option value="">Reference key...</option>${formulaOptions}${refOptions}`;
      refSelect.value = currentRefVal;
    }
  });
}

// Smart Matching Functions
function smartMatch(val1, val2, options = {}) {
  const { fuzzy = false, wordBased = false, allWords = false } = options;
  if (!val1 || !val2) return false;

  const v1 = String(val1).toLowerCase().trim();
  const v2 = String(val2).toLowerCase().trim();

  if (v1 === v2) return true;

  if (wordBased || allWords) {
    const words1 = v1.split(/\s+/).filter(w => w.length > 1);
    const words2 = v2.split(/\s+/).filter(w => w.length > 1);

    if (allWords) {
      return words1.every(w1 => words2.some(w2 => w2.includes(w1) || w1.includes(w2)));
    } else {
      return words1.some(w1 => words2.some(w2 => w2.includes(w1) || w1.includes(w2)));
    }
  }

  if (fuzzy) return v1.includes(v2) || v2.includes(v1);

  return false;
}

function updatePilotKeySelectors() {
  updateAllKeyPairSelectors();
  updateKeyPairSelectorsWithFormulas();
}

function updateOutputColumnsUI() {
  const { pilot, references } = state.dataManager;
  if (!elements.outputColumnsList) return;

  // Collect all unique columns from pilot and references
  const allColumns = [];

  // Add pilot columns
  pilot.headers.forEach(h => {
    allColumns.push({ column: h, source: 'pilot' });
  });

  // Add reference columns
  references.forEach(ref => {
    ref.headers.forEach(h => {
      if (!allColumns.find(c => c.column === h)) {
        allColumns.push({ column: h, source: ref.name });
      }
    });
  });

  elements.outputColumnsList.innerHTML = allColumns.map(col => `
    <label class="column-checkbox">
      <input type="checkbox" value="${escapeHtml(col.column)}" checked>
      <span>${escapeHtml(col.column)}</span>
      <span class="column-source">(${escapeHtml(col.source.substring(0, 10))})</span>
    </label>
  `).join('');

  // Add change listeners
  elements.outputColumnsList.querySelectorAll('input').forEach(cb => {
    cb.addEventListener('change', updateSelectedColumns);
  });

  updateSelectedColumns();
}

function updateSelectedColumns() {
  const checkboxes = elements.outputColumnsList?.querySelectorAll('input:checked') || [];
  state.dataManager.selectedOutputColumns = Array.from(checkboxes).map(cb => cb.value);
}

function toggleAllOutputColumns() {
  const checkboxes = elements.outputColumnsList?.querySelectorAll('input') || [];
  const allChecked = Array.from(checkboxes).every(cb => cb.checked);
  checkboxes.forEach(cb => cb.checked = !allChecked);
  updateSelectedColumns();
}

function updatePilotConfig() {
  state.dataManager.pilotKeyColumn = elements.pilotKeyColumn?.value || '';
  state.dataManager.refKeyColumn = elements.refKeyColumn?.value || '';
  state.dataManager.pilotFuzzyMatch = elements.pilotFuzzyMatch?.checked || false;
}

function generatePilotOutput() {
  const { pilot, references, pilotFuzzyMatch, selectedOutputColumns } = state.dataManager;

  // Get key pairs
  const keyPairs = getKeyPairs();

  // Get output settings
  const recordsFrom = elements.outputRecordsFrom?.value || 'pilot';
  const dataPriority = elements.outputDataPriority?.value || 'reference';

  if (pilot.data.length === 0 && recordsFrom !== 'reference') {
    alert('Please load a pilot dataset');
    return;
  }

  if (references.length === 0) {
    alert('Please add at least one reference dataset');
    return;
  }

  if (keyPairs.length === 0) {
    alert('Please select at least one key column pair for lookup');
    return;
  }

  resetAnalytics();
  logDebug(`Starting output generation (Records: ${recordsFrom}, Priority: ${dataPriority}, Keys: ${keyPairs.length})...`, 'info');
  showProgress(0, 'Initializing...');

  // Get smart match options
  const matchOptions = {
    fuzzy: pilotFuzzyMatch,
    wordBased: elements.wordBasedMatch?.checked || false,
    allWords: elements.allWordsMatch?.checked || false
  };

  try {
    const output = [];
    const processedKeys = new Set();

    showProgress(20, 'Processing records...');

    // Helper to get value from row, supporting formula columns
    const getValue = (row, key, withFormulas = false) => {
      if (key.startsWith('__FORMULA__')) {
        const formulaName = key.replace('__FORMULA__', '');
        const formulaRow = withFormulas ? applyFormulas(row) : row;
        return String(formulaRow[formulaName] || '').toLowerCase().trim();
      }
      return String(row[key] || '').toLowerCase().trim();
    };

    // Helper function to check if ALL key pairs match (AND logic)
    const doAllKeysMatch = (pilotRow, refRow) => {
      // Apply formulas to reference row
      const refWithFormulas = applyFormulas(refRow);

      return keyPairs.every(pair => {
        const pilotVal = getValue(pilotRow, pair.pilotKey, false);
        const refVal = getValue(refWithFormulas, pair.refKey, true);
        return smartMatch(pilotVal, refVal, matchOptions);
      });
    };

    // Generate a composite key for deduplication
    const getCompositeKey = (row, isRef = false) => {
      const rowWithFormulas = isRef ? applyFormulas(row) : row;
      return keyPairs.map(pair => {
        const key = isRef ? pair.refKey : pair.pilotKey;
        return getValue(rowWithFormulas, key, isRef);
      }).join('|');
    };


    // Helper function to merge rows based on priority
    const mergeRows = (baseRow, mergeRow) => {
      const result = { ...baseRow };

      // First, add ALL columns from mergeRow (even if they don't exist in baseRow)
      Object.keys(mergeRow).forEach(col => {
        if (dataPriority === 'reference') {
          // Reference data overwrites pilot data
          // Always take reference value if it exists and is not empty
          if (mergeRow[col] !== undefined && mergeRow[col] !== null && mergeRow[col] !== '') {
            result[col] = mergeRow[col];
          } else if (result[col] === undefined) {
            // If reference is empty but column doesn't exist in result, add it anyway
            result[col] = mergeRow[col] || '';
          }
        } else {
          // Pilot data takes priority, only fill if empty or doesn't exist
          if (result[col] === undefined || result[col] === null || result[col] === '') {
            result[col] = mergeRow[col];
          }
        }
      });

      return result;
    };


    // Process based on "Records from" setting
    if (recordsFrom === 'pilot' || recordsFrom === 'both') {
      // Process pilot records
      pilot.data.forEach(pilotRow => {
        const compositeKey = getCompositeKey(pilotRow, false);

        if (!compositeKey || compositeKey === keyPairs.map(() => '').join('|')) {
          state.dataManager.analytics.unprocessed++;
          state.dataManager.analytics.reasons['Empty pilot key'] = (state.dataManager.analytics.reasons['Empty pilot key'] || 0) + 1;
          return;
        }

        let outputRow = { ...pilotRow };
        let foundMatch = false;

        // Search across ALL references for matching data (merge from all that match)
        for (const ref of references) {
          for (const refRow of ref.data) {
            if (doAllKeysMatch(pilotRow, refRow)) {
              outputRow = mergeRows(outputRow, refRow);
              foundMatch = true;
              // Continue to next reference to merge more data (don't break)
            }
          }
        }


        if (!foundMatch) {
          state.dataManager.analytics.warnings++;
          state.dataManager.analytics.reasons['No match in references'] = (state.dataManager.analytics.reasons['No match in references'] || 0) + 1;
        }

        output.push(outputRow);
        processedKeys.add(compositeKey);
        state.dataManager.analytics.processed++;
      });
    }

    if (recordsFrom === 'reference' || recordsFrom === 'both') {
      showProgress(50, 'Processing reference records...');

      // Process reference records
      references.forEach(ref => {
        ref.data.forEach(refRow => {
          const compositeKey = getCompositeKey(refRow, true);

          if (!compositeKey || compositeKey === keyPairs.map(() => '').join('|')) {
            state.dataManager.analytics.unprocessed++;
            return;
          }

          // Skip if already processed (for 'both' mode)
          if (recordsFrom === 'both' && processedKeys.has(compositeKey)) {
            return;
          }

          let outputRow = { ...refRow };
          let foundMatch = false;

          // Search pilot for matching data (if pilot has data)
          if (pilot.data.length > 0) {
            for (const pilotRow of pilot.data) {
              if (doAllKeysMatch(pilotRow, refRow)) {
                outputRow = mergeRows(outputRow, pilotRow);
                foundMatch = true;
                break;
              }
            }
          }


          if (!foundMatch && recordsFrom === 'reference') {
            // For reference-only mode, no match is just informational
            state.dataManager.analytics.warnings++;
            state.dataManager.analytics.reasons['No match in pilot'] = (state.dataManager.analytics.reasons['No match in pilot'] || 0) + 1;
          }

          output.push(outputRow);
          processedKeys.add(compositeKey);
          state.dataManager.analytics.processed++;
        });
      });
    }

    showProgress(80, 'Filtering columns...');

    // Filter to selected columns only
    const filteredOutput = output.map(row => {
      const filtered = {};
      selectedOutputColumns.forEach(col => {
        filtered[col] = row[col] || '';
      });
      return filtered;
    });

    showProgress(100, 'Complete!');

    state.dataManager.outputData = filteredOutput;
    state.dataManager.outputHeaders = selectedOutputColumns;

    displayOutput(filteredOutput, selectedOutputColumns);
    updateAnalyticsDisplay();

    setTimeout(hideProgress, 1500);
    logDebug(`Output generated: ${filteredOutput.length} records (mode: ${recordsFrom})`, 'success');

  } catch (error) {
    logDebug(`Error: ${error.message}`, 'error');
    hideProgress();
    alert(`Processing error: ${error.message}`);
  }
}


// ===== Start =====

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

