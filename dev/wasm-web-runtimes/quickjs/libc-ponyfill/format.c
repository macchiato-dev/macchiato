#include "stdint.h"
#include "stdio.h"
#include "string.h"

typedef struct {
    char *output;
    size_t capacity;
    size_t length;
} Buffer;

static void put(Buffer *buffer, char value)
{
    if (buffer->capacity != 0 && buffer->length + 1 < buffer->capacity)
        buffer->output[buffer->length] = value;
    buffer->length++;
}

static void text(Buffer *buffer, const char *value, int limit)
{
    while (*value != '\0' && limit-- != 0) put(buffer, *value++);
}

static int digits(uint64_t value, unsigned base)
{
    int count = 1;
    while (value >= base) { value /= base; count++; }
    return count;
}

static void number(Buffer *buffer, uint64_t value, unsigned base, int uppercase,
                   int width, int zero, int negative)
{
    char temporary[32];
    const char *alphabet = uppercase ? "0123456789ABCDEF" : "0123456789abcdef";
    int count = 0;
    int required = digits(value, base) + negative;
    if (!zero && negative) { put(buffer, '-'); negative = 0; }
    while (required++ < width) put(buffer, zero ? '0' : ' ');
    if (negative) put(buffer, '-');
    do {
        temporary[count++] = alphabet[value % base];
        value /= base;
    } while (value != 0);
    while (count != 0) put(buffer, temporary[--count]);
}

int vsnprintf(char *output, size_t capacity, const char *format, va_list arguments)
{
    Buffer buffer = { output, capacity, 0 };
    while (*format != '\0') {
        int width = 0, precision = -1, long_count = 0, size_value = 0;
        int zero = 0, left = 0, plus = 0;
        char conversion;
        if (*format != '%') { put(&buffer, *format++); continue; }
        format++;
        if (*format == '%') { put(&buffer, *format++); continue; }
        while (*format == '-' || *format == '+' || *format == '0') {
            if (*format == '-') left = 1;
            if (*format == '+') plus = 1;
            if (*format == '0') zero = 1;
            format++;
        }
        if (*format == '*') { width = va_arg(arguments, int); format++; }
        else while (*format >= '0' && *format <= '9')
            width = width * 10 + *format++ - '0';
        if (*format == '.') {
            format++;
            if (*format == '*') { precision = va_arg(arguments, int); format++; }
            else {
                precision = 0;
                while (*format >= '0' && *format <= '9')
                    precision = precision * 10 + *format++ - '0';
            }
        }
        while (*format == 'l') { long_count++; format++; }
        if (*format == 'z') { size_value = 1; format++; }
        conversion = *format++;
        if (conversion == 's') {
            const char *value = va_arg(arguments, const char *);
            int length = (int)strlen(value);
            if (precision >= 0 && length > precision) length = precision;
            if (!left) while (width-- > length) put(&buffer, ' ');
            text(&buffer, value, length);
            if (left) while (width-- > length) put(&buffer, ' ');
        } else if (conversion == 'c') {
            put(&buffer, (char)va_arg(arguments, int));
        } else if (conversion == 'p') {
            uintptr_t value = (uintptr_t)va_arg(arguments, void *);
            text(&buffer, "0x", -1);
            number(&buffer, value, 16, 0, width > 2 ? width - 2 : 0, 0, 0);
        } else if (conversion == 'd' || conversion == 'i') {
            int64_t signed_value;
            uint64_t value;
            int negative;
            if (size_value) signed_value = (int64_t)va_arg(arguments, ptrdiff_t);
            else if (long_count >= 2) signed_value = va_arg(arguments, long long);
            else if (long_count == 1) signed_value = va_arg(arguments, long);
            else signed_value = va_arg(arguments, int);
            negative = signed_value < 0;
            value = negative ? (uint64_t)(-(signed_value + 1)) + 1 : (uint64_t)signed_value;
            if (plus && !negative) put(&buffer, '+');
            number(&buffer, value, 10, 0, width - (plus && !negative), zero, negative);
        } else if (conversion == 'u' || conversion == 'x' || conversion == 'X') {
            uint64_t value;
            if (size_value) value = va_arg(arguments, size_t);
            else if (long_count >= 2) value = va_arg(arguments, unsigned long long);
            else if (long_count == 1) value = va_arg(arguments, unsigned long);
            else value = va_arg(arguments, unsigned int);
            number(&buffer, value, conversion == 'u' ? 10 : 16,
                   conversion == 'X', width, zero, 0);
        } else if (conversion == 'f') {
            (void)va_arg(arguments, double);
            text(&buffer, "[float]", -1);
        } else {
            put(&buffer, '%');
            put(&buffer, conversion);
        }
    }
    if (capacity != 0)
        output[buffer.length < capacity ? buffer.length : capacity - 1] = '\0';
    return (int)buffer.length;
}

int snprintf(char *output, size_t length, const char *format, ...)
{
    int result;
    va_list arguments;
    va_start(arguments, format);
    result = vsnprintf(output, length, format, arguments);
    va_end(arguments);
    return result;
}

struct wwc_file { int ignored; };
static FILE output_file;
FILE *stdout = &output_file;
FILE *stderr = &output_file;

int fprintf(FILE *file, const char *format, ...)
{
    (void)file; (void)format;
    return 0;
}

int fputc(int character, FILE *file)
{
    (void)file;
    return (unsigned char)character;
}

int printf(const char *format, ...)
{
    (void)format;
    return 0;
}

int putchar(int character) { return character; }

size_t fwrite(const void *data, size_t size, size_t count, FILE *file)
{
    (void)data; (void)file;
    return size * count;
}
