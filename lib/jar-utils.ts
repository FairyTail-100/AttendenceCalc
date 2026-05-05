import { CookieJar } from 'tough-cookie';

/**
 * Serializes a tough-cookie jar to a Base64 string.
 */
export async function serializeJar(jar: CookieJar): Promise<string> {
  const serialized = await jar.serialize();
  return Buffer.from(JSON.stringify(serialized)).toString('base64');
}

/**
 * Deserializes a Base64 string back into a tough-cookie jar.
 */
export async function deserializeJar(serializedStr: string): Promise<CookieJar> {
  const jsonStr = Buffer.from(serializedStr, 'base64').toString('utf8');
  const serialized = JSON.parse(jsonStr);
  return await CookieJar.fromJSON(serialized);
}
