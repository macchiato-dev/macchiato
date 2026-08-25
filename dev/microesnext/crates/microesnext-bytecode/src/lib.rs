#![no_std]

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
