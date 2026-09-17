/**
 * Phone number validation and sanitization utility for Indian mobile numbers.
 * 
 * Rules:
 * - Exactly 10 digits.
 * - Starts with 6, 7, 8, or 9.
 * - No letters, special characters, or extra country codes in input box.
 */

export const PHONE_ERROR_MESSAGE = "Enter a valid 10-digit mobile number";

/**
 * Sanitizes phone input in real time as the user types or pastes.
 * - Removes non-digit characters.
 * - Handles user pasting +91 or 91 country code prefix without keeping extra digits.
 * - Restricts max length to 10 digits.
 */
export const sanitizePhoneInput = (val) => {
  if (val === null || val === undefined) return "";
  let str = String(val).trim();

  // If user pasted or typed +91... or +...
  if (str.startsWith("+91")) {
    str = str.slice(3);
  } else if (str.startsWith("+")) {
    str = str.slice(1);
  }

  // Strip all non-digit characters
  let digits = str.replace(/\D/g, "");

  // If user pasted 12 digits starting with 91 (e.g. 919876543210), strip the leading 91
  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  }

  // Cap at 10 digits max
  return digits.slice(0, 10);
};

/**
 * Validates whether a phone string is a valid 10-digit Indian mobile number.
 * Pattern: ^[6-9][0-9]{9}$
 */
export const isValidIndianPhone = (phone) => {
  if (!phone) return false;
  const sanitized = sanitizePhoneInput(phone);
  return /^[6-9][0-9]{9}$/.test(sanitized);
};
