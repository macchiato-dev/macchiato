#include "host_functions.h"

JSValue js_print(JSContext *ctx, JSValue *this_value, int argc, JSValue *argv)
{
    return JS_UNDEFINED;
}

JSValue js_performance_now(JSContext *ctx, JSValue *this_value, int argc,
                           JSValue *argv)
{
    return JS_NewInt32(ctx, 0);
}

JSValue js_gc(JSContext *ctx, JSValue *this_value, int argc, JSValue *argv)
{
    JS_GC(ctx);
    return JS_UNDEFINED;
}

JSValue js_date_constructor(JSContext *ctx, JSValue *this_value, int argc,
                            JSValue *argv)
{
    return JS_ThrowTypeError(ctx, "Date is unavailable in the test host");
}

JSValue js_date_now(JSContext *ctx, JSValue *this_value, int argc, JSValue *argv)
{
    return JS_NewInt32(ctx, 0);
}

JSValue js_load(JSContext *ctx, JSValue *this_value, int argc, JSValue *argv)
{
    return JS_ThrowTypeError(ctx, "load is unavailable in engine tests");
}

JSValue js_setTimeout(JSContext *ctx, JSValue *this_value, int argc,
                      JSValue *argv)
{
    return JS_ThrowTypeError(ctx, "timers are unavailable in engine tests");
}

JSValue js_clearTimeout(JSContext *ctx, JSValue *this_value, int argc,
                        JSValue *argv)
{
    return JS_UNDEFINED;
}
