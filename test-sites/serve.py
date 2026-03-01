"""
Test Sites Server
-----------------
Bütün 3 test saytını eyni anda fərqli portlarda başladır.

  Site 1 - TechStore   (Electronics) → http://test-sites:8081  (host: localhost:8081)
  Site 2 - FashionHub  (Clothing)    → http://test-sites:8082  (host: localhost:8082)
  Site 3 - HomeDecor   (Furniture)   → http://test-sites:8083  (host: localhost:8083)

Docker içindən sitemap əlavə edərkən:
  http://test-sites:8081/sitemap.xml
  http://test-sites:8082/sitemap.xml
  http://test-sites:8083/sitemap.xml

Dayandırmaq üçün: Ctrl+C
"""

import http.server
import threading
import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

SITES = [
    {"name": "TechStore   (Electronics)", "dir": "site1", "port": 8081},
    {"name": "FashionHub  (Clothing)   ", "dir": "site2", "port": 8082},
    {"name": "HomeDecor   (Furniture)  ", "dir": "site3", "port": 8083},
]


def make_handler(directory: str):
    """Hər server üçün ayrı handler — os.chdir() istifadə etmir (thread-safe)."""
    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=directory, **kwargs)

        def log_message(self, _fmt, *_args):
            port = self.server.server_address[1]
            print(f"  [{port}] {self.requestline}")

    return Handler


def start_server(site: dict):
    directory = os.path.join(BASE_DIR, site["dir"])
    handler = make_handler(directory)
    # 0.0.0.0 → Docker konteyner içindən də əlçatan olsun
    server = http.server.HTTPServer(("0.0.0.0", site["port"]), handler)
    server.serve_forever()


def main():
    print("\n" + "=" * 62)
    print("  🚀  Test Sites Server")
    print("=" * 62)

    threads = []
    for site in SITES:
        t = threading.Thread(target=start_server, args=(site,), daemon=True)
        t.start()
        threads.append(t)
        print(f"  ✅  {site['name']}  →  :{site['port']}")

    print()
    print("  Docker worker-dən istifadə et:")
    for site in SITES:
        print(f"    http://test-sites:{site['port']}/sitemap.xml")
    print()
    print("  Dayandırmaq üçün  Ctrl+C")
    print("=" * 62 + "\n")

    try:
        while True:
            threading.Event().wait(timeout=1)
    except KeyboardInterrupt:
        print("\n  ⛔  Serverlər dayandırıldı.\n")
        sys.exit(0)


if __name__ == "__main__":
    main()

