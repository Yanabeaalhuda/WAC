/**
 * Comparison and Reconciliation Engine
 */

export function compareRecords(whatsappRecords = [], arrivalRecords = []) {
  const comparisonResults = [];
  const processedArrivalKeys = new Set();
  const processedChatKeys = new Set();

  // Map Arrival records by Booking Number for fast lookup
  const arrivalMap = new Map();
  arrivalRecords.forEach(rec => {
    if (rec.bookingNumber) {
      arrivalMap.set(String(rec.bookingNumber), rec);
    }
  });

  // 1. Process WhatsApp Chat Records
  whatsappRecords.forEach(chatRec => {
    let matchedArrival = null;

    // Match by Booking Number first
    if (chatRec.bookingNumber && arrivalMap.has(String(chatRec.bookingNumber))) {
      matchedArrival = arrivalMap.get(String(chatRec.bookingNumber));
    }

    // Secondary match: Guest Name + Hotel or Supplier Reference (only if Guest Name is valid)
    if (!matchedArrival && chatRec.guestName && chatRec.guestName !== 'Unknown' && !isInvalidGuestName(chatRec.guestName)) {
      matchedArrival = arrivalRecords.find(arrRec => 
        !processedArrivalKeys.has(arrRec.bookingNumber) &&
        (isNameMatch(chatRec.guestName, arrRec.guestName) ||
         (chatRec.supplierRef && arrRec.supplierRef === chatRec.supplierRef) ||
         (chatRec.hotelConfirmation && arrRec.hotelConfirmation === chatRec.hotelConfirmation))
      );
    }

    if (matchedArrival) {
      processedArrivalKeys.add(matchedArrival.bookingNumber);
      if (chatRec.bookingNumber) processedChatKeys.add(chatRec.bookingNumber);

      const diffs = evaluateFieldDifferences(chatRec, matchedArrival);

      comparisonResults.push({
        id: matchedArrival.bookingNumber || chatRec.bookingNumber,
        bookingNumber: matchedArrival.bookingNumber || chatRec.bookingNumber,
        guestName: (chatRec.guestName && !isInvalidGuestName(chatRec.guestName) && chatRec.guestName !== 'Unknown') 
          ? chatRec.guestName 
          : matchedArrival.guestName,
        hotelName: (chatRec.hotelName && chatRec.hotelName !== 'Unspecified') 
          ? chatRec.hotelName 
          : matchedArrival.hotelName,
        type: diffs.length > 0 ? 'FIELD_DISCREPANCY' : 'MATCHED',
        discrepancyCount: diffs.length,
        discrepancies: diffs,
        whatsappData: chatRec,
        arrivalData: matchedArrival,
        status: matchedArrival.status || 'Confirmed'
      });
    } else {
      // Missing in Arrival File
      if (chatRec.bookingNumber) processedChatKeys.add(chatRec.bookingNumber);
      comparisonResults.push({
        id: chatRec.bookingNumber || `chat-${Math.random().toString(36).substring(2, 8)}`,
        bookingNumber: chatRec.bookingNumber || 'N/A',
        guestName: chatRec.guestName || 'Unknown',
        hotelName: chatRec.hotelName || 'Unspecified',
        type: 'MISSING_IN_ARRIVAL',
        discrepancyCount: 1,
        discrepancies: [
          {
            field: 'Booking Status',
            severity: 'error',
            message: 'Reservation exists in WhatsApp Chat but is MISSING from the Arrival File!',
            chatVal: 'Present in Chat',
            arrivalVal: 'Not Found in Arrival File'
          }
        ],
        whatsappData: chatRec,
        arrivalData: null,
        status: 'Unrecorded'
      });
    }
  });

  // 2. Process Remaining Arrival Records not found in Chat
  arrivalRecords.forEach(arrRec => {
    if (!processedArrivalKeys.has(arrRec.bookingNumber)) {
      comparisonResults.push({
        id: arrRec.bookingNumber,
        bookingNumber: arrRec.bookingNumber,
        guestName: arrRec.guestName,
        hotelName: arrRec.hotelName,
        type: 'MISSING_IN_CHAT',
        discrepancyCount: 1,
        discrepancies: [
          {
            field: 'Chat Log Entry',
            severity: 'warning',
            message: 'Reservation listed in Arrival File but NEVER mentioned in WhatsApp Chat!',
            chatVal: 'Not Found in Chat',
            arrivalVal: 'Present in Arrival File'
          }
        ],
        whatsappData: null,
        arrivalData: arrRec,
        status: arrRec.status || 'Confirmed'
      });
    }
  });

  // Sort results: Discrepancies & Missing first, then Matched
  const typePriority = {
    'MISSING_IN_ARRIVAL': 1,
    'FIELD_DISCREPANCY': 2,
    'MISSING_IN_CHAT': 3,
    'MATCHED': 4
  };

  comparisonResults.sort((a, b) => typePriority[a.type] - typePriority[b.type]);

  return {
    summary: {
      totalAnalyzed: comparisonResults.length,
      matched: comparisonResults.filter(r => r.type === 'MATCHED').length,
      discrepancies: comparisonResults.filter(r => r.type === 'FIELD_DISCREPANCY').length,
      missingInArrival: comparisonResults.filter(r => r.type === 'MISSING_IN_ARRIVAL').length,
      missingInChat: comparisonResults.filter(r => r.type === 'MISSING_IN_CHAT').length
    },
    results: comparisonResults
  };
}

export function evaluateFieldDifferences(chat, arrival) {
  const diffs = [];

  // 1. Guest Name
  if (!chat.guestName || chat.guestName === 'Unknown' || isInvalidGuestName(chat.guestName)) {
    diffs.push({
      field: 'Guest Name',
      severity: 'warning',
      message: `Guest Name missing or invalid in WhatsApp chat (Arrival file specifies "${arrival.guestName}")`,
      chatVal: chat.guestName || 'Missing',
      arrivalVal: arrival.guestName
    });
  } else if (!isNameMatch(chat.guestName, arrival.guestName)) {
    diffs.push({
      field: 'Guest Name',
      severity: 'error',
      message: `Guest Name mismatch: Chat says "${chat.guestName}", Arrival file says "${arrival.guestName}"`,
      chatVal: chat.guestName,
      arrivalVal: arrival.guestName
    });
  }

  // 2. Hotel Name
  if (!chat.hotelName || chat.hotelName === 'Unspecified') {
    diffs.push({
      field: 'Hotel Name',
      severity: 'warning',
      message: `Hotel Name not specified in WhatsApp chat (Arrival file specifies "${arrival.hotelName}")`,
      chatVal: 'Unspecified',
      arrivalVal: arrival.hotelName
    });
  } else if (!isHotelMatch(chat.hotelName, arrival.hotelName)) {
    diffs.push({
      field: 'Hotel Name',
      severity: 'error',
      message: `Hotel Name mismatch: Chat indicates "${chat.hotelName}", Arrival file lists "${arrival.hotelName}"`,
      chatVal: chat.hotelName,
      arrivalVal: arrival.hotelName
    });
  }

  // 3. Check-in Date
  if (!chat.checkIn) {
    diffs.push({
      field: 'Check-in Date',
      severity: 'warning',
      message: `Check-in date missing in WhatsApp chat (Arrival file specifies ${arrival.checkIn})`,
      chatVal: 'Missing',
      arrivalVal: arrival.checkIn
    });
  } else if (arrival.checkIn && chat.checkIn !== arrival.checkIn) {
    diffs.push({
      field: 'Check-in Date',
      severity: 'error',
      message: `Check-in date mismatch: Chat says ${chat.checkIn}, Arrival file says ${arrival.checkIn}`,
      chatVal: chat.checkIn,
      arrivalVal: arrival.checkIn
    });
  }

  // 4. Check-out Date
  if (!chat.checkOut) {
    diffs.push({
      field: 'Check-out Date',
      severity: 'warning',
      message: `Check-out date missing in WhatsApp chat (Arrival file specifies ${arrival.checkOut})`,
      chatVal: 'Missing',
      arrivalVal: arrival.checkOut
    });
  } else if (arrival.checkOut && chat.checkOut !== arrival.checkOut) {
    diffs.push({
      field: 'Check-out Date',
      severity: 'error',
      message: `Check-out date mismatch: Chat says ${chat.checkOut}, Arrival file says ${arrival.checkOut}`,
      chatVal: chat.checkOut,
      arrivalVal: arrival.checkOut
    });
  }

  // 5. Room Count
  if (chat.roomCount && arrival.roomCount && chat.roomCount !== arrival.roomCount) {
    diffs.push({
      field: 'Room Count',
      severity: 'warning',
      message: `Room count mismatch: Chat mentions ${chat.roomCount} room(s), Arrival file has ${arrival.roomCount} room(s)`,
      chatVal: `${chat.roomCount} room(s)`,
      arrivalVal: `${arrival.roomCount} room(s)`
    });
  }

  // 6. Room Type
  if (chat.roomType && chat.roomType !== 'Unspecified' && arrival.roomTypeFormatted) {
    if (!isRoomTypeMatch(chat.roomType, arrival.roomTypeFormatted)) {
      diffs.push({
        field: 'Room Type',
        severity: 'warning',
        message: `Room type mismatch: Chat mentions ${chat.roomType}, Arrival file lists ${arrival.roomTypeFormatted}`,
        chatVal: chat.roomType,
        arrivalVal: arrival.roomTypeFormatted
      });
    }
  }

  // 7. Meal Plan
  if (chat.mealPlan && chat.mealPlan !== 'Unspecified' && arrival.mealPlan) {
    if (!isMealMatch(chat.mealPlan, arrival.mealPlan)) {
      diffs.push({
        field: 'Meal Plan',
        severity: 'warning',
        message: `Meal plan mismatch: Chat mentions ${chat.mealPlan}, Arrival file lists ${arrival.mealPlan}`,
        chatVal: chat.mealPlan,
        arrivalVal: arrival.mealPlan
      });
    }
  }

  // 8. Price / Selling Rate
  if (chat.price === null || chat.price === undefined) {
    if (arrival.totalPrice) {
      diffs.push({
        field: 'Price / Selling Rate',
        severity: 'warning',
        message: `Selling price not mentioned in WhatsApp chat (Arrival file lists ${arrival.totalPrice} SAR)`,
        chatVal: 'Missing',
        arrivalVal: `${arrival.totalPrice} SAR`
      });
    }
  } else if (arrival.totalPrice && Math.abs(chat.price - arrival.totalPrice) > 5) {
    diffs.push({
      field: 'Price / Selling Rate',
      severity: 'warning',
      message: `Price mismatch: Chat mentioned ${chat.price} SAR, Arrival file lists ${arrival.totalPrice} SAR`,
      chatVal: `${chat.price} SAR`,
      arrivalVal: `${arrival.totalPrice} SAR`
    });
  }

  // 9. Cost Rate
  if (chat.cost === null || chat.cost === undefined) {
    if (arrival.totalCost && arrival.totalCost > 0) {
      diffs.push({
        field: 'Cost Rate',
        severity: 'warning',
        message: `Cost rate not mentioned in WhatsApp chat (Arrival file lists ${arrival.totalCost} SAR)`,
        chatVal: 'Missing',
        arrivalVal: `${arrival.totalCost} SAR`
      });
    }
  } else if (arrival.totalCost && Math.abs(chat.cost - arrival.totalCost) > 5) {
    diffs.push({
      field: 'Cost Rate',
      severity: 'warning',
      message: `Cost mismatch: Chat mentioned ${chat.cost} SAR, Arrival file lists ${arrival.totalCost} SAR`,
      chatVal: `${chat.cost} SAR`,
      arrivalVal: `${arrival.totalCost} SAR`
    });
  }

  // 10. Booking Status
  if (chat.status && arrival.status && chat.status.toLowerCase() !== arrival.status.toLowerCase()) {
    diffs.push({
      field: 'Booking Status',
      severity: 'error',
      message: `Status mismatch: Chat indicates ${chat.status}, Arrival file states ${arrival.status}`,
      chatVal: chat.status,
      arrivalVal: arrival.status
    });
  }

  return diffs;
}

export function isInvalidGuestName(name) {
  if (!name || typeof name !== 'string') return true;
  const n = name.trim().toLowerCase();
  if (n.length < 3) return true;

  const terms = [
    'فوتشر', 'فاوتشر', 'تعديل', 'إلغاء', 'ملغي', 'استفسار', 'حجز', 'حجز جديد',
    'مؤكد', 'نهائي', 'مؤكد نهائي', 'شراء', 'بيع', 'تم البيع', 'تم شراء',
    'ريال', 'كلاينت', 'شركة', 'طيران', 'رحلات', 'مواسم', 'عطلات', 'عطلة',
    'فندق', 'أبراج', 'سويت', 'غرفة', 'غرفتين', 'ثلاثية', 'رباعية', 'دبل',
    'تربل', 'مكة', 'المدينة', 'الرياض', 'جدة', 'كونراد', 'هيلتون', 'فوكو',
    'شيراتون', 'زمزم', 'دار الإيمان', 'دار التوحيد', 'سويس', 'دخول', 'خروج',
    'ليالي', 'ليلة', 'ليلتين', 'نفر', 'أشخاص', 'بالغين', 'السلام عليكم',
    'شكرا', 'ممكن', 'برجاء', 'تأكيد', 'وصل', 'حاضر', 'كفو', 'تمام',
    'الله يعافيك', 'ممكن فاوتشر', 'ممكن فوتشر', 'voucher', 'confirmation',
    'unspecified', 'unknown', 'sales', 'yanabea', 'rsv', 'ag2026', 'pdf'
  ];

  if (terms.includes(n)) return true;
  for (const term of terms) {
    if (n === term || (n.startsWith(term) && n.length <= term.length + 3)) {
      return true;
    }
  }

  if (/^[\d\s\-_\.,:\/]+$/.test(n)) return true;
  return false;
}

export function isNameMatch(name1, name2) {
  if (!name1 || !name2) return false;
  if (isInvalidGuestName(name1) || isInvalidGuestName(name2)) return false;
  const clean1 = name1.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]/g, '');
  const clean2 = name2.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]/g, '');
  if (!clean1 || !clean2) return false;
  return clean1.includes(clean2) || clean2.includes(clean1);
}

export function isHotelMatch(h1, h2) {
  if (!h1 || !h2 || h1 === 'Unspecified' || h2 === 'Unspecified') return true;
  const clean1 = cleanHotelStr(h1);
  const clean2 = cleanHotelStr(h2);
  if (!clean1 || !clean2) return true;
  return clean1.includes(clean2) || clean2.includes(clean1);
}

function cleanHotelStr(h) {
  if (!h) return '';
  return h.toLowerCase()
    .replace(/^(fندق|hotel|فندق)\s+/i, '')
    .replace(/[^a-z0-9\u0600-\u06FF]/g, '');
}

function isRoomTypeMatch(t1, t2) {
  if (!t1 || !t2) return true;
  const clean1 = t1.toLowerCase();
  const clean2 = t2.toLowerCase();
  if (clean1.includes('double') && clean2.includes('double')) return true;
  if (clean1.includes('triple') && clean2.includes('triple')) return true;
  if (clean1.includes('quad') && clean2.includes('quad')) return true;
  if (clean1.includes('suite') && clean2.includes('suite')) return true;
  return clean1 === clean2;
}

function isMealMatch(m1, m2) {
  if (!m1 || !m2) return true;
  const clean1 = m1.toLowerCase();
  const clean2 = m2.toLowerCase();
  if (clean1.includes('breakfast') && clean2.includes('breakfast')) return true;
  if (clean1.includes('room only') && clean2.includes('room only')) return true;
  if (clean1.includes('half board') && clean2.includes('half board')) return true;
  return clean1 === clean2;
}

