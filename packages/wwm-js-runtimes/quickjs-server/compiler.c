#include "quickjs.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main(int argc, char **argv) {
  FILE *input, *output;
  long source_size;
  char *source;
  uint8_t *bytecode;
  size_t bytecode_size;
  JSRuntime *runtime;
  JSContext *context;
  JSValue program;
  if (argc != 3 && !(argc == 4 && !strcmp(argv[3], "--strip-source"))) return 2;
  input = fopen(argv[1], "rb");
  if (!input || fseek(input, 0, SEEK_END) || (source_size = ftell(input)) < 0 ||
      fseek(input, 0, SEEK_SET)) return 3;
  source = malloc((size_t)source_size + 1);
  if (!source || fread(source, 1, (size_t)source_size, input) != (size_t)source_size)
    return 4;
  fclose(input);
  source[source_size] = 0;
  runtime = JS_NewRuntime();
  context = runtime ? JS_NewContext(runtime) : NULL;
  if (!context) return 5;
  // Keep line/stack information, but optionally omit repeated function source
  // strings in shipped UI programs. The readable .js artifact remains beside it.
  if (argc == 4) JS_SetStripInfo(runtime, JS_STRIP_SOURCE);
  program = JS_Eval(context, source, (size_t)source_size,
    argv[1], JS_EVAL_TYPE_GLOBAL | JS_EVAL_FLAG_COMPILE_ONLY);
  free(source);
  if (JS_IsException(program)) return 6;
  bytecode = JS_WriteObject(context, &bytecode_size, program,
                            JS_WRITE_OBJ_BYTECODE);
  if (!bytecode) return 7;
  output = fopen(argv[2], "wb");
  if (!output || fwrite(bytecode, 1, bytecode_size, output) != bytecode_size)
    return 8;
  fclose(output);
  js_free(context, bytecode);
  JS_FreeValue(context, program);
  JS_FreeContext(context);
  JS_FreeRuntime(runtime);
  return 0;
}
