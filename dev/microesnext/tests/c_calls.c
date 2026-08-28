#include "cutils.h"
#include "ponyfill/stdlib.h"

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

int test_c_has_suffix(const char *string, const char *suffix)
{
    return has_suffix(string, suffix);
}

size_t test_c_unicode_to_utf8(uint8_t *dest, unsigned int code_point)
{
    return __unicode_to_utf8(dest, code_point);
}

int test_c_unicode_from_utf8(const uint8_t *source, size_t max_length,
                             size_t *length)
{
    return __unicode_from_utf8(source, max_length, length);
}

int test_c_utf8_get(const uint8_t *source, size_t *length)
{
    return __utf8_get(source, length);
}

int test_c_abs(int value)
{
    return abs(value);
}
