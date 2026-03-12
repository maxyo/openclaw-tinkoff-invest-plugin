import test from 'node:test';
import assert from 'node:assert/strict';

import {
  makeClientOrderId,
  makeTextResult,
  toInt64String,
  toQuotation,
} from '../src/format.ts';

test('toQuotation converts positive decimal strings to units and nano', () => {
  assert.deepEqual(toQuotation('123.45'), {
    units: '123',
    nano: 450_000_000,
  });
});

test('toQuotation preserves sign for units and nano', () => {
  assert.deepEqual(toQuotation('-1.000000001'), {
    units: '-1',
    nano: -1,
  });
});

test('toQuotation rejects invalid decimal strings', () => {
  assert.throws(
    () => toQuotation('12.1234567890'),
    /up to 9 fractional digits/i,
  );
});

test('toInt64String converts integers and rejects non-integers', () => {
  assert.equal(toInt64String(42), '42');
  assert.throws(() => toInt64String(1.5), /integer value/i);
});

test('makeClientOrderId keeps explicit ids and generates UUIDs when missing', () => {
  assert.equal(makeClientOrderId('order-123'), 'order-123');
  assert.match(
    makeClientOrderId(),
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
});

test('makeTextResult includes summary and structured payload', () => {
  const payload = { accountId: 'abc', balance: 10 };
  const result = makeTextResult('Portfolio fetched', payload);

  assert.equal(result.content[0].type, 'text');
  assert.match(result.content[0].text, /Portfolio fetched/);
  assert.deepEqual(result.structuredContent, payload);
});
