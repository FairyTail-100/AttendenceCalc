import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

export const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Logs all cookies currently in the jar to the console.
 */
export async function logJarCookies(jar: CookieJar, label: string = 'Current Cookies') {
  const cookies = await jar.getCookies('https://newerp.kluniversity.in');
  console.log(`--- ${label} ---`);
  if (cookies.length === 0) {
    console.log('No cookies found.');
  } else {
    cookies.forEach(c => console.log(`${c.key}=${c.value}`));
  }
  console.log('---------------------------');
}

/**
 * Verifies if PHPSESSID exists in the jar.
 */
export async function hasValidSession(jar: CookieJar): Promise<boolean> {
  const cookies = await jar.getCookies('https://newerp.kluniversity.in');
  return cookies.some(c => c.key === 'PHPSESSID' && c.value.length > 0);
}

/**
 * Creates an Axios instance with cookie jar support and a modern User-Agent.
 */
export function createErpClient(jar: CookieJar) {
  const client = wrapper(axios.create({
    jar,
    withCredentials: true,
    maxRedirects: 10,
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'max-age=0',
    }
  }));
  return client;
}
