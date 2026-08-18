#ifndef WWC_FENV_H
#define WWC_FENV_H

#define FE_TONEAREST 0
static inline int fegetround(void) { return FE_TONEAREST; }
static inline int fesetround(int mode) { return mode == FE_TONEAREST ? 0 : -1; }

#endif
