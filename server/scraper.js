const { titleCase } = require("./utils");

const GOOGLE_BOOKS_API = "https://www.googleapis.com/books/v1/volumes";
const OPENLIBRARY_SEARCH = "https://openlibrary.org/search.json";
const OPENLIBRARY_COVER =
  "https://covers.openlibrary.org/b/id/{cover_id}-M.jpg";

const OL_HEADERS = {
  "User-Agent": "ReadingChallengeTracker/1.0 (personal self-hosted app)",
};

// Subjects to always discard
const SUBJECT_DENYLIST = new Set([
  "accessible book",
  "large type books",
  "large print books",
  "protected daisy",
  "in library",
  "overdrive",
  "open library staff picks",
  "new york times reviewed",
  "internet archive wishlist",
  "lending library",
  "open syllabus project",
  "readable",
  "fiction",
  "nonfiction",
  "new york times bestseller",
]);

// Patterns that indicate noise
const SUBJECT_DENY_PATTERNS = [
  /\d{4}/, // contains a year or long number
  /^[A-Z]{2,}$/, // all-caps abbreviation
  /[/\\:_]/, // contains slash, colon, or underscore
  /,\s*(american|english|british|french|german|canadian|australian)\s*$/i, // geographic qualifier suffix
  /^(united states|united kingdom|great britain|england|france|germany|canada|australia|new zealand|ireland|scotland|wales|china|japan|india|russia|italy|spain|american)\b/i, // geographic qualifier prefix
];

// Canonical genre names — if an OL subject matches one of these (case-insensitive),
// we use this spelling instead of whatever OL returned
const CANONICAL_GENRES = [
  "Fantasy",
  "Science Fiction",
  "Mystery",
  "Thriller",
  "Horror",
  "Romance",
  "Historical Fiction",
  "Literary Fiction",
  "Contemporary Fiction",
  "LGBT",
  "Graphic Novel",
  "Short Stories",
  "Poetry",
  "Biography",
  "Memoir",
  "Autobiography",
  "Self-Help",
  "History",
  "Science",
  "Philosophy",
  "Politics",
  "Psychology",
  "Travel",
  "Cooking",
  "Art",
  "Comics",
  "Crime",
  "Adventure",
  "Suspense",
  "Dystopian",
  "Young Adult",
  "Classic Literature",
  "Satire",
  "Essays",
];

const CANONICAL_MAP = new Map(
  CANONICAL_GENRES.map((g) => [g.toLowerCase(), g])
);

function cleanSubjects(subjects) {
  if (!Array.isArray(subjects) || subjects.length === 0) return [];

  const seen = new Set();
  const canonical = [];
  const other = [];

  for (const raw of subjects) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();

    if (trimmed.length < 4 || trimmed.length > 45) continue;
    if (SUBJECT_DENYLIST.has(trimmed.toLowerCase())) continue;

    const canonicalMatch = CANONICAL_MAP.get(trimmed.toLowerCase());
    if (!canonicalMatch && SUBJECT_DENY_PATTERNS.some((p) => p.test(trimmed)))
      continue;
    const label = canonicalMatch || titleCase(trimmed);

    if (seen.has(label.toLowerCase())) continue;
    seen.add(label.toLowerCase());

    if (canonicalMatch) {
      canonical.push(label);
    } else {
      other.push(label);
    }
  }

  // Canonical genres first, then other cleaned subjects, max 5
  return [...canonical, ...other].slice(0, 5);
}

async function fetchCoverUrl(title, author) {
  const [googleResult, olResult] = await Promise.all([
    tryGoogleBooks(title, author),
    tryOpenLibrary(title, author),
  ]);

  return {
    google_covers: googleResult,
    openlibrary_covers: olResult.covers,
    genres: olResult.genres,
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
    fields: "title,author_name,cover_i,number_of_pages_median,subject",
  });

  const results = [];
  let rawSubjects = [];

  try {
    const response = await fetch(`${OPENLIBRARY_SEARCH}?${params.toString()}`, {
      headers: OL_HEADERS,
    });
    if (!response.ok) {
      return { covers: [], genres: [] };
    }
    const data = await response.json();

    for (const doc of data.docs || []) {
      // Collect subjects from the first doc that has them
      if (rawSubjects.length === 0 && Array.isArray(doc.subject)) {
        rawSubjects = doc.subject;
      }

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
    return { covers: [], genres: [] };
  }

  return { covers: results, genres: cleanSubjects(rawSubjects) };
}

module.exports = {
  fetchCoverUrl,
};
