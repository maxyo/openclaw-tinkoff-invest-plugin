import type { components, paths } from './generated/openapi.js';

export type TinkoffPaths = paths;
export type TinkoffComponents = components;
export type RpcStatus = components['schemas']['rpcStatus'];
export type Quotation = components['schemas']['v1Quotation'];
export type CandleIntervalApi = components['schemas']['v1CandleInterval'];
export type InstrumentIdTypeApi = components['schemas']['v1InstrumentIdType'];
export type InstrumentTypeApi = components['schemas']['v1InstrumentType'];
export type OperationStateApi = components['schemas']['v1OperationState'];
export type OrderDirectionApi = components['schemas']['v1OrderDirection'];
export type OrderTypeApi = components['schemas']['v1OrderType'];
export type PortfolioCurrencyApi = components['schemas']['PortfolioRequestCurrencyRequest'];

export type PostPath = {
  [K in keyof paths]: paths[K] extends { post: unknown } ? K : never;
}[keyof paths];

export type RequestBodyOf<Path extends PostPath> =
  paths[Path]['post'] extends {
    requestBody: { content: { 'application/json': infer Body } };
  }
    ? Body
    : never;

export type SuccessResponseOf<Path extends PostPath> =
  paths[Path]['post'] extends {
    responses: { 200: { content: { 'application/json': infer Response } } };
  }
    ? Response
    : never;

export const CANDLE_INTERVAL_BY_NAME = {
  '1min': 'CANDLE_INTERVAL_1_MIN',
  '2min': 'CANDLE_INTERVAL_2_MIN',
  '3min': 'CANDLE_INTERVAL_3_MIN',
  '5min': 'CANDLE_INTERVAL_5_MIN',
  '10min': 'CANDLE_INTERVAL_10_MIN',
  '15min': 'CANDLE_INTERVAL_15_MIN',
  '30min': 'CANDLE_INTERVAL_30_MIN',
  '1hour': 'CANDLE_INTERVAL_HOUR',
  '2hour': 'CANDLE_INTERVAL_2_HOUR',
  '4hour': 'CANDLE_INTERVAL_4_HOUR',
  day: 'CANDLE_INTERVAL_DAY',
  week: 'CANDLE_INTERVAL_WEEK',
  month: 'CANDLE_INTERVAL_MONTH',
} as const satisfies Record<string, CandleIntervalApi>;

export const INSTRUMENT_ID_TYPE_BY_NAME = {
  figi: 'INSTRUMENT_ID_TYPE_FIGI',
  ticker: 'INSTRUMENT_ID_TYPE_TICKER',
  uid: 'INSTRUMENT_ID_TYPE_UID',
  positionUid: 'INSTRUMENT_ID_TYPE_POSITION_UID',
} as const satisfies Record<string, InstrumentIdTypeApi>;

export const INSTRUMENT_KIND_BY_NAME = {
  bond: 'INSTRUMENT_TYPE_BOND',
  share: 'INSTRUMENT_TYPE_SHARE',
  currency: 'INSTRUMENT_TYPE_CURRENCY',
  etf: 'INSTRUMENT_TYPE_ETF',
  futures: 'INSTRUMENT_TYPE_FUTURES',
  option: 'INSTRUMENT_TYPE_OPTION',
  structuredProduct: 'INSTRUMENT_TYPE_SP',
  clearingCertificate: 'INSTRUMENT_TYPE_CLEARING_CERTIFICATE',
} as const satisfies Record<string, InstrumentTypeApi>;

export const OPERATION_STATE_BY_NAME = {
  executed: 'OPERATION_STATE_EXECUTED',
  canceled: 'OPERATION_STATE_CANCELED',
  progress: 'OPERATION_STATE_PROGRESS',
} as const satisfies Record<string, OperationStateApi>;

export const ORDER_DIRECTION_BY_NAME = {
  buy: 'ORDER_DIRECTION_BUY',
  sell: 'ORDER_DIRECTION_SELL',
} as const satisfies Record<string, OrderDirectionApi>;

export const ORDER_TYPE_BY_NAME = {
  limit: 'ORDER_TYPE_LIMIT',
  market: 'ORDER_TYPE_MARKET',
  bestprice: 'ORDER_TYPE_BESTPRICE',
} as const satisfies Record<string, OrderTypeApi>;

export const PORTFOLIO_CURRENCIES = ['RUB', 'USD', 'EUR'] as const satisfies readonly PortfolioCurrencyApi[];

export type CandleIntervalName = keyof typeof CANDLE_INTERVAL_BY_NAME;
export type InstrumentIdTypeName = keyof typeof INSTRUMENT_ID_TYPE_BY_NAME;
export type InstrumentKindName = keyof typeof INSTRUMENT_KIND_BY_NAME;
export type OperationStateName = keyof typeof OPERATION_STATE_BY_NAME;
export type OrderDirectionName = keyof typeof ORDER_DIRECTION_BY_NAME;
export type OrderTypeName = keyof typeof ORDER_TYPE_BY_NAME;
