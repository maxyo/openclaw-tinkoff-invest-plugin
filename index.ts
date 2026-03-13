import type { OpenClawPluginApi } from 'openclaw/plugin-sdk/core';

import { resolvePluginConfig, type TinkoffPluginConfig } from './src/config.js';
import { TinkoffRestClient } from './src/client.js';
import { ConfigurationError } from './src/errors.js';
import { isoDaysAgo, isoNow, makeClientOrderId, toInt64String, toQuotation } from './src/format.js';
import {
  CANDLE_INTERVAL_BY_NAME,
  INSTRUMENT_ID_TYPE_BY_NAME,
  INSTRUMENT_KIND_BY_NAME,
  OPERATION_STATE_BY_NAME,
  ORDER_DIRECTION_BY_NAME,
  ORDER_TYPE_BY_NAME,
  PORTFOLIO_CURRENCIES,
} from './src/openapi.js';

type ToolResultPayload = {
  ok: true;
  summary: string;
  data: unknown;
};

function json(payload: ToolResultPayload): {
  content: [{ type: 'text'; text: string }];
  details: ToolResultPayload;
} {
  return {
    content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
    details: payload,
  };
}

function createToolResult(summary: string, data: unknown): {
  content: [{ type: 'text'; text: string }];
  details: ToolResultPayload;
} {
  return json({ ok: true, summary, data });
}

function int64StringToBigInt(value: unknown): bigint | undefined {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return undefined;
  }

  try {
    return BigInt(value.trim());
  } catch {
    return undefined;
  }
}

function quantityLikeToBigInt(value: unknown): bigint | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const units = typeof record['units'] === 'string' ? record['units'] : undefined;
  const nano = typeof record['nano'] === 'number' ? record['nano'] : undefined;

  if (!units) {
    return undefined;
  }

  try {
    const whole = BigInt(units);
    if (nano !== undefined && nano !== 0) {
      return undefined;
    }
    return whole;
  } catch {
    return undefined;
  }
}

function buildPortfolioPositionKey(position: Record<string, unknown>): string | undefined {
  const positionUid = typeof position['positionUid'] === 'string' ? position['positionUid'] : undefined;
  if (positionUid) {
    return `positionUid:${positionUid}`;
  }

  const instrumentUid = typeof position['instrumentUid'] === 'string' ? position['instrumentUid'] : undefined;
  if (instrumentUid) {
    return `instrumentUid:${instrumentUid}`;
  }

  const figi = typeof position['figi'] === 'string' ? position['figi'] : undefined;
  if (figi) {
    return `figi:${figi}`;
  }

  return undefined;
}

function normalizeFuturesPositions(
  positionsResult: Record<string, unknown>,
  portfolioResult: Record<string, unknown>,
): Record<string, unknown> {
  const futures = Array.isArray(positionsResult['futures'])
    ? (positionsResult['futures'] as Record<string, unknown>[])
    : [];
  const portfolioPositions = Array.isArray(portfolioResult['positions'])
    ? (portfolioResult['positions'] as Record<string, unknown>[])
    : [];

  const futuresPortfolioPositions = portfolioPositions.filter(
    (position) => position['instrumentType'] === 'futures',
  );

  const portfolioByKey = new Map<string, Record<string, unknown>>();
  for (const position of futuresPortfolioPositions) {
    const key = buildPortfolioPositionKey(position);
    if (key) {
      portfolioByKey.set(key, position);
    }
  }

  const normalizedFutures = futures.map((future) => {
    const futureKey = buildPortfolioPositionKey(future);
    const portfolioMatch = futureKey ? portfolioByKey.get(futureKey) : undefined;
    const apiBalanceLots = int64StringToBigInt(future['balance']);
    const apiBlockedLots = int64StringToBigInt(future['blocked']);
    const portfolioQuantityLots = portfolioMatch ? quantityLikeToBigInt(portfolioMatch['quantityLots']) : undefined;
    const portfolioBlockedLots = portfolioMatch ? quantityLikeToBigInt(portfolioMatch['blockedLots']) : undefined;

    return {
      figi: future['figi'],
      instrumentUid: future['instrumentUid'],
      positionUid: future['positionUid'],
      ...(apiBalanceLots !== undefined ? { apiBalanceLots: apiBalanceLots.toString() } : {}),
      ...(apiBlockedLots !== undefined ? { apiBlockedLots: apiBlockedLots.toString() } : {}),
      ...(portfolioQuantityLots !== undefined ? { currentPositionLots: portfolioQuantityLots.toString() } : {}),
      ...(portfolioBlockedLots !== undefined ? { blockedByOrdersLots: portfolioBlockedLots.toString() } : {}),
      sourceOfTruth: portfolioQuantityLots !== undefined ? 'portfolio.positions.quantityLots' : 'positions.futures.balance',
      note:
        'For futures, currentPositionLots should be treated as the live net position. Raw balance/blocked in get_positions reflect API internals and order reservation state and must not be used alone as the signed position.',
    };
  });

  return {
    futures: normalizedFutures,
    note:
      'Use normalized.futures[].currentPositionLots as the live futures position and blockedByOrdersLots as reserved lots from active orders. Do not infer live position from positions.futures.balance alone.',
  };
}

function readStringParamLocal(
  params: Record<string, unknown>,
  key: string,
  options: { required: true; label?: string; allowEmpty?: boolean },
): string;
function readStringParamLocal(
  params: Record<string, unknown>,
  key: string,
  options?: { required?: boolean; label?: string; allowEmpty?: boolean },
): string | undefined;
function readStringParamLocal(
  params: Record<string, unknown>,
  key: string,
  options?: { required?: boolean; label?: string; allowEmpty?: boolean },
): string | undefined {
  const raw = params[key];
  const label = options?.label ?? key;

  if (raw === undefined || raw === null) {
    if (options?.required) {
      throw new ConfigurationError(`${label} is required.`);
    }
    return undefined;
  }

  if (typeof raw !== 'string') {
    throw new ConfigurationError(`${label} must be a string.`);
  }

  const value = raw.trim();
  if (!options?.allowEmpty && value.length === 0) {
    if (options?.required) {
      throw new ConfigurationError(`${label} is required.`);
    }
    return undefined;
  }

  return value;
}

function readNumberParamLocal(
  params: Record<string, unknown>,
  key: string,
  options: { required: true; label?: string; integer?: boolean },
): number;
function readNumberParamLocal(
  params: Record<string, unknown>,
  key: string,
  options?: { required?: boolean; label?: string; integer?: boolean },
): number | undefined;
function readNumberParamLocal(
  params: Record<string, unknown>,
  key: string,
  options?: { required?: boolean; label?: string; integer?: boolean },
): number | undefined {
  const raw = params[key];
  const label = options?.label ?? key;

  if (raw === undefined || raw === null) {
    if (options?.required) {
      throw new ConfigurationError(`${label} is required.`);
    }
    return undefined;
  }

  if (typeof raw !== 'number' || Number.isNaN(raw)) {
    throw new ConfigurationError(`${label} must be a number.`);
  }

  if (options?.integer && !Number.isInteger(raw)) {
    throw new ConfigurationError(`${label} must be an integer.`);
  }

  return raw;
}

function readStringArrayParamLocal(
  params: Record<string, unknown>,
  key: string,
  options: { required: true; label?: string },
): string[];
function readStringArrayParamLocal(
  params: Record<string, unknown>,
  key: string,
  options?: { required?: boolean; label?: string },
): string[] | undefined;
function readStringArrayParamLocal(
  params: Record<string, unknown>,
  key: string,
  options?: { required?: boolean; label?: string },
): string[] | undefined {
  const raw = params[key];
  const label = options?.label ?? key;

  if (raw === undefined || raw === null) {
    if (options?.required) {
      throw new ConfigurationError(`${label} is required.`);
    }
    return undefined;
  }

  if (!Array.isArray(raw) || !raw.every((item) => typeof item === 'string' && item.trim().length > 0)) {
    throw new ConfigurationError(`${label} must be an array of non-empty strings.`);
  }

  return raw.map((item) => item.trim());
}

function readBooleanParam(params: Record<string, unknown>, key: string): boolean | undefined {
  const raw = params[key];
  return typeof raw === 'boolean' ? raw : undefined;
}

function readEnumParam<T extends string>(
  params: Record<string, unknown>,
  key: string,
  allowed: readonly T[],
  options: { required: true; label?: string },
): T;
function readEnumParam<T extends string>(
  params: Record<string, unknown>,
  key: string,
  allowed: readonly T[],
  options?: { required?: boolean; label?: string },
): T | undefined;
function readEnumParam<T extends string>(
  params: Record<string, unknown>,
  key: string,
  allowed: readonly T[],
  options?: { required?: boolean; label?: string },
): T | undefined {
  const raw = params[key];
  const label = options?.label ?? key;

  if (raw === undefined || raw === null) {
    if (options?.required) {
      throw new ConfigurationError(`${label} is required.`);
    }
    return undefined;
  }

  if (typeof raw !== 'string') {
    throw new ConfigurationError(`${label} must be a string.`);
  }

  const value = raw.trim();
  if (value.length === 0) {
    if (options?.required) {
      throw new ConfigurationError(`${label} is required.`);
    }
    return undefined;
  }

  if (!allowed.includes(value as T)) {
    throw new ConfigurationError(`${label} must be one of: ${allowed.join(', ')}`);
  }

  return value as T;
}

function requireConfiguredToken(config: TinkoffPluginConfig): void {
  if (!config.token) {
    throw new ConfigurationError(
      'Tinkoff Invest plugin is not configured yet: fill the token in the plugin UI first.',
    );
  }
}

function assertTradingEnabled(config: TinkoffPluginConfig): void {
  if (!config.allowTrading) {
    throw new ConfigurationError(
      'Trading tools are disabled. Enable allowTrading in the plugin config to use post/cancel order.',
    );
  }
}

const emptyObjectSchema = {
  type: 'object',
  properties: {},
  additionalProperties: false,
} as const;

const candleIntervals = Object.keys(CANDLE_INTERVAL_BY_NAME) as Array<keyof typeof CANDLE_INTERVAL_BY_NAME>;
const instrumentIdTypes = Object.keys(INSTRUMENT_ID_TYPE_BY_NAME) as Array<keyof typeof INSTRUMENT_ID_TYPE_BY_NAME>;
const instrumentKinds = Object.keys(INSTRUMENT_KIND_BY_NAME) as Array<keyof typeof INSTRUMENT_KIND_BY_NAME>;
const operationStates = Object.keys(OPERATION_STATE_BY_NAME) as Array<keyof typeof OPERATION_STATE_BY_NAME>;
const orderDirections = Object.keys(ORDER_DIRECTION_BY_NAME) as Array<keyof typeof ORDER_DIRECTION_BY_NAME>;
const orderTypes = Object.keys(ORDER_TYPE_BY_NAME) as Array<keyof typeof ORDER_TYPE_BY_NAME>;
const portfolioCurrencies = [...PORTFOLIO_CURRENCIES] as Array<(typeof PORTFOLIO_CURRENCIES)[number]>;

const tinkoffInvestPlugin = {
  id: 'tinkoff-invest',
  name: 'Tinkoff Invest',
  description:
    'Native OpenClaw tools for Tinkoff Invest API: accounts, instruments, market data, portfolio, operations, and optional trading actions.',
  async register(api: OpenClawPluginApi): Promise<void> {
    const config = resolvePluginConfig(api.pluginConfig);
    let client: TinkoffRestClient | null = null;

    const getClient = (): TinkoffRestClient => {
      requireConfiguredToken(config);
      if (client === null) {
        client = new TinkoffRestClient(config);
      }
      return client;
    };

    api.logger.info(
      `[tinkoff-invest] registered (baseUrl=${config.baseUrl}, allowTrading=${String(config.allowTrading)})`,
    );

    api.registerTool({
      name: 'tinkoff_get_accounts',
      label: 'Tinkoff Get Accounts',
      description: 'List brokerage accounts for the configured Tinkoff Invest token.',
      parameters: emptyObjectSchema,
      ownerOnly: true,
      async execute(): Promise<ReturnType<typeof createToolResult>> {
        const result = await getClient().getAccounts();
        const count = result.accounts?.length ?? 0;
        return createToolResult(`Accounts fetched: ${String(count)}`, result);
      },
    });

    api.registerTool({
      name: 'tinkoff_get_user_info',
      label: 'Tinkoff Get User Info',
      description: 'Get investor profile flags and tariff name.',
      parameters: emptyObjectSchema,
      ownerOnly: true,
      async execute(): Promise<ReturnType<typeof createToolResult>> {
        return createToolResult('Fetched user info.', await getClient().getInfo());
      },
    });

    api.registerTool({
      name: 'tinkoff_get_user_tariff',
      label: 'Tinkoff Get User Tariff',
      description: 'Get Tinkoff Invest unary and stream rate limits for the current token.',
      parameters: emptyObjectSchema,
      ownerOnly: true,
      async execute(): Promise<ReturnType<typeof createToolResult>> {
        return createToolResult('Fetched user tariff.', await getClient().getUserTariff());
      },
    });

    api.registerTool({
      name: 'tinkoff_find_instrument',
      label: 'Tinkoff Find Instrument',
      description: 'Find instruments by free-text query.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          query: { type: 'string', minLength: 1, maxLength: 200 },
          instrumentKind: { type: 'string', enum: instrumentKinds },
          apiTradeAvailableOnly: { type: 'boolean' },
        },
        required: ['query'],
      },
      ownerOnly: true,
      async execute(
        _toolCallId: string,
        params: Record<string, unknown>,
      ): Promise<ReturnType<typeof createToolResult>> {
        const query = readStringParamLocal(params, 'query', { required: true });
        const instrumentKind = readEnumParam(params, 'instrumentKind', instrumentKinds);
        const apiTradeAvailableOnly = readBooleanParam(params, 'apiTradeAvailableOnly');
        const result = await getClient().findInstrument({
          query,
          ...(instrumentKind ? { instrumentKind: INSTRUMENT_KIND_BY_NAME[instrumentKind] } : {}),
          ...(apiTradeAvailableOnly !== undefined ? { apiTradeAvailableFlag: apiTradeAvailableOnly } : {}),
        });

        return createToolResult(
          `Found instruments: ${String(result.instruments?.length ?? 0)}`,
          result,
        );
      },
    });

    api.registerTool({
      name: 'tinkoff_get_instrument',
      label: 'Tinkoff Get Instrument',
      description: 'Get an instrument by figi, ticker, uid, or positionUid.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string', minLength: 1 },
          idType: { type: 'string', enum: instrumentIdTypes },
          classCode: { type: 'string', minLength: 1 },
        },
        required: ['id'],
      },
      ownerOnly: true,
      async execute(
        _toolCallId: string,
        params: Record<string, unknown>,
      ): Promise<ReturnType<typeof createToolResult>> {
        const id = readStringParamLocal(params, 'id', { required: true });
        const idType = readEnumParam(params, 'idType', instrumentIdTypes) ?? 'uid';
        const classCode = readStringParamLocal(params, 'classCode');

        const result = await getClient().getInstrumentBy({
          id,
          idType: INSTRUMENT_ID_TYPE_BY_NAME[idType],
          ...(classCode !== undefined ? { classCode } : {}),
        });

        return createToolResult(`Fetched instrument ${id}.`, result);
      },
    });

    api.registerTool({
      name: 'tinkoff_get_last_prices',
      label: 'Tinkoff Get Last Prices',
      description: 'Get last prices for one or more instrument ids.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          instrumentIds: {
            type: 'array',
            items: { type: 'string', minLength: 1 },
            minItems: 1,
            maxItems: 50,
          },
        },
        required: ['instrumentIds'],
      },
      ownerOnly: true,
      async execute(
        _toolCallId: string,
        params: Record<string, unknown>,
      ): Promise<ReturnType<typeof createToolResult>> {
        const instrumentIds = readStringArrayParamLocal(params, 'instrumentIds', { required: true });
        const result = await getClient().getLastPrices({ instrumentId: instrumentIds });
        return createToolResult(
          `Fetched last prices for ${String(instrumentIds.length)} instrument(s).`,
          result,
        );
      },
    });

    api.registerTool({
      name: 'tinkoff_get_candles',
      label: 'Tinkoff Get Candles',
      description: 'Get historical candles for an instrument and time range.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          instrumentId: { type: 'string', minLength: 1 },
          from: { type: 'string', format: 'date-time' },
          to: { type: 'string', format: 'date-time' },
          interval: { type: 'string', enum: candleIntervals },
        },
        required: ['instrumentId', 'from', 'to', 'interval'],
      },
      ownerOnly: true,
      async execute(
        _toolCallId: string,
        params: Record<string, unknown>,
      ): Promise<ReturnType<typeof createToolResult>> {
        const instrumentId = readStringParamLocal(params, 'instrumentId', { required: true });
        const from = readStringParamLocal(params, 'from', { required: true });
        const to = readStringParamLocal(params, 'to', { required: true });
        const interval = readEnumParam(params, 'interval', candleIntervals, { required: true });
        if (interval === undefined) {
          throw new ConfigurationError('interval is required.');
        }

        const result = await getClient().getCandles({
          instrumentId,
          from,
          to,
          interval: CANDLE_INTERVAL_BY_NAME[interval],
        });
        return createToolResult(`Fetched candles for ${instrumentId} (${interval}).`, result);
      },
    });

    api.registerTool({
      name: 'tinkoff_get_order_book',
      label: 'Tinkoff Get Order Book',
      description: 'Get order book for an instrument.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          instrumentId: { type: 'string', minLength: 1 },
          depth: { type: 'integer', minimum: 1, maximum: 50 },
        },
        required: ['instrumentId'],
      },
      ownerOnly: true,
      async execute(
        _toolCallId: string,
        params: Record<string, unknown>,
      ): Promise<ReturnType<typeof createToolResult>> {
        const instrumentId = readStringParamLocal(params, 'instrumentId', { required: true });
        const depth = readNumberParamLocal(params, 'depth', { integer: true }) ?? 10;
        const result = await getClient().getOrderBook({ instrumentId, depth });
        return createToolResult(
          `Fetched order book for ${instrumentId} with depth ${String(depth)}.`,
          result,
        );
      },
    });

    api.registerTool({
      name: 'tinkoff_get_portfolio',
      label: 'Tinkoff Get Portfolio',
      description: 'Get current portfolio snapshot for an account.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          accountId: { type: 'string', minLength: 1 },
          currency: { type: 'string', enum: portfolioCurrencies },
        },
        required: ['accountId'],
      },
      ownerOnly: true,
      async execute(
        _toolCallId: string,
        params: Record<string, unknown>,
      ): Promise<ReturnType<typeof createToolResult>> {
        const accountId = readStringParamLocal(params, 'accountId', { required: true });
        const currency = readEnumParam(params, 'currency', portfolioCurrencies);
        const result = await getClient().getPortfolio({
          accountId,
          ...(currency !== undefined ? { currency } : {}),
        });
        return createToolResult(`Fetched portfolio for account ${accountId}.`, result);
      },
    });

    api.registerTool({
      name: 'tinkoff_get_positions',
      label: 'Tinkoff Get Positions',
      description: 'Get money/security/futures/options positions for an account.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          accountId: { type: 'string', minLength: 1 },
        },
        required: ['accountId'],
      },
      ownerOnly: true,
      async execute(
        _toolCallId: string,
        params: Record<string, unknown>,
      ): Promise<ReturnType<typeof createToolResult>> {
        const accountId = readStringParamLocal(params, 'accountId', { required: true });
        const [positionsResult, portfolioResult] = await Promise.all([
          getClient().getPositions({ accountId }),
          getClient().getPortfolio({ accountId }),
        ]);

        const enrichedResult = {
          ...positionsResult,
          normalized: normalizeFuturesPositions(
            positionsResult as Record<string, unknown>,
            portfolioResult as Record<string, unknown>,
          ),
        };

        return createToolResult(`Fetched positions for account ${accountId}.`, enrichedResult);
      },
    });

    api.registerTool({
      name: 'tinkoff_get_operations',
      label: 'Tinkoff Get Operations',
      description: 'Get operations for an account. Defaults to the last 30 days if no range is provided.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          accountId: { type: 'string', minLength: 1 },
          from: { type: 'string', format: 'date-time' },
          to: { type: 'string', format: 'date-time' },
          state: { type: 'string', enum: operationStates },
          figi: { type: 'string', minLength: 1 },
        },
        required: ['accountId'],
      },
      ownerOnly: true,
      async execute(
        _toolCallId: string,
        params: Record<string, unknown>,
      ): Promise<ReturnType<typeof createToolResult>> {
        const accountId = readStringParamLocal(params, 'accountId', { required: true });
        const from = readStringParamLocal(params, 'from') ?? isoDaysAgo(30);
        const to = readStringParamLocal(params, 'to') ?? isoNow();
        const state = readEnumParam(params, 'state', operationStates);
        const figi = readStringParamLocal(params, 'figi');
        const result = await getClient().getOperations({
          accountId,
          from,
          to,
          ...(state ? { state: OPERATION_STATE_BY_NAME[state] } : {}),
          ...(figi !== undefined ? { figi } : {}),
        });
        return createToolResult(
          `Fetched operations for account ${accountId} from ${from} to ${to}.`,
          result,
        );
      },
    });

    api.registerTool({
      name: 'tinkoff_get_orders',
      label: 'Tinkoff Get Orders',
      description: 'Get active orders for an account.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          accountId: { type: 'string', minLength: 1 },
        },
        required: ['accountId'],
      },
      ownerOnly: true,
      async execute(
        _toolCallId: string,
        params: Record<string, unknown>,
      ): Promise<ReturnType<typeof createToolResult>> {
        const accountId = readStringParamLocal(params, 'accountId', { required: true });
        const result = await getClient().getOrders({ accountId });
        return createToolResult(`Fetched active orders for account ${accountId}.`, result);
      },
    });

    api.registerTool({
      name: 'tinkoff_get_order_state',
      label: 'Tinkoff Get Order State',
      description: 'Get state for a single order.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          accountId: { type: 'string', minLength: 1 },
          orderId: { type: 'string', minLength: 1 },
        },
        required: ['accountId', 'orderId'],
      },
      ownerOnly: true,
      async execute(
        _toolCallId: string,
        params: Record<string, unknown>,
      ): Promise<ReturnType<typeof createToolResult>> {
        const accountId = readStringParamLocal(params, 'accountId', { required: true });
        const orderId = readStringParamLocal(params, 'orderId', { required: true });
        const result = await getClient().getOrderState({ accountId, orderId });
        return createToolResult(`Fetched order state for ${orderId}.`, result);
      },
    });

    api.registerTool({
      name: 'tinkoff_post_order',
      label: 'Tinkoff Post Order',
      description: 'Place an order. Disabled by default unless allowTrading is enabled in plugin config.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          accountId: { type: 'string', minLength: 1 },
          instrumentId: { type: 'string', minLength: 1 },
          quantityLots: { type: 'integer', minimum: 1 },
          direction: { type: 'string', enum: orderDirections },
          orderType: { type: 'string', enum: orderTypes },
          price: { type: 'string', minLength: 1 },
          orderRequestId: { type: 'string', minLength: 1 },
        },
        required: ['accountId', 'instrumentId', 'quantityLots', 'direction', 'orderType'],
      },
      ownerOnly: true,
      async execute(
        _toolCallId: string,
        params: Record<string, unknown>,
      ): Promise<ReturnType<typeof createToolResult>> {
        assertTradingEnabled(config);
        const accountId = readStringParamLocal(params, 'accountId', { required: true });
        const instrumentId = readStringParamLocal(params, 'instrumentId', { required: true });
        const quantityLots = readNumberParamLocal(params, 'quantityLots', {
          required: true,
          integer: true,
        });
        if (quantityLots === undefined) {
          throw new ConfigurationError('quantityLots is required.');
        }
        const direction = readEnumParam(params, 'direction', orderDirections, { required: true });
        const orderType = readEnumParam(params, 'orderType', orderTypes, { required: true });
        if (direction === undefined) {
          throw new ConfigurationError('direction is required.');
        }
        if (orderType === undefined) {
          throw new ConfigurationError('orderType is required.');
        }
        const price = readStringParamLocal(params, 'price');
        const orderRequestId = readStringParamLocal(params, 'orderRequestId');

        if (orderType === 'limit' && price === undefined) {
          throw new ConfigurationError('price is required for limit orders.');
        }

        const result = await getClient().postOrder({
          accountId,
          instrumentId,
          quantity: toInt64String(quantityLots),
          direction: ORDER_DIRECTION_BY_NAME[direction],
          orderType: ORDER_TYPE_BY_NAME[orderType],
          orderId: makeClientOrderId(orderRequestId),
          ...(price ? { price: toQuotation(price) } : {}),
        });
        return createToolResult(`Order submitted for ${instrumentId}.`, result);
      },
    });

    api.registerTool({
      name: 'tinkoff_cancel_order',
      label: 'Tinkoff Cancel Order',
      description: 'Cancel an order. Disabled by default unless allowTrading is enabled in plugin config.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          accountId: { type: 'string', minLength: 1 },
          orderId: { type: 'string', minLength: 1 },
        },
        required: ['accountId', 'orderId'],
      },
      ownerOnly: true,
      async execute(
        _toolCallId: string,
        params: Record<string, unknown>,
      ): Promise<ReturnType<typeof createToolResult>> {
        assertTradingEnabled(config);
        const accountId = readStringParamLocal(params, 'accountId', { required: true });
        const orderId = readStringParamLocal(params, 'orderId', { required: true });
        const result = await getClient().cancelOrder({ accountId, orderId });
        return createToolResult(`Cancel requested for ${orderId}.`, result);
      },
    });
  },
};

export default tinkoffInvestPlugin;
