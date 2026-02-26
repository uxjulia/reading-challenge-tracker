function asOptionalString(value, maxLength) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") throw new Error("Must be a string");
  if (value.length > maxLength)
    throw new Error(`Must be ${maxLength} characters or fewer`);
  return value;
}

function asRequiredString(value, maxLength) {
  if (typeof value !== "string") throw new Error("Must be a string");
  const trimmed = value.trim();
  if (!trimmed) throw new Error("Cannot be empty");
  if (trimmed.length > maxLength)
    throw new Error(`Must be ${maxLength} characters or fewer`);
  return trimmed;
}

function asOptionalNumber(value, { min, max, int = false } = {}) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "number" || Number.isNaN(value))
    throw new Error("Must be a number");
  if (int && !Number.isInteger(value)) throw new Error("Must be an integer");
  if (min !== undefined && value < min) throw new Error(`Must be >= ${min}`);
  if (max !== undefined && value > max) throw new Error(`Must be <= ${max}`);
  return value;
}

function asRequiredNumber(value, opts = {}) {
  const parsed = asOptionalNumber(value, opts);
  if (parsed === null || parsed === undefined) throw new Error("Required");
  return parsed;
}

function asOptionalBool(value) {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") throw new Error("Must be true or false");
  return value;
}

function asOptionalDate(value) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") throw new Error("Must be a date string");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error("Must be in YYYY-MM-DD format");
  return value;
}

function validateCreate(body) {
  return {
    year: asRequiredNumber(body.year, { min: 2000, max: 2100, int: true }),
    title: asRequiredString(body.title, 500),
    author: asRequiredString(body.author, 500),
    date_finished: asOptionalDate(body.date_finished),
    rating: asOptionalNumber(body.rating, { min: 0.5, max: 5 }),
    genre: asOptionalString(body.genre, 100),
    notes: asOptionalString(body.notes, 5000),
    cover_url: asOptionalString(body.cover_url, 2000),
    is_private: asOptionalBool(body.is_private) ?? false,
    currently_reading: asOptionalBool(body.currently_reading) ?? false,
    want_to_read: asOptionalBool(body.want_to_read) ?? false,
    date_started: asOptionalDate(body.date_started),
    page_count: asOptionalNumber(body.page_count, {
      min: 1,
      max: 99999,
      int: true,
    }),
  };
}

function validateUpdate(body) {
  return {
    year:
      body.year === undefined
        ? undefined
        : asRequiredNumber(body.year, { min: 2000, max: 2100, int: true }),
    title:
      body.title === undefined ? undefined : asRequiredString(body.title, 500),
    author:
      body.author === undefined
        ? undefined
        : asRequiredString(body.author, 500),
    date_finished: asOptionalDate(body.date_finished),
    rating: asOptionalNumber(body.rating, { min: 0.5, max: 5 }),
    genre: asOptionalString(body.genre, 100),
    notes: asOptionalString(body.notes, 5000),
    cover_url: asOptionalString(body.cover_url, 2000),
    is_private: asOptionalBool(body.is_private),
    currently_reading: asOptionalBool(body.currently_reading),
    want_to_read: asOptionalBool(body.want_to_read),
    date_started: asOptionalDate(body.date_started),
    page_count: asOptionalNumber(body.page_count, {
      min: 1,
      max: 99999,
      int: true,
    }),
  };
}

function validateGoal(body) {
  return {
    goal: asRequiredNumber(body.goal, { min: 0, max: 9999, int: true }),
  };
}

function compactUndefined(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  );
}

module.exports = {
  validateCreate,
  validateUpdate,
  validateGoal,
  compactUndefined,
};
