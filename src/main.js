import './style.css';
import { createHeader } from './components/Header.js';
import { createFileUploader } from './components/FileUploader.js';
import { createSummaryCards } from './components/SummaryCards.js';
import { createDiscrepancyTable } from './components/DiscrepancyTable.js';
import { renderDetailModal } from './components/DetailModal.js';
import { exportComparisonToExcel } from './components/ExportReport.js';

import { parseWhatsAppChat } from './parsers/whatsappParser.js';
import { parseArrivalFile } from './parsers/arrivalParser.js';
import { compareRecords } from './engine/comparatorEngine.js';

import { SAMPLE_WHATSAPP_TXT, SAMPLE_CSV_DATA } from './sampleData/samples.js';

// Application State
const state = {
  rawWhatsAppText: '',
  arrivalFileOrText: null,
  whatsappRecords: [],
  arrivalRecords: [],
  comparisonOutput: {
    summary: { totalAnalyzed: 0, matched: 0, discrepancies: 0, missingInArrival: 0, missingInChat: 0 },
    results: []
  },
  activeFilter: 'ALL',
  searchTerm: '',
  selectedRecord: null
};

const appEl = document.getElementById('app');

function renderApp() {
  appEl.innerHTML = '';

  // 1. Header
  const header = createHeader({
    onLoadSample: handleLoadSampleData,
    onExportExcel: handleExportExcel,
    onReset: handleReset
  });
  appEl.appendChild(header);

  // 2. File Uploaders
  const uploader = createFileUploader({
    onWhatsAppLoaded: (text, fileName) => {
      state.rawWhatsAppText = text;
      runComparison();
    },
    onArrivalLoaded: (file, fileName) => {
      state.arrivalFileOrText = file;
      runComparison();
    }
  });
  appEl.appendChild(uploader);

  // 3. Summary Cards
  const summaryCards = createSummaryCards({
    summary: state.comparisonOutput.summary,
    activeFilter: state.activeFilter,
    onFilterChange: (filterId) => {
      state.activeFilter = filterId;
      renderApp();
    }
  });
  appEl.appendChild(summaryCards);

  // 4. Discrepancy Table
  const table = createDiscrepancyTable({
    results: state.comparisonOutput.results,
    activeFilter: state.activeFilter,
    searchTerm: state.searchTerm,
    onFilterChange: (filterId) => {
      state.activeFilter = filterId;
      renderApp();
    },
    onSearchChange: (term) => {
      state.searchTerm = term;
      renderApp();
    },
    onSelectRecord: (record) => {
      state.selectedRecord = record;
      renderDetailModal(record, () => {
        state.selectedRecord = null;
      });
    }
  });
  appEl.appendChild(table);

  // Update Excel Export button state
  const exportBtn = document.getElementById('btn-export-excel');
  if (exportBtn) {
    exportBtn.disabled = state.comparisonOutput.results.length === 0;
  }
}

async function runComparison() {
  // Parse WhatsApp
  if (state.rawWhatsAppText) {
    state.whatsappRecords = parseWhatsAppChat(state.rawWhatsAppText);
  } else {
    state.whatsappRecords = [];
  }

  // Parse Arrival File
  if (state.arrivalFileOrText) {
    state.arrivalRecords = await parseArrivalFile(state.arrivalFileOrText);
  } else {
    state.arrivalRecords = [];
  }

  // Execute Comparator Engine
  state.comparisonOutput = compareRecords(state.whatsappRecords, state.arrivalRecords);

  renderApp();
}

function handleLoadSampleData() {
  state.rawWhatsAppText = SAMPLE_WHATSAPP_TXT;
  state.arrivalFileOrText = SAMPLE_CSV_DATA;

  // Update File Uploader display badges
  setTimeout(() => {
    const nameWa = document.getElementById('name-whatsapp');
    const badgeWa = document.getElementById('badge-whatsapp');
    if (nameWa && badgeWa) {
      nameWa.textContent = 'whatsapp msg.txt (Desktop Sample)';
      badgeWa.textContent = 'Loaded';
      badgeWa.className = 'status-badge badge-success';
    }

    const nameArr = document.getElementById('name-arrival');
    const badgeArr = document.getElementById('badge-arrival');
    if (nameArr && badgeArr) {
      nameArr.textContent = 'reservations-data.csv (Desktop Sample)';
      badgeArr.textContent = 'Loaded';
      badgeArr.className = 'status-badge badge-success';
    }
  }, 50);

  runComparison();
}

function handleExportExcel() {
  exportComparisonToExcel(state.comparisonOutput.results);
}

function handleReset() {
  state.rawWhatsAppText = '';
  state.arrivalFileOrText = null;
  state.whatsappRecords = [];
  state.arrivalRecords = [];
  state.comparisonOutput = {
    summary: { totalAnalyzed: 0, matched: 0, discrepancies: 0, missingInArrival: 0, missingInChat: 0 },
    results: []
  };
  state.activeFilter = 'ALL';
  state.searchTerm = '';
  state.selectedRecord = null;

  renderApp();
}

// Initial render
renderApp();

// Auto-load sample data on first visit so user gets immediate visual WOW!
handleLoadSampleData();
