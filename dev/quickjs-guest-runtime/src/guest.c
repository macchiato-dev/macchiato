#include "quickjs.h"
#include "guest-source.h"
#include <stdlib.h>

__attribute__((import_module("host"), import_name("msg")))
extern uint32_t msg(uint32_t offset, uint32_t length);

static JSRuntime *runtime;
static JSContext *context;
static char transfer[256];
static JSClassID host_reference_class;
static uint8_t *host_message;
static uint32_t host_message_capacity;

static void report_stage(const char *stage)
{
#ifdef WWC_CANONICAL_HOST
    (void)stage;
    msg(128u * 8192u + 1u, 0);
#else
    uint32_t length = 0;
    while (stage[length] != '\0') length++;
    msg((uint32_t)(uintptr_t)stage, length);
#endif
}

static JSValue guest_print(JSContext *ctx, JSValueConst this_value,
                           int argc, JSValueConst *argv)
{
    int index;
    (void)this_value;
    for (index = 0; index < argc; index++) {
        const char *text = JS_ToCString(ctx, argv[index]);
        uint32_t length = 0;
        if (text == NULL)
            continue;
        while (text[length] != '\0' && length < sizeof(transfer)) {
            transfer[length] = text[length];
            length++;
        }
        msg((uint32_t)(uintptr_t)transfer, length);
        JS_FreeCString(ctx, text);
    }
    return JS_UNDEFINED;
}

/* Exchange one bounded wire buffer with the canonical wasm-web-container
   host. The JavaScript guest owns the codec and reuses the same Uint8Array. */
static JSValue guest_bridge(JSContext *ctx, JSValueConst this_value,
                            int argc, JSValueConst *argv)
{
    JSValue buffer;
    uint8_t *bytes;
    size_t offset, length, element_size, buffer_length;
    uint32_t actual;
    (void)this_value;
    if (argc < 1)
        return JS_ThrowTypeError(ctx, "bridge requires a Uint8Array");
    buffer = JS_GetTypedArrayBuffer(ctx, argv[0], &offset, &length,
                                    &element_size);
    if (JS_IsException(buffer))
        return buffer;
    bytes = JS_GetArrayBuffer(ctx, &buffer_length, buffer);
    if (bytes == NULL || element_size != 1 || offset > buffer_length ||
        length > buffer_length - offset) {
        JS_FreeValue(ctx, buffer);
        return JS_ThrowTypeError(ctx, "bridge requires a bounded Uint8Array");
    }
    actual = msg((uint32_t)(uintptr_t)(bytes + offset), (uint32_t)length);
    JS_FreeValue(ctx, buffer);
    return JS_NewUint32(ctx, actual);
}

static void release_host_reference(JSRuntime *rt, JSValue value)
{
    uintptr_t control = (uintptr_t)JS_GetOpaque(value, host_reference_class);
    (void)rt;
    if (control != 0)
        msg((uint32_t)control, 0);
}

static JSValue make_host_reference(JSContext *ctx, JSValueConst this_value,
                                   int argc, JSValueConst *argv)
{
    uint32_t reference;
    JSValue value;
    (void)this_value;
    if (argc < 1 || JS_ToUint32(ctx, &reference, argv[0]) < 0)
        return JS_EXCEPTION;
    value = JS_NewObjectClass(ctx, host_reference_class);
    if (JS_IsException(value))
        return value;
    JS_SetOpaque(value, (void *)(uintptr_t)(reference + 1));
    return value;
}

static int install_host_references(void)
{
    JSClassDef definition = {
        .class_name = "HostReference",
        .finalizer = release_host_reference,
    };
    JSValue global;
    JS_NewClassID(&host_reference_class);
    if (JS_NewClass(runtime, host_reference_class, &definition) < 0)
        return -1;
    global = JS_GetGlobalObject(context);
    JS_SetPropertyStr(context, global, "hostReference",
                      JS_NewCFunction(context, make_host_reference,
                                      "hostReference", 1));
    JS_SetPropertyStr(context, global, "print",
                      JS_NewCFunction(context, guest_print, "print", 1));
    JS_SetPropertyStr(context, global, "bridge",
                      JS_NewCFunction(context, guest_bridge, "bridge", 1));
    JS_FreeValue(context, global);
    return 0;
}

static void report(JSValue value)
{
    const char *text;
    uint32_t length = 0;
    JSValue stack = JS_UNDEFINED;
    if (JS_IsException(value)) {
        value = JS_GetException(context);
        stack = JS_GetPropertyStr(context, value, "stack");
    }
    text = JS_ToCString(context, JS_IsUndefined(stack) ? value : stack);
    if (text == NULL)
        return;
    while (text[length] != '\0') length++;
    msg((uint32_t)(uintptr_t)text, length);
    JS_FreeCString(context, text);
    JS_FreeValue(context, stack);
}

static void report_memory(void)
{
    JSMemoryUsage usage;
    int length;
    JS_ComputeMemoryUsage(runtime, &usage);
    length = snprintf(transfer, sizeof(transfer),
                      "QuickJS:objects=%lld:properties=%lld:atoms=%lld:bytes=%lld",
                      (long long)usage.obj_count, (long long)usage.prop_count,
                      (long long)usage.atom_count,
                      (long long)usage.memory_used_size);
    if (length > 0)
        msg((uint32_t)(uintptr_t)transfer,
            (uint32_t)(length < (int)sizeof(transfer) ? length : sizeof(transfer)));
}

static void report_snapshot(void)
{
    static const char source[] =
        "globalThis.__wwcSnapshot ? 'WWC_DOM:'+JSON.stringify(__wwcSnapshot()) : undefined";
    JSValue result = JS_Eval(context, source, sizeof(source) - 1,
                             "guest-snapshot.js", JS_EVAL_TYPE_GLOBAL);
    if (!JS_IsUndefined(result)) report(result);
    JS_FreeValue(context, result);
}

static void receive_host_message(uint32_t minimum_length)
{
    JSValue global, receiver, bytes, result;
    uint32_t actual_length;
    if (minimum_length > host_message_capacity) {
        uint8_t *next = realloc(host_message, minimum_length);
        if (next == NULL) return;
        host_message = next;
        host_message_capacity = minimum_length;
    }
    actual_length = msg((uint32_t)(uintptr_t)host_message, host_message_capacity);
    if (actual_length > host_message_capacity) return;
    global = JS_GetGlobalObject(context);
#ifdef WWC_CANONICAL_HOST
    receiver = JS_GetPropertyStr(context, global, "dispatch");
    if (actual_length != 4) {
        JS_FreeValue(context, receiver);
        JS_FreeValue(context, global);
        return;
    }
    bytes = JS_NewUint32(context,
                         (uint32_t)host_message[0] |
                         (uint32_t)host_message[1] << 8 |
                         (uint32_t)host_message[2] << 16 |
                         (uint32_t)host_message[3] << 24);
#else
    receiver = JS_GetPropertyStr(context, global, "__wwcReceiveHostMessage");
    bytes = JS_NewArrayBufferCopy(context, host_message, actual_length);
#endif
    result = JS_Call(context, receiver, global, 1, &bytes);
    if (JS_IsException(result)) {
#ifdef WWC_CANONICAL_HOST
        report_stage("event");
#else
        report(result);
#endif
    }
    else if (JS_ToBool(context, result)) {
        static const char prevented[] = "WWC_EVENT:preventDefault";
        msg((uint32_t)(uintptr_t)prevented, sizeof(prevented) - 1);
    }
    JS_FreeValue(context, result);
    JS_FreeValue(context, bytes);
    JS_FreeValue(context, receiver);
    JS_FreeValue(context, global);
#ifndef WWC_CANONICAL_HOST
    report_snapshot();
#endif
}

void quickjs_guest_onmsg(uint32_t minimum_length)
{
    JSValue result;
    if (runtime != NULL) {
        if (minimum_length != 0) receive_host_message(minimum_length);
        return;
    }
    runtime = JS_NewRuntime();
    if (runtime == NULL)
        return;
#ifdef QUICKJS_MEMORY_LIMIT
    JS_SetMemoryLimit(runtime, QUICKJS_MEMORY_LIMIT);
#endif
    context = JS_NewContext(runtime);
    if (context == NULL)
        return;
    if (install_host_references() < 0)
        return;
    if (guest_environment_length != 0) {
        result = JS_Eval(context, (const char *)guest_environment,
                         guest_environment_length, "guest-environment.js",
                         JS_EVAL_TYPE_GLOBAL);
        if (JS_IsException(result)) {
            report_stage("guest-environment-error");
            report(result);
            JS_FreeValue(context, result);
            return;
        }
        JS_FreeValue(context, result);
    }
    result = JS_Eval(context, (const char *)guest_application,
                     guest_application_length, "guest-application.js",
                     JS_EVAL_TYPE_GLOBAL);
    if (!JS_IsException(result)) {
        static const char result_source[] =
            "globalThis.__wwcResult ? __wwcResult() : 'ready'";
        JS_FreeValue(context, result);
        result = JS_Eval(context, result_source, sizeof(result_source) - 1,
                         "guest-result.js", JS_EVAL_TYPE_GLOBAL);
    }
    else {
        report_stage("guest-application-error");
    }
    if (JS_IsException(result)) report_stage("guest-result-error");
#ifndef WWC_CANONICAL_HOST
    report(result);
#endif
    JS_FreeValue(context, result);
#ifndef WWC_CANONICAL_HOST
    {
        static const char visual_source[] =
            "globalThis.__wwcPrepareVisual && __wwcPrepareVisual()";
        result = JS_Eval(context, visual_source,
                         sizeof(visual_source) - 1,
                         "guest-visual.js", JS_EVAL_TYPE_GLOBAL);
        if (JS_IsException(result)) report(result);
        JS_FreeValue(context, result);
    }
    report_snapshot();
    JS_RunGC(runtime);
    report_memory();
#endif
}
