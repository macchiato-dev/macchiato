#ifndef WWC_STDIO_H
#define WWC_STDIO_H

#include "stdarg.h"
#include "stddef.h"

typedef struct wwc_file FILE;
extern FILE *stdout;
extern FILE *stderr;

int fprintf(FILE *file, const char *format, ...);
int vfprintf(FILE *file, const char *format, va_list arguments);
int fputc(int character, FILE *file);
int printf(const char *format, ...);
int putchar(int character);
int puts(const char *text);
int snprintf(char *output, size_t length, const char *format, ...);
int vsnprintf(char *output, size_t length, const char *format, va_list arguments);
size_t fwrite(const void *data, size_t size, size_t count, FILE *file);

#endif
