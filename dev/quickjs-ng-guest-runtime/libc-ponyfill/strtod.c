#include "stddef.h"
#include "stdint.h"
#include "dtoa.h"
#include "stdlib.h"

double strtod(const char *text, char **end)
{
    const char *next;
    JSATODTempMem memory;
    double value = js_atod(text, &next, 10, 0, &memory);
    if (end != NULL)
        *end = (char *)next;
    return value;
}
