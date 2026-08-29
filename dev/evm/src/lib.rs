#![no_std]

//! Allocator-free EVM execution core and WebAssembly ABI.

mod keccak;
mod machine;
mod word;

#[cfg(target_arch = "wasm32")]
mod wasm;

pub use machine::{
    Access, CallCost, CallKind, CallOutcome, CallRequest, CreateKind, CreateOutcome, CreateRequest,
    Environment, Exit, Host, HostError, Log, Machine, SelfDestructCost, StorageAccess, Trace,
    Workspace, WorkspaceWithCapacity,
};
pub use word::Word;

#[cfg(target_arch = "wasm32")]
#[panic_handler]
fn panic(_: &core::panic::PanicInfo<'_>) -> ! {
    core::arch::wasm32::unreachable()
}
