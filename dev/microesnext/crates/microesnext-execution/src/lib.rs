#![no_std]

#[cfg(feature = "async-functions")]
pub mod async_functions;
#[cfg(feature = "exceptions")]
pub mod exceptions;
#[cfg(feature = "promises")]
pub mod promises;
#[cfg(feature = "recursive-async-functions")]
pub mod recursive_async_functions;
#[cfg(feature = "suspension")]
pub mod suspension;
