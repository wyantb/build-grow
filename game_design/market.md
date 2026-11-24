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
  merchant settles their buy order and their sell order.

## Orders and Merchant Capacity

- **Each merchant carries one buy order and one sell order.** An order names a
  resource and a per-tick quantity. The quantity does not consume extra
  slots: one merchant can carry a standing order for 10 wood per tick, and
  the merchant count does not change.
- **The number of buy orders in use cannot exceed the merchant count**, and
  the same holds for sell orders. With 2 merchants you may hold at most 2
  buy orders and 2 sell orders, spread across any resources.
- **Opening an order needs a free slot; raising its quantity does not.**
  With one merchant, a single "buy 3 wood" order uses that merchant's only
  slot. Adding "buy 2 stone" needs a second merchant, but raising the wood
  order to 5 wood needs none.
- **Setting a quantity to zero releases the order** and frees its slot.
- **Removing a merchant removes its orders.** The rule is applied in this
  order:
  1. Remove the **sale** order of the bottom-most resource that holds one.
  2. If there are no sale orders left to remove, remove the **buy** order of
     the bottom-most resource that holds one.
- **"Bottom-most"** means the last resource in `MARKET_RESOURCES` order
  (currently: wood, stone, food — so food is the bottom-most).
- **Removing workers from the Merchant job trims the orders immediately**,
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
| Actions | The buy and sell allocation controls |

- There is **no trend column**, no "your amount" column, and no gold row.
- The Actions column holds the allocation controls for that resource: a buy
  order and a sell order, each shown as the per-tick quantity with buttons
  to raise and lower it. These are allocation controls, not one-off trades:
  the quantity keeps being traded every tick until it is changed.

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