#pragma once

#include <stddef.h>
#include "mquickjs.h"

JSValue js_print(JSContext *, JSValue *, int, JSValue *);
JSValue js_performance_now(JSContext *, JSValue *, int, JSValue *);
JSValue js_gc(JSContext *, JSValue *, int, JSValue *);
JSValue js_date_constructor(JSContext *, JSValue *, int, JSValue *);
JSValue js_date_now(JSContext *, JSValue *, int, JSValue *);
JSValue js_load(JSContext *, JSValue *, int, JSValue *);
JSValue js_setTimeout(JSContext *, JSValue *, int, JSValue *);
JSValue js_clearTimeout(JSContext *, JSValue *, int, JSValue *);
