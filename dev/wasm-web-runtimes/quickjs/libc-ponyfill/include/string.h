#ifndef WWC_STRING_H
#define WWC_STRING_H

#include "stddef.h"

void *memchr(const void *memory, int byte, size_t length);
int memcmp(const void *left, const void *right, size_t length);
void *memcpy(void *destination, const void *source, size_t length);
void *memmove(void *destination, const void *source, size_t length);
void *memset(void *destination, int byte, size_t length);
char *strchr(const char *text, int character);
int strcmp(const char *left, const char *right);
size_t strlen(const char *text);
char *strrchr(const char *text, int character);

#endif
