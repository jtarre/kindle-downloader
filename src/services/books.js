const OPEN_LIBRARY_URL = "https://openlibrary.org/api/books";
const GOOGLE_BOOKS_URL = "https://www.googleapis.com/books/v1/volumes";

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    const error = new Error(`Request failed: ${response.status} ${response.statusText}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

function normalizeOpenLibrary(data, isbn) {
  const key = `ISBN:${isbn}`;
  const entry = data?.[key];
  if (!entry) {
    return null;
  }
  return {
    source: "openlibrary",
    isbn,
    title: entry.title,
    authors: entry.authors?.map((author) => author.name).filter(Boolean) || [],
    coverUrl: entry.cover?.large || entry.cover?.medium || entry.cover?.small || null,
    openLibraryUrl: entry.url ? `https://openlibrary.org${entry.url}` : null,
  };
}

function normalizeGoogleBooks(volume, isbn) {
  if (!volume?.volumeInfo) {
    return null;
  }
  const { title, authors, imageLinks, previewLink, infoLink } = volume.volumeInfo;
  return {
    source: "googlebooks",
    isbn,
    title,
    authors: authors || [],
    coverUrl: imageLinks?.thumbnail || null,
    googleBooksPreviewUrl: previewLink || null,
    googleBooksInfoUrl: infoLink || null,
  };
}

async function fetchOpenLibraryByIsbn(isbn) {
  const url = new URL(OPEN_LIBRARY_URL);
  url.searchParams.set("bibkeys", `ISBN:${isbn}`);
  url.searchParams.set("format", "json");
  url.searchParams.set("jscmd", "data");
  const data = await fetchJson(url.toString());
  return normalizeOpenLibrary(data, isbn);
}

async function fetchGoogleBooksByIsbn(isbn) {
  const url = new URL(GOOGLE_BOOKS_URL);
  url.searchParams.set("q", `isbn:${isbn}`);
  url.searchParams.set("maxResults", "5");
  const data = await fetchJson(url.toString());
  if (!data.items?.length) {
    return [];
  }
  return data.items
    .map((item) => normalizeGoogleBooks(item, isbn))
    .filter(Boolean);
}

async function fetchGoogleBooksByQuery(query) {
  const url = new URL(GOOGLE_BOOKS_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("maxResults", "5");
  const data = await fetchJson(url.toString());
  if (!data.items?.length) {
    return [];
  }
  return data.items
    .map((item) => normalizeGoogleBooks(item, null))
    .filter(Boolean);
}

module.exports = {
  fetchOpenLibraryByIsbn,
  fetchGoogleBooksByIsbn,
  fetchGoogleBooksByQuery,
};
