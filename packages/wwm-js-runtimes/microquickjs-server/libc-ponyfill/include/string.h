#ifndef MQJS_SERVER_STRING_H
#define MQJS_SERVER_STRING_H
#include "stddef.h"
int memcmp(const void *left, const void *right, size_t length);
void *memcpy(void *destination, const void *source, size_t length);
void *memmove(void *destination, const void *source, size_t length);
void *memset(void *destination, int byte, size_t length);
size_t strlen(const char *text);
#endif
