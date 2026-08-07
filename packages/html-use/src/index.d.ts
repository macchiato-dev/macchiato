/**
 * @macchiato-dev/html-use
 *
 * HTML parser, serializer, and sanitizer — used by dom-use.
 *
 * html-use does NOT depend on dom-use. Instead, dom-use passes its
 * createElement factory and schema into html-use at runtime.
 */
import { StyleUse } from "@macchiato-dev/style-use";
export interface HtmlNodeLike {
    tagName: string;
    children?: HtmlNodeLike[];
    parentNode?: HtmlNodeLike | null;
    attributes?: Record<string, unknown>;
    textContent?: unknown;
    styleText?: string;
    setAttribute?: (name: string, value: unknown) => void;
    appendChild?: (child: HtmlNodeLike) => HtmlNodeLike;
}
export interface ParseHtmlOptions {
    createElement: (tagName: string) => HtmlNodeLike;
    createTextNode?: (text: string) => HtmlNodeLike;
    schema?: any;
    styleUse?: StyleUse;
    strict?: boolean;
}
export declare class HtmlFragment {
    tagName: string;
    children: HtmlNodeLike[];
    parentNode: HtmlNodeLike | null;
    appendChild(child: HtmlNodeLike): HtmlNodeLike;
    removeChild(child: HtmlNodeLike): HtmlNodeLike;
}
/**
 * Parse an HTML string into a tree of guest nodes.
 *
 * @param {string} html
 * @param {object} options
 * @param {(tagName: string) => object} options.createElement — factory from dom-use
 * @param {object} [options.schema] — dom-use schema for validation
 * @param {StyleUse} [options.styleUse] — for CSS validation
 * @returns {object} root fragment node
 */
export declare function parseHTML(html: string, { createElement, createTextNode, schema, styleUse, strict }: ParseHtmlOptions): HtmlFragment;
/**
 * Serialize a guest node tree to an HTML string.
 *
 * @param {object} node — guest DOM node
 * @returns {string}
 */
export declare function serializeHTML(node: any): any;
/**
 * Parse, validate against a schema, and return a clean HTML string.
 *
 * @param {string} html
 * @param {object} options
 * @param {object} [options.schema]
 * @param {StyleUse} [options.styleUse]
 * @returns {string} sanitized HTML
 */
export declare function sanitizeHTML(html: any, { schema, styleUse }: {
    schema: any;
    styleUse: any;
}): any;
//# sourceMappingURL=index.d.ts.map