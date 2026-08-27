/*
 * Excerpted from wasi-libc's libc-top-half/musl/include/stdlib.h.
 * See ../../README.md and the accompanying wasi-libc license files.
 */
#pragma once

#include "stddef.h"

void *malloc(size_t size);
void free(void *pointer);
_Noreturn void abort(void);
_Noreturn void exit(int status);
int abs(int value);
