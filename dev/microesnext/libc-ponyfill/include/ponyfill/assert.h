/*
 * Excerpted from wasi-libc's libc-top-half/musl/include/assert.h.
 * See ../../README.md and the accompanying wasi-libc license files.
 */
#ifndef MICROESNEXT_ASSERT_H
#define MICROESNEXT_ASSERT_H

_Noreturn void __assert_fail(const char *expression, const char *file,
                             int line, const char *function);

#ifdef NDEBUG
#define assert(expression) ((void)0)
#else
#define assert(expression) \
    ((void)((expression) || \
            (__assert_fail(#expression, __FILE__, __LINE__, __func__), 0)))
#endif

#endif
