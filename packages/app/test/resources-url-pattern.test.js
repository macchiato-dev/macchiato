import assert from "node:assert/strict";
import test from "node:test";
import { compileAllowedUrlPattern, urlMatchesAllowedPatterns, validateAllowedUrlPatterns } from "../../../packages/website/models/url-pattern.js";

test("resource URL patterns support wildcard hosts and paths", () => {
  assert.equal(urlMatchesAllowedPatterns("https://en.wikipedia.org/wiki/Hypertext", ["*.wikipedia.org"]), true);
  assert.equal(urlMatchesAllowedPatterns("https://wikipedia.org/wiki/Hypertext", ["*.wikipedia.org"]), false);
  assert.equal(urlMatchesAllowedPatterns("https://en.wikipedia.org/wiki/Hypertext", ["*.wikipedia.org/wiki/*"]), true);
  assert.equal(urlMatchesAllowedPatterns("https://en.wikipedia.org/about", ["*.wikipedia.org/wiki/*"]), false);
  assert.equal(urlMatchesAllowedPatterns("https://en.wikipedia.org.evil.test/wiki/Hypertext", ["*.wikipedia.org"]), false);
});

test("resource URL patterns support exact URLs and JavaScript regex syntax", () => {
  const exact = compileAllowedUrlPattern("`https://example.test/a?x=1`");
  assert.equal(exact("https://example.test/a?x=1"), true);
  assert.equal(exact("https://example.test/a?x=2"), false);
  assert.equal(urlMatchesAllowedPatterns("https://docs.example.test/Guide", ["/^https:\\/\\/docs\\.example\\.test\\/guide$/i"]), true);
  assert.throws(() => validateAllowedUrlPatterns(["`https://example.test"]), /matching backquotes/);
  assert.throws(() => validateAllowedUrlPatterns(["not-a-host"]), /hostname/);
});
