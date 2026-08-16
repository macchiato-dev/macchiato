#include "assert.h"
#include "ctype.h"
#include "stdint.h"
#include "stdlib.h"
#include "string.h"

int errno;

void *calloc(size_t count, size_t size)
{
    size_t total;
    void *result;
    if (count != 0 && size > (size_t)-1 / count)
        return NULL;
    total = count * size;
    result = malloc(total);
    if (result != NULL)
        memset(result, 0, total);
    return result;
}

void abort(void)
{
    __builtin_trap();
}

void exit(int status)
{
    (void)status;
    __builtin_trap();
}

void wwc_assert_fail(const char *expression, const char *file, int line)
{
    (void)expression;
    (void)file;
    (void)line;
    __builtin_trap();
}

int abs(int value)
{
    return value < 0 ? -value : value;
}

int atoi(const char *text)
{
    int sign = 1;
    int value = 0;
    while (isspace((unsigned char)*text)) text++;
    if (*text == '-') { sign = -1; text++; }
    else if (*text == '+') text++;
    while (isdigit((unsigned char)*text))
        value = value * 10 + *text++ - '0';
    return sign * value;
}

void *memchr(const void *memory, int byte, size_t length)
{
    const unsigned char *cursor = memory;
    while (length-- != 0) {
        if (*cursor == (unsigned char)byte) return (void *)cursor;
        cursor++;
    }
    return NULL;
}

int memcmp(const void *left, const void *right, size_t length)
{
    const unsigned char *a = left, *b = right;
    while (length-- != 0) {
        if (*a != *b) return *a < *b ? -1 : 1;
        a++; b++;
    }
    return 0;
}

void *memcpy(void *destination, const void *source, size_t length)
{
    unsigned char *output = destination;
    const unsigned char *input = source;
    while (length-- != 0) *output++ = *input++;
    return destination;
}

void *memmove(void *destination, const void *source, size_t length)
{
    unsigned char *output = destination;
    const unsigned char *input = source;
    if (output < input) return memcpy(destination, source, length);
    while (length-- != 0) output[length] = input[length];
    return destination;
}

void *memset(void *destination, int byte, size_t length)
{
    unsigned char *output = destination;
    while (length-- != 0) *output++ = (unsigned char)byte;
    return destination;
}

size_t strlen(const char *text)
{
    const char *end = text;
    while (*end != '\0') end++;
    return (size_t)(end - text);
}

int strcmp(const char *left, const char *right)
{
    while (*left != '\0' && *left == *right) { left++; right++; }
    return (unsigned char)*left - (unsigned char)*right;
}

char *strchr(const char *text, int character)
{
    do {
        if (*text == (char)character) return (char *)text;
    } while (*text++ != '\0');
    return NULL;
}

char *strrchr(const char *text, int character)
{
    const char *found = NULL;
    do {
        if (*text == (char)character) found = text;
    } while (*text++ != '\0');
    return (char *)found;
}

char *strstr(const char *text, const char *needle)
{
    size_t length = strlen(needle);
    if (length == 0) return (char *)text;
    while (*text != '\0') {
        if (*text == *needle && memcmp(text, needle, length) == 0)
            return (char *)text;
        text++;
    }
    return NULL;
}

static void swap_bytes(unsigned char *left, unsigned char *right, size_t size)
{
    while (size-- != 0) {
        unsigned char byte = *left;
        *left++ = *right;
        *right++ = byte;
    }
}

void qsort(void *base, size_t count, size_t size,
           int (*compare)(const void *, const void *))
{
    unsigned char *bytes = base;
    size_t index;
    for (index = 1; index < count; index++) {
        size_t cursor = index;
        while (cursor != 0 && compare(bytes + (cursor - 1) * size,
                                      bytes + cursor * size) > 0) {
            swap_bytes(bytes + (cursor - 1) * size, bytes + cursor * size, size);
            cursor--;
        }
    }
}
