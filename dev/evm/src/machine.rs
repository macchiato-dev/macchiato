use core::cmp::Ordering;

use crate::{keccak::keccak256, Word};

pub const STACK_LIMIT: usize = 1024;
/// Capacity used by [`Workspace`] when the caller does not select a profile.
pub const MEMORY_LIMIT: usize = 64 * 1024;
pub const STORAGE_LIMIT: usize = 128;
pub const TRACE_LIMIT: usize = 4096;
pub const LOG_LIMIT: usize = 128;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Exit {
    Stopped = 0,
    Returned = 1,
    Reverted = 2,
    OutOfGas = 3,
    InvalidOpcode = 4,
    StackUnderflow = 5,
    StackOverflow = 6,
    BadJump = 7,
    MemoryLimit = 8,
    StorageLimit = 9,
    StepLimit = 10,
    UnsupportedOpcode = 11,
    ReturnDataOutOfBounds = 12,
    LogLimit = 13,
    HostError = 14,
    WriteProtection = 15,
    InitCodeLimit = 16,
}

#[derive(Clone, Copy, Default)]
#[repr(C)]
pub struct Environment {
    pub address: Word,
    pub origin: Word,
    pub caller: Word,
    pub call_value: Word,
    pub gas_price: Word,
    pub coinbase: Word,
    pub timestamp: Word,
    pub block_number: Word,
    pub prev_randao: Word,
    pub gas_limit: Word,
    pub chain_id: Word,
    pub base_fee: Word,
    pub blob_base_fee: Word,
    pub self_balance: Word,
    pub read_only: bool,
}

#[derive(Clone, Copy, Default)]
#[repr(C)]
pub struct Trace {
    pub pc: u32,
    pub gas: u64,
    pub opcode: u8,
    pub stack_height: u16,
    pub top: Word,
}

#[derive(Clone, Copy, Default)]
struct Slot { key: Word, value: Word, used: bool }

#[derive(Clone, Copy, Default)]
#[repr(C)]
pub struct Log {
    pub topics: [Word; 4],
    pub topic_count: u8,
    pub data_offset: u32,
    pub data_length: u32,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct Access<T> {
    pub value: T,
    pub cold: bool,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct HostError;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct StorageAccess {
    pub original: Word,
    pub current: Word,
    pub cold: bool,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum CallKind { Call, CallCode, DelegateCall, StaticCall }

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct CallCost { pub cold: bool, pub creates_account: bool }

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct CallRequest {
    pub kind: CallKind,
    pub address: Word,
    pub caller: Word,
    pub current_target: Word,
    pub value: Word,
    pub gas: u64,
    pub read_only: bool,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct CallOutcome {
    pub success: bool,
    pub gas_left: u64,
    pub output_length: usize,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum CreateKind { Create, Create2 }

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct CreateRequest {
    pub kind: CreateKind,
    pub caller: Word,
    pub value: Word,
    pub salt: Word,
    pub gas: u64,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct CreateOutcome {
    pub success: bool,
    pub address: Word,
    pub gas_left: u64,
    pub output_length: usize,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct SelfDestructCost { pub cold: bool, pub creates_account: bool }

/// Chain state supplied by an embedding application.
///
/// Methods return whether an account access was cold so the core can apply
/// EIP-2929 gas without knowing how the host represents its access set. The
/// access set is transaction-scoped and must not be reverted by `rollback`.
/// Persistent writes, transient writes, balances, nonces, code, logs produced
/// by child calls, creation, and self-destruction are revertible state and must
/// be covered by the checkpoint.
///
/// `call` and `create` execute child frames or precompiles and return only
/// after applying their own nested checkpoint rules. Their output buffers are
/// valid only for the duration of the method. A false outcome represents an
/// ordinary EVM call/create failure, while `HostError` means the embedding
/// itself failed and makes the current frame exceptional.
pub trait Host {
    fn balance(&mut self, _address: Word) -> Result<Access<Word>, HostError> {
        Err(HostError)
    }
    fn code_size(&mut self, _address: Word) -> Result<Access<usize>, HostError> {
        Err(HostError)
    }
    fn code_hash(&mut self, _address: Word) -> Result<Access<Word>, HostError> {
        Err(HostError)
    }
    fn copy_code(&mut self, _address: Word, _offset: usize, _output: &mut [u8])
        -> Result<Access<usize>, HostError> { Err(HostError) }
    fn block_hash(&mut self, _number: Word) -> Result<Word, HostError> {
        Err(HostError)
    }
    fn blob_hash(&mut self, _index: usize) -> Result<Word, HostError> {
        Err(HostError)
    }
    fn storage(&mut self, _address: Word, _key: Word)
        -> Result<StorageAccess, HostError> { Err(HostError) }
    fn set_storage(&mut self, _address: Word, _key: Word, _value: Word)
        -> Result<(), HostError> { Err(HostError) }
    fn transient_storage(&mut self, _address: Word, _key: Word)
        -> Result<Word, HostError> { Err(HostError) }
    fn set_transient_storage(&mut self, _address: Word, _key: Word, _value: Word)
        -> Result<(), HostError> { Err(HostError) }
    fn call_cost(&mut self, _address: Word, _value: Word)
        -> Result<CallCost, HostError> { Err(HostError) }
    fn call(&mut self, _request: CallRequest, _input: &[u8], _output: &mut [u8])
        -> Result<CallOutcome, HostError> { Err(HostError) }
    fn create(&mut self, _request: CreateRequest, _init_code: &[u8],
        _output: &mut [u8]) -> Result<CreateOutcome, HostError> { Err(HostError) }
    fn selfdestruct_cost(&mut self, _address: Word, _beneficiary: Word)
        -> Result<SelfDestructCost, HostError> { Err(HostError) }
    fn selfdestruct(&mut self, _address: Word, _beneficiary: Word)
        -> Result<(), HostError> { Err(HostError) }
    fn checkpoint(&mut self) -> Result<u32, HostError> { Ok(0) }
    fn commit(&mut self, _checkpoint: u32) -> Result<(), HostError> { Ok(()) }
    fn rollback(&mut self, _checkpoint: u32) -> Result<(), HostError> { Ok(()) }
}

/// Caller-owned execution buffers.
///
/// `CAPACITY` bounds memory, returned data, call input, and log data. This
/// keeps the core allocator-free while allowing an embedding to choose a
/// profile large enough for the transaction it intends to execute.
pub struct WorkspaceWithCapacity<const CAPACITY: usize> {
    stack: [Word; STACK_LIMIT],
    memory: [u8; CAPACITY],
    storage: [Slot; STORAGE_LIMIT],
    transient: [Slot; STORAGE_LIMIT],
    warm_storage: [Word; STORAGE_LIMIT],
    traces: [Trace; TRACE_LIMIT],
    output: [u8; CAPACITY],
    return_data: [u8; CAPACITY],
    call_input: [u8; CAPACITY],
    logs: [Log; LOG_LIMIT],
    log_data: [u8; CAPACITY],
}

impl<const CAPACITY: usize> WorkspaceWithCapacity<CAPACITY> {
    pub const fn new() -> Self {
        Self {
            stack: [Word::ZERO; STACK_LIMIT], memory: [0; CAPACITY],
            storage: [Slot { key: Word::ZERO, value: Word::ZERO, used: false }; STORAGE_LIMIT],
            transient: [Slot { key: Word::ZERO, value: Word::ZERO, used: false }; STORAGE_LIMIT],
            warm_storage: [Word::ZERO; STORAGE_LIMIT],
            traces: [Trace { pc: 0, gas: 0, opcode: 0, stack_height: 0, top: Word::ZERO }; TRACE_LIMIT],
            output: [0; CAPACITY],
            return_data: [0; CAPACITY], call_input: [0; CAPACITY], logs: [Log {
                topics: [Word::ZERO; 4], topic_count: 0,
                data_offset: 0, data_length: 0,
            }; LOG_LIMIT], log_data: [0; CAPACITY],
        }
    }

    pub fn storage(&self, key: Word) -> Word {
        self.storage.iter().find(|slot| slot.used && slot.key == key)
            .map(|slot| slot.value).unwrap_or(Word::ZERO)
    }

    pub fn set_storage(&mut self, key: Word, value: Word) -> Result<(), Exit> {
        Machine::<CAPACITY>::slot(&mut self.storage, key, Some(value)).map(|_| ())
    }

    pub fn storage_len(&self) -> usize {
        self.storage.iter().filter(|slot| slot.used).count()
    }
}

/// The default 64 KiB execution profile used by the browser ABI.
pub type Workspace = WorkspaceWithCapacity<MEMORY_LIMIT>;

pub struct Machine<'a, const CAPACITY: usize = MEMORY_LIMIT> {
    code: &'a [u8],
    calldata: &'a [u8],
    env: Environment,
    workspace: &'a mut WorkspaceWithCapacity<CAPACITY>,
    pc: usize,
    gas: u64,
    stack_len: usize,
    memory_len: usize,
    trace_len: usize,
    output_len: usize,
    steps: usize,
    return_data_len: usize,
    log_len: usize,
    log_data_len: usize,
    host: Option<&'a mut dyn Host>,
    refund: i64,
    original_storage: [Slot; STORAGE_LIMIT],
    original_transient: [Slot; STORAGE_LIMIT],
    warm_storage_len: usize,
}

impl<'a, const CAPACITY: usize> Machine<'a, CAPACITY> {
    pub fn new(code: &'a [u8], calldata: &'a [u8], gas: u64,
        env: Environment, workspace: &'a mut WorkspaceWithCapacity<CAPACITY>) -> Self {
        workspace.memory.fill(0);
        workspace.transient.fill(Slot::default());
        let original_storage = workspace.storage;
        let original_transient = workspace.transient;
        Self { code, calldata, env, workspace, pc: 0, gas, stack_len: 0,
            memory_len: 0, trace_len: 0, output_len: 0, steps: 0,
            return_data_len: 0, log_len: 0, log_data_len: 0, host: None,
            refund: 0, original_storage, original_transient,
            warm_storage_len: 0 }
    }

    pub fn with_host(code: &'a [u8], calldata: &'a [u8], gas: u64,
        env: Environment, workspace: &'a mut WorkspaceWithCapacity<CAPACITY>,
        host: &'a mut dyn Host) -> Self {
        let mut machine = Self::new(code, calldata, gas, env, workspace);
        machine.host = Some(host);
        machine
    }

    fn host(&mut self) -> Result<&mut (dyn Host + 'a), Exit> {
        self.host.as_deref_mut().ok_or(Exit::UnsupportedOpcode)
    }

    fn charge_account_access(&mut self, cold: bool) -> Result<(), Exit> {
        self.charge(if cold { 2_600 } else { 100 })
    }

    fn local_storage_access(&mut self, key: Word) -> Result<StorageAccess, Exit> {
        let cold = !self.workspace.warm_storage[..self.warm_storage_len].contains(&key);
        if cold {
            if self.warm_storage_len == STORAGE_LIMIT { return Err(Exit::StorageLimit); }
            self.workspace.warm_storage[self.warm_storage_len] = key;
            self.warm_storage_len += 1;
        }
        Ok(StorageAccess {
            original: Self::slot(&mut self.original_storage, key, None)?,
            current: Self::slot(&mut self.workspace.storage, key, None)?,
            cold,
        })
    }

    fn storage_access(&mut self, key: Word) -> Result<StorageAccess, Exit> {
        if let Some(host) = self.host.as_deref_mut() {
            host.storage(self.env.address, key).map_err(|_| Exit::HostError)
        } else { self.local_storage_access(key) }
    }

    fn set_storage(&mut self, key: Word, value: Word) -> Result<(), Exit> {
        if let Some(host) = self.host.as_deref_mut() {
            host.set_storage(self.env.address, key, value).map_err(|_| Exit::HostError)
        } else {
            Self::slot(&mut self.workspace.storage, key, Some(value))?;
            Ok(())
        }
    }

    fn transient_storage(&mut self, key: Word) -> Result<Word, Exit> {
        if let Some(host) = self.host.as_deref_mut() {
            host.transient_storage(self.env.address, key).map_err(|_| Exit::HostError)
        } else { Self::slot(&mut self.workspace.transient, key, None) }
    }

    fn set_transient_storage(&mut self, key: Word, value: Word) -> Result<(), Exit> {
        if let Some(host) = self.host.as_deref_mut() {
            host.set_transient_storage(self.env.address, key, value)
                .map_err(|_| Exit::HostError)
        } else {
            Self::slot(&mut self.workspace.transient, key, Some(value))?;
            Ok(())
        }
    }

    fn sstore_gas(&mut self, access: StorageAccess, value: Word) -> u64 {
        const CLEAR_REFUND: i64 = 4_800;
        if access.current == value { return 100; }
        if access.original == access.current {
            if access.original.is_zero() { return 20_000; }
            if value.is_zero() { self.refund += CLEAR_REFUND; }
            return 2_900;
        }
        if !access.original.is_zero() {
            if access.current.is_zero() { self.refund -= CLEAR_REFUND; }
            if value.is_zero() { self.refund += CLEAR_REFUND; }
        }
        if access.original == value {
            self.refund += if access.original.is_zero() { 19_900 } else { 2_800 };
        }
        100
    }

    pub fn gas(&self) -> u64 { self.gas }
    pub fn refund(&self) -> i64 { self.refund }
    pub fn stack(&self) -> &[Word] { &self.workspace.stack[..self.stack_len] }
    pub fn memory(&self) -> &[u8] { &self.workspace.memory[..self.memory_len] }
    pub fn output(&self) -> &[u8] { &self.workspace.output[..self.output_len] }
    pub fn traces(&self) -> &[Trace] { &self.workspace.traces[..self.trace_len] }
    pub fn return_data(&self) -> &[u8] {
        &self.workspace.return_data[..self.return_data_len]
    }
    pub fn logs(&self) -> &[Log] { &self.workspace.logs[..self.log_len] }
    pub fn log_data(&self, log: &Log) -> &[u8] {
        let start = log.data_offset as usize;
        &self.workspace.log_data[start..start + log.data_length as usize]
    }

    fn charge(&mut self, gas: u64) -> Result<(), Exit> {
        if self.gas < gas { return Err(Exit::OutOfGas); }
        self.gas -= gas;
        Ok(())
    }

    fn push(&mut self, value: Word) -> Result<(), Exit> {
        if self.stack_len == STACK_LIMIT { return Err(Exit::StackOverflow); }
        self.workspace.stack[self.stack_len] = value;
        self.stack_len += 1;
        Ok(())
    }

    fn pop(&mut self) -> Result<Word, Exit> {
        if self.stack_len == 0 { return Err(Exit::StackUnderflow); }
        self.stack_len -= 1;
        Ok(self.workspace.stack[self.stack_len])
    }

    fn pop_usize(&mut self) -> Result<usize, Exit> {
        let value = self.pop()?;
        Self::word_usize(value).ok_or(Exit::MemoryLimit)
    }

    fn word_usize(value: Word) -> Option<usize> {
        if value.0[1..].iter().any(|&limb| limb != 0) || value.0[0] > usize::MAX as u64 {
            None
        } else { Some(value.0[0] as usize) }
    }

    fn memory_range(offset: Word, length: Word) -> Result<(usize, usize), Exit> {
        let length = Self::word_usize(length).ok_or(Exit::MemoryLimit)?;
        if length == 0 { return Ok((0, 0)); }
        let offset = Self::word_usize(offset).ok_or(Exit::MemoryLimit)?;
        Ok((offset, length))
    }

    fn pop_memory_range(&mut self) -> Result<(usize, usize), Exit> {
        let offset = self.pop()?;
        let length = self.pop()?;
        Self::memory_range(offset, length)
    }

    fn expand_memory(&mut self, offset: usize, length: usize) -> Result<(), Exit> {
        if length == 0 { return Ok(()); }
        let end = offset.checked_add(length).ok_or(Exit::MemoryLimit)?;
        if end > CAPACITY { return Err(Exit::MemoryLimit); }
        let old_words = self.memory_len.div_ceil(32) as u64;
        let new_words = end.div_ceil(32) as u64;
        let new_length = new_words as usize * 32;
        if new_length > CAPACITY { return Err(Exit::MemoryLimit); }
        if new_words > old_words {
            let cost = |words: u64| 3 * words + words * words / 512;
            self.charge(cost(new_words) - cost(old_words))?;
            self.memory_len = new_length;
        }
        Ok(())
    }

    fn copy(&mut self, memory_offset: usize, source: &[u8], source_offset: Option<usize>,
        length: usize) -> Result<(), Exit> {
        self.expand_memory(memory_offset, length)?;
        self.charge(3 * length.div_ceil(32) as u64)?;
        for index in 0..length {
            self.workspace.memory[memory_offset + index] = source_offset
                .and_then(|offset| offset.checked_add(index))
                .and_then(|offset| source.get(offset)).copied().unwrap_or(0);
        }
        Ok(())
    }

    fn slot(slots: &mut [Slot; STORAGE_LIMIT], key: Word, write: Option<Word>)
        -> Result<Word, Exit> {
        if let Some(index) = slots.iter().position(|slot| slot.used && slot.key == key) {
            let old = slots[index].value;
            if let Some(value) = write {
                if value.is_zero() { slots[index] = Slot::default(); }
                else { slots[index].value = value; }
            }
            return Ok(old);
        }
        if let Some(value) = write.filter(|value| !value.is_zero()) {
            let slot = slots.iter_mut().find(|slot| !slot.used).ok_or(Exit::StorageLimit)?;
            *slot = Slot { key, value, used: true };
        }
        Ok(Word::ZERO)
    }

    fn valid_jump(&self, destination: usize) -> bool {
        if destination >= self.code.len() || self.code[destination] != 0x5b { return false; }
        let mut pc = 0;
        while pc < destination {
            let opcode = self.code[pc];
            pc += if (0x60..=0x7f).contains(&opcode) { (opcode - 0x5e) as usize } else { 1 };
        }
        pc == destination
    }

    fn trace(&mut self, pc: usize, opcode: u8) {
        if self.trace_len == TRACE_LIMIT { return; }
        self.workspace.traces[self.trace_len] = Trace {
            pc: pc as u32, gas: self.gas, opcode,
            stack_height: self.stack_len as u16,
            top: if self.stack_len == 0 { Word::ZERO } else {
                self.workspace.stack[self.stack_len - 1]
            },
        };
        self.trace_len += 1;
    }

    fn finish(&mut self, exit: Exit, offset: usize, length: usize) -> Result<Exit, Exit> {
        self.expand_memory(offset, length)?;
        self.output_len = length.min(CAPACITY);
        self.workspace.output[..self.output_len]
            .copy_from_slice(&self.workspace.memory[offset..offset + self.output_len]);
        Ok(exit)
    }

    fn requested_gas(value: Word) -> u64 {
        if value.0[1..].iter().any(|&limb| limb != 0) { u64::MAX }
        else { value.low_u64() }
    }

    fn call_opcode(&mut self, kind: CallKind) -> Result<(), Exit> {
        let requested = Self::requested_gas(self.pop()?);
        let address = self.pop()?.address();
        let value = match kind {
            CallKind::Call | CallKind::CallCode => self.pop()?,
            CallKind::DelegateCall => self.env.call_value,
            CallKind::StaticCall => Word::ZERO,
        };
        let input_offset = self.pop()?;
        let input_length = self.pop()?;
        let output_offset = self.pop()?;
        let output_length = self.pop()?;
        let (input_offset, input_length) = Self::memory_range(input_offset, input_length)?;
        let (output_offset, output_length) = Self::memory_range(output_offset, output_length)?;
        if self.env.read_only && !value.is_zero() &&
            matches!(kind, CallKind::Call | CallKind::CallCode) {
            return Err(Exit::WriteProtection);
        }
        self.expand_memory(input_offset, input_length)?;
        self.expand_memory(output_offset, output_length)?;
        let cost = self.host()?.call_cost(address, value).map_err(|_| Exit::HostError)?;
        let mut extra = if cost.cold { 2_600 } else { 100 };
        if !value.is_zero() {
            extra += 9_000;
            if cost.creates_account && matches!(kind, CallKind::Call) { extra += 25_000; }
        }
        self.charge(extra)?;
        let forwarded = requested.min(self.gas - self.gas / 64);
        self.charge(forwarded)?;
        let call_gas = forwarded.saturating_add(if value.is_zero() { 0 } else { 2_300 });
        self.workspace.call_input[..input_length].copy_from_slice(
            &self.workspace.memory[input_offset..input_offset + input_length]);
        self.return_data_len = 0;
        let request = CallRequest {
            kind, address,
            caller: if matches!(kind, CallKind::DelegateCall) {
                self.env.caller
            } else { self.env.address },
            current_target: self.env.address,
            value, gas: call_gas,
            read_only: self.env.read_only || matches!(kind, CallKind::StaticCall),
        };
        let outcome = {
            let host = self.host.as_deref_mut().ok_or(Exit::UnsupportedOpcode)?;
            host.call(request, &self.workspace.call_input[..input_length],
                &mut self.workspace.return_data).map_err(|_| Exit::HostError)?
        };
        if outcome.output_length > CAPACITY || outcome.gas_left > call_gas {
            return Err(Exit::HostError);
        }
        self.gas = self.gas.checked_add(outcome.gas_left).ok_or(Exit::HostError)?;
        self.return_data_len = outcome.output_length;
        let copied = output_length.min(outcome.output_length);
        self.workspace.memory[output_offset..output_offset + copied]
            .copy_from_slice(&self.workspace.return_data[..copied]);
        self.push(Word::from_u64(outcome.success as u64))?;
        Ok(())
    }

    fn create_opcode(&mut self, kind: CreateKind) -> Result<(), Exit> {
        if self.env.read_only { return Err(Exit::WriteProtection); }
        let value = self.pop()?;
        let (offset, length) = self.pop_memory_range()?;
        let salt = if matches!(kind, CreateKind::Create2) {
            self.pop()?
        } else { Word::ZERO };
        if length > 49_152 { return Err(Exit::InitCodeLimit); }
        self.expand_memory(offset, length)?;
        let words = length.div_ceil(32) as u64;
        self.charge(32_000 + 2 * words +
            if matches!(kind, CreateKind::Create2) { 6 * words } else { 0 })?;
        let forwarded = self.gas - self.gas / 64;
        self.charge(forwarded)?;
        self.workspace.call_input[..length]
            .copy_from_slice(&self.workspace.memory[offset..offset + length]);
        self.return_data_len = 0;
        let request = CreateRequest {
            kind, caller: self.env.address, value, salt, gas: forwarded,
        };
        let outcome = {
            let host = self.host.as_deref_mut().ok_or(Exit::UnsupportedOpcode)?;
            host.create(request, &self.workspace.call_input[..length],
                &mut self.workspace.return_data).map_err(|_| Exit::HostError)?
        };
        if outcome.output_length > CAPACITY || outcome.gas_left > forwarded {
            return Err(Exit::HostError);
        }
        self.gas = self.gas.checked_add(outcome.gas_left).ok_or(Exit::HostError)?;
        self.return_data_len = outcome.output_length;
        self.push(if outcome.success { outcome.address.address() } else { Word::ZERO })?;
        Ok(())
    }

    fn selfdestruct_opcode(&mut self) -> Result<Exit, Exit> {
        if self.env.read_only { return Err(Exit::WriteProtection); }
        let beneficiary = self.pop()?.address();
        let address = self.env.address;
        let cost = self.host()?.selfdestruct_cost(address, beneficiary)
            .map_err(|_| Exit::HostError)?;
        self.charge(5_000 + if cost.cold { 2_600 } else { 0 } +
            if cost.creates_account && !self.env.self_balance.is_zero() { 25_000 } else { 0 })?;
        self.host()?.selfdestruct(address, beneficiary).map_err(|_| Exit::HostError)?;
        Ok(Exit::Stopped)
    }

    pub fn run(&mut self, step_limit: usize) -> Exit {
        let checkpoint = match self.host.as_deref_mut() {
            Some(host) => match host.checkpoint() { Ok(value) => Some(value), Err(_) => return Exit::HostError },
            None => None,
        };
        let exit = loop {
            if self.steps >= step_limit { break Exit::StepLimit; }
            self.steps += 1;
            let at = self.pc;
            let opcode = self.code.get(self.pc).copied().unwrap_or(0);
            self.pc += 1;
            let result = self.step(opcode);
            self.trace(at, opcode);
            match result {
                Ok(None) => {}
                Ok(Some(exit)) => break exit,
                Err(exit) => break exit,
            }
        };
        if !matches!(exit, Exit::Stopped | Exit::Returned) {
            self.workspace.storage = self.original_storage;
            self.workspace.transient = self.original_transient;
            self.log_len = 0;
            self.log_data_len = 0;
            self.refund = 0;
        }
        if !matches!(exit, Exit::Stopped | Exit::Returned | Exit::Reverted) {
            self.gas = 0;
        }
        if let (Some(host), Some(checkpoint)) = (self.host.as_deref_mut(), checkpoint) {
            let result = if matches!(exit, Exit::Stopped | Exit::Returned) {
                host.commit(checkpoint)
            } else { host.rollback(checkpoint) };
            if result.is_err() { return Exit::HostError; }
        }
        exit
    }

    fn step(&mut self, opcode: u8) -> Result<Option<Exit>, Exit> {
        match opcode {
            0x00 => return Ok(Some(Exit::Stopped)),
            0x01 => { self.charge(3)?; let a = self.pop()?; let b = self.pop()?; self.push(b.wrapping_add(a))?; }
            0x02 => { self.charge(5)?; let a = self.pop()?; let b = self.pop()?; self.push(b.wrapping_mul(a))?; }
            0x03 => { self.charge(3)?; let a = self.pop()?; let b = self.pop()?; self.push(a.wrapping_sub(b))?; }
            0x04 => { self.charge(5)?; let a = self.pop()?; let b = self.pop()?; self.push(a.div_mod(b).0)?; }
            0x05 => { self.charge(5)?; let a = self.pop()?; let b = self.pop()?; self.push(a.signed_div(b))?; }
            0x06 => { self.charge(5)?; let a = self.pop()?; let b = self.pop()?; self.push(if b.is_zero() { Word::ZERO } else { a.div_mod(b).1 })?; }
            0x07 => { self.charge(5)?; let a = self.pop()?; let b = self.pop()?; self.push(a.signed_mod(b))?; }
            0x08 => { self.charge(8)?; let a = self.pop()?; let b = self.pop()?; let modulus = self.pop()?; self.push(a.add_mod(b, modulus))?; }
            0x09 => { self.charge(8)?; let a = self.pop()?; let b = self.pop()?; let modulus = self.pop()?; self.push(a.mul_mod(b, modulus))?; }
            0x0a => { let base = self.pop()?; let exponent = self.pop()?; self.charge(10 + 50 * exponent.significant_bytes())?; self.push(base.wrapping_pow(exponent))?; }
            0x0b => { self.charge(5)?; let byte = Self::word_usize(self.pop()?).unwrap_or(usize::MAX); let value = self.pop()?; self.push(value.sign_extend(byte))?; }
            0x10 => { self.charge(3)?; let a = self.pop()?; let b = self.pop()?; self.push(Word::from_u64((a < b) as u64))?; }
            0x11 => { self.charge(3)?; let a = self.pop()?; let b = self.pop()?; self.push(Word::from_u64((a > b) as u64))?; }
            0x12 => { self.charge(3)?; let a = self.pop()?; let b = self.pop()?; self.push(Word::from_u64((a.signed_cmp(b) == Ordering::Less) as u64))?; }
            0x13 => { self.charge(3)?; let a = self.pop()?; let b = self.pop()?; self.push(Word::from_u64((a.signed_cmp(b) == Ordering::Greater) as u64))?; }
            0x14 => { self.charge(3)?; let a = self.pop()?; let b = self.pop()?; self.push(Word::from_u64((a == b) as u64))?; }
            0x15 => { self.charge(3)?; let a = self.pop()?; self.push(Word::from_u64(a.is_zero() as u64))?; }
            0x16 => { self.charge(3)?; let a = self.pop()?; let b = self.pop()?; self.push(a & b)?; }
            0x17 => { self.charge(3)?; let a = self.pop()?; let b = self.pop()?; self.push(a | b)?; }
            0x18 => { self.charge(3)?; let a = self.pop()?; let b = self.pop()?; self.push(a ^ b)?; }
            0x19 => { self.charge(3)?; let a = self.pop()?; self.push(!a)?; }
            0x1a => { self.charge(3)?; let index = self.pop()?; let value = self.pop()?; self.push(if index < Word::from_u64(32) { value.shr((31 - index.low_u64() as usize) * 8) & Word::from_u64(255) } else { Word::ZERO })?; }
            0x1b => { self.charge(3)?; let shift = Self::word_usize(self.pop()?).unwrap_or(usize::MAX); let value = self.pop()?; self.push(value.shl(shift))?; }
            0x1c => { self.charge(3)?; let shift = Self::word_usize(self.pop()?).unwrap_or(usize::MAX); let value = self.pop()?; self.push(value.shr(shift))?; }
            0x1d => { self.charge(3)?; let shift = Self::word_usize(self.pop()?).unwrap_or(usize::MAX); let value = self.pop()?; self.push(value.sar(shift))?; }
            0x20 => { let (offset, length) = self.pop_memory_range()?; self.expand_memory(offset, length)?; self.charge(30 + 6 * length.div_ceil(32) as u64)?; self.push(Word::from_be_slice(&keccak256(&self.workspace.memory[offset..offset + length])))?; }
            0x30 => { self.charge(2)?; self.push(self.env.address)?; }
            0x31 => { let address = self.pop()?.address(); let access = self.host()?.balance(address).map_err(|_| Exit::HostError)?; self.charge_account_access(access.cold)?; self.push(access.value)?; }
            0x32 => { self.charge(2)?; self.push(self.env.origin)?; }
            0x33 => { self.charge(2)?; self.push(self.env.caller)?; }
            0x34 => { self.charge(2)?; self.push(self.env.call_value)?; }
            0x35 => { self.charge(3)?; let offset = Self::word_usize(self.pop()?); self.push(if let Some(offset) = offset.filter(|&offset| offset < self.calldata.len()) { let end = offset.saturating_add(32).min(self.calldata.len()); Word::from_be_slice(&self.calldata[offset..end]).shl((32 - (end - offset)) * 8) } else { Word::ZERO })?; }
            0x36 => { self.charge(2)?; self.push(Word::from_u64(self.calldata.len() as u64))?; }
            0x37 => { self.charge(3)?; let memory = self.pop()?; let source = Self::word_usize(self.pop()?); let length = self.pop()?; let (memory, length) = Self::memory_range(memory, length)?; let data = self.calldata; self.copy(memory, data, source, length)?; }
            0x38 => { self.charge(2)?; self.push(Word::from_u64(self.code.len() as u64))?; }
            0x39 => { self.charge(3)?; let memory = self.pop()?; let source = Self::word_usize(self.pop()?); let length = self.pop()?; let (memory, length) = Self::memory_range(memory, length)?; let code = self.code; self.copy(memory, code, source, length)?; }
            0x3a => { self.charge(2)?; self.push(self.env.gas_price)?; }
            0x3b => { let address = self.pop()?.address(); let access = self.host()?.code_size(address).map_err(|_| Exit::HostError)?; self.charge_account_access(access.cold)?; self.push(Word::from_u64(access.value as u64))?; }
            0x3c => {
                let address = self.pop()?.address();
                let memory = self.pop()?;
                let source = Self::word_usize(self.pop()?);
                let length = self.pop()?;
                let (memory, length) = Self::memory_range(memory, length)?;
                self.expand_memory(memory, length)?;
                self.workspace.memory[memory..memory + length].fill(0);
                let access = if let Some(source) = source {
                    let host = self.host.as_deref_mut().ok_or(Exit::UnsupportedOpcode)?;
                    host.copy_code(address, source,
                        &mut self.workspace.memory[memory..memory + length])
                        .map_err(|_| Exit::HostError)?
                } else {
                    let host = self.host.as_deref_mut().ok_or(Exit::UnsupportedOpcode)?;
                    let size = host.code_size(address).map_err(|_| Exit::HostError)?;
                    Access { value: 0, cold: size.cold }
                };
                if access.value > length { return Err(Exit::HostError); }
                self.charge_account_access(access.cold)?;
                self.charge(3 * length.div_ceil(32) as u64)?;
            }
            0x3d => { self.charge(2)?; self.push(Word::from_u64(self.return_data_len as u64))?; }
            0x3e => { self.charge(3)?; let memory = self.pop()?; let source = self.pop()?; let length = self.pop()?; let length = Self::word_usize(length).ok_or(Exit::ReturnDataOutOfBounds)?; let source = Self::word_usize(source).ok_or(Exit::ReturnDataOutOfBounds)?; let end = source.checked_add(length).ok_or(Exit::ReturnDataOutOfBounds)?; if end > self.return_data_len { return Err(Exit::ReturnDataOutOfBounds); } let (memory, _) = Self::memory_range(memory, Word::from_u64(length as u64))?; self.expand_memory(memory, length)?; self.charge(3 * length.div_ceil(32) as u64)?; for index in 0..length { self.workspace.memory[memory + index] = self.workspace.return_data[source + index]; } }
            0x3f => { let address = self.pop()?.address(); let access = self.host()?.code_hash(address).map_err(|_| Exit::HostError)?; self.charge_account_access(access.cold)?; self.push(access.value)?; }
            0x40 => { self.charge(20)?; let number = self.pop()?; let hash = if number >= self.env.block_number || self.env.block_number.wrapping_sub(number) > Word::from_u64(256) { Word::ZERO } else { self.host()?.block_hash(number).map_err(|_| Exit::HostError)? }; self.push(hash)?; }
            0x41 => { self.charge(2)?; self.push(self.env.coinbase)?; }
            0x42 => { self.charge(2)?; self.push(self.env.timestamp)?; }
            0x43 => { self.charge(2)?; self.push(self.env.block_number)?; }
            0x44 => { self.charge(2)?; self.push(self.env.prev_randao)?; }
            0x45 => { self.charge(2)?; self.push(self.env.gas_limit)?; }
            0x46 => { self.charge(2)?; self.push(self.env.chain_id)?; }
            0x47 => { self.charge(5)?; self.push(self.env.self_balance)?; }
            0x48 => { self.charge(2)?; self.push(self.env.base_fee)?; }
            0x49 => { self.charge(3)?; let index = Self::word_usize(self.pop()?); let hash = if let Some(index) = index { self.host()?.blob_hash(index).map_err(|_| Exit::HostError)? } else { Word::ZERO }; self.push(hash)?; }
            0x4a => { self.charge(2)?; self.push(self.env.blob_base_fee)?; }
            0x50 => { self.charge(2)?; self.pop()?; }
            0x51 => { self.charge(3)?; let offset = self.pop_usize()?; self.expand_memory(offset, 32)?; self.push(Word::from_be_slice(&self.workspace.memory[offset..offset + 32]))?; }
            0x52 => { self.charge(3)?; let offset = self.pop_usize()?; let value = self.pop()?; self.expand_memory(offset, 32)?; let mut bytes = [0; 32]; value.write_be(&mut bytes); self.workspace.memory[offset..offset + 32].copy_from_slice(&bytes); }
            0x53 => { self.charge(3)?; let offset = self.pop_usize()?; let value = self.pop()?; self.expand_memory(offset, 1)?; self.workspace.memory[offset] = value.low_u64() as u8; }
            0x54 => { let key = self.pop()?; let access = self.storage_access(key)?; self.charge(if access.cold { 2_100 } else { 100 })?; self.push(access.current)?; }
            0x55 => {
                if self.env.read_only { return Err(Exit::WriteProtection); }
                if self.gas <= 2_300 { return Err(Exit::OutOfGas); }
                let key = self.pop()?;
                let value = self.pop()?;
                let access = self.storage_access(key)?;
                if access.cold { self.charge(2_100)?; }
                let gas = self.sstore_gas(access, value);
                self.charge(gas)?;
                self.set_storage(key, value)?;
            }
            0x56 => { self.charge(8)?; let destination = self.pop_usize()?; if !self.valid_jump(destination) { return Err(Exit::BadJump); } self.pc = destination; }
            0x57 => { self.charge(10)?; let destination = self.pop_usize()?; let condition = self.pop()?; if !condition.is_zero() { if !self.valid_jump(destination) { return Err(Exit::BadJump); } self.pc = destination; } }
            0x58 => { self.charge(2)?; self.push(Word::from_u64((self.pc - 1) as u64))?; }
            0x59 => { self.charge(2)?; self.push(Word::from_u64(self.memory_len as u64))?; }
            0x5a => { self.charge(2)?; self.push(Word::from_u64(self.gas))?; }
            0x5b => self.charge(1)?,
            0x5c => { self.charge(100)?; let key = self.pop()?; let value = self.transient_storage(key)?; self.push(value)?; }
            0x5d => { self.charge(100)?; let key = self.pop()?; let value = self.pop()?; self.set_transient_storage(key, value)?; }
            0x5e => { self.charge(3)?; let destination = self.pop()?; let source = self.pop()?; let length = self.pop()?; let length = Self::word_usize(length).ok_or(Exit::MemoryLimit)?; let (destination, source) = if length == 0 { (0, 0) } else { (Self::word_usize(destination).ok_or(Exit::MemoryLimit)?, Self::word_usize(source).ok_or(Exit::MemoryLimit)?) }; self.expand_memory(source, length)?; self.expand_memory(destination, length)?; self.charge(3 * length.div_ceil(32) as u64)?; self.workspace.memory.copy_within(source..source + length, destination); }
            0x5f => { self.charge(2)?; self.push(Word::ZERO)?; }
            0x60..=0x7f => { self.charge(3)?; let length = (opcode - 0x5f) as usize; let end = (self.pc + length).min(self.code.len()); let value = Word::from_be_slice(&self.code[self.pc..end]).shl((length - (end - self.pc)) * 8); self.pc += length; self.push(value)?; }
            0x80..=0x8f => { self.charge(3)?; let depth = (opcode - 0x7f) as usize; if self.stack_len < depth { return Err(Exit::StackUnderflow); } self.push(self.workspace.stack[self.stack_len - depth])?; }
            0x90..=0x9f => { self.charge(3)?; let depth = (opcode - 0x8f) as usize; if self.stack_len <= depth { return Err(Exit::StackUnderflow); } self.workspace.stack.swap(self.stack_len - 1, self.stack_len - 1 - depth); }
            0xa0..=0xa4 => {
                if self.env.read_only { return Err(Exit::WriteProtection); }
                let topics = (opcode - 0xa0) as usize;
                let (offset, length) = self.pop_memory_range()?;
                self.expand_memory(offset, length)?;
                self.charge(375 + 375 * topics as u64 + 8 * length as u64)?;
                if self.log_len == LOG_LIMIT ||
                    self.log_data_len.checked_add(length).ok_or(Exit::LogLimit)? > CAPACITY {
                    return Err(Exit::LogLimit);
                }
                let mut log = Log { topics: [Word::ZERO; 4], topic_count: topics as u8,
                    data_offset: self.log_data_len as u32, data_length: length as u32 };
                for topic in &mut log.topics[..topics] { *topic = self.pop()?; }
                self.workspace.log_data[self.log_data_len..self.log_data_len + length]
                    .copy_from_slice(&self.workspace.memory[offset..offset + length]);
                self.log_data_len += length;
                self.workspace.logs[self.log_len] = log;
                self.log_len += 1;
            }
            0xf3 | 0xfd => { let (offset, length) = self.pop_memory_range()?; return Ok(Some(self.finish(if opcode == 0xf3 { Exit::Returned } else { Exit::Reverted }, offset, length)?)); }
            0xfe => return Err(Exit::InvalidOpcode),
            0xf0 => self.create_opcode(CreateKind::Create)?,
            0xf1 => self.call_opcode(CallKind::Call)?,
            0xf2 => self.call_opcode(CallKind::CallCode)?,
            0xf4 => self.call_opcode(CallKind::DelegateCall)?,
            0xf5 => self.create_opcode(CreateKind::Create2)?,
            0xfa => self.call_opcode(CallKind::StaticCall)?,
            0xff => return Ok(Some(self.selfdestruct_opcode()?)),
            _ => return Err(Exit::InvalidOpcode),
        }
        Ok(None)
    }
}

#[cfg(test)]
mod tests {
    extern crate std;

    use core::cell::UnsafeCell;
    use super::{Access, CallCost, CallKind, CallOutcome, CallRequest,
        CreateKind, CreateOutcome, CreateRequest, Environment, Exit, Host,
        HostError, Machine, SelfDestructCost, StorageAccess, Workspace, MEMORY_LIMIT,
        WorkspaceWithCapacity};
    use crate::{keccak::keccak256, Word};
    use self::std::vec::Vec;

    const LARGE_OFFICIAL_CAPACITY: usize = 0xb0_0020;
    struct LargeOfficialWorkspace(
        UnsafeCell<WorkspaceWithCapacity<LARGE_OFFICIAL_CAPACITY>>);
    unsafe impl Sync for LargeOfficialWorkspace {}
    static LARGE_OFFICIAL_WORKSPACE: LargeOfficialWorkspace = LargeOfficialWorkspace(
        UnsafeCell::new(WorkspaceWithCapacity::new()));
    const SHA3_OFFICIAL_CAPACITY: usize = 2 * 1024 * 1024;
    struct Sha3OfficialWorkspace(
        UnsafeCell<WorkspaceWithCapacity<SHA3_OFFICIAL_CAPACITY>>);
    unsafe impl Sync for Sha3OfficialWorkspace {}
    static SHA3_OFFICIAL_WORKSPACE: Sha3OfficialWorkspace = Sha3OfficialWorkspace(
        UnsafeCell::new(WorkspaceWithCapacity::new()));

    fn hex_bytes(source: &str) -> Vec<u8> {
        fn nibble(byte: u8) -> u8 {
            match byte {
                b'0'..=b'9' => byte - b'0',
                b'a'..=b'f' => byte - b'a' + 10,
                b'A'..=b'F' => byte - b'A' + 10,
                _ => panic!("invalid fixture hex"),
            }
        }
        let bytes = source.as_bytes();
        let mut output = Vec::with_capacity(bytes.len().div_ceil(2));
        let mut at = 0;
        if bytes.len() % 2 != 0 {
            output.push(nibble(bytes[0]));
            at = 1;
        }
        while at < bytes.len() {
            output.push(nibble(bytes[at]) << 4 | nibble(bytes[at + 1]));
            at += 2;
        }
        output
    }

    fn fixture_word(source: &str) -> Word {
        Word::from_be_slice(&hex_bytes(source))
    }

    fn run_storage_vectors(vectors: &str) -> usize {
        let mut cases = 0;
        for line in vectors.lines().filter(|line| !line.starts_with('#')) {
            let mut fields = line.split('|');
            let name = fields.next().unwrap();
            let code = hex_bytes(fields.next().unwrap());
            let calldata = hex_bytes(fields.next().unwrap());
            let expected = fields.next().unwrap();
            assert!(fields.next().is_none(), "invalid vector {name}");

            let mut workspace = Workspace::new();
            let mut machine = Machine::new(&code, &calldata, 10_000_000,
                Environment::default(), &mut workspace);
            assert_eq!(machine.run(1_000), Exit::Stopped, "{name}");
            drop(machine);
            for pair in expected.split(',').filter(|pair| !pair.is_empty()) {
                let (key, value) = pair.split_once('=').unwrap();
                assert_eq!(workspace.storage(fixture_word(key)), fixture_word(value),
                    "{name}: storage {key}");
            }
            cases += 1;
        }
        cases
    }

    fn storage_pairs(source: &str) -> impl Iterator<Item = (Word, Word)> + '_ {
        source.split(',').filter(|pair| !pair.is_empty()).map(|pair| {
            let (key, value) = pair.split_once('=').unwrap();
            (fixture_word(key), fixture_word(value))
        })
    }


    fn run_direct_vectors(vectors: &str) -> usize {
        let mut cases = 0;
        for line in vectors.lines().filter(|line| !line.starts_with('#')) {
            let mut fields = line.split('|');
            let name = fields.next().unwrap();
            let code = hex_bytes(fields.next().unwrap());
            let initial = fields.next().unwrap();
            let expected = fields.next().unwrap();
            assert!(fields.next().is_none(), "invalid vector {name}");

            let mut workspace = Workspace::new();
            for (key, value) in storage_pairs(initial) {
                workspace.set_storage(key, value).unwrap();
            }
            let mut machine = Machine::new(&code, &[], 10_000_000,
                Environment::default(), &mut workspace);
            let exit = machine.run(2_000_000);
            if name.ends_with("/stack_underflow") {
                assert_eq!(exit, Exit::StackUnderflow, "{name}");
            } else if name.ends_with("/endless-loop") {
                assert_eq!(exit, Exit::StepLimit, "{name}");
            } else {
                assert!(!matches!(exit, Exit::UnsupportedOpcode | Exit::HostError |
                    Exit::StepLimit), "{name}: {exit:?}");
            }
            drop(machine);
            let expected_len = storage_pairs(expected).count();
            assert_eq!(workspace.storage_len(), expected_len, "{name}: storage length");
            for (key, value) in storage_pairs(expected) {
                assert_eq!(workspace.storage(key), value, "{name}: storage key");
            }
            cases += 1;
        }
        cases
    }

    struct TestHost {
        cold: bool,
        last_call: Option<CallRequest>,
        last_create: Option<CreateRequest>,
        destroyed: Option<(Word, Word)>,
    }

    impl TestHost {
        fn access<T>(&mut self, value: T) -> Access<T> {
            let cold = self.cold;
            self.cold = false;
            Access { value, cold }
        }
    }

    impl Host for TestHost {
        fn balance(&mut self, _: Word) -> Result<Access<Word>, HostError> {
            Ok(self.access(Word::from_u64(99)))
        }
        fn code_size(&mut self, _: Word) -> Result<Access<usize>, HostError> {
            Ok(self.access(4))
        }
        fn code_hash(&mut self, _: Word) -> Result<Access<Word>, HostError> {
            Ok(self.access(Word::from_u64(0xc0de)))
        }
        fn copy_code(&mut self, _: Word, offset: usize, output: &mut [u8])
            -> Result<Access<usize>, HostError> {
            let code = [0xaa, 0xbb, 0xcc, 0xdd];
            let available = code.len().saturating_sub(offset).min(output.len());
            output[..available].copy_from_slice(&code[offset..offset + available]);
            Ok(self.access(available))
        }
        fn block_hash(&mut self, number: Word) -> Result<Word, HostError> {
            Ok(number.wrapping_add(Word::from_u64(1000)))
        }
        fn blob_hash(&mut self, index: usize) -> Result<Word, HostError> {
            Ok(Word::from_u64(index as u64 + 2000))
        }
        fn call_cost(&mut self, _: Word, _: Word) -> Result<CallCost, HostError> {
            Ok(CallCost { cold: false, creates_account: false })
        }
        fn call(&mut self, request: CallRequest, input: &[u8], output: &mut [u8])
            -> Result<CallOutcome, HostError> {
            self.last_call = Some(request);
            assert_eq!(input, &[0xab]);
            output[..4].copy_from_slice(&[0xde, 0xad, 0xbe, 0xef]);
            Ok(CallOutcome { success: true, gas_left: request.gas - 100,
                output_length: 4 })
        }
        fn create(&mut self, request: CreateRequest, init_code: &[u8], _: &mut [u8])
            -> Result<CreateOutcome, HostError> {
            assert_eq!(init_code, &[0xab]);
            self.last_create = Some(request);
            Ok(CreateOutcome { success: true, address: Word::from_u64(0x123),
                gas_left: request.gas - 50, output_length: 0 })
        }
        fn selfdestruct_cost(&mut self, _: Word, _: Word)
            -> Result<SelfDestructCost, HostError> {
            Ok(SelfDestructCost { cold: false, creates_account: false })
        }
        fn selfdestruct(&mut self, address: Word, beneficiary: Word)
            -> Result<(), HostError> {
            self.destroyed = Some((address, beneficiary));
            Ok(())
        }
    }

    struct StorageHost {
        original: Word,
        current: Word,
        saved: Word,
        transient: Word,
        saved_transient: Word,
        rolled_back: bool,
        committed: bool,
    }

    impl Host for StorageHost {
        fn storage(&mut self, _: Word, _: Word) -> Result<StorageAccess, HostError> {
            Ok(StorageAccess { original: self.original, current: self.current,
                cold: false })
        }
        fn set_storage(&mut self, _: Word, _: Word, value: Word)
            -> Result<(), HostError> {
            self.current = value;
            Ok(())
        }
        fn transient_storage(&mut self, _: Word, _: Word) -> Result<Word, HostError> {
            Ok(self.transient)
        }
        fn set_transient_storage(&mut self, _: Word, _: Word, value: Word)
            -> Result<(), HostError> {
            self.transient = value;
            Ok(())
        }
        fn checkpoint(&mut self) -> Result<u32, HostError> {
            self.saved = self.current;
            self.saved_transient = self.transient;
            Ok(1)
        }
        fn rollback(&mut self, _: u32) -> Result<(), HostError> {
            self.current = self.saved;
            self.transient = self.saved_transient;
            self.rolled_back = true;
            Ok(())
        }
        fn commit(&mut self, _: u32) -> Result<(), HostError> {
            self.committed = true;
            Ok(())
        }
    }

    #[test]
    fn adds_and_returns_a_word() {
        // 2 + 3, store at memory[0], return 32 bytes.
        let code = [0x60, 2, 0x60, 3, 0x01, 0x60, 0, 0x52, 0x60, 32, 0x60, 0, 0xf3];
        let mut workspace = Workspace::new();
        let mut machine = Machine::new(&code, &[], 100_000, Environment::default(),
            &mut workspace);
        assert_eq!(machine.run(100), Exit::Returned);
        assert_eq!(Word::from_be_slice(machine.output()), Word::from_u64(5));
        assert_eq!(machine.traces().len(), 8);
    }

    #[test]
    fn rejects_jump_into_push_data() {
        let code = [0x60, 0x5b, 0x60, 1, 0x56];
        let mut workspace = Workspace::new();
        let mut machine = Machine::new(&code, &[], 100, Environment::default(),
            &mut workspace);
        assert_eq!(machine.run(100), Exit::BadJump);
    }

    #[test]
    fn executes_extended_arithmetic_opcodes() {
        // 5 ** 3, followed by (2^256 - 1 + 2^256 - 1) mod 7.
        let code = [
            0x60, 3, 0x60, 5, 0x0a,
            0x60, 7, 0x7f,
            0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
            0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
            0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
            0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
            0x80, 0x08, 0x00,
        ];
        let mut workspace = Workspace::new();
        let mut machine = Machine::new(&code, &[], 1_000_000,
            Environment::default(), &mut workspace);
        assert_eq!(machine.run(100), Exit::Stopped);
        assert_eq!(machine.stack(), &[Word::from_u64(125), Word::from_u64(2)]);
    }

    #[test]
    fn noncommutative_opcodes_use_the_top_item_first() {
        // Each pair is pushed as next-item, top-item. The execution-specs
        // definitions pop the top item as the left operand.
        let code = [
            0x60, 3, 0x60, 8, 0x03,
            0x60, 3, 0x60, 8, 0x04,
            0x60, 3, 0x60, 8, 0x06,
            0x60, 8, 0x60, 3, 0x10,
            0x60, 3, 0x60, 8, 0x11,
            0x00,
        ];
        let mut workspace = Workspace::new();
        let mut machine = Machine::new(&code, &[], 1_000_000,
            Environment::default(), &mut workspace);
        assert_eq!(machine.run(100), Exit::Stopped);
        assert_eq!(machine.stack(), &[
            Word::from_u64(5), Word::from_u64(2), Word::from_u64(2),
            Word::ONE, Word::ONE,
        ]);
    }

    #[test]
    fn mcopy_handles_overlapping_regions() {
        // Store 0x0102, copy two overlapping bytes one byte to the right,
        // and load the resulting leading word.
        let code = [
            0x61, 1, 2, 0x60, 0, 0x52,
            0x60, 2, 0x60, 30, 0x60, 31, 0x5e,
            0x60, 0, 0x51, 0x00,
        ];
        let mut workspace = Workspace::new();
        let mut machine = Machine::new(&code, &[], 1_000_000,
            Environment::default(), &mut workspace);
        assert_eq!(machine.run(100), Exit::Stopped);
        let mut expected = [0; 32];
        expected[30] = 1;
        expected[31] = 1;
        assert_eq!(machine.stack(), &[Word::from_be_slice(&expected)]);
    }

    #[test]
    fn passes_official_cancun_mcopy_vectors() {
        const VECTORS: &str = include_str!("../test/official-mcopy-vectors.txt");
        assert_eq!(run_storage_vectors(VECTORS), 21);
    }

    #[test]
    fn passes_official_cancun_calldataload_vectors() {
        const VECTORS: &str = include_str!("../test/official-calldataload-vectors.txt");
        assert_eq!(run_storage_vectors(VECTORS), 3);
    }

    #[test]
    fn passes_official_cancun_arithmetic_and_bitwise_vectors() {
        const VECTORS: &str = include_str!("../test/official-arithmetic-vectors.txt");
        assert_eq!(run_direct_vectors(VECTORS), 159);
    }

    #[test]
    fn passes_official_cancun_memory_flow_and_sha3_vectors() {
        const VECTORS: &str = include_str!("../test/official-memory-vectors.txt");
        assert_eq!(run_direct_vectors(VECTORS), 72);
    }

    #[test]
    fn passes_official_cancun_return_vectors() {
        const VECTORS: &str = include_str!("../test/official-return-vectors.txt");
        let mut cases = 0;
        for line in VECTORS.lines().filter(|line| !line.starts_with('#')) {
            let mut fields = line.split('|');
            let name = fields.next().unwrap();
            let code = hex_bytes(fields.next().unwrap());
            let initial = fields.next().unwrap();
            let expected_storage = fields.next().unwrap();
            let expected_length: usize = fields.next().unwrap().parse().unwrap();
            let expected_prefix = hex_bytes(fields.next().unwrap());
            assert!(fields.next().is_none(), "invalid vector {name}");

            let mut workspace = Workspace::new();
            for (key, value) in storage_pairs(initial) {
                workspace.set_storage(key, value).unwrap();
            }
            let mut machine = Machine::new(&code, &[], 10_000_000,
                Environment::default(), &mut workspace);
            assert_eq!(machine.run(100_000), Exit::Returned, "{name}");
            assert_eq!(machine.output().len(), expected_length, "{name}: output length");
            assert_eq!(&machine.output()[..expected_prefix.len()], expected_prefix,
                "{name}: output prefix");
            drop(machine);
            assert_eq!(workspace.storage_len(), storage_pairs(expected_storage).count(),
                "{name}: storage length");
            for (key, value) in storage_pairs(expected_storage) {
                assert_eq!(workspace.storage(key), value, "{name}: storage key");
            }
            cases += 1;
        }
        assert_eq!(cases, 4);
    }

    #[test]
    fn passes_official_cancun_environment_vectors() {
        const VECTORS: &str = include_str!("../test/official-environment-vectors.txt");
        let mut cases = 0;
        for line in VECTORS.lines().filter(|line| !line.starts_with('#')) {
            let mut fields = line.split('|');
            let name = fields.next().unwrap();
            let code = hex_bytes(fields.next().unwrap());
            let address = fixture_word(fields.next().unwrap());
            let expected = fields.next().unwrap();
            assert!(fields.next().is_none(), "invalid vector {name}");
            let environment = Environment {
                address,
                origin: fixture_word("a94f5374fce5edbc8e2a8697c15331677e6ebf0b"),
                caller: fixture_word("cccccccccccccccccccccccccccccccccccccccc"),
                call_value: Word::from_u64(0x10),
                gas_price: Word::from_u64(0x1234),
                coinbase: fixture_word("2adc25665018aa1fe0e6bc666dac8fc2697ff9ba"),
                timestamp: Word::from_u64(0x3e8),
                block_number: Word::ONE,
                prev_randao: Word::from_u64(0x20_000),
                gas_limit: Word::from_u64(100_000_000),
                ..Environment::default()
            };
            let mut workspace = Workspace::new();
            let exit = Machine::new(&code, &[], 10_000_000, environment,
                &mut workspace).run(1_000);
            assert_eq!(exit, Exit::Stopped, "{name}");
            assert_eq!(workspace.storage_len(), storage_pairs(expected).count(),
                "{name}: storage length");
            for (key, value) in storage_pairs(expected) {
                assert_eq!(workspace.storage(key), value, "{name}: storage key");
            }
            cases += 1;
        }
        assert_eq!(cases, 15);
    }

    #[test]
    fn logs_capture_topics_and_memory() {
        let code = [
            0x60, 0xab, 0x60, 0, 0x53,
            0x60, 0x2a, 0x60, 1, 0x60, 0, 0xa1, 0x00,
        ];
        let mut workspace = Workspace::new();
        let mut machine = Machine::new(&code, &[], 1_000_000,
            Environment::default(), &mut workspace);
        assert_eq!(machine.run(100), Exit::Stopped);
        assert_eq!(machine.logs().len(), 1);
        assert_eq!(machine.logs()[0].topics[0], Word::from_u64(0x2a));
        assert_eq!(machine.log_data(&machine.logs()[0]), &[0xab]);
    }

    #[test]
    fn revert_restores_persistent_storage_and_drops_logs() {
        let mut workspace = Workspace::new();
        let write = [0x60, 7, 0x60, 1, 0x55, 0x00];
        assert_eq!(Machine::new(&write, &[], 100_000, Environment::default(),
            &mut workspace).run(100), Exit::Stopped);
        let revert = [
            0x60, 8, 0x60, 1, 0x55,
            0x60, 0, 0x60, 0, 0xa0,
            0x60, 0, 0x60, 0, 0xfd,
        ];
        let mut reverted = Machine::new(&revert, &[], 100_000,
            Environment::default(), &mut workspace);
        assert_eq!(reverted.run(100), Exit::Reverted);
        assert!(reverted.logs().is_empty());
        drop(reverted);
        let read = [0x60, 1, 0x54, 0x00];
        let mut reader = Machine::new(&read, &[], 100_000,
            Environment::default(), &mut workspace);
        assert_eq!(reader.run(100), Exit::Stopped);
        assert_eq!(reader.stack(), &[Word::from_u64(7)]);
    }

    #[test]
    fn host_storage_uses_refunds_and_rolls_back() {
        let code = [
            0x60, 0, 0x60, 1, 0x55,
            0x60, 0, 0x60, 0, 0xfd,
        ];
        let mut workspace = Workspace::new();
        let mut host = StorageHost { original: Word::from_u64(7),
            current: Word::from_u64(7), saved: Word::ZERO,
            transient: Word::ZERO, saved_transient: Word::ZERO,
            rolled_back: false, committed: false };
        let mut machine = Machine::with_host(&code, &[], 100_000,
            Environment::default(), &mut workspace, &mut host);
        assert_eq!(machine.run(100), Exit::Reverted);
        assert_eq!(machine.refund(), 0);
        drop(machine);
        assert_eq!(host.current, Word::from_u64(7));
        assert!(host.rolled_back);
    }

    #[test]
    fn host_transient_storage_is_shared_and_rolled_back() {
        let code = [
            0x60, 9, 0x60, 1, 0x5d,
            0x60, 1, 0x5c,
            0x60, 0, 0x60, 0, 0xfd,
        ];
        let mut workspace = Workspace::new();
        let mut host = StorageHost { original: Word::ZERO, current: Word::ZERO,
            saved: Word::ZERO, transient: Word::from_u64(3),
            saved_transient: Word::ZERO, rolled_back: false, committed: false };
        let mut machine = Machine::with_host(&code, &[], 100_000,
            Environment::default(), &mut workspace, &mut host);
        assert_eq!(machine.run(100), Exit::Reverted);
        assert_eq!(machine.stack(), &[Word::from_u64(9)]);
        drop(machine);
        assert_eq!(host.transient, Word::from_u64(3));
        assert!(host.rolled_back);
    }

    #[test]
    fn local_transient_writes_revert_with_the_frame() {
        let code = [
            0x60, 9, 0x60, 1, 0x5d,
            0x60, 0, 0x60, 0, 0xfd,
        ];
        let mut workspace = Workspace::new();
        assert_eq!(Machine::new(&code, &[], 100_000, Environment::default(),
            &mut workspace).run(100), Exit::Reverted);
        assert_eq!(Machine::<{ MEMORY_LIMIT }>::slot(&mut workspace.transient,
            Word::ONE, None).unwrap(), Word::ZERO);
    }

    #[test]
    fn successful_host_frame_commits_its_checkpoint() {
        let code = [0x60, 9, 0x60, 1, 0x55, 0x00];
        let mut workspace = Workspace::new();
        let mut host = StorageHost { original: Word::ZERO, current: Word::ZERO,
            saved: Word::ZERO, transient: Word::ZERO,
            saved_transient: Word::ZERO, rolled_back: false, committed: false };
        assert_eq!(Machine::with_host(&code, &[], 100_000,
            Environment::default(), &mut workspace, &mut host).run(100),
            Exit::Stopped);
        assert_eq!(host.current, Word::from_u64(9));
        assert!(host.committed);
        assert!(!host.rolled_back);
    }

    #[test]
    fn returndata_copy_checks_bounds_even_when_empty() {
        let code = [0x60, 1, 0x60, 0, 0x60, 0, 0x3e];
        let mut workspace = Workspace::new();
        assert_eq!(Machine::new(&code, &[], 1_000_000,
            Environment::default(), &mut workspace).run(100),
            Exit::ReturnDataOutOfBounds);
    }

    #[test]
    fn host_supplies_account_code_and_chain_reads() {
        let code = [
            0x60, 7, 0x31,
            0x60, 7, 0x3b,
            0x60, 3, 0x60, 1, 0x60, 0, 0x60, 7, 0x3c,
            0x60, 7, 0x3f,
            0x60, 9, 0x40,
            0x60, 2, 0x49,
            0x00,
        ];
        let mut workspace = Workspace::new();
        let mut host = TestHost { cold: true, last_call: None,
            last_create: None, destroyed: None };
        let environment = Environment { block_number: Word::from_u64(10),
            ..Environment::default() };
        let mut machine = Machine::with_host(&code, &[], 1_000_000,
            environment, &mut workspace, &mut host);
        assert_eq!(machine.run(100), Exit::Stopped);
        assert_eq!(machine.stack(), &[
            Word::from_u64(99), Word::from_u64(4), Word::from_u64(0xc0de),
            Word::from_u64(1009), Word::from_u64(2002),
        ]);
        assert_eq!(&machine.memory()[..3], &[0xbb, 0xcc, 0xdd]);
    }

    #[test]
    fn account_reads_without_a_host_are_explicitly_unsupported() {
        let code = [0x60, 7, 0x31];
        let mut workspace = Workspace::new();
        assert_eq!(Machine::new(&code, &[], 100_000, Environment::default(),
            &mut workspace).run(10), Exit::UnsupportedOpcode);
    }

    #[test]
    fn huge_data_offsets_and_shift_counts_follow_word_semantics() {
        let mut code = [0u8; 73];
        let mut at = 0;
        code[at] = 0x7f; at += 1;
        code[at..at + 32].fill(0xff); at += 32;
        code[at] = 0x35; at += 1;
        code[at] = 0x60; code[at + 1] = 1; at += 2;
        code[at] = 0x7f; at += 1;
        code[at..at + 32].fill(0xff); at += 32;
        code[at] = 0x1b; at += 1;
        code[at] = 0x00;
        let mut workspace = Workspace::new();
        let mut machine = Machine::new(&code, &[1, 2, 3], 100_000,
            Environment::default(), &mut workspace);
        assert_eq!(machine.run(100), Exit::Stopped);
        assert_eq!(machine.stack(), &[Word::ZERO, Word::ZERO]);
    }

    #[test]
    fn zero_length_mcopy_ignores_unused_offsets() {
        let huge = [0xff; 32];
        let mut mcopy = [0u8; 69];
        mcopy[0] = 0x5f;
        mcopy[1] = 0x7f;
        mcopy[2..34].copy_from_slice(&huge);
        mcopy[34] = 0x7f;
        mcopy[35..67].copy_from_slice(&huge);
        mcopy[67] = 0x5e;
        mcopy[68] = 0x00;
        let mut workspace = Workspace::new();
        let mut machine = Machine::new(&mcopy, &[], 100_000,
            Environment::default(), &mut workspace);
        assert_eq!(machine.run(20), Exit::Stopped);
        assert!(machine.memory().is_empty());
    }

    #[test]
    fn zero_length_return_ignores_unused_offset() {
        let huge = [0xff; 32];
        let mut returning = [0u8; 35];
        returning[0] = 0x5f;
        returning[1] = 0x7f;
        returning[2..34].copy_from_slice(&huge);
        returning[34] = 0xf3;
        let mut workspace = Workspace::new();
        let mut machine = Machine::new(&returning, &[], 100_000,
            Environment::default(), &mut workspace);
        assert_eq!(machine.run(20), Exit::Returned);
        assert!(machine.output().is_empty());
    }

    #[test]
    fn zero_length_keccak_ignores_unused_offset() {
        let huge = [0xff; 32];
        let mut returning = [0u8; 35];
        returning[0] = 0x5f;
        returning[1] = 0x7f;
        returning[2..34].copy_from_slice(&huge);
        let mut hashing = [0u8; 36];
        hashing[..35].copy_from_slice(&returning);
        hashing[34] = 0x20;
        hashing[35] = 0x00;
        let mut workspace = Workspace::new();
        let mut machine = Machine::new(&hashing, &[], 100_000,
            Environment::default(), &mut workspace);
        assert_eq!(machine.run(20), Exit::Stopped);
        assert_eq!(machine.stack()[0], Word::from_be_slice(&keccak256(&[])));
    }

    #[test]
    fn caller_selected_profile_can_expand_beyond_the_browser_default() {
        std::thread::Builder::new().stack_size(8 * 1024 * 1024).spawn(|| {
            // Store 0xaa at memory offset 70,000, beyond the default 64 KiB
            // ABI profile but within this embedding's caller-owned workspace.
            let code = [0x60, 0xaa, 0x62, 0x01, 0x11, 0x70, 0x53, 0x00];
            let mut small = Workspace::new();
            assert_eq!(Machine::new(&code, &[], 1_000_000,
                Environment::default(), &mut small).run(100), Exit::MemoryLimit);

            let mut large = WorkspaceWithCapacity::<{ 128 * 1024 }>::new();
            let mut machine = Machine::new(&code, &[], 1_000_000,
                Environment::default(), &mut large);
            assert_eq!(machine.run(100), Exit::Stopped);
            assert_eq!(machine.memory()[70_000], 0xaa);
            assert_eq!(machine.memory().len(), 70_016);
        }).unwrap().join().unwrap();
    }

    #[test]
    fn passes_official_large_memory_profile_vectors() {
        // execution-spec-tests v5.4.0, Cancun:
        // vmTests/sha3/sha3_0xFFFFF_0s and
        // vmIOandFlowOperations/msize/farChunk (target 0x1005).
        let sha3 = hex_bytes("620fffff6103e82060005500");
        let sha_workspace = unsafe { &mut *SHA3_OFFICIAL_WORKSPACE.0.get() };
        let mut machine = Machine::new(&sha3, &[], 20_000_000,
            Environment::default(), sha_workspace);
        assert_eq!(machine.run(100), Exit::Stopped);
        assert_eq!(sha_workspace.storage(Word::ZERO), fixture_word(
            "be6f1b42b34644f918560a07f959d23e532dea5338e4b9f63db0caeb608018fa"));

        let far_chunk = hex_bytes("600162b00000535960005500");
        // A static caller-owned workspace proves that a large profile does not
        // require an allocator or a correspondingly large native stack.
        let workspace = unsafe { &mut *LARGE_OFFICIAL_WORKSPACE.0.get() };
        let mut machine = Machine::new(&far_chunk, &[], 300_000_000,
            Environment::default(), workspace);
        assert_eq!(machine.run(100), Exit::Stopped);
        assert_eq!(workspace.storage(Word::ZERO), Word::from_u64(0xb0_0020));
    }

    #[test]
    fn exceptional_halts_consume_frame_gas_but_revert_does_not() {
        let mut invalid_workspace = Workspace::new();
        let mut invalid = Machine::new(&[0xfe], &[], 100,
            Environment::default(), &mut invalid_workspace);
        assert_eq!(invalid.run(10), Exit::InvalidOpcode);
        assert_eq!(invalid.gas(), 0);

        let mut revert_workspace = Workspace::new();
        let mut revert = Machine::new(&[0x60, 0, 0x60, 0, 0xfd], &[], 100,
            Environment::default(), &mut revert_workspace);
        assert_eq!(revert.run(10), Exit::Reverted);
        assert!(revert.gas() > 0);
    }

    #[test]
    fn call_uses_bounded_host_buffers_and_exposes_return_data() {
        let code = [
            0x60, 0xab, 0x60, 0, 0x53,
            0x60, 4, 0x60, 16, 0x60, 1, 0x60, 0,
            0x60, 0, 0x60, 7, 0x61, 0x27, 0x10, 0xf1,
            0x3d, 0x00,
        ];
        let mut workspace = Workspace::new();
        let mut host = TestHost { cold: false, last_call: None,
            last_create: None, destroyed: None };
        let mut machine = Machine::with_host(&code, &[], 100_000,
            Environment::default(), &mut workspace, &mut host);
        assert_eq!(machine.run(100), Exit::Stopped);
        assert_eq!(machine.stack(), &[Word::ONE, Word::from_u64(4)]);
        assert_eq!(&machine.memory()[16..20], &[0xde, 0xad, 0xbe, 0xef]);
        assert_eq!(machine.return_data(), &[0xde, 0xad, 0xbe, 0xef]);
        drop(machine);
        let request = host.last_call.unwrap();
        assert_eq!(request.kind, CallKind::Call);
        assert_eq!(request.address, Word::from_u64(7));
        assert!(!request.read_only);
    }

    #[test]
    fn create2_and_selfdestruct_use_typed_host_requests() {
        let code = [
            0x60, 0xab, 0x60, 0, 0x53,
            0x60, 0x55, 0x60, 1, 0x60, 0, 0x60, 0, 0xf5,
            0x60, 9, 0xff,
        ];
        let mut workspace = Workspace::new();
        let mut host = TestHost { cold: false, last_call: None,
            last_create: None, destroyed: None };
        let environment = Environment { address: Word::from_u64(7),
            self_balance: Word::from_u64(1), ..Environment::default() };
        let mut machine = Machine::with_host(&code, &[], 100_000,
            environment, &mut workspace, &mut host);
        assert_eq!(machine.run(100), Exit::Stopped);
        assert_eq!(machine.stack(), &[Word::from_u64(0x123)]);
        drop(machine);
        let create = host.last_create.unwrap();
        assert_eq!(create.kind, CreateKind::Create2);
        assert_eq!(create.salt, Word::from_u64(0x55));
        assert_eq!(host.destroyed, Some((Word::from_u64(7), Word::from_u64(9))));
    }
}
