# Tinkoff Invest OpenClaw Plugin

Native OpenClaw plugin that exposes Tinkoff Invest API tools directly inside the agent runtime.

It is designed for practical portfolio/market-data workflows first, with trading actions available behind an explicit config flag.

## Install in OpenClaw

### From npm

After publishing to npm, install the plugin with:

```bash
openclaw plugins install openclaw-plugin-tinkoff-invest --pin
```

### From a local checkout

For local development or before the first npm release:

```bash
npm ci
openclaw plugins install -l /absolute/path/to/tinkoff-invest
```

### After install

1. Restart the OpenClaw Gateway
2. Open the Plugins UI or edit `plugins.entries.tinkoff-invest.config`
3. Fill in at least `token`
4. Keep `allowTrading=false` for the first run

## Features

### Read-only tools
- `tinkoff_get_accounts`
- `tinkoff_get_user_info`
- `tinkoff_get_user_tariff`
- `tinkoff_find_instrument`
- `tinkoff_get_instrument`
- `tinkoff_get_last_prices`
- `tinkoff_get_candles`
- `tinkoff_get_order_book`
- `tinkoff_get_portfolio`
- `tinkoff_get_positions`
- `tinkoff_get_operations`
- `tinkoff_get_orders`
- `tinkoff_get_order_state`

### Mutating tools
Disabled by default:
- `tinkoff_post_order`
- `tinkoff_cancel_order`

## Safety defaults

- All tools are `ownerOnly`
- Trading is disabled unless `allowTrading=true`
- Missing token does not crash plugin startup; tools fail with a clear config error instead
- Limit orders require `price`
- Client order IDs are generated automatically when omitted

## Configuration

Configure the plugin from the OpenClaw plugin UI.

| Field | Purpose | Default |
|---|---|---|
| `token` | Tinkoff Invest API token | none |
| `baseUrl` | REST base URL | `https://invest-public-api.tinkoff.ru/rest` |
| `timeoutMs` | Per-request timeout in ms | `10000` |
| `allowTrading` | Enables order placement/cancel tools | `false` |
| `appName` | User-Agent / client name sent upstream | `openclaw-plugin-tinkoff-invest/0.1.0` |

## Recommended first run

1. Keep `allowTrading=false`
2. Use either sandbox or a read-only production token
3. Smoke test:
   - `tinkoff_get_accounts`
   - `tinkoff_find_instrument`
   - `tinkoff_get_portfolio`

## Development

### Generate OpenAPI types

```bash
npm run generate:types
```

This command downloads the latest Tinkoff Invest OpenAPI YAML into a local gitignored `specs/` directory before regenerating `src/generated/openapi.d.ts`.

If you need a different source, override it with `TINKOFF_INVEST_OPENAPI_SPEC_URL`.

### Typecheck

```bash
npm run typecheck
```

### Tests

```bash
npm test
```

## Repository hygiene before publishing

This repository is prepared for public GitHub release:
- no hardcoded API token
- no local account IDs in source
- explicit MIT license
- OpenAPI YAML is downloaded during type generation and is not committed
- automated unit tests run in local verification and in GitHub Actions
- generated OpenAPI types committed
- npm publishing is automated through GitHub Actions with `NPM_TOKEN`

## Notes

- This plugin targets the REST API surface only
- Network issues from the upstream broker API are surfaced as clear tool errors
- If you later want stop-orders / trading-status / margin helpers, they can be added on the same client pattern
