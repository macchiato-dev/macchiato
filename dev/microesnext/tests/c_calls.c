#include "cutils.h"

void test_c_pstrcpy(char *dest, int size, const char *source)
{
    pstrcpy(dest, size, source);
}

char *test_c_pstrcat(char *dest, int size, const char *source)
{
    return pstrcat(dest, size, source);
}

int test_c_strstart(const char *string, const char *prefix,
                    const char **remainder)
{
    return strstart(string, prefix, remainder);
}
