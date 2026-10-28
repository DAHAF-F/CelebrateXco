# CelebrateXco. Website

Online store for CelebrateXco. (Lahore). Plain HTML, CSS and JavaScript, hosted on Vercel. Every page has its own URL (for example `/flower-bouquets/rose`) and is pre-rendered so Google can index it.

## Files

| File | Purpose |
|---|---|
| `catalog.json` | **All products, sizes and prices.** Edit this to change the shop. |
| `script.js` | Shop settings (top of file), pages, cart, checkout |
| `style.css` | Styles (light theme, mobile and desktop) |
| `src/template.html` | Page shell used to build every page |
| `build.py` | Generates all pages and `sitemap.xml` from the template and catalog |
| `index.html` and one folder per page | **Generated.** Do not edit by hand. |
| `Images/` | Logo, product photos and the share image |
| `404.html`, `robots.txt`, `sitemap.xml`, `vercel.json`, `site.webmanifest` | Hosting, SEO and app files |

## Change the shop

- **Contact details, hours, lead time, bank details:** the `SHOP` block at the top of `script.js`. Leave `maps` or `bank` empty to hide them.
- **Products and prices:** `catalog.json`. Each product has sizes with prices. Add `"img": "Images/your-photo.webp"` to a product to show its photo.
- **Colors:** variables at the top of `style.css`.

## Rebuild after any change

Run this after editing `catalog.json`, `script.js`, `style.css` or `src/template.html`, then commit everything:

```
pip install playwright
playwright install chromium
python build.py
```

## Deploy

Upload the whole folder to GitHub. Vercel redeploys on every commit. Keep the folder name `Images` exactly (capital I). Delete any stray file named `Images/a`.

## How ordering works

1. The customer adds items (optionally with a card message per item). The cart is saved in their browser.
2. Checkout collects name, phone, delivery or pickup, date and time (Lahore time) and payment method.
3. The order opens as a prefilled WhatsApp message with a product code on every line.
4. The shop confirms the final total on WhatsApp before taking payment. Delivery is by inDrive, fare not included.

Prices in the message can be edited by the customer, so always check them against `catalog.json` before taking payment.

## Before going live

1. Replace the sample products, prices and policy text.
2. Add Google Maps link in `SHOP.maps`.
3. Check opening hours in `SHOP` (`openHour`, `closeHour`).
4. Set up Google Search Console and submit `sitemap.xml`.
5. If you add a custom domain, replace `celebratexco.vercel.app` in `script.js`, `build.py` and `src/template.html`, then rebuild.
