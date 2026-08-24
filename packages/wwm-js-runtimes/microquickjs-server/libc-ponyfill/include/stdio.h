#ifndef MQJS_SERVER_STDIO_H
#define MQJS_SERVER_STDIO_H
#include "stdarg.h"
#include "stddef.h"
int printf(const char *format, ...);
int snprintf(char *output, size_t length, const char *format, ...);
#endif
