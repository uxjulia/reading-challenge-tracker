const GOOGLE_BOOKS_API = "https://www.googleapis.com/books/v1/volumes";
const OPENLIBRARY_SEARCH = "https://openlibrary.org/search.json";
const OPENLIBRARY_COVER =
  "https://covers.openlibrary.org/b/id/{cover_id}-M.jpg";

const OL_HEADERS = {
  "User-Agent": "ReadingChallengeTracker/1.0 (personal self-hosted app)",
};

async function fetchCoverUrl(title, author) {
  const [googleResult, olResult] = await Promise.all([
    tryGoogleBooks(title, author),
    tryOpenLibrary(title, author),
  ]);

  return {
    google_covers: googleResult,
    openlibrary_covers: olResult,
  };
}

async function tryGoogleBooks(title, author) {
  const query = `intitle:${title} inauthor:${author}`;
  const params = new URLSearchParams({ q: query, maxResults: "3" });

  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (apiKey) {
    params.append("key", apiKey);
  }

  const results = [];
  const seenUrls = new Set();

  try {
    const response = await fetch(`${GOOGLE_BOOKS_API}?${params.toString()}`);
    if (!response.ok) {
      return [];
    }
    const data = await response.json();

    for (const item of data.items || []) {
      const info = item.volumeInfo || {};
      const links = info.imageLinks || {};
      const rawUrl = links.thumbnail || links.smallThumbnail;
      if (!rawUrl) {
        continue;
      }
      const coverUrl = rawUrl.replace("http://", "https://");
      if (seenUrls.has(coverUrl)) {
        continue;
      }
      seenUrls.add(coverUrl);
      results.push({
        url: coverUrl,
        page_count: info.pageCount || null,
      });
    }
  } catch {
    return [];
  }

  return results;
}

async function tryOpenLibrary(title, author) {
  const params = new URLSearchParams({
    title,
    author,
    limit: "3",
    fields: "title,author_name,cover_i,number_of_pages_median",
  });

  const results = [];

  try {
    const response = await fetch(`${OPENLIBRARY_SEARCH}?${params.toString()}`, {
      headers: OL_HEADERS,
    });
    if (!response.ok) {
      return [];
    }
    const data = await response.json();

    for (const doc of data.docs || []) {
      if (!doc.cover_i) {
        continue;
      }

      const coverUrl = OPENLIBRARY_COVER.replace(
        "{cover_id}",
        String(doc.cover_i)
      );
      const check = await fetch(`${coverUrl}?default=false`, {
        method: "HEAD",
        headers: OL_HEADERS,
        redirect: "follow",
      });

      if (check.ok) {
        results.push({
          url: coverUrl,
          page_count: doc.number_of_pages_median || null,
        });
      }
    }
  } catch {
    return [];
  }

  return results;
}

module.exports = {
  fetchCoverUrl,
};
