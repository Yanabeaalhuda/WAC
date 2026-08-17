import { isInvalidGuestName } from '../engine/comparatorEngine.js';

/**
 * WhatsApp Chat Parser Module
 * Extracts booking entities, guest names, dates, hotel names, prices, and room info.
 */

export function parseWhatsAppChat(text) {
  if (!text || typeof text !== 'string') return [];

  // Normalize line endings and clean string
  const cleanText = text.replace(/\r\n/g, '\n').trim();

  // Split into message chunks based on timestamp headers, line dividers, or blank lines
  // Standard WhatsApp patterns:
  // [1:39 PM, 8/15/2026] Sender: ...
  // 15/08/2026, 1:39 pm - Sender: ...
  const lines = cleanText.split('\n');
  const chunks = [];
  let currentChunk = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isTimestampHeader = /^\[\d{1,2}:\d{2}.*?\]/.test(line) || /^\d{1,2}\/\d{1,2}\/\d{2,4}.*?-/.test(line);
    const isDivider = /^--------------+$/.test(line.trim()) || /^\.\.\.\.\.\.\.\.\.\.\.\.\.+$/.test(line.trim());

    if (isDivider) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.join('\n'));
        currentChunk = [];
      }
      continue;
    }

    if (isTimestampHeader) {
      // If previous chunk has content, save it
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.join('\n'));
        currentChunk = [];
      }
    }
    currentChunk.push(line);
  }
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join('\n'));
  }

  // Now aggregate chunks into distinct reservation items by grouping by booking ID or guest reference
  const parsedRecordsMap = new Map();
  const unassignedChunks = [];

  for (const chunk of chunks) {
    const record = parseSingleChunk(chunk);
    if (!record) continue;

    if (record.bookingNumber) {
      if (parsedRecordsMap.has(record.bookingNumber)) {
        // Merge with existing record for this booking number
        const existing = parsedRecordsMap.get(record.bookingNumber);
        mergedRecord(existing, record);
      } else {
        parsedRecordsMap.set(record.bookingNumber, record);
      }
    } else if ((record.guestName && record.guestName !== 'Unknown') || (record.hotelName && record.hotelName !== 'Unspecified') || record.supplierRef) {
      unassignedChunks.push(record);
    }
  }

  // Try matching unassigned chunks with existing records by guest name or context
  const records = Array.from(parsedRecordsMap.values());

  for (const unassigned of unassignedChunks) {
    let matched = false;
    if (unassigned.guestName && unassigned.guestName !== 'Unknown' && !isInvalidGuestName(unassigned.guestName)) {
      const match = records.find(r => 
        (r.guestName && isNameSimilar(r.guestName, unassigned.guestName)) ||
        (r.rawText && r.rawText.toLowerCase().includes(unassigned.guestName.toLowerCase()))
      );
      if (match) {
        mergedRecord(match, unassigned);
        matched = true;
      }
    }
    if (!matched && unassigned.supplierRef) {
      const match = records.find(r => r.supplierRef === unassigned.supplierRef || r.hotelConfirmation === unassigned.supplierRef);
      if (match) {
        mergedRecord(match, unassigned);
        matched = true;
      }
    }
    if (!matched) {
      // Add as standalone record
      records.push(unassigned);
    }
  }

  return records;
}

function parseSingleChunk(rawText) {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  let bookingNumber = null;
  let guestName = null;
  let hotelName = null;
  let checkIn = null;
  let checkOut = null;
  let nights = null;
  let roomCount = null;
  let roomType = null;
  let mealPlan = null;
  let price = null;
  let cost = null;
  let supplierRef = null;
  let hotelConfirmation = null;
  let status = 'Confirmed';

  const fullContent = rawText;

  // 1. Extract Booking Number (e.g. 26564, 26576, 26538)
  // Check PDF attachment pattern first: "Confirmation 26564 Maha Al-Nasser.pdf"
  const pdfConfMatch = fullContent.match(/(?:Confirmation|CONFIRMATION|حجز|booking)[_\s]+(\d{4,6})/i);
  if (pdfConfMatch) {
    bookingNumber = pdfConfMatch[1];
  }

  // Extract Guest Name from Confirmation PDF filename if present: "Confirmation 26564 Maha Al-Nasser.pdf"
  const pdfNameMatch = fullContent.match(/(?:Confirmation|CONFIRMATION)[_\s]+\d{4,6}[_\s]+([A-Za-z\s\-]+?)(?:\.pdf|$)/i);
  if (pdfNameMatch && pdfNameMatch[1].trim().length >= 3) {
    const candidate = pdfNameMatch[1].trim();
    if (!isInvalidGuestName(candidate)) {
      guestName = candidate;
    }
  }

  // Explicit label for booking number: "رقم 25906" or "رقم الحجز 26538" or "Booking ID: 26564"
  const explicitNumMatch = fullContent.match(/(?:رقم|حجز رقم|رقم الحجز|Booking ID|Booking No|Booking#)\s*:?\s*(\d{4,6})/i);
  if (explicitNumMatch) {
    bookingNumber = explicitNumMatch[1];
  }

  // Standalone 5-digit booking number
  if (!bookingNumber) {
    const bookingNumMatches = fullContent.match(/\b(2\d{4})\b/g);
    if (bookingNumMatches && bookingNumMatches.length > 0) {
      bookingNumber = bookingNumMatches[bookingNumMatches.length - 1];
    }
  }

  // 2. Extract Supplier Reference / Hotel Confirmation
  const suppRefMatch = fullContent.match(/\b(H\d{12,18})\b/i);
  if (suppRefMatch) {
    supplierRef = suppRefMatch[1];
  }
  const confirmationMatch = fullContent.match(/\b(35\d{8}|30\d{8}|59\d{10})\b/);
  if (confirmationMatch) {
    hotelConfirmation = confirmationMatch[1];
  }

  // 3. Extract Guest Name
  if (!guestName) {
    // Label match (English or Arabic): "Guest name : Maha Al-Nasser" or "اسم العميل : عبدالله الصقير"
    const nameLabelMatch = fullContent.match(/(?:Guest name|GuestName|Guest|اسم العميل|العميل|أ\.|السيد|الضيوف|كلاينت)\s*:\s*([^\n\r,:]+)/i);
    if (nameLabelMatch) {
      const candidate = cleanName(nameLabelMatch[1]);
      if (!isInvalidGuestName(candidate)) {
        guestName = candidate;
      }
    }
  }

  if (!guestName) {
    // Inspect lines for names
    for (const line of lines) {
      // English Uppercase/Titlecase line (e.g. BANDAR ALHAJRI, Maha Al-Nasser)
      if (/^[A-Za-z\s\-]{4,30}$/.test(line) && 
          !line.includes('SALES') && !line.includes('YANABEA') && !line.includes('RSV') && 
          !line.includes('CONFIRMATION') && !line.includes('AG2026')) {
        const cand = line.trim();
        if (!isInvalidGuestName(cand)) {
          guestName = cand;
          break;
        }
      }
      // Arabic full name line
      if (/^(?:أ\.\s*)?[\u0600-\u06FF\s]{4,30}$/.test(line) && 
          !line.includes('فندق') && !line.includes('مكة') && !line.includes('كونراد') &&
          !line.includes('مؤكد') && !line.includes('شراء') && !line.includes('بيع') &&
          !line.includes('غرفة') && !line.includes('دخول') && !line.includes('خروج')) {
        const cand = cleanName(line);
        if (!isInvalidGuestName(cand)) {
          guestName = cand;
          break;
        }
      }
    }
  }

  // 4. Extract Hotel Name
  const hotelLabelMatch = fullContent.match(/(?:Hotel name|HotelName|Hotel|اسم الفندق|فندق)\s*:\s*([^\n\r]+)/i);
  if (hotelLabelMatch) {
    hotelName = cleanHotel(hotelLabelMatch[1]);
  } else {
    hotelName = cleanHotel(fullContent);
  }

  // 5. Dates Extraction
  const checkinMatch = fullContent.match(/(?:Check in|Check-in|Checkin|تاريخ الدخول|الدخول|من)\s*:\s*([^\n\r]+)/i);
  if (checkinMatch) {
    checkIn = normalizeDate(checkinMatch[1]);
  } else {
    const arCheckin = fullContent.match(/(?:تاريخ الدخول|الدخول|من)\s*:?\s*([0-9١-٩]{1,2}\s*(?:اغسطس|أغسطس|سبتمبر|اكتوبر|نوفمبر|ديسمبر|يناير|فبراير|مارس|ابريل|مايو|يونيو|يوليو|[0-9]{1,2}))/i);
    if (arCheckin) checkIn = normalizeDate(arCheckin[1]);
  }

  const checkoutMatch = fullContent.match(/(?:Check out|Check-out|Checkout|تاريخ المغادرة|خروج|إلى|الي)\s*:\s*([^\n\r]+)/i);
  if (checkoutMatch) {
    checkOut = normalizeDate(checkoutMatch[1]);
  } else {
    const arCheckout = fullContent.match(/(?:تاريخ المغادرة|خروج|إلى|الي)\s*:?\s*([0-9١-٩]{1,2}\s*(?:اغسطس|أغسطس|سبتمبر|اكتوبر|نوفمبر|ديسمبر|يناير|فبراير|مارس|ابريل|مايو|يونيو|يوليو|[0-9]{1,2}))/i);
    if (arCheckout) checkOut = normalizeDate(arCheckout[1]);
  }

  const nightsMatch = fullContent.match(/([0-9١-٩]+)\s*(?:ليالي|ليلة|ليلتين|nights|night)/i);
  if (nightsMatch) {
    nights = parseArabicNum(nightsMatch[1]) || (fullContent.includes('ليلتين') ? 2 : 1);
  }

  // 6. Rooms & Room Type
  const qtyMatch = fullContent.match(/(?:Quantity|Rooms|عدد الغرف|غرف)\s*:\s*(\d+)/i);
  if (qtyMatch) {
    roomCount = parseInt(qtyMatch[1], 10);
  } else if (/غرفتين/i.test(fullContent)) roomCount = 2;
  else if (/ثلاث غرف/i.test(fullContent)) roomCount = 3;
  else if (/غرفة/i.test(fullContent) || /غرفه/i.test(fullContent)) roomCount = 1;

  const roomTypeLabel = fullContent.match(/(?:Room type|RoomType|نوع الغرفة)\s*:\s*([^\n\r]+)/i);
  if (roomTypeLabel) {
    roomType = roomTypeLabel[1].trim();
  } else {
    const roomTypesFound = [];
    if (/ثنائية|دبل|ثنائي|Double|Twin|King/i.test(fullContent)) roomTypesFound.push('Double');
    if (/ثلاثية|ثلاثي|Triple/i.test(fullContent)) roomTypesFound.push('Triple');
    if (/رباعي|رباعية|Quad/i.test(fullContent)) roomTypesFound.push('Quad');
    if (/سويت|جناح|غرفة وصالة|Suite/i.test(fullContent)) roomTypesFound.push('Suite');
    if (roomTypesFound.length > 0) {
      roomType = roomTypesFound.join(' & ');
    }
  }

  // 7. Meal Plan
  const mealLabel = fullContent.match(/(?:Meal|Meal plan|الوجبات|الوجبة)\s*:\s*([^\n\r]+)/i);
  if (mealLabel) {
    const mStr = mealLabel[1].trim();
    if (/فطور|إفطار|breakfast|BB/i.test(mStr)) mealPlan = 'Breakfast';
    else if (/هاف بورد|half board|HB/i.test(mStr)) mealPlan = 'Half Board';
    else if (/بدون|room only|RO/i.test(mStr)) mealPlan = 'Room only';
    else mealPlan = mStr;
  } else {
    if (/بدون|room only|RO/i.test(fullContent)) mealPlan = 'Room only';
    else if (/فطور|إفطار|BB|breakfast/i.test(fullContent)) mealPlan = 'Breakfast';
    else if (/هاف بورد|half board|HB/i.test(fullContent)) mealPlan = 'Half Board';
  }

  // 8. Prices & Cost
  // Ratio format e.g. "700 / 675 : سوبيريور دبل ستي" or "675/700"
  const slashPriceMatch = fullContent.match(/(?:^|\s)(\d{3,5})\s*[\/:\\]\s*(\d{3,5})(?:\s|:|$)/m);
  if (slashPriceMatch) {
    const val1 = parseFloat(slashPriceMatch[1]);
    const val2 = parseFloat(slashPriceMatch[2]);
    price = Math.max(val1, val2);
    cost = Math.min(val1, val2);
  }

  if (!price) {
    const priceMatch = fullContent.match(/(?:تم البيع|بيع|السعر|Price)\s*:?\s*([0-9,.]+)/i) || fullContent.match(/([0-9]+)\s*ريال/i);
    if (priceMatch) {
      price = parseFloat(priceMatch[1].replace(',', ''));
    }
  }
  if (!cost) {
    const costMatch = fullContent.match(/(?:تم شراء|شراء|تكلفة|Cost)\s*:?\s*([0-9,.]+)/i);
    if (costMatch) {
      cost = parseFloat(costMatch[1].replace(',', ''));
    }
  }

  // Status
  if (/ملغي|إلغاء|cancelled/i.test(fullContent)) {
    status = 'Cancelled';
  }

  // Return parsed object if it contains any meaningful data
  if (!bookingNumber && (!guestName || guestName === 'Unknown' || isInvalidGuestName(guestName)) && (!hotelName || hotelName === 'Unspecified') && !supplierRef && !hotelConfirmation) {
    return null;
  }

  return {
    source: 'WhatsApp',
    bookingNumber: bookingNumber || null,
    guestName: (guestName && !isInvalidGuestName(guestName)) ? guestName : 'Unknown',
    hotelName: hotelName || 'Unspecified',
    checkIn: checkIn || null,
    checkOut: checkOut || null,
    nights: nights || null,
    roomCount: roomCount || 1,
    roomType: roomType || 'Unspecified',
    mealPlan: mealPlan || 'Unspecified',
    price: price || null,
    cost: cost || null,
    supplierRef: supplierRef || null,
    hotelConfirmation: hotelConfirmation || null,
    status: status,
    rawText: rawText
  };
}

function mergedRecord(target, source) {
  if (!target.bookingNumber && source.bookingNumber) target.bookingNumber = source.bookingNumber;
  if ((!target.guestName || target.guestName === 'Unknown' || isInvalidGuestName(target.guestName)) && source.guestName && !isInvalidGuestName(source.guestName)) {
    target.guestName = source.guestName;
  }
  if ((!target.hotelName || target.hotelName === 'Unspecified') && source.hotelName && source.hotelName !== 'Unspecified') {
    target.hotelName = source.hotelName;
  }
  if (!target.checkIn && source.checkIn) target.checkIn = source.checkIn;
  if (!target.checkOut && source.checkOut) target.checkOut = source.checkOut;
  if (!target.price && source.price) target.price = source.price;
  if (!target.cost && source.cost) target.cost = source.cost;
  if (!target.supplierRef && source.supplierRef) target.supplierRef = source.supplierRef;
  if (!target.hotelConfirmation && source.hotelConfirmation) target.hotelConfirmation = source.hotelConfirmation;
  if (source.rawText && !target.rawText.includes(source.rawText)) {
    target.rawText += '\n---\n' + source.rawText;
  }
}

function cleanName(name) {
  if (!name) return '';
  return name.replace(/^(?:أ\.|السيد|العميل|كلاينت|شخص|حجز)\s*/i, '').trim();
}

function cleanHotel(hotel) {
  if (!hotel) return 'Unspecified';
  const str = hotel.trim();
  if (/فوكو/i.test(str) || /voco/i.test(str)) return 'voco Makkah by IHG';
  if (/كونراد/i.test(str) || /conrad/i.test(str)) return 'Conrad Jabal Omar Makkah';
  if (/أجنحة هيلتون|هيلتون سويت|hilton suites/i.test(str)) return 'Hilton Suites Makkah';
  if (/دبل تري|doubletree|double tree/i.test(str)) return 'DoubleTree by Hilton Makkah Jabal Omar';
  if (/فيرمونت|fairmont|برج الساعة|clock tower/i.test(str)) return 'Makkah Clock Royal Tower - A Fairmont Hotel';
  if (/زمزم|pullman|بولمان/i.test(str)) return 'ZamZam Pullman Makkah';
  if (/حياة|هايات|hyatt/i.test(str)) return 'Hyatt Regency Jabal Omar Makkah';
  if (/دار الخير|concorde|كونكورد/i.test(str)) return 'Concorde Dar Al Khair';
  return str.replace(/^(?:فندق|فندق\s+)/i, '').trim();
}

function parseArabicNum(str) {
  if (!str) return 0;
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let res = str;
  for (let i = 0; i < 10; i++) {
    res = res.replace(new RegExp(arabicDigits[i], 'g'), i);
  }
  return parseInt(res, 10) || 0;
}

function normalizeDate(str) {
  if (!str) return null;
  let dStr = str.trim();
  // Convert Arabic numerals
  dStr = parseArabicNum(dStr).toString() === '0' ? dStr : dStr.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));

  // Try YYYY-MM-DD
  let match = dStr.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (match) {
    return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
  }

  // Try DD-MM-YYYY or DD/MM/YYYY
  match = dStr.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (match) {
    return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  }

  const monthsMap = {
    'اغسطس': '08', 'أغسطس': '08', 'aug': '08', 'august': '08',
    'سبتمبر': '09', 'sep': '09', 'september': '09',
    'اكتوبر': '10', 'أكتوبر': '10', 'oct': '10', 'october': '10',
    'نوفمبر': '11', 'nov': '11', 'november': '11',
    'ديسمبر': '12', 'dec': '12', 'december': '12',
    'يناير': '01', 'jan': '01', 'january': '01',
    'فبراير': '02', 'feb': '02', 'february': '02',
    'مارس': '03', 'mar': '03', 'march': '03',
    'ابريل': '04', 'أبريل': '04', 'apr': '04', 'april': '04',
    'مايو': '05', 'may': '05',
    'يونيو': '06', 'jun': '06', 'june': '06',
    'يوليو': '07', 'jul': '07', 'july': '07'
  };

  const dayMatch = dStr.match(/\b\d{1,2}\b/);
  if (!dayMatch) return null;
  const day = dayMatch[0].padStart(2, '0');

  let month = '08';
  const lower = dStr.toLowerCase();
  for (const [key, val] of Object.entries(monthsMap)) {
    if (lower.includes(key)) {
      month = val;
      break;
    }
  }

  const yearMatch = dStr.match(/\b(202\d)\b/);
  const year = yearMatch ? yearMatch[1] : '2026';

  return `${year}-${month}-${day}`;
}

function isNameSimilar(name1, name2) {
  if (!name1 || !name2) return false;
  if (isInvalidGuestName(name1) || isInvalidGuestName(name2)) return false;
  const n1 = name1.toLowerCase().trim();
  const n2 = name2.toLowerCase().trim();
  return n1.includes(n2) || n2.includes(n1);
}

