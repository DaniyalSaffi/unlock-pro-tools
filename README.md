# Unlock Pro Tools

An online store for premium tools and subscriptions — 141 packages in 13 categories.
Prices in PKR, USD and USDT. Order in one click on WhatsApp Business.

**Live demo:** https://daniyalsaffi.github.io/unlock-pro-tools/
(Demo stage: the site is hidden from Google search for now — noindex. SEO opens when the real domain is connected.)

## What is in this repo
- `index.html` — home page (all products, categories, search, currency selector, FAQ)
- `products/` — a separate SEO detail page for every product (141 pages). Every page shows the
  other packages of the same tool first ("More [tool] packages"), then more from its category.
- `assets/` — design (style.css) and code (app.js)
- `images/products/` — a logo for every tool (74 of 76 tools carry real brand logos)
- `products-data.json` — all product data in one file, including each package's base cost
- `sitemap.xml`, `robots.txt` — for Google

## How ordering works
When a customer taps **Order on WhatsApp** on any package, they are taken to WhatsApp Business
**+92 321 4378770** with a ready-written message containing the product, package, duration and
the price in the currency they selected — calculated at that moment, so the message always
matches the price on screen.

## How prices work (live rates, added 23 Oct 2026)
- The stored base value of every package is its original **cost in PKR** (`costPkr` in
  products-data.json). The final PKR price = cost × 1.25 (the 25% profit), calculated in the
  visitor's browser.
- USD and USDT prices are calculated from the final PKR price using **two separate live
  rates**: USD = PKR ÷ USD rate, USDT = PKR ÷ USDT rate.
- The rates come from the Google Sheet **"Unlock Pro Tools — Live Rates"**
  (bank USD rate from Google Finance; USDT crypto rate refreshed hourly), served to the site
  by a small Apps Script bridge. The site's toolbar shows "Today's rates" once they load.
- The sheet has two **margin cells** (USD and USDT). Final rate = market rate + margin.
  Margins are currently 0 and can be changed in the sheet at any time — no site rebuild needed.
- If the rates feed is ever unreachable, the site falls back to built-in backup rates
  (1 USD = Rs 280, 1 USDT = Rs 280) and keeps working.

## Layout note
The header and the search/currency toolbar sit inside one sticky wrapper (`.topwrap`), so the
toolbar always stays visible directly under the header while scrolling — it can never slide
behind the header (bug fixed 23 Oct 2026).

## Follow us
- WhatsApp Channel (live): https://whatsapp.com/channel/0029VbCinLy7YSd59nLvZe2k — shown in a
  "Never Miss a Price Drop" strip on the home page and every product page, in the FAQ, and in
  the footer.
- Facebook, Instagram, TikTok, Medium: placeholders in the footer for now. To activate one,
  put its link in `SOCIAL_LINKS` in `build_site.py` and rebuild.

## Payment / Delivery / Support
- Payment: Easypaisa, JazzCash, SadaPay, PayPal
- Delivery: 24/7 Available
- Support: 24/7 Online

## Colours (confirmed)
Navy `#0A2540` + Teal `#0E7C7B` + Gold `#C9A227`, order buttons in WhatsApp green `#25D366`

The site is plain HTML/CSS/JS — it can move to Hostinger or GoHighLevel later as-is,
with no rebuild needed.
