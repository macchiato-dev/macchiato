#![no_std]

use microesnext_types::{Error, HeapRef, RootId, Value};

const HEADER_WORDS: usize = 2;
const MARK: u32 = 1 << 31;
const LENGTH_MASK: u32 = !MARK;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum BlockKind {
    Values = 1,
    Bytes = 2,
    Continuation = 3,
    String = 4,
    Object = 5,
    Properties = 6,
    Atoms = 7,
    Closure = 8,
    Map = 9,
    Set = 10,
    CollectionTable = 11,
    WeakMap = 12,
    WeakSet = 13,
    WeakTable = 14,
    Promise = 15,
    Reactions = 16,
    Array = 17,
    ArrayStorage = 18,
    #[cfg(feature = "numbers")]
    Number = 19,
    #[cfg(feature = "symbols")]
    Symbol = 20,
    #[cfg(feature = "iterators")]
    Iterator = 21,
    #[cfg(feature = "environments")]
    EnvironmentCell = 22,
    #[cfg(feature = "async-functions")]
    AsyncClosure = 23,
    #[cfg(feature = "async-functions")]
    AsyncInvocation = 24,
    #[cfg(feature = "errors")]
    Error = 25,
    #[cfg(feature = "promise-resolvers")]
    PromiseResolutionCell = 26,
    #[cfg(feature = "promise-resolvers")]
    PromiseResolver = 27,
}

#[inline(always)]
#[cfg(not(feature = "numbers"))]
const fn opaque_kind(kind: u32) -> bool {
    kind == BlockKind::Bytes as u32 || kind == BlockKind::String as u32
}

#[inline(always)]
#[cfg(feature = "numbers")]
const fn opaque_kind(kind: u32) -> bool {
    kind == BlockKind::Bytes as u32
        || kind == BlockKind::String as u32
        || kind == BlockKind::Number as u32
}

#[inline]
fn words_as_bytes(words: &[u32]) -> &[u8] {
    // SAFETY: every initialized `u32` is four initialized bytes, `u8` has
    // alignment one, and the returned slice cannot outlive `words`.
    unsafe { core::slice::from_raw_parts(words.as_ptr().cast(), words.len() * 4) }
}

#[inline]
fn words_as_bytes_mut(words: &mut [u32]) -> &mut [u8] {
    // SAFETY: this is the unique borrow of the word range. Byte payloads are
    // opaque and are read through the same native-byte view, so this remains
    // endian-independent rather than interpreting their bytes as integers.
    unsafe { core::slice::from_raw_parts_mut(words.as_mut_ptr().cast(), words.len() * 4) }
}

/// One fixed-capacity address space: heap grows upward and VM stack downward.
pub struct Arena<'memory> {
    words: &'memory mut [u32],
    root_capacity: usize,
    root_free_head: Option<usize>,
    heap_base: usize,
    heap_end: usize,
    stack_start: usize,
}

impl<'memory> Arena<'memory> {
    pub fn new(words: &'memory mut [u32]) -> Self {
        Self::with_root_capacity(words, 0)
    }

    pub fn with_root_capacity(words: &'memory mut [u32], root_capacity: usize) -> Self {
        let word_capacity = words.len();
        assert!(root_capacity <= u16::MAX as usize);
        let bitmap_words = root_capacity.div_ceil(32);
        let heap_base = 1 + bitmap_words + root_capacity * 2;
        assert!(word_capacity > heap_base + HEADER_WORDS && word_capacity < (1 << 30));
        words.fill(0);
        let values_start = 1 + bitmap_words;
        for slot in 0..root_capacity {
            words[values_start + slot] = if slot + 1 < root_capacity {
                (slot + 1) as u32
            } else {
                u32::MAX
            };
        }
        Self {
            root_capacity,
            root_free_head: (root_capacity > 0).then_some(0),
            heap_base,
            heap_end: heap_base,
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
        self.heap_end - self.heap_base
    }

    #[inline(always)]
    pub fn stack_len(&self) -> usize {
        self.words.len() - self.stack_start
    }

    pub fn allocate_values(
        &mut self,
        kind: BlockKind,
        values: &mut [Value],
        roots: &mut [Value],
    ) -> Result<HeapRef, Error> {
        self.ensure_kind_supported(kind)?;
        debug_assert!(kind != BlockKind::Bytes);
        let length = HEADER_WORDS + values.len();
        if self.heap_end + length > self.stack_start {
            self.compact_groups(&mut [roots, values])?;
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

    pub fn allocate_bytes(
        &mut self,
        kind: BlockKind,
        bytes: &[u8],
        roots: &mut [Value],
    ) -> Result<HeapRef, Error> {
        self.ensure_kind_supported(kind)?;
        debug_assert!(matches!(kind, BlockKind::Bytes | BlockKind::String));
        let data_words = bytes.len().div_ceil(4);
        let length = HEADER_WORDS + 1 + data_words;
        if self.heap_end + length > self.stack_start {
            self.compact(roots)?;
        }
        if self.heap_end + length > self.stack_start {
            return Err(Error::OutOfMemory);
        }
        let start = self.heap_end;
        self.words[start] = length as u32;
        self.words[start + 1] = kind as u32;
        self.words[start + HEADER_WORDS] = bytes.len() as u32;
        let storage = &mut self.words[start + HEADER_WORDS + 1..start + length];
        storage.fill(0);
        words_as_bytes_mut(storage)[..bytes.len()].copy_from_slice(bytes);
        self.heap_end += length;
        HeapRef::from_word_index(start as u32).ok_or(Error::OutOfMemory)
    }

    /// Join two byte blocks directly into a new arena block. Source handles
    /// are rooted across compaction, so callers need no temporary allocator.
    pub fn concatenate_bytes(
        &mut self,
        kind: BlockKind,
        left: HeapRef,
        right: HeapRef,
        roots: &mut [Value],
    ) -> Result<HeapRef, Error> {
        self.ensure_kind_supported(kind)?;
        if !matches!(kind, BlockKind::Bytes | BlockKind::String)
            || self.kind(left)? != kind
            || self.kind(right)? != kind
        {
            return Err(Error::Type);
        }
        let left_length = self.byte_len(left)?;
        let right_length = self.byte_len(right)?;
        let byte_length = left_length
            .checked_add(right_length)
            .ok_or(Error::OutOfMemory)?;
        let length = HEADER_WORDS + 1 + byte_length.div_ceil(4);
        let mut sources = [Value::from_ref(left), Value::from_ref(right)];
        if self.heap_end + length > self.stack_start {
            self.compact_groups(&mut [roots, &mut sources])?;
        }
        if self.heap_end + length > self.stack_start {
            return Err(Error::OutOfMemory);
        }
        let left = sources[0].as_ref().ok_or(Error::DanglingReference)?;
        let right = sources[1].as_ref().ok_or(Error::DanglingReference)?;
        let start = self.heap_end;
        let left_start = (self.block_start(left)? + HEADER_WORDS + 1) * 4;
        let right_start = (self.block_start(right)? + HEADER_WORDS + 1) * 4;
        let data_start = (start + HEADER_WORDS + 1) * 4;
        self.words[start] = length as u32;
        self.words[start + 1] = kind as u32;
        self.words[start + HEADER_WORDS] = byte_length as u32;
        let bytes = words_as_bytes_mut(self.words);
        bytes[data_start..(start + length) * 4].fill(0);
        bytes.copy_within(left_start..left_start + left_length, data_start);
        bytes.copy_within(
            right_start..right_start + right_length,
            data_start + left_length,
        );
        self.heap_end += length;
        HeapRef::from_word_index(start as u32).ok_or(Error::OutOfMemory)
    }

    /// Allocate untraced machine words. Numeric payloads and similar scalar
    /// data must not be mistaken for compact guest references by collection.
    #[cfg(feature = "numbers")]
    pub fn allocate_opaque(
        &mut self,
        kind: BlockKind,
        words: &[u32],
        roots: &mut [Value],
    ) -> Result<HeapRef, Error> {
        self.ensure_kind_supported(kind)?;
        if !opaque_kind(kind as u32) || matches!(kind, BlockKind::Bytes | BlockKind::String) {
            return Err(Error::Type);
        }
        let length = HEADER_WORDS + words.len();
        if self.heap_end + length > self.stack_start {
            self.compact(roots)?;
        }
        if self.heap_end + length > self.stack_start {
            return Err(Error::OutOfMemory);
        }
        let start = self.heap_end;
        self.words[start] = length as u32;
        self.words[start + 1] = kind as u32;
        self.words[start + HEADER_WORDS..start + length].copy_from_slice(words);
        self.heap_end += length;
        HeapRef::from_word_index(start as u32).ok_or(Error::OutOfMemory)
    }

    pub fn extend_values(
        &mut self,
        source: HeapRef,
        extra: &mut [Value],
        roots: &mut [Value],
    ) -> Result<HeapRef, Error> {
        let kind = self.kind(source)?;
        self.ensure_kind_supported(kind)?;
        if opaque_kind(kind as u32) {
            return Err(Error::Type);
        }
        let mut source_root = [Value::from_ref(source)];
        let old_length = self.values(source)?.len();
        let length = HEADER_WORDS + old_length + extra.len();
        if self.heap_end + length > self.stack_start {
            self.compact_groups(&mut [roots, &mut source_root, extra])?;
        }
        if self.heap_end + length > self.stack_start {
            return Err(Error::OutOfMemory);
        }
        let source = source_root[0].as_ref().ok_or(Error::DanglingReference)?;
        let source_start = self.block_start(source)? + HEADER_WORDS;
        let start = self.heap_end;
        self.words[start] = length as u32;
        self.words[start + 1] = kind as u32;
        self.words.copy_within(
            source_start..source_start + old_length,
            start + HEADER_WORDS,
        );
        for (slot, value) in self.words[start + HEADER_WORDS + old_length..start + length]
            .iter_mut()
            .zip(extra)
        {
            *slot = value.raw();
        }
        self.heap_end += length;
        HeapRef::from_word_index(start as u32).ok_or(Error::OutOfMemory)
    }

    pub fn allocate_from_stack(
        &mut self,
        kind: BlockKind,
        prefix: &mut [Value],
        stack_count: usize,
        roots: &mut [Value],
    ) -> Result<HeapRef, Error> {
        self.ensure_kind_supported(kind)?;
        if stack_count > self.stack_len() || opaque_kind(kind as u32) {
            return Err(Error::StackUnderflow);
        }
        let length = HEADER_WORDS + prefix.len() + stack_count;
        if self.heap_end + length > self.stack_start {
            self.compact_groups(&mut [roots, prefix])?;
        }
        if self.heap_end + length > self.stack_start {
            return Err(Error::OutOfMemory);
        }
        let start = self.heap_end;
        self.words[start] = length as u32;
        self.words[start + 1] = kind as u32;
        for (slot, value) in self.words[start + HEADER_WORDS..]
            .iter_mut()
            .zip(prefix.iter())
        {
            *slot = value.raw();
        }
        for index in 0..stack_count {
            self.words[start + HEADER_WORDS + prefix.len() + index] =
                self.words[self.stack_start + stack_count - index - 1];
        }
        self.heap_end += length;
        self.stack_start += stack_count;
        HeapRef::from_word_index(start as u32).ok_or(Error::OutOfMemory)
    }

    pub fn allocate_repeated_values(
        &mut self,
        kind: BlockKind,
        prefix: &mut [Value],
        repeated: usize,
        fill: Value,
        roots: &mut [Value],
    ) -> Result<HeapRef, Error> {
        self.ensure_kind_supported(kind)?;
        if opaque_kind(kind as u32) {
            return Err(Error::Type);
        }
        let length = HEADER_WORDS + prefix.len() + repeated;
        if self.heap_end + length > self.stack_start {
            self.compact_groups(&mut [roots, prefix])?;
        }
        if self.heap_end + length > self.stack_start {
            return Err(Error::OutOfMemory);
        }
        let start = self.heap_end;
        self.words[start] = length as u32;
        self.words[start + 1] = kind as u32;
        for (slot, value) in self.words[start + HEADER_WORDS..]
            .iter_mut()
            .zip(prefix.iter())
        {
            *slot = value.raw();
        }
        self.words[start + HEADER_WORDS + prefix.len()..start + length].fill(fill.raw());
        self.heap_end += length;
        HeapRef::from_word_index(start as u32).ok_or(Error::OutOfMemory)
    }

    pub fn extend_repeated_values(
        &mut self,
        source: HeapRef,
        repeated: usize,
        fill: Value,
        roots: &mut [Value],
    ) -> Result<HeapRef, Error> {
        let kind = self.kind(source)?;
        self.ensure_kind_supported(kind)?;
        if opaque_kind(kind as u32) {
            return Err(Error::Type);
        }
        let mut source_root = [Value::from_ref(source)];
        let old_length = self.values(source)?.len();
        let length = HEADER_WORDS + old_length + repeated;
        if self.heap_end + length > self.stack_start {
            self.compact_groups(&mut [roots, &mut source_root])?;
        }
        if self.heap_end + length > self.stack_start {
            return Err(Error::OutOfMemory);
        }
        let source = source_root[0].as_ref().ok_or(Error::DanglingReference)?;
        let source_start = self.block_start(source)? + HEADER_WORDS;
        let start = self.heap_end;
        self.words[start] = length as u32;
        self.words[start + 1] = kind as u32;
        self.words.copy_within(
            source_start..source_start + old_length,
            start + HEADER_WORDS,
        );
        self.words[start + HEADER_WORDS + old_length..start + length].fill(fill.raw());
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

    #[inline(always)]
    pub fn stack_value(&self, index_from_top: usize) -> Result<Value, Error> {
        self.words
            .get(self.stack_start + index_from_top)
            .copied()
            .map(Value::from_raw)
            .ok_or(Error::StackUnderflow)
    }

    /// Read a stable frame/local slot. Unlike operand-stack offsets, this
    /// index does not change as temporary values are pushed above it.
    #[inline(always)]
    pub fn stack_value_from_bottom(&self, index: usize) -> Result<Value, Error> {
        if index >= self.stack_len() {
            return Err(Error::StackUnderflow);
        }
        Ok(Value::from_raw(self.words[self.words.len() - 1 - index]))
    }

    #[inline(always)]
    pub fn set_stack_value_from_bottom(&mut self, index: usize, value: Value) -> Result<(), Error> {
        if index >= self.stack_len() {
            return Err(Error::StackUnderflow);
        }
        let index = self.words.len() - 1 - index;
        self.words[index] = value.raw();
        Ok(())
    }

    /// Insert one value at a stable bottom-relative position. Frame setup uses
    /// this once to put metadata below arguments; ordinary operand operations
    /// remain push/pop and pay no insertion cost.
    pub fn insert_stack_value_from_bottom(
        &mut self,
        index: usize,
        value: Value,
    ) -> Result<(), Error> {
        let length = self.stack_len();
        if index > length {
            return Err(Error::StackUnderflow);
        }
        if self.stack_start == self.heap_end {
            return Err(Error::OutOfMemory);
        }
        if index == length {
            return self.push(value);
        }
        let insertion = self.words.len() - 1 - index;
        self.words
            .copy_within(self.stack_start..=insertion, self.stack_start - 1);
        self.stack_start -= 1;
        self.words[insertion] = value.raw();
        Ok(())
    }

    /// Remove a value while retaining operands above it. Calls use this to
    /// take a function from immediately below its already-evaluated arguments.
    pub fn remove_stack_value_from_bottom(&mut self, index: usize) -> Result<Value, Error> {
        if index >= self.stack_len() {
            return Err(Error::StackUnderflow);
        }
        let removal = self.words.len() - 1 - index;
        let value = Value::from_raw(self.words[removal]);
        self.words
            .copy_within(self.stack_start..removal, self.stack_start + 1);
        self.stack_start += 1;
        Ok(value)
    }

    pub fn clear_stack(&mut self) {
        self.stack_start = self.words.len();
    }

    pub fn truncate_stack(&mut self, length: usize) -> Result<(), Error> {
        if length > self.stack_len() {
            return Err(Error::StackUnderflow);
        }
        self.stack_start = self.words.len() - length;
        Ok(())
    }

    pub fn retain(&mut self, value: Value) -> Result<RootId, Error> {
        let slot = self.root_free_head.ok_or(Error::OutOfMemory)?;
        let next = self.words[self.root_values_start() + slot];
        self.root_free_head = (next != u32::MAX).then_some(next as usize);
        self.set_root_allocated(slot, true);
        self.words[self.root_values_start() + slot] = value.raw();
        Ok(RootId::new(slot as u16, self.root_generation(slot)))
    }

    pub fn root(&self, id: RootId) -> Result<Value, Error> {
        let slot = self.checked_root(id)?;
        Ok(Value::from_raw(self.words[self.root_values_start() + slot]))
    }

    pub fn set_root(&mut self, id: RootId, value: Value) -> Result<(), Error> {
        let slot = self.checked_root(id)?;
        let index = self.root_values_start() + slot;
        self.words[index] = value.raw();
        Ok(())
    }

    pub fn release(&mut self, id: RootId) -> Result<Value, Error> {
        let slot = self.checked_root(id)?;
        let index = self.root_values_start() + slot;
        let value = Value::from_raw(self.words[index]);
        self.set_root_allocated(slot, false);
        let generation_index = self.root_generations_start() + slot;
        self.words[generation_index] = (self.words[generation_index] as u16).wrapping_add(1) as u32;
        self.words[index] = self.root_free_head.map_or(u32::MAX, |next| next as u32);
        self.root_free_head = Some(slot);
        Ok(value)
    }

    /// Move the complete guest address space into caller-provided storage.
    /// Heap offsets stay stable; only the downward-growing stack changes its
    /// physical base. No guest value contains that physical stack address.
    pub fn grow_into<'next>(self, words: &'next mut [u32]) -> Result<Arena<'next>, Error> {
        if words.len() <= self.words.len() || words.len() >= (1 << 30) {
            return Err(Error::OutOfMemory);
        }
        let stack_length = self.stack_len();
        if self.heap_end + stack_length > words.len() {
            return Err(Error::OutOfMemory);
        }
        words.fill(0);
        words[..self.heap_end].copy_from_slice(&self.words[..self.heap_end]);
        let next_stack_start = words.len() - stack_length;
        words[next_stack_start..].copy_from_slice(&self.words[self.stack_start..]);
        Ok(Arena {
            words,
            root_capacity: self.root_capacity,
            root_free_head: self.root_free_head,
            heap_base: self.heap_base,
            heap_end: self.heap_end,
            stack_start: next_stack_start,
        })
    }

    pub fn suspend_stack(
        &mut self,
        pc: u32,
        frame_depth: Option<usize>,
        handler_depth: Option<usize>,
        roots: &mut [Value],
    ) -> Result<HeapRef, Error> {
        let length = HEADER_WORDS + 3 + self.stack_len();
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
        let frame_depth = frame_depth.map_or(-1, |depth| depth as i32);
        self.words[start + HEADER_WORDS + 1] = Value::from_i30(frame_depth)
            .ok_or(Error::BadBytecode)?
            .raw();
        let handler_depth = handler_depth.map_or(-1, |depth| depth as i32);
        self.words[start + HEADER_WORDS + 2] = Value::from_i30(handler_depth)
            .ok_or(Error::BadBytecode)?
            .raw();
        let source = self.stack_start..self.words.len();
        self.words.copy_within(source, start + HEADER_WORDS + 3);
        self.heap_end += length;
        self.clear_stack();
        HeapRef::from_word_index(start as u32).ok_or(Error::OutOfMemory)
    }

    pub fn resume_stack(
        &mut self,
        continuation: HeapRef,
    ) -> Result<(u32, Option<usize>, Option<usize>), Error> {
        if self.kind(continuation)? != BlockKind::Continuation {
            return Err(Error::Type);
        }
        let start = self.block_start(continuation)?;
        let length = (self.words[start] & LENGTH_MASK) as usize;
        let pc = Value::from_raw(self.words[start + HEADER_WORDS])
            .as_i30()
            .ok_or(Error::BadBytecode)? as u32;
        let frame_depth = Value::from_raw(self.words[start + HEADER_WORDS + 1])
            .as_i30()
            .ok_or(Error::BadBytecode)?;
        let frame_depth = (frame_depth >= 0).then_some(frame_depth as usize);
        let handler_depth = Value::from_raw(self.words[start + HEADER_WORDS + 2])
            .as_i30()
            .ok_or(Error::BadBytecode)?;
        let handler_depth = (handler_depth >= 0).then_some(handler_depth as usize);
        let stack_length = length - HEADER_WORDS - 3;
        if self.heap_end + stack_length > self.words.len() {
            return Err(Error::OutOfMemory);
        }
        self.stack_start = self.words.len() - stack_length;
        let source = start + HEADER_WORDS + 3..start + length;
        self.words.copy_within(source, self.stack_start);
        Ok((pc, frame_depth, handler_depth))
    }

    pub fn values(&self, reference: HeapRef) -> Result<&[u32], Error> {
        let start = self.block_start(reference)?;
        #[cfg(feature = "numbers")]
        if self.words[start + 1] == BlockKind::Number as u32 {
            return Err(Error::Type);
        }
        let length = (self.words[start] & LENGTH_MASK) as usize;
        Ok(&self.words[start + HEADER_WORDS..start + length])
    }

    #[cfg(feature = "numbers")]
    pub fn opaque_words(&self, reference: HeapRef) -> Result<&[u32], Error> {
        let start = self.block_start(reference)?;
        if !opaque_kind(self.words[start + 1])
            || matches!(
                self.words[start + 1],
                value if value == BlockKind::Bytes as u32 || value == BlockKind::String as u32
            )
        {
            return Err(Error::Type);
        }
        let length = (self.words[start] & LENGTH_MASK) as usize;
        Ok(&self.words[start + HEADER_WORDS..start + length])
    }

    pub fn set_value(
        &mut self,
        reference: HeapRef,
        index: usize,
        value: Value,
    ) -> Result<(), Error> {
        if opaque_kind(self.kind(reference)? as u32) {
            return Err(Error::Type);
        }
        let start = self.block_start(reference)?;
        let length = (self.words[start] & LENGTH_MASK) as usize;
        let slot = start + HEADER_WORDS + index;
        if slot >= start + length {
            return Err(Error::BadBytecode);
        }
        self.words[slot] = value.raw();
        Ok(())
    }

    pub fn byte_len(&self, reference: HeapRef) -> Result<usize, Error> {
        if !matches!(self.kind(reference)?, BlockKind::Bytes | BlockKind::String) {
            return Err(Error::Type);
        }
        let start = self.block_start(reference)?;
        Ok(self.words[start + HEADER_WORDS] as usize)
    }

    pub fn byte(&self, reference: HeapRef, index: usize) -> Result<u8, Error> {
        self.bytes(reference)?
            .get(index)
            .copied()
            .ok_or(Error::BadBytecode)
    }

    /// Borrow a byte or string payload without copying it out of the arena.
    pub fn bytes(&self, reference: HeapRef) -> Result<&[u8], Error> {
        let length = self.byte_len(reference)?;
        let start = self.block_start(reference)? + HEADER_WORDS + 1;
        Ok(&words_as_bytes(&self.words[start..])[..length])
    }

    pub fn bytes_equal(&self, reference: HeapRef, bytes: &[u8]) -> Result<bool, Error> {
        Ok(self.bytes(reference)? == bytes)
    }

    pub fn kind(&self, reference: HeapRef) -> Result<BlockKind, Error> {
        let start = self.block_start(reference)?;
        match self.words[start + 1] {
            1 => Ok(BlockKind::Values),
            2 => Ok(BlockKind::Bytes),
            3 => Ok(BlockKind::Continuation),
            4 => Ok(BlockKind::String),
            5 => Ok(BlockKind::Object),
            6 => Ok(BlockKind::Properties),
            7 => Ok(BlockKind::Atoms),
            8 => Ok(BlockKind::Closure),
            9 => Ok(BlockKind::Map),
            10 => Ok(BlockKind::Set),
            11 => Ok(BlockKind::CollectionTable),
            12 => Ok(BlockKind::WeakMap),
            13 => Ok(BlockKind::WeakSet),
            14 => Ok(BlockKind::WeakTable),
            15 => Ok(BlockKind::Promise),
            16 => Ok(BlockKind::Reactions),
            17 => Ok(BlockKind::Array),
            18 => Ok(BlockKind::ArrayStorage),
            #[cfg(feature = "numbers")]
            19 => Ok(BlockKind::Number),
            #[cfg(feature = "symbols")]
            20 => Ok(BlockKind::Symbol),
            #[cfg(feature = "iterators")]
            21 => Ok(BlockKind::Iterator),
            #[cfg(feature = "environments")]
            22 => Ok(BlockKind::EnvironmentCell),
            #[cfg(feature = "async-functions")]
            23 => Ok(BlockKind::AsyncClosure),
            #[cfg(feature = "async-functions")]
            24 => Ok(BlockKind::AsyncInvocation),
            #[cfg(feature = "errors")]
            25 => Ok(BlockKind::Error),
            #[cfg(feature = "promise-resolvers")]
            26 => Ok(BlockKind::PromiseResolutionCell),
            #[cfg(feature = "promise-resolvers")]
            27 => Ok(BlockKind::PromiseResolver),
            _ => Err(Error::DanglingReference),
        }
    }

    /// Compact without a side allocation. Forwarding offsets are recomputed by
    /// scanning earlier blocks; this favors a tiny bounded implementation first.
    pub fn compact(&mut self, roots: &mut [Value]) -> Result<(), Error> {
        self.compact_groups(&mut [roots])
    }

    fn compact_groups<const N: usize>(
        &mut self,
        groups: &mut [&mut [Value]; N],
    ) -> Result<(), Error> {
        for group in groups.iter() {
            for root in group.iter().copied() {
                self.mark_value(root)?;
            }
        }
        for slot in 0..self.root_capacity {
            if self.root_allocated(slot) {
                self.mark_value(Value::from_raw(self.words[self.root_values_start() + slot]))?;
            }
        }
        for index in self.stack_start..self.words.len() {
            self.mark_value(Value::from_raw(self.words[index]))?;
        }

        loop {
            let mut changed = false;
            let mut cursor = self.heap_base;
            while cursor < self.heap_end {
                let length = (self.words[cursor] & LENGTH_MASK) as usize;
                if self.words[cursor] & MARK != 0 && !opaque_kind(self.words[cursor + 1]) && {
                    #[cfg(feature = "ephemerons")]
                    {
                        self.words[cursor + 1] != BlockKind::WeakTable as u32
                    }
                    #[cfg(not(feature = "ephemerons"))]
                    {
                        true
                    }
                } {
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
            #[cfg(feature = "ephemerons")]
            {
                changed |= self.mark_ephemeron_values()?;
            }
            if !changed {
                break;
            }
        }

        for group in groups.iter_mut() {
            for root in group.iter_mut() {
                *root = self.forward_value(*root)?;
            }
        }
        for slot in 0..self.root_capacity {
            if self.root_allocated(slot) {
                let index = self.root_values_start() + slot;
                self.words[index] = self
                    .forward_value(Value::from_raw(self.words[index]))?
                    .raw();
            }
        }
        for index in self.stack_start..self.words.len() {
            let value = Value::from_raw(self.words[index]);
            self.words[index] = self.forward_value(value)?.raw();
        }

        let mut cursor = self.heap_base;
        while cursor < self.heap_end {
            let length = (self.words[cursor] & LENGTH_MASK) as usize;
            if self.words[cursor] & MARK != 0 {
                #[cfg(feature = "ephemerons")]
                if self.words[cursor + 1] == BlockKind::WeakTable as u32 {
                    self.rewrite_ephemeron_table(cursor, length)?;
                } else if !opaque_kind(self.words[cursor + 1]) {
                    for index in cursor + HEADER_WORDS..cursor + length {
                        let value = Value::from_raw(self.words[index]);
                        self.words[index] = self.forward_value(value)?.raw();
                    }
                }
                #[cfg(not(feature = "ephemerons"))]
                if !opaque_kind(self.words[cursor + 1]) {
                    for index in cursor + HEADER_WORDS..cursor + length {
                        let value = Value::from_raw(self.words[index]);
                        self.words[index] = self.forward_value(value)?.raw();
                    }
                }
            }
            cursor += length;
        }

        let mut read = self.heap_base;
        let mut write = self.heap_base;
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

    #[cfg(feature = "ephemerons")]
    fn mark_ephemeron_values(&mut self) -> Result<bool, Error> {
        let mut changed = false;
        let mut cursor = self.heap_base;
        while cursor < self.heap_end {
            let length = (self.words[cursor] & LENGTH_MASK) as usize;
            if self.words[cursor] & MARK != 0
                && self.words[cursor + 1] == BlockKind::WeakTable as u32
            {
                if length < HEADER_WORDS + 2 || (length - HEADER_WORDS - 2) % 2 != 0 {
                    return Err(Error::DanglingReference);
                }
                let used = Value::from_raw(self.words[cursor + HEADER_WORDS + 1])
                    .as_i30()
                    .ok_or(Error::DanglingReference)? as usize;
                let capacity = (length - HEADER_WORDS - 2) / 2;
                if used > capacity {
                    return Err(Error::DanglingReference);
                }
                for entry in 0..used {
                    let key = Value::from_raw(self.words[cursor + HEADER_WORDS + 2 + entry * 2]);
                    if key == Value::EMPTY {
                        continue;
                    }
                    let key = key.as_ref().ok_or(Error::Type)?;
                    let key_start = self.block_start(key)?;
                    if self.words[key_start] & MARK == 0 {
                        continue;
                    }
                    let value =
                        Value::from_raw(self.words[cursor + HEADER_WORDS + 2 + entry * 2 + 1]);
                    if let Some(value_ref) = value.as_ref() {
                        let value_start = self.block_start(value_ref)?;
                        if self.words[value_start] & MARK == 0 {
                            self.words[value_start] |= MARK;
                            changed = true;
                        }
                    }
                }
            }
            cursor += length;
        }
        Ok(changed)
    }

    #[cfg(feature = "ephemerons")]
    fn rewrite_ephemeron_table(&mut self, start: usize, length: usize) -> Result<(), Error> {
        let count_index = start + HEADER_WORDS;
        let used_index = count_index + 1;
        let used = Value::from_raw(self.words[used_index])
            .as_i30()
            .ok_or(Error::DanglingReference)? as usize;
        let capacity = (length - HEADER_WORDS - 2) / 2;
        if used > capacity {
            return Err(Error::DanglingReference);
        }
        let mut count = 0_i32;
        for entry in 0..used {
            let key_index = start + HEADER_WORDS + 2 + entry * 2;
            let value_index = key_index + 1;
            let key = Value::from_raw(self.words[key_index]);
            if key == Value::EMPTY {
                continue;
            }
            let key_ref = key.as_ref().ok_or(Error::Type)?;
            let key_start = self.block_start(key_ref)?;
            if self.words[key_start] & MARK == 0 {
                self.words[key_index] = Value::EMPTY.raw();
                self.words[value_index] = Value::UNDEFINED.raw();
                continue;
            }
            self.words[key_index] = self.forward_value(key)?.raw();
            let value = Value::from_raw(self.words[value_index]);
            self.words[value_index] = self.forward_value(value)?.raw();
            count += 1;
        }
        self.words[count_index] = Value::from_i30(count)
            .ok_or(Error::DanglingReference)?
            .raw();
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
        let mut read = self.heap_base;
        let mut forwarded = self.heap_base;
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
        if target < self.heap_base || target >= self.heap_end {
            return Err(Error::DanglingReference);
        }
        debug_assert!(self.is_block_start(target));
        let length = (self.words[target] & LENGTH_MASK) as usize;
        if length < HEADER_WORDS || target + length > self.heap_end {
            return Err(Error::DanglingReference);
        }
        Ok(target)
    }

    fn is_block_start(&self, target: usize) -> bool {
        let mut cursor = self.heap_base;
        while cursor < self.heap_end {
            if cursor == target {
                return true;
            }
            let length = (self.words[cursor] & LENGTH_MASK) as usize;
            if length < HEADER_WORDS {
                return false;
            }
            cursor += length;
        }
        false
    }

    #[inline(always)]
    fn root_bitmap_words(&self) -> usize {
        self.root_capacity.div_ceil(32)
    }

    #[inline(always)]
    fn root_values_start(&self) -> usize {
        1 + self.root_bitmap_words()
    }

    #[inline(always)]
    fn root_generations_start(&self) -> usize {
        self.root_values_start() + self.root_capacity
    }

    #[inline(always)]
    fn root_allocated(&self, slot: usize) -> bool {
        self.words[1 + slot / 32] & (1 << (slot % 32)) != 0
    }

    #[inline(always)]
    fn set_root_allocated(&mut self, slot: usize, allocated: bool) {
        let index = 1 + slot / 32;
        let mask = 1 << (slot % 32);
        if allocated {
            self.words[index] |= mask;
        } else {
            self.words[index] &= !mask;
        }
    }

    #[inline(always)]
    fn root_generation(&self, slot: usize) -> u16 {
        self.words[self.root_generations_start() + slot] as u16
    }

    fn checked_root(&self, id: RootId) -> Result<usize, Error> {
        let slot = id.slot();
        if slot >= self.root_capacity
            || !self.root_allocated(slot)
            || self.root_generation(slot) != id.generation()
        {
            return Err(Error::InvalidRoot);
        }
        Ok(slot)
    }

    #[inline(always)]
    fn ensure_kind_supported(&self, kind: BlockKind) -> Result<(), Error> {
        #[cfg(not(feature = "ephemerons"))]
        if kind == BlockKind::WeakTable {
            return Err(Error::Type);
        }
        let _ = kind;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn compaction_moves_live_graph_and_stack_references() {
        let mut memory = [0; 32];
        let mut arena = Arena::new(&mut memory);
        let mut no_roots = [];
        let _dead = arena
            .allocate_values(BlockKind::Values, &mut [Value::TRUE], &mut no_roots)
            .unwrap();
        let child = arena
            .allocate_values(
                BlockKind::Values,
                &mut [Value::from_i30(7).unwrap()],
                &mut no_roots,
            )
            .unwrap();
        let parent = arena
            .allocate_values(
                BlockKind::Values,
                &mut [Value::from_ref(child)],
                &mut no_roots,
            )
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
        let mut memory = [0; 32];
        let mut arena = Arena::new(&mut memory);
        arena.push(Value::from_i30(4).unwrap()).unwrap();
        arena.push(Value::from_i30(9).unwrap()).unwrap();
        let continuation = arena.suspend_stack(17, None, None, &mut []).unwrap();
        assert_eq!(arena.stack_len(), 0);
        assert_eq!(arena.resume_stack(continuation).unwrap(), (17, None, None));
        assert_eq!(arena.pop().unwrap().as_i30(), Some(9));
        assert_eq!(arena.pop().unwrap().as_i30(), Some(4));
    }

    #[test]
    fn bottom_relative_slots_ignore_temporary_operands() {
        let mut memory = [0; 16];
        let mut arena = Arena::new(&mut memory);
        arena.push(Value::from_i30(4).unwrap()).unwrap();
        arena.push(Value::from_i30(9).unwrap()).unwrap();
        assert_eq!(arena.stack_value_from_bottom(0).unwrap().as_i30(), Some(4));
        assert_eq!(arena.stack_value_from_bottom(1).unwrap().as_i30(), Some(9));

        arena.push(Value::TRUE).unwrap();
        arena
            .set_stack_value_from_bottom(1, Value::from_i30(10).unwrap())
            .unwrap();
        assert_eq!(arena.stack_value_from_bottom(0).unwrap().as_i30(), Some(4));
        assert_eq!(arena.stack_value_from_bottom(1).unwrap().as_i30(), Some(10));
        assert_eq!(arena.pop(), Ok(Value::TRUE));
    }

    #[test]
    fn inserts_frame_metadata_below_existing_arguments() {
        let mut memory = [0; 16];
        let mut arena = Arena::new(&mut memory);
        arena.push(Value::from_i30(10).unwrap()).unwrap();
        arena.push(Value::from_i30(20).unwrap()).unwrap();
        arena.push(Value::from_i30(30).unwrap()).unwrap();
        arena
            .insert_stack_value_from_bottom(2, Value::from_i30(2).unwrap())
            .unwrap();
        assert_eq!(arena.stack_value_from_bottom(0).unwrap().as_i30(), Some(10));
        assert_eq!(arena.stack_value_from_bottom(1).unwrap().as_i30(), Some(20));
        assert_eq!(arena.stack_value_from_bottom(2).unwrap().as_i30(), Some(2));
        assert_eq!(arena.stack_value_from_bottom(3).unwrap().as_i30(), Some(30));
    }

    #[test]
    fn removes_a_callable_below_evaluated_arguments() {
        let mut memory = [0; 16];
        let mut arena = Arena::new(&mut memory);
        arena.push(Value::from_i30(10).unwrap()).unwrap();
        arena.push(Value::from_i30(20).unwrap()).unwrap();
        arena.push(Value::from_i30(30).unwrap()).unwrap();
        assert_eq!(
            arena.remove_stack_value_from_bottom(1).unwrap().as_i30(),
            Some(20)
        );
        assert_eq!(arena.stack_value_from_bottom(0).unwrap().as_i30(), Some(10));
        assert_eq!(arena.stack_value_from_bottom(1).unwrap().as_i30(), Some(30));
    }

    #[test]
    fn suspension_relocates_external_and_stack_roots() {
        let mut memory = [0; 18];
        let mut arena = Arena::new(&mut memory);
        let mut no_roots = [];
        let _dead = arena
            .allocate_values(BlockKind::Values, &mut [Value::FALSE], &mut no_roots)
            .unwrap();
        let live = arena
            .allocate_values(BlockKind::Values, &mut [Value::TRUE], &mut no_roots)
            .unwrap();
        let _more_dead = arena
            .allocate_values(
                BlockKind::Values,
                &mut [Value::NULL, Value::NULL, Value::NULL],
                &mut no_roots,
            )
            .unwrap();
        arena.push(Value::from_i30(3).unwrap()).unwrap();
        arena.push(Value::from_i30(5).unwrap()).unwrap();
        let mut roots = [Value::from_ref(live)];

        let continuation = arena
            .suspend_stack(11, Some(2), Some(4), &mut roots)
            .unwrap();

        assert_eq!(roots[0].as_ref().unwrap().word_index(), 1);
        assert_eq!(
            arena.values(roots[0].as_ref().unwrap()).unwrap(),
            &[Value::TRUE.raw()]
        );
        assert_eq!(
            arena.resume_stack(continuation).unwrap(),
            (11, Some(2), Some(4))
        );
        assert_eq!(arena.pop().unwrap().as_i30(), Some(5));
        assert_eq!(arena.pop().unwrap().as_i30(), Some(3));
    }

    #[test]
    fn caller_can_grow_the_machine_without_changing_heap_offsets() {
        let mut initial = [0; 12];
        let mut arena = Arena::new(&mut initial);
        let reference = arena
            .allocate_values(BlockKind::Values, &mut [Value::TRUE], &mut [])
            .unwrap();
        arena.push(Value::from_ref(reference)).unwrap();
        let mut larger = [0; 24];

        let mut arena = arena.grow_into(&mut larger).unwrap();

        assert_eq!(arena.pop().unwrap().as_ref(), Some(reference));
        assert_eq!(arena.values(reference).unwrap(), &[Value::TRUE.raw()]);
        assert_eq!(arena.capacity_words(), 24);
    }

    #[test]
    fn stable_roots_follow_compaction_and_reject_released_handles() {
        let mut memory = [0; 32];
        let mut arena = Arena::with_root_capacity(&mut memory, 2);
        let _dead = arena
            .allocate_values(BlockKind::Values, &mut [Value::FALSE], &mut [])
            .unwrap();
        let live = arena
            .allocate_values(BlockKind::Values, &mut [Value::TRUE], &mut [])
            .unwrap();
        let root = arena.retain(Value::from_ref(live)).unwrap();

        arena.compact(&mut []).unwrap();

        let moved = arena.root(root).unwrap().as_ref().unwrap();
        assert_eq!(arena.values(moved).unwrap(), &[Value::TRUE.raw()]);
        assert_eq!(arena.release(root).unwrap(), Value::from_ref(moved));
        assert_eq!(arena.root(root), Err(Error::InvalidRoot));
        let reused = arena.retain(Value::NULL).unwrap();
        assert_eq!(reused.slot(), root.slot());
        assert_ne!(reused.generation(), root.generation());
    }
}
