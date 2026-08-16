#ifndef WWC_TIME_H
#define WWC_TIME_H

#include "stddef.h"
#include "stdint.h"

typedef int64_t time_t;
struct tm {
    int tm_sec, tm_min, tm_hour, tm_mday, tm_mon, tm_year;
    int tm_wday, tm_yday, tm_isdst;
    long tm_gmtoff;
};

struct tm *gmtime(const time_t *value);
struct tm *localtime(const time_t *value);
struct tm *localtime_r(const time_t *value, struct tm *output);
time_t mktime(struct tm *value);
size_t strftime(char *output, size_t length, const char *format,
                const struct tm *value);

#endif
