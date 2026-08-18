#ifndef WWC_SYS_TIME_H
#define WWC_SYS_TIME_H

#include "stdint.h"

struct timeval { int64_t tv_sec; int32_t tv_usec; };
int gettimeofday(struct timeval *value, void *timezone);

#endif
