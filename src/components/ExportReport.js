import * as XLSX from 'xlsx';

export function exportComparisonToExcel(comparisonResults) {
  if (!comparisonResults || comparisonResults.length === 0) return;

  const exportRows = comparisonResults.map(r => {
    const wa = r.whatsappData || {};
    const arr = r.arrivalData || {};

    const diffMessages = r.discrepancies.map(d => `${d.field}: ${d.message}`).join(' | ');

    return {
      'Booking Number': r.bookingNumber || 'N/A',
      'Guest Name': r.guestName || 'N/A',
      'Hotel Name': r.hotelName || 'N/A',
      'Audit Status': getStatusText(r.type),
      'Discrepancy Count': r.discrepancyCount,
      'Discrepancies Detail': diffMessages || 'None',
      'Chat Check-in': wa.checkIn || 'N/A',
      'Arrival Check-in': arr.checkIn || 'N/A',
      'Chat Price': wa.price ? `${wa.price} SAR` : 'N/A',
      'Arrival Price': arr.totalPrice ? `${arr.totalPrice} SAR` : 'N/A',
      'Chat Cost': wa.cost ? `${wa.cost} SAR` : 'N/A',
      'Arrival Cost': arr.totalCost ? `${arr.totalCost} SAR` : 'N/A',
      'Supplier Ref': arr.supplierRef || wa.supplierRef || 'N/A',
      'Hotel Confirmation': arr.hotelConfirmation || wa.hotelConfirmation || 'N/A',
      'Created By': arr.createdBy || 'N/A'
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Audit Report');

  // Auto-width columns
  const maxWidths = {};
  exportRows.forEach(row => {
    Object.keys(row).forEach(key => {
      const valStr = String(row[key] || '');
      maxWidths[key] = Math.max(maxWidths[key] || key.length, valStr.length);
    });
  });

  worksheet['!cols'] = Object.keys(maxWidths).map(key => ({
    wch: Math.min(maxWidths[key] + 3, 50)
  }));

  const now = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `WhatsApp_Arrival_Audit_Report_${now}.xlsx`);
}

function getStatusText(type) {
  if (type === 'MISSING_IN_ARRIVAL') return 'Missing in Arrival File';
  if (type === 'MISSING_IN_CHAT') return 'Missing in WhatsApp Chat';
  if (type === 'FIELD_DISCREPANCY') return 'Field Discrepancy Mismatch';
  return 'Matched';
}
