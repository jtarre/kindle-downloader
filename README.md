# kindle-downloader

Photo (or ISBN) to a Kindle sample link is doable with a lightweight backend that resolves metadata first, then hands off to Amazon or a fallback reader. This repo contains the Express API that powers that flow.

## What this server does

- Accepts an ISBN or a text query and returns normalized book candidates from Open Library + Google Books.
- Returns a Kindle-link payload that prefers a canonical Amazon product link (when you provide an ASIN from your own integration) and falls back to search + preview links.

## Endpoints

### `POST /identify`

```json
{
  "isbn": "9780143127741"
}
```

Response:

```json
{
  "input": { "isbn": "9780143127741" },
  "candidates": [
    {
      "source": "openlibrary",
      "isbn": "9780143127741",
      "title": "Sapiens",
      "authors": ["Yuval Noah Harari"],
      "coverUrl": "https://covers.openlibrary.org/...",
      "openLibraryUrl": "https://openlibrary.org/..."
    },
    {
      "source": "googlebooks",
      "isbn": "9780143127741",
      "title": "Sapiens",
      "authors": ["Yuval Noah Harari"],
      "coverUrl": "http://books.google.com/...",
      "googleBooksPreviewUrl": "http://books.google.com/...",
      "googleBooksInfoUrl": "http://books.google.com/..."
    }
  ]
}
```

You can also send a `query` for OCR output:

```json
{
  "query": "harari sapiens"
}
```

### `GET /kindle-link?isbn=...&asin=...`

Returns the primary candidate plus fallback links. Pass `asin` if you already resolved it via the Amazon Product Advertising API.

```json
{
  "input": { "isbn": "9780143127741" },
  "amazonUrl": "https://www.amazon.com/dp/B00ICN066A",
  "candidates": ["..."],
  "fallbackLinks": {
    "amazonSearchUrl": "https://www.amazon.com/s?k=sapiens%20harari",
    "googleBooksPreviewUrl": "http://books.google.com/...",
    "openLibraryUrl": "https://openlibrary.org/..."
  }
}
```

## Running locally

```bash
npm install
npm run start
```

Server listens on `http://localhost:3000` by default.

## Suggested next steps

- **Barcode-first Expo flow:** scan ISBN via `expo-camera`, call `/identify`, show the top candidate, and link out.
- **OCR fallback:** pipe `imageBase64` to your OCR/LLM pipeline, then call `/identify` with `query`.
- **Amazon PA API integration:** when you resolve an ASIN, return `https://www.amazon.com/dp/{ASIN}` from the backend.

## Expo app

An Expo mobile client lives in `expo-app/`.

### Setup

```bash
cd expo-app
npm install
EXPO_PUBLIC_OPENAI_API_KEY=your_key_here npm run start
```

### UX flow

- Empty state shows a large “Capture your first book” button.
- Camera capture opens a processing screen with the photo on top and a loading panel on the bottom third.
- The app calls OpenAI with the captured image to return `title`, `author`, and `kindleUrl`, then inserts the book into the list.
