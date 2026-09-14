"""
Unit and Integration Tests for BookBridge Search Functionality
Tests all 10 required search scenarios:
1. Search using existing Malayalam book title
2. Search using Malayalam word from an existing title
3. Search using existing author's Malayalam name
4. Search using English title
5. Search using English author name
6. Search using ISBN
7. Search with uppercase/lowercase English
8. Search with spaces before/after query
9. No matching result -> returns empty list
10. Clear search -> returns catalogue
"""
import pytest
from unittest.mock import MagicMock, patch
from backend.services.search_engine import FirestoreSearchProvider, normalize_text_for_search, normalize_isbn_for_search


# Sample existing catalogue matching BookBridge dataset
SAMPLE_CATALOGUE = [
    {
        "id": "b1",
        "title": "വിശ്വാസപൂർവം",
        "author": "എ പി അബൂബക്കർ മുസ്ലിയാർ കാന്തപുരം",
        "description": "ആത്മകഥ",
        "category": "Biography",
        "isbn": "",
        "approved": True,
    },
    {
        "id": "b2",
        "title": "കുട്ടികളുടെ നബികഥകൾ",
        "author": "റസൂൽ റഹ്മാൻ",
        "description": "കുട്ടികൾക്കുള്ള പ്രവാചക കഥകൾ",
        "category": "Children",
        "isbn": "9781234567890",
        "approved": True,
    },
    {
        "id": "b3",
        "title": "The Alchemist",
        "author": "Paulo Coelho",
        "description": "A novel about following your dreams",
        "category": "Fiction",
        "isbn": "8943214136",
        "approved": True,
    },
    {
        "id": "b4",
        "title": "The White Tiger",
        "author": "Aravind Adiga",
        "description": "Man Booker Prize winner",
        "category": "Fiction",
        "isbn": "978-0-7432-4754-3",
        "approved": True,
    },
    {
        "id": "b5",
        "title": "Muthunabi",
        "author": "Abdurrahman Darimi",
        "description": "Life of Prophet Muhammad",
        "category": "Religion",
        "isbn": "533",
        "approved": True,
    }
]


class MockFirestoreDoc:
    def __init__(self, data, doc_id):
        self._data = data
        self.id = doc_id

    def to_dict(self):
        return dict(self._data)


class MockFirestoreCollection:
    def __init__(self, docs):
        self.docs = docs

    def where(self, field, op, val):
        filtered = []
        for d in self.docs:
            data = d.to_dict()
            if op == "==" and data.get(field) == val:
                filtered.append(d)
        return MockFirestoreCollection(filtered)

    def stream(self):
        return self.docs


class MockFirestoreDB:
    def __init__(self, sample_books):
        self.doc_list = [MockFirestoreDoc(b, b["id"]) for b in sample_books]

    def collection(self, name):
        if name == "books":
            return MockFirestoreCollection(self.doc_list)
        return MockFirestoreCollection([])


@pytest.fixture
def mock_search_provider():
    provider = FirestoreSearchProvider()
    mock_db = MockFirestoreDB(SAMPLE_CATALOGUE)
    with patch("backend.services.search_engine.get_db", return_value=mock_db):
        yield provider


class TestSearchFunctionality:

    def test_normalization_utils(self):
        """Verify Malayalam NFC and ZWJ/ZWNJ stripping"""
        assert normalize_text_for_search("  കുട്ടികളുടെ  ") == "കുട്ടികളുടെ"
        # Zero-width non-joiner stripping check
        assert normalize_text_for_search("മുസ്‌ലിയാർ") == normalize_text_for_search("മുസ്ലിയാർ")
        # ISBN normalization
        assert normalize_isbn_for_search("978-1234-5678-90") == "9781234567890"

    def test_1_malayalam_title_search(self, mock_search_provider):
        """TEST 1: Search using an existing Malayalam book title."""
        results = mock_search_provider.search("വിശ്വാസപൂർവം")
        assert len(results) > 0
        assert results[0]["title"] == "വിശ്വാസപൂർവം"

    def test_2_malayalam_word_search(self, mock_search_provider):
        """TEST 2: Search using a Malayalam word from an existing title."""
        results = mock_search_provider.search("കുട്ടികളുടെ")
        assert len(results) > 0
        assert "കുട്ടികളുടെ" in results[0]["title"]

    def test_3_malayalam_author_search(self, mock_search_provider):
        """TEST 3: Search using an existing author's Malayalam name."""
        results = mock_search_provider.search("അബൂബക്കർ")
        assert len(results) > 0
        assert "അബൂബക്കർ" in results[0]["author"]

    def test_4_english_title_search(self, mock_search_provider):
        """TEST 4: Search using an English title."""
        results = mock_search_provider.search("Alchemist")
        assert len(results) > 0
        assert "Alchemist" in results[0]["title"]

    def test_5_english_author_search(self, mock_search_provider):
        """TEST 5: Search using an English author name."""
        results = mock_search_provider.search("Coelho")
        assert len(results) > 0
        assert "Coelho" in results[0]["author"]

    def test_6_isbn_search(self, mock_search_provider):
        """TEST 6: Search using ISBN (formatted and unformatted)."""
        results_exact = mock_search_provider.search("8943214136")
        assert len(results_exact) > 0
        assert results_exact[0]["id"] == "b3"

        results_formatted = mock_search_provider.search("978-0-7432-4754-3")
        assert len(results_formatted) > 0
        assert results_formatted[0]["id"] == "b4"

    def test_7_case_insensitive_english(self, mock_search_provider):
        """TEST 7: Search with uppercase/lowercase English."""
        res_lower = mock_search_provider.search("alchemist")
        res_upper = mock_search_provider.search("ALCHEMIST")
        res_mixed = mock_search_provider.search("AlChEmIsT")
        assert len(res_lower) == len(res_upper) == len(res_mixed) > 0
        assert res_lower[0]["id"] == res_upper[0]["id"] == res_mixed[0]["id"]

    def test_8_whitespace_trimming(self, mock_search_provider):
        """TEST 8: Search with spaces before/after query."""
        results = mock_search_provider.search("   Paulo Coelho   ")
        assert len(results) > 0
        assert results[0]["author"] == "Paulo Coelho"

    def test_9_no_matching_result(self, mock_search_provider):
        """TEST 9: No matching result returns clean empty list."""
        results = mock_search_provider.search("NonexistentBookQuery12345")
        assert isinstance(results, list)
        assert len(results) == 0

    def test_10_clear_search(self, mock_search_provider):
        """TEST 10: Clear search returns normal catalogue."""
        results_empty = mock_search_provider.search("")
        results_whitespace = mock_search_provider.search("   ")
        assert len(results_empty) == len(SAMPLE_CATALOGUE)
        assert len(results_whitespace) == len(SAMPLE_CATALOGUE)

    def test_mixed_malayalam_english_search(self, mock_search_provider):
        """TEST 4b: Mixed Malayalam + English search term."""
        results = mock_search_provider.search("റസൂൽ Rahman")
        assert len(results) > 0
        assert results[0]["id"] == "b2"
