UNLOCK PRO TOOLS — WEBSITE FILES (English version, updated 23 Oct 2026)

This whole website is plain HTML/CSS/JS files — it is not locked to any platform.
It runs anywhere: GitHub Pages, Hostinger, GoHighLevel, Netlify and more.
Just upload this complete folder as-is.

WHAT IS INSIDE
- index.html — home page (141 products, 13 categories, payment/delivery/support section, FAQ)
- products/ — a separate SEO page for every product (141 pages). Every product page first
  shows the other packages of the SAME tool ("More [tool] packages" — for example all other
  CapCut durations and plans), then "More packages in this category".
- assets/style.css, assets/app.js — design, plus the currency/search/live-rates code
- images/products/ — logos for 76 tools. 74 carry real brand logos (Simple Icons library,
  official site icons and Wikimedia). Only two keep designed monogram logos: the BatmanStore
  bundle (a bundle of many tools, no single brand) and Muse AI (a token service with no
  clear official logo). When a real logo file arrives for them, drop it into logos-real/
  with the same name and rebuild — the site picks it up itself.
- products-data.json — all product data in one file, including each package's base cost
- sitemap.xml + robots.txt — for Google

LAYOUT NOTE
The header and the toolbar (search + currency) are wrapped together in one sticky
block (.topwrap), so the search box always stays visible under the header while
scrolling. (Fix added 23 Oct 2026 — before this, the toolbar slid behind the header.)

HOW PRICES WORK (live rates — 23 Oct 2026)
Backend base value of every package = its original COST in PKR (costPkr in
products-data.json). The website renders the final PKR price as cost x 1.25 (the 25%
profit). USD and USDT prices are calculated from that final PKR price with two separate
live rates: USD = PKR / USD-rate, USDT = PKR / USDT-rate.
The rates live in the Google Sheet "Unlock Pro Tools — Live Rates" (USD from Google
Finance; USDT from a crypto feed refreshed hourly by the bridge script) and reach the
site through an Apps Script web app. In the sheet, FINAL rate = market rate + MARGIN.
Only the yellow margin cells (C2, C3) should ever be edited by hand.
If the feed is unreachable, built-in backup rates apply (USD 280, USDT 280) and the
site keeps working. The WhatsApp message always carries the exact price on screen.

SOCIAL LINKS
WhatsApp Channel (live): https://whatsapp.com/channel/0029VbCinLy7YSd59nLvZe2k
It appears in the "Never Miss a Price Drop" strip (home + every product page), in the FAQ
and in the footer "Follow Us" row. Facebook, Instagram, TikTok and Medium sit in the
footer as placeholders — to activate one, add its link in SOCIAL_LINKS in build_site.py
and rebuild.

SITE INFORMATION (given by Daniyal, 22 Oct 2026)
Payment Methods: Easypaisa, JazzCash, SadaPay, PayPal
Delivery: 24/7 Available
Support: 24/7 Online

AFTER THE DOMAIN IS DECIDED
1. In build_site.py set DEMO=False and put the real domain in LIVE_BASE, then rebuild.
   (Demo stage keeps noindex + robots Disallow so the temporary github.io site
   does not compete with the real domain later.)
2. Submit the sitemap in Google Search Console.

WHATSAPP ORDERING
Every Order button goes to +92 321 4378770 with a ready message containing the product,
package, duration and the price in the currency the customer selected (PKR/USD/USDT),
calculated at the moment of the click.
