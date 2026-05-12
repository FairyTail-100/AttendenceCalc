export function scrapeResultToBaseline(scrapeData: any[]) {
  // Group rows by course code
  const subjects: Record<string, any> = {};

  scrapeData.forEach(row => {
    const code = row.coursecode || row.courseCode;
    const name = row.coursedesc || row.courseName;
    const rawType = row.type || 'L'; // Fallback if type is missing

    // Extract the first character for safety (e.g., 'L', 'P', 'S')
    const compType = rawType.toUpperCase()[0];
    const allowedTypes = ['L', 'P', 'S'];
    const finalCompType = allowedTypes.includes(compType) ? compType : 'L';

    if (!subjects[code]) {
      subjects[code] = {
        courseCode: code,
        courseName: name,
        components: {}
      };
    }

    subjects[code].components[finalCompType] = {
      conducted: parseInt(row.conducted, 10) || 0,
      attended: parseInt(row.attended, 10) || 0
    };
  });

  return Object.values(subjects);
}

export function timetableResultToBlueprint(timetableData: any) {
  const blueprint: Record<number, any[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  
  const dayMap: Record<string, number> = {
    'MONDAY': 1, 'MON': 1, 'TUESDAY': 2, 'TUE': 2, 'WEDNESDAY': 3, 'WED': 3,
    'THURSDAY': 4, 'THU': 4, 'FRIDAY': 5, 'FRI': 5, 'SATURDAY': 6, 'SAT': 6, 'SUNDAY': 0, 'SUN': 0
  };

  if (timetableData && timetableData.days) {
    timetableData.days.forEach((dayObj: any) => {
      let rowDay = null;
      for (const [dayName, dayIndex] of Object.entries(dayMap)) {
        if (dayObj.day.toUpperCase().includes(dayName)) {
          rowDay = dayIndex;
          break;
        }
      }

      if (rowDay !== null) {
        // periods array comes from ERP Scraper usually 1-indexed, we want 8 periods
        // Let's populate the 8 periods exactly.
        const periods = Array(8).fill(null);

        dayObj.periods.forEach((p: any) => {
          // p.period is the column index, usually 1 to 8. We want array index 0 to 7
          if (p.period >= 1 && p.period <= 8 && p.courseCode) {
            const rawType = p.type || 'L';
            const compType = rawType.toUpperCase()[0];
            const allowedTypes = ['L', 'P', 'S'];
            const finalCompType = allowedTypes.includes(compType) ? compType : 'L';

            periods[p.period - 1] = {
              courseCode: p.courseCode,
              type: finalCompType,
              // Optional metadata — ignored by attendance engine, used by timetable UI
              ...(p.section && p.section !== 'UNKNOWN' && { section: p.section }),
              ...(p.room && { roomNumber: p.room }),
            };
          }
        });
        
        blueprint[rowDay] = periods;
      }
    });
  }

  return blueprint;
}
