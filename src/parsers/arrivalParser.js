import Papa from 'papaparse';
import * as XLSX from 'xlsx';

/**
 * Parses CSV text or Excel File objects into grouped reservation records.
 */
export async function parseArrivalFile(fileOrText) {
  let rawData = [];

  if (typeof fileOrText === 'string') {
    // Parse CSV string directly
    const parsed = Papa.parse(fileOrText, { header: true, skipEmptyLines: true });
    rawData = parsed.data;
  } else if (fileOrText instanceof File) {
    const fileName = fileOrText.name.toLowerCase();
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const buffer = await fileOrText.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      rawData = XLSX.utils.sheet_to_json(firstSheet);
    } else {
      const text = await fileOrText.text();
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
      rawData = parsed.data;
    }
  }

  return processArrivalRows(rawData);
}

function processArrivalRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  // Group rows by BookingNumber
  const groupedMap = new Map();

  for (const row of rows) {
    // Find column names case-insensitively
    const keys = Object.keys(row);
    const getVal = (...possibleNames) => {
      for (const name of possibleNames) {
        const foundKey = keys.find(k => k.trim().toLowerCase() === name.toLowerCase());
        if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
          return String(row[foundKey]).trim();
        }
      }
      return '';
    };

    const bookingNumber = getVal('BookingNumber', 'Booking Number', 'BookingNo', 'ReservationNo', 'ID');
    if (!bookingNumber) continue;

    const guestName = getVal('GuestName', 'Guest Name', 'Guest', 'CustomerName');
    const status = getVal('BookingStatus', 'Status', 'State') || 'Confirmed';
    const hotelName = getVal('HotelName', 'Hotel Name', 'Hotel');
    const checkIn = getVal('Checkin', 'Check-in', 'CheckInDate', 'Arrival');
    const checkOut = getVal('CheckOut', 'Check-out', 'CheckOutDate', 'Departure');
    const roomType = getVal('RoomTypeName', 'RoomType', 'Room Type', 'Room');
    const roomCount = parseInt(getVal('NumberOfRooms', 'Rooms', 'RoomCount') || '1', 10);
    const mealName = getVal('MealName', 'Meal', 'MealPlan');
    const viewName = getVal('ViewName', 'View');
    const price = parseFloat(getVal('Price', 'TotalPrice', 'SellPrice') || '0');
    const cost = parseFloat(getVal('Cost', 'TotalCost', 'CostPrice') || '0');
    const supplierRef = getVal('SupplierReference', 'SupplierRef', 'Ref');
    const hotelConfirmation = getVal('HotelConfirmation', 'Confirmation', 'ConfNo');
    const createdBy = getVal('CreatedBy', 'Agent', 'User');

    if (!groupedMap.has(bookingNumber)) {
      groupedMap.set(bookingNumber, {
        source: 'ArrivalFile',
        bookingNumber: bookingNumber,
        guestName: guestName,
        status: status,
        hotelName: hotelName,
        checkIn: formatShortDate(checkIn),
        checkOut: formatShortDate(checkOut),
        roomCount: roomCount,
        roomTypes: [roomType].filter(Boolean),
        mealPlan: mealName,
        viewName: viewName,
        totalPrice: price,
        totalCost: cost,
        supplierRef: supplierRef,
        hotelConfirmation: hotelConfirmation,
        createdBy: createdBy,
        rawRows: [row]
      });
    } else {
      const existing = groupedMap.get(bookingNumber);
      existing.roomCount += roomCount;
      if (roomType && !existing.roomTypes.includes(roomType)) {
        existing.roomTypes.push(roomType);
      }
      existing.totalPrice += price;
      existing.totalCost += cost;
      if (!existing.supplierRef && supplierRef) existing.supplierRef = supplierRef;
      if (!existing.hotelConfirmation && hotelConfirmation) existing.hotelConfirmation = hotelConfirmation;
      existing.rawRows.push(row);
    }
  }

  // Format roomTypes array into clean string
  const result = Array.from(groupedMap.values()).map(rec => ({
    ...rec,
    roomTypeFormatted: rec.roomTypes.join(', ') || 'Standard'
  }));

  return result;
}

function formatShortDate(dateStr) {
  if (!dateStr) return '';
  // Convert ISO string "2026-08-15 00:00:00" to "2026-08-15"
  return dateStr.split(' ')[0];
}
