#ifndef MQJS_SERVER_SETJMP_H
#define MQJS_SERVER_SETJMP_H
typedef unsigned long __jmp_buf[8];
typedef struct {
  __jmp_buf state;
  unsigned long flags;
  unsigned long signal_stack[128 / sizeof(unsigned long)];
} jmp_buf[1];
int setjmp(jmp_buf environment) __attribute__((returns_twice));
_Noreturn void longjmp(jmp_buf environment, int value);
#define setjmp setjmp
#endif
