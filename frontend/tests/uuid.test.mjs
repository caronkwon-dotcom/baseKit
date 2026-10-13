import test from 'node:test';
import assert from 'node:assert/strict';
import { createUuid } from '../src/utils/uuid.ts';
const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
for (const [name, cryptoApi] of [
  ['native UUID', { randomUUID: () => '00000000-0000-4000-8000-000000000000' }],
  ['older Chromium with getRandomValues', { getRandomValues: bytes => { bytes.fill(17); return bytes; } }],
  ['no Web Crypto', undefined],
  ['restricted Web Crypto', { randomUUID: () => { throw Error('blocked'); }, getRandomValues: () => { throw Error('blocked'); } }],
  ['non-callable randomUUID', { randomUUID: true }],
]) test(`UUID works with ${name}`, () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  try {
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: cryptoApi });
    const ids = Array.from({ length: 100 }, createUuid);
    ids.forEach(id => assert.match(id, pattern));
    if (!cryptoApi?.randomUUID && !cryptoApi?.getRandomValues) assert.equal(new Set(ids).size, 100);
  } finally {
    if (original) Object.defineProperty(globalThis, 'crypto', original);
    else delete globalThis.crypto;
  }
});