#include "cutils.h"
#include "dtoa.h"
#include "libm.h"
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

size_t test_c_format_u32(char *dest, uint32_t value)
{
    return u32toa(dest, value);
}

size_t test_c_format_i32(char *dest, int32_t value)
{
    return i32toa(dest, value);
}

size_t test_c_format_u64(char *dest, uint64_t value)
{
    return u64toa(dest, value);
}

size_t test_c_format_i64(char *dest, int64_t value)
{
    return i64toa(dest, value);
}

size_t test_c_format_u64_radix(char *dest, uint64_t value, unsigned int radix)
{
    return u64toa_radix(dest, value, radix);
}

size_t test_c_format_i64_radix(char *dest, int64_t value, unsigned int radix)
{
    return i64toa_radix(dest, value, radix);
}

double test_c_floor(double value) { return js_floor(value); }
double test_c_ceil(double value) { return js_ceil(value); }
double test_c_trunc(double value) { return js_trunc(value); }
double test_c_round_inf(double value) { return js_round_inf(value); }
double test_c_fabs(double value) { return js_fabs(value); }
