# Market

The market trades resources for gold. It is a **tick-based** system: merchants
carry standing orders and settle them every tick, exactly like production.
There are no bulk buy/sell buttons, no price trends, and no market actions
outside of allocating orders.

## Core Rules

- **The Market tab is hidden until a market is built.** The tab does not
  appear in the tab bar, and the pane is not rendered, until the player has
  completed at least one Market building.
- **Gold is never traded.** Gold is the medium of exchange, not a commodity.
  Gold has no row in the market table and can never appear in a buy or sell
  allocation. It is spent and earned, never bought or sold.
- **Every resource has a base factor.** Each tradable resource has a base
  factor expressed in gold per unit. A resource added to the game in the
  future only needs a base factor to become tradable. See
  `RESOURCE_BASE_FACTORS` in `src/data/market.ts`.
- **Buy price = 1.5 × base factor.** The player pays this to acquire one
  unit from the market.
- **Sale price = 0.75 × base factor.** The player receives this when the
  market takes one unit. The market's spread is deliberately wide: buying
  and selling the same resource always loses gold.
- **Prices never change.** There is no price trend, no supply/demand
  response, and no fluctuation. The buy price of a resource is fixed for
  as long as the market exists.
- **Goods are bought and sold by merchants, per tick.** Each tick, every
  merchant settles their buy trades and their sell trades.

## Orders and Merchant Capacity

- **A merchant is a worker assigned to the Merchant job.** It gives trade
  capacity and does nothing else; the mechanics of what it carries are all
  defined here. See `game_design/jobs.md` for the job itself.
- **A merchant only trades once a market is built.** The merchant count is
  zero and the Market tab is hidden until at least one Market building is
  completed.
- **Each merchant provides one trade position capacity.** `TRADES_PER_MERCHANT`
  in `src/data/market.ts` is the number of trade positions a single merchant
  provides. It is 1 today, and it is the knob for scaling the number of trade
  positions per merchant later.
- **Each caravanserai gives every merchant one more trade position.** The
  total capacity is `merchants × (1 + caravanserai)`. A caravanserai has no
  staff of its own; it makes room for one more trade per merchant. Three
  merchants and three caravanserai therefore carry twelve positions, while
  three merchants on their own carry three. See `game_design/buildings.md`.
- **The caravanserai count only grows.** A caravanserai cannot be sold or
  demolished, so the capacity never shrinks on its own. It does shrink when a
  merchant is removed, because the capacity is computed from the current
  merchant count.
- **Every unit of an order occupies one trade position.** An order names a
  resource and a per-tick quantity, and each unit of that quantity uses a trade
  position. One merchant can support one trade position, so "buy 1 wood per
  tick" uses one merchant's capacity. To have both "buy 1 wood per tick" and
  "sell 1 stone per tick" requires two merchants.
- **A trade position carries half a unit per tick.** The quantity on an order
  counts trade positions, not units, and each position carries
  `UNITS_PER_TRADE_PER_TICK` units, which is 0.5. So one position trades half
  a unit per tick and two positions trade a whole unit. The scale is
  arbitrary; only the ratio between the positions matters.
- **The total quantity across all orders cannot exceed the capacity the
  merchants provide.** With 2 merchants you may hold at most 2 total units
  of orders, spread across any resources and directions. For example, you
  could have "buy 1 wood" and "sell 1 stone" (2 total trades), but not
  "buy 1 wood", "sell 1 stone", and "sell 1 iron" (3 total trades).
- **Raising the quantity of an existing order needs a free trade**, exactly
  as opening a new one does. With one merchant, a single "buy 1 wood" order
  uses that merchant's only buy trade. Raising it to 2 wood needs a second
  merchant.
- **Setting a quantity to zero releases the order** and frees its trades.
- **A resource is bought or sold per tick, never both.** Placing an order in
  one direction releases the order for the same resource in the other
  direction. Buying 1 wood while selling 1 wood leaves a single buy order for
  wood; the sale is cancelled. The trade the cancelled order held is freed.
- **Removing a merchant removes its trade positions.** The capacity is
  `merchants × (1 + caravanserai)`, so each merchant removed takes
  `1 + caravanserai` positions with it. The trade position is taken from the
  bottom-most resource that holds one, regardless of whether it's a buy or
  sell:
    1. Take one trade position off the **bottom-most** resource that holds one.
       The order is dropped entirely when its last trade position goes.
- **"Bottom-most"** means the last resource in `MARKET_RESOURCES` order
  (currently: wood, stone, food — so food is the bottom-most).
- **Removing workers from the Merchant job trims the trades immediately**,
  so the UI never shows orders that no merchant can carry.

## Settlement Order

Within a single tick:

1. **Sales settle first.** The market takes the units and pays gold.
2. **Buys settle second.** The market hands over the units and takes gold.

Sales settling first means a sale can fund a buy in the same tick.

- **A sale is limited by what is actually available.** If the player has
  fewer units of a resource than the sell order calls for, only the
  available units are sold.
- **A buy is limited by the gold available.** A buy order that cannot be
  paid for in full is filled partially with the gold that is left; if there
  is no gold at all, the buy does not settle.
- **The rates reflect what actually settles.** The engine plans the tick's
  trades from the current state and reports the same numbers it then
  applies, so a buy that cannot be paid for never shows up in the rate.

## Market Table Layout

The market table is column-based, in the same style as the resources and
jobs panels:

| Column | Content |
|--------|---------|
| Name | The resource name |
| Current Buy Price | The buy price in gold, e.g. `0.75g` |
| Sell / Buy Count | The sell and buy allocation controls |

Above the table, the UI shows "Trades Maintained: X/Y" where X is the total
number of trade positions currently allocated and Y is the total capacity
from the merchants and the caravanserai.

- There is **no trend column**, no "your amount" column, and no gold row.
- The Sell / Buy Count column holds the allocation controls for that
  resource. Reading left to right, the row shows:

  | Control | Effect |
  |---------|--------|
  | `--` | Increase the sell count by 5 |
  | `-` | Increase the sell count by 1 |
  | sell count | The number of units sold per tick |
  | `0` | Set the buy and the sell count to 0 |
  | buy count | The number of units bought per tick |
  | `+` | Increase the buy count by 1 |
  | `++` | Increase the buy count by 5 |

- These are allocation controls, not one-off trades: the quantity keeps being
  traded every tick until it is changed. Raising a quantity consumes a trade
  position, so the button is disabled when doing so would exceed the total
  merchant capacity.
- The `0` button is disabled when there is nothing to clear.
- Because a resource is bought or sold, never both, raising the buy count
  cancels the sell count for that resource and the other way round.

## Rates

Market flows are included in the resource rates shown in the resources
panel. The rate for a resource is the net per-tick change from production,
consumption, and the market orders, multiplied by the tick frequency (5).

This keeps the displayed rate honest: if a merchant sells 1 wood per tick,
the wood rate drops and the gold rate rises by the same amounts.

The market panel reports the market's own gold rate, per second. It is
`GameEngine.getMarketRates()`, which holds the market's contribution only:
no job production is mixed in, so a job that makes gold later would not
appear in this figure.

- **The panel shows `Gold/s`, not `Gold/tick`.** The rate is multiplied by
  the tick frequency before it is shown, so it reads in the same unit as
  the rates in the resources panel.

## Catalog

See `src/data/market.ts`.

| Resource | Base Factor | Buy Price | Sale Price |
|----------|-------------|-----------|------------|
| Wood | 0.5 | 0.75 | 0.375 |
| Stone | 0.75 | 1.125 | 0.5625 |
| Food | 0.4 | 0.6 | 0.3 |

| Constant | Value | Meaning |
|----------|-------|---------|
| `TRADES_PER_MERCHANT` | 1 | Trade positions a merchant provides |
| `TRADES_PER_CARAVANSERAI` | 1 | Extra positions a caravanserai gives each merchant |
| `UNITS_PER_TRADE_PER_TICK` | 0.5 | Units a single position carries per tick |
</content>