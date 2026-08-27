#ifndef __wasilibc___struct_timeval_h
#define __wasilibc___struct_timeval_h

#include "ponyfill/__typedef_suseconds_t.h"
#include "ponyfill/__typedef_time_t.h"

/* As specified in POSIX. */
struct timeval {
  time_t tv_sec;
  suseconds_t tv_usec;
};

#endif
