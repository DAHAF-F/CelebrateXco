# CelebrateXco. Website

Online store for CelebrateXco. (Lahore). Plain HTML, CSS and JavaScript. No build step, no dependencies.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page shell, header, footer, cart and checkout form |
| `style.css` | All styles (light theme, mobile and desktop) |
| `script.js` | Pages, products, cart and WhatsApp checkout |
| `Images/` | Logo and photos (WebP) |
| `404.html` | Error page for the host |
| `robots.txt`, `sitemap.xml` | Search engine files |

## Run locally

Open `index.html` in a browser.

## Edit

Everything below is in `script.js`.

- **Contact details:** constants at the top (`WA`, `ADDR`, `IG`, `FB`, `MAP`, `BANK`). `WA` is the WhatsApp number in international format without `+` or `0` (example: `923710444303`). Leave `IG`, `FB` and `MAP` as `"#"` to hide them.
- **Products and prices:** the `C` list holds each category with its description, product names and base price. `T` (sizes) and `L` (cake weights) set the size names and price multipliers.
- **Photos:** the `IM` list points to files in `Images/`. Only Flower Bouquets use photos right now. Other categories show emoji until you add images.
- **Delivery lead time:** the 4-hour rule is in the checkout code (`4*36e5`).
- **Pages:** About, Our Story, Delivery, Contact and the policy pages are the `V` object in `script.js`.
- **Colors:** variables at the top of `style.css`.

## How ordering works

1. Customer adds items to the cart (saved in their browser).
2. Checkout collects name, phone, delivery or pickup, date and time, optional card message and payment method.
3. The order opens as a prefilled WhatsApp message to your number.
4. Customer sends the payment screenshot. Delivery is by inDrive, fare not included.

## Deploy

Upload the whole folder to any static host (Vercel, Netlify, GitHub Pages). Then:

1. If you add a custom domain, replace `celebratexco.vercel.app` in `index.html`, `sitemap.xml` and `robots.txt`.
2. Replace the sample products, prices and policy text.
3. Add Instagram, Facebook and Maps links.
4. Add your JazzCash or Easypaisa number.
5. Test one full order on your phone.
6. Submit the sitemap in Google Search Console.

## Known limits

- Pages use `#` links, so categories and products are not separate URLs for search engines.
- Your bank details are visible in the page source.
