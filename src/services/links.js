function buildAmazonProductUrl(asin, locale = "us") {
  if (!asin) {
    return null;
  }
  const domain = locale === "uk" ? "amazon.co.uk" : "amazon.com";
  return `https://www.${domain}/dp/${asin}`;
}

function buildAmazonSearchUrl({ title, authors = [], locale = "us" }) {
  const domain = locale === "uk" ? "amazon.co.uk" : "amazon.com";
  const query = encodeURIComponent([title, ...authors].filter(Boolean).join(" "));
  return `https://www.${domain}/s?k=${query}`;
}

function buildFallbackLinks(candidate, locale) {
  return {
    amazonSearchUrl: buildAmazonSearchUrl({
      title: candidate.title,
      authors: candidate.authors,
      locale,
    }),
    googleBooksPreviewUrl: candidate.googleBooksPreviewUrl || null,
    openLibraryUrl: candidate.openLibraryUrl || null,
  };
}

module.exports = {
  buildAmazonProductUrl,
  buildAmazonSearchUrl,
  buildFallbackLinks,
};
