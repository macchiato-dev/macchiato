#ifndef MQJS_SERVER_ASSERT_H
#define MQJS_SERVER_ASSERT_H
#define assert(expression) ((expression) ? (void)0 : __builtin_trap())
#endif
