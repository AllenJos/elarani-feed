# elarani-feed

The public data feed for the Elarani app: small cardamom e-auction results
from the [Spices Board India daily price table](https://www.indianspices.com/marketing/price/domestic/daily-price-small.html).

The app downloads:

    https://raw.githubusercontent.com/AllenJos/elarani-feed/main/feed.json

`.github/workflows/prices.yml` runs `npm run import-prices` at 18:00 and
21:00 IST, Monday to Saturday, and commits `feed.json` when there are new
auctions. It keeps the last 400 days. Run it by hand from the Actions tab
("Import auction prices" → Run workflow).

`src/types.ts` and `src/validate.ts` are copies of the app's feed schema in
AllenJos/elarani; change both together. News and articles in the feed are
still sample content (`"sample": { "posts": true }`).
