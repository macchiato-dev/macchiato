/**
 * @macchiato-dev/style-use
 *
 * Govern permitted CSS styles — inline and stylesheet.
 */
export declare class StyleUseLimits {
    maxStylesheetLength: number;
    maxPropertyLength: number;
    maxValueLength: number;
    maxUrlLength: number;
    maxImports: number;
    constructor(limits?: any);
}
export declare function normalizeCssProperty(property: unknown): string;
export declare class StyleUseState {
    schema: any;
    limits: StyleUseLimits;
    properties: Record<string, any>;
    constructor(schema?: any);
}
export declare class StyleUse {
    state: StyleUseState;
    get schema(): any;
    /**
     * @param {object} schema
     */
    constructor(schema?: any);
    assertUnambiguousDefinitions(): void;
    normalizeProperty(property: any): string;
    limits(): StyleUseLimits;
    styleDefinition(name: any): any;
    effectiveProperties(): Record<string, any>;
    validateContent(value: any, kind: any): void;
    isAllowedByRule(rule: any, value: any, property: any): any;
    extractUrls(value: any): any[];
    validateUrl(url: any, property?: string): boolean;
    extractImportUrls(css: any): any[];
    rejectDangerousValue(value: any): boolean;
    /**
     * Validate an inline style declaration.
     * @param {string} property
     * @param {string} value
     * @returns {boolean}
     */
    validateInline(property: any, value: any): boolean;
    /**
     * Validate a CSS stylesheet text.
     * @param {string} css
     * @returns {boolean}
     */
    validateStylesheet(css: any): boolean;
}
/** Function-oriented API; the StyleUse instance remains the explicit state holder. */
export declare function validateInlineStyle(styleUse: StyleUse, property: string, value: unknown): boolean;
export declare function validateCssStylesheet(styleUse: StyleUse, css: string): boolean;
export declare function extractCssUrls(styleUse: StyleUse, value: unknown): any[];
//# sourceMappingURL=index.d.ts.map