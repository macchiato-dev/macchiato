#include <stdint.h>
#include <stddef.h>

#include "mquickjs.h"

extern double host_now(void)
    __attribute__((import_module("host"), import_name("now")));

#define JS_CLASS_HOST_REFERENCE (JS_CLASS_USER + 0)
#define JS_CLASS_COUNT (JS_CLASS_USER + 1)

static JSValue js_date_constructor(JSContext *ctx, JSValue *this_value,
                                   int argc, JSValue *argv);
static JSValue js_date_now(JSContext *ctx, JSValue *this_value,
                           int argc, JSValue *argv);
static JSValue js_print(JSContext *ctx, JSValue *this_value,
                        int argc, JSValue *argv);
static JSValue js_performance_now(JSContext *ctx, JSValue *this_value,
                                  int argc, JSValue *argv);
static JSValue js_gc(JSContext *ctx, JSValue *this_value,
                     int argc, JSValue *argv);
static JSValue js_load(JSContext *ctx, JSValue *this_value,
                       int argc, JSValue *argv);
static JSValue js_close_guest(JSContext *ctx, JSValue *this_value,
                              int argc, JSValue *argv);
static JSValue js_setTimeout(JSContext *ctx, JSValue *this_value,
                             int argc, JSValue *argv);
static JSValue js_clearTimeout(JSContext *ctx, JSValue *this_value,
                               int argc, JSValue *argv);
static JSValue js_bridge(JSContext *ctx, JSValue *this_value,
                         int argc, JSValue *argv);
static JSValue js_host_reference_constructor(JSContext *ctx, JSValue *this_value,
                                             int argc, JSValue *argv);
static void js_host_reference_finalizer(JSContext *ctx, void *opaque);
static JSValue js_map_constructor(JSContext *ctx, JSValue *this_value,
                                  int argc, JSValue *argv);
static JSValue js_set_constructor(JSContext *ctx, JSValue *this_value,
                                  int argc, JSValue *argv);
static JSValue js_collection_clear(JSContext *ctx, JSValue *this_value,
                                   int argc, JSValue *argv, int magic);
static JSValue js_collection_delete(JSContext *ctx, JSValue *this_value,
                                    int argc, JSValue *argv, int magic);
static JSValue js_collection_has(JSContext *ctx, JSValue *this_value,
                                 int argc, JSValue *argv, int magic);
static JSValue js_collection_size(JSContext *ctx, JSValue *this_value,
                                  int argc, JSValue *argv, int magic);
static JSValue js_collection_items(JSContext *ctx, JSValue *this_value,
                                   int argc, JSValue *argv, int magic);
static JSValue js_collection_for_each(JSContext *ctx, JSValue *this_value,
                                      int argc, JSValue *argv, int magic);
static JSValue js_map_get(JSContext *ctx, JSValue *this_value,
                          int argc, JSValue *argv);
static JSValue js_map_set(JSContext *ctx, JSValue *this_value,
                          int argc, JSValue *argv);
static JSValue js_set_add(JSContext *ctx, JSValue *this_value,
                          int argc, JSValue *argv);
static int collection_this(JSContext *ctx, JSValue value, int class_id);
static JSValue js_weak_map_constructor(JSContext *ctx, JSValue *this_value,
                                       int argc, JSValue *argv);
static JSValue js_weak_set_constructor(JSContext *ctx, JSValue *this_value,
                                       int argc, JSValue *argv);
static JSValue js_weak_collection_delete(JSContext *ctx, JSValue *this_value,
                                         int argc, JSValue *argv, int magic);
static JSValue js_weak_collection_has(JSContext *ctx, JSValue *this_value,
                                      int argc, JSValue *argv, int magic);
static JSValue js_weak_map_get(JSContext *ctx, JSValue *this_value,
                               int argc, JSValue *argv);
static JSValue js_weak_map_set(JSContext *ctx, JSValue *this_value,
                               int argc, JSValue *argv);
static JSValue js_weak_set_add(JSContext *ctx, JSValue *this_value,
                               int argc, JSValue *argv);

#include "mqjs_stdlib.h"

__attribute__((import_module("host"), import_name("msg")))
extern uint32_t msg(uint32_t offset, uint32_t length);

__attribute__((noreturn)) void abort(void)
{
    __builtin_trap();
}

__attribute__((noreturn))
void __assert_fail(const char *condition, const char *file,
                   unsigned int line, const char *function)
{
    (void)condition; (void)file; (void)line; (void)function;
    __builtin_trap();
}

/* MicroQuickJS owns this fixed arena. The app embeds large images, while the
   arena holds its live JavaScript values and guest-side DOM bookkeeping. */
static uint8_t runtime_memory[16 * 1024 * 1024];
static uint8_t transfer[2 * 1024 * 1024];
static uint8_t stamp_memory[2 * 1024 * 1024];
static JSContext *context;
static JSValue application_program;
static uint8_t *application_bytecode;
static uint32_t application_bytecode_length;
static int bytecode_loading_open = 1;
static int application_loaded;

static void report_guest_error(JSContext *ctx, uint32_t stage)
{
    JSCStringBuf buffer;
    JSCStringBuf stack_buffer;
    JSValue exception = JS_GetException(ctx);
    JSValue stack = JS_GetPropertyStr(ctx, exception, "stack");
    const char *text = JS_ToCString(ctx, exception, &buffer);
    const char *stack_text = JS_ToCString(ctx, stack, &stack_buffer);
    uint32_t length = 0;
    transfer[0] = 'D'; transfer[1] = 'U'; transfer[2] = 'L'; transfer[3] = 'E';
    transfer[4] = (uint8_t)stage;
    if (text != NULL) {
        while (text[length] != '\0' && length < sizeof(transfer) - 6) {
            transfer[5 + length] = (uint8_t)text[length];
            length++;
        }
    }
    if (stack_text != NULL && stack_text[0] != '\0' &&
        length + 1 < sizeof(transfer) - 6) {
        transfer[5 + length++] = '\n';
        for (uint32_t index = 0;
             stack_text[index] != '\0' && length < sizeof(transfer) - 6;
             index++) {
            transfer[5 + length++] = (uint8_t)stack_text[index];
        }
    }
    transfer[5 + length] = '\0';
    msg((uint32_t)(uintptr_t)transfer, 6 + length);
}

static int same_bytes(const uint8_t *bytes, uint32_t length, const char *text)
{
    uint32_t index = 0;
    while (index < length && text[index] != '\0' && bytes[index] == (uint8_t)text[index]) index++;
    return index == length && text[index] == '\0';
}

static int unpack_stamp(uint32_t total, uint8_t **runtime, uint32_t *runtime_length)
{
    uint32_t separator = 0, cursor = 0, data, entry = 0;
    while (separator < total && stamp_memory[separator] != '|') separator++;
    if (separator == total) return -1;
    data = separator + 1;
    while (cursor < separator) {
        uint32_t name = cursor, name_length, length = 0;
        while (cursor < separator && stamp_memory[cursor] != ':') cursor++;
        if (cursor == separator) return -1;
        name_length = cursor++ - name;
        if (cursor == separator) return -1;
        while (cursor < separator && stamp_memory[cursor] != ',') {
            uint8_t digit = stamp_memory[cursor++];
            if (digit < '0' || digit > '9') return -1;
            length = length * 10 + digit - '0';
        }
        if (length > total - data) return -1;
        if (same_bytes(stamp_memory + name, name_length, "runtime.bin")) {
            *runtime = stamp_memory + data; *runtime_length = length; entry |= 1;
        } else if (same_bytes(stamp_memory + name, name_length, "application.bin")) {
            application_bytecode = stamp_memory + data;
            application_bytecode_length = length; entry |= 2;
        } else if (!same_bytes(stamp_memory + name, name_length, "padding")) return -1;
        data += length;
        if (cursor < separator) cursor++;
    }
    return entry == 3 && data == total ? 0 : -1;
}

static int request_stamp(uint8_t **runtime, uint32_t *runtime_length)
{
    stamp_memory[0] = 'D'; stamp_memory[1] = 'U';
    stamp_memory[2] = 'L'; stamp_memory[3] = 'S';
    uint32_t actual = msg((uint32_t)(uintptr_t)stamp_memory, sizeof(stamp_memory));
    if (actual == 0 || actual > sizeof(stamp_memory)) return -1;
    return unpack_stamp(actual, runtime, runtime_length);
}

#define UNUSED(value) ((void)(value))
#define CONTROL_PAYLOAD_BITS 20

static JSValue unavailable(JSContext *ctx, JSValue *this_value,
                           int argc, JSValue *argv)
{
    UNUSED(ctx); UNUSED(this_value); UNUSED(argc); UNUSED(argv);
    return JS_UNDEFINED;
}

static JSValue js_date_constructor(JSContext *ctx, JSValue *this_value,
                                   int argc, JSValue *argv)
{
    return unavailable(ctx, this_value, argc, argv);
}

static JSValue js_date_now(JSContext *ctx, JSValue *this_value,
                           int argc, JSValue *argv)
{
    return unavailable(ctx, this_value, argc, argv);
}

static JSValue js_print(JSContext *ctx, JSValue *this_value,
                        int argc, JSValue *argv)
{
    return js_bridge(ctx, this_value, argc, argv);
}

static JSValue js_performance_now(JSContext *ctx, JSValue *this_value,
                                  int argc, JSValue *argv)
{
    UNUSED(this_value); UNUSED(argc); UNUSED(argv);
    return JS_NewFloat64(ctx, host_now());
}

static JSValue js_gc(JSContext *ctx, JSValue *this_value,
                     int argc, JSValue *argv)
{
    JS_GC(ctx); UNUSED(this_value); UNUSED(argc); UNUSED(argv);
    return JS_UNDEFINED;
}

static JSValue js_load(JSContext *ctx, JSValue *this_value,
                       int argc, JSValue *argv)
{
    UNUSED(this_value); UNUSED(argv);
    if (!bytecode_loading_open || application_loaded || argc < 1) {
        return JS_ThrowTypeError(ctx, "bytecode loading is closed");
    }
    /* The runtime validates the script resource name. The immutable stamp
       contains exactly one application program, so this layer only enforces
       the one-shot execution boundary. */
    application_loaded = 1;
    JSValue result = JS_Run(ctx, application_program);
    if (JS_IsException(result)) report_guest_error(ctx, 1);
    return JS_IsException(result) ? result : JS_UNDEFINED;
}

static JSValue js_close_guest(JSContext *ctx, JSValue *this_value,
                              int argc, JSValue *argv)
{
    UNUSED(ctx); UNUSED(this_value); UNUSED(argc); UNUSED(argv);
    bytecode_loading_open = 0;
    return JS_UNDEFINED;
}

static JSValue js_setTimeout(JSContext *ctx, JSValue *this_value,
                             int argc, JSValue *argv)
{
    return unavailable(ctx, this_value, argc, argv);
}

static JSValue js_clearTimeout(JSContext *ctx, JSValue *this_value,
                               int argc, JSValue *argv)
{
    return unavailable(ctx, this_value, argc, argv);
}

static JSValue js_bridge(JSContext *ctx, JSValue *this_value,
                         int argc, JSValue *argv)
{
    uint8_t *bytes;
    size_t capacity;
    int32_t used;
    UNUSED(this_value);
    if (argc < 2 || JS_GetUint8Array(ctx, argv[0], &bytes, &capacity) ||
        JS_ToInt32(ctx, &used, argv[1]) || used < 4 || (size_t)used > capacity) {
        return JS_ThrowTypeError(ctx, "bridge expects bytes and used length");
    }
    uint32_t response = msg((uint32_t)(uintptr_t)bytes, (uint32_t)capacity);
    if (response < 4 || response > capacity) {
        return JS_ThrowRangeError(ctx, "bridge response is too large");
    }
    uint32_t response_length = (uint32_t)bytes[0] |
        ((uint32_t)bytes[1] << 8) | ((uint32_t)bytes[2] << 16) |
        ((uint32_t)bytes[3] << 24);
    if (response_length > response - 4) {
        return JS_ThrowInternalError(ctx, "invalid bridge response");
    }
    return JS_NewInt32(ctx, (int32_t)response);
}

/* The wrapper is intentionally data-free apart from its scalar host reference.
   MicroQuickJS invokes this finalizer when the wrapper becomes unreachable. */
static JSValue js_host_reference_constructor(JSContext *ctx, JSValue *this_value,
                                             int argc, JSValue *argv)
{
    int32_t reference;
    JSValue object;
    UNUSED(this_value);
    if (!(argc & FRAME_CF_CTOR) || (argc & ~FRAME_CF_CTOR) < 1 ||
        JS_ToInt32(ctx, &reference, argv[0]) || reference < 0 ||
        (uint32_t)reference >= (1u << CONTROL_PAYLOAD_BITS)) {
        return JS_ThrowTypeError(ctx, "invalid host reference");
    }
    object = JS_NewObjectClassUser(ctx, JS_CLASS_HOST_REFERENCE);
    if (JS_IsException(object)) return object;
    /* Add one because NULL is also MicroQuickJS's empty opaque value. */
    JS_SetOpaque(ctx, object, (void *)(uintptr_t)((uint32_t)reference + 1));
    return object;
}

static void js_host_reference_finalizer(JSContext *ctx, void *opaque)
{
    uint32_t stored = (uint32_t)(uintptr_t)opaque;
    UNUSED(ctx);
    if (stored != 0) msg(stored, 0);
}

static JSValue new_collection(JSContext *ctx, int class_id,
                              int argc, JSValue *argv)
{
    JSValue collection;
    uint32_t length = 0, index;
    int argument_count = argc & ~FRAME_CF_CTOR;
    if (!(argc & FRAME_CF_CTOR))
        return JS_ThrowTypeError(ctx, "collection requires new");
    collection = JS_NewCollection(ctx, class_id);
    if (JS_IsException(collection) || argument_count == 0 ||
        JS_IsUndefined(argv[0]) || JS_IsNull(argv[0]))
        return collection;
    if (!JS_IsArray(ctx, argv[0]))
        return JS_ThrowTypeError(ctx, "collection iterable must be an array");
    {
        JSValue length_value = JS_GetPropertyStr(ctx, argv[0], "length");
        if (JS_ToUint32(ctx, &length, length_value))
            return JS_EXCEPTION;
    }
    for (index = 0; index < length; index++) {
        JSValue item = JS_GetPropertyUint32(ctx, argv[0], index);
        JSValue key = item, value = JS_TRUE;
        if (class_id == JS_CLASS_MAP) {
            if (!JS_IsArray(ctx, item))
                return JS_ThrowTypeError(ctx, "Map entry must be an array");
            key = JS_GetPropertyUint32(ctx, item, 0);
            value = JS_GetPropertyUint32(ctx, item, 1);
        }
        if (JS_CollectionSet(ctx, collection, key, value))
            return JS_ThrowOutOfMemory(ctx);
    }
    return collection;
}

static JSValue js_map_constructor(JSContext *ctx, JSValue *this_value,
                                  int argc, JSValue *argv)
{
    UNUSED(this_value);
    return new_collection(ctx, JS_CLASS_MAP, argc, argv);
}

static JSValue js_set_constructor(JSContext *ctx, JSValue *this_value,
                                  int argc, JSValue *argv)
{
    UNUSED(this_value);
    return new_collection(ctx, JS_CLASS_SET, argc, argv);
}

static int strong_collection_class(int magic)
{
    return magic ? JS_CLASS_SET : JS_CLASS_MAP;
}

static JSValue js_collection_clear(JSContext *ctx, JSValue *this_value,
                                   int argc, JSValue *argv, int magic)
{
    UNUSED(argc); UNUSED(argv);
    if (!collection_this(ctx, *this_value, strong_collection_class(magic)))
        return JS_ThrowTypeError(ctx, "incompatible collection receiver");
    JS_CollectionClear(ctx, *this_value);
    return JS_UNDEFINED;
}

static JSValue js_collection_delete(JSContext *ctx, JSValue *this_value,
                                    int argc, JSValue *argv, int magic)
{
    if (!collection_this(ctx, *this_value, strong_collection_class(magic)))
        return JS_ThrowTypeError(ctx, "incompatible collection receiver");
    return JS_NewBool(argc > 0 && JS_CollectionDelete(ctx, *this_value, argv[0]));
}

static JSValue js_collection_has(JSContext *ctx, JSValue *this_value,
                                 int argc, JSValue *argv, int magic)
{
    if (!collection_this(ctx, *this_value, strong_collection_class(magic)))
        return JS_ThrowTypeError(ctx, "incompatible collection receiver");
    return JS_NewBool(argc > 0 && JS_CollectionHas(ctx, *this_value, argv[0]));
}

static JSValue js_collection_size(JSContext *ctx, JSValue *this_value,
                                  int argc, JSValue *argv, int magic)
{
    UNUSED(argc); UNUSED(argv);
    if (!collection_this(ctx, *this_value, strong_collection_class(magic)))
        return JS_ThrowTypeError(ctx, "incompatible collection receiver");
    return JS_NewInt32(ctx, (int32_t)JS_CollectionSize(ctx, *this_value));
}

static JSValue js_collection_items(JSContext *ctx, JSValue *this_value,
                                   int argc, JSValue *argv, int magic)
{
    JSValue output;
    uint32_t index, size;
    int class_id = magic >= 3 ? JS_CLASS_SET : JS_CLASS_MAP;
    UNUSED(argc); UNUSED(argv);
    if (!collection_this(ctx, *this_value, class_id))
        return JS_ThrowTypeError(ctx, "incompatible collection receiver");
    size = JS_CollectionSize(ctx, *this_value);
    output = JS_NewArray(ctx, size);
    if (JS_IsException(output)) return output;
    for (index = 0; index < size; index++) {
        JSValue key = JS_CollectionKeyAt(ctx, *this_value, index);
        JSValue value = JS_CollectionValueAt(ctx, *this_value, index);
        JSValue item = magic == 0 || magic == 3 ? key :
            magic == 1 ? value : JS_UNDEFINED;
        if (magic == 2 || magic == 4) {
            item = JS_NewArray(ctx, 2);
            JS_SetPropertyUint32(ctx, item, 0, key);
            JS_SetPropertyUint32(ctx, item, 1, magic == 4 ? key : value);
        }
        JS_SetPropertyUint32(ctx, output, index, item);
    }
    return output;
}

static JSValue js_collection_for_each(JSContext *ctx, JSValue *this_value,
                                      int argc, JSValue *argv, int magic)
{
    uint32_t index, size;
    JSValue receiver = argc > 1 ? argv[1] : JS_UNDEFINED;
    if (!collection_this(ctx, *this_value, strong_collection_class(magic)) ||
        argc < 1 || !JS_IsFunction(ctx, argv[0]))
        return JS_ThrowTypeError(ctx, "collection callback must be a function");
    size = JS_CollectionSize(ctx, *this_value);
    for (index = 0; index < size; index++) {
        JSValue key = JS_CollectionKeyAt(ctx, *this_value, index);
        JSValue value = magic ? key : JS_CollectionValueAt(ctx, *this_value, index);
        JSValue result;
        JS_PushArg(ctx, value);
        JS_PushArg(ctx, key);
        JS_PushArg(ctx, *this_value);
        JS_PushArg(ctx, argv[0]);
        JS_PushArg(ctx, receiver);
        result = JS_Call(ctx, 3);
        if (JS_IsException(result)) return result;
    }
    return JS_UNDEFINED;
}

static JSValue js_map_get(JSContext *ctx, JSValue *this_value,
                          int argc, JSValue *argv)
{
    if (!collection_this(ctx, *this_value, JS_CLASS_MAP))
        return JS_ThrowTypeError(ctx, "incompatible Map receiver");
    return argc ? JS_CollectionGet(ctx, *this_value, argv[0]) : JS_UNDEFINED;
}

static JSValue js_map_set(JSContext *ctx, JSValue *this_value,
                          int argc, JSValue *argv)
{
    if (!collection_this(ctx, *this_value, JS_CLASS_MAP))
        return JS_ThrowTypeError(ctx, "incompatible Map receiver");
    if (JS_CollectionSet(ctx, *this_value,
        argc ? argv[0] : JS_UNDEFINED, argc > 1 ? argv[1] : JS_UNDEFINED))
        return JS_ThrowOutOfMemory(ctx);
    return *this_value;
}

static JSValue js_set_add(JSContext *ctx, JSValue *this_value,
                          int argc, JSValue *argv)
{
    JSValue value = argc ? argv[0] : JS_UNDEFINED;
    if (!collection_this(ctx, *this_value, JS_CLASS_SET))
        return JS_ThrowTypeError(ctx, "incompatible Set receiver");
    if (JS_CollectionSet(ctx, *this_value, value, value))
        return JS_ThrowOutOfMemory(ctx);
    return *this_value;
}

static int collection_this(JSContext *ctx, JSValue value, int class_id)
{
    return JS_GetClassID(ctx, value) == class_id;
}

static JSValue new_weak_collection(JSContext *ctx, int class_id,
                                   int argc, JSValue *argv)
{
    int argument_count = argc & ~FRAME_CF_CTOR;
    if (!(argc & FRAME_CF_CTOR))
        return JS_ThrowTypeError(ctx, "weak collection requires new");
    if (argument_count && !JS_IsUndefined(argv[0]) && !JS_IsNull(argv[0]))
        return JS_ThrowTypeError(ctx, "weak collection iterable is not supported");
    return JS_NewCollection(ctx, class_id);
}

static JSValue js_weak_map_constructor(JSContext *ctx, JSValue *this_value,
                                       int argc, JSValue *argv)
{
    UNUSED(this_value);
    return new_weak_collection(ctx, JS_CLASS_WEAK_MAP, argc, argv);
}

static JSValue js_weak_set_constructor(JSContext *ctx, JSValue *this_value,
                                       int argc, JSValue *argv)
{
    UNUSED(this_value);
    return new_weak_collection(ctx, JS_CLASS_WEAK_SET, argc, argv);
}

static JSValue js_weak_collection_delete(JSContext *ctx, JSValue *this_value,
                                         int argc, JSValue *argv, int magic)
{
    int class_id = magic ? JS_CLASS_WEAK_SET : JS_CLASS_WEAK_MAP;
    if (!collection_this(ctx, *this_value, class_id))
        return JS_ThrowTypeError(ctx, "incompatible weak collection receiver");
    return JS_NewBool(argc > 0 &&
        JS_CollectionDelete(ctx, *this_value, argv[0]));
}

static JSValue js_weak_collection_has(JSContext *ctx, JSValue *this_value,
                                      int argc, JSValue *argv, int magic)
{
    int class_id = magic ? JS_CLASS_WEAK_SET : JS_CLASS_WEAK_MAP;
    if (!collection_this(ctx, *this_value, class_id))
        return JS_ThrowTypeError(ctx, "incompatible weak collection receiver");
    return JS_NewBool(argc > 0 &&
        JS_CollectionHas(ctx, *this_value, argv[0]));
}

static JSValue js_weak_map_get(JSContext *ctx, JSValue *this_value,
                               int argc, JSValue *argv)
{
    if (!collection_this(ctx, *this_value, JS_CLASS_WEAK_MAP))
        return JS_ThrowTypeError(ctx, "incompatible WeakMap receiver");
    return argc > 0 ? JS_CollectionGet(ctx, *this_value, argv[0]) : JS_UNDEFINED;
}

static JSValue js_weak_map_set(JSContext *ctx, JSValue *this_value,
                               int argc, JSValue *argv)
{
    int result;
    if (!collection_this(ctx, *this_value, JS_CLASS_WEAK_MAP))
        return JS_ThrowTypeError(ctx, "incompatible WeakMap receiver");
    if (argc < 2 || JS_GetClassID(ctx, argv[0]) < 0)
        return JS_ThrowTypeError(ctx, "WeakMap key must be an object");
    result = JS_CollectionSet(ctx, *this_value, argv[0], argv[1]);
    if (result == -1)
        return JS_ThrowOutOfMemory(ctx);
    if (result)
        return JS_ThrowTypeError(ctx, "WeakMap key must be an object");
    return *this_value;
}

static JSValue js_weak_set_add(JSContext *ctx, JSValue *this_value,
                               int argc, JSValue *argv)
{
    int result;
    if (!collection_this(ctx, *this_value, JS_CLASS_WEAK_SET))
        return JS_ThrowTypeError(ctx, "incompatible WeakSet receiver");
    if (argc < 1 || JS_GetClassID(ctx, argv[0]) < 0)
        return JS_ThrowTypeError(ctx, "WeakSet value must be an object");
    result = JS_CollectionSet(ctx, *this_value, argv[0], JS_TRUE);
    if (result == -1)
        return JS_ThrowOutOfMemory(ctx);
    if (result)
        return JS_ThrowTypeError(ctx, "WeakSet value must be an object");
    return *this_value;
}

static void dispatch(uint32_t callback)
{
    JSValue global = JS_GetGlobalObject(context);
    JSValue handler = JS_GetPropertyStr(context, global, "dispatch");
    JSValue argument = JS_NewInt32(context, (int32_t)callback);
    JSValue result;

    JS_PushArg(context, argument);
    JS_PushArg(context, handler);
    JS_PushArg(context, global);
    result = JS_Call(context, 1);
    if (JS_IsException(result)) report_guest_error(context, 3);
}

void guest_onmsg(uint32_t minimum_length)
{
    if (context == NULL) {
        JSValue runtime_program, result;
        uint8_t *runtime_bytecode;
        uint32_t runtime_bytecode_length;
        if (request_stamp(&runtime_bytecode, &runtime_bytecode_length) != 0) return;
        context = JS_NewContext(runtime_memory, sizeof(runtime_memory), &js_stdlib);
        if (JS_RelocateBytecode(context, runtime_bytecode,
                                runtime_bytecode_length) != 0) return;
        runtime_program = JS_LoadBytecode(context, runtime_bytecode);
        if (JS_IsException(runtime_program)) return;
        if (JS_RelocateBytecode(context, application_bytecode,
                                application_bytecode_length) != 0) return;
        application_program = JS_LoadBytecode(context, application_bytecode);
        if (JS_IsException(application_program)) return;
        result = JS_Run(context, runtime_program);
        if (JS_IsException(result)) { report_guest_error(context, 2); return; }
        dispatch(UINT32_MAX); /* Commit document and application DOM operations. */
    }

    if (minimum_length == 0) {
        return;
    }

    uint32_t capacity = minimum_length < sizeof(transfer)
        ? minimum_length
        : (uint32_t)sizeof(transfer);
    uint32_t actual = msg((uint32_t)(uintptr_t)transfer, capacity);
    if (actual == 4) {
        dispatch((uint32_t)transfer[0] | ((uint32_t)transfer[1] << 8) |
                 ((uint32_t)transfer[2] << 16) | ((uint32_t)transfer[3] << 24));
    }
}
