"""Pre-renders every page of the shop to static HTML so Google can index each URL.

Run after you change catalog.json, script.js, style.css or src/template.html:
    pip install playwright && playwright install chromium
    python build.py
It rewrites index.html, 404.html, one folder per page (for example flower-bouquets/rose/index.html)
and sitemap.xml, and deletes generated pages that no longer exist. Commit all changes.
"""
import datetime, hashlib, http.server, json, os, threading
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = "https://celebratexco.vercel.app"
KEEP = {"Images", "src", "node_modules", "__pycache__"}
cats = json.load(open(os.path.join(ROOT, "catalog.json"), encoding="utf-8"))["cats"]
STATE = os.path.join(ROOT, "src", "lastmod.json")
state = json.load(open(STATE)) if os.path.exists(STATE) else {}
today = datetime.date.today().isoformat()


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


def remove_stale(want):
    for dp, dn, fn in os.walk(ROOT):
        rel = os.path.relpath(dp, ROOT).replace(os.sep, "/")
        if rel == ".":
            dn[:] = [d for d in dn if d not in KEEP and not d.startswith(".")]
        elif "index.html" in fn and rel not in want:
            os.remove(os.path.join(dp, "index.html"))
            print("removed stale page /" + rel)
    for dp, dn, fn in os.walk(ROOT, topdown=False):
        rel = os.path.relpath(dp, ROOT)
        if rel != "." and rel.split(os.sep)[0] not in KEEP and not rel.startswith(".") and not os.listdir(dp):
            os.rmdir(dp)
    if os.path.exists(os.path.join(ROOT, "template.html")):   # old copy that should not be public
        os.remove(os.path.join(ROOT, "template.html"))


server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
base = f"http://127.0.0.1:{server.server_address[1]}"

with sync_playwright() as p:
    page = p.chromium.launch().new_page()
    page.goto(base + "/")
    page.wait_for_selector("main h1")
    pages = ["shop"] + page.evaluate("Object.keys(PAGES)")      # page list lives only in script.js
    routes = [""] + pages + [c["slug"] for c in cats] + [f'{c["slug"]}/{q["slug"]}' for c in cats for q in c["products"]]
    remove_stale(set(routes))
    for route in routes:
        page.goto(f"{base}/{route}")
        page.wait_for_selector("main h1")
        html = page.content()
        out = os.path.join(ROOT, route, "index.html")
        os.makedirs(os.path.dirname(out), exist_ok=True)
        open(out, "w", encoding="utf-8").write(html)
        digest = hashlib.sha1(html.encode()).hexdigest()
        if state.get(route, {}).get("hash") != digest:           # lastmod only changes when the page changes
            state[route] = {"hash": digest, "date": today}
        print("built", "/" + route)
    page.goto(base + "/page-not-found")                          # 404.html uses the same template
    page.wait_for_selector("main h1")
    open(os.path.join(ROOT, "404.html"), "w", encoding="utf-8").write(page.content())

json.dump({r: state[r] for r in routes}, open(STATE, "w"), indent=1)
urls = "".join(f"  <url><loc>{SITE}/{r}</loc><lastmod>{state[r]['date']}</lastmod></url>\n" for r in routes)
open(os.path.join(ROOT, "sitemap.xml"), "w").write(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}</urlset>\n')
