export function createDiscrepancyTable({ results, activeFilter, searchTerm, onFilterChange, onSearchChange, onSelectRecord }) {
  const container = document.createElement('div');
  container.className = 'table-card';

  // Apply filters and search
  const filteredResults = results.filter(r => {
    // Filter check
    if (activeFilter === 'MATCHED' && r.type !== 'MATCHED') return false;
    if (activeFilter === 'FIELD_DISCREPANCY' && r.type !== 'FIELD_DISCREPANCY') return false;
    if (activeFilter === 'MISSING_IN_ARRIVAL' && r.type !== 'MISSING_IN_ARRIVAL') return false;
    if (activeFilter === 'MISSING_IN_CHAT' && r.type !== 'MISSING_IN_CHAT') return false;
    if (activeFilter === 'ALL_ISSUES' && r.type === 'MATCHED') return false;

    // Search check
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchBooking = r.bookingNumber?.toLowerCase().includes(q);
      const matchGuest = r.guestName?.toLowerCase().includes(q);
      const matchHotel = r.hotelName?.toLowerCase().includes(q);
      const matchCreated = r.arrivalData?.createdBy?.toLowerCase().includes(q);
      return matchBooking || matchGuest || matchHotel || matchCreated;
    }
    return true;
  });

  container.innerHTML = `
    <div class="table-toolbar">
      <div class="tabs-group">
        <button class="tab-btn ${activeFilter === 'ALL' ? 'active' : ''}" data-tab="ALL">
          All (${results.length})
        </button>
        <button class="tab-btn ${activeFilter === 'ALL_ISSUES' ? 'active' : ''}" data-tab="ALL_ISSUES">
          ⚡ All Issues (${results.filter(r => r.type !== 'MATCHED').length})
        </button>
        <button class="tab-btn ${activeFilter === 'MISSING_IN_ARRIVAL' ? 'active' : ''}" data-tab="MISSING_IN_ARRIVAL">
          🚨 Missing in Arrival (${results.filter(r => r.type === 'MISSING_IN_ARRIVAL').length})
        </button>
        <button class="tab-btn ${activeFilter === 'MISSING_IN_CHAT' ? 'active' : ''}" data-tab="MISSING_IN_CHAT">
          ⚠️ Missing in Chat (${results.filter(r => r.type === 'MISSING_IN_CHAT').length})
        </button>
        <button class="tab-btn ${activeFilter === 'FIELD_DISCREPANCY' ? 'active' : ''}" data-tab="FIELD_DISCREPANCY">
          ⚡ Mismatches (${results.filter(r => r.type === 'FIELD_DISCREPANCY').length})
        </button>
        <button class="tab-btn ${activeFilter === 'MATCHED' ? 'active' : ''}" data-tab="MATCHED">
          ✅ Matched (${results.filter(r => r.type === 'MATCHED').length})
        </button>
      </div>

      <div class="search-box">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="search-icon"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" id="table-search-input" placeholder="Search by Guest Name, Booking #, Hotel..." value="${searchTerm || ''}" />
      </div>
    </div>

    <div class="table-responsive">
      <table class="audit-table">
        <thead>
          <tr>
            <th>Booking #</th>
            <th>Guest Name</th>
            <th>Hotel Name</th>
            <th>Audit Status</th>
            <th>Audit Insights & Discrepancies</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${filteredResults.length === 0 ? `
            <tr>
              <td colspan="6" class="empty-state-cell">
                <div class="empty-state">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                  <p>No reservations found matching current filter or search criteria.</p>
                </div>
              </td>
            </tr>
          ` : filteredResults.map(r => renderTableRow(r)).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Attach event handlers
  setTimeout(() => {
    container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        onFilterChange(tab);
      });
    });

    const searchInput = container.querySelector('#table-search-input');
    searchInput?.addEventListener('input', (e) => {
      onSearchChange(e.target.value);
    });

    container.querySelectorAll('.btn-inspect').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const record = results.find(r => String(r.id) === String(id));
        if (record) onSelectRecord(record);
      });
    });
  }, 0);

  return container;
}

function renderTableRow(r) {
  let badgeClass = 'badge-success';
  let badgeLabel = '✅ Matched';

  if (r.type === 'MISSING_IN_ARRIVAL') {
    badgeClass = 'badge-danger';
    badgeLabel = '🚨 Missing in Arrival';
  } else if (r.type === 'MISSING_IN_CHAT') {
    badgeClass = 'badge-purple';
    badgeLabel = '⚠️ Missing in Chat';
  } else if (r.type === 'FIELD_DISCREPANCY') {
    badgeClass = 'badge-warning';
    badgeLabel = '⚡ Field Mismatch';
  }

  const discrepancyPills = r.discrepancies.map(d => `
    <span class="diff-pill ${d.severity === 'error' ? 'pill-danger' : 'pill-warning'}">
      ${d.field}: ${d.chatVal || 'N/A'} vs ${d.arrivalVal || 'N/A'}
    </span>
  `).join('');

  return `
    <tr class="row-${r.type.toLowerCase()}">
      <td class="font-mono font-bold text-accent">#${r.bookingNumber}</td>
      <td class="font-medium">${escapeHtml(r.guestName)}</td>
      <td class="text-secondary">${escapeHtml(r.hotelName)}</td>
      <td>
        <span class="status-badge ${badgeClass}">${badgeLabel}</span>
      </td>
      <td>
        <div class="pills-container">
          ${r.type === 'MATCHED' ? '<span class="diff-pill pill-success">Full Alignment Across Systems</span>' : discrepancyPills}
        </div>
      </td>
      <td class="text-right">
        <button class="btn btn-xs btn-outline btn-inspect" data-id="${r.id}">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
          <span>Inspect</span>
        </button>
      </td>
    </tr>
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
