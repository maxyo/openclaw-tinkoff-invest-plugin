import createClient from 'openapi-fetch';

import type { TinkoffPluginConfig } from './config.js';
import { UpstreamApiError } from './errors.js';
import type {
  PostPath,
  RequestBodyOf,
  RpcStatus,
  SuccessResponseOf,
  TinkoffPaths,
} from './openapi.js';

const PATHS = {
  getAccounts: '/tinkoff.public.invest.api.contract.v1.UsersService/GetAccounts',
  getInfo: '/tinkoff.public.invest.api.contract.v1.UsersService/GetInfo',
  getUserTariff: '/tinkoff.public.invest.api.contract.v1.UsersService/GetUserTariff',
  findInstrument: '/tinkoff.public.invest.api.contract.v1.InstrumentsService/FindInstrument',
  getInstrumentBy: '/tinkoff.public.invest.api.contract.v1.InstrumentsService/GetInstrumentBy',
  getLastPrices: '/tinkoff.public.invest.api.contract.v1.MarketDataService/GetLastPrices',
  getCandles: '/tinkoff.public.invest.api.contract.v1.MarketDataService/GetCandles',
  getOrderBook: '/tinkoff.public.invest.api.contract.v1.MarketDataService/GetOrderBook',
  getPortfolio: '/tinkoff.public.invest.api.contract.v1.OperationsService/GetPortfolio',
  getPositions: '/tinkoff.public.invest.api.contract.v1.OperationsService/GetPositions',
  getOperations: '/tinkoff.public.invest.api.contract.v1.OperationsService/GetOperations',
  getOrders: '/tinkoff.public.invest.api.contract.v1.OrdersService/GetOrders',
  getOrderState: '/tinkoff.public.invest.api.contract.v1.OrdersService/GetOrderState',
  postOrder: '/tinkoff.public.invest.api.contract.v1.OrdersService/PostOrder',
  cancelOrder: '/tinkoff.public.invest.api.contract.v1.OrdersService/CancelOrder',
} as const satisfies Record<string, PostPath>;

export class TinkoffRestClient {
  private readonly client;
  private readonly config: TinkoffPluginConfig;

  public constructor(config: TinkoffPluginConfig) {
    this.config = config;
    this.client = createClient<TinkoffPaths>({
      baseUrl: config.baseUrl,
      fetch: async (...args: Parameters<typeof fetch>): Promise<Response> => {
        const [input, init] = args;
        const controller = new AbortController();
        const timeout = setTimeout((): void => {
          controller.abort();
        }, this.config.timeoutMs);
        const headers = new Headers(init?.headers);

        headers.set('authorization', `Bearer ${this.config.token}`);
        headers.set('accept', 'application/json');
        headers.set('content-type', 'application/json');
        headers.set('user-agent', this.config.appName);

        try {
          return await fetch(input, {
            ...init,
            headers,
            signal: controller.signal,
          });
        } catch (error) {
          throw new UpstreamApiError('Failed to reach Tinkoff Invest API.', {
            details: error,
          });
        } finally {
          clearTimeout(timeout);
        }
      },
    });
  }

  public async post<Path extends PostPath>(
    path: Path,
    body: RequestBodyOf<Path>,
  ): Promise<SuccessResponseOf<Path>> {
    const { data, error, response } = await this.client.POST(path, { body } as never);

    if (error !== undefined) {
      throw this.toUpstreamError(path, error, response.status);
    }

    const responseData = data as SuccessResponseOf<Path> | null | undefined;

    if (responseData == null) {
      throw new UpstreamApiError(`Tinkoff Invest API returned an empty response for ${path}.`, {
        statusCode: response.status,
      });
    }

    return responseData;
  }

  public async getAccounts(): Promise<SuccessResponseOf<(typeof PATHS)['getAccounts']>> {
    return this.post(PATHS.getAccounts, {});
  }

  public async getInfo(): Promise<SuccessResponseOf<(typeof PATHS)['getInfo']>> {
    return this.post(PATHS.getInfo, {});
  }

  public async getUserTariff(): Promise<SuccessResponseOf<(typeof PATHS)['getUserTariff']>> {
    return this.post(PATHS.getUserTariff, {});
  }

  public async findInstrument(
    body: RequestBodyOf<(typeof PATHS)['findInstrument']>,
  ): Promise<SuccessResponseOf<(typeof PATHS)['findInstrument']>> {
    return this.post(PATHS.findInstrument, body);
  }

  public async getInstrumentBy(
    body: RequestBodyOf<(typeof PATHS)['getInstrumentBy']>,
  ): Promise<SuccessResponseOf<(typeof PATHS)['getInstrumentBy']>> {
    return this.post(PATHS.getInstrumentBy, body);
  }

  public async getLastPrices(
    body: RequestBodyOf<(typeof PATHS)['getLastPrices']>,
  ): Promise<SuccessResponseOf<(typeof PATHS)['getLastPrices']>> {
    return this.post(PATHS.getLastPrices, body);
  }

  public async getCandles(
    body: RequestBodyOf<(typeof PATHS)['getCandles']>,
  ): Promise<SuccessResponseOf<(typeof PATHS)['getCandles']>> {
    return this.post(PATHS.getCandles, body);
  }

  public async getOrderBook(
    body: RequestBodyOf<(typeof PATHS)['getOrderBook']>,
  ): Promise<SuccessResponseOf<(typeof PATHS)['getOrderBook']>> {
    return this.post(PATHS.getOrderBook, body);
  }

  public async getPortfolio(
    body: RequestBodyOf<(typeof PATHS)['getPortfolio']>,
  ): Promise<SuccessResponseOf<(typeof PATHS)['getPortfolio']>> {
    return this.post(PATHS.getPortfolio, body);
  }

  public async getPositions(
    body: RequestBodyOf<(typeof PATHS)['getPositions']>,
  ): Promise<SuccessResponseOf<(typeof PATHS)['getPositions']>> {
    return this.post(PATHS.getPositions, body);
  }

  public async getOperations(
    body: RequestBodyOf<(typeof PATHS)['getOperations']>,
  ): Promise<SuccessResponseOf<(typeof PATHS)['getOperations']>> {
    return this.post(PATHS.getOperations, body);
  }

  public async getOrders(
    body: RequestBodyOf<(typeof PATHS)['getOrders']>,
  ): Promise<SuccessResponseOf<(typeof PATHS)['getOrders']>> {
    return this.post(PATHS.getOrders, body);
  }

  public async getOrderState(
    body: RequestBodyOf<(typeof PATHS)['getOrderState']>,
  ): Promise<SuccessResponseOf<(typeof PATHS)['getOrderState']>> {
    return this.post(PATHS.getOrderState, body);
  }

  public async postOrder(
    body: RequestBodyOf<(typeof PATHS)['postOrder']>,
  ): Promise<SuccessResponseOf<(typeof PATHS)['postOrder']>> {
    return this.post(PATHS.postOrder, body);
  }

  public async cancelOrder(
    body: RequestBodyOf<(typeof PATHS)['cancelOrder']>,
  ): Promise<SuccessResponseOf<(typeof PATHS)['cancelOrder']>> {
    return this.post(PATHS.cancelOrder, body);
  }

  private toUpstreamError(path: string, error: unknown, statusCode: number): UpstreamApiError {
    const rpcStatus = error as RpcStatus;
    const message = rpcStatus.message ?? `Tinkoff Invest API request failed for ${path}.`;

    return new UpstreamApiError(message, {
      statusCode,
      details: error,
    });
  }
}
