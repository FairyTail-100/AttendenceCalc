import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { createErpClient, logJarCookies, hasValidSession, sleep } from '@/lib/erp-client';
import { deserializeJar } from '@/lib/jar-utils';

export async function POST(req: NextRequest) {
  try {
    const { jar: serializedJar, year, semester } = await req.json();

    if (!serializedJar) {
      return NextResponse.json({ error: 'Missing jar' }, { status: 400 });
    }

    const jar = await deserializeJar(serializedJar);
    const client = createErpClient(jar);

    const baseUrl = 'https://newerp.kluniversity.in';
    const entryUrl = `${baseUrl}/index.php?r=studentattendance%2Fstudentdailyattendance%2Fsearchgetinput`;
    const postUrl = `${baseUrl}/index.php?r=studentattendance%2Fstudentdailyattendance%2Fcourselist`;

    // --- REQUIREMENT 1: True Entry Page GET ---
    console.log('Step 1: GET Entry Page (searchgetinput)');
    const entryRes = await client.get(entryUrl, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Referer': `${baseUrl}/index.php?r=site%2Findex`,
        'Origin': baseUrl
      }
    });

    if (entryRes.status !== 200) {
      return NextResponse.json({ 
        error: `Failed to load entry page: ${entryRes.status}`,
        html: entryRes.data.substring(0, 1000)
      }, { status: 500 });
    }

    // --- REQUIREMENT 2: Extract CSRF strictly from this page ---
    const $ = cheerio.load(entryRes.data);
    const pageCsrf = $('meta[name="csrf-token"]').attr('content') || $('input[name="_csrf"]').val() as string;

    if (!pageCsrf) {
      console.error('CSRF Extraction Failed. HTML Preview:', entryRes.data.substring(0, 500));
      return NextResponse.json({ error: 'CSRF not found on entry page.' }, { status: 500 });
    }

    // --- REQUIREMENT: Session Validation ---
    const validSession = await hasValidSession(jar);
    if (!validSession) {
      return NextResponse.json({ error: 'Session lost before scrape POST.' }, { status: 401 });
    }

    // --- REQUIREMENT: Debug Logging ---
    await logJarCookies(jar, 'Pre-AJAX Cookies');
    
    // --- REQUIREMENT: Required Payload ---
    const payload = new URLSearchParams();
    payload.append('_csrf', pageCsrf);
    payload.append('DynamicModel[academicyear]', year || '19');
    payload.append('DynamicModel[semesterid]', semester || '4');

    console.log('Final AJAX Payload:', payload.toString());

    // --- REQUIREMENT: Required POST Headers (AJAX/XHR Parity) ---
    try {
      const response = await client.post(postUrl, payload, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'text/plain, */*; q=0.01',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-Token': pageCsrf,
          'Origin': baseUrl,
          'Referer': entryUrl,
        },
      });

      console.log('AJAX Response Status:', response.status);

      if (response.status !== 200) {
        return NextResponse.json({
          error: `ERP AJAX returned ${response.status}`,
          html: response.data.substring(0, 2000)
        }, { status: response.status });
      }

      // --- FIXED RESPONSE PARSING ---
      const $res = cheerio.load(response.data);
      
      // Debug logs to identify structure issues
      console.log('--- Parsing Debug ---');
      console.log('Response length:', response.data.length);
      console.log('#get-list exists:', $res('#get-list').length > 0);
      console.log('Total tables found:', $res('table').length);
      
      // Try specific selector first, then fall back to any table rows
      let rows = $res('#get-list table tbody tr');
      if (rows.length === 0) {
        console.log('Selector #get-list tbody tr failed, trying generic table tr...');
        rows = $res('table tr');
      }

      console.log('Total rows found:', rows.length);
      
      const attendanceData: any[] = [];
      rows.each((i, row) => {
        const cols = $res(row).find('td');
        // Filter out header rows or empty rows
        if (cols.length >= 13) {
          const courseCode = $res(cols[1]).text().trim();
          // Skip if courseCode is empty or header text
          if (!courseCode || courseCode.toLowerCase().includes('course')) return;

          const rowData = {
            coursecode: courseCode,
            coursedesc: $res(cols[2]).text().trim(),
            type: $res(cols[3]).text().trim().toUpperCase(),
            conducted: $res(cols[8]).text().trim(),
            attended: $res(cols[9]).text().trim(),
            percentage: $res(cols[12]).text().trim(),
          };

          if (attendanceData.length === 0) {
            console.log('First valid row extracted:', rowData);
          }
          attendanceData.push(rowData);
        }
      });

      if (attendanceData.length === 0) {
        console.warn('No attendance data rows parsed. Returning raw HTML for debugging.');
        return NextResponse.json({
          success: false,
          error: 'Parsing failed: No valid attendance rows found in response.',
          html: response.data.substring(0, 2000)
        });
      }

      return NextResponse.json({
        success: true,
        data: attendanceData
      });

    } catch (postError: any) {
      const status = postError.response?.status || 500;
      console.error('AJAX Post Error Status:', status);
      console.error('AJAX Post Error Body:', postError.response?.data?.substring(0, 1000));
      return NextResponse.json({
        error: `AJAX POST failed with status ${status}: ${postError.message}`,
        html: postError.response?.data?.substring(0, 2000),
        payload: payload.toString()
      }, { status });
    }

  } catch (error: any) {
    console.error('Fatal Scraping error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
