import { parse } from "parse5";

export function htmlMetadata(html) {
  const result = { title: "", description: "", h1Count: 0 };
  function visit(node) {
    if (node.tagName === "title") {
      result.title = node.childNodes.map(child => child.value || "").join("").trim();
    }
    if (node.tagName === "meta") {
      const attrs = new Map(node.attrs.map(attr => [attr.name, attr.value]));
      if (attrs.get("name")?.toLowerCase() === "description") {
        result.description = (attrs.get("content") || "").trim();
      }
    }
    if (node.tagName === "h1") result.h1Count += 1;
    for (const child of node.childNodes || []) visit(child);
  }
  visit(parse(html));
  return result;
}
