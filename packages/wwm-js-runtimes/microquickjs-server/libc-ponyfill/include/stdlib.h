#ifndef MQJS_SERVER_STDLIB_H
#define MQJS_SERVER_STDLIB_H
#include "stddef.h"
void *malloc(size_t size);
void *realloc(void *pointer, size_t size);
void free(void *pointer);
#define alloca(size) __builtin_alloca(size)
void abort(void);
int abs(int value);
#endif
