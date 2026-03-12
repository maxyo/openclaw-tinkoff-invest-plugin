import test from 'node:test';
import assert from 'node:assert/strict';

import { resolvePluginConfig } from '../src/config.ts';

test('resolvePluginConfig applies defaults and omits missing token', () => {
  const config = resolvePluginConfig(undefined);

  assert.deepEqual(config, {
    baseUrl: 'https://invest-public-api.tinkoff.ru/rest',
    timeoutMs: 10_000,
    allowTrading: false,
    appName: 'openclaw-plugin-tinkoff-invest/0.1.0',
  });
  assert.equal('token' in config, false);
});

test('resolvePluginConfig normalizes baseUrl and coerces timeout', () => {
  const config = resolvePluginConfig({
    token: 'secret',
    baseUrl: 'https://example.com/',
    timeoutMs: '15000',
    allowTrading: true,
    appName: 'custom-app',
  });

  assert.deepEqual(config, {
    token: 'secret',
    baseUrl: 'https://example.com',
    timeoutMs: 15_000,
    allowTrading: true,
    appName: 'custom-app',
  });
});

test('resolvePluginConfig rejects unsupported keys', () => {
  assert.throws(
    () => resolvePluginConfig({ extra: true }),
    /unrecognized key/i,
  );
});
