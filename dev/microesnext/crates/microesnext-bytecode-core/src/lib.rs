#![no_std]

use microesnext_types::Error;

pub const CONST_I30: u8 = 1;
pub const ADD_I30: u8 = 2;
pub const RETURN: u8 = 4;
pub const CALL: u8 = 5;
pub const THROW: u8 = 13;
pub const CONST_IMMEDIATE: u8 = 23;
pub const INIT_LOCALS: u8 = 24;
pub const LOAD_LOCAL: u8 = 25;
pub const STORE_LOCAL: u8 = 26;
pub const RETURN_LOCALS: u8 = 27;
pub const JUMP: u8 = 28;
pub const JUMP_IF_FALSE_BOOLEAN: u8 = 29;

pub const IMMEDIATE_UNDEFINED: u8 = 0;
pub const IMMEDIATE_NULL: u8 = 1;
pub const IMMEDIATE_FALSE: u8 = 2;
pub const IMMEDIATE_TRUE: u8 = 3;

#[inline(always)]
pub fn read_byte(code: &[u8], pc: &mut usize) -> Result<u8, Error> {
    let byte = *code.get(*pc).ok_or(Error::BadBytecode)?;
    *pc += 1;
    Ok(byte)
}

#[inline(always)]
pub fn read_immediate(code: &[u8], pc: &mut usize) -> Result<microesnext_types::Value, Error> {
    match read_byte(code, pc)? {
        IMMEDIATE_UNDEFINED => Ok(microesnext_types::Value::UNDEFINED),
        IMMEDIATE_NULL => Ok(microesnext_types::Value::NULL),
        IMMEDIATE_FALSE => Ok(microesnext_types::Value::FALSE),
        IMMEDIATE_TRUE => Ok(microesnext_types::Value::TRUE),
        _ => Err(Error::BadBytecode),
    }
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

#[cfg(test)]
mod tests {
    use microesnext_types::{Error, Value};

    use super::*;

    #[test]
    fn decodes_only_public_language_immediates() {
        for (tag, expected) in [
            (IMMEDIATE_UNDEFINED, Value::UNDEFINED),
            (IMMEDIATE_NULL, Value::NULL),
            (IMMEDIATE_FALSE, Value::FALSE),
            (IMMEDIATE_TRUE, Value::TRUE),
        ] {
            let mut pc = 0;
            assert_eq!(read_immediate(&[tag], &mut pc), Ok(expected));
            assert_eq!(pc, 1);
        }

        let mut pc = 0;
        assert_eq!(read_immediate(&[4], &mut pc), Err(Error::BadBytecode));
    }
}
