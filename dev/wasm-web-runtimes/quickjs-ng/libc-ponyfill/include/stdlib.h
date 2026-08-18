#ifndef WWC_STDLIB_H
#define WWC_STDLIB_H

#include "stddef.h"

void *malloc(size_t size);
void *calloc(size_t count, size_t size);
void *realloc(void *pointer, size_t size);
void free(void *pointer);
size_t malloc_usable_size(void *pointer);
#define alloca(size) __builtin_alloca(size)
void abort(void);
void exit(int status);
int abs(int value);
int atoi(const char *text);
double strtod(const char *text, char **end);
void qsort(void *base, size_t count, size_t size,
           int (*compare)(const void *, const void *));

#endif
