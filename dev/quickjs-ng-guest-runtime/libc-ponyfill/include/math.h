#ifndef WWC_MATH_H
#define WWC_MATH_H

#define INFINITY (__builtin_inff())
#define NAN (__builtin_nanf(""))
#define HUGE_VAL (__builtin_huge_val())
#define M_PI 3.14159265358979323846
#define isnan(value) __builtin_isnan(value)
#define isfinite(value) __builtin_isfinite(value)
#define isinf(value) __builtin_isinf(value)
#define signbit(value) __builtin_signbit(value)

double acos(double value);
double acosh(double value);
double asin(double value);
double asinh(double value);
double atan(double value);
double atan2(double left, double right);
double atanh(double value);
double cbrt(double value);
double ceil(double value);
double cos(double value);
double copysign(double magnitude, double sign);
double cosh(double value);
double exp(double value);
double exp2(double value);
double expm1(double value);
double fabs(double value);
double floor(double value);
double frexp(double value, int *exponent);
double fma(double first, double second, double third);
double fmax(double left, double right);
double fmin(double left, double right);
double fmod(double left, double right);
double hypot(double left, double right);
double ldexp(double value, int exponent);
double log(double value);
double log10(double value);
double log1p(double value);
double log2(double value);
long lrint(double value);
double modf(double value, double *integer);
double pow(double base, double exponent);
double remainder(double left, double right);
double round(double value);
double scalbn(double value, int exponent);
double sin(double value);
double sinh(double value);
double sqrt(double value);
double tan(double value);
double tanh(double value);
double trunc(double value);

#endif
