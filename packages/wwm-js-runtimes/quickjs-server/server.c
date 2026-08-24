#include "quickjs.h"
#include <stdint.h>
#include <stdlib.h>
#include <string.h>

__attribute__((import_module("host"), import_name("msg")))
extern uint32_t host_msg(uint32_t offset, uint32_t length);
__attribute__((import_module("host"), import_name("bytecode")))
extern uint32_t host_bytecode(uint32_t index, uint32_t offset,
                             uint32_t capacity);

static JSRuntime *runtime;
static JSContext *context;
static uint8_t *incoming;
static uint32_t incoming_capacity;

static void report_exception(void) {
  JSValue exception = JS_GetException(context);
  JSValue stack = JS_GetPropertyStr(context, exception, "stack");
  const char *text = JS_ToCString(context,
    JS_IsUndefined(stack) ? exception : stack);
  if (text) {
    size_t length = strlen(text);
    uint8_t *message = malloc(length + 4);
    if (message) {
      memcpy(message, "WWMS", 4);
      memcpy(message + 4, text, length);
      host_msg((uint32_t)(uintptr_t)message, (uint32_t)length + 4);
      free(message);
    }
    JS_FreeCString(context, text);
  }
  JS_FreeValue(context, stack);
  JS_FreeValue(context, exception);
}

static void drain_jobs(void) {
  JSContext *job_context = NULL;
  int status;
  while ((status = JS_ExecutePendingJob(runtime, &job_context)) > 0) {}
  if (status < 0) report_exception();
}

static JSValue send_message(JSContext *ctx, JSValueConst self,
                            int argc, JSValueConst *argv) {
  JSValue buffer;
  uint8_t *bytes, *message;
  size_t offset, length, element_size, buffer_length;
  (void)self;
  if (argc != 1)
    return JS_ThrowTypeError(ctx, "send requires one Uint8Array");
  buffer = JS_GetTypedArrayBuffer(ctx, argv[0], &offset, &length,
                                  &element_size);
  if (JS_IsException(buffer)) return buffer;
  bytes = JS_GetArrayBuffer(ctx, &buffer_length, buffer);
  if (!bytes || element_size != 1 || offset > buffer_length ||
      length > buffer_length - offset) {
    JS_FreeValue(ctx, buffer);
    return JS_ThrowTypeError(ctx, "send requires a bounded Uint8Array");
  }
  message = malloc(length + 4);
  if (!message) {
    JS_FreeValue(ctx, buffer);
    return JS_ThrowOutOfMemory(ctx);
  }
  memcpy(message, "WWMS", 4);
  memcpy(message + 4, bytes + offset, length);
  host_msg((uint32_t)(uintptr_t)message, (uint32_t)length + 4);
  free(message);
  JS_FreeValue(ctx, buffer);
  return JS_UNDEFINED;
}

static int evaluate_program(void) {
  uint8_t *bytecode = NULL;
  uint32_t used = 0;
  JSValue result, global;
  for (uint32_t index = 0;; index++) {
    uint32_t length = host_bytecode(index, 0, 0);
    if (!length) break;
    uint8_t *next = realloc(bytecode, (size_t)used + length);
    if (!next) { free(bytecode); return -1; }
    bytecode = next;
    if (host_bytecode(index, (uint32_t)(uintptr_t)(bytecode + used), length)
        != length) { free(bytecode); return -1; }
    used += length;
  }
  if (!used) return -1;
  global = JS_GetGlobalObject(context);
  JS_SetPropertyStr(context, global, "__hostSend",
    JS_NewCFunction(context, send_message, "__hostSend", 1));
  JS_FreeValue(context, global);
  result = JS_ReadObject(context, bytecode, used, JS_READ_OBJ_BYTECODE);
  free(bytecode);
  if (!JS_IsException(result)) result = JS_EvalFunction(context, result);
  if (JS_IsException(result)) { report_exception(); return -1; }
  JS_FreeValue(context, result);
  drain_jobs();
  return 0;
}

static int start(void) {
  runtime = JS_NewRuntime();
  if (!runtime) return -1;
  JS_SetMemoryLimit(runtime, 128 * 1024 * 1024);
  context = JS_NewContext(runtime);
  return context ? evaluate_program() : -1;
}

void quickjs_guest_onmsg(uint32_t minimum_length) {
  JSValue global, receiver, bytes, result;
  uint32_t actual;
  if (!context && start()) return;
  if (!minimum_length) { drain_jobs(); return; }
  if (minimum_length > incoming_capacity) {
    uint8_t *next = realloc(incoming, minimum_length);
    if (!next) return;
    incoming = next;
    incoming_capacity = minimum_length;
  }
  actual = host_msg((uint32_t)(uintptr_t)incoming, incoming_capacity);
  if (actual > incoming_capacity) return;
  global = JS_GetGlobalObject(context);
  receiver = JS_GetPropertyStr(context, global, "__serverReceive");
  bytes = JS_NewArrayBufferCopy(context, incoming, actual);
  result = JS_Call(context, receiver, global, 1, &bytes);
  JS_FreeValue(context, bytes);
  JS_FreeValue(context, receiver);
  JS_FreeValue(context, global);
  if (JS_IsException(result)) report_exception();
  else JS_FreeValue(context, result);
  drain_jobs();
}
