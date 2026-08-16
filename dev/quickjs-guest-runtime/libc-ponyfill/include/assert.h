#ifndef WWC_ASSERT_H
#define WWC_ASSERT_H

void wwc_assert_fail(const char *expression, const char *file, int line);

#ifdef NDEBUG
#define assert(expression) ((void)0)
#else
#define assert(expression) ((expression) ? (void)0 : \
    wwc_assert_fail(#expression, __FILE__, __LINE__))
#endif

#endif
