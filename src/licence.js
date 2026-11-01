'use strict';
// Licence-key handling for a VS Code extension, using Dodo Payments' public licence endpoints
// (activate / validate / deactivate). Only public endpoints are used, so no secret API key ships in the extension.
// Exercised end to end against Dodo's Test Mode; see test/licence.test.js for the offline unit tests.
const os = require('os');

// Use 'test' while developing. Switch to 'live' only when the live product and checkout link exist.
const MODE = 'test';
const ENV = {
  test: {
    api: 'https://test.dodopayments.com',
    buyUrl: 'REPLACE_WITH_YOUR_TEST_CHECKOUT_LINK'
  },
  live: {
    api: 'https://live.dodopayments.com', // verify against Dodo's docs before release
    buyUrl: 'REPLACE_WITH_LIVE_PAYMENT_LINK'
  }
}[MODE];

const KEY_SECRET = 'licence.key';
const INSTANCE_STATE = 'licence.instanceId';

async function post(path, body) {
  const res = await fetch(ENV.api + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  return { status: res.status, data };
}

// Pro = a stored key whose activation Dodo still reports valid.
// Dodo answers 200 {"valid": false} for unknown keys (not 404).
async function isPro(ctx) {
  const key = await ctx.secrets.get(KEY_SECRET);
  const instanceId = ctx.globalState.get(INSTANCE_STATE);
  if (!key || !instanceId) return false;
  try {
    const r = await post('/licenses/validate', { license_key: key, license_key_instance_id: instanceId });
    return r.status === 200 && !!r.data && r.data.valid === true;
  } catch {
    return false; // offline. TODO before release: cache the last good check for a grace period.
  }
}

// Returns {ok, reason}. reason: 'limit' (422), 'invalid' (403/404), 'error'.
async function activateKey(ctx, key) {
  const r = await post('/licenses/activate', { license_key: key, name: os.hostname() });
  if (r.status === 200 || r.status === 201) {
    if (r.data && r.data.id) {
      await ctx.secrets.store(KEY_SECRET, key);
      await ctx.globalState.update(INSTANCE_STATE, r.data.id);
      return { ok: true };
    }
  }
  if (r.status === 422) return { ok: false, reason: 'limit' };
  if (r.status === 403 || r.status === 404) return { ok: false, reason: 'invalid' };
  return { ok: false, reason: 'error', status: r.status };
}

async function removeKey(ctx) {
  const key = await ctx.secrets.get(KEY_SECRET);
  const instanceId = ctx.globalState.get(INSTANCE_STATE);
  if (key && instanceId) {
    try { await post('/licenses/deactivate', { license_key: key, license_key_instance_id: instanceId }); } catch { /* ignore */ }
  }
  await ctx.secrets.delete(KEY_SECRET);
  await ctx.globalState.update(INSTANCE_STATE, undefined);
}

module.exports = { MODE, buyUrl: ENV.buyUrl, isPro, activateKey, removeKey, _setEnvForTests: (e) => Object.assign(ENV, e) };
