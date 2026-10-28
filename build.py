"""Pre-renders every page of the shop to static HTML so Google can index each URL.

Run after you change catalog.json, script.js or src/template.html:
    pip install playwright && playwright install chromium
    python build.py
It rewrites index.html, one folder per page (for example flower-bouquets/rose/index.html)
and sitemap.xml. Commit all generated files.
"""
import datetime, functools, http.server, json, os, threading
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = "https://celebratexco.vercel.app"
cats = json.load(open(os.path.join(ROOT, "catalog.json"), encoding="utf-8"))["cats"]
PAGES = ["shop", "about", "our-story", "delivery", "contact", "privacy", "terms", "shipping-and-returns"]
routes = [""] + PAGES + [c["slug"] for c in cats] + [f'{c["slug"]}/{p["slug"]}' for c in cats for p in c["products"]]


class Handler(http.server.SimpleHTTPRequestHandler):
    """Serves files normally and the page template for any URL without a file extension."""
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def do_GET(self):
        if "." not in self.path.split("?")[0].rsplit("/", 1)[-1]:
            self.path = "/src/template.html"
        super().do_GET()

    def log_message(self, *a):
        pass


server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
base = f"http://127.0.0.1:{server.server_address[1]}"

with sync_playwright() as p:
    page = p.chromium.launch().new_page()
    for route in routes:
        page.goto(f"{base}/{route}")
        page.wait_for_selector("main h1")
        out = os.path.join(ROOT, route, "index.html")
        os.makedirs(os.path.dirname(out), exist_ok=True)
        open(out, "w", encoding="utf-8").write(page.content())
        print("built", "/" + route)

today = datetime.date.today().isoformat()
urls = "".join(f"  <url><loc>{SITE}/{r}</loc><lastmod>{today}</lastmod></url>\n" for r in routes)
open(os.path.join(ROOT, "sitemap.xml"), "w").write(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}</urlset>\n')
