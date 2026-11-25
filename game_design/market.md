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
- **Each merchant carries one buy trade and one sell trade per tick.**
  `TRADES_PER_MERCHANT` in `src/data/market.ts` is the number of trades a
  single merchant offers in each direction. It is 1 today, and it is the
  knob for scaling the number of trades per merchant later.
- **Every unit of an order occupies one trade.** An order names a resource
  and a per-tick quantity, and each unit of that quantity uses a trade. One
  merchant can offer "buy 1 wood per tick", but "buy 2 wood per tick" needs
  two merchants.
- **The total quantity for a direction cannot exceed the capacity the
  merchants provide.** With 2 merchants you may hold at most 2 units of buy
  orders and 2 units of sell orders, spread across any resources.
- **Raising the quantity of an existing order needs a free trade**, exactly
  as opening a new one does. With one merchant, a single "buy 1 wood" order
  uses that merchant's only buy trade. Raising it to 2 wood needs a second
  merchant.
- **Setting a quantity to zero releases the order** and frees its trades.
- **A resource is bought or sold per tick, never both.** Placing an order in
  one direction releases the order for the same resource in the other
  direction. Buying 1 wood while selling 1 wood leaves a single buy order for
  wood; the sale is cancelled. The trade the cancelled order held is freed.
- **Removing a merchant removes its trades.** Sales are trimmed first, then
  buys. Within a direction the trade comes off the bottom-most resource that
  holds one:
    1. Take one trade off the **sale** order of the bottom-most resource that
       holds one. The order is dropped entirely when its last trade goes.
    2. If there are no sale trades left to remove, take one trade off the
       **buy** order of the bottom-most resource that holds one.
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
  traded every tick until it is changed. Raising a quantity consumes a trade,
  so the button is disabled when the merchants do not have enough free
  trades for the whole step.
- The `0` button is disabled when there is nothing to clear.
- Because a resource is bought or sold, never both, raising the buy count
  cancels the sell count for that resource and the other way round.

## Rates

Market flows are included in the resource rates shown in the resources
panel. The rate for a resource is the net per-tick change from production,
consumption, and the market orders, multiplied by the tick frequency (5).

This keeps the displayed rate honest: if a merchant sells 1 wood per tick,
the wood rate drops and the gold rate rises by the same amounts.

## Catalog

See `src/data/market.ts`.

| Resource | Base Factor | Buy Price | Sale Price |
|----------|-------------|-----------|------------|
| Wood | 0.5 | 0.75 | 0.375 |
| Stone | 0.75 | 1.125 | 0.5625 |
| Food | 0.4 | 0.6 | 0.3 |
</content>