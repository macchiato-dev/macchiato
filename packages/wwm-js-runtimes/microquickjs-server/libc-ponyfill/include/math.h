#ifndef MQJS_SERVER_MATH_H
#define MQJS_SERVER_MATH_H
#define INFINITY (__builtin_inff())
#define NAN (__builtin_nanf(""))
#define HUGE_VAL (__builtin_huge_val())
#define isnan(value) __builtin_isnan(value)
#define isfinite(value) __builtin_isfinite(value)
#define signbit(value) __builtin_signbit(value)
double ceil(double value);
double copysign(double magnitude, double sign);
double fabs(double value);
double floor(double value);
double fmod(double left, double right);
double ldexp(double value, int exponent);
double log(double value);
double log2(double value);
double pow(double base, double exponent);
double round(double value);
double sqrt(double value);
double trunc(double value);
#endif
