/* Native standard-library behavior added by MicroESNext. */
#include <stddef.h>
#include <stdint.h>

#include "mquickjs.h"
#include "mquickjs_priv.h"

#define UNUSED(value) ((void)(value))

static int is_collection(JSContext *ctx, JSValue value, int class_id)
{
    return JS_GetClassID(ctx, value) == class_id;
}

static JSValue collection_from_array(JSContext *ctx, int class_id,
                                     int argc, JSValue *argv)
{
    JSValue collection;
    JSGCRef collection_ref;
    uint32_t length = 0, index;
    int argument_count = argc & ~FRAME_CF_CTOR;

    if (!(argc & FRAME_CF_CTOR))
        return JS_ThrowTypeError(ctx, "collection constructor requires new");
    collection = JS_NewCollection(ctx, class_id);
    if (JS_IsException(collection) || argument_count == 0 ||
        JS_IsUndefined(argv[0]) || JS_IsNull(argv[0]))
        return collection;
    if (!JS_IsArray(ctx, argv[0]))
        return JS_ThrowTypeError(ctx, "collection input must be an array");

    {
        JSValue length_value = JS_GetPropertyStr(ctx, argv[0], "length");
        if (JS_ToUint32(ctx, &length, length_value))
            return JS_EXCEPTION;
    }
    JS_PUSH_VALUE(ctx, collection);
    for (index = 0; index < length; index++) {
        JSValue item = JS_GetPropertyUint32(ctx, argv[0], index);
        JSValue key = item, value = item;
        JSGCRef item_ref, key_ref;
        if (JS_IsException(item)) {
            JS_POP_VALUE(ctx, collection);
            return item;
        }
        JS_PUSH_VALUE(ctx, item);
        if (class_id == JS_CLASS_MAP || class_id == JS_CLASS_WEAK_MAP) {
            if (!JS_IsArray(ctx, item)) {
                JS_POP_VALUE(ctx, item);
                JS_POP_VALUE(ctx, collection);
                return JS_ThrowTypeError(ctx, "Map entry must be an array");
            }
            key = JS_GetPropertyUint32(ctx, item, 0);
            JS_PUSH_VALUE(ctx, key);
            value = JS_GetPropertyUint32(ctx, item, 1);
            JS_POP_VALUE(ctx, key);
        }
        if (JS_CollectionSet(ctx, collection, key, value)) {
            JS_POP_VALUE(ctx, item);
            JS_POP_VALUE(ctx, collection);
            if (class_id == JS_CLASS_WEAK_MAP || class_id == JS_CLASS_WEAK_SET)
                return JS_ThrowTypeError(ctx, "weak collection key must be an object");
            return JS_ThrowOutOfMemory(ctx);
        }
        JS_POP_VALUE(ctx, item);
    }
    JS_POP_VALUE(ctx, collection);
    return collection;
}

JSValue js_map_constructor(JSContext *ctx, JSValue *this_value,
                           int argc, JSValue *argv)
{
    UNUSED(this_value);
    return collection_from_array(ctx, JS_CLASS_MAP, argc, argv);
}

JSValue js_set_constructor(JSContext *ctx, JSValue *this_value,
                           int argc, JSValue *argv)
{
    UNUSED(this_value);
    return collection_from_array(ctx, JS_CLASS_SET, argc, argv);
}

JSValue js_weak_map_constructor(JSContext *ctx, JSValue *this_value,
                                int argc, JSValue *argv)
{
    UNUSED(this_value);
    return collection_from_array(ctx, JS_CLASS_WEAK_MAP, argc, argv);
}

JSValue js_weak_set_constructor(JSContext *ctx, JSValue *this_value,
                                int argc, JSValue *argv)
{
    UNUSED(this_value);
    return collection_from_array(ctx, JS_CLASS_WEAK_SET, argc, argv);
}

static int strong_class(int magic)
{
    return magic ? JS_CLASS_SET : JS_CLASS_MAP;
}

static int weak_class(int magic)
{
    return magic ? JS_CLASS_WEAK_SET : JS_CLASS_WEAK_MAP;
}

JSValue js_collection_clear(JSContext *ctx, JSValue *this_value,
                            int argc, JSValue *argv, int magic)
{
    UNUSED(argc); UNUSED(argv);
    if (!is_collection(ctx, *this_value, strong_class(magic)))
        return JS_ThrowTypeError(ctx, "incompatible collection receiver");
    JS_CollectionClear(ctx, *this_value);
    return JS_UNDEFINED;
}

JSValue js_collection_delete(JSContext *ctx, JSValue *this_value,
                             int argc, JSValue *argv, int magic)
{
    if (!is_collection(ctx, *this_value, strong_class(magic)))
        return JS_ThrowTypeError(ctx, "incompatible collection receiver");
    return JS_NewBool(argc > 0 && JS_CollectionDelete(ctx, *this_value, argv[0]));
}

JSValue js_collection_has(JSContext *ctx, JSValue *this_value,
                          int argc, JSValue *argv, int magic)
{
    if (!is_collection(ctx, *this_value, strong_class(magic)))
        return JS_ThrowTypeError(ctx, "incompatible collection receiver");
    return JS_NewBool(argc > 0 && JS_CollectionHas(ctx, *this_value, argv[0]));
}

JSValue js_collection_size(JSContext *ctx, JSValue *this_value,
                           int argc, JSValue *argv, int magic)
{
    UNUSED(argc); UNUSED(argv);
    if (!is_collection(ctx, *this_value, strong_class(magic)))
        return JS_ThrowTypeError(ctx, "incompatible collection receiver");
    return JS_NewInt32(ctx, (int32_t)JS_CollectionSize(ctx, *this_value));
}

JSValue js_collection_iterator(JSContext *ctx, JSValue *this_value,
                               int argc, JSValue *argv, int magic)
{
    int class_id = magic >= 3 ? JS_CLASS_SET : JS_CLASS_MAP;
    int kind = magic >= 3 ? magic - 3 : magic;
    UNUSED(argc); UNUSED(argv);
    if (!is_collection(ctx, *this_value, class_id))
        return JS_ThrowTypeError(ctx, "incompatible collection receiver");
    return JS_NewCollectionIterator(ctx, *this_value, kind);
}

JSValue js_collection_iterator_next(JSContext *ctx, JSValue *this_value,
                                    int argc, JSValue *argv)
{
    JSValue result, key = JS_UNDEFINED, value = JS_UNDEFINED;
    int state, kind;
    UNUSED(argc); UNUSED(argv);
    state = JS_CollectionIteratorNext(ctx, *this_value, &key, &value);
    if (state < 0)
        return JS_ThrowTypeError(ctx, "incompatible collection iterator");
    result = JS_NewObject(ctx);
    if (JS_IsException(result))
        return result;
    JS_SetPropertyStr(ctx, result, "done", JS_NewBool(state == 0));
    if (state == 0)
        return result;
    kind = JS_GetCollectionIteratorKind(ctx, *this_value);
    if (kind == 2) {
        JSValue pair = JS_NewArray(ctx, 2);
        JS_SetPropertyUint32(ctx, pair, 0, key);
        JS_SetPropertyUint32(ctx, pair, 1, value);
        value = pair;
    } else if (kind == 0) {
        value = key;
    }
    JS_SetPropertyStr(ctx, result, "value", value);
    return result;
}

JSValue js_collection_iterator_constructor(JSContext *ctx,
    JSValue *this_value, int argc, JSValue *argv)
{
    UNUSED(this_value); UNUSED(argc); UNUSED(argv);
    return JS_ThrowTypeError(ctx, "collection iterators are not constructible");
}

JSValue js_collection_for_each(JSContext *ctx, JSValue *this_value,
                               int argc, JSValue *argv, int magic)
{
    JSValue iterator, receiver = argc > 1 ? argv[1] : JS_UNDEFINED;
    JSGCRef iterator_ref;
    if (!is_collection(ctx, *this_value, strong_class(magic)) || argc < 1 ||
        !JS_IsFunction(ctx, argv[0]))
        return JS_ThrowTypeError(ctx, "collection callback must be a function");
    iterator = JS_NewCollectionIterator(ctx, *this_value, 2);
    if (JS_IsException(iterator))
        return iterator;
    JS_PUSH_VALUE(ctx, iterator);
    for (;;) {
        JSValue key, value, callback_result;
        int state = JS_CollectionIteratorNext(ctx, iterator, &key, &value);
        if (state <= 0)
            break;
        if (magic)
            value = key;
        JS_PushArg(ctx, *this_value);
        JS_PushArg(ctx, key);
        JS_PushArg(ctx, value);
        JS_PushArg(ctx, argv[0]);
        JS_PushArg(ctx, receiver);
        callback_result = JS_Call(ctx, 3);
        if (JS_IsException(callback_result)) {
            JS_POP_VALUE(ctx, iterator);
            return callback_result;
        }
    }
    JS_POP_VALUE(ctx, iterator);
    return JS_UNDEFINED;
}

JSValue js_map_get(JSContext *ctx, JSValue *this_value,
                   int argc, JSValue *argv)
{
    if (!is_collection(ctx, *this_value, JS_CLASS_MAP))
        return JS_ThrowTypeError(ctx, "incompatible Map receiver");
    return argc ? JS_CollectionGet(ctx, *this_value, argv[0]) : JS_UNDEFINED;
}

JSValue js_map_set(JSContext *ctx, JSValue *this_value,
                   int argc, JSValue *argv)
{
    if (!is_collection(ctx, *this_value, JS_CLASS_MAP))
        return JS_ThrowTypeError(ctx, "incompatible Map receiver");
    if (JS_CollectionSet(ctx, *this_value, argc ? argv[0] : JS_UNDEFINED,
                        argc > 1 ? argv[1] : JS_UNDEFINED))
        return JS_ThrowOutOfMemory(ctx);
    return *this_value;
}

JSValue js_set_add(JSContext *ctx, JSValue *this_value,
                   int argc, JSValue *argv)
{
    JSValue value = argc ? argv[0] : JS_UNDEFINED;
    if (!is_collection(ctx, *this_value, JS_CLASS_SET))
        return JS_ThrowTypeError(ctx, "incompatible Set receiver");
    if (JS_CollectionSet(ctx, *this_value, value, value))
        return JS_ThrowOutOfMemory(ctx);
    return *this_value;
}

JSValue js_weak_collection_delete(JSContext *ctx, JSValue *this_value,
                                  int argc, JSValue *argv, int magic)
{
    if (!is_collection(ctx, *this_value, weak_class(magic)))
        return JS_ThrowTypeError(ctx, "incompatible weak collection receiver");
    return JS_NewBool(argc > 0 && JS_CollectionDelete(ctx, *this_value, argv[0]));
}

JSValue js_weak_collection_has(JSContext *ctx, JSValue *this_value,
                               int argc, JSValue *argv, int magic)
{
    if (!is_collection(ctx, *this_value, weak_class(magic)))
        return JS_ThrowTypeError(ctx, "incompatible weak collection receiver");
    return JS_NewBool(argc > 0 && JS_CollectionHas(ctx, *this_value, argv[0]));
}

JSValue js_weak_map_get(JSContext *ctx, JSValue *this_value,
                        int argc, JSValue *argv)
{
    if (!is_collection(ctx, *this_value, JS_CLASS_WEAK_MAP))
        return JS_ThrowTypeError(ctx, "incompatible WeakMap receiver");
    return argc ? JS_CollectionGet(ctx, *this_value, argv[0]) : JS_UNDEFINED;
}

JSValue js_weak_map_set(JSContext *ctx, JSValue *this_value,
                        int argc, JSValue *argv)
{
    int status;
    if (!is_collection(ctx, *this_value, JS_CLASS_WEAK_MAP))
        return JS_ThrowTypeError(ctx, "incompatible WeakMap receiver");
    if (argc < 2 || JS_GetClassID(ctx, argv[0]) < 0)
        return JS_ThrowTypeError(ctx, "WeakMap key must be an object");
    status = JS_CollectionSet(ctx, *this_value, argv[0], argv[1]);
    if (status == -1)
        return JS_ThrowOutOfMemory(ctx);
    if (status)
        return JS_ThrowTypeError(ctx, "WeakMap key must be an object");
    return *this_value;
}

JSValue js_weak_set_add(JSContext *ctx, JSValue *this_value,
                        int argc, JSValue *argv)
{
    int status;
    if (!is_collection(ctx, *this_value, JS_CLASS_WEAK_SET))
        return JS_ThrowTypeError(ctx, "incompatible WeakSet receiver");
    if (argc < 1 || JS_GetClassID(ctx, argv[0]) < 0)
        return JS_ThrowTypeError(ctx, "WeakSet value must be an object");
    status = JS_CollectionSet(ctx, *this_value, argv[0], JS_TRUE);
    if (status == -1)
        return JS_ThrowOutOfMemory(ctx);
    if (status)
        return JS_ThrowTypeError(ctx, "WeakSet value must be an object");
    return *this_value;
}
