function titleCase(text) {
  if (!text) return text;

  const smallWords = new Set([
    "a",
    "an",
    "and",
    "as",
    "at",
    "but",
    "by",
    "en",
    "for",
    "if",
    "in",
    "of",
    "on",
    "or",
    "the",
    "to",
    "v",
    "via",
    "vs",
    "is",
  ]);

  const words = text.trim().split(/(\s+)/);
  const totalWords = words.filter((w) => w.trim()).length;
  let wordIdx = 0;

  return words
    .map((word) => {
      if (!word.trim()) {
        return word;
      }

      const lowerWord = word.toLowerCase();
      const isFirst = wordIdx === 0;
      const isLast = wordIdx === totalWords - 1;
      wordIdx += 1;

      if (isFirst || isLast || !smallWords.has(lowerWord)) {
        return lowerWord.charAt(0).toUpperCase() + lowerWord.slice(1);
      }
      return lowerWord;
    })
    .join("");
}

function normalizeBookState(data) {
  if (
    !Object.hasOwn(data, "currently_reading") &&
    !Object.hasOwn(data, "want_to_read")
  ) {
    return data;
  }

  const isWant = Boolean(data.want_to_read);
  const isReading = Boolean(data.currently_reading);

  if (isWant) {
    data.currently_reading = false;
    data.date_finished = null;
    data.date_started = null;
    data.rating = null;
    data.notes = null;
  } else if (isReading) {
    data.want_to_read = false;
    data.date_finished = null;
    data.rating = null;
    data.notes = null;
  } else {
    data.currently_reading = false;
    data.want_to_read = false;
    data.date_started = null;
  }

  return data;
}

function computeReadingPace(books, year) {
  const dated = books
    .map((b) => b.date_finished)
    .filter(Boolean)
    .map((d) => new Date(d))
    .sort((a, b) => a.getTime() - b.getTime());

  if (dated.length < 2) {
    return null;
  }

  const today = new Date();
  const first = dated[0];
  const last = year === today.getFullYear() ? today : dated[dated.length - 1];

  const spanDays = Math.floor((last - first) / 86400000);
  if (spanDays === 0) {
    return null;
  }

  const daysPerBook = spanDays / dated.length;

  if (daysPerBook < 14) {
    const n = Math.round(daysPerBook);
    return `1 book every ${n} day${n !== 1 ? "s" : ""}`;
  }
  if (daysPerBook < 60) {
    const weeks = daysPerBook / 7;
    return `1 book every ${weeks.toFixed(1)} week${weeks >= 1.5 ? "s" : ""}`;
  }

  const months = daysPerBook / 30.4;
  return `1 book every ${months.toFixed(1)} month${months >= 1.5 ? "s" : ""}`;
}

function computePace(year, count, goal) {
  const pct = Math.min(100, Math.trunc((count / goal) * 100));
  const booksRemaining = Math.max(0, goal - count);
  const today = new Date();

  if (year !== today.getFullYear()) {
    return {
      pct,
      books_remaining: booksRemaining,
      is_current_year: false,
      message: null,
      sentiment: null,
    };
  }

  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);
  const daysInYear = Math.floor((yearEnd - yearStart) / 86400000) + 1;
  const daysElapsed = Math.min(
    Math.floor((today - yearStart) / 86400000) + 1,
    daysInYear
  );
  const expectedByNow = Math.round((goal * daysElapsed) / daysInYear);
  const diff = count - expectedByNow;

  let message;
  let sentiment;

  if (count >= goal) {
    message = "Goal complete!";
    sentiment = "complete";
  } else if (diff > 0) {
    message = `${diff} book${diff !== 1 ? "s" : ""} ahead of schedule`;
    sentiment = "ahead";
  } else if (diff < 0) {
    const behind = Math.abs(diff);
    message = `${behind} book${behind !== 1 ? "s" : ""} behind schedule`;
    sentiment = "behind";
  } else {
    message = "Right on schedule!";
    sentiment = "on-track";
  }

  return {
    pct,
    books_remaining: booksRemaining,
    is_current_year: true,
    message,
    sentiment,
  };
}

function parseBool(value) {
  return value === true || value === 1 || value === "1";
}

module.exports = {
  titleCase,
  normalizeBookState,
  computePace,
  computeReadingPace,
  parseBool,
};
