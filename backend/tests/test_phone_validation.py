import pytest
from backend.models.schemas import validate_and_normalize_phone, OrderIn, PHONE_ERROR_MSG
from pydantic import ValidationError


class TestPhoneValidationUnit:
    """Unit tests for Indian mobile phone number validation."""

    def test_valid_10_digit_numbers(self):
        # 1. 9876543210 -> PASS
        assert validate_and_normalize_phone("9876543210") == "9876543210"
        # 2. 9123456789 -> PASS
        assert validate_and_normalize_phone("9123456789") == "9123456789"
        # Valid starting with 8
        assert validate_and_normalize_phone("8087654321") == "8087654321"
        # Valid starting with 7 or 6
        assert validate_and_normalize_phone("7890123456") == "7890123456"
        assert validate_and_normalize_phone("6789012345") == "6789012345"

    def test_invalid_first_digit(self):
        # 3. 1234567890 -> FAIL (starts with 1)
        with pytest.raises(ValueError, match=PHONE_ERROR_MSG):
            validate_and_normalize_phone("1234567890")

        # Starts with 5 -> FAIL
        with pytest.raises(ValueError, match=PHONE_ERROR_MSG):
            validate_and_normalize_phone("5234567890")

    def test_invalid_length_short(self):
        # 4. 987654321 -> FAIL (9 digits)
        with pytest.raises(ValueError, match=PHONE_ERROR_MSG):
            validate_and_normalize_phone("987654321")

    def test_invalid_length_long(self):
        # 5. 98765432101 -> FAIL (11 digits)
        with pytest.raises(ValueError, match=PHONE_ERROR_MSG):
            validate_and_normalize_phone("98765432101")

    def test_contains_letters_or_special_chars(self):
        # 6. abc9876543210 / 98765abc10 -> FAIL (non-digits removed results in wrong length or invalid format)
        with pytest.raises(ValueError, match=PHONE_ERROR_MSG):
            validate_and_normalize_phone("98765abc10")

    def test_country_code_prefix_stripping(self):
        # 7. +919876543210 -> PASS (sanitized to 10-digit mobile number)
        assert validate_and_normalize_phone("+919876543210") == "9876543210"
        assert validate_and_normalize_phone("+91 98765 43210") == "9876543210"

    def test_empty_phone(self):
        # 8. Empty phone -> FAIL
        with pytest.raises(ValueError, match=PHONE_ERROR_MSG):
            validate_and_normalize_phone("")

        with pytest.raises(ValueError, match=PHONE_ERROR_MSG):
            validate_and_normalize_phone(None)

    def test_pydantic_schema_order_in_validation(self):
        # OrderIn schema with valid phone and long address (9. Address with long text)
        long_address = "Flat 402, Block B, Sunshine Apartments, MG Road, Ward 12, Indiranagar, Bengaluru, Karnataka 560038"
        order = OrderIn(address=long_address, phone="9876543210")
        assert order.phone == "9876543210"
        assert order.address == long_address

        # OrderIn schema with invalid phone -> FAIL
        with pytest.raises(ValidationError):
            OrderIn(address="123 Street", phone="1234567890")
