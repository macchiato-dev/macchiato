/**
 * @macchiato-dev/dom-use
 *
 * Structured DOM access according to a schema — the top-level capability.
 *
 * dom-use depends on html-use and style-use. It passes its createElement
 * factory and schema into html-use at runtime, avoiding a circular dependency.
 */
import { StyleUse } from "@macchiato-dev/style-use";
export declare const URL_CAPABILITY_ATTRIBUTES: readonly string[];
export declare const SVG_URL_REFERENCE_ATTRIBUTES: readonly string[];
export declare const DOM_NETWORK_CAPABILITIES: readonly Readonly<{
    namespace: string;
    tag: string;
    attribute: string;
    effect: string;
}>[];
export declare class DomUseLimits {
    maxTextLength: number;
    maxEventNameLength: number;
    maxAttributeNameLength: number;
    maxAttributeValueLength: number;
    maxAttributes: number;
    maxNodes: number;
    constructor(limits?: any);
}
export declare class DomUseGasState {
    lifecycle: string;
    capacity: number;
    available: number;
    lastRefill: number;
    constructor(lifecycle: string, capacity: number, now?: number);
}
export declare class DomUseState {
    schema: any;
    styleUse: StyleUse;
    gasPolicy: any;
    limits: DomUseLimits;
    constructor(schema?: any, styleUse?: StyleUse);
}
export declare class DomUseGasError extends Error {
    constructor(message: any);
}
declare class GuestNode {
    ownerDocument: GuestDocument;
    parentNode: GuestNode | null;
    children: any[];
    tagName: string;
    constructor(owner: any);
    appendChild(child: any): any;
    insertBefore(newNode: any, referenceNode: any): any;
    removeChild(child: any): any;
    replaceChildren(...children: any[]): void;
}
declare class GuestText extends GuestNode {
    _textContent: string;
    constructor(owner: any, text: any);
    get textContent(): string;
    set textContent(value: string);
}
declare class GuestElement extends GuestNode {
    attributes: Record<string, string>;
    events: Set<string>;
    _style: Record<string, string>;
    _textContent: string;
    constructor(owner: any, tagName: any);
    get textContent(): string;
    set textContent(value: string);
    get id(): string;
    set id(value: string);
    get className(): string;
    set className(value: string);
    get style(): Record<string, string>;
    get styleText(): string;
    setAttribute(name: any, value: any): void;
    getAttribute(name: any): string;
    removeAttribute(name: any): void;
    addEventListener(event: any): void;
    addClass(...classes: any[]): void;
    removeClass(...classes: any[]): void;
    toggleClass(className: any): boolean;
    hasClass(className: any): boolean;
}
declare class GuestDocument {
    domUse: DomUse;
    createdNodes: number;
    gas: any;
    body: GuestElement;
    constructor(domUse: any);
    createElement(tagName: any): GuestElement;
    createTextNode(text: any): GuestText;
}
export declare class DomUse {
    state: DomUseState;
    get schema(): any;
    get styleUse(): StyleUse;
    get _gasPolicy(): any;
    /**
     * @param {object} schema
     * @param {StyleUse} [styleUse]
     */
    constructor(schema?: any, styleUse?: StyleUse);
    createDocument(): GuestDocument;
    createElement(tagName: any, ownerDocument?: any): GuestElement;
    limits(): DomUseLimits;
    gasPolicy(): any;
    createGasState(lifecycle?: string): DomUseGasState;
    gasCapacity(lifecycle: any, policy?: any): number;
    setGasLifecycle(ownerDocument: any, lifecycle: any, now?: number): void;
    refillGas(ownerDocument: any, now?: number): void;
    gasAvailable(ownerDocument: any, now?: number): any;
    gasCost(operation: any, metrics?: any): number;
    spendGas(ownerDocument: any, operation: any, metrics?: any, now?: number): number;
    trackNode(ownerDocument: any): void;
    validateContent(value: any, kind: any): void;
    validateText(value: any): void;
    validateAttributeName(name: any): void;
    validateEventName(event: any): void;
    validateAttributeValue(value: any): void;
    /**
     * Set a node's children by parsing an HTML string.
     * Delegates parsing to html-use with dom-use's factory injected.
     */
    setInnerHTML(node: any, html: any): void;
    /**
     * Parse and sanitize an HTML string through this schema, returning safe HTML.
     *
     * When `container` is supplied, the input is treated as that container's
     * children, so parent/child rules are enforced for the target region that
     * will receive the resulting HTML.
     *
     * @param {string} html
     * @param {object} [options]
     * @param {string|object} [options.container] tag name or descriptor
     * @param {string} [options.container.tagName]
     * @param {object} [options.container.attributes]
     * @param {boolean} [options.includeContainer=false]
     * @param {boolean} [options.strict=false] reject instead of dropping invalid markup
     * @returns {string}
     */
    sanitizeHTML(html: any, options?: any): any;
    /**
     * Serialize a node's children to HTML.
     * Delegates to html-use.
     */
    getInnerHTML(node: any): any;
    /**
     * Serialize a node and its children to HTML.
     */
    getOuterHTML(node: any): any;
    allowedNode(tagName: any): boolean;
    definition(name: any): any;
    parseDefinitionSelector(definition: any): {
        tag: string;
        classes: string[];
    };
    definitionsForTag(tagName: any): any[];
    nodeClasses(node: any): Set<string>;
    definitionMatchesNode(definition: any, node: any): boolean;
    matchingDefinitionsForNode(node: any): any[];
    assertUnambiguousDefinitions(node: any, matches?: any[]): void;
    nodeRules(nodeOrTagName: any): any[];
    allowedAttr(tagNameOrNode: any, attr: any, value: any): boolean;
    urlRuleFor(tagNameOrNode: any, attr: any): any;
    fragmentRuleFor(tagNameOrNode: any): any;
    attrUrls(attr: any, value: any): any[];
    validateAttrUrl(tagNameOrNode: any, attr: any, value: any): void;
    allowedChild(parentNodeOrTag: any, childNodeOrTag: any): boolean;
    childRuleMatches(entry: any, childNodeOrTag: any, childTag?: string): any;
    allowedEvent(tagName: any, event: any): boolean;
    assertAllowedEvent(tagName: any, event: any): void;
    registerEventListener(node: any, event: any): void;
    eventTarget(candidates: any, event: any): any;
    sanitizeEventPayload(event: any, payload?: any): any;
    sanitizeEventText(value: any, kind: any): string;
    sanitizeEventControls(controls?: any[]): {
        nodeId: string;
        value: string;
        checked: boolean;
    }[];
    sanitizeDataTransfer(dataTransfer?: any): {
        data: {};
        effectAllowed: string;
    };
    assertAllowedNode(tagName: any): void;
    assertAllowedAttr(tagNameOrNode: any, attr: any, value: any): void;
    assertAttributeBudget(node: any, attr: any): void;
    validateAppend(parent: any, child: any): void;
    depth(node: any): number;
    height(node: any): number;
}
/** Function-oriented API for callers that keep capability state separate from behavior. */
export declare function createDomDocument(domUse: DomUse): GuestDocument;
export declare function sanitizeDomHtml(domUse: DomUse, html: string, options?: any): any;
export declare function setDomInnerHtml(domUse: DomUse, node: any, html: string): void;
export declare function assertDomAttribute(domUse: DomUse, node: any, name: string, value: unknown): void;
export {};
//# sourceMappingURL=index.d.ts.map