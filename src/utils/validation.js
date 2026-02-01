function normalizeIsbn(isbn) {
  if (!isbn) {
    return null;
  }
  const cleaned = String(isbn).replace(/[^0-9X]/gi, "").toUpperCase();
  if (cleaned.length === 10 || cleaned.length === 13) {
    return cleaned;
  }
  return null;
}

function assertIsbn(isbn) {
  const normalized = normalizeIsbn(isbn);
  if (!normalized) {
    const error = new Error("Invalid ISBN. Provide a 10 or 13 digit ISBN.");
    error.status = 400;
    throw error;
  }
  return normalized;
}

module.exports = {
  normalizeIsbn,
  assertIsbn,
};
