/*
 * Excerpted from wasi-libc's libc-top-half/musl/include/inttypes.h.
 * See ../../README.md and the accompanying wasi-libc license files.
 */
#pragma once

#include "ponyfill/stdint.h"

#define PRIo32 __UINT32_FMTo__
#define PRIo64 __UINT64_FMTo__
#define PRIu64 __UINT64_FMTu__
