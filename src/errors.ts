export class ConfigurationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export class UpstreamApiError extends Error {
  public readonly statusCode: number | undefined;
  public readonly details: unknown;

  public constructor(message: string, options?: { statusCode?: number; details?: unknown }) {
    super(message);
    this.name = 'UpstreamApiError';
    this.statusCode = options?.statusCode;
    this.details = options?.details;
  }
}
