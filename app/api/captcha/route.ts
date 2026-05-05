import { NextRequest, NextResponse } from 'next/server';
import { createErpClient } from '@/lib/erp-client';
import { deserializeJar } from '@/lib/jar-utils';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const serializedJar = searchParams.get('jar');

    if (!serializedJar) {
      return NextResponse.json({ error: 'Missing jar parameter' }, { status: 400 });
    }

    const jar = await deserializeJar(serializedJar);
    const client = createErpClient(jar);

    // Fetch captcha image
    // Note: The URL must be identical to the one triggered by the browser session
    const response = await client.get('https://newerp.kluniversity.in/index.php?r=site%2Fcaptcha', {
      responseType: 'arraybuffer',
    });

    return new NextResponse(response.data, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Captcha relay error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
