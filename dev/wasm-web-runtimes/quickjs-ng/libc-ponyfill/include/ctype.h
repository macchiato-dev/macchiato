#ifndef WWC_CTYPE_H
#define WWC_CTYPE_H

static inline int isdigit(int value) { return value >= '0' && value <= '9'; }
static inline int isspace(int value) {
    return value == ' ' || (value >= '\t' && value <= '\r');
}
static inline int tolower(int value) {
    return value >= 'A' && value <= 'Z' ? value + ('a' - 'A') : value;
}

#endif
