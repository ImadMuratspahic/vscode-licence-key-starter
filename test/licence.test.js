'use strict';
// Offline unit tests: the network is replaced by a fake fetch, VS Code's storage by a tiny in-memory context.
const test = require('node:test');
const assert = require('node:assert');
const licence = require('../src/licence');

function fakeContext() {
  const secrets = new Map(), state = new Map();
  return {
    secrets: { get: async (k) => secrets.get(k), store: async (k, v) => void secrets.set(k, v), delete: async (k) => void secrets.delete(k) },
    globalState: { get: (k) => state.get(k), update: async (k, v) => void (v === undefined ? state.delete(k) : state.set(k, v)) }
  };
}
function mockFetch(handler) {
  const calls = [];
  globalThis.fetch = async (url, opts) => {
    const body = JSON.parse(opts.body); calls.push({ url, body });
    const { status, json } = handler(url, body);
    return { status, json: async () => json };
  };
  return calls;
}

test('a valid key activates and is stored', async () => {
  const ctx = fakeContext(); const calls = mockFetch(() => ({ status: 200, json: { id: 'inst_1' } }));
  const r = await licence.activateKey(ctx, 'KEY-1');
  assert.deepStrictEqual(r, { ok: true });
  assert.ok(calls[0].url.endsWith('/licenses/activate'));
  assert.strictEqual(await ctx.secrets.get('licence.key'), 'KEY-1');
  assert.strictEqual(ctx.globalState.get('licence.instanceId'), 'inst_1');
});

test('activation limit (422) and invalid keys (403/404) are told apart', async () => {
  const ctx = fakeContext();
  mockFetch(() => ({ status: 422, json: {} })); assert.deepStrictEqual(await licence.activateKey(ctx, 'K'), { ok: false, reason: 'limit' });
  mockFetch(() => ({ status: 403, json: {} })); assert.deepStrictEqual(await licence.activateKey(ctx, 'K'), { ok: false, reason: 'invalid' });
  mockFetch(() => ({ status: 404, json: {} })); assert.deepStrictEqual(await licence.activateKey(ctx, 'K'), { ok: false, reason: 'invalid' });
  assert.strictEqual(await ctx.secrets.get('licence.key'), undefined);
});

test('isPro is true only while the provider reports the key valid', async () => {
  const ctx = fakeContext(); mockFetch(() => ({ status: 200, json: { id: 'inst_1' } })); await licence.activateKey(ctx, 'KEY-1');
  mockFetch(() => ({ status: 200, json: { valid: true } })); assert.strictEqual(await licence.isPro(ctx), true);
  mockFetch(() => ({ status: 200, json: { valid: false } })); assert.strictEqual(await licence.isPro(ctx), false);
});

test('isPro is false without a stored key and when the network fails', async () => {
  const empty = fakeContext(); mockFetch(() => { throw new Error('should not be called'); }); assert.strictEqual(await licence.isPro(empty), false);
  const ctx = fakeContext(); mockFetch(() => ({ status: 200, json: { id: 'inst_1' } })); await licence.activateKey(ctx, 'KEY-1');
  globalThis.fetch = async () => { throw new Error('offline'); }; assert.strictEqual(await licence.isPro(ctx), false);
});

test('removeKey deactivates remotely and clears local storage', async () => {
  const ctx = fakeContext(); mockFetch(() => ({ status: 200, json: { id: 'inst_1' } })); await licence.activateKey(ctx, 'KEY-1');
  const calls = mockFetch(() => ({ status: 200, json: {} })); await licence.removeKey(ctx);
  assert.ok(calls[0].url.endsWith('/licenses/deactivate'));
  assert.strictEqual(await ctx.secrets.get('licence.key'), undefined);
  assert.strictEqual(ctx.globalState.get('licence.instanceId'), undefined);
});
