const rule = (parents, attributes = []) => Object.freeze({ parents: Object.freeze(parents), attributes: Object.freeze(attributes) });

export const CONTAINER_ELEMENT_RULES = Object.freeze({
  article: Object.freeze({
    html: rule(["document"], ["lang"]), head: rule(["html"]), meta: rule(["head"], ["charset", "name", "content"]),
    title: rule(["head"]), link: rule(["head"], ["rel", "href"]), body: rule(["html"], ["class"]),
    article: rule(["body", "main"], ["class"]), header: rule(["article"], ["class"]), h1: rule(["article", "header"], ["class", "id"]),
    p: rule(["article", "header", "li"], ["class"]), a: rule(["p", "li"], ["href", "title"]), strong: rule(["p", "li", "a"]),
    em: rule(["p", "li", "a"]), ul: rule(["article"], ["class"]), li: rule(["ul"], ["class"]), code: rule(["p", "li"], ["class"]),
  }),
  page: Object.freeze({
    html: rule(["document"], ["lang"]), head: rule(["html"]), meta: rule(["head"], ["charset", "name", "content"]),
    title: rule(["head"]), link: rule(["head"], ["rel", "href"]), body: rule(["html"], ["class"]), main: rule(["body"], ["class", "id"]),
    section: rule(["main", "section"], ["class", "id"]), header: rule(["body", "main", "section"], ["class"]), footer: rule(["body", "main", "section"], ["class"]),
    h1: rule(["main", "header", "section"], ["class", "id"]), h2: rule(["main", "section"], ["class", "id"]), p: rule(["main", "section", "footer"], ["class"]),
    a: rule(["p", "li", "header", "footer"], ["href", "title"]), img: rule(["main", "section", "a"], ["src", "alt", "width", "height"]),
    ul: rule(["main", "section"], ["class"]), li: rule(["ul"], ["class"]),
  }),
  canvas: Object.freeze({ html: rule(["document"], ["lang"]), head: rule(["html"]), meta: rule(["head"], ["charset"]), title: rule(["head"]), body: rule(["html"], ["class"]), canvas: rule(["body"], ["width", "height", "aria-label"]), script: rule(["body"], ["src"]) }),
  svg: Object.freeze({ svg: rule(["document", "body"], ["viewBox", "role", "aria-labelledby"]), title: rule(["svg"], ["id"]), g: rule(["svg", "g"], ["fill", "stroke", "transform"]), path: rule(["svg", "g"], ["d", "fill", "stroke"]), rect: rule(["svg", "g"], ["x", "y", "width", "height", "fill"]), circle: rule(["svg", "g"], ["cx", "cy", "r", "fill"]), line: rule(["svg", "g"], ["x1", "y1", "x2", "y2", "stroke"]), text: rule(["svg", "g"], ["x", "y", "fill"]) }),
});

export function containerElementNames(container) {
  return Object.keys(CONTAINER_ELEMENT_RULES[container] || {});
}

export function describeContainerElement(container, element) {
  const value = CONTAINER_ELEMENT_RULES[container]?.[element];
  if (!value) return "No rule is configured.";
  return `Parents: ${value.parents.join(", ")}. Attributes: ${value.attributes.length ? value.attributes.join(", ") : "none"}.`;
}
