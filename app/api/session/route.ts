import { NextResponse } from 'next/server';
import { CookieJar } from 'tough-cookie';
import * as cheerio from 'cheerio';
import { createErpClient } from '@/lib/erp-client';
import { serializeJar } from '@/lib/jar-utils';

export async function GET() {
  try {
    const jar = new CookieJar();
    const client = createErpClient(jar);

    // 1. Fetch login page
    const response = await client.get('https://newerp.kluniversity.in/index.php?r=site%2Flogin');
    const $ = cheerio.load(response.data);

    // 2. Extract CSRF token
    const csrfToken = $('input[name="_csrf"]').val() as string;

    if (!csrfToken) {
      throw new Error('CSRF token not found');
    }

    // 3. Serialize jar
    const serializedJar = await serializeJar(jar);

    return NextResponse.json({
      csrfToken,
      jar: serializedJar,
    });
  } catch (error: any) {
    console.error('Handshake error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
