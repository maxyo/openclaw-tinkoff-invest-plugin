---
name: tinkoff-invest-tools
description: "Use for Tinkoff Invest brokerage tasks: checking accounts, portfolio, futures positions, orders, operations, market data, and safe interpretation of Tinkoff tool outputs."
metadata: { "openclaw": { "emoji": "📈" } }
---

# Tinkoff Invest Tools

Use this skill when the user asks about:
- brokerage accounts
- portfolio / positions / operations
- active orders
- market prices, candles, or order book
- Tinkoff futures positions
- placing/canceling orders via the Tinkoff plugin

## Available tool surface

Read-only tools:
- `tinkoff_get_user_info`
- `tinkoff_get_user_tariff`
- `tinkoff_get_accounts`
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

Mutating tools:
- `tinkoff_post_order`
- `tinkoff_cancel_order`

## Default workflow

For position questions, prefer this sequence:
1. `tinkoff_get_positions`
2. `tinkoff_get_portfolio`
3. `tinkoff_get_orders`
4. Optionally `tinkoff_get_last_prices` / `tinkoff_get_order_book`

Why: position interpretation can be wrong if you only look at one endpoint.

## Critical futures rule

For futures, **do not infer live net position from raw `positions.futures.balance` alone**.

Use the normalized fields returned by `tinkoff_get_positions`:
- `normalized.futures[].currentPositionLots`
- `normalized.futures[].blockedByOrdersLots`

Interpretation:
- `currentPositionLots` = live net position
- `blockedByOrdersLots` = lots reserved by active orders
- raw `balance` / `blocked` are API internals and reservation-state fields; by themselves they can make the position look near zero when sell limits are resting against a long position

## Portfolio vs positions

When answering the user:
- Use `tinkoff_get_portfolio` as the source of truth for current futures quantity when available
- Use `tinkoff_get_positions.normalized` for the clean explanation
- Use `tinkoff_get_orders` to explain why part of the position is blocked/reserved

If numbers disagree, say so explicitly and explain which field you trust more.

## Open orders / reserved lots edge cases

This is the main place where agents get confused.

### Core rule
Open orders are **not executed position**.
They are a separate layer of state that can reserve/cover lots.

### What can happen
- user is `long 1300`
- active sell limit orders total `1300`
- raw futures fields may then look like position is near `0` or even a small opposite residual
- this does **not** mean the user is flat or short
- it means the long position is largely or fully covered by resting sell orders

### How to read it correctly
Always separate these concepts:
- `currentPositionLots` = live executed position
- `blockedByOrdersLots` = lots reserved by active orders
- `activeSellLots` / `activeBuyLots` = total resting order size by side
- `orderCoverageVsPosition` = how much of the live position is covered by resting opposite-side orders

### Interpretation examples
- `livePositionLots = +1300`, `activeSellLots = 1300`
  - interpretation: `long 1300, fully covered by sell limits`
- `livePositionLots = +1300`, `activeSellLots = 700`
  - interpretation: `long 1300, partially covered by sell limits`
- `livePositionLots = +1300`, `activeSellLots = 1900`
  - interpretation: `long 1300, sell orders over-cover the position; if all execute, result can flip into short`
- `livePositionLots = 0`, `activeBuyLots = 500`
  - interpretation: `flat now, but there are resting buy orders`

### Forbidden shortcuts
Do **not** do any of these:
- do not call reserved lots the current position
- do not subtract open sell orders from live long position and report the result as actual net executed position
- do not say `position is zero` just because sell limits cover the whole long
- do not say `short` just because raw API `balance` became negative while opposite-side orders are resting

### Required explanation style
When open orders materially affect interpretation, explicitly report both layers:
- live position
- reserved by orders
- what happens if the resting orders fully execute

Good phrasing:
- `Сейчас позиция long 1250. Сверху стоят sell-лимитки на 1300, поэтому объём почти полностью перекрыт, но позиция не нулевая.`
- `Сейчас flat, но стоят buy-лимитки; это ещё не открытая позиция.`

## Safety defaults

- Treat trading actions as high-risk
- Do not place/cancel orders without explicit user intent
- If `allowTrading` is disabled, report that plainly instead of trying workarounds
- For tests, prefer read-only checks first

## Reporting style

Be practical and short.

For futures position reports, prefer output like:
- live position
- blocked by active orders
- active orders summary
- latest price / order book note if relevant

Example:
- `Позиция: 1250 лотов long`
- `В блоке под sell-лимитки: 1300`
- `Активные ордера: sell 700 + sell 600`
- `Вывод: позиция не нулевая; лимитки просто резервируют объём`

## CNYRUBF reminder

For this user context, remember:
- `1` futures contract = `1000 CNY` notional
- always verify current signed position live before giving exposure/risk commentary

## Order placement checklist

Before `tinkoff_post_order`:
1. confirm account id
2. confirm instrument id
3. confirm buy/sell
4. confirm lots
5. confirm market vs limit
6. if limit, confirm price
7. if anything is ambiguous, ask

## Good habits

- When the user says "what is my position?" also check orders
- When the user says "why is the bot seeing the wrong position?" compare `portfolio`, `positions.normalized`, and `orders`
- If Tinkoff API is flaky, say so plainly instead of pretending the data is definitive
