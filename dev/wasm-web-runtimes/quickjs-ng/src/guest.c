#include "quickjs.h"

__attribute__((import_module("host"), import_name("msg")))
extern uint32_t msg(uint32_t offset, uint32_t length);

static JSRuntime *runtime;
static JSContext *context;
static char transfer[256];
static JSClassID host_reference_class;

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
    JS_NewClassID(runtime, &host_reference_class);
    if (JS_NewClass(runtime, host_reference_class, &definition) < 0)
        return -1;
    global = JS_GetGlobalObject(context);
    JS_SetPropertyStr(context, global, "hostReference",
                      JS_NewCFunction(context, make_host_reference,
                                      "hostReference", 1));
    JS_FreeValue(context, global);
    return 0;
}

static void report(JSValue value)
{
    const char *text;
    uint32_t length = 0;
    if (JS_IsException(value))
        value = JS_GetException(context);
    text = JS_ToCString(context, value);
    if (text == NULL)
        return;
    while (text[length] != '\0' && length < sizeof(transfer)) {
        transfer[length] = text[length];
        length++;
    }
    msg((uint32_t)(uintptr_t)transfer, length);
    JS_FreeCString(context, text);
}

void quickjs_guest_onmsg(uint32_t minimum_length)
{
    JSValue result;
    (void)minimum_length;
    if (runtime != NULL)
        return;
    runtime = JS_NewRuntime();
    if (runtime == NULL)
        return;
    JS_SetMaxStackSize(runtime, 0);
#ifdef QUICKJS_MEMORY_LIMIT
    JS_SetMemoryLimit(runtime, QUICKJS_MEMORY_LIMIT);
#endif
    context = JS_NewContext(runtime);
    if (context == NULL)
        return;
    if (install_host_references() < 0)
        return;
    static const char source[] =
        "let lease = hostReference(41); lease = null;"
        "class Runtime { static name = 'QuickJS-NG'; }"
        "`${Runtime?.name}:${[20, 22].reduce((a, b) => a + b)}`";
    result = JS_Eval(context, source, sizeof(source) - 1,
                     "guest-runtime.js", JS_EVAL_TYPE_GLOBAL);
    report(result);
    JS_FreeValue(context, result);
    JS_RunGC(runtime);
}
