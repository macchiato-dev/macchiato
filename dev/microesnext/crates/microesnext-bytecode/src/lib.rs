#![no_std]

extern crate alloc;

use alloc::vec::Vec;
use microesnext_types::Error;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u8)]
pub enum Opcode {
    ConstI30 = 1,
    AddI30 = 2,
    Await = 3,
    Return = 4,
}

impl TryFrom<u8> for Opcode {
    type Error = Error;

    fn try_from(value: u8) -> Result<Self, Self::Error> {
        match value {
            1 => Ok(Self::ConstI30),
            2 => Ok(Self::AddI30),
            3 => Ok(Self::Await),
            4 => Ok(Self::Return),
            _ => Err(Error::BadBytecode),
        }
    }
}

#[derive(Default)]
pub struct Builder {
    code: Vec<u8>,
}

impl Builder {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn const_i30(mut self, value: i32) -> Self {
        self.code.push(Opcode::ConstI30 as u8);
        self.code.extend_from_slice(&value.to_le_bytes());
        self
    }

    pub fn op(mut self, opcode: Opcode) -> Self {
        self.code.push(opcode as u8);
        self
    }

    pub fn finish(self) -> Vec<u8> {
        self.code
    }
}

#[inline(always)]
pub fn read_opcode(code: &[u8], pc: &mut usize) -> Result<Opcode, Error> {
    let byte = *code.get(*pc).ok_or(Error::BadBytecode)?;
    *pc += 1;
    Opcode::try_from(byte)
}

#[inline(always)]
pub fn read_i30(code: &[u8], pc: &mut usize) -> Result<i32, Error> {
    let bytes: [u8; 4] = code
        .get(*pc..*pc + 4)
        .ok_or(Error::BadBytecode)?
        .try_into()
        .map_err(|_| Error::BadBytecode)?;
    *pc += 4;
    let value = i32::from_le_bytes(bytes);
    if value >= -(1 << 29) && value < (1 << 29) {
        Ok(value)
    } else {
        Err(Error::BadBytecode)
    }
}
