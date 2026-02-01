const express = require("express");
const {
  fetchOpenLibraryByIsbn,
  fetchGoogleBooksByIsbn,
  fetchGoogleBooksByQuery,
} = require("./services/books");
const { buildAmazonProductUrl, buildFallbackLinks } = require("./services/links");
const { assertIsbn } = require("./utils/validation");

const app = express();
app.use(express.json({ limit: "4mb" }));

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/identify", async (req, res, next) => {
  try {
    const { isbn, imageBase64, query } = req.body || {};
    if (isbn) {
      const normalizedIsbn = assertIsbn(isbn);
      const [openLibrary, googleBooks] = await Promise.all([
        fetchOpenLibraryByIsbn(normalizedIsbn),
        fetchGoogleBooksByIsbn(normalizedIsbn),
      ]);
      const candidates = [openLibrary, ...googleBooks].filter(Boolean);
      return res.json({
        input: { isbn: normalizedIsbn },
        candidates,
      });
    }

    if (query) {
      const candidates = await fetchGoogleBooksByQuery(query);
      return res.json({ input: { query }, candidates });
    }

    if (imageBase64) {
      return res.status(501).json({
        error: "OCR pipeline not implemented. Provide an ISBN or query for now.",
      });
    }

    return res.status(400).json({ error: "Provide isbn, query, or imageBase64." });
  } catch (error) {
    next(error);
  }
});

app.get("/kindle-link", async (req, res, next) => {
  try {
    const { isbn, locale, asin } = req.query;
    const normalizedIsbn = assertIsbn(isbn);
    const [openLibrary, googleBooks] = await Promise.all([
      fetchOpenLibraryByIsbn(normalizedIsbn),
      fetchGoogleBooksByIsbn(normalizedIsbn),
    ]);
    const candidates = [openLibrary, ...googleBooks].filter(Boolean);
    const primary = candidates[0];
    if (!primary) {
      return res.status(404).json({ error: "No matches found." });
    }

    const amazonUrl = buildAmazonProductUrl(asin, locale);
    const fallbackLinks = buildFallbackLinks(primary, locale);

    return res.json({
      input: { isbn: normalizedIsbn },
      amazonUrl,
      candidates,
      fallbackLinks,
    });
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  const status = error.status || 500;
  res.status(status).json({
    error: error.message || "Unexpected error",
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`kindle-downloader server listening on ${port}`);
});
