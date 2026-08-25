#![no_std]

use microesnext_types::Error;

pub const CONST_I30: u8 = 1;
pub const ADD_I30: u8 = 2;
pub const RETURN: u8 = 4;
pub const CALL: u8 = 5;
pub const THROW: u8 = 13;

#[inline(always)]
pub fn read_byte(code: &[u8], pc: &mut usize) -> Result<u8, Error> {
    let byte = *code.get(*pc).ok_or(Error::BadBytecode)?;
    *pc += 1;
    Ok(byte)
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
    if (-(1 << 29)..(1 << 29)).contains(&value) {
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
    let length = read_u16(code, pc)? as usize;
    let bytes = code.get(*pc..*pc + length).ok_or(Error::BadBytecode)?;
    *pc += length;
    Ok(bytes)
}

#[inline(always)]
pub fn read_u16(code: &[u8], pc: &mut usize) -> Result<u16, Error> {
    let bytes: [u8; 2] = code
        .get(*pc..*pc + 2)
        .ok_or(Error::BadBytecode)?
        .try_into()
        .map_err(|_| Error::BadBytecode)?;
    *pc += 2;
    Ok(u16::from_le_bytes(bytes))
}
