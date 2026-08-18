#![no_std]

extern crate alloc;

use alloc::alloc::{Layout, alloc, dealloc, realloc as alloc_realloc};

#[global_allocator]
static ALLOCATOR: dlmalloc::GlobalDlmalloc = dlmalloc::GlobalDlmalloc;

const ALIGNMENT: usize = 16;
const HEADER: usize = 16;

#[unsafe(no_mangle)]
pub unsafe extern "C" fn malloc(size: usize) -> *mut u8 {
    let payload = size.max(1);
    let total = match payload.checked_add(HEADER) {
        Some(value) => value,
        None => return core::ptr::null_mut(),
    };
    let layout = match Layout::from_size_align(total, ALIGNMENT) {
        Ok(value) => value,
        Err(_) => return core::ptr::null_mut(),
    };
    let base = unsafe { alloc(layout) };
    if base.is_null() { return base; }
    unsafe { base.cast::<usize>().write(total) };
    unsafe { base.add(HEADER) }
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn free(pointer: *mut u8) {
    if pointer.is_null() { return; }
    let base = unsafe { pointer.sub(HEADER) };
    let total = unsafe { base.cast::<usize>().read() };
    let layout = unsafe { Layout::from_size_align_unchecked(total, ALIGNMENT) };
    unsafe { dealloc(base, layout) };
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn realloc(pointer: *mut u8, size: usize) -> *mut u8 {
    if pointer.is_null() { return unsafe { malloc(size) }; }
    if size == 0 { unsafe { free(pointer) }; return core::ptr::null_mut(); }
    let base = unsafe { pointer.sub(HEADER) };
    let old_total = unsafe { base.cast::<usize>().read() };
    let new_total = match size.checked_add(HEADER) {
        Some(value) => value,
        None => return core::ptr::null_mut(),
    };
    let layout = unsafe { Layout::from_size_align_unchecked(old_total, ALIGNMENT) };
    let next = unsafe { alloc_realloc(base, layout, new_total) };
    if next.is_null() { return next; }
    unsafe { next.cast::<usize>().write(new_total) };
    unsafe { next.add(HEADER) }
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn malloc_usable_size(pointer: *const u8) -> usize {
    if pointer.is_null() { return 0; }
    unsafe { pointer.sub(HEADER).cast::<usize>().read() - HEADER }
}

macro_rules! unary_math {
    ($($name:ident),+ $(,)?) => {$(
        #[unsafe(no_mangle)]
        pub extern "C" fn $name(value: f64) -> f64 { libm::$name(value) }
    )+};
}

macro_rules! binary_math {
    ($($name:ident),+ $(,)?) => {$(
        #[unsafe(no_mangle)]
        pub extern "C" fn $name(left: f64, right: f64) -> f64 {
            libm::$name(left, right)
        }
    )+};
}

unary_math!(
    acos, acosh, asin, asinh, atan, atanh, cbrt, ceil, cos, cosh, exp,
    exp2, expm1, fabs, floor, log, log10, log1p, log2, round, sin, sinh,
    sqrt, tan, tanh, trunc,
);
binary_math!(atan2, fmax, fmin, fmod, hypot, pow, remainder);

#[unsafe(no_mangle)]
pub extern "C" fn fma(first: f64, second: f64, third: f64) -> f64 {
    libm::fma(first, second, third)
}

#[unsafe(no_mangle)]
pub extern "C" fn ldexp(value: f64, exponent: i32) -> f64 {
    libm::ldexp(value, exponent)
}

#[unsafe(no_mangle)]
pub extern "C" fn lrint(value: f64) -> i32 {
    libm::rint(value) as i32
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn modf(value: f64, integer: *mut f64) -> f64 {
    let (fraction, whole) = libm::modf(value);
    unsafe { integer.write(whole) };
    fraction
}

unsafe extern "C" {
    fn quickjs_guest_onmsg(minimum_length: u32);
}

#[unsafe(no_mangle)]
pub extern "C" fn onmsg(minimum_length: u32) {
    unsafe { quickjs_guest_onmsg(minimum_length) }
}

#[panic_handler]
fn panic(_: &core::panic::PanicInfo<'_>) -> ! {
    loop {}
}
