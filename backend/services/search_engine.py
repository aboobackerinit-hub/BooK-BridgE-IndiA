"""
Advanced search engine with fuzzy matching, multi-field search,
and Malayalam + English support.

Uses trigram tokenization stored in Firestore for typo-tolerant search.
Implements the SearchProvider strategy pattern for future Algolia/Meilisearch migration.
"""
import re
import logging
import unicodedata
from abc import ABC, abstractmethod
from typing import Optional

from backend.core.database import get_db
from backend.core import cache

logger = logging.getLogger("bookbridge.search_engine")


def normalize_text_for_search(val: str) -> str:
    """
    Normalize string for search comparison:
    - Unicode NFC normalization
    - Stripping zero-width joiners (\u200D) and non-joiners (\u200C)
    - Lowercase & strip whitespace
    """
    if not val:
        return ""
    text = str(val)
    text = unicodedata.normalize('NFC', text)
    text = text.replace('\u200c', '').replace('\u200d', '')
    return text.strip().lower()


def normalize_isbn_for_search(val: str) -> str:
    """
    Normalize ISBN by stripping hyphens, spaces, dots, and lowercasing.
    """
    if not val:
        return ""
    text = str(val)
    return re.sub(r'[\s\.\-]', '', text).lower()



# ── Trigram tokenizer ──────────────────────────────────────────────────

def generate_trigrams(text: str) -> list[str]:
    """
    Generate trigram tokens from text for fuzzy matching.

    Produces overlapping 3-character substrings from the lowered, cleaned text.
    Also includes full words for exact prefix matching.
    """
    if not text:
        return []

    cleaned = text.lower().strip()
    # Remove special characters but keep Malayalam unicode and alphanumeric
    cleaned = re.sub(r'[^\w\s\u0D00-\u0D7F]', '', cleaned)

    tokens = set()
    words = cleaned.split()

    for word in words:
        # Add the full word
        tokens.add(word)
        # Add bigrams for short words
        if len(word) >= 2:
            for i in range(len(word) - 1):
                tokens.add(word[i:i + 2])
        # Add trigrams
        if len(word) >= 3:
            for i in range(len(word) - 2):
                tokens.add(word[i:i + 3])

    return list(tokens)[:500]  # Firestore array limit safety


def generate_search_tokens(book_data: dict) -> list[str]:
    """
    Generate search tokens from all searchable fields of a book.

    Searches across: title, author, publisher_name, isbn, category, subject.
    """
    fields = [
        book_data.get("title", ""),
        book_data.get("author", ""),
        book_data.get("publisher_name", ""),
        book_data.get("isbn", ""),
        book_data.get("category", ""),
        book_data.get("subject", ""),
    ]

    all_tokens = set()
    for field in fields:
        if field:
            all_tokens.update(generate_trigrams(field))

    return list(all_tokens)[:500]


# ── Manglish transliteration ──────────────────────────────────────────

# Common Manglish (romanized Malayalam) to Malayalam script mappings
_MANGLISH_MAP = {
    "aa": "ആ", "ee": "ഈ", "oo": "ഊ", "ai": "ഐ", "au": "ഔ",
    "ka": "ക", "kha": "ഖ", "ga": "ഗ", "gha": "ഘ",
    "cha": "ച", "chha": "ഛ", "ja": "ജ", "jha": "ഝ",
    "ta": "ട", "tha": "ഠ", "da": "ഡ", "dha": "ഢ",
    "na": "ന", "pa": "പ", "pha": "ഫ", "ba": "ബ", "bha": "ഭ",
    "ma": "മ", "ya": "യ", "ra": "ര", "la": "ല", "va": "വ",
    "sha": "ശ", "sa": "സ", "ha": "ഹ",
    "la": "ള", "zha": "ഴ", "ra": "റ",
}


def transliterate_manglish(text: str) -> str:
    """
    Basic Manglish to Malayalam transliteration.

    This is a best-effort mapping; for production,
    consider integrating a proper transliteration API.
    """
    result = text.lower()
    # Sort by length (longest first) to avoid partial replacements
    for roman, mal in sorted(_MANGLISH_MAP.items(), key=lambda x: -len(x[0])):
        result = result.replace(roman, mal)
    return result


# ── Search Provider (Strategy Pattern) ────────────────────────────────

class SearchProvider(ABC):
    """Abstract search provider for swappable implementations."""

    @abstractmethod
    def search(
        self,
        query: str,
        category: Optional[str] = None,
        owner_id: Optional[str] = None,
        listing_type: Optional[str] = None,
        condition: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        district: Optional[str] = None,
        state: Optional[str] = None,
        college_id: Optional[str] = None,
        delivery_options: Optional[list[str]] = None,
        sort_by: str = "latest",
        limit: int = 60,
        start_after: Optional[str] = None,
        user_location: Optional[dict] = None,
    ) -> list[dict]:
        """Execute a search query with filters and sorting."""
        ...


class FirestoreSearchProvider(SearchProvider):
    """
    Firestore-based search using trigram tokens.

    For typo-tolerant search: generates trigrams from the query,
    then uses array_contains_any to find books with matching tokens.
    Falls back to prefix matching if trigram search yields no results.
    """

    def search(
        self,
        query: str,
        category: Optional[str] = None,
        owner_id: Optional[str] = None,
        listing_type: Optional[str] = None,
        condition: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        district: Optional[str] = None,
        state: Optional[str] = None,
        college_id: Optional[str] = None,
        delivery_options: Optional[list[str]] = None,
        sort_by: str = "latest",
        limit: int = 60,
        start_after: Optional[str] = None,
        user_location: Optional[dict] = None,
    ) -> list[dict]:
        db = get_db()
        if not db:
            return []

        try:
            # 1. Fetch candidate books from Firestore matching basic scope
            candidates = []
            try:
                ref = db.collection("books")
                if not owner_id:
                    ref = ref.where("approved", "==", True)
                if category and category != "All":
                    ref = ref.where("category", "==", category)
                if owner_id:
                    ref = ref.where("owner_id", "==", owner_id)
                if listing_type:
                    ref = ref.where("listing_type", "==", listing_type)

                docs = ref.stream()
                for doc in docs:
                    d = doc.to_dict()
                    d["id"] = doc.id
                    candidates.append(d)
            except Exception as fe:
                logger.warning(f"Filtered candidate fetch warning: {fe}, falling back to full query")
                docs = db.collection("books").stream()
                for doc in docs:
                    d = doc.to_dict()
                    d["id"] = doc.id
                    candidates.append(d)

            # Apply candidate level scope in python to ensure index independence
            if not owner_id:
                candidates = [b for b in candidates if b.get("approved") is True or b.get("approved") == "true" or "approved" not in b]
            if category and category != "All":
                candidates = [b for b in candidates if str(b.get("category", "")).strip().lower() == category.strip().lower()]
            if owner_id:
                candidates = [b for b in candidates if str(b.get("owner_id", "")) == str(owner_id)]
            if listing_type:
                candidates = [b for b in candidates if str(b.get("listing_type", "")).strip().lower() == listing_type.strip().lower()]

            raw_q = query.strip() if query else ""

            # If query is empty or blank, return normal catalogue
            if not raw_q:
                results = self._apply_post_filters(candidates, min_price, max_price, district, state, college_id)
                results = self._apply_sort(results, sort_by, user_location)
                return results[:limit]

            # 2. Normalize query & extract tokens
            q_norm = normalize_text_for_search(raw_q)
            q_isbn = normalize_isbn_for_search(raw_q)
            q_words = [w for w in re.split(r'\s+', q_norm) if w]

            scored_results = []
            for b in candidates:
                t_raw = b.get("title", "")
                t_norm = normalize_text_for_search(t_raw)

                a_raw = b.get("author", "")
                a_norm = normalize_text_for_search(a_raw)

                isbn_raw = b.get("isbn", "")
                b_isbn = normalize_isbn_for_search(isbn_raw)

                p_raw = b.get("publisher_name") or b.get("publisher") or b.get("owner_name") or ""
                p_norm = normalize_text_for_search(p_raw)

                d_raw = b.get("description", "")
                d_norm = normalize_text_for_search(d_raw)

                cat_raw = b.get("category", "")
                c_norm = normalize_text_for_search(cat_raw)

                sub_raw = b.get("subject", "")
                sub_norm = normalize_text_for_search(sub_raw)

                lang_raw = b.get("language", "")
                lang_norm = normalize_text_for_search(lang_raw)

                ed_raw = b.get("edition", "")
                ed_norm = normalize_text_for_search(ed_raw)

                score = 0

                # Priority 1: Title exact match
                if t_norm and t_norm == q_norm:
                    score += 1000
                # Priority 2: Title starts with search
                elif t_norm and t_norm.startswith(q_norm):
                    score += 800
                # Priority 3: Title contains search
                elif t_norm and q_norm in t_norm:
                    score += 600

                # Priority 4: Author match
                if a_norm:
                    if a_norm == q_norm:
                        score += 500
                    elif a_norm.startswith(q_norm):
                        score += 450
                    elif q_norm in a_norm:
                        score += 400

                # Priority 5: ISBN match (exact or partial)
                if q_isbn and len(q_isbn) >= 3 and b_isbn:
                    if b_isbn == q_isbn:
                        score += 750
                    elif q_isbn in b_isbn:
                        score += 550

                # Priority 6: Publisher, Category, Subject, Language, Edition, Description match
                if p_norm and q_norm in p_norm:
                    score += 350
                if c_norm and q_norm in c_norm:
                    score += 250
                if sub_norm and q_norm in sub_norm:
                    score += 200
                if lang_norm and q_norm in lang_norm:
                    score += 200
                if ed_norm and q_norm in ed_norm:
                    score += 150
                if d_norm and q_norm in d_norm:
                    score += 100

                # Multi-word & Mixed Language Token Matching (Malayalam + English)
                if len(q_words) > 1:
                    matched_words = 0
                    for word in q_words:
                        word_isbn = normalize_isbn_for_search(word)
                        if ((t_norm and word in t_norm) or 
                            (a_norm and word in a_norm) or 
                            (b_isbn and word_isbn and len(word_isbn) >= 3 and word_isbn in b_isbn) or
                            (p_norm and word in p_norm) or 
                            (c_norm and word in c_norm) or 
                            (sub_norm and word in sub_norm) or 
                            (lang_norm and word in lang_norm) or 
                            (d_norm and word in d_norm)):
                            matched_words += 1

                    if matched_words == len(q_words):
                        score += 300
                    elif matched_words > 0:
                        score += 50 * matched_words

                if score > 0:
                    scored_results.append((score, b))

            # Priority Sort by score descending
            scored_results.sort(key=lambda item: item[0], reverse=True)
            results = [item[1] for item in scored_results]

            # Apply post-filters and pagination
            results = self._apply_post_filters(results, min_price, max_price, district, state, college_id)

            if start_after:
                found_cursor = False
                filtered = []
                for r in results:
                    if found_cursor:
                        filtered.append(r)
                    if r.get("id") == start_after:
                        found_cursor = True
                results = filtered

            return results[:limit]

        except Exception as e:
            logger.error(f"Search failed: {e}", exc_info=True)
            return []

    def _trigram_search(
        self, db, tokens, category, owner_id, listing_type, condition, delivery_options, limit
    ):
        """Search using trigram tokens with array_contains_any."""
        from firebase_admin import firestore

        query = db.collection("books")
        query = query.where("approved", "==", True)

        # array_contains_any can only be used once per query
        query = query.where("search_tokens", "array_contains_any", tokens)

        if category and category != "All":
            query = query.where("category", "==", category)
        if owner_id:
            query = query.where("owner_id", "==", owner_id)
        if listing_type:
            query = query.where("listing_type", "==", listing_type)

        docs = query.limit(limit).stream()
        results = []
        for doc in docs:
            d = doc.to_dict()
            d["id"] = doc.id
            results.append(d)

        return results

    def _fallback_search(self, db, query, category, owner_id, listing_type, limit):
        """Fallback to prefix matching on title_lower."""
        q_lower = query.lower() if query else ""

        ref = db.collection("books")
        ref = ref.where("approved", "==", True)

        if category and category != "All":
            ref = ref.where("category", "==", category)
        if owner_id:
            ref = ref.where("owner_id", "==", owner_id)

        if q_lower:
            ref = ref.where("title_lower", ">=", q_lower)
            ref = ref.where("title_lower", "<=", q_lower + '\uf8ff')

        docs = ref.limit(limit).stream()
        results = []
        for doc in docs:
            d = doc.to_dict()
            d["id"] = doc.id
            results.append(d)

        return results

    def _apply_post_filters(self, results, min_price, max_price, district, state, college_id):
        """Apply filters that can't be combined in a single Firestore query."""
        filtered = results

        if min_price is not None:
            filtered = [r for r in filtered if float(r.get("price", 0)) >= min_price]
        if max_price is not None:
            filtered = [r for r in filtered if float(r.get("price", 0)) <= max_price]
        if district:
            filtered = [r for r in filtered
                        if r.get("location", {}).get("district", "").lower() == district.lower()]
        if state:
            filtered = [r for r in filtered
                        if r.get("location", {}).get("state", "").lower() == state.lower()]
        if college_id:
            filtered = [r for r in filtered
                        if r.get("location", {}).get("college_id") == college_id]

        return filtered

    def _apply_sort(self, results, sort_by, user_location=None):
        """Apply sorting to results."""
        import math

        if sort_by == "price_asc":
            results.sort(key=lambda r: float(r.get("price", 0)))
        elif sort_by == "price_desc":
            results.sort(key=lambda r: float(r.get("price", 0)), reverse=True)
        elif sort_by == "trending" or sort_by == "most_viewed":
            results.sort(key=lambda r: r.get("views_count", 0), reverse=True)
        elif sort_by == "nearest" and user_location:
            def distance(r):
                loc = r.get("location", {})
                if not loc.get("lat") or not loc.get("lng"):
                    return float('inf')
                dlat = loc["lat"] - user_location.get("lat", 0)
                dlng = loc["lng"] - user_location.get("lng", 0)
                return math.sqrt(dlat ** 2 + dlng ** 2)
            results.sort(key=distance)
        else:  # "latest" default
            results.sort(key=lambda r: r.get("created_at", ""), reverse=True)

        return results


# ── Factory ────────────────────────────────────────────────────────────

_provider: Optional[SearchProvider] = None


def get_search_provider() -> SearchProvider:
    """Get the active search provider (factory pattern)."""
    global _provider
    if _provider is None:
        _provider = FirestoreSearchProvider()
    return _provider


def search_books(query: str, **kwargs) -> list[dict]:
    """Convenience function for searching books."""
    provider = get_search_provider()
    return provider.search(query, **kwargs)


def log_search(user_id: Optional[str], query: str, results_count: int, filters: dict = None):
    """Log a search event to search_analytics collection."""
    try:
        from firebase_admin import firestore as fs
        db = get_db()
        if db:
            db.collection("search_analytics").add({
                "query": query,
                "user_id": user_id,
                "results_count": results_count,
                "filters": filters or {},
                "created_at": fs.SERVER_TIMESTAMP,
            })
    except Exception as e:
        logger.warning(f"Failed to log search: {e}")
