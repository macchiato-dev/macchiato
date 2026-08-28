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

/// Returns whether `string` ends with `suffix`.
///
/// # Safety
///
/// Both pointers must be readable through their null bytes.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn has_suffix(string: *const c_char, suffix: *const c_char) -> c_int {
    let length = unsafe { strlen(string) };
    let suffix_length = unsafe { strlen(suffix) };
    if length < suffix_length {
        return 0;
    }
    (unsafe {
        memcmp(
            string.add(length - suffix_length).cast(),
            suffix.cast(),
            suffix_length,
        ) == 0
    }) as c_int
}

/// Encodes a non-ASCII code point using MicroQuickJS's UTF-8/WTF-8 helper.
///
/// # Safety
///
/// `dest` must be writable for four bytes.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn __unicode_to_utf8(dest: *mut u8, code_point: u32) -> usize {
    let length = if code_point < 0x800 {
        unsafe { *dest = ((code_point >> 6) | 0xc0) as u8 };
        2
    } else if code_point < 0x10000 {
        unsafe { *dest = ((code_point >> 12) | 0xe0) as u8 };
        3
    } else if code_point < 0x20_0000 {
        unsafe {
            *dest = ((code_point >> 18) | 0xf0) as u8;
            *dest.add(1) = (((code_point >> 12) & 0x3f) | 0x80) as u8;
        }
        4
    } else {
        return 0;
    };
    if length >= 3 {
        unsafe { *dest.add(length - 2) = (((code_point >> 6) & 0x3f) | 0x80) as u8 };
    }
    unsafe { *dest.add(length - 1) = ((code_point & 0x3f) | 0x80) as u8 };
    length
}

/// Validates and decodes one UTF-8/WTF-8 sequence.
///
/// # Safety
///
/// `source` must be readable for `max_length` bytes and `length` writable.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn __unicode_from_utf8(
    source: *const u8,
    max_length: usize,
    length: *mut usize,
) -> c_int {
    let first = unsafe { *source };
    let mut consumed = 1;
    let value = if first < 0xc0 {
        first as c_int
    } else if first < 0xe0 {
        if max_length < 2 || unsafe { *source.add(1) } & 0xc0 != 0x80 {
            return unsafe { invalid_utf8(length, consumed) };
        }
        consumed = 2;
        let value = ((first & 0x1f) as c_int) << 6 | (unsafe { *source.add(1) } & 0x3f) as c_int;
        if value < 0x80 {
            return unsafe { invalid_utf8(length, consumed) };
        }
        value
    } else if first < 0xf0 {
        if max_length < 2 || unsafe { *source.add(1) } & 0xc0 != 0x80 {
            return unsafe { invalid_utf8(length, consumed) };
        }
        consumed = 2;
        if max_length < 3 || unsafe { *source.add(2) } & 0xc0 != 0x80 {
            return unsafe { invalid_utf8(length, consumed) };
        }
        consumed = 3;
        let value = ((first & 0x0f) as c_int) << 12
            | ((unsafe { *source.add(1) } & 0x3f) as c_int) << 6
            | (unsafe { *source.add(2) } & 0x3f) as c_int;
        if value < 0x800 {
            return unsafe { invalid_utf8(length, consumed) };
        }
        value
    } else if first < 0xf8 {
        for needed in 2..=4 {
            if max_length < needed || unsafe { *source.add(needed - 1) } & 0xc0 != 0x80 {
                return unsafe { invalid_utf8(length, needed - 1) };
            }
        }
        consumed = 4;
        let value = ((first & 7) as c_int) << 18
            | ((unsafe { *source.add(1) } & 0x3f) as c_int) << 12
            | ((unsafe { *source.add(2) } & 0x3f) as c_int) << 6
            | (unsafe { *source.add(3) } & 0x3f) as c_int;
        if !(0x10000..=0x10ffff).contains(&value) {
            return unsafe { invalid_utf8(length, consumed) };
        }
        value
    } else {
        return unsafe { invalid_utf8(length, consumed) };
    };
    unsafe { *length = consumed };
    value
}

unsafe fn invalid_utf8(length: *mut usize, consumed: usize) -> c_int {
    unsafe { *length = consumed };
    -1
}

/// Decodes one sequence without validation, matching the trusted-input helper.
///
/// # Safety
///
/// `source` must contain the number of bytes implied by its first byte, and
/// `length` must be writable.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn __utf8_get(source: *const u8, length: *mut usize) -> c_int {
    let first = unsafe { *source };
    let (value, consumed) = if first < 0xc0 {
        (first as c_int, 1)
    } else if first < 0xe0 {
        (
            ((first & 0x1f) as c_int) << 6 | (unsafe { *source.add(1) } & 0x3f) as c_int,
            2,
        )
    } else if first < 0xf0 {
        (
            ((first & 0x0f) as c_int) << 12
                | ((unsafe { *source.add(1) } & 0x3f) as c_int) << 6
                | (unsafe { *source.add(2) } & 0x3f) as c_int,
            3,
        )
    } else if first < 0xf8 {
        (
            ((first & 7) as c_int) << 18
                | ((unsafe { *source.add(1) } & 0x3f) as c_int) << 12
                | ((unsafe { *source.add(2) } & 0x3f) as c_int) << 6
                | (unsafe { *source.add(3) } & 0x3f) as c_int,
            4,
        )
    } else {
        (first as c_int, 1)
    };
    unsafe { *length = consumed };
    value
}

/// Returns the C absolute value for inputs where C defines the operation.
#[unsafe(no_mangle)]
pub extern "C" fn abs(value: c_int) -> c_int {
    if value < 0 {
        value.wrapping_neg()
    } else {
        value
    }
}

#[cfg(test)]
mod tests {
    use super::{
        __unicode_from_utf8, __unicode_to_utf8, __utf8_get, abs, has_suffix, memcmp, memcpy,
        memmove, memset, pstrcat, pstrcpy, strlen, strstart,
    };
    use core::ffi::{c_char, c_int};

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

    #[test]
    fn suffix_cases() {
        for (string, suffix, expected) in [
            (c"microquickjs", c"quickjs", 1),
            (c"microquickjs", c"micro", 0),
            (c"microquickjs", c"", 1),
            (c"js", c"quickjs", 0),
        ] {
            assert_eq!(
                unsafe { has_suffix(string.as_ptr(), suffix.as_ptr()) },
                expected
            );
        }
    }

    #[test]
    fn unicode_encode_cases() {
        for (code_point, expected) in [
            (0x80, &[0xc2, 0x80][..]),
            (0x7ff, &[0xdf, 0xbf]),
            (0x800, &[0xe0, 0xa0, 0x80]),
            (0xd800, &[0xed, 0xa0, 0x80]),
            (0x10ffff, &[0xf4, 0x8f, 0xbf, 0xbf]),
        ] {
            let mut bytes = [0; 4];
            let length = unsafe { __unicode_to_utf8(bytes.as_mut_ptr(), code_point) };
            assert_eq!(&bytes[..length], expected);
        }
        let mut bytes = [0xaa; 4];
        assert_eq!(
            unsafe { __unicode_to_utf8(bytes.as_mut_ptr(), 0x20_0000) },
            0
        );
        assert_eq!(bytes, [0xaa; 4]);
    }

    #[test]
    fn unicode_decode_cases() {
        struct Case {
            bytes: &'static [u8],
            max_length: usize,
            expected: c_int,
            consumed: usize,
        }
        let cases = [
            Case {
                bytes: b"A",
                max_length: 1,
                expected: 0x41,
                consumed: 1,
            },
            Case {
                bytes: &[0xc2, 0x80],
                max_length: 2,
                expected: 0x80,
                consumed: 2,
            },
            Case {
                bytes: &[0xed, 0xa0, 0x80],
                max_length: 3,
                expected: 0xd800,
                consumed: 3,
            },
            Case {
                bytes: &[0xf4, 0x8f, 0xbf, 0xbf],
                max_length: 4,
                expected: 0x10ffff,
                consumed: 4,
            },
            Case {
                bytes: &[0xc0, 0x80],
                max_length: 2,
                expected: -1,
                consumed: 2,
            },
            Case {
                bytes: &[0xe2, 0x82],
                max_length: 2,
                expected: -1,
                consumed: 2,
            },
            Case {
                bytes: &[0xf0, 0x90, 0x80],
                max_length: 3,
                expected: -1,
                consumed: 3,
            },
            Case {
                bytes: &[0xf8],
                max_length: 1,
                expected: -1,
                consumed: 1,
            },
        ];
        for case in cases {
            let mut consumed = 0;
            let actual =
                unsafe { __unicode_from_utf8(case.bytes.as_ptr(), case.max_length, &mut consumed) };
            assert_eq!((actual, consumed), (case.expected, case.consumed));
        }
    }

    #[test]
    fn trusted_utf8_decode_cases() {
        for (bytes, expected, expected_length) in [
            (b"A".as_slice(), 0x41, 1),
            (&[0xc2, 0x80], 0x80, 2),
            (&[0xe2, 0x82, 0xac], 0x20ac, 3),
            (&[0xf0, 0x9f, 0x90, 0x88], 0x1f408, 4),
            (&[0xf8, 0, 0, 0], 0xf8, 1),
        ] {
            let mut length = 0;
            let actual = unsafe { __utf8_get(bytes.as_ptr(), &mut length) };
            assert_eq!((actual, length), (expected, expected_length));
        }
    }

    #[test]
    fn absolute_value_cases() {
        for (value, expected) in [(0, 0), (1, 1), (-1, 1), (c_int::MAX, c_int::MAX)] {
            assert_eq!(abs(value), expected);
        }
    }
}
