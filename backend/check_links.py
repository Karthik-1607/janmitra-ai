"""Acceptance test: every URL the app can hand to a user must reach a live
official Government of Andhra Pradesh page.

Collects links from the running API (scheme official_website / pdf_source_url,
department websites) plus the hardcoded chat and live-sync sources, then HTTP
verifies each one. Exits non-zero if any link fails or leaves .gov.in / ap.gov.in.
"""

import re
import subprocess
import sys

import requests

API = "http://127.0.0.1:8000/api/v1"

# Hardcoded sources that are not served via /schemes (chat replies, live sync).
EXTRA = [
    "https://annadathasukhibhava.ap.gov.in",
    "https://agriculture.ap.gov.in",
    "https://sspensions.ap.gov.in",
    "https://bm-sgsw.ap.gov.in/BM/",
    "https://civilsupplies.ap.gov.in",
    "https://drntrvaidyaseva.ap.gov.in",
    "https://www.ap.gov.in",
    "https://apsrtconline.in",
    "https://sspensions.ap.gov.in/SSP",
    "https://drntrvaidyaseva.ap.gov.in/",
    "https://annadathasukhibhava.ap.gov.in/",
]

HEAD = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
    ),
    "Accept-Language": "en-IN,en;q=0.9",
}

# Verified official Government of Andhra Pradesh domains, matched as an exact
# host or a sub-domain. An explicit list beats a suffix heuristic: APSRTC's
# official site is apsrtconline.in, which a ".gov.in" rule would wrongly reject.
OFFICIAL_DOMAINS = ("ap.gov.in", "apsrtconline.in")

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"


def collect() -> dict[str, str]:
    """Return url -> where it was used."""
    found: dict[str, str] = {}

    schemes = requests.get(f"{API}/schemes?q=", timeout=30).json()
    items = schemes.get("items", schemes) if isinstance(schemes, dict) else schemes
    for s in items:
        code = s.get("code", "?")
        if s.get("official_website"):
            found[s["official_website"]] = f"scheme {code} official_website"
        if s.get("pdf_source_url"):
            found[s["pdf_source_url"]] = f"scheme {code} pdf_source_url"

    meta = requests.get(f"{API}/schemes/meta", timeout=30).json()
    for dep in meta.get("departments", []):
        if dep.get("website"):
            found[dep["website"]] = f"department {dep.get('code')} website"

    for url in EXTRA:
        found.setdefault(url, "chat/live_sync hardcoded source")

    return found


def is_official(host: str) -> bool:
    host = host.lower()
    return any(host == d or host.endswith("." + d) for d in OFFICIAL_DOMAINS)


def browser_loads(url: str) -> tuple[bool, str]:
    """Load the URL the way a citizen's browser would.

    Some AP portals serve an incomplete certificate chain that Python rejects
    but Chrome accepts (it fetches the missing intermediate). Chrome is the
    reference client here, so fall back to it before calling a link broken.
    """
    try:
        proc = subprocess.run(
            [CHROME, "--headless=new", "--disable-gpu", "--no-sandbox",
             "--virtual-time-budget=8000", "--dump-dom", url],
            capture_output=True, text=True, timeout=60,
        )
    except FileNotFoundError:
        return False, "chrome not found to arbitrate TLS failure"
    except Exception as exc:
        return False, f"chrome probe failed: {type(exc).__name__}"

    dom = proc.stdout or ""
    low = (proc.stdout + proc.stderr).lower()
    if any(e in low for e in ("err_cert", "err_connection", "err_name_not",
                               "err_timed_out", "err_empty_response")):
        m = re.search(r"(err_[a-z_]+)", low)
        return False, f"chrome: {m.group(1) if m else 'load error'}"
    if len(dom) < 2000:
        return False, f"chrome: empty document ({len(dom)} bytes)"
    m = re.search(r"<title[^>]*>(.*?)</title>", dom[:8000], re.I | re.S)
    title = re.sub(r"\s+", " ", m.group(1)).strip()[:60] if m else "?"
    return True, f"chrome OK ({len(dom)} bytes) title={title!r}"


def verify(url: str) -> tuple[bool, str]:
    note = ""
    try:
        r = requests.get(url, headers=HEAD, timeout=25, allow_redirects=True)
    except requests.exceptions.SSLError:
        # Do not assume the link is dead: check it in a real browser first.
        ok, detail = browser_loads(url)
        if not ok:
            return False, f"SSL_ERROR + {detail}"
        host = url.split("/")[2]
        if not is_official(host):
            return False, f"NOT_OFFICIAL host={host}"
        return True, f"SSL chain incomplete but {detail}"
    except Exception as exc:
        return False, f"{type(exc).__name__}: {str(exc)[:70]}"

    if r.status_code >= 400:
        return False, f"HTTP {r.status_code}"

    host = r.url.split("/")[2]
    if not is_official(host):
        return False, f"NOT_OFFICIAL host={host}"

    title = ""
    m = re.search(r"<title[^>]*>(.*?)</title>", r.text[:8000], re.I | re.S)
    if m:
        title = re.sub(r"\s+", " ", m.group(1)).strip()[:60]
    return True, f"HTTP {r.status_code} -> {r.url}  title={title!r}{note}"


def main() -> int:
    links = collect()
    print(f"Checking {len(links)} unique URLs used by the app\n")
    failures = []
    for url, where in sorted(links.items()):
        ok, detail = verify(url)
        mark = "PASS" if ok else "FAIL"
        print(f"[{mark}] {url}\n        used by: {where}\n        {detail}")
        if not ok:
            failures.append(url)
    print(f"\n{len(links) - len(failures)}/{len(links)} passed")
    if failures:
        print("FAILING:")
        for f in failures:
            print(f"  - {f}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
