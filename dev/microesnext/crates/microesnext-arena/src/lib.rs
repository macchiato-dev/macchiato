#![no_std]

extern crate alloc;

use alloc::vec;
use alloc::vec::Vec;
use microesnext_types::{Error, HeapRef, Value};

const HEADER_WORDS: usize = 2;
const MARK: u32 = 1 << 31;
const LENGTH_MASK: u32 = !MARK;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum BlockKind {
    Values = 1,
    Bytes = 2,
    Continuation = 3,
}

/// One fixed-capacity address space: heap grows upward and VM stack downward.
pub struct Arena {
    words: Vec<u32>,
    heap_end: usize,
    stack_start: usize,
}

impl Arena {
    pub fn new(word_capacity: usize) -> Self {
        assert!(word_capacity > HEADER_WORDS + 1);
        let words = vec![0; word_capacity];
        Self {
            heap_end: 1,
            stack_start: word_capacity,
            words,
        }
    }

    #[inline(always)]
    pub fn capacity_words(&self) -> usize {
        self.words.len()
    }

    #[inline(always)]
    pub fn heap_words(&self) -> usize {
        self.heap_end - 1
    }

    #[inline(always)]
    pub fn stack_len(&self) -> usize {
        self.words.len() - self.stack_start
    }

    pub fn allocate_values(
        &mut self,
        kind: BlockKind,
        values: &[Value],
        roots: &mut [Value],
    ) -> Result<HeapRef, Error> {
        debug_assert!(kind != BlockKind::Bytes);
        let length = HEADER_WORDS + values.len();
        if self.heap_end + length > self.stack_start {
            self.compact(roots)?;
        }
        if self.heap_end + length > self.stack_start {
            return Err(Error::OutOfMemory);
        }
        let start = self.heap_end;
        self.words[start] = length as u32;
        self.words[start + 1] = kind as u32;
        for (slot, value) in self.words[start + HEADER_WORDS..start + length]
            .iter_mut()
            .zip(values)
        {
            *slot = value.raw();
        }
        self.heap_end += length;
        HeapRef::from_word_index(start as u32).ok_or(Error::OutOfMemory)
    }

    #[inline(always)]
    pub fn push(&mut self, value: Value) -> Result<(), Error> {
        if self.stack_start == self.heap_end {
            return Err(Error::OutOfMemory);
        }
        self.stack_start -= 1;
        self.words[self.stack_start] = value.raw();
        Ok(())
    }

    #[inline(always)]
    pub fn pop(&mut self) -> Result<Value, Error> {
        if self.stack_start == self.words.len() {
            return Err(Error::StackUnderflow);
        }
        let value = Value::from_raw(self.words[self.stack_start]);
        self.stack_start += 1;
        Ok(value)
    }

    pub fn stack_values(&self) -> impl ExactSizeIterator<Item = Value> + '_ {
        self.words[self.stack_start..]
            .iter()
            .copied()
            .map(Value::from_raw)
    }

    pub fn clear_stack(&mut self) {
        self.stack_start = self.words.len();
    }

    pub fn suspend_stack(&mut self, pc: u32, roots: &mut [Value]) -> Result<HeapRef, Error> {
        let length = HEADER_WORDS + 1 + self.stack_len();
        if self.heap_end + length > self.stack_start {
            self.compact(roots)?;
        }
        if self.heap_end + length > self.stack_start {
            return Err(Error::OutOfMemory);
        }
        let start = self.heap_end;
        self.words[start] = length as u32;
        self.words[start + 1] = BlockKind::Continuation as u32;
        self.words[start + HEADER_WORDS] =
            Value::from_i30(pc as i32).ok_or(Error::BadBytecode)?.raw();
        let source = self.stack_start..self.words.len();
        self.words.copy_within(source, start + HEADER_WORDS + 1);
        self.heap_end += length;
        self.clear_stack();
        HeapRef::from_word_index(start as u32).ok_or(Error::OutOfMemory)
    }

    pub fn resume_stack(&mut self, continuation: HeapRef) -> Result<u32, Error> {
        if self.kind(continuation)? != BlockKind::Continuation {
            return Err(Error::Type);
        }
        let start = self.block_start(continuation)?;
        let length = (self.words[start] & LENGTH_MASK) as usize;
        let pc = Value::from_raw(self.words[start + HEADER_WORDS])
            .as_i30()
            .ok_or(Error::BadBytecode)? as u32;
        let stack_length = length - HEADER_WORDS - 1;
        if self.heap_end + stack_length > self.words.len() {
            return Err(Error::OutOfMemory);
        }
        self.stack_start = self.words.len() - stack_length;
        let source = start + HEADER_WORDS + 1..start + length;
        self.words.copy_within(source, self.stack_start);
        Ok(pc)
    }

    pub fn values(&self, reference: HeapRef) -> Result<&[u32], Error> {
        let start = self.block_start(reference)?;
        let length = (self.words[start] & LENGTH_MASK) as usize;
        Ok(&self.words[start + HEADER_WORDS..start + length])
    }

    pub fn kind(&self, reference: HeapRef) -> Result<BlockKind, Error> {
        let start = self.block_start(reference)?;
        match self.words[start + 1] {
            1 => Ok(BlockKind::Values),
            2 => Ok(BlockKind::Bytes),
            3 => Ok(BlockKind::Continuation),
            _ => Err(Error::DanglingReference),
        }
    }

    /// Compact without a side allocation. Forwarding offsets are recomputed by
    /// scanning earlier blocks; this favors a tiny bounded implementation first.
    pub fn compact(&mut self, roots: &mut [Value]) -> Result<(), Error> {
        for root in roots.iter().copied() {
            self.mark_value(root)?;
        }
        for index in self.stack_start..self.words.len() {
            self.mark_value(Value::from_raw(self.words[index]))?;
        }

        loop {
            let mut changed = false;
            let mut cursor = 1;
            while cursor < self.heap_end {
                let length = (self.words[cursor] & LENGTH_MASK) as usize;
                if self.words[cursor] & MARK != 0
                    && self.words[cursor + 1] != BlockKind::Bytes as u32
                {
                    for index in cursor + HEADER_WORDS..cursor + length {
                        if let Some(reference) = Value::from_raw(self.words[index]).as_ref() {
                            let child = self.block_start(reference)?;
                            if self.words[child] & MARK == 0 {
                                self.words[child] |= MARK;
                                changed = true;
                            }
                        }
                    }
                }
                cursor += length;
            }
            if !changed {
                break;
            }
        }

        for root in roots {
            *root = self.forward_value(*root)?;
        }
        for index in self.stack_start..self.words.len() {
            let value = Value::from_raw(self.words[index]);
            self.words[index] = self.forward_value(value)?.raw();
        }

        let mut cursor = 1;
        while cursor < self.heap_end {
            let length = (self.words[cursor] & LENGTH_MASK) as usize;
            if self.words[cursor] & MARK != 0 && self.words[cursor + 1] != BlockKind::Bytes as u32 {
                for index in cursor + HEADER_WORDS..cursor + length {
                    let value = Value::from_raw(self.words[index]);
                    self.words[index] = self.forward_value(value)?.raw();
                }
            }
            cursor += length;
        }

        let mut read = 1;
        let mut write = 1;
        while read < self.heap_end {
            let length = (self.words[read] & LENGTH_MASK) as usize;
            if self.words[read] & MARK != 0 {
                self.words[read] &= LENGTH_MASK;
                self.words.copy_within(read..read + length, write);
                write += length;
            }
            read += length;
        }
        self.heap_end = write;
        Ok(())
    }

    fn mark_value(&mut self, value: Value) -> Result<(), Error> {
        if let Some(reference) = value.as_ref() {
            let start = self.block_start(reference)?;
            self.words[start] |= MARK;
        }
        Ok(())
    }

    fn forward_value(&self, value: Value) -> Result<Value, Error> {
        let Some(reference) = value.as_ref() else {
            return Ok(value);
        };
        let old = self.block_start(reference)?;
        if self.words[old] & MARK == 0 {
            return Err(Error::DanglingReference);
        }
        let mut read = 1;
        let mut forwarded = 1;
        while read < old {
            let length = (self.words[read] & LENGTH_MASK) as usize;
            if self.words[read] & MARK != 0 {
                forwarded += length;
            }
            read += length;
        }
        let reference =
            HeapRef::from_word_index(forwarded as u32).ok_or(Error::DanglingReference)?;
        Ok(Value::from_ref(reference))
    }

    fn block_start(&self, reference: HeapRef) -> Result<usize, Error> {
        let target = reference.word_index() as usize;
        let mut cursor = 1;
        while cursor < self.heap_end {
            if cursor == target {
                return Ok(cursor);
            }
            let length = (self.words[cursor] & LENGTH_MASK) as usize;
            if length < HEADER_WORDS {
                return Err(Error::DanglingReference);
            }
            cursor += length;
        }
        Err(Error::DanglingReference)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn compaction_moves_live_graph_and_stack_references() {
        let mut arena = Arena::new(32);
        let mut no_roots = [];
        let _dead = arena
            .allocate_values(BlockKind::Values, &[Value::TRUE], &mut no_roots)
            .unwrap();
        let child = arena
            .allocate_values(
                BlockKind::Values,
                &[Value::from_i30(7).unwrap()],
                &mut no_roots,
            )
            .unwrap();
        let parent = arena
            .allocate_values(BlockKind::Values, &[Value::from_ref(child)], &mut no_roots)
            .unwrap();
        arena.push(Value::from_ref(parent)).unwrap();

        arena.compact(&mut no_roots).unwrap();

        let moved_parent = arena.stack_values().next().unwrap().as_ref().unwrap();
        let moved_child = Value::from_raw(arena.values(moved_parent).unwrap()[0])
            .as_ref()
            .unwrap();
        assert_eq!(
            arena.values(moved_child).unwrap(),
            &[Value::from_i30(7).unwrap().raw()]
        );
        assert_eq!(arena.heap_words(), 6);
    }

    #[test]
    fn suspension_round_trips_the_vm_stack() {
        let mut arena = Arena::new(32);
        arena.push(Value::from_i30(4).unwrap()).unwrap();
        arena.push(Value::from_i30(9).unwrap()).unwrap();
        let continuation = arena.suspend_stack(17, &mut []).unwrap();
        assert_eq!(arena.stack_len(), 0);
        assert_eq!(arena.resume_stack(continuation).unwrap(), 17);
        assert_eq!(arena.pop().unwrap().as_i30(), Some(9));
        assert_eq!(arena.pop().unwrap().as_i30(), Some(4));
    }

    #[test]
    fn suspension_relocates_external_and_stack_roots() {
        let mut arena = Arena::new(18);
        let mut no_roots = [];
        let _dead = arena
            .allocate_values(BlockKind::Values, &[Value::FALSE], &mut no_roots)
            .unwrap();
        let live = arena
            .allocate_values(BlockKind::Values, &[Value::TRUE], &mut no_roots)
            .unwrap();
        let _more_dead = arena
            .allocate_values(
                BlockKind::Values,
                &[Value::NULL, Value::NULL, Value::NULL],
                &mut no_roots,
            )
            .unwrap();
        arena.push(Value::from_i30(3).unwrap()).unwrap();
        arena.push(Value::from_i30(5).unwrap()).unwrap();
        let mut roots = [Value::from_ref(live)];

        let continuation = arena.suspend_stack(11, &mut roots).unwrap();

        assert_eq!(roots[0].as_ref().unwrap().word_index(), 1);
        assert_eq!(
            arena.values(roots[0].as_ref().unwrap()).unwrap(),
            &[Value::TRUE.raw()]
        );
        assert_eq!(arena.resume_stack(continuation).unwrap(), 11);
        assert_eq!(arena.pop().unwrap().as_i30(), Some(5));
        assert_eq!(arena.pop().unwrap().as_i30(), Some(3));
    }
}
