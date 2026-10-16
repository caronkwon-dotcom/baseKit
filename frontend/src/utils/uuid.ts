/** Client idempotency tokens and temporary UI keys. Business IDs belong to the server. */
export function createUuid(): string {
  const cryptoApi = globalThis.crypto;
  try {
    if (typeof cryptoApi?.randomUUID === 'function') return cryptoApi.randomUUID();
  } catch { /* Restricted browser: use the shared fallback. */ }
  const bytes = new Uint8Array(16);
  try {
    if (typeof cryptoApi?.getRandomValues !== 'function') throw new Error('No Web Crypto');
    cryptoApi.getRandomValues(bytes);
  } catch {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}