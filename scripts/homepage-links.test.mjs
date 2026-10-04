import test from "node:test";
import assert from "node:assert/strict";
import { isHomepageIndexLink } from "./homepage-links.mjs";

const fail = ["/index.html", "/index.html#quote", "/index.html#certifications",
  "https://2dcreation.in/index.html", "https://2dcreation.in/index.html#quote",
  "https://www.2dcreation.in/index.html", "/index.html?x=1"];
const pass = ["/", "/#quote", "/#certifications", "https://2dcreation.in/", "https://2dcreation.in/#quote",
  "https://example.com/index.html", "https://example.com/index.html#quote", "/blog/", "/blog/index.html",
  "mailto:a@b.co", "#quote", "https://wa.me/919791881884"];

for (const href of fail) test(`FAIL ${href}`, () => assert.equal(isHomepageIndexLink(href), true));
for (const href of pass) test(`PASS ${href}`, () => assert.equal(isHomepageIndexLink(href), false));

test("relative links resolve against the page's directory", () => {
  assert.equal(isHomepageIndexLink("index.html", ""), true);        // root page -> homepage
  assert.equal(isHomepageIndexLink("./index.html#quote", ""), true);
  assert.equal(isHomepageIndexLink("../index.html", "blog"), true);  // blog page -> homepage
  assert.equal(isHomepageIndexLink("index.html", "blog"), false);    // blog page -> blog index, not homepage
});
