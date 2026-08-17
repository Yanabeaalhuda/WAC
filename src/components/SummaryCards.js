export function createSummaryCards({ summary, activeFilter, onFilterChange }) {
  const container = document.createElement('div');
  container.className = 'summary-grid';

  const cardsData = [
    {
      id: 'ALL',
      title: 'Total Analyzed',
      count: summary.totalAnalyzed || 0,
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>',
      colorClass: 'card-neutral'
    },
    {
      id: 'MATCHED',
      title: 'Fully Matched',
      count: summary.matched || 0,
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      colorClass: 'card-success'
    },
    {
      id: 'FIELD_DISCREPANCY',
      title: 'Field Discrepancies',
      count: summary.discrepancies || 0,
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
      colorClass: 'card-warning'
    },
    {
      id: 'MISSING_IN_ARRIVAL',
      title: 'Missing in Arrival File',
      count: summary.missingInArrival || 0,
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
      colorClass: 'card-danger'
    },
    {
      id: 'MISSING_IN_CHAT',
      title: 'Missing in WhatsApp Chat',
      count: summary.missingInChat || 0,
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      colorClass: 'card-purple'
    }
  ];

  container.innerHTML = cardsData.map(c => `
    <div class="summary-card ${c.colorClass} ${activeFilter === c.id ? 'active-filter' : ''}" data-filter="${c.id}">
      <div class="summary-card-header">
        <span class="summary-card-title">${c.title}</span>
        <div class="summary-card-icon">${c.icon}</div>
      </div>
      <div class="summary-card-count">${c.count}</div>
      <div class="summary-card-footer">
        <span>Click to filter table</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      </div>
    </div>
  `).join('');

  setTimeout(() => {
    container.querySelectorAll('.summary-card').forEach(el => {
      el.addEventListener('click', () => {
        const filterId = el.getAttribute('data-filter');
        onFilterChange(filterId);
      });
    });
  }, 0);

  return container;
}
