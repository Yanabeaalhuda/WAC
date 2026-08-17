export function renderDetailModal(record, onClose) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  const wa = record.whatsappData || {};
  const arr = record.arrivalData || {};

  backdrop.innerHTML = `
    <div class="modal-card">
      <div class="modal-header">
        <div>
          <div class="modal-title-row">
            <h2>Reservation #${record.bookingNumber}</h2>
            <span class="status-badge ${getBadgeClass(record.type)}">${getBadgeLabel(record.type)}</span>
          </div>
          <p class="modal-subtitle">Guest: <strong>${escapeHtml(record.guestName)}</strong> | Hotel: <strong>${escapeHtml(record.hotelName)}</strong></p>
        </div>
        <button class="btn-close" id="modal-btn-close">&times;</button>
      </div>

      <div class="modal-body">
        ${record.discrepancies.length > 0 ? `
          <div class="discrepancy-alert-box">
            <h3>⚠️ Audit Discrepancies Detected (${record.discrepancyCount})</h3>
            <ul>
              ${record.discrepancies.map(d => `
                <li>
                  <strong>${d.field}:</strong> ${d.message}
                </li>
              `).join('')}
            </ul>
          </div>
        ` : `
          <div class="success-alert-box">
            <h3>✅ Perfect Alignment</h3>
            <p>All extracted fields between WhatsApp Chat and Arrival File match seamlessly!</p>
          </div>
        `}

        <div class="modal-columns">
          <!-- WhatsApp Column -->
          <div class="modal-column column-whatsapp">
            <div class="col-header">
              <span class="col-icon">💬</span>
              <h3>WhatsApp Chat Log</h3>
            </div>
            ${record.whatsappData ? `
              <div class="field-list">
                <div class="field-row">
                  <span class="field-label">Booking ID:</span>
                  <span class="field-value font-mono">${wa.bookingNumber || 'N/A'}</span>
                </div>
                <div class="field-row">
                  <span class="field-label">Guest Name:</span>
                  <span class="field-value">${escapeHtml(wa.guestName || 'N/A')}</span>
                </div>
                <div class="field-row">
                  <span class="field-label">Hotel:</span>
                  <span class="field-value">${escapeHtml(wa.hotelName || 'N/A')}</span>
                </div>
                <div class="field-row">
                  <span class="field-label">Check-in:</span>
                  <span class="field-value ${isFieldDiff(record, 'Check-in Date') ? 'text-diff' : ''}">${wa.checkIn || 'N/A'}</span>
                </div>
                <div class="field-row">
                  <span class="field-label">Check-out:</span>
                  <span class="field-value ${isFieldDiff(record, 'Check-out Date') ? 'text-diff' : ''}">${wa.checkOut || 'N/A'}</span>
                </div>
                <div class="field-row">
                  <span class="field-label">Rooms / Type:</span>
                  <span class="field-value">${wa.roomCount} room(s) (${wa.roomType})</span>
                </div>
                <div class="field-row">
                  <span class="field-label">Meal Plan:</span>
                  <span class="field-value">${wa.mealPlan}</span>
                </div>
                <div class="field-row">
                  <span class="field-label">Price Mentioned:</span>
                  <span class="field-value ${isFieldDiff(record, 'Price / Selling Rate') ? 'text-diff' : ''}">${wa.price ? wa.price + ' SAR' : 'N/A'}</span>
                </div>
                <div class="field-row">
                  <span class="field-label">Cost Mentioned:</span>
                  <span class="field-value ${isFieldDiff(record, 'Cost Rate') ? 'text-diff' : ''}">${wa.cost ? wa.cost + ' SAR' : 'N/A'}</span>
                </div>
                <div class="field-row">
                  <span class="field-label">Supplier Ref:</span>
                  <span class="field-value font-mono">${wa.supplierRef || 'N/A'}</span>
                </div>
              </div>
              <div class="raw-snippet-box">
                <h4>Raw Message Excerpt:</h4>
                <pre class="raw-text">${escapeHtml(wa.rawText)}</pre>
              </div>
            ` : `
              <div class="not-found-placeholder">
                <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <p>Not found in WhatsApp chat export!</p>
              </div>
            `}
          </div>

          <!-- Arrival File Column -->
          <div class="modal-column column-arrival">
            <div class="col-header">
              <span class="col-icon">📊</span>
              <h3>Arrival CSV File Data</h3>
            </div>
            ${record.arrivalData ? `
              <div class="field-list">
                <div class="field-row">
                  <span class="field-label">Booking ID:</span>
                  <span class="field-value font-mono">${arr.bookingNumber}</span>
                </div>
                <div class="field-row">
                  <span class="field-label">Guest Name:</span>
                  <span class="field-value">${escapeHtml(arr.guestName)}</span>
                </div>
                <div class="field-row">
                  <span class="field-label">Hotel Name:</span>
                  <span class="field-value">${escapeHtml(arr.hotelName)}</span>
                </div>
                <div class="field-row">
                  <span class="field-label">Check-in:</span>
                  <span class="field-value ${isFieldDiff(record, 'Check-in Date') ? 'text-diff' : ''}">${arr.checkIn}</span>
                </div>
                <div class="field-row">
                  <span class="field-label">Check-out:</span>
                  <span class="field-value ${isFieldDiff(record, 'Check-out Date') ? 'text-diff' : ''}">${arr.checkOut}</span>
                </div>
                <div class="field-row">
                  <span class="field-label">Rooms / Type:</span>
                  <span class="field-value">${arr.roomCount} room(s) (${arr.roomTypeFormatted})</span>
                </div>
                <div class="field-row">
                  <span class="field-label">Meal Plan:</span>
                  <span class="field-value">${arr.mealPlan}</span>
                </div>
                <div class="field-row">
                  <span class="field-label">View Name:</span>
                  <span class="field-value">${arr.viewName || 'Standard'}</span>
                </div>
                <div class="field-row">
                  <span class="field-label">Total Price:</span>
                  <span class="field-value ${isFieldDiff(record, 'Price / Selling Rate') ? 'text-diff' : ''}">${arr.totalPrice} SAR</span>
                </div>
                <div class="field-row">
                  <span class="field-label">Total Cost:</span>
                  <span class="field-value ${isFieldDiff(record, 'Cost Rate') ? 'text-diff' : ''}">${arr.totalCost} SAR</span>
                </div>
                <div class="field-row">
                  <span class="field-label">Supplier Ref:</span>
                  <span class="field-value font-mono">${arr.supplierRef || 'N/A'}</span>
                </div>
                <div class="field-row">
                  <span class="field-label">Hotel Confirmation:</span>
                  <span class="field-value font-mono">${arr.hotelConfirmation || 'N/A'}</span>
                </div>
                <div class="field-row">
                  <span class="field-label">Created By:</span>
                  <span class="field-value">${arr.createdBy || 'N/A'}</span>
                </div>
              </div>
            ` : `
              <div class="not-found-placeholder">
                <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <p>Not found in Arrival File!</p>
              </div>
            `}
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach handlers
  backdrop.querySelector('#modal-btn-close')?.addEventListener('click', () => {
    backdrop.remove();
    onClose();
  });

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) {
      backdrop.remove();
      onClose();
    }
  });

  document.body.appendChild(backdrop);
}

function getBadgeClass(type) {
  if (type === 'MISSING_IN_ARRIVAL') return 'badge-danger';
  if (type === 'MISSING_IN_CHAT') return 'badge-purple';
  if (type === 'FIELD_DISCREPANCY') return 'badge-warning';
  return 'badge-success';
}

function getBadgeLabel(type) {
  if (type === 'MISSING_IN_ARRIVAL') return '🚨 Missing in Arrival File';
  if (type === 'MISSING_IN_CHAT') return '⚠️ Missing in WhatsApp Chat';
  if (type === 'FIELD_DISCREPANCY') return '⚡ Field Mismatch';
  return '✅ Matched';
}

function isFieldDiff(record, fieldName) {
  return record.discrepancies.some(d => d.field === fieldName);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
