use core::cmp::Ordering;

use crate::{keccak::keccak256, Word};

pub const STACK_LIMIT: usize = 1024;
pub const MEMORY_LIMIT: usize = 64 * 1024;
pub const STORAGE_LIMIT: usize = 128;
pub const TRACE_LIMIT: usize = 4096;
pub const OUTPUT_LIMIT: usize = 64 * 1024;
pub const LOG_LIMIT: usize = 128;
pub const LOG_DATA_LIMIT: usize = 64 * 1024;

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

pub struct Workspace {
    stack: [Word; STACK_LIMIT],
    memory: [u8; MEMORY_LIMIT],
    storage: [Slot; STORAGE_LIMIT],
    transient: [Slot; STORAGE_LIMIT],
    traces: [Trace; TRACE_LIMIT],
    output: [u8; OUTPUT_LIMIT],
    return_data: [u8; OUTPUT_LIMIT],
    logs: [Log; LOG_LIMIT],
    log_data: [u8; LOG_DATA_LIMIT],
}

impl Workspace {
    pub const fn new() -> Self {
        Self {
            stack: [Word::ZERO; STACK_LIMIT], memory: [0; MEMORY_LIMIT],
            storage: [Slot { key: Word::ZERO, value: Word::ZERO, used: false }; STORAGE_LIMIT],
            transient: [Slot { key: Word::ZERO, value: Word::ZERO, used: false }; STORAGE_LIMIT],
            traces: [Trace { pc: 0, gas: 0, opcode: 0, stack_height: 0, top: Word::ZERO }; TRACE_LIMIT],
            output: [0; OUTPUT_LIMIT],
            return_data: [0; OUTPUT_LIMIT], logs: [Log {
                topics: [Word::ZERO; 4], topic_count: 0,
                data_offset: 0, data_length: 0,
            }; LOG_LIMIT], log_data: [0; LOG_DATA_LIMIT],
        }
    }
}

pub struct Machine<'a> {
    code: &'a [u8],
    calldata: &'a [u8],
    env: Environment,
    workspace: &'a mut Workspace,
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
}

impl<'a> Machine<'a> {
    pub fn new(code: &'a [u8], calldata: &'a [u8], gas: u64,
        env: Environment, workspace: &'a mut Workspace) -> Self {
        workspace.memory.fill(0);
        workspace.transient.fill(Slot::default());
        Self { code, calldata, env, workspace, pc: 0, gas, stack_len: 0,
            memory_len: 0, trace_len: 0, output_len: 0, steps: 0,
            return_data_len: 0, log_len: 0, log_data_len: 0 }
    }

    pub fn gas(&self) -> u64 { self.gas }
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
        if value.0[1..].iter().any(|&limb| limb != 0) || value.0[0] > usize::MAX as u64 {
            return Err(Exit::MemoryLimit);
        }
        Ok(value.0[0] as usize)
    }

    fn expand_memory(&mut self, offset: usize, length: usize) -> Result<(), Exit> {
        if length == 0 { return Ok(()); }
        let end = offset.checked_add(length).ok_or(Exit::MemoryLimit)?;
        if end > MEMORY_LIMIT { return Err(Exit::MemoryLimit); }
        let old_words = self.memory_len.div_ceil(32) as u64;
        let new_words = end.div_ceil(32) as u64;
        if new_words > old_words {
            let cost = |words: u64| 3 * words + words * words / 512;
            self.charge(cost(new_words) - cost(old_words))?;
            self.memory_len = new_words as usize * 32;
        }
        Ok(())
    }

    fn copy(&mut self, memory_offset: usize, source: &[u8], source_offset: usize,
        length: usize) -> Result<(), Exit> {
        self.expand_memory(memory_offset, length)?;
        self.charge(3 * length.div_ceil(32) as u64)?;
        for index in 0..length {
            self.workspace.memory[memory_offset + index] =
                source.get(source_offset + index).copied().unwrap_or(0);
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
        self.output_len = length.min(OUTPUT_LIMIT);
        self.workspace.output[..self.output_len]
            .copy_from_slice(&self.workspace.memory[offset..offset + self.output_len]);
        Ok(exit)
    }

    pub fn run(&mut self, step_limit: usize) -> Exit {
        let original_storage = self.workspace.storage;
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
            self.workspace.storage = original_storage;
            self.log_len = 0;
            self.log_data_len = 0;
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
            0x06 => { self.charge(5)?; let a = self.pop()?; let b = self.pop()?; self.push(a.div_mod(b).1)?; }
            0x07 => { self.charge(5)?; let a = self.pop()?; let b = self.pop()?; self.push(a.signed_mod(b))?; }
            0x08 => { self.charge(8)?; let a = self.pop()?; let b = self.pop()?; let modulus = self.pop()?; self.push(a.add_mod(b, modulus))?; }
            0x09 => { self.charge(8)?; let a = self.pop()?; let b = self.pop()?; let modulus = self.pop()?; self.push(a.mul_mod(b, modulus))?; }
            0x0a => { let base = self.pop()?; let exponent = self.pop()?; self.charge(10 + 50 * exponent.significant_bytes())?; self.push(base.wrapping_pow(exponent))?; }
            0x0b => { self.charge(5)?; let byte = self.pop()?.low_u64() as usize; let value = self.pop()?; self.push(value.sign_extend(byte))?; }
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
            0x1a => { self.charge(3)?; let index = self.pop()?.low_u64(); let value = self.pop()?; self.push(if index < 32 { value.shr((31 - index as usize) * 8) & Word::from_u64(255) } else { Word::ZERO })?; }
            0x1b => { self.charge(3)?; let shift = self.pop()?.low_u64() as usize; let value = self.pop()?; self.push(value.shl(shift))?; }
            0x1c => { self.charge(3)?; let shift = self.pop()?.low_u64() as usize; let value = self.pop()?; self.push(value.shr(shift))?; }
            0x1d => { self.charge(3)?; let shift = self.pop()?.low_u64() as usize; let value = self.pop()?; self.push(value.sar(shift))?; }
            0x20 => { let offset = self.pop_usize()?; let length = self.pop_usize()?; self.expand_memory(offset, length)?; self.charge(30 + 6 * length.div_ceil(32) as u64)?; self.push(Word::from_be_slice(&keccak256(&self.workspace.memory[offset..offset + length])))?; }
            0x30 => { self.charge(2)?; self.push(self.env.address)?; }
            0x32 => { self.charge(2)?; self.push(self.env.origin)?; }
            0x33 => { self.charge(2)?; self.push(self.env.caller)?; }
            0x34 => { self.charge(2)?; self.push(self.env.call_value)?; }
            0x35 => { self.charge(3)?; let offset = self.pop_usize()?; let end = offset.saturating_add(32).min(self.calldata.len()); self.push(if offset >= self.calldata.len() { Word::ZERO } else { Word::from_be_slice(&self.calldata[offset..end]).shl((32 - (end - offset)) * 8) })?; }
            0x36 => { self.charge(2)?; self.push(Word::from_u64(self.calldata.len() as u64))?; }
            0x37 => { self.charge(3)?; let memory = self.pop_usize()?; let source = self.pop_usize()?; let length = self.pop_usize()?; let data = self.calldata; self.copy(memory, data, source, length)?; }
            0x38 => { self.charge(2)?; self.push(Word::from_u64(self.code.len() as u64))?; }
            0x39 => { self.charge(3)?; let memory = self.pop_usize()?; let source = self.pop_usize()?; let length = self.pop_usize()?; let code = self.code; self.copy(memory, code, source, length)?; }
            0x3a => { self.charge(2)?; self.push(self.env.gas_price)?; }
            0x3d => { self.charge(2)?; self.push(Word::from_u64(self.return_data_len as u64))?; }
            0x3e => { self.charge(3)?; let memory = self.pop_usize()?; let source = self.pop_usize()?; let length = self.pop_usize()?; let end = source.checked_add(length).ok_or(Exit::ReturnDataOutOfBounds)?; if end > self.return_data_len { return Err(Exit::ReturnDataOutOfBounds); } self.expand_memory(memory, length)?; self.charge(3 * length.div_ceil(32) as u64)?; for index in 0..length { self.workspace.memory[memory + index] = self.workspace.return_data[source + index]; } }
            0x41 => { self.charge(2)?; self.push(self.env.coinbase)?; }
            0x42 => { self.charge(2)?; self.push(self.env.timestamp)?; }
            0x43 => { self.charge(2)?; self.push(self.env.block_number)?; }
            0x44 => { self.charge(2)?; self.push(self.env.prev_randao)?; }
            0x45 => { self.charge(2)?; self.push(self.env.gas_limit)?; }
            0x46 => { self.charge(2)?; self.push(self.env.chain_id)?; }
            0x47 => { self.charge(5)?; self.push(self.env.self_balance)?; }
            0x48 => { self.charge(2)?; self.push(self.env.base_fee)?; }
            0x4a => { self.charge(2)?; self.push(self.env.blob_base_fee)?; }
            0x50 => { self.charge(2)?; self.pop()?; }
            0x51 => { self.charge(3)?; let offset = self.pop_usize()?; self.expand_memory(offset, 32)?; self.push(Word::from_be_slice(&self.workspace.memory[offset..offset + 32]))?; }
            0x52 => { self.charge(3)?; let offset = self.pop_usize()?; let value = self.pop()?; self.expand_memory(offset, 32)?; let mut bytes = [0; 32]; value.write_be(&mut bytes); self.workspace.memory[offset..offset + 32].copy_from_slice(&bytes); }
            0x53 => { self.charge(3)?; let offset = self.pop_usize()?; let value = self.pop()?; self.expand_memory(offset, 1)?; self.workspace.memory[offset] = value.low_u64() as u8; }
            0x54 => { self.charge(100)?; let key = self.pop()?; let value = Self::slot(&mut self.workspace.storage, key, None)?; self.push(value)?; }
            0x55 => { let key = self.pop()?; let value = self.pop()?; let old = Self::slot(&mut self.workspace.storage, key, None)?; self.charge(if old == value { 100 } else if old.is_zero() { 20_000 } else { 5_000 })?; Self::slot(&mut self.workspace.storage, key, Some(value))?; }
            0x56 => { self.charge(8)?; let destination = self.pop_usize()?; if !self.valid_jump(destination) { return Err(Exit::BadJump); } self.pc = destination; }
            0x57 => { self.charge(10)?; let destination = self.pop_usize()?; let condition = self.pop()?; if !condition.is_zero() { if !self.valid_jump(destination) { return Err(Exit::BadJump); } self.pc = destination; } }
            0x58 => { self.charge(2)?; self.push(Word::from_u64((self.pc - 1) as u64))?; }
            0x59 => { self.charge(2)?; self.push(Word::from_u64(self.memory_len as u64))?; }
            0x5a => { self.charge(2)?; self.push(Word::from_u64(self.gas))?; }
            0x5b => self.charge(1)?,
            0x5c => { self.charge(100)?; let key = self.pop()?; let value = Self::slot(&mut self.workspace.transient, key, None)?; self.push(value)?; }
            0x5d => { self.charge(100)?; let key = self.pop()?; let value = self.pop()?; Self::slot(&mut self.workspace.transient, key, Some(value))?; }
            0x5e => { self.charge(3)?; let destination = self.pop_usize()?; let source = self.pop_usize()?; let length = self.pop_usize()?; self.expand_memory(source, length)?; self.expand_memory(destination, length)?; self.charge(3 * length.div_ceil(32) as u64)?; self.workspace.memory.copy_within(source..source + length, destination); }
            0x5f => { self.charge(2)?; self.push(Word::ZERO)?; }
            0x60..=0x7f => { self.charge(3)?; let length = (opcode - 0x5f) as usize; let end = (self.pc + length).min(self.code.len()); let value = Word::from_be_slice(&self.code[self.pc..end]).shl((length - (end - self.pc)) * 8); self.pc += length; self.push(value)?; }
            0x80..=0x8f => { self.charge(3)?; let depth = (opcode - 0x7f) as usize; if self.stack_len < depth { return Err(Exit::StackUnderflow); } self.push(self.workspace.stack[self.stack_len - depth])?; }
            0x90..=0x9f => { self.charge(3)?; let depth = (opcode - 0x8f) as usize; if self.stack_len <= depth { return Err(Exit::StackUnderflow); } self.workspace.stack.swap(self.stack_len - 1, self.stack_len - 1 - depth); }
            0xa0..=0xa4 => {
                let topics = (opcode - 0xa0) as usize;
                let offset = self.pop_usize()?;
                let length = self.pop_usize()?;
                self.expand_memory(offset, length)?;
                self.charge(375 + 375 * topics as u64 + 8 * length as u64)?;
                if self.log_len == LOG_LIMIT ||
                    self.log_data_len.checked_add(length).ok_or(Exit::LogLimit)? > LOG_DATA_LIMIT {
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
            0xf3 | 0xfd => { let offset = self.pop_usize()?; let length = self.pop_usize()?; return Ok(Some(self.finish(if opcode == 0xf3 { Exit::Returned } else { Exit::Reverted }, offset, length)?)); }
            0xfe => return Err(Exit::InvalidOpcode),
            0xf0 | 0xf1 | 0xf2 | 0xf4 | 0xf5 | 0xfa | 0xff => return Err(Exit::UnsupportedOpcode),
            _ => return Err(Exit::InvalidOpcode),
        }
        Ok(None)
    }
}

#[cfg(test)]
mod tests {
    use super::{Environment, Exit, Machine, Workspace};
    use crate::Word;

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
    fn returndata_copy_checks_bounds_even_when_empty() {
        let code = [0x60, 1, 0x60, 0, 0x60, 0, 0x3e];
        let mut workspace = Workspace::new();
        assert_eq!(Machine::new(&code, &[], 1_000_000,
            Environment::default(), &mut workspace).run(100),
            Exit::ReturnDataOutOfBounds);
    }
}
