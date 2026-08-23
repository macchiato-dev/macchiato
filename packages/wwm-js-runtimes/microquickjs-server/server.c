#include <stddef.h>
#include <stdint.h>

#include "mquickjs.h"

#define JS_CLASS_HOST_REFERENCE (JS_CLASS_USER + 0)
#define JS_CLASS_COUNT (JS_CLASS_USER + 1)

static JSValue js_date_constructor(JSContext *, JSValue *, int, JSValue *);
static JSValue js_date_now(JSContext *, JSValue *, int, JSValue *);
static JSValue js_print(JSContext *, JSValue *, int, JSValue *);
static JSValue js_performance_now(JSContext *, JSValue *, int, JSValue *);
static JSValue js_host_reference_constructor(JSContext *, JSValue *, int, JSValue *);
static void js_host_reference_finalizer(JSContext *, void *);
static JSValue js_gc(JSContext *, JSValue *, int, JSValue *);
static JSValue js_load(JSContext *, JSValue *, int, JSValue *);
static JSValue js_setTimeout(JSContext *, JSValue *, int, JSValue *);
static JSValue js_clearTimeout(JSContext *, JSValue *, int, JSValue *);

#include "mqjs_stdlib.h"
#include "application.h"

__attribute__((import_module("host"), import_name("msg")))
extern uint32_t host_msg(uint32_t offset, uint32_t length);

__attribute__((noreturn)) void abort(void) { __builtin_trap(); }
__attribute__((noreturn))
void __assert_fail(const char *condition, const char *file,
                   unsigned int line, const char *function) {
  (void)condition; (void)file; (void)line; (void)function;
  __builtin_trap();
}

static uint8_t arena[4 * 1024 * 1024];
static uint8_t transfer[1024 * 1024];
static JSContext *context;
static uint32_t pending_request;
static uint32_t next_call = 1;

static JSValue unavailable(JSContext *ctx, JSValue *self, int argc, JSValue *argv) {
  (void)ctx; (void)self; (void)argc; (void)argv;
  return JS_UNDEFINED;
}

static JSValue js_date_constructor(JSContext *ctx, JSValue *self,
                                   int argc, JSValue *argv) {
  double epoch;
  (void)self;
  argc &= ~FRAME_CF_CTOR;
  if (argc != 1 || JS_ToNumber(ctx, &epoch, argv[0]))
    return JS_ThrowTypeError(ctx, "Date requires one numeric epoch value");
  return JS_NewDate(ctx, epoch);
}
static JSValue js_date_now(JSContext *ctx, JSValue *self, int argc, JSValue *argv) {
  return unavailable(ctx, self, argc, argv);
}
static JSValue js_print(JSContext *ctx, JSValue *self, int argc, JSValue *argv) {
  return unavailable(ctx, self, argc, argv);
}
static JSValue js_performance_now(JSContext *ctx, JSValue *self,
                                  int argc, JSValue *argv) {
  return unavailable(ctx, self, argc, argv);
}
static JSValue js_host_reference_constructor(JSContext *ctx, JSValue *self,
                                              int argc, JSValue *argv) {
  return unavailable(ctx, self, argc & ~FRAME_CF_CTOR, argv);
}
static void js_host_reference_finalizer(JSContext *ctx, void *opaque) {
  (void)ctx; (void)opaque;
}
static JSValue js_gc(JSContext *ctx, JSValue *self, int argc, JSValue *argv) {
  (void)self; (void)argc; (void)argv;
  JS_GC(ctx);
  return JS_UNDEFINED;
}
static JSValue js_load(JSContext *ctx, JSValue *self, int argc, JSValue *argv) {
  return unavailable(ctx, self, argc, argv);
}
static JSValue js_setTimeout(JSContext *ctx, JSValue *self, int argc, JSValue *argv) {
  return unavailable(ctx, self, argc, argv);
}
static JSValue js_clearTimeout(JSContext *ctx, JSValue *self, int argc, JSValue *argv) {
  return unavailable(ctx, self, argc, argv);
}

static int read_uint(const uint8_t *bytes, uint32_t length,
                     uint32_t *at, uint32_t *value) {
  uint32_t result = 0, shift = 0;
  for (uint32_t count = 0; count < 5 && *at < length; count++) {
    uint8_t byte = bytes[(*at)++];
    result |= (uint32_t)(byte & 127) << shift;
    if (!(byte & 128)) { *value = result; return 0; }
    shift += 7;
  }
  return -1;
}

static int read_uint64(const uint8_t *bytes, uint32_t length,
                       uint32_t *at, uint64_t *value) {
  uint64_t result = 0;
  uint32_t shift = 0;
  for (uint32_t count = 0; count < 8 && *at < length; count++) {
    uint8_t byte = bytes[(*at)++];
    result |= (uint64_t)(byte & 127) << shift;
    if (!(byte & 128)) { *value = result; return result <= 9007199254740991ULL ? 0 : -1; }
    shift += 7;
  }
  return -1;
}

static uint32_t write_uint(uint8_t *bytes, uint32_t at, uint32_t value) {
  do {
    uint8_t byte = value & 127;
    value >>= 7;
    bytes[at++] = byte | (value ? 128 : 0);
  } while (value);
  return at;
}

static uint32_t write_uint64(uint8_t *bytes, uint32_t at, uint64_t value) {
  do {
    uint8_t byte = value & 127;
    value >>= 7;
    bytes[at++] = byte | (value ? 128 : 0);
  } while (value);
  return at;
}

/* The first server slice intentionally accepts a string payload. The typed
   envelope and request id are already the shared server-use wire protocol;
   later value kinds extend this decoder rather than changing the ABI. */
static int decode_value(uint32_t length, uint32_t *at, JSValue *value,
                        uint32_t depth) {
  uint32_t type, size;
  if (depth > 24 || *at >= length) return -1;
  type = transfer[(*at)++];
  if (type == 0) { *value = JS_NULL; return 0; }
  if (type == 1 || type == 2) { *value = JS_NewBool(type == 2); return 0; }
  if (type == 3 || type == 4) {
    uint64_t integer;
    if (read_uint64(transfer, length, at, &integer)) return -1;
    *value = JS_NewInt64(context, type == 3 ? (int64_t)integer : -(int64_t)integer - 1);
    return 0;
  }
  if (type == 5) {
    if (read_uint(transfer, length, at, &size) || size > length - *at) return -1;
    *value = JS_NewStringLen(context, (const char *)(transfer + *at), size);
    *at += size;
    return JS_IsException(*value) ? -1 : 0;
  }
  if (type == 6) {
    JSGCRef root;
    if (read_uint(transfer, length, at, &size) || size > 65536 || size > length - *at)
      return -1;
    /* MicroQuickJS typed-array construction is not part of its small public C
       API. Decode bounded device chunks as dense byte arrays; the guest can
       consume and discard each one without retaining the request body. */
    *value = JS_NewArray(context, (int)size);
    JS_PushGCRef(context, &root); root.val = *value;
    for (uint32_t index = 0; index < size; index++) {
      if (JS_IsException(JS_SetPropertyUint32(context, root.val, index,
                                              JS_NewInt32(context, transfer[*at + index])))) {
        JS_PopGCRef(context, &root); return -1;
      }
    }
    *at += size;
    *value = JS_PopGCRef(context, &root);
    return 0;
  }
  if (type == 7) {
    JSGCRef root;
    if (read_uint(transfer, length, at, &size) || size > 65536) return -1;
    *value = JS_NewArray(context, (int)size);
    JS_PushGCRef(context, &root); root.val = *value;
    for (uint32_t index = 0; index < size; index++) {
      JSValue item;
      if (decode_value(length, at, &item, depth + 1) ||
          JS_IsException(JS_SetPropertyUint32(context, root.val, index, item))) {
        JS_PopGCRef(context, &root); return -1;
      }
    }
    *value = JS_PopGCRef(context, &root);
    return 0;
  }
  if (type == 9) {
    if (read_uint(transfer, length, at, &size) || size > 262144 ||
        size > length - *at) return -1;
    /* Type 9 is an explicitly trusted WTF-8 string. MicroQuickJS strings use
       WTF-8 internally, preserving lone UTF-16 surrogates that TextEncoder
       would replace. Only host devices can construct this wire value. */
    *value = JS_NewStringLen(context, (const char *)(transfer + *at), size);
    *at += size;
    return JS_IsException(*value) ? -1 : 0;
  }
  return -1;
}

static int decode_message(uint32_t length, uint32_t *message_type,
                          uint32_t *id, int *ok, JSValue *input) {
  uint32_t at = 0, count;
  if (at >= length || transfer[at++] != 7 ||
      read_uint(transfer, length, &at, &count) || (count != 3 && count != 4) ||
      at >= length || transfer[at++] != 3 ||
      read_uint(transfer, length, &at, message_type) ||
      at >= length || transfer[at++] != 3 ||
      read_uint(transfer, length, &at, id)) return -1;
  if (*message_type == 0 && count == 3) {
    if (decode_value(length, &at, input, 0)) return -1;
  } else if (*message_type == 3 && count == 4) {
    if (at >= length || (transfer[at] != 1 && transfer[at] != 2)) return -1;
    *ok = transfer[at++] == 2;
    if (decode_value(length, &at, input, 0)) return -1;
  } else return -1;
  return at == length ? 0 : -1;
}

static int encode_value(JSValue value, uint32_t *at, uint32_t depth) {
  if (depth > 24 || *at >= sizeof(transfer)) return -1;
  if (JS_IsNull(value)) { transfer[(*at)++] = 0; return 0; }
  if (JS_IsBool(value)) {
    transfer[(*at)++] = JS_VALUE_GET_SPECIAL_VALUE(value) ? 2 : 1;
    return 0;
  }
  if (JS_IsNumber(context, value)) {
    double number;
    int64_t integer;
    uint64_t magnitude;
    if (JS_ToNumber(context, &number, value) || number < -9007199254740991.0 ||
        number > 9007199254740991.0) return -1;
    integer = (int64_t)number;
    if ((double)integer != number) return -1;
    transfer[(*at)++] = integer >= 0 ? 3 : 4;
    magnitude = integer >= 0 ? (uint64_t)integer : (uint64_t)(-integer - 1);
    *at = write_uint64(transfer, *at, magnitude);
    return 0;
  }
  if (JS_IsString(context, value)) {
    JSCStringBuf buffer;
    size_t size;
    const char *text = JS_ToCStringLen(context, &size, value, &buffer);
    if (!text || size > sizeof(transfer) - *at - 6) return -1;
    transfer[(*at)++] = 5; *at = write_uint(transfer, *at, (uint32_t)size);
    for (uint32_t index = 0; index < size; index++) transfer[(*at)++] = text[index];
    return 0;
  }
  if (JS_IsArray(context, value)) {
    JSValue length_value = JS_GetPropertyStr(context, value, "length");
    uint32_t size;
    if (JS_ToUint32(context, &size, length_value) || size > 65536) return -1;
    transfer[(*at)++] = 7; *at = write_uint(transfer, *at, size);
    for (uint32_t index = 0; index < size; index++) {
      JSValue item = JS_GetPropertyUint32(context, value, index);
      if (encode_value(item, at, depth + 1)) return -1;
    }
    return 0;
  }
  return -1;
}

static void send_response(uint32_t id, JSValue value) {
  uint32_t at = 0, value_at;
  transfer[at++] = 'W'; transfer[at++] = 'W';
  transfer[at++] = 'M'; transfer[at++] = 'S';
  transfer[at++] = 7; at = write_uint(transfer, at, 3);
  transfer[at++] = 3; at = write_uint(transfer, at, 1);
  transfer[at++] = 3; at = write_uint(transfer, at, id);
  value_at = at;
  if (!encode_value(value, &at, 0)) host_msg((uint32_t)(uintptr_t)transfer, at);
  else transfer[value_at] = 0;
}

static void send_error_text(uint32_t id, const char *body, uint32_t body_size) {
  static const char type_name[] = "content-type";
  static const char type_value[] = "text/plain; charset=utf-8";
  uint32_t at = 0;
  transfer[at++] = 'W'; transfer[at++] = 'W'; transfer[at++] = 'M'; transfer[at++] = 'S';
  transfer[at++] = 7; at = write_uint(transfer, at, 3);
  transfer[at++] = 3; at = write_uint(transfer, at, 1);
  transfer[at++] = 3; at = write_uint(transfer, at, id);
  transfer[at++] = 7; at = write_uint(transfer, at, 3);
  transfer[at++] = 3; at = write_uint(transfer, at, 500);
  transfer[at++] = 7; at = write_uint(transfer, at, 1);
  transfer[at++] = 7; at = write_uint(transfer, at, 2);
  transfer[at++] = 5; at = write_uint(transfer, at, sizeof(type_name) - 1);
  for (uint32_t i = 0; i < sizeof(type_name) - 1; i++) transfer[at++] = type_name[i];
  transfer[at++] = 5; at = write_uint(transfer, at, sizeof(type_value) - 1);
  for (uint32_t i = 0; i < sizeof(type_value) - 1; i++) transfer[at++] = type_value[i];
  transfer[at++] = 5; at = write_uint(transfer, at, body_size);
  for (uint32_t i = 0; i < body_size; i++) transfer[at++] = body[i];
  host_msg((uint32_t)(uintptr_t)transfer, at);
}

static void send_error_response(uint32_t id) {
  static const char body[] = "Server machine error";
  send_error_text(id, body, sizeof(body) - 1);
}

static void send_exception_response(uint32_t id) {
  JSValue exception = JS_GetException(context);
  JSValue detail = JS_GetPropertyStr(context, exception, "message");
  JSCStringBuf buffer;
  size_t size = 0;
  const char *message = JS_ToCStringLen(context, &size,
    JS_IsException(detail) ? exception : detail, &buffer);
  if (!message || size > 4096) send_error_response(id);
  else send_error_text(id, message, (uint32_t)size);
}

static int array_size(JSValue array, uint32_t *size) {
  JSValue length = JS_GetPropertyStr(context, array, "length");
  return !JS_IsArray(context, array) || JS_ToUint32(context, size, length);
}

static int send_device(JSValue instruction) {
  uint32_t size, at = 0;
  JSValue kind, device, operation, input;
  int kind_number;
  if (array_size(instruction, &size) || size != 4) return -1;
  kind = JS_GetPropertyUint32(context, instruction, 0);
  if (JS_ToInt32(context, &kind_number, kind) || kind_number != 2) return -1;
  device = JS_GetPropertyUint32(context, instruction, 1);
  operation = JS_GetPropertyUint32(context, instruction, 2);
  input = JS_GetPropertyUint32(context, instruction, 3);
  transfer[at++] = 'W'; transfer[at++] = 'W';
  transfer[at++] = 'M'; transfer[at++] = 'S';
  transfer[at++] = 7; at = write_uint(transfer, at, 5);
  transfer[at++] = 3; at = write_uint(transfer, at, 2);
  transfer[at++] = 3; at = write_uint(transfer, at, next_call);
  if (encode_value(device, &at, 0) || encode_value(operation, &at, 0) ||
      encode_value(input, &at, 0)) return -1;
  host_msg((uint32_t)(uintptr_t)transfer, at);
  return 0;
}

static void finish_or_suspend(uint32_t request_id, JSValue result) {
  uint32_t size;
  if (!array_size(result, &size) && size == 4) {
    pending_request = request_id;
    if (!send_device(result)) return;
    pending_request = 0;
  }
  send_response(request_id, result);
}

static int start(void) {
  JSValue program, result;
  context = JS_NewContext(arena, sizeof(arena), &js_stdlib);
  if (!context || JS_RelocateBytecode(context, application_bytecode,
                                      sizeof(application_bytecode))) return -1;
  program = JS_LoadBytecode(context, application_bytecode);
  if (JS_IsException(program)) return -1;
  result = JS_Run(context, program);
  return JS_IsException(result) ? -1 : 0;
}

__attribute__((export_name("onmsg")))
void onmsg(uint32_t minimum_length) {
  uint32_t actual, id = 0, message_type = 0;
  int ok = 0;
  JSValue global, handler, input, result;
  if (!context && start()) return;
  if (!minimum_length || minimum_length > sizeof(transfer)) return;
  /* An earlier outbound message may have left WWMS in the reusable transfer
     buffer. Clear it before asking the host to fill an inbound delivery. */
  transfer[0] = 0; transfer[1] = 0; transfer[2] = 0; transfer[3] = 0;
  actual = host_msg((uint32_t)(uintptr_t)transfer, minimum_length);
  if (actual > minimum_length || decode_message(actual, &message_type, &id, &ok, &input)) {
    uint32_t request_id = pending_request ? pending_request : id;
    pending_request = 0;
    if (request_id) send_error_response(request_id);
    return;
  }

  global = JS_GetGlobalObject(context);
  if (message_type == 3 && (id != next_call || !pending_request)) return;
  handler = JS_GetPropertyStr(context, global,
    message_type == 0 ? "serverHandle" : "serverResume");
  JS_PushArg(context, input);
  if (message_type == 3) JS_PushArg(context, JS_NewBool(ok));
  JS_PushArg(context, handler);
  JS_PushArg(context, global);
  result = JS_Call(context, message_type == 0 ? 1 : 2);
  if (JS_IsException(result)) {
    uint32_t request_id = message_type == 0 ? id : pending_request;
    pending_request = 0;
    send_exception_response(request_id);
    return;
  }
  if (message_type == 0) finish_or_suspend(id, result);
  else {
    uint32_t request_id = pending_request;
    pending_request = 0; next_call++;
    finish_or_suspend(request_id, result);
  }
}
