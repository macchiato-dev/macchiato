//! Allocation-free C functions used by the wasm32 engine.
//!
//! These loops follow Rust compiler-builtins' memory implementation and the
//! scalar wasi-libc/musl behavior documented in `docs/ponyfill-sources.md`.
//! The bounded string helpers preserve MicroQuickJS `cutils.c` behavior.

use core::ffi::{c_char, c_int, c_void};

unsafe fn copy_forward(mut dest: *mut u8, mut src: *const u8, count: usize) {
    let end = dest.wrapping_add(count);
    while dest < end {
        unsafe { *dest = *src };
        dest = dest.wrapping_add(1);
        src = src.wrapping_add(1);
    }
}

unsafe fn copy_backward(mut dest: *mut u8, mut src: *const u8, count: usize) {
    let start = dest;
    dest = dest.wrapping_add(count);
    src = src.wrapping_add(count);
    while dest > start {
        dest = dest.wrapping_sub(1);
        src = src.wrapping_sub(1);
        unsafe { *dest = *src };
    }
}

/// Copies `count` non-overlapping bytes and returns `dest`.
///
/// # Safety
///
/// The ranges must be valid for `count` bytes and must not overlap.
#[cfg_attr(target_arch = "wasm32", unsafe(no_mangle))]
pub unsafe extern "C" fn memcpy(
    dest: *mut c_void,
    src: *const c_void,
    count: usize,
) -> *mut c_void {
    unsafe { copy_forward(dest.cast(), src.cast(), count) };
    dest
}

/// Copies `count` bytes between ranges that may overlap and returns `dest`.
///
/// # Safety
///
/// Both ranges must be valid for `count` bytes.
#[cfg_attr(target_arch = "wasm32", unsafe(no_mangle))]
pub unsafe extern "C" fn memmove(
    dest: *mut c_void,
    src: *const c_void,
    count: usize,
) -> *mut c_void {
    let distance = (dest as usize).wrapping_sub(src as usize);
    if distance >= count {
        unsafe { copy_forward(dest.cast(), src.cast(), count) };
    } else {
        unsafe { copy_backward(dest.cast(), src.cast(), count) };
    }
    dest
}

/// Fills `count` bytes with the low byte of `value` and returns `dest`.
///
/// # Safety
///
/// `dest` must be writable for `count` bytes.
#[cfg_attr(target_arch = "wasm32", unsafe(no_mangle))]
pub unsafe extern "C" fn memset(dest: *mut c_void, value: c_int, count: usize) -> *mut c_void {
    let mut cursor = dest.cast::<u8>();
    let end = cursor.wrapping_add(count);
    while cursor < end {
        unsafe { *cursor = value as u8 };
        cursor = cursor.wrapping_add(1);
    }
    dest
}

/// Compares the first `count` bytes and returns the first unsigned difference.
///
/// # Safety
///
/// Both pointers must be readable for `count` bytes.
#[cfg_attr(target_arch = "wasm32", unsafe(no_mangle))]
pub unsafe extern "C" fn memcmp(left: *const c_void, right: *const c_void, count: usize) -> c_int {
    let mut index = 0;
    while index < count {
        // Wrapping pointer arithmetic matches compiler-builtins. Dereferencing
        // remains governed by the caller's C-compatible safety contract.
        let left_byte = unsafe { *left.cast::<u8>().wrapping_add(index) };
        let right_byte = unsafe { *right.cast::<u8>().wrapping_add(index) };
        if left_byte != right_byte {
            return c_int::from(left_byte) - c_int::from(right_byte);
        }
        index += 1;
    }
    0
}

/// Returns the number of bytes before the first null byte.
///
/// # Safety
///
/// `string` must point to a readable null-terminated byte string.
#[cfg_attr(target_arch = "wasm32", unsafe(no_mangle))]
pub unsafe extern "C" fn strlen(mut string: *const c_char) -> usize {
    let mut length = 0;
    while unsafe { *string } != 0 {
        length += 1;
        string = string.wrapping_add(1);
    }
    length
}

/// Copies a null-terminated string into a bounded buffer, truncating if needed.
///
/// # Safety
///
/// `source` must be readable through its null byte. When `size` is positive,
/// `dest` must be writable for `size` bytes.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn pstrcpy(dest: *mut c_char, size: c_int, source: *const c_char) {
    if size <= 0 {
        return;
    }
    let mut index = 0_usize;
    let last = size as usize - 1;
    while index < last {
        let byte = unsafe { *source.add(index) };
        if byte == 0 {
            break;
        }
        unsafe { *dest.add(index) = byte };
        index += 1;
    }
    unsafe { *dest.add(index) = 0 };
}

/// Appends a null-terminated string within a bounded buffer and returns `dest`.
///
/// # Safety
///
/// `dest` must contain a null byte within `size` bytes, and `source` must be
/// readable through its null byte. The writable portion of `dest` must not
/// overlap `source`.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn pstrcat(
    dest: *mut c_char,
    size: c_int,
    source: *const c_char,
) -> *mut c_char {
    let length = unsafe { strlen(dest) };
    if length < size.max(0) as usize {
        unsafe { pstrcpy(dest.add(length), size - length as c_int, source) };
    }
    dest
}

/// Tests a string prefix and optionally returns the first byte after it.
///
/// # Safety
///
/// `string` and `prefix` must be readable through their null bytes. If
/// `remainder` is non-null, it must be writable for one pointer.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn strstart(
    string: *const c_char,
    prefix: *const c_char,
    remainder: *mut *const c_char,
) -> c_int {
    let mut index = 0;
    loop {
        let expected = unsafe { *prefix.add(index) };
        if expected == 0 {
            if !remainder.is_null() {
                unsafe { *remainder = string.add(index) };
            }
            return 1;
        }
        if unsafe { *string.add(index) } != expected {
            return 0;
        }
        index += 1;
    }
}

#[cfg(test)]
mod tests {
    use super::{memcmp, memcpy, memmove, memset, pstrcat, pstrcpy, strlen, strstart};
    use core::ffi::c_char;

    struct CompareCase {
        left: &'static [u8],
        right: &'static [u8],
        count: usize,
        expected: i32,
    }

    const COMPARE_CASES: &[CompareCase] = &[
        CompareCase {
            left: b"",
            right: b"",
            count: 0,
            expected: 0,
        },
        CompareCase {
            left: b"same",
            right: b"same",
            count: 4,
            expected: 0,
        },
        CompareCase {
            left: b"a",
            right: b"b",
            count: 1,
            expected: -1,
        },
        CompareCase {
            left: b"z",
            right: b"a",
            count: 1,
            expected: 25,
        },
        CompareCase {
            left: &[0xff, 0],
            right: &[0x01, 0],
            count: 1,
            expected: 254,
        },
        CompareCase {
            left: b"ax",
            right: b"ay",
            count: 1,
            expected: 0,
        },
        CompareCase {
            left: b"ax",
            right: b"ay",
            count: 2,
            expected: -1,
        },
    ];

    #[test]
    fn compare_cases() {
        for case in COMPARE_CASES {
            let actual = unsafe {
                memcmp(
                    case.left.as_ptr().cast(),
                    case.right.as_ptr().cast(),
                    case.count,
                )
            };
            assert_eq!(actual, case.expected);
        }
    }

    const LENGTH_CASES: &[(&[u8], usize)] = &[
        (&[0], 0),
        (b"a\0", 1),
        (b"microquickjs\0ignored", 12),
        (&[0xff, 0x80, 0], 2),
    ];

    #[test]
    fn length_cases() {
        for (bytes, expected) in LENGTH_CASES {
            let actual = unsafe { strlen(bytes.as_ptr().cast::<c_char>()) };
            assert_eq!(actual, *expected);
        }
    }

    struct CopyCase {
        source: &'static [u8],
        initial: &'static [u8],
        count: usize,
        expected: &'static [u8],
    }

    const COPY_CASES: &[CopyCase] = &[
        CopyCase {
            source: b"",
            initial: b"",
            count: 0,
            expected: b"",
        },
        CopyCase {
            source: b"rust",
            initial: b"----",
            count: 4,
            expected: b"rust",
        },
        CopyCase {
            source: b"wasm",
            initial: b".....",
            count: 3,
            expected: b"was..",
        },
    ];

    #[test]
    fn copy_cases() {
        for case in COPY_CASES {
            let mut actual = case.initial.to_vec();
            let returned = unsafe {
                memcpy(
                    actual.as_mut_ptr().cast(),
                    case.source.as_ptr().cast(),
                    case.count,
                )
            };
            assert_eq!(returned, actual.as_mut_ptr().cast());
            assert_eq!(actual, case.expected);
        }
    }

    struct MoveCase {
        initial: &'static [u8],
        dest: usize,
        src: usize,
        count: usize,
        expected: &'static [u8],
    }

    const MOVE_CASES: &[MoveCase] = &[
        MoveCase {
            initial: b"abcdef",
            dest: 0,
            src: 2,
            count: 4,
            expected: b"cdefef",
        },
        MoveCase {
            initial: b"abcdef",
            dest: 2,
            src: 0,
            count: 4,
            expected: b"ababcd",
        },
        MoveCase {
            initial: b"abcdef",
            dest: 1,
            src: 1,
            count: 4,
            expected: b"abcdef",
        },
    ];

    #[test]
    fn move_cases() {
        for case in MOVE_CASES {
            let mut actual = case.initial.to_vec();
            unsafe {
                memmove(
                    actual.as_mut_ptr().add(case.dest).cast(),
                    actual.as_ptr().add(case.src).cast(),
                    case.count,
                );
            }
            assert_eq!(actual, case.expected);
        }
    }

    struct SetCase {
        initial: &'static [u8],
        value: i32,
        count: usize,
        expected: &'static [u8],
    }

    const SET_CASES: &[SetCase] = &[
        SetCase {
            initial: b"",
            value: 1,
            count: 0,
            expected: b"",
        },
        SetCase {
            initial: b"----",
            value: 0,
            count: 3,
            expected: b"\0\0\0-",
        },
        SetCase {
            initial: b"...",
            value: 0x1ff,
            count: 3,
            expected: &[0xff; 3],
        },
    ];

    #[test]
    fn set_cases() {
        for case in SET_CASES {
            let mut actual = case.initial.to_vec();
            let returned = unsafe { memset(actual.as_mut_ptr().cast(), case.value, case.count) };
            assert_eq!(returned, actual.as_mut_ptr().cast());
            assert_eq!(actual, case.expected);
        }
    }

    #[test]
    fn bounded_string_cases() {
        for (size, expected) in [(0, b"xxxxx".as_slice()), (1, b"\0xxxx"), (4, b"abc\0x")] {
            let mut actual = *b"xxxxx";
            unsafe { pstrcpy(actual.as_mut_ptr().cast(), size, c"abcdef".as_ptr()) };
            assert_eq!(actual, expected);
        }

        let mut appended = *b"ab\0----";
        let returned = unsafe { pstrcat(appended.as_mut_ptr().cast(), 7, c"cdefgh".as_ptr()) };
        assert_eq!(returned, appended.as_mut_ptr().cast());
        assert_eq!(&appended, b"abcdef\0");
    }

    #[test]
    fn prefix_cases() {
        let string = c"microquickjs";
        let mut remainder = core::ptr::null();
        assert_eq!(
            unsafe { strstart(string.as_ptr(), c"micro".as_ptr(), &mut remainder) },
            1
        );
        assert_eq!(unsafe { strlen(remainder) }, 7);
        assert_eq!(
            unsafe { strstart(string.as_ptr(), c"quick".as_ptr(), core::ptr::null_mut()) },
            0
        );
        assert_eq!(
            unsafe { strstart(string.as_ptr(), c"".as_ptr(), core::ptr::null_mut()) },
            1
        );
    }
}
