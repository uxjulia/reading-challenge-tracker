const { test } = require("node:test");
const assert = require("node:assert");
const { toSqlValue } = require("./db");

test("toSqlValue - boolean true returns 1", () => {
  assert.strictEqual(toSqlValue(true), 1);
});

test("toSqlValue - boolean false returns 0", () => {
  assert.strictEqual(toSqlValue(false), 0);
});

test("toSqlValue - string remains unchanged", () => {
  assert.strictEqual(toSqlValue("hello"), "hello");
});

test("toSqlValue - number remains unchanged", () => {
  assert.strictEqual(toSqlValue(42), 42);
});

test("toSqlValue - null remains unchanged", () => {
  assert.strictEqual(toSqlValue(null), null);
});

test("toSqlValue - undefined remains unchanged", () => {
  assert.strictEqual(toSqlValue(undefined), undefined);
});

test("toSqlValue - object remains unchanged", () => {
  const obj = { key: "value" };
  assert.strictEqual(toSqlValue(obj), obj);
});
