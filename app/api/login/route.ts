import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { createErpClient } from '@/lib/erp-client';
import { deserializeJar, serializeJar } from '@/lib/jar-utils';

export async function POST(req: NextRequest) {
  try {
    const { username, password, captcha, csrfToken, jar: serializedJar } = await req.json();

    if (!serializedJar) {
      return NextResponse.json({ error: 'Missing jar' }, { status: 400 });
    }

    const jar = await deserializeJar(serializedJar);
    const client = createErpClient(jar);

    // Prepare payload
    const params = new URLSearchParams();
    params.append('_csrf', csrfToken);
    params.append('LoginForm[username]', username);
    params.append('LoginForm[password]', password);
    params.append('LoginForm[captcha]', captcha);

    // Execute POST to login
    console.log('Attempting Login POST...');
    const response = await client.post('https://newerp.kluniversity.in/index.php?r=site%2Flogin', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://newerp.kluniversity.in/index.php?r=site%2Flogin',
        'Origin': 'https://newerp.kluniversity.in',
      },
      
    });

    // --- REQUIREMENT 1: Verify Login Success Properly ---
    console.log('Verifying session by hitting Dashboard...');
    const dashboardRes = await client.get('https://newerp.kluniversity.in/index.php?r=site%2Findex', {
      headers: {
        'Referer': 'https://newerp.kluniversity.in/index.php?r=site%2Flogin',
        'Origin': 'https://newerp.kluniversity.in',
      }
    });

    const $ = cheerio.load(dashboardRes.data);
    const isLoginPage = $('input[name="LoginForm[username]"]').length > 0 || dashboardRes.data.includes('LoginForm');

    if (isLoginPage) {
      // Extract error message from the original login response or dashboard response
      const $login = cheerio.load(response.data);
      const errorMessage = $login('.help-block-error').text().trim() || 
                           $login('.alert-danger').text().trim() ||
                           'Login session invalid or rejected by ERP.';
      
      return NextResponse.json({ 
        error: errorMessage,
        isLoginError: true 
      }, { status: 401 });
    }

    // Success confirmed
    console.log('Login verified successfully.');
    const updatedJar = await serializeJar(jar);

    return NextResponse.json({
      success: true,
      jar: updatedJar,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
