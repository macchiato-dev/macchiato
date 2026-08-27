/*
 * Excerpted from wasi-libc's libc-top-half/musl/include/assert.h.
 * See ../../README.md and the accompanying wasi-libc license files.
 */
#pragma once

_Noreturn void __assert_fail(const char *expression, const char *file,
                             int line, const char *function);

#define assert(expression) \
    ((void)((expression) || \
            (__assert_fail(#expression, __FILE__, __LINE__, __func__), 0)))
