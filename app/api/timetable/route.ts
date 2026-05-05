import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { createErpClient, hasValidSession } from '@/lib/erp-client';
import { deserializeJar } from '@/lib/jar-utils';

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const isDebug = searchParams.get('debug') === 'true';

  try {
    const { jar: serializedJar, academicyear, semesterid } = await req.json();

    if (!serializedJar) {
      return NextResponse.json({ error: 'Missing jar' }, { status: 400 });
    }

    const jar = await deserializeJar(serializedJar);
    const client = createErpClient(jar);

    const baseUrl = 'https://newerp.kluniversity.in';
    const entryUrl = `${baseUrl}/index.php?r=timetables%2Funiversitymasteracademictimetableview%2Findexstudentindisearch`;
    const fetchBaseUrl = `${baseUrl}/index.php?r=timetables%2Funiversitymasteracademictimetableview%2Findividualstudenttimetableget`;

    // --- STEP 1: Handshake ---
    try {
      await client.get(entryUrl, {
        headers: { 'Referer': `${baseUrl}/index.php?r=site%2Findex`, 'Origin': baseUrl }
      });
    } catch (e: any) {
      return NextResponse.json({ success: false, stage: "request", error: `Handshake failed: ${e.message}` }, { status: 500 });
    }

    // --- STEP 2: PERFORM GET FETCH ---
    const finalUrl = `${fetchBaseUrl}&UniversityMasterAcademicTimetableView[academicyear]=${academicyear || '19'}&UniversityMasterAcademicTimetableView[semesterid]=${semesterid || '4'}`;
    
    console.log('--- Timetable: Performing GET Fetch ---');
    console.log(`Final GET URL: ${finalUrl}`);

    let response;
    try {
      response = await client.get(finalUrl, {
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': entryUrl,
          'Accept': 'text/html, */*; q=0.01'
        },
      });
    } catch (e: any) {
      return NextResponse.json({ success: false, stage: "request", error: `GET fetch failed: ${e.message}` }, { status: 500 });
    }

    const resData = response.data as string;
    const $res = cheerio.load(resData);

    // --- STEP 3: VALIDATION LOGS (MANDATORY) ---
    console.log("DATA-KEY ROW COUNT:", $res('tr[data-key]').length);
    console.log("TABLE COUNT:", $res('table').length);
    console.log("HAS TABLE-WRAP:", $res('.table-wrap').length);
    console.log("RAW CONTAINS DATA-KEY:", resData.includes("data-key"));
    console.log("RAW CONTAINS GRID-VIEW:", resData.includes("grid-view"));

    // --- STEP 4: EXTRACTION LOGIC ---
    // REQUIREMENT: Use global data-key extraction
    let rows = $res('tr[data-key]');

    // FALLBACK: If global data-key extraction fails
    if (rows.length === 0) {
      console.log("--- Falling back to full DOM scan for <tr> with course-like content ---");
      rows = $res('tr').filter((_, el) => {
        const text = $res(el).text();
        const hasCells = $res(el).find('td').length > 0;
        // Basic heuristic: row contains a hyphen (common in course codes) and has > 2 cells
        return hasCells && text.includes('-') && $res(el).find('td').length > 5;
      }) as any;
      console.log(`FALLBACK ROW COUNT: ${rows.length}`);
    }

    if (rows.length === 0) {
      return NextResponse.json({
        success: false,
        stage: "parsing",
        error: "No timetable rows found in response.",
        debug: { htmlSnippet: resData.substring(0, 2000) }
      });
    }

    const timetableData: any[] = [];
    const courses: Record<string, any> = {};

    rows.each((i, rowEl) => {
      const row = $res(rowEl);
      const cols = row.find('td');
      if (cols.length > 1) {
        const day = $res(cols[0]).text().trim();
        // Skip header/empty rows
        if (day.toLowerCase().includes('day') || day.toLowerCase().includes('period') || day === '#') return;
        
        const periods: any[] = [];
        cols.each((j, tdEl) => {
          if (j === 0) return; // Skip day column
          const td = $res(tdEl);
          const raw = td.text().trim();
          if (raw && raw !== '-') {
            const parts = raw.split(' - ');
            let courseCode = "UNKNOWN";
            let type = "UNKNOWN";
            let section = "UNKNOWN";
            let room = null;
            if (parts.length >= 1) {
              const subParts = parts[0].split('-');
              courseCode = (subParts[0] || "UNKNOWN").trim().toUpperCase();
              type = subParts[1] || "UNKNOWN";
            }
            if (parts.length >= 2) section = parts[1].trim();
            if (parts.length >= 3) {
              const subParts = parts[2].split('-');
              room = subParts[0] || null;
            }
            const periodInfo = { period: j, raw, courseCode, type, section, room };
            periods.push(periodInfo);
            if (courseCode !== "UNKNOWN") {
              if (!courses[courseCode]) {
                courses[courseCode] = { courseCode, types: new Set(), sections: new Set(), rooms: new Set(), schedule: [] };
              }
              courses[courseCode].types.add(type);
              if (section !== "UNKNOWN") courses[courseCode].sections.add(section);
              if (room) courses[courseCode].rooms.add(room);
              const isDuplicate = courses[courseCode].schedule.some((s: any) => s.day === day && s.period === j);
              if (!isDuplicate) courses[courseCode].schedule.push({ day, period: j });
            }
          } else {
            periods.push({ period: j, raw: null, courseCode: null, type: null, section: null, room: null });
          }
        });
        if (day && day.length < 20) timetableData.push({ day, periods });
      }
    });

    Object.keys(courses).forEach(code => {
      courses[code].types = Array.from(courses[code].types);
      courses[code].sections = Array.from(courses[code].sections);
      courses[code].rooms = Array.from(courses[code].rooms);
    });

    return NextResponse.json({ success: true, days: timetableData, courses: courses });

  } catch (error: any) {
    console.error('Fatal Timetable error:', error);
    return NextResponse.json({ success: false, stage: "parsing", error: error.message }, { status: 500 });
  }
}
