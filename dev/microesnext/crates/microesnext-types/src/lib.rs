#![no_std]

use core::fmt;

const TAG_MASK: u32 = 0b11;
const TAG_REF: u32 = 0b00;
const TAG_INT: u32 = 0b01;
const TAG_IMMEDIATE: u32 = 0b10;

/// A word offset into the machine arena. Zero is reserved as an invalid handle.
#[derive(Clone, Copy, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
#[repr(transparent)]
pub struct HeapRef(u32);

impl HeapRef {
    #[inline(always)]
    pub const fn from_word_index(index: u32) -> Option<Self> {
        if index == 0 || index >= (1 << 30) {
            None
        } else {
            Some(Self(index))
        }
    }

    #[inline(always)]
    pub const fn word_index(self) -> u32 {
        self.0
    }
}

/// A compact guest value. Arrays, frames, and operand stacks store four-byte values.
#[derive(Clone, Copy, Eq, Hash, PartialEq)]
#[repr(transparent)]
pub struct Value(u32);

impl Value {
    pub const UNDEFINED: Self = Self((0 << 2) | TAG_IMMEDIATE);
    pub const NULL: Self = Self((1 << 2) | TAG_IMMEDIATE);
    pub const FALSE: Self = Self((2 << 2) | TAG_IMMEDIATE);
    pub const TRUE: Self = Self((3 << 2) | TAG_IMMEDIATE);

    #[inline(always)]
    pub const fn from_i30(value: i32) -> Option<Self> {
        if value >= -(1 << 29) && value < (1 << 29) {
            Some(Self(((value as u32) << 2) | TAG_INT))
        } else {
            None
        }
    }

    #[inline(always)]
    pub const fn as_i30(self) -> Option<i32> {
        if self.0 & TAG_MASK == TAG_INT {
            Some((self.0 as i32) >> 2)
        } else {
            None
        }
    }

    #[inline(always)]
    pub const fn from_ref(reference: HeapRef) -> Self {
        Self((reference.word_index() << 2) | TAG_REF)
    }

    #[inline(always)]
    pub const fn as_ref(self) -> Option<HeapRef> {
        if self.0 & TAG_MASK == TAG_REF {
            HeapRef::from_word_index(self.0 >> 2)
        } else {
            None
        }
    }

    #[inline(always)]
    pub const fn from_raw(raw: u32) -> Self {
        Self(raw)
    }

    #[inline(always)]
    pub const fn raw(self) -> u32 {
        self.0
    }
}

impl fmt::Debug for Value {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        if let Some(value) = self.as_i30() {
            return formatter.debug_tuple("Int").field(&value).finish();
        }
        if let Some(reference) = self.as_ref() {
            return formatter.debug_tuple("Ref").field(&reference).finish();
        }
        match *self {
            Self::UNDEFINED => formatter.write_str("Undefined"),
            Self::NULL => formatter.write_str("Null"),
            Self::FALSE => formatter.write_str("False"),
            Self::TRUE => formatter.write_str("True"),
            _ => formatter.debug_tuple("Immediate").field(&self.0).finish(),
        }
    }
}

const _: () = assert!(core::mem::size_of::<HeapRef>() == 4);
const _: () = assert!(core::mem::size_of::<Value>() == 4);

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Error {
    BadBytecode,
    DanglingReference,
    OutOfMemory,
    StackUnderflow,
    Type,
}
