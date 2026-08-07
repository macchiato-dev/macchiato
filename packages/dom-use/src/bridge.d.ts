import { DomUse } from "./index.ts";
export declare const DEFAULT_STORAGE_LIMIT = 10000;
export declare class LocalStorageBackend {
    mode: string;
    allowedKeys: Set<string> | null;
    limit: number;
    storage: Storage | null;
    constructor(config?: any);
    assertEnabled(key: any, value?: string): void;
    getItem(key: any): string;
    setItem(key: any, value: any): void;
    removeItem(key: any): void;
    backend(): Storage;
}
export declare class DomUseHostCapability {
    domUse: DomUse;
    document: any;
    storage: LocalStorageBackend;
    nodes: Map<string, any>;
    nodeIds: WeakMap<object, string>;
    pendingPrune: Set<any>;
    eventDepth: number;
    appRootId: string | null;
    nextId: number;
    constructor(domSchema: any, styleUse: any, options?: any);
    resetDom(): {};
    finishInit(): {};
    register(node: any): string;
    node(id: any): any;
    createElement(tagName: any): {
        id: string;
    };
    createTextNode(text: any): {
        id: string;
    };
    appendChild(parentId: any, childId: any): {};
    removeChild(parentId: any, childId: any): {};
    insertBefore(parentId: any, childId: any, referenceId: any): {};
    setTextContent(id: any, value: any): {};
    setInnerHTML(id: any, html: any): {};
    setAttribute(id: any, name: any, value: any): {};
    removeAttribute(id: any, name: any): {};
    setStyle(id: any, property: any, value: any): {};
    addEventListener(id: any, event: any): {};
    setAppRoot(id: any): {};
    serializeApp(): {
        html: any;
    };
    nodeTag(id: any): {
        tagName: any;
    };
    eventTarget(nodeIds: any, event: any): {
        id: string;
    };
    eventPayload(event: any, payload: any): {
        payload: any;
    };
    beginEvent(): {};
    endEvent(): {};
    pruneChildren(node: any): void;
    pruneTree(node: any): void;
    flushPrunedNodes(): void;
    storageGet(key: any): {
        value: string;
    };
    storageSet(key: any, value: any): {};
    storageRemove(key: any): {};
    dispatch(message: any): {};
}
export declare function controlState(root: any): {
    nodeId: any;
    value: any;
    checked: boolean;
}[];
export declare function eventPathNodeIds(root: any, target: any): any[];
export declare function eventTargetFor(capability: any, root: any, target: any, type: any): any;
export declare function eventPayload(capability: any, type: any, payload: any): any;
export declare function sourceValue(root: any, target: any, options?: any): any;
export declare function dispatchGuestDomEvent(capability: any, sandbox: any, root: any, event: any, type: any, extraPayload?: {}, options?: any): any;
//# sourceMappingURL=bridge.d.ts.map