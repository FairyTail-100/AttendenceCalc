/**
 * Universal Dual-Mode Parser for Attendance and Timetable.
 * Handles both Raw HTML and Copied Text (mashed text).
 */

const isHTML = (input) => {
  return input.includes('<table') || input.includes('data-key') || input.includes('<tr');
};

// --- ATTENDANCE PARSERS ---

const parseAttendanceHTML = (htmlString) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  
  const subjects = {};
  const rows = doc.querySelectorAll('tr[data-key]');
  
  if (rows.length === 0) {
    throw new Error("No attendance data found in HTML. Ensure you copied the full table.");
  }
  
  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    if (cells.length >= 6) {
      const code = cells[1]?.textContent?.trim() || 'Unknown';
      const name = cells[2]?.textContent?.trim() || 'Unknown';
      const typeStr = cells[3]?.textContent?.trim()?.toUpperCase() || '';
      
      if (typeStr && (typeStr.includes('L') || typeStr.includes('P') || typeStr.includes('S') || typeStr.includes('T'))) {
         const conducted = parseInt(cells[8]?.textContent?.trim(), 10) || 0;
         const attended = parseInt(cells[9]?.textContent?.trim(), 10) || 0;
         
         if (!subjects[code]) {
           subjects[code] = { courseCode: code, courseName: name, components: {} };
         }
         
         let compType = 'L';
         if (typeStr.includes('P')) compType = 'P';
         if (typeStr.includes('S')) compType = 'S';
         
         subjects[code].components[compType] = { conducted, attended };
      }
    }
  });
  
  return Object.values(subjects);
};

const parseAttendanceText = (textString) => {
  const subjects = {};
  const lines = textString.split('\n');
  
  lines.forEach(line => {
    // Use the explicit regex logic for mashed text
    // Pattern: (\d+)?([A-Z0-9]{8,10})(.+?)([LPS])(?:[A-Z0-9-]+)?\d{4}-\d{4}Term\dN(\d+)(\d+)(\d+)\d+(\d+)%
    // Adapting slightly to handle spaces/tabs gracefully
    const regex = /(\d+)?\s*([A-Z0-9]{8,10})\s+(.+?)\s+([LPS])\s+(?:[A-Z0-9-]+)?\s*\d{4}-\d{4}\s*Term\d\s*N\s*(\d+)\s+(\d+)\s+(\d+)\s+\d+\s+(\d+)%/;
    const match = line.match(regex);
    
    if (match) {
      const code = match[2];
      const name = match[3].trim();
      const typeStr = match[4];
      const conducted = parseInt(match[5], 10) || 0;
      const attended = parseInt(match[6], 10) || 0;
      
      if (!subjects[code]) {
         subjects[code] = { courseCode: code, courseName: name, components: {} };
       }
       subjects[code].components[typeStr] = { conducted, attended };
    } else {
       // Fallback for cleanly tabbed text
       const parts = line.split('\t');
       if (parts.length >= 10 && parts[1].match(/^[A-Z0-9]{8,10}$/)) {
          const code = parts[1].trim();
          const name = parts[2].trim();
          const typeStr = parts[3].trim();
          if (['L', 'P', 'S'].includes(typeStr)) {
             const conducted = parseInt(parts[8], 10) || 0;
             const attended = parseInt(parts[9], 10) || 0;
             if (!subjects[code]) {
               subjects[code] = { courseCode: code, courseName: name, components: {} };
             }
             subjects[code].components[typeStr] = { conducted, attended };
          }
       }
    }
  });
  
  if (Object.keys(subjects).length === 0) {
    throw new Error("No attendance data found in text. Ensure you copied the correct rows.");
  }
  
  return Object.values(subjects);
};

export const parseAttendance = (input) => {
  if (isHTML(input)) {
    return parseAttendanceHTML(input);
  } else {
    return parseAttendanceText(input);
  }
};


// --- TIMETABLE PARSERS ---

const parseTimetableHTML = (htmlString) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  const blueprint = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  
  const dayMap = {
    'MONDAY': 1, 'MON': 1, 'TUESDAY': 2, 'TUE': 2, 'WEDNESDAY': 3, 'WED': 3,
    'THURSDAY': 4, 'THU': 4, 'FRIDAY': 5, 'FRI': 5, 'SATURDAY': 6, 'SAT': 6, 'SUNDAY': 0, 'SUN': 0
  };
  
  const rows = doc.querySelectorAll('tr');
  rows.forEach(row => {
    let rowDay = null;
    for (const [dayName, dayIndex] of Object.entries(dayMap)) {
      if (row.cells && row.cells[0] && row.cells[0].textContent.toUpperCase().includes(dayName)) {
        rowDay = dayIndex;
        break;
      }
    }
    
    if (rowDay !== null) {
      const cells = row.querySelectorAll('td');
      const limit = Math.min(cells.length, 9); // Only first 8 periods + day col
      for (let i = 1; i < limit; i++) {
        const cellText = cells[i].textContent.trim();
        if (cellText && cellText.length > 5 && cellText !== '-') {
          const parts = cellText.split('-');
          if (parts.length >= 2) {
            const courseCode = parts[0].trim();
            let typeStr = parts[1].trim().toUpperCase();
            let compType = 'L';
            if (typeStr.includes('P')) compType = 'P';
            if (typeStr.includes('S')) compType = 'S';
            blueprint[rowDay].push({ courseCode, type: compType });
          } else {
            blueprint[rowDay].push(null);
          }
        } else {
          blueprint[rowDay].push(null);
        }
      }
    }
  });
  
  return blueprint;
};

const parseTimetableText = (textString) => {
  const blueprint = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  const lines = textString.split('\n');
  
  const dayMap = {
    'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6, 'Sun': 0
  };
  
  lines.forEach(line => {
    let rowDay = null;
    for (const [dayName, dayIndex] of Object.entries(dayMap)) {
      if (line.trim().startsWith(dayName)) {
        rowDay = dayIndex;
        break;
      }
    }
    
    if (rowDay !== null) {
      // First split by tabs/spaces to isolate the first 8 periods.
      // The day string is part 0, period 1 is part 1, etc.
      // Wait, there might be spaces inside course names. If it's tab-delimited or <td> parsed, 
      // the user might paste HTML directly or tabbed text.
      // Looking at the sample: "25MT1306E-L - S-2 -RoomNo-H-402". It's tab delimited between periods.
      const parts = line.split('\t');
      
      const limit = Math.min(parts.length, 9);
      for (let i = 1; i < limit; i++) {
         const cellText = parts[i].trim();
         const regex = /([A-Z0-9]{8,10})-([LPS])/;
         const match = cellText.match(regex);
         if (match) {
            blueprint[rowDay].push({
               courseCode: match[1],
               type: match[2]
            });
         } else {
            blueprint[rowDay].push(null);
         }
      }
    }
  });
  
  return blueprint;
};

export const parseTimetable = (input) => {
  if (isHTML(input)) {
    return parseTimetableHTML(input);
  } else {
    return parseTimetableText(input);
  }
};
