"""Keyless live-sync of official Andhra Pradesh scheme portals.

There is no public AP government API, so this service fetches the official
departmental portals directly (no API key, no signup), extracts a short
notice plus any rupee amounts mentioned, and stores the latest snapshot per
scheme. Unreachable sources are skipped rather than failing the whole run.

Nothing here can break curated eligibility rules: it only records an
informational snapshot that the UI surfaces as "latest from the official portal".
"""

from __future__ import annotations

import logging
import re
import uuid
from datetime import datetime, timezone
from html.parser import HTMLParser
from typing import Iterable

import requests
from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal
from app.models import SchemeUpdate, SeedMeta

logger = logging.getLogger("live_sync")

BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
    ),
    "Accept-Language": "en-IN,en;q=0.9,te;q=0.8",
}

# Official portals that resolve publicly. Multiple schemes may share a portal.
# Only scheme-specific, publicly resolvable portals are listed: a generic homepage
# produces a misleading headline, so it is better to show nothing for that scheme.
SOURCES: list[dict] = [
    {
        "scheme_code": "NTR_BHAROSA_OLD_AGE",
        "url": "https://sspensions.ap.gov.in/SSP",
        "label": "Social Security Pensions",
        "focus": ["pension", "bharosa", "enhanc"],
    },
    {
        "scheme_code": "NTR_BHAROSA_DISABILITY",
        "url": "https://sspensions.ap.gov.in/SSP",
        "label": "Social Security Pensions",
        "focus": ["disab", "pension", "bharosa"],
    },
    {
        "scheme_code": "ANNADATA_SUKHIBHAVA",
        "url": "https://annadathasukhibhava.ap.gov.in/",
        "label": "Annadata Sukhibhava",
        "focus": ["annadata", "sukhibhava", "farmer", "instal", "payment", "beneficiary"],
    },
    {
        "scheme_code": "NTR_VAIDYA_SEVA",
        "url": "https://drntrvaidyaseva.ap.gov.in/",
        "label": "Dr. NTR Vaidya Seva",
        "focus": ["vaidya", "aarogyasri", "treatment", "health", "medical", "hospital"],
    },
]

# Sentences worth surfacing as a headline.
KEYWORDS = (
    "enhanc", "increas", "increase", "pension", "assistance", "scheme", "eligib",
    "launch", "amount", "benefit", "guideline", "sanction", "release", "g.o",
    "installment", "instalment", "welfare", "beneficiar",
)

# Navigation chrome and administrative notices that should never become a headline.
NAV_NOISE = (
    "login", "contact us", "download", "gallery", "read more", "all rights",
    "copyright", "designed & developed", "application form", "key contacts",
    "home", "skip to", "back to top", "menu",
    "recruitment", "notification", "tender", "auction", "quotation", "holiday",
    "admission", "counselling", "result", "exam", "syllabus", "visitor",
)

_AMOUNT_RE = re.compile(r"(?:₹|Rs\.?|INR)\s*([0-9][0-9,]{2,})(?:\s*(?:/-|per|\/))?", re.IGNORECASE)


class _TextExtractor(HTMLParser):
    """Collect visible text, ignoring script/style/svg blocks."""

    def __init__(self) -> None:
        super().__init__()
        self._skip = 0
        self._parts: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag in ("script", "style", "svg", "noscript"):
            self._skip += 1

    def handle_endtag(self, tag: str) -> None:
        if tag in ("script", "style", "svg", "noscript") and self._skip:
            self._skip -= 1

    def handle_data(self, data: str) -> None:
        if not self._skip:
            text = data.strip()
            if text:
                self._parts.append(text)

    @property
    def text(self) -> str:
        return re.sub(r"\s+", " ", " ".join(self._parts)).strip()


def _clean_html(html: str) -> str:
    parser = _TextExtractor()
    try:
        parser.feed(html)
    except Exception as exc:  # malformed markup should not abort the sync
        logger.debug("HTML parse warning: %s", exc)
    return parser.text


def _extract_amounts(text: str) -> list[str]:
    seen: list[str] = []
    for match in _AMOUNT_RE.findall(text):
        amount = match.rstrip(",").strip()
        if amount not in seen:
            seen.append(amount)
    return seen[:8]


def _is_noise(sentence: str) -> bool:
    lowered = sentence.lower()
    # Chrome/navigation OR a long run of very short tokens (menus).
    if any(n in lowered for n in NAV_NOISE):
        return True
    words = lowered.split()
    return len(words) >= 6 and sum(len(w) <= 3 for w in words) / len(words) > 0.5


def _extract_headline(text: str, fallback: str, focus: list[str] | None = None) -> str | None:
    """Pick the most newsworthy sentence: keyword-rich, mentions money, not chrome.

    When ``focus`` is given, only sentences containing at least one focus term are
    eligible. Returning ``None`` (source skipped) is preferred over emitting a
    headline that has nothing to do with the scheme.
    """
    sentences = re.split(r"(?<=[.!?])\s+|\s\|\s|\s{2,}", text)
    focus_terms = [f.lower() for f in focus] if focus else None
    best, best_score = "", 0
    for sentence in sentences:
        clean = sentence.strip()
        if len(clean) < 35 or _is_noise(clean):
            continue
        lowered = clean.lower()
        if focus_terms is not None and not any(f in lowered for f in focus_terms):
            continue
        score = sum(1 for k in KEYWORDS if k in lowered)
        if _AMOUNT_RE.search(clean):
            score += 3
        if score > best_score or (score == best_score and len(clean) > len(best)):
            best, best_score = clean, score
    if best:
        return best[:240]
    if focus_terms is not None:
        return None
    return fallback[:240]


def fetch_source(url: str, focus: list[str] | None = None) -> tuple[str, str] | None:
    """Return (headline, full_text) for a URL, or None if unreachable/off-topic."""
    try:
        response = requests.get(url, headers=BROWSER_HEADERS, timeout=settings.LIVE_SYNC_TIMEOUT)
        if response.status_code != 200 or not response.text:
            logger.warning("live_sync: %s returned %s", url, response.status_code)
            return None
        text = _clean_html(response.text)
        if len(text) < 40:
            return None
        title_match = re.search(r"<title[^>]*>(.*?)</title>", response.text, re.IGNORECASE | re.DOTALL)
        title = _clean_html(title_match.group(1)) if title_match else url
        headline = _extract_headline(text, title, focus)
        if headline is None:
            logger.info("live_sync: no on-topic sentence for %s; skipping", url)
            return None
        return headline, text
    except requests.RequestException as exc:
        logger.info("live_sync: %s unreachable (%s)", url, type(exc).__name__)
        return None
    except Exception as exc:
        logger.warning("live_sync: unexpected error for %s: %s", url, exc)
        return None


def sync_all(db: Session) -> list[SchemeUpdate]:
    """Fetch every source and store the latest snapshot per scheme."""
    updates: list[SchemeUpdate] = []
    now = datetime.now(timezone.utc)
    excerpt_full: dict[str, str] = {}

    for source in SOURCES:
        fetched = fetch_source(source["url"], source.get("focus"))
        if not fetched:
            continue
        headline, full_text = fetched
        excerpt_full[source["scheme_code"]] = full_text
        excerpt = full_text[:600]
        # Amounts come from the full cleaned page text, not the truncated excerpt.
        amounts = _extract_amounts(excerpt_full.get(source["scheme_code"], excerpt))

        # One rolling snapshot per scheme keeps the table small and the UI current.
        db.query(SchemeUpdate).filter(SchemeUpdate.scheme_code == source["scheme_code"]).delete()
        update = SchemeUpdate(
            id=str(uuid.uuid4()),
            scheme_code=source["scheme_code"],
            source_url=source["url"],
            source_label=source["label"],
            headline=headline,
            amounts=amounts,
            excerpt=excerpt,
            fetched_at=now,
        )
        db.add(update)
        updates.append(update)

    marker = db.query(SeedMeta).filter(SeedMeta.key == "last_live_sync").first()
    if marker:
        marker.value = now.isoformat()
    else:
        db.add(SeedMeta(key="last_live_sync", value=now.isoformat()))

    db.commit()
    logger.info("live_sync: refreshed %s/%s sources", len(updates), len(SOURCES))
    return updates


def run_sync() -> int:
    """Entry point for the background refresher; manages its own DB session."""
    db = SessionLocal()
    try:
        return len(sync_all(db))
    except Exception as exc:
        db.rollback()
        logger.warning("live_sync run failed: %s", exc)
        return 0
    finally:
        db.close()


def latest_updates(db: Session) -> Iterable[SchemeUpdate]:
    return db.query(SchemeUpdate).order_by(SchemeUpdate.fetched_at.desc()).all()
