#include "sys/time.h"
#include "time.h"

static int64_t floor_div(int64_t value, int64_t divisor)
{
    int64_t quotient = value / divisor;
    if (value < 0 && value % divisor != 0)
        quotient--;
    return quotient;
}

/* Convert days since 1970-01-01 to a proleptic Gregorian calendar date. */
static void civil_from_days(int64_t days, int *year, int *month, int *day)
{
    int64_t era, day_of_era, year_of_era, day_of_year, month_part;
    days += 719468;
    era = floor_div(days, 146097);
    day_of_era = days - era * 146097;
    year_of_era = (day_of_era - day_of_era / 1460 + day_of_era / 36524
                   - day_of_era / 146096) / 365;
    *year = (int)(year_of_era + era * 400);
    day_of_year = day_of_era - (365 * year_of_era + year_of_era / 4
                                - year_of_era / 100);
    month_part = (5 * day_of_year + 2) / 153;
    *day = (int)(day_of_year - (153 * month_part + 2) / 5 + 1);
    *month = (int)(month_part + (month_part < 10 ? 3 : -9));
    *year += *month <= 2;
}

int gettimeofday(struct timeval *value, void *timezone)
{
    (void)timezone;
    if (value != NULL) {
        value->tv_sec = 0;
        value->tv_usec = 0;
    }
    return 0;
}

int clock_gettime(int clock, struct timespec *value)
{
    (void)clock;
    value->tv_sec = 0;
    value->tv_nsec = 0;
    return 0;
}

struct tm *localtime_r(const time_t *value, struct tm *output)
{
    int64_t days = floor_div(*value, 86400);
    int64_t seconds = *value - days * 86400;
    int year, month, day;
    civil_from_days(days, &year, &month, &day);
    output->tm_hour = (int)(seconds / 3600);
    output->tm_min = (int)((seconds / 60) % 60);
    output->tm_sec = (int)(seconds % 60);
    output->tm_year = year - 1900;
    output->tm_mon = month - 1;
    output->tm_mday = day;
    output->tm_wday = (int)((days + 4) % 7);
    if (output->tm_wday < 0) output->tm_wday += 7;
    output->tm_yday = 0;
    output->tm_isdst = 0;
    output->tm_gmtoff = 0;
    return output;
}
