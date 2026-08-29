#![no_std]

//! Allocator-free EVM execution core and WebAssembly ABI.

mod machine;
mod keccak;
mod word;

#[cfg(target_arch = "wasm32")]
mod wasm;

pub use machine::{Access, Environment, Exit, Host, HostError, Log, Machine,
    Trace, Workspace};
pub use word::Word;

#[cfg(target_arch = "wasm32")]
#[panic_handler]
fn panic(_: &core::panic::PanicInfo<'_>) -> ! {
    core::arch::wasm32::unreachable()
}
