#![no_std]

use microesnext_types::Error;

pub use microesnext_bytecode_core::{read_byte, read_bytes, read_i30, read_u16, read_u32};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u8)]
pub enum Immediate {
    Undefined = microesnext_bytecode_core::IMMEDIATE_UNDEFINED,
    Null = microesnext_bytecode_core::IMMEDIATE_NULL,
    False = microesnext_bytecode_core::IMMEDIATE_FALSE,
    True = microesnext_bytecode_core::IMMEDIATE_TRUE,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u8)]
pub enum Opcode {
    ConstI30 = 1,
    AddI30 = 2,
    #[cfg(feature = "async")]
    Await = 3,
    Return = 4,
    Call = 5,
    #[cfg(feature = "strings")]
    ConstString = 6,
    #[cfg(feature = "objects")]
    NewObject = 7,
    #[cfg(feature = "objects")]
    GetProperty = 8,
    #[cfg(feature = "objects")]
    SetProperty = 9,
    #[cfg(feature = "functions")]
    Closure = 10,
    #[cfg(feature = "functions")]
    CallValue = 11,
    #[cfg(feature = "functions")]
    LoadCapture = 12,
    Throw = 13,
    #[cfg(feature = "arrays")]
    NewArray = 14,
    #[cfg(feature = "arrays")]
    GetIndex = 15,
    #[cfg(feature = "arrays")]
    SetIndex = 16,
    #[cfg(feature = "exceptions")]
    Try = 17,
    #[cfg(feature = "exceptions")]
    EndTry = 18,
    #[cfg(feature = "exceptions")]
    Drop = 19,
    #[cfg(feature = "atoms")]
    ConstAtom = 20,
    #[cfg(feature = "numbers")]
    ConstF64 = 21,
    #[cfg(feature = "numbers")]
    AddNumber = 22,
    ConstImmediate = 23,
    #[cfg(feature = "locals")]
    InitLocals = 64,
    #[cfg(feature = "locals")]
    LoadLocal = 65,
    #[cfg(feature = "locals")]
    StoreLocal = 66,
    #[cfg(feature = "locals")]
    ReturnLocals = 67,
    #[cfg(feature = "control-flow")]
    Jump = 68,
    #[cfg(feature = "control-flow")]
    JumpIfFalseBoolean = 69,
}

impl TryFrom<u8> for Opcode {
    type Error = Error;

    fn try_from(value: u8) -> Result<Self, Self::Error> {
        match value {
            1 => Ok(Self::ConstI30),
            2 => Ok(Self::AddI30),
            #[cfg(feature = "async")]
            3 => Ok(Self::Await),
            4 => Ok(Self::Return),
            5 => Ok(Self::Call),
            #[cfg(feature = "strings")]
            6 => Ok(Self::ConstString),
            #[cfg(feature = "objects")]
            7 => Ok(Self::NewObject),
            #[cfg(feature = "objects")]
            8 => Ok(Self::GetProperty),
            #[cfg(feature = "objects")]
            9 => Ok(Self::SetProperty),
            #[cfg(feature = "functions")]
            10 => Ok(Self::Closure),
            #[cfg(feature = "functions")]
            11 => Ok(Self::CallValue),
            #[cfg(feature = "functions")]
            12 => Ok(Self::LoadCapture),
            13 => Ok(Self::Throw),
            #[cfg(feature = "arrays")]
            14 => Ok(Self::NewArray),
            #[cfg(feature = "arrays")]
            15 => Ok(Self::GetIndex),
            #[cfg(feature = "arrays")]
            16 => Ok(Self::SetIndex),
            #[cfg(feature = "exceptions")]
            17 => Ok(Self::Try),
            #[cfg(feature = "exceptions")]
            18 => Ok(Self::EndTry),
            #[cfg(feature = "exceptions")]
            19 => Ok(Self::Drop),
            #[cfg(feature = "atoms")]
            20 => Ok(Self::ConstAtom),
            #[cfg(feature = "numbers")]
            21 => Ok(Self::ConstF64),
            #[cfg(feature = "numbers")]
            22 => Ok(Self::AddNumber),
            23 => Ok(Self::ConstImmediate),
            #[cfg(feature = "locals")]
            64 => Ok(Self::InitLocals),
            #[cfg(feature = "locals")]
            65 => Ok(Self::LoadLocal),
            #[cfg(feature = "locals")]
            66 => Ok(Self::StoreLocal),
            #[cfg(feature = "locals")]
            67 => Ok(Self::ReturnLocals),
            #[cfg(feature = "control-flow")]
            68 => Ok(Self::Jump),
            #[cfg(feature = "control-flow")]
            69 => Ok(Self::JumpIfFalseBoolean),
            _ => Err(Error::BadBytecode),
        }
    }
}

#[inline(always)]
pub fn read_opcode(code: &[u8], pc: &mut usize) -> Result<Opcode, Error> {
    Opcode::try_from(read_byte(code, pc)?)
}

#[cfg(test)]
mod tests {
    use super::Opcode;

    #[cfg(not(feature = "strings"))]
    #[test]
    fn omitted_string_opcode_is_invalid_bytecode() {
        assert!(Opcode::try_from(6).is_err());
    }

    #[cfg(feature = "strings")]
    #[test]
    fn enabled_string_opcode_is_decodable() {
        assert_eq!(Opcode::try_from(6), Ok(Opcode::ConstString));
    }

    #[cfg(not(feature = "atoms"))]
    #[test]
    fn omitted_atom_opcode_is_invalid_bytecode() {
        assert!(Opcode::try_from(20).is_err());
    }

    #[cfg(feature = "atoms")]
    #[test]
    fn enabled_atom_opcode_is_decodable() {
        assert_eq!(Opcode::try_from(20), Ok(Opcode::ConstAtom));
    }

    #[cfg(not(feature = "numbers"))]
    #[test]
    fn omitted_number_opcodes_are_invalid_bytecode() {
        assert!(Opcode::try_from(21).is_err());
        assert!(Opcode::try_from(22).is_err());
    }

    #[cfg(feature = "numbers")]
    #[test]
    fn enabled_number_opcodes_are_decodable() {
        assert_eq!(Opcode::try_from(21), Ok(Opcode::ConstF64));
        assert_eq!(Opcode::try_from(22), Ok(Opcode::AddNumber));
    }

    #[test]
    fn immediate_opcode_is_part_of_every_build() {
        assert_eq!(Opcode::try_from(23), Ok(Opcode::ConstImmediate));
    }

    #[cfg(feature = "locals")]
    #[test]
    fn enabled_local_opcodes_are_decodable() {
        assert_eq!(Opcode::try_from(64), Ok(Opcode::InitLocals));
        assert_eq!(Opcode::try_from(65), Ok(Opcode::LoadLocal));
        assert_eq!(Opcode::try_from(66), Ok(Opcode::StoreLocal));
        assert_eq!(Opcode::try_from(67), Ok(Opcode::ReturnLocals));
    }

    #[cfg(feature = "control-flow")]
    #[test]
    fn enabled_control_flow_opcodes_are_decodable() {
        assert_eq!(Opcode::try_from(68), Ok(Opcode::Jump));
        assert_eq!(Opcode::try_from(69), Ok(Opcode::JumpIfFalseBoolean));
    }
}
