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

enum {
    PROMISE_PENDING,
    PROMISE_FULFILLED,
    PROMISE_REJECTED,
};

static int array_length(JSContext *ctx, JSValue array, uint32_t *length)
{
    JSValue value = JS_GetPropertyStr(ctx, array, "length");
    return JS_IsException(value) || JS_ToUint32(ctx, length, value);
}

static int array_push(JSContext *ctx, JSValue array, JSValue value)
{
    uint32_t length;
    if (array_length(ctx, array, &length))
        return -1;
    return JS_IsException(JS_SetPropertyUint32(ctx, array, length, value)) ? -1 : 0;
}

static int promise_state(JSContext *ctx, JSValue promise)
{
    JSValue data = JS_GetPromiseData(ctx, promise);
    JSValue state;
    int32_t result;
    if (JS_IsException(data))
        return -1;
    state = JS_GetPropertyUint32(ctx, data, 0);
    return JS_ToInt32(ctx, &result, state) ? -1 : result;
}

static JSValue promise_result(JSContext *ctx, JSValue promise)
{
    JSValue data = JS_GetPromiseData(ctx, promise);
    return JS_IsException(data) ? data : JS_GetPropertyUint32(ctx, data, 1);
}

static JSValue new_resolver(JSContext *ctx, JSValue promise, int reject)
{
    JSValue params, resolver;
    JSGCRef params_ref;
    params = JS_NewArray(ctx, 2);
    if (JS_IsException(params))
        return params;
    JS_PUSH_VALUE(ctx, params);
    JS_SetPropertyUint32(ctx, params, 0, promise);
    JS_SetPropertyUint32(ctx, params, 1, JS_NewBool(reject));
    resolver = JS_NewCFunctionParams(ctx, JS_CFUNCTION_promise_resolver, params);
    JS_POP_VALUE(ctx, params);
    return resolver;
}

static int enqueue_reaction(JSContext *ctx, JSValue reaction,
                            JSValue value, int rejected)
{
    JSValue job = JS_NewArray(ctx, 5);
    JSGCRef job_ref;
    if (JS_IsException(job))
        return -1;
    JS_PUSH_VALUE(ctx, job);
    JS_SetPropertyUint32(ctx, job, 0,
                         JS_GetPropertyUint32(ctx, reaction, 0));
    JS_SetPropertyUint32(ctx, job, 1,
                         JS_GetPropertyUint32(ctx, reaction, 1));
    JS_SetPropertyUint32(ctx, job, 2,
                         JS_GetPropertyUint32(ctx, reaction, 2));
    JS_SetPropertyUint32(ctx, job, 3, value);
    JS_SetPropertyUint32(ctx, job, 4, JS_NewBool(rejected));
    {
        int status = JS_EnqueuePromiseJob(ctx, job);
        JS_POP_VALUE(ctx, job);
        return status;
    }
}

static int settle_raw_inner(JSContext *ctx, JSValue promise,
                            JSValue value, int rejected)
{
    JSValue data, reactions;
    JSGCRef data_ref, reactions_ref;
    uint32_t length, index;
    if (promise_state(ctx, promise) != PROMISE_PENDING)
        return 0;
    data = JS_GetPromiseData(ctx, promise);
    if (JS_IsException(data))
        return -1;
    JS_PUSH_VALUE(ctx, data);
    reactions = JS_GetPropertyUint32(ctx, data, 2);
    JS_PUSH_VALUE(ctx, reactions);
    JS_SetPropertyUint32(ctx, data, 0,
        JS_NewInt32(ctx, rejected ? PROMISE_REJECTED : PROMISE_FULFILLED));
    JS_SetPropertyUint32(ctx, data, 1, value);
    JS_SetPropertyUint32(ctx, data, 2, JS_NewArray(ctx, 0));
    if (array_length(ctx, reactions, &length)) {
        JS_POP_VALUE(ctx, reactions);
        JS_POP_VALUE(ctx, data);
        return -1;
    }
    for (index = 0; index < length; index++) {
        JSValue reaction = JS_GetPropertyUint32(ctx, reactions, index);
        JSGCRef reaction_ref;
        JS_PUSH_VALUE(ctx, reaction);
        if (enqueue_reaction(ctx, reaction, value, rejected)) {
            JS_POP_VALUE(ctx, reaction);
            JS_POP_VALUE(ctx, reactions);
            JS_POP_VALUE(ctx, data);
            return -1;
        }
        JS_POP_VALUE(ctx, reaction);
    }
    JS_POP_VALUE(ctx, reactions);
    JS_POP_VALUE(ctx, data);
    return 0;
}

static int settle_raw(JSContext *ctx, JSValue promise,
                      JSValue value, int rejected)
{
    JSGCRef promise_ref, value_ref;
    int status;
    JS_PUSH_VALUE(ctx, promise);
    JS_PUSH_VALUE(ctx, value);
    status = settle_raw_inner(ctx, promise, value, rejected);
    JS_POP_VALUE(ctx, value);
    JS_POP_VALUE(ctx, promise);
    return status;
}

static JSValue promise_then_native(JSContext *ctx, JSValue promise,
                                   JSValue fulfilled, JSValue rejected);

static int resolve_promise_inner(JSContext *ctx, JSValue promise, JSValue value)
{
    JSValue then, resolve, reject, result;
    JSGCRef value_ref, resolve_ref, reject_ref;
    int state;
    if (promise_state(ctx, promise) != PROMISE_PENDING)
        return 0;
    if (promise == value) {
        JSValue error = JS_ThrowTypeError(ctx, "promise cannot resolve itself");
        UNUSED(error);
        return settle_raw(ctx, promise, JS_GetException(ctx), 1);
    }
    state = promise_state(ctx, value);
    if (state >= PROMISE_PENDING) {
        JSValue reaction, data, reactions;
        JSGCRef reaction_ref, reactions_ref;
        /* Attach directly to avoid creating an otherwise unreachable link. */
        data = JS_GetPromiseData(ctx, value);
        if (state == PROMISE_PENDING) {
            reactions = JS_GetPropertyUint32(ctx, data, 2);
            JS_PUSH_VALUE(ctx, reactions);
            reaction = JS_NewArray(ctx, 3);
            JS_PUSH_VALUE(ctx, reaction);
            JS_SetPropertyUint32(ctx, reaction, 0, JS_UNDEFINED);
            JS_SetPropertyUint32(ctx, reaction, 1, JS_UNDEFINED);
            JS_SetPropertyUint32(ctx, reaction, 2, promise);
            if (array_push(ctx, reactions, reaction)) {
                JS_POP_VALUE(ctx, reaction);
                JS_POP_VALUE(ctx, reactions);
                return -1;
            }
            JS_POP_VALUE(ctx, reaction);
            JS_POP_VALUE(ctx, reactions);
            return 0;
        }
        return settle_raw(ctx, promise, promise_result(ctx, value),
                          state == PROMISE_REJECTED);
    }
    if (JS_GetClassID(ctx, value) < 0)
        return settle_raw(ctx, promise, value, 0);

    JS_PUSH_VALUE(ctx, value);
    then = JS_GetPropertyStr(ctx, value, "then");
    if (JS_IsException(then)) {
        JS_POP_VALUE(ctx, value);
        return settle_raw(ctx, promise, JS_GetException(ctx), 1);
    }
    if (!JS_IsFunction(ctx, then)) {
        JS_POP_VALUE(ctx, value);
        return settle_raw(ctx, promise, value, 0);
    }
    {
        JSGCRef then_ref;
        JS_PUSH_VALUE(ctx, then);
        resolve = new_resolver(ctx, promise, 0);
        JS_PUSH_VALUE(ctx, resolve);
        reject = new_resolver(ctx, promise, 1);
        JS_PUSH_VALUE(ctx, reject);
        JS_PushArg(ctx, reject);
        JS_PushArg(ctx, resolve);
        JS_PushArg(ctx, then);
        JS_PushArg(ctx, value);
        result = JS_Call(ctx, 2);
        JS_POP_VALUE(ctx, reject);
        JS_POP_VALUE(ctx, resolve);
        JS_POP_VALUE(ctx, then);
    }
    JS_POP_VALUE(ctx, value);
    if (JS_IsException(result))
        return settle_raw(ctx, promise, JS_GetException(ctx), 1);
    return 0;
}

static int resolve_promise(JSContext *ctx, JSValue promise, JSValue value)
{
    JSGCRef promise_ref, value_ref;
    int status;
    JS_PUSH_VALUE(ctx, promise);
    JS_PUSH_VALUE(ctx, value);
    status = resolve_promise_inner(ctx, promise, value);
    JS_POP_VALUE(ctx, value);
    JS_POP_VALUE(ctx, promise);
    return status;
}

static JSValue promise_then_native(JSContext *ctx, JSValue promise,
                                   JSValue fulfilled, JSValue rejected)
{
    JSValue next, reaction, data, reactions, value;
    JSGCRef next_ref, reaction_ref;
    int state = promise_state(ctx, promise);
    if (state < 0)
        return JS_ThrowTypeError(ctx, "incompatible Promise receiver");
    next = JS_NewPromise(ctx);
    if (JS_IsException(next))
        return next;
    JS_PUSH_VALUE(ctx, next);
    reaction = JS_NewArray(ctx, 3);
    if (JS_IsException(reaction)) {
        JS_POP_VALUE(ctx, next);
        return reaction;
    }
    JS_PUSH_VALUE(ctx, reaction);
    JS_SetPropertyUint32(ctx, reaction, 0, fulfilled);
    JS_SetPropertyUint32(ctx, reaction, 1, rejected);
    JS_SetPropertyUint32(ctx, reaction, 2, next);
    if (state == PROMISE_PENDING) {
        data = JS_GetPromiseData(ctx, promise);
        reactions = JS_GetPropertyUint32(ctx, data, 2);
        if (array_push(ctx, reactions, reaction)) {
            JS_POP_VALUE(ctx, reaction);
            JS_POP_VALUE(ctx, next);
            return JS_ThrowOutOfMemory(ctx);
        }
    } else {
        value = promise_result(ctx, promise);
        if (enqueue_reaction(ctx, reaction, value, state == PROMISE_REJECTED)) {
            JS_POP_VALUE(ctx, reaction);
            JS_POP_VALUE(ctx, next);
            return JS_ThrowOutOfMemory(ctx);
        }
    }
    JS_POP_VALUE(ctx, reaction);
    JS_POP_VALUE(ctx, next);
    return next;
}

JSValue js_promise_resolver(JSContext *ctx, JSValue *this_value,
                            int argc, JSValue *argv, JSValue params)
{
    JSValue promise = JS_GetPropertyUint32(ctx, params, 0);
    JSValue reject_value = JS_GetPropertyUint32(ctx, params, 1);
    int reject = JS_VALUE_GET_SPECIAL_VALUE(reject_value) != 0;
    UNUSED(this_value);
    if (reject)
        settle_raw(ctx, promise, argc ? argv[0] : JS_UNDEFINED, 1);
    else
        resolve_promise(ctx, promise, argc ? argv[0] : JS_UNDEFINED);
    return JS_UNDEFINED;
}

JSValue js_promise_constructor(JSContext *ctx, JSValue *this_value,
                               int argc, JSValue *argv)
{
    JSValue promise, resolve, reject, result;
    JSGCRef promise_ref, resolve_ref, reject_ref;
    int argument_count = argc & ~FRAME_CF_CTOR;
    UNUSED(this_value);
    if (!(argc & FRAME_CF_CTOR) || argument_count < 1 ||
        !JS_IsFunction(ctx, argv[0]))
        return JS_ThrowTypeError(ctx, "Promise executor must be a function");
    promise = JS_NewPromise(ctx);
    if (JS_IsException(promise))
        return promise;
    JS_PUSH_VALUE(ctx, promise);
    resolve = new_resolver(ctx, promise, 0);
    JS_PUSH_VALUE(ctx, resolve);
    reject = new_resolver(ctx, promise, 1);
    JS_PUSH_VALUE(ctx, reject);
    JS_PushArg(ctx, reject);
    JS_PushArg(ctx, resolve);
    JS_PushArg(ctx, argv[0]);
    JS_PushArg(ctx, JS_UNDEFINED);
    result = JS_Call(ctx, 2);
    JS_POP_VALUE(ctx, reject);
    JS_POP_VALUE(ctx, resolve);
    if (JS_IsException(result))
        settle_raw(ctx, promise, JS_GetException(ctx), 1);
    JS_POP_VALUE(ctx, promise);
    return promise;
}

JSValue js_promise_then(JSContext *ctx, JSValue *this_value,
                        int argc, JSValue *argv)
{
    return promise_then_native(ctx, *this_value,
        argc > 0 && JS_IsFunction(ctx, argv[0]) ? argv[0] : JS_UNDEFINED,
        argc > 1 && JS_IsFunction(ctx, argv[1]) ? argv[1] : JS_UNDEFINED);
}

JSValue js_promise_catch(JSContext *ctx, JSValue *this_value,
                         int argc, JSValue *argv)
{
    return promise_then_native(ctx, *this_value, JS_UNDEFINED,
        argc > 0 && JS_IsFunction(ctx, argv[0]) ? argv[0] : JS_UNDEFINED);
}

static JSValue promise_resolved_value(JSContext *ctx, JSValue value)
{
    JSValue promise;
    if (promise_state(ctx, value) >= PROMISE_PENDING)
        return value;
    promise = JS_NewPromise(ctx);
    if (!JS_IsException(promise))
        resolve_promise(ctx, promise, value);
    return promise;
}

JSValue js_promise_resolve(JSContext *ctx, JSValue *this_value,
                           int argc, JSValue *argv)
{
    UNUSED(this_value);
    return promise_resolved_value(ctx, argc ? argv[0] : JS_UNDEFINED);
}

JSValue js_promise_reject(JSContext *ctx, JSValue *this_value,
                          int argc, JSValue *argv)
{
    JSValue promise = JS_NewPromise(ctx);
    UNUSED(this_value);
    if (!JS_IsException(promise))
        settle_raw(ctx, promise, argc ? argv[0] : JS_UNDEFINED, 1);
    return promise;
}

static JSValue promise_array_method(JSContext *ctx, int argc, JSValue *argv,
                                    int race)
{
    JSValue aggregate, input;
    JSGCRef aggregate_ref;
    uint32_t length, index;
    if (argc < 1 || !JS_IsArray(ctx, argv[0]))
        return JS_ThrowTypeError(ctx, "Promise input must be an array");
    aggregate = JS_NewPromise(ctx);
    if (JS_IsException(aggregate))
        return aggregate;
    JS_PUSH_VALUE(ctx, aggregate);
    input = argv[0];
    if (array_length(ctx, input, &length)) {
        JS_POP_VALUE(ctx, aggregate);
        return JS_EXCEPTION;
    }
    if (!race && length == 0) {
        JSValue empty = JS_NewArray(ctx, 0);
        JSGCRef empty_ref;
        JS_PUSH_VALUE(ctx, empty);
        resolve_promise(ctx, aggregate, empty);
        JS_POP_VALUE(ctx, empty);
    } else if (!race) {
        JSValue results = JS_NewArray(ctx, length);
        JSValue counter;
        JSGCRef results_ref, counter_ref;
        JS_PUSH_VALUE(ctx, results);
        counter = JS_NewArray(ctx, 1);
        JS_PUSH_VALUE(ctx, counter);
        JS_SetPropertyUint32(ctx, counter, 0, JS_NewInt32(ctx, (int32_t)length));
        for (index = 0; index < length; index++) {
            JSValue item = JS_GetPropertyUint32(ctx, input, index);
            JSValue resolved = promise_resolved_value(ctx, item);
            JSValue params;
            JSValue element, reject;
            JSGCRef resolved_ref, params_ref, element_ref, reject_ref;
            JS_PUSH_VALUE(ctx, resolved);
            params = JS_NewArray(ctx, 4);
            JS_PUSH_VALUE(ctx, params);
            JS_SetPropertyUint32(ctx, params, 0, aggregate);
            JS_SetPropertyUint32(ctx, params, 1, results);
            JS_SetPropertyUint32(ctx, params, 2, counter);
            JS_SetPropertyUint32(ctx, params, 3, JS_NewInt32(ctx, (int32_t)index));
            element = JS_NewCFunctionParams(ctx,
                JS_CFUNCTION_promise_all_element, params);
            JS_PUSH_VALUE(ctx, element);
            reject = new_resolver(ctx, aggregate, 1);
            JS_PUSH_VALUE(ctx, reject);
            promise_then_native(ctx, resolved, element, reject);
            JS_POP_VALUE(ctx, reject);
            JS_POP_VALUE(ctx, element);
            JS_POP_VALUE(ctx, params);
            JS_POP_VALUE(ctx, resolved);
        }
        JS_POP_VALUE(ctx, counter);
        JS_POP_VALUE(ctx, results);
    } else {
        for (index = 0; index < length; index++) {
            JSValue item = JS_GetPropertyUint32(ctx, input, index);
            JSValue resolved = promise_resolved_value(ctx, item);
            JSGCRef resolved_ref, resolve_ref, reject_ref;
            JS_PUSH_VALUE(ctx, resolved);
            JSValue resolve = new_resolver(ctx, aggregate, 0);
            JS_PUSH_VALUE(ctx, resolve);
            JSValue reject = new_resolver(ctx, aggregate, 1);
            JS_PUSH_VALUE(ctx, reject);
            promise_then_native(ctx, resolved, resolve, reject);
            JS_POP_VALUE(ctx, reject);
            JS_POP_VALUE(ctx, resolve);
            JS_POP_VALUE(ctx, resolved);
        }
    }
    JS_POP_VALUE(ctx, aggregate);
    return aggregate;
}

JSValue js_promise_all(JSContext *ctx, JSValue *this_value,
                       int argc, JSValue *argv)
{
    UNUSED(this_value);
    return promise_array_method(ctx, argc, argv, 0);
}

JSValue js_promise_race(JSContext *ctx, JSValue *this_value,
                        int argc, JSValue *argv)
{
    UNUSED(this_value);
    return promise_array_method(ctx, argc, argv, 1);
}

JSValue js_promise_all_element(JSContext *ctx, JSValue *this_value,
                               int argc, JSValue *argv, JSValue params)
{
    JSValue aggregate = JS_GetPropertyUint32(ctx, params, 0);
    JSValue results = JS_GetPropertyUint32(ctx, params, 1);
    JSValue counter = JS_GetPropertyUint32(ctx, params, 2);
    JSValue index_value = JS_GetPropertyUint32(ctx, params, 3);
    JSValue remaining_value = JS_GetPropertyUint32(ctx, counter, 0);
    int32_t index, remaining;
    UNUSED(this_value);
    if (promise_state(ctx, aggregate) != PROMISE_PENDING ||
        JS_ToInt32(ctx, &index, index_value) ||
        JS_ToInt32(ctx, &remaining, remaining_value))
        return JS_UNDEFINED;
    JS_SetPropertyUint32(ctx, results, (uint32_t)index,
                         argc ? argv[0] : JS_UNDEFINED);
    remaining--;
    JS_SetPropertyUint32(ctx, counter, 0, JS_NewInt32(ctx, remaining));
    if (remaining == 0)
        resolve_promise(ctx, aggregate, results);
    return JS_UNDEFINED;
}

JSValue js_promise_finally(JSContext *ctx, JSValue *this_value,
                           int argc, JSValue *argv)
{
    JSValue fulfilled, rejected, fulfilled_params, rejected_params;
    JSGCRef fulfilled_ref, rejected_ref, fulfilled_params_ref,
        rejected_params_ref;
    if (promise_state(ctx, *this_value) < 0)
        return JS_ThrowTypeError(ctx, "incompatible Promise receiver");
    if (argc < 1 || !JS_IsFunction(ctx, argv[0]))
        return promise_then_native(ctx, *this_value,
                                   JS_UNDEFINED, JS_UNDEFINED);
    fulfilled_params = JS_NewArray(ctx, 2);
    JS_PUSH_VALUE(ctx, fulfilled_params);
    JS_SetPropertyUint32(ctx, fulfilled_params, 0, argv[0]);
    JS_SetPropertyUint32(ctx, fulfilled_params, 1, JS_FALSE);
    fulfilled = JS_NewCFunctionParams(ctx,
        JS_CFUNCTION_promise_finally, fulfilled_params);
    JS_PUSH_VALUE(ctx, fulfilled);
    rejected_params = JS_NewArray(ctx, 2);
    JS_PUSH_VALUE(ctx, rejected_params);
    JS_SetPropertyUint32(ctx, rejected_params, 0, argv[0]);
    JS_SetPropertyUint32(ctx, rejected_params, 1, JS_TRUE);
    rejected = JS_NewCFunctionParams(ctx,
        JS_CFUNCTION_promise_finally, rejected_params);
    JS_PUSH_VALUE(ctx, rejected);
    {
        JSValue next = promise_then_native(ctx, *this_value, fulfilled, rejected);
        JS_POP_VALUE(ctx, rejected);
        JS_POP_VALUE(ctx, rejected_params);
        JS_POP_VALUE(ctx, fulfilled);
        JS_POP_VALUE(ctx, fulfilled_params);
        return next;
    }
}

JSValue js_promise_finally_handler(JSContext *ctx, JSValue *this_value,
                                   int argc, JSValue *argv, JSValue params)
{
    JSValue callback = JS_GetPropertyUint32(ctx, params, 0);
    JSValue rejected = JS_GetPropertyUint32(ctx, params, 1);
    JSValue callback_result, resolved, propagate_params, propagate;
    JSGCRef resolved_ref, propagate_params_ref, propagate_ref;
    UNUSED(this_value);
    JS_PushArg(ctx, callback);
    JS_PushArg(ctx, JS_UNDEFINED);
    callback_result = JS_Call(ctx, 0);
    if (JS_IsException(callback_result))
        return callback_result;
    {
        JSGCRef callback_result_ref;
        JS_PUSH_VALUE(ctx, callback_result);
        resolved = promise_resolved_value(ctx, callback_result);
        JS_POP_VALUE(ctx, callback_result);
    }
    JS_PUSH_VALUE(ctx, resolved);
    propagate_params = JS_NewArray(ctx, 2);
    JS_PUSH_VALUE(ctx, propagate_params);
    JS_SetPropertyUint32(ctx, propagate_params, 0,
                         argc ? argv[0] : JS_UNDEFINED);
    JS_SetPropertyUint32(ctx, propagate_params, 1, rejected);
    propagate = JS_NewCFunctionParams(ctx,
        JS_CFUNCTION_promise_finally_value, propagate_params);
    JS_PUSH_VALUE(ctx, propagate);
    {
        JSValue next = promise_then_native(ctx, resolved, propagate, JS_UNDEFINED);
        JS_POP_VALUE(ctx, propagate);
        JS_POP_VALUE(ctx, propagate_params);
        JS_POP_VALUE(ctx, resolved);
        return next;
    }
}

JSValue js_promise_finally_value(JSContext *ctx, JSValue *this_value,
                                 int argc, JSValue *argv, JSValue params)
{
    JSValue value = JS_GetPropertyUint32(ctx, params, 0);
    JSValue rejected = JS_GetPropertyUint32(ctx, params, 1);
    UNUSED(this_value); UNUSED(argc); UNUSED(argv);
    return JS_VALUE_GET_SPECIAL_VALUE(rejected) ? JS_Throw(ctx, value) : value;
}

static int execute_promise_job(JSContext *ctx, JSValue job)
{
    JSValue fulfilled = JS_GetPropertyUint32(ctx, job, 0);
    JSValue rejected_handler = JS_GetPropertyUint32(ctx, job, 1);
    JSValue next = JS_GetPropertyUint32(ctx, job, 2);
    JSValue value = JS_GetPropertyUint32(ctx, job, 3);
    JSValue rejected_value = JS_GetPropertyUint32(ctx, job, 4);
    int rejected = JS_VALUE_GET_SPECIAL_VALUE(rejected_value) != 0;
    JSValue handler = rejected ? rejected_handler : fulfilled;
    if (!JS_IsFunction(ctx, handler))
        return rejected ? settle_raw(ctx, next, value, 1)
                        : resolve_promise(ctx, next, value);
    JS_PushArg(ctx, value);
    JS_PushArg(ctx, handler);
    JS_PushArg(ctx, JS_UNDEFINED);
    {
        JSValue result = JS_Call(ctx, 1);
        if (JS_IsException(result))
            return settle_raw(ctx, next, JS_GetException(ctx), 1);
        return resolve_promise(ctx, next, result);
    }
}

int JS_ExecutePendingJobs(JSContext *ctx)
{
    for (;;) {
        JSValue job = JS_DequeuePromiseJob(ctx);
        JSGCRef job_ref;
        int status;
        if (JS_IsUndefined(job))
            return 0;
        if (JS_IsException(job))
            return -1;
        JS_PUSH_VALUE(ctx, job);
        status = execute_promise_job(ctx, job);
        JS_POP_VALUE(ctx, job);
        if (status)
            return -1;
    }
}
