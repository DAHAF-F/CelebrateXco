// CelebrateXco. storefront. Products live in catalog.json. Shop settings are in SHOP below.
const SHOP = {
  whatsapp: "923710444303",                       // international format, no + or leading 0
  phone: "0371-0444303",                          // shown to customers
  address: "Al Saeed Chowk, Phool Mandi, Lahore",
  instagram: "https://www.instagram.com/celebratexco",
  facebook: "https://www.facebook.com/share/1CVRZsS65Q/",
  maps: "",                                       // Google Maps link; empty hides it
  bank: "",                                       // e.g. "Meezan Bank, account name, number"; empty = share on WhatsApp
  leadHours: 4,                                   // hours of notice needed, counted only between openHour and closeHour
  openHour: 9, closeHour: 22,                     // delivery and pickup window, Lahore time (also shown to Google)
  maxDays: 60,                                    // how far ahead customers can order
  tz: "Asia/Karachi", utc: "+05:00", utcHours: 5  // Pakistan has no daylight saving
};
const SITE = "https://celebratexco.vercel.app";
const WA = "https://wa.me/" + SHOP.whatsapp;
const HOME_TITLE = "CelebrateXco. | Make Every Celebration Special";
const HOME_DESC = "CelebrateXco. in Lahore: flower bouquets, snack baskets, money bouquets, birthday decor and custom cakes. Order online and pay by bank transfer, JazzCash or Easypaisa.";
const OG_DEFAULT = SITE + "/Images/og-image.jpg";
const CART_KEY = "cx4";
const HAS_INERT = "inert" in HTMLElement.prototype;

const $ = id => document.getElementById(id);
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const rs = n => "Rs " + n.toLocaleString("en-US");
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const qty = v => Math.min(99, Math.max(1, Math.floor(Number(v)) || 1));
const pad = n => String(n).padStart(2, "0");
const isOpen = () => $("cart").classList.contains("open");
const say = m => { $("live").textContent = m; };                       // announced by screen readers
const fail = m => { $("err").textContent = m; $("err").hidden = false; };

let cats = [], featured = [], variants = new Map(), cart = {}, ready = false, ignorePop = false;
let minP = 0, maxP = 0, curCat = null, filters = { max: 0, sort: "" }, lastFocus = null;

// ---------- cart (saved in the browser, validated on every read) ----------
function loadCart() {                                                  // null means storage is unavailable
  let text;
  try { text = localStorage.getItem(CART_KEY); } catch { return null; }
  let raw;
  try { raw = JSON.parse(text); } catch { return {}; }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out = {};
  for (const [id, line] of Object.entries(raw)) {
    const q = Number(line && line.q);
    if (variants.has(id) && Number.isInteger(q) && q > 0) out[id] = { q: Math.min(q, 99), m: typeof line.m === "string" ? line.m.slice(0, 200) : "" };
  }
  return out;
}
function syncCart() { const s = loadCart(); if (s) cart = s; }          // storage blocked: keep the in-memory cart
function saveCart() { if (!ready) return; try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch {} }
const items = () => Object.entries(cart).filter(([id]) => variants.has(id)).map(([id, line]) => [variants.get(id), line]);
const label = v => `${v.p.name}, ${v.s.label}`;

function chg(id, d) {
  if (!ready || !variants.has(id)) return;                             // catalog not loaded yet
  syncCart();
  const line = cart[id], q = (line ? line.q : 0) + d;
  if (q <= 0) delete cart[id]; else cart[id] = { q: Math.min(q, 99), m: line ? line.m : "" };
  saveCart(); showDone(false); draw();
  say(`Cart updated: ${$("cn").textContent} items, subtotal ${$("tot").textContent}.`);
}
function setMsg(id, m) { syncCart(); if (cart[id]) { cart[id].m = m.slice(0, 200); saveCart(); } }
function draw() {
  const it = items();
  $("cn").textContent = it.reduce((s, [, l]) => s + l.q, 0);
  $("lines").innerHTML = it.length ? it.map(([v, l]) => `<div class="line"><span>${esc(label(v))}</span>
    <button class="ghost" data-act="chg" data-id="${v.id}" data-d="-1" aria-label="Remove one ${esc(label(v))}">-</button><b>${l.q}</b>
    <button class="ghost" data-act="chg" data-id="${v.id}" data-d="1" aria-label="Add one ${esc(label(v))}">+</button><span>${rs(v.price * l.q)}</span>
    <input class="lm" data-msg="${v.id}" maxlength="200" aria-label="Card message for ${esc(label(v))}" placeholder="Card message (optional)" value="${esc(l.m)}"></div>`).join("")
    : "<p>Your cart is empty. Add something from the shop.</p>";
  $("tot").textContent = rs(it.reduce((s, [v, l]) => s + v.price * l.q, 0));
  $("f").hidden = !it.length;
}
function showDone(on) { $("done").hidden = !on; $("cartbody").hidden = on; }
function setCartOpen(open, fromPop) {
  if (open === isOpen()) return;
  if (open) { lastFocus = document.activeElement; syncDates(); clearErr(); }
  $("cart").classList.toggle("open", open);
  document.body.classList.toggle("co", open);
  document.querySelectorAll("header, main, footer, .waw").forEach(e => { e.inert = open; if (!HAS_INERT) e.setAttribute("aria-hidden", String(open)); });
  if (open) {
    history.pushState({ cart: true }, "", location.href);              // so the Back button closes the cart
    setTimeout(() => $("cx").focus(), 60);
  } else {
    if (!$("done").hidden) { cart = {}; saveCart(); draw(); }           // order was sent: empty the cart now
    showDone(false);
    if (!fromPop && history.state && history.state.cart) { ignorePop = true; history.back(); }
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
}
const clearErr = () => { $("err").hidden = true; };

// ---------- Lahore time ----------
const lahoreDate = ms => new Intl.DateTimeFormat("en-CA", { timeZone: SHOP.tz }).format(ms);   // YYYY-MM-DD
function syncDates() {
  $("dt").min = lahoreDate(Date.now());
  $("dt").max = lahoreDate(Date.now() + SHOP.maxDays * 864e5);
}
function earliest(from) {                                               // first moment after leadHours of opening time
  let t = from, left = SHOP.leadHours * 60;
  const open = SHOP.openHour * 60, close = SHOP.closeHour * 60;
  while (left > 0) {
    const l = new Date(t + SHOP.utcHours * 36e5), m = l.getUTCHours() * 60 + l.getUTCMinutes();
    if (m < open) t += (open - m) * 6e4;
    else if (m >= close) t += (1440 - m + open) * 6e4;
    else { const use = Math.min(close - m, left); t += use * 6e4; left -= use; }
  }
  return t;
}
function whenError(date, time) {
  const t = Date.parse(`${date}T${time}:00${SHOP.utc}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time) || isNaN(t)) return "Please choose a valid date and time.";
  const need = earliest(Date.now());
  if (t < need) return `We need ${SHOP.leadHours} hours to prepare (counted between ${SHOP.openHour}:00 and ${SHOP.closeHour}:00, Lahore time). The earliest time is ${new Intl.DateTimeFormat("en-GB", { timeZone: SHOP.tz, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(need)} (Lahore time).`;
  syncDates();
  if (date > $("dt").max) return `Please choose a date within the next ${SHOP.maxDays} days.`;
  const h = Number(time.slice(0, 2)) + Number(time.slice(3)) / 60;
  if (h < SHOP.openHour || h > SHOP.closeHour) return `We deliver and hand over orders between ${SHOP.openHour}:00 and ${SHOP.closeHour}:00 (Lahore time).`;
  return "";
}

// ---------- views ----------
const tile = (img, alt, emoji, eager) => img
  ? `<img src="/${img}" alt="${esc(alt)}" ${eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'} width="400" height="300">`
  : `<span aria-hidden="true">${esc(emoji)}</span>`;
const vhref = v => `/${v.c.slug}/${v.p.slug}?s=${slug(v.s.label)}`;
const vcard = v => `<div class="card"><a class="tile" href="${vhref(v)}" tabindex="-1" aria-hidden="true">${tile(v.p.img || v.c.art, v.p.name + ", " + v.c.name, v.c.emoji)}</a><div><small>${esc(v.c.name)}</small><h3><a class="cc" href="${vhref(v)}">${esc(label(v))}</a></h3><div class="row"><span class="price">${rs(v.price)}</span><button data-act="add" data-id="${v.id}">Add</button></div></div></div>`;
const catcard = c => `<a class="card cc" href="/${c.slug}"><div class="tile">${tile(c.art, c.name, c.emoji)}</div><div><h3>${esc(c.name)}</h3><small>${esc(c.desc)}</small></div></a>`;
const page = (t, body) => `<section class="pg"><h1>${t}</h1>${body}</section>`;
const info = () => `<section><div class="info"><div><h2>Delivery in Lahore</h2><p>We deliver through inDrive. The fare depends on distance and is not included in the price. Pickup from our shop is free.</p></div><div><h2>Order ${SHOP.leadHours} hours ahead</h2><p>We need ${SHOP.leadHours} hours to prepare, counted between ${SHOP.openHour}:00 and ${SHOP.closeHour}:00 Lahore time. Choose your time at checkout.</p></div><div><h2>Pay by transfer</h2><p>Bank transfer, JazzCash or Easypaisa. Send the payment screenshot on WhatsApp to confirm your order.</p></div></div></section>`;

function listing(c) {
  return `<section><p class="crumb"><a href="/shop">Shop</a>${c ? " / " + esc(c.name) : ""}</p><h1>${c ? `<span aria-hidden="true">${esc(c.emoji)}</span> ${esc(c.name)}` : "Shop"}</h1><div class="lay"><div class="side"><h2 class="sh">Category</h2><div class="cl"><a class="${c ? "" : "on"}" href="/shop">All</a>${cats.map(x => `<a class="${x === c ? "on" : ""}" href="/${x.slug}">${esc(x.name)}</a>`).join("")}</div><h2 class="sh">Price up to <span id="mx"></span></h2><input type="range" data-f="max" aria-label="Maximum price" min="${minP}" max="${maxP}" step="500" value="${maxP}"><h2 class="sh">Sort</h2><select data-f="sort" aria-label="Sort products"><option value="">Default</option><option value="a">Price, low to high</option><option value="d">Price, high to low</option></select></div><div><p><span id="ct"></span> products. Want something custom? <a href="${WA}">Message us on WhatsApp</a>.</p><div class="grid" id="gr"></div></div></div></section>`;
}
function drawGrid() {
  const list = [...variants.values()].filter(v => (!curCat || v.c === curCat) && v.price <= filters.max);
  if (filters.sort) list.sort((a, b) => filters.sort === "a" ? a.price - b.price : b.price - a.price);
  $("gr").innerHTML = list.map(vcard).join("") || "<p>No products in this price range.</p>";
  $("mx").textContent = rs(filters.max);
  $("ct").textContent = list.length;
}
function product(c, p) {
  const wanted = new URLSearchParams(location.search).get("s");
  const found = p.sizes.findIndex(s => slug(s.label) === wanted);
  const cur = p.sizes[found >= 0 ? found : p.defaultSize];
  const idOf = s => `${c.slug}/${p.slug}-${slug(s.label)}`;
  const more = c.products.filter(x => x !== p).map(x => variants.get(`${c.slug}/${x.slug}-${slug(x.sizes[x.defaultSize].label)}`));
  return `<section><p class="crumb"><a href="/shop">Shop</a> / <a href="/${c.slug}">${esc(c.name)}</a></p><div class="pd"><div class="tile big">${tile(p.img || c.art, p.name + ", " + c.name, c.emoji, true)}</div><div><small>${esc(c.name)}</small><h1>${esc(p.name)}</h1><p class="price" id="pp">${rs(cur.price)}</p><p>${esc(c.desc)} Available in ${esc(p.sizes.map(s => s.label).join(", "))}.</p><h2 class="sh">Size</h2><div class="chips" role="group" aria-label="Size">${p.sizes.map(s => `<button data-act="sz" data-id="${idOf(s)}" aria-pressed="${s === cur}">${esc(s.label)}</button>`).join("")}</div><h2 class="sh">Card message</h2><textarea id="cm" aria-label="Card message" maxlength="200" rows="3" placeholder="Optional message for the card"></textarea><p><input id="qy" class="qty" aria-label="Quantity" type="number" inputmode="numeric" min="1" max="99" step="1" value="1"> <button id="pa" data-act="addpage" data-id="${idOf(cur)}">Add to cart</button></p></div></div><h2 class="sh">You may also like</h2><div class="grid">${more.map(vcard).join("")}</div></section>`;
}
const contact = () => page("Contact", `<p>Message us on WhatsApp at ${SHOP.phone} for orders, custom designs and support.</p><p><a class="btn" href="${WA}">Chat on WhatsApp</a></p><p>Address: ${esc(SHOP.address)}${SHOP.maps ? `<br><a href="${SHOP.maps}">Open in Google Maps</a>` : ""}</p><p>${[["Instagram", SHOP.instagram], ["Facebook", SHOP.facebook]].filter(x => x[1]).map(x => `<a href="${x[1]}">${x[0]}</a>`).join(" and ")}</p>`);
const delivery = () => `<section class="pg"><h1>Delivery and payment</h1></section>${info()}<section class="pg"><details><summary>How much is delivery?</summary><p>Delivery is done through inDrive, so the fare depends on distance. It is paid separately and is not included in product prices.</p></details><details><summary>Do you deliver outside Lahore?</summary><p>Not right now. We deliver in Lahore only.</p></details><details><summary>How soon can I get my order?</summary><p>We need ${SHOP.leadHours} hours to prepare, counted between ${SHOP.openHour}:00 and ${SHOP.closeHour}:00 Lahore time. We deliver and hand over orders in that window.</p></details><details><summary>How do I pay?</summary><p>Bank transfer, JazzCash or Easypaisa. We send our payment details on WhatsApp after you place your order. Send the payment screenshot there to confirm.</p></details><details><summary>Can I add a card message?</summary><p>Yes. Add it on the product page or in the cart for each item.</p></details></section>`;
const PAGES = {
  about: ["About us", "Learn about CelebrateXco., a gift and celebration shop in Lahore.", () => page("About us", `<p>CelebrateXco. is a gift and celebration shop in Lahore. We make flower bouquets and baskets, snack bouquets and baskets, money bouquets, birthday decor and custom cakes.</p><p>Everything for a celebration is in one place, so you can order a gift, a cake and the decor together.</p><a class="btn" href="/shop">Browse the shop</a>`)],
  "our-story": ["Our story", "How CelebrateXco. makes every celebration special with personal gifts, flowers and cakes in Lahore.", () => page("Our story", `<p>We believe a gift should feel personal. Every bouquet, basket and cake can carry your message and your theme.</p><p>Tell us the occasion, the person and your budget, and we will help you pick or design something that fits. That is how we make every celebration special.</p><p><a class="btn" href="${WA}">Plan a custom order</a></p>`)],
  delivery: ["Delivery and payment", "Delivery in Lahore through inDrive, order timing and payment options at CelebrateXco.", delivery],
  contact: ["Contact", "Contact CelebrateXco. in Lahore on WhatsApp, find our address and social pages.", contact],
  privacy: ["Privacy policy", "How CelebrateXco. uses the details you send when you place an order.", () => page("Privacy policy", `<p>When you place an order we collect your name, phone number, delivery address, delivery time and any card message you type. This information is sent to us on WhatsApp so we can prepare and deliver your order.</p><p>We do not create accounts and we do not sell your data. Your cart is saved only in your own browser.</p><p>To ask about or delete your information, message us on WhatsApp at ${SHOP.phone}.</p>`)],
  terms: ["Terms and conditions", "Terms for ordering from CelebrateXco. in Lahore.", () => page("Terms and conditions", `<p>An order is confirmed after we receive your payment screenshot on WhatsApp. We confirm the final total with you on WhatsApp before you pay.</p><p>We need ${SHOP.leadHours} hours to prepare your order, counted between ${SHOP.openHour}:00 and ${SHOP.closeHour}:00 Lahore time. We deliver in Lahore only.</p><p>Product photos are for reference. Flowers, colors and decor can vary with availability.</p><p>Prices are in Pakistani rupees and do not include the inDrive delivery fare.</p>`)],
  "shipping-and-returns": ["Shipping and returns", "Delivery fares, returns and cancellations at CelebrateXco.", () => page("Shipping and returns", `<p>Delivery is by inDrive. The rider fare depends on distance and is paid separately.</p><p>Flowers and cakes are perishable, so we cannot accept returns. If there is a problem with your order, message us on WhatsApp on the day of delivery and we will help.</p><p>Custom orders cannot be cancelled once preparation has started.</p>`)]
};

// ---------- routing (real URLs, e.g. /flower-bouquets/rose) ----------
function resolve(parts) {
  const [a, b] = parts, c = cats.find(x => x.slug === a);
  curCat = null;
  if (!parts.length) {
    const html = `<div class="hero2"><div><h1>Make every celebration <em>special</em></h1><p>Fresh bouquets, snack baskets, cakes and decor. Delivered across Lahore.</p><a class="btn" href="/shop">Shop now</a> <a class="btn ghost" href="${WA}">Order on WhatsApp</a></div><div class="hw"><img class="arch" src="/Images/bouquet.webp" alt="Bouquet of orange, pink and red roses" width="700" height="1244" fetchpriority="high"></div></div><section><h2>Shop by category</h2><div class="grid">${cats.map(catcard).join("")}</div></section><section><a class="ban" href="/flower-bouquets"><div><h2>The Rose Collection</h2><span class="btn">View bouquets</span></div></a></section><section><h2>Signature picks</h2><div class="grid">${featured.map(id => vcard(variants.get(id))).join("")}</div></section>${info()}`;
    return { html, title: HOME_TITLE, desc: HOME_DESC };
  }
  if (parts.length === 1 && a === "shop") return { html: listing(null), title: "Shop gifts, flowers and cakes in Lahore | CelebrateXco.", desc: "Browse all bouquets, baskets, birthday decor and custom cakes from CelebrateXco. in Lahore.", grid: true };
  if (parts.length === 1 && c) { curCat = c; const from = Math.min(...c.products.flatMap(p => p.sizes.map(s => s.price))); return { html: listing(c), title: `${c.name} in Lahore | CelebrateXco.`, desc: `${c.name} in Lahore from ${rs(from)}. ${c.desc} Order online from CelebrateXco.`, grid: true, c }; }
  if (parts.length === 2 && c) {
    const p = c.products.find(x => x.slug === b);
    if (p) return { html: product(c, p), title: `${p.name} ${c.name} in Lahore | CelebrateXco.`, desc: `${p.name} ${c.name.toLowerCase()} in Lahore from ${rs(Math.min(...p.sizes.map(s => s.price)))}. ${c.desc} Order online from CelebrateXco.`, c, p };
  }
  if (parts.length === 1 && has(PAGES, a)) { const [t, d, f] = PAGES[a]; return { html: f(), title: t + " | CelebrateXco.", desc: d }; }
  return { html: page("Page not found", `<p>We could not find that page.</p><a class="btn" href="/">Back to home</a>`), title: "Page not found | CelebrateXco.", desc: "", nf: true };
}
function structured(r, path) {                                         // JSON-LD for Google
  const prices = [...variants.values()].map(v => v.price);
  const graph = [{ "@type": "Florist", name: "CelebrateXco.", url: SITE + "/", image: SITE + "/Images/logo.webp", telephone: "+" + SHOP.whatsapp, priceRange: `${rs(Math.min(...prices))} - ${rs(Math.max(...prices))}`, openingHours: `Mo-Su ${pad(SHOP.openHour)}:00-${pad(SHOP.closeHour)}:00`, areaServed: "Lahore", address: { "@type": "PostalAddress", streetAddress: "Al Saeed Chowk, Phool Mandi", addressLocality: "Lahore", addressCountry: "PK" }, sameAs: [SHOP.instagram, SHOP.facebook].filter(Boolean) }];
  if (r.c) {
    const crumbs = [["Shop", "/shop"], [r.c.name, "/" + r.c.slug]].concat(r.p ? [[r.p.name, path]] : []);
    graph.push({ "@type": "BreadcrumbList", itemListElement: crumbs.map(([name, href], i) => ({ "@type": "ListItem", position: i + 1, name, item: SITE + href })) });
  }
  if (r.p) graph.push({ "@type": "Product", name: `${r.p.name} ${r.c.name}`, description: r.desc, category: r.c.name, image: SITE + `/Images/og/${r.c.slug}.jpg`, brand: { "@type": "Brand", name: "CelebrateXco." }, offers: r.p.sizes.map(s => ({ "@type": "Offer", name: s.label, price: s.price, priceCurrency: "PKR", availability: "https://schema.org/InStock", url: `${SITE}${path}?s=${slug(s.label)}` })) });
  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph });
}
function render(navigated) {
  const parts = location.pathname.split("/").filter(Boolean).map(s => s.toLowerCase());
  const r = resolve(parts), main = $("v");
  const path = location.pathname.replace(/\/+$/, "") || "/";
  filters = { max: maxP, sort: "" };
  const hydrate = !navigated && !location.search && main.dataset.path === path;   // pre-rendered HTML is already right
  if (!hydrate) { main.innerHTML = r.html; if (r.grid) drawGrid(); }
  main.dataset.path = path;
  const og = r.c ? `${SITE}/Images/og/${r.c.slug}.jpg` : OG_DEFAULT, canon = document.querySelector('link[rel="canonical"]');
  document.title = r.title;
  document.querySelector('meta[name="description"]').content = r.desc;
  if (r.nf) canon.removeAttribute("href"); else canon.href = SITE + path;
  for (const [k, v] of [["og:url", SITE + path], ["og:title", r.title], ["og:description", r.desc], ["og:image", og], ["twitter:image", og]]) document.querySelector(`meta[property="${k}"], meta[name="${k}"]`).content = v;
  let rb = document.querySelector('meta[name="robots"]');
  if (r.nf) { if (!rb) { rb = document.createElement("meta"); rb.name = "robots"; document.head.append(rb); } rb.content = "noindex"; } else if (rb) rb.remove();
  $("ld").textContent = structured(r, path);
  externalLinks();
  if (navigated) {
    scrollTo(0, 0);
    const h1 = document.querySelector("main h1");
    if (h1) { h1.tabIndex = -1; h1.focus({ preventScroll: true }); }
  }
}
function fixLegacyHash() {                                             // old links like /#flower-bouquets
  const h = location.hash.slice(1).toLowerCase();
  if (!h || location.pathname !== "/") return;
  const alias = { home: "", story: "our-story", returns: "shipping-and-returns" }, s = has(alias, h) ? alias[h] : h;
  let to = null;
  if (/^p\d+$/.test(h)) to = "/shop";
  else if (s === "") to = "/";
  else if (s === "shop" || has(PAGES, s) || cats.some(c => c.slug === s)) to = "/" + s;
  if (to) history.replaceState(null, "", to);
}
function externalLinks() { document.querySelectorAll('a[href^="http"]').forEach(a => { a.target = "_blank"; a.rel = "noopener"; }); }
function closeMenu() { document.querySelector("nav").classList.remove("open"); $("mb").setAttribute("aria-expanded", "false"); }

// ---------- events ----------
document.addEventListener("click", e => {
  const a = e.target.closest("a[href]");
  if (a && !a.target && e.button === 0 && !(e.metaKey || e.ctrlKey || e.shiftKey)) {
    const u = new URL(a.href, location.href);
    if (u.origin === location.origin && !/\.[a-z0-9]+$/i.test(u.pathname)) {
      e.preventDefault(); closeMenu();
      if (u.pathname + u.search === location.pathname + location.search) { scrollTo(0, 0); return; }   // already here
      history.pushState(null, "", u.pathname + u.search); render(true);
      return;
    }
  }
  const el = e.target.closest("[data-act]");
  if (el) {
    const id = el.dataset.id, act = el.dataset.act;
    if (!ready && ["add", "chg", "sz", "addpage"].includes(act)) return;      // wait for catalog.json
    switch (act) {
      case "add": chg(id, 1); setCartOpen(true); break;
      case "chg": chg(id, Number(el.dataset.d)); break;
      case "open": setCartOpen(true); break;
      case "close": setCartOpen(false); break;
      case "menu": $("mb").setAttribute("aria-expanded", document.querySelector("nav").classList.toggle("open")); break;
      case "sz": {
        const v = variants.get(id);
        $("pp").textContent = rs(v.price); $("pa").dataset.id = id;
        el.parentNode.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", b === el));
        history.replaceState(history.state, "", location.pathname + "?s=" + slug(v.s.label));   // shareable link
        break;
      }
      case "addpage": {
        chg(id, qty($("qy").value));
        const m = $("cm").value.trim();
        if (m) setMsg(id, m);
        draw(); setCartOpen(true); break;
      }
    }
    return;
  }
  if (e.target === document.body) setCartOpen(false);                   // tap on the dimmed backdrop
});
document.addEventListener("input", e => {
  const t = e.target;
  if (t.dataset.msg) setMsg(t.dataset.msg, t.value);
  if (t.dataset.f) { filters[t.dataset.f] = t.dataset.f === "max" ? Number(t.value) : t.value; drawGrid(); }
});
addEventListener("keydown", e => {
  if (e.key === "Escape" && isOpen()) setCartOpen(false);
  if (e.key === "Tab" && isOpen() && !HAS_INERT) {                      // keep focus inside the cart on older browsers
    const f = [...$("cart").querySelectorAll("a[href],button,input,select,textarea")].filter(x => x.offsetParent && !x.disabled);
    if (f.length) {
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  }
});
addEventListener("popstate", () => {
  if (ignorePop) { ignorePop = false; return; }
  if (isOpen()) { setCartOpen(false, true); return; }                   // Back closes the cart first
  if (history.state && history.state.cart) return;
  render(true);
});
addEventListener("pageshow", () => syncMode());                         // restores correct fields after back/forward
addEventListener("hashchange", () => { fixLegacyHash(); render(true); });   // old #links typed into an open tab
addEventListener("storage", e => { if (e.key === CART_KEY && ready) { syncCart(); draw(); } });

// ---------- checkout ----------
const syncMode = () => { const d = $("mode").value === "delivery"; $("ad").hidden = !d; $("ad").required = d; };
const payNote = () => { $("pi").textContent = ($("pay").value === "bank" && SHOP.bank ? SHOP.bank + ". " : "We will send our payment details on WhatsApp after you place your order. ") + "Send the payment screenshot there to confirm."; };
$("mode").addEventListener("change", syncMode);
$("pay").addEventListener("change", payNote);
$("f").addEventListener("submit", e => {
  e.preventDefault(); clearErr();
  const it = items();
  if (!it.length) return fail("Your cart is empty.");
  const d = Object.fromEntries(new FormData(e.target));
  const name = d.name.trim().replace(/\s+/g, " "), addr = (d.addr || "").trim().replace(/\s+/g, " "), digits = d.phone.replace(/\D/g, "");
  if (!name) return fail("Please enter your name.");
  if (digits.length < 10 || digits.length > 13) return fail("Please enter a valid phone number (10 to 13 digits).");
  if (d.mode === "delivery" && !addr) return fail("Please enter the delivery address.");
  const err = whenError(d.date, d.time);
  if (err) return fail(err);
  const lines = it.map(([v, l], i) => `${i + 1}. [${v.c.name}] ${label(v)} (${v.id}) x${l.q}: ${rs(v.price * l.q)}${l.m ? "\n   Card message: " + l.m : ""}`).join("\n");
  const total = rs(it.reduce((s, [v, l]) => s + v.price * l.q, 0));
  const msg = `New order, CelebrateXco.\n\n${lines}\n\nSubtotal: ${total} (delivery fare not included). Please confirm the final total.\n\nName: ${name}\nPhone: ${d.phone.trim()}\n${d.mode === "delivery" ? "Delivery in Lahore: " + addr : "Pickup from shop"}\nWhen: ${d.date} ${d.time} (Lahore time)\nPayment: ${$("pay").selectedOptions[0].textContent}`;
  const url = WA + "?text=" + encodeURIComponent(msg);
  $("wo").href = url;
  showDone(true);                                                       // the cart is emptied when this panel is closed
  if (/Instagram|FBAN|FBAV/i.test(navigator.userAgent)) { location.href = url; return; }   // in-app browsers block new tabs
  const a = document.createElement("a");                                // opens WhatsApp in a new tab without exposing this page
  a.href = url; a.target = "_blank"; a.rel = "noopener"; document.body.append(a); a.click(); a.remove();
});

// ---------- start ----------
fetch("/catalog.json").then(r => r.json()).then(data => {
  cats = data.cats; featured = data.featured;
  for (const c of cats) for (const p of c.products) for (const s of p.sizes) { const id = `${c.slug}/${p.slug}-${slug(s.label)}`; variants.set(id, { id, c, p, s, price: s.price }); }
  const prices = [...variants.values()].map(v => v.price);
  minP = Math.floor(Math.min(...prices) / 500) * 500; maxP = Math.ceil(Math.max(...prices) / 500) * 500;
  ready = true;
  cart = loadCart() || {};
  $("tm").min = pad(SHOP.openHour) + ":00"; $("tm").max = pad(SHOP.closeHour) + ":00";
  $("hint").textContent = `Times are in Lahore time (${SHOP.openHour}:00 to ${SHOP.closeHour}:00).`;
  $("addr").textContent = SHOP.address; $("yr").textContent = new Date().getFullYear();
  for (const [id, url] of [["wl", WA], ["ig", SHOP.instagram], ["fb", SHOP.facebook]]) { $(id).href = url; $(id).hidden = !url; }
  $("wa").href = WA;
  fixLegacyHash();
  syncMode(); payNote(); syncDates(); draw(); render(false);
}).catch(() => { if (!$("v").children.length) $("v").textContent = "Sorry, the shop could not load. Please refresh."; });
