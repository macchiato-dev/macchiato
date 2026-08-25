#![cfg_attr(target_arch = "wasm32", no_std)]
#![cfg_attr(target_arch = "wasm32", no_main)]

#[cfg(target_arch = "wasm32")]
use core::alloc::{GlobalAlloc, Layout};
#[cfg(target_arch = "wasm32")]
use core::cell::UnsafeCell;
#[cfg(target_arch = "wasm32")]
use core::sync::atomic::{AtomicUsize, Ordering};
#[cfg(target_arch = "wasm32")]
use microesnext_compiler::compile_script;

#[cfg(target_arch = "wasm32")]
struct ProbeAllocator;

#[cfg(target_arch = "wasm32")]
#[repr(align(16))]
struct Heap(UnsafeCell<[u8; 32 * 1024]>);

#[cfg(target_arch = "wasm32")]
unsafe impl Sync for Heap {}

#[cfg(target_arch = "wasm32")]
static HEAP: Heap = Heap(UnsafeCell::new([0; 32 * 1024]));
#[cfg(target_arch = "wasm32")]
static SOURCE: Heap = Heap(UnsafeCell::new([0; 32 * 1024]));
#[cfg(target_arch = "wasm32")]
static NEXT: AtomicUsize = AtomicUsize::new(0);

#[cfg(target_arch = "wasm32")]
unsafe impl GlobalAlloc for ProbeAllocator {
    unsafe fn alloc(&self, layout: Layout) -> *mut u8 {
        let align_mask = layout.align() - 1;
        let allocation = NEXT
            .fetch_update(Ordering::Relaxed, Ordering::Relaxed, |current| {
                let start = current.checked_add(align_mask)? & !align_mask;
                start
                    .checked_add(layout.size())
                    .filter(|end| *end <= 32 * 1024)
            })
            .unwrap_or(usize::MAX);
        if allocation == usize::MAX {
            return core::ptr::null_mut();
        }
        let allocation = (allocation + align_mask) & !align_mask;
        // SAFETY: the atomic hands each allocation a disjoint range in HEAP.
        unsafe { (*HEAP.0.get()).as_mut_ptr().add(allocation) }
    }

    unsafe fn dealloc(&self, _pointer: *mut u8, _layout: Layout) {}
}

#[cfg(target_arch = "wasm32")]
#[global_allocator]
static ALLOCATOR: ProbeAllocator = ProbeAllocator;

#[cfg(target_arch = "wasm32")]
#[panic_handler]
fn panic(_info: &core::panic::PanicInfo<'_>) -> ! {
    loop {}
}

#[cfg(target_arch = "wasm32")]
#[unsafe(no_mangle)]
pub extern "C" fn source_pointer() -> *mut u8 {
    // The probe caller writes source bytes before invoking compile_probe.
    unsafe { (*SOURCE.0.get()).as_mut_ptr() }
}

#[cfg(target_arch = "wasm32")]
#[unsafe(no_mangle)]
pub extern "C" fn compile_probe(length: usize) -> usize {
    if length > 32 * 1024 {
        return 0;
    }
    NEXT.store(0, Ordering::Relaxed);
    // SAFETY: SOURCE is disjoint from the allocator and the caller has just
    // initialized `length` bytes. Compilation does not mutate the input.
    let bytes = unsafe { core::slice::from_raw_parts((*SOURCE.0.get()).as_ptr(), length) };
    let Ok(source) = core::str::from_utf8(bytes) else {
        return 0;
    };
    compile_script(source).map_or(0, |bytecode| bytecode.len())
}

#[cfg(not(target_arch = "wasm32"))]
fn main() {}
