import { randomUUID } from 'node:crypto';

import type { Quotation } from './openapi.js';

export function stringifyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function makeTextResult(summary: string, data: unknown): { content: [{ type: 'text'; text: string }]; structuredContent: Record<string, unknown> } {
  const structuredContent = data as Record<string, unknown>;

  return {
    content: [
      {
        type: 'text',
        text: `${summary}\n\n${stringifyJson(data)}`,
      },
    ],
    structuredContent,
  };
}

export function toQuotation(decimalValue: string): Quotation {
  const normalized = decimalValue.trim();
  const match = /^(?<sign>-?)(?<units>\d+)(?:\.(?<fraction>\d{1,9}))?$/.exec(normalized);

  if (!match?.groups) {
    throw new Error('Price must be a decimal string with up to 9 fractional digits.');
  }

  const sign = match.groups['sign'] === '-' ? -1 : 1;
  const wholeUnits = BigInt(match.groups['units'] ?? '0') * BigInt(sign);
  const fraction = (match.groups['fraction'] ?? '').padEnd(9, '0');
  const nano = Number.parseInt(fraction, 10) * sign;

  return {
    units: wholeUnits.toString(),
    nano,
  };
}

export function toInt64String(value: number): string {
  if (!Number.isInteger(value)) {
    throw new Error('Expected an integer value.');
  }

  return value.toString(10);
}

export function makeClientOrderId(orderId?: string): string {
  return orderId && orderId.length > 0 ? orderId : randomUUID();
}

export function isoNow(): string {
  return new Date().toISOString();
}

export function isoDaysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString();
}
