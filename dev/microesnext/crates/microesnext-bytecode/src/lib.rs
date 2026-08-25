#![no_std]

use microesnext_types::Error;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u8)]
pub enum Opcode {
    ConstI30 = 1,
    AddI30 = 2,
    Await = 3,
    Return = 4,
    Call = 5,
    ConstString = 6,
    NewObject = 7,
    GetProperty = 8,
    SetProperty = 9,
}

impl TryFrom<u8> for Opcode {
    type Error = Error;

    fn try_from(value: u8) -> Result<Self, Self::Error> {
        match value {
            1 => Ok(Self::ConstI30),
            2 => Ok(Self::AddI30),
            3 => Ok(Self::Await),
            4 => Ok(Self::Return),
            5 => Ok(Self::Call),
            6 => Ok(Self::ConstString),
            7 => Ok(Self::NewObject),
            8 => Ok(Self::GetProperty),
            9 => Ok(Self::SetProperty),
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

#[inline(always)]
pub fn read_u32(code: &[u8], pc: &mut usize) -> Result<u32, Error> {
    let bytes: [u8; 4] = code
        .get(*pc..*pc + 4)
        .ok_or(Error::BadBytecode)?
        .try_into()
        .map_err(|_| Error::BadBytecode)?;
    *pc += 4;
    Ok(u32::from_le_bytes(bytes))
}

#[inline(always)]
pub fn read_bytes<'code>(code: &'code [u8], pc: &mut usize) -> Result<&'code [u8], Error> {
    let length_bytes: [u8; 2] = code
        .get(*pc..*pc + 2)
        .ok_or(Error::BadBytecode)?
        .try_into()
        .map_err(|_| Error::BadBytecode)?;
    *pc += 2;
    let length = u16::from_le_bytes(length_bytes) as usize;
    let bytes = code.get(*pc..*pc + length).ok_or(Error::BadBytecode)?;
    *pc += length;
    Ok(bytes)
}
