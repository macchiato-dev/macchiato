use core::cell::UnsafeCell;

use crate::{Environment, Machine, Word, Workspace};

const CODE_LIMIT: usize = 64 * 1024;
const CALLDATA_LIMIT: usize = 64 * 1024;
const ENV_BYTES: usize = 12 * 32;
const STACK_BYTES: usize = 1024 * 32;
const TRACE_BYTES: usize = 4096 * 48;
const OUTPUT_BYTES: usize = 64 * 1024;

struct State {
    code: [u8; CODE_LIMIT],
    calldata: [u8; CALLDATA_LIMIT],
    environment: [u8; ENV_BYTES],
    workspace: Workspace,
    stack: [u8; STACK_BYTES],
    traces: [u8; TRACE_BYTES],
    output: [u8; OUTPUT_BYTES],
    stack_len: u32,
    trace_len: u32,
    output_len: u32,
    gas_left: u64,
}

impl State {
    const fn new() -> Self {
        Self {
            code: [0; CODE_LIMIT], calldata: [0; CALLDATA_LIMIT],
            environment: [0; ENV_BYTES], workspace: Workspace::new(),
            stack: [0; STACK_BYTES], traces: [0; TRACE_BYTES],
            output: [0; OUTPUT_BYTES], stack_len: 0, trace_len: 0,
            output_len: 0, gas_left: 0,
        }
    }
}

struct Global(UnsafeCell<State>);
unsafe impl Sync for Global {}
static GLOBAL: Global = Global(UnsafeCell::new(State::new()));

fn state() -> &'static mut State {
    // WebAssembly execution is single-threaded in this initial ABI. No mutable
    // reference escapes an exported call.
    unsafe { &mut *GLOBAL.0.get() }
}

fn word(bytes: &[u8], index: usize) -> Word {
    Word::from_be_slice(&bytes[index * 32..index * 32 + 32])
}

fn environment(bytes: &[u8; ENV_BYTES]) -> Environment {
    Environment {
        address: word(bytes, 0), caller: word(bytes, 1),
        call_value: word(bytes, 2), gas_price: word(bytes, 3),
        coinbase: word(bytes, 4), timestamp: word(bytes, 5),
        block_number: word(bytes, 6), prev_randao: word(bytes, 7),
        gas_limit: word(bytes, 8), chain_id: word(bytes, 9),
        base_fee: word(bytes, 10), blob_base_fee: word(bytes, 11),
    }
}

#[unsafe(no_mangle)]
pub extern "C" fn evm_code_ptr() -> *mut u8 { state().code.as_mut_ptr() }

#[unsafe(no_mangle)]
pub extern "C" fn evm_calldata_ptr() -> *mut u8 { state().calldata.as_mut_ptr() }

#[unsafe(no_mangle)]
pub extern "C" fn evm_environment_ptr() -> *mut u8 { state().environment.as_mut_ptr() }

#[unsafe(no_mangle)]
pub extern "C" fn evm_stack_ptr() -> *const u8 { state().stack.as_ptr() }

#[unsafe(no_mangle)]
pub extern "C" fn evm_trace_ptr() -> *const u8 { state().traces.as_ptr() }

#[unsafe(no_mangle)]
pub extern "C" fn evm_output_ptr() -> *const u8 { state().output.as_ptr() }

#[unsafe(no_mangle)]
pub extern "C" fn evm_stack_len() -> u32 { state().stack_len }

#[unsafe(no_mangle)]
pub extern "C" fn evm_trace_len() -> u32 { state().trace_len }

#[unsafe(no_mangle)]
pub extern "C" fn evm_output_len() -> u32 { state().output_len }

#[unsafe(no_mangle)]
pub extern "C" fn evm_gas_left() -> u64 { state().gas_left }

#[unsafe(no_mangle)]
pub extern "C" fn evm_reset_storage() {
    state().workspace = Workspace::new();
}

#[unsafe(no_mangle)]
pub extern "C" fn evm_run(code_len: u32, calldata_len: u32, gas: u64,
    step_limit: u32) -> u32 {
    let state = state();
    let code_len = (code_len as usize).min(CODE_LIMIT);
    let calldata_len = (calldata_len as usize).min(CALLDATA_LIMIT);
    let env = environment(&state.environment);
    let mut machine = Machine::new(&state.code[..code_len],
        &state.calldata[..calldata_len], gas, env, &mut state.workspace);
    let exit = machine.run(step_limit as usize);
    state.gas_left = machine.gas();
    state.stack_len = machine.stack().len() as u32;
    for (index, value) in machine.stack().iter().enumerate() {
        value.write_be((&mut state.stack[index * 32..index * 32 + 32])
            .try_into().unwrap());
    }
    state.output_len = machine.output().len() as u32;
    state.output[..machine.output().len()].copy_from_slice(machine.output());
    state.trace_len = machine.traces().len() as u32;
    for (index, trace) in machine.traces().iter().enumerate() {
        let output = &mut state.traces[index * 48..index * 48 + 48];
        output[..4].copy_from_slice(&trace.pc.to_le_bytes());
        output[4..12].copy_from_slice(&trace.gas.to_le_bytes());
        output[12] = trace.opcode;
        output[14..16].copy_from_slice(&trace.stack_height.to_le_bytes());
        trace.top.write_be((&mut output[16..48]).try_into().unwrap());
    }
    exit as u32
}
