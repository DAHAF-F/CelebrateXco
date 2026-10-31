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
| `404.html`, `robots.txt`, `sitemap.xml`, `vercel.json`, `.vercelignore`, `site.webmanifest` | Hosting, SEO and app files (404.html and sitemap.xml are generated) |

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

## Deploy and update

Work inside your cloned repo so deleted pages are removed too:

```
git pull
# edit catalog.json or script.js, then:
python build.py
git add -A
git commit -m "Update shop"
git push
```

Vercel redeploys on every push. Keep the folder name `Images` exactly (capital I). If an old `template.html` sits in the repo root, delete it (`git rm template.html`); the real template is `src/template.html`.

## How ordering works

1. The customer adds items (optionally with a card message per item). The cart is saved in their browser.
2. Checkout collects name, phone, delivery or pickup, date and time (Lahore time) and payment method.
3. The order opens as a prefilled WhatsApp message with a product code on every line.
4. The shop confirms the final total on WhatsApp before taking payment. Delivery is by inDrive, fare not included.

**Staff rule:** customers can edit a WhatsApp message, so check every product code and price against `catalog.json` and confirm the final total before taking payment.

## Before going live

1. Replace the sample products, prices and policy text.
2. Add Google Maps link in `SHOP.maps`.
3. Check opening hours in `SHOP` (`openHour`, `closeHour`).
4. Set up Google Search Console and submit `sitemap.xml`.
5. Confirm `openHour` and `closeHour` in `SHOP`. They set the order window and the opening hours shown to Google.
6. Place one real order from inside the Instagram app and one from the Facebook app. In-app browsers can behave differently.
7. If you add a custom domain, replace `celebratexco.vercel.app` in `script.js`, `build.py` and `src/template.html`, then rebuild.
