import assert from "node:assert/strict";
import test from "node:test";
import { htmlMetadata } from "./html-metadata.mjs";

test("metadata entities are decoded exactly once", () => {
  const result = htmlMetadata('<title>&amp;lt; &lt; &#65; &#x1F600;</title><meta content="&amp;quot; &quot; &rsquo;" name="description"><h1>Heading</h1>');
  assert.deepEqual(result, { title: "&lt; < A 😀", description: '&quot; " ’', h1Count: 1 });
});

test("only real headings count with browser-accepted script end tags", () => {
  const result = htmlMetadata('<script>"<h1>fake</h1>"</script data-x><style>/* <h1>fake</h1> */</style ><h1 title=">">Real</h1><!-- <h1>comment</h1> --><textarea><h1>text</h1></textarea><template><h1>inert</h1></template>');
  assert.equal(result.h1Count, 1);
});

test("missing metadata and multiple headings are reported", () => {
  assert.deepEqual(htmlMetadata(""), { title: "", description: "", h1Count: 0 });
  assert.equal(htmlMetadata('<h1>One</h1><h1>Two</h1>').h1Count, 2);
});
