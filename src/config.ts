import { z } from 'zod';

const pluginConfigSchema = z
  .object({
    token: z.string().min(1).optional(),
    baseUrl: z.string().url().optional().default('https://invest-public-api.tinkoff.ru/rest'),
    timeoutMs: z.coerce.number().int().positive().max(120_000).optional().default(10_000),
    allowTrading: z.boolean().optional().default(false),
    appName: z.string().min(1).optional().default('openclaw-plugin-tinkoff-invest/0.1.0'),
  })
  .strict();

export type TinkoffPluginConfig = {
  token?: string | undefined;
  baseUrl: string;
  timeoutMs: number;
  allowTrading: boolean;
  appName: string;
};

export function resolvePluginConfig(raw: Record<string, unknown> | undefined): TinkoffPluginConfig {
  const parsed = pluginConfigSchema.parse(raw ?? {});
  return {
    ...(parsed.token !== undefined ? { token: parsed.token } : {}),
    baseUrl: parsed.baseUrl.replace(/\/$/, ''),
    timeoutMs: parsed.timeoutMs,
    allowTrading: parsed.allowTrading,
    appName: parsed.appName,
  };
}
