//! Allocation-free C functions used by the wasm32 engine.
//!
//! These loops follow Rust compiler-builtins' memory implementation and the
//! scalar wasi-libc/musl behavior documented in `docs/ponyfill-sources.md`.

use core::ffi::{c_char, c_int, c_void};

/// Compares the first `count` bytes and returns the first unsigned difference.
///
/// # Safety
///
/// Both pointers must be readable for `count` bytes.
#[cfg_attr(target_arch = "wasm32", unsafe(no_mangle))]
pub unsafe extern "C" fn memcmp(
    left: *const c_void,
    right: *const c_void,
    count: usize,
) -> c_int {
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

#[cfg(test)]
mod tests {
    use super::{memcmp, strlen};
    use core::ffi::c_char;

    struct CompareCase {
        left: &'static [u8],
        right: &'static [u8],
        count: usize,
        expected: i32,
    }

    const COMPARE_CASES: &[CompareCase] = &[
        CompareCase { left: b"", right: b"", count: 0, expected: 0 },
        CompareCase { left: b"same", right: b"same", count: 4, expected: 0 },
        CompareCase { left: b"a", right: b"b", count: 1, expected: -1 },
        CompareCase { left: b"z", right: b"a", count: 1, expected: 25 },
        CompareCase {
            left: &[0xff, 0], right: &[0x01, 0], count: 1, expected: 254,
        },
        CompareCase { left: b"ax", right: b"ay", count: 1, expected: 0 },
        CompareCase { left: b"ax", right: b"ay", count: 2, expected: -1 },
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
}
