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
    #[cfg(feature = "number-operations")]
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
    #[cfg(feature = "control-flow")]
    ToBoolean = 70,
    #[cfg(feature = "function-arguments")]
    CallValueArguments = 71,
    #[cfg(feature = "function-arguments")]
    InitFrame = 72,
    #[cfg(feature = "environments")]
    NewEnvironmentCell = 73,
    #[cfg(feature = "environments")]
    LoadEnvironmentCell = 74,
    #[cfg(feature = "environments")]
    StoreEnvironmentCell = 75,
    #[cfg(feature = "recursive-functions")]
    RecursiveClosure = 76,
    #[cfg(feature = "async-functions")]
    AsyncClosure = 77,
    #[cfg(feature = "recursive-async-functions")]
    RecursiveAsyncClosure = 78,
    #[cfg(feature = "receivers")]
    InitReceiverFrame = 79,
    #[cfg(feature = "receivers")]
    LoadThis = 80,
    #[cfg(feature = "receivers")]
    ReturnReceiverLocals = 81,
    #[cfg(feature = "integer-operations")]
    SubtractI30 = 82,
    #[cfg(feature = "integer-operations")]
    MultiplyI30 = 83,
    #[cfg(feature = "integer-operations")]
    LessThanI30 = 84,
    #[cfg(feature = "integer-operations")]
    GreaterThanI30 = 85,
    #[cfg(feature = "equality")]
    StrictEqual = 86,
    #[cfg(feature = "equality")]
    StrictNotEqual = 87,
    #[cfg(feature = "logical-operations")]
    JumpIfFalsyOrPop = 88,
    #[cfg(feature = "logical-operations")]
    JumpIfTruthyOrPop = 89,
    #[cfg(feature = "number-operations")]
    SubtractNumber = 90,
    #[cfg(feature = "number-operations")]
    MultiplyNumber = 91,
    #[cfg(feature = "number-operations")]
    LessThanNumber = 92,
    #[cfg(feature = "number-operations")]
    GreaterThanNumber = 93,
    #[cfg(feature = "string-operations")]
    ConcatenateStrings = 94,
    #[cfg(feature = "logical-operations")]
    LogicalNot = 95,
    #[cfg(feature = "integer-operations")]
    NegateI30 = 96,
    #[cfg(feature = "number-operations")]
    NegateNumber = 97,
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
            #[cfg(feature = "number-operations")]
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
            #[cfg(feature = "control-flow")]
            70 => Ok(Self::ToBoolean),
            #[cfg(feature = "function-arguments")]
            71 => Ok(Self::CallValueArguments),
            #[cfg(feature = "function-arguments")]
            72 => Ok(Self::InitFrame),
            #[cfg(feature = "environments")]
            73 => Ok(Self::NewEnvironmentCell),
            #[cfg(feature = "environments")]
            74 => Ok(Self::LoadEnvironmentCell),
            #[cfg(feature = "environments")]
            75 => Ok(Self::StoreEnvironmentCell),
            #[cfg(feature = "recursive-functions")]
            76 => Ok(Self::RecursiveClosure),
            #[cfg(feature = "async-functions")]
            77 => Ok(Self::AsyncClosure),
            #[cfg(feature = "recursive-async-functions")]
            78 => Ok(Self::RecursiveAsyncClosure),
            #[cfg(feature = "receivers")]
            79 => Ok(Self::InitReceiverFrame),
            #[cfg(feature = "receivers")]
            80 => Ok(Self::LoadThis),
            #[cfg(feature = "receivers")]
            81 => Ok(Self::ReturnReceiverLocals),
            #[cfg(feature = "integer-operations")]
            82 => Ok(Self::SubtractI30),
            #[cfg(feature = "integer-operations")]
            83 => Ok(Self::MultiplyI30),
            #[cfg(feature = "integer-operations")]
            84 => Ok(Self::LessThanI30),
            #[cfg(feature = "integer-operations")]
            85 => Ok(Self::GreaterThanI30),
            #[cfg(feature = "equality")]
            86 => Ok(Self::StrictEqual),
            #[cfg(feature = "equality")]
            87 => Ok(Self::StrictNotEqual),
            #[cfg(feature = "logical-operations")]
            88 => Ok(Self::JumpIfFalsyOrPop),
            #[cfg(feature = "logical-operations")]
            89 => Ok(Self::JumpIfTruthyOrPop),
            #[cfg(feature = "number-operations")]
            90 => Ok(Self::SubtractNumber),
            #[cfg(feature = "number-operations")]
            91 => Ok(Self::MultiplyNumber),
            #[cfg(feature = "number-operations")]
            92 => Ok(Self::LessThanNumber),
            #[cfg(feature = "number-operations")]
            93 => Ok(Self::GreaterThanNumber),
            #[cfg(feature = "string-operations")]
            94 => Ok(Self::ConcatenateStrings),
            #[cfg(feature = "logical-operations")]
            95 => Ok(Self::LogicalNot),
            #[cfg(feature = "integer-operations")]
            96 => Ok(Self::NegateI30),
            #[cfg(feature = "number-operations")]
            97 => Ok(Self::NegateNumber),
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

    #[cfg(not(feature = "string-operations"))]
    #[test]
    fn omitted_string_operation_opcode_is_invalid_bytecode() {
        assert!(Opcode::try_from(94).is_err());
    }

    #[cfg(feature = "string-operations")]
    #[test]
    fn enabled_string_operation_opcode_is_decodable() {
        assert_eq!(Opcode::try_from(94), Ok(Opcode::ConcatenateStrings));
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
    }

    #[cfg(not(feature = "number-operations"))]
    #[test]
    fn omitted_number_operation_opcodes_are_invalid_bytecode() {
        assert!(Opcode::try_from(22).is_err());
        for opcode in 90..=93 {
            assert!(Opcode::try_from(opcode).is_err());
        }
        assert!(Opcode::try_from(97).is_err());
    }

    #[cfg(feature = "numbers")]
    #[test]
    fn enabled_number_opcodes_are_decodable() {
        assert_eq!(Opcode::try_from(21), Ok(Opcode::ConstF64));
    }

    #[cfg(feature = "number-operations")]
    #[test]
    fn enabled_number_operation_opcodes_are_decodable() {
        assert_eq!(Opcode::try_from(22), Ok(Opcode::AddNumber));
        assert_eq!(Opcode::try_from(90), Ok(Opcode::SubtractNumber));
        assert_eq!(Opcode::try_from(91), Ok(Opcode::MultiplyNumber));
        assert_eq!(Opcode::try_from(92), Ok(Opcode::LessThanNumber));
        assert_eq!(Opcode::try_from(93), Ok(Opcode::GreaterThanNumber));
        assert_eq!(Opcode::try_from(97), Ok(Opcode::NegateNumber));
    }

    #[test]
    fn immediate_opcode_is_part_of_every_build() {
        assert_eq!(Opcode::try_from(23), Ok(Opcode::ConstImmediate));
    }

    #[cfg(feature = "integer-operations")]
    #[test]
    fn enabled_integer_operation_opcodes_are_decodable() {
        assert_eq!(Opcode::try_from(82), Ok(Opcode::SubtractI30));
        assert_eq!(Opcode::try_from(83), Ok(Opcode::MultiplyI30));
        assert_eq!(Opcode::try_from(84), Ok(Opcode::LessThanI30));
        assert_eq!(Opcode::try_from(85), Ok(Opcode::GreaterThanI30));
        assert_eq!(Opcode::try_from(96), Ok(Opcode::NegateI30));
    }

    #[cfg(not(feature = "integer-operations"))]
    #[test]
    fn omitted_integer_operation_opcodes_are_invalid() {
        assert!(Opcode::try_from(82).is_err());
        assert!(Opcode::try_from(83).is_err());
        assert!(Opcode::try_from(84).is_err());
        assert!(Opcode::try_from(85).is_err());
        assert!(Opcode::try_from(96).is_err());
    }

    #[cfg(feature = "equality")]
    #[test]
    fn enabled_equality_opcodes_are_decodable() {
        assert_eq!(Opcode::try_from(86), Ok(Opcode::StrictEqual));
        assert_eq!(Opcode::try_from(87), Ok(Opcode::StrictNotEqual));
    }

    #[cfg(not(feature = "equality"))]
    #[test]
    fn omitted_equality_opcodes_are_invalid() {
        assert!(Opcode::try_from(86).is_err());
        assert!(Opcode::try_from(87).is_err());
    }

    #[cfg(feature = "logical-operations")]
    #[test]
    fn enabled_logical_operation_opcodes_are_decodable() {
        assert_eq!(Opcode::try_from(88), Ok(Opcode::JumpIfFalsyOrPop));
        assert_eq!(Opcode::try_from(89), Ok(Opcode::JumpIfTruthyOrPop));
        assert_eq!(Opcode::try_from(95), Ok(Opcode::LogicalNot));
    }

    #[cfg(not(feature = "logical-operations"))]
    #[test]
    fn omitted_logical_operation_opcodes_are_invalid() {
        assert!(Opcode::try_from(88).is_err());
        assert!(Opcode::try_from(89).is_err());
        assert!(Opcode::try_from(95).is_err());
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
        assert_eq!(Opcode::try_from(70), Ok(Opcode::ToBoolean));
    }

    #[cfg(feature = "function-arguments")]
    #[test]
    fn enabled_argument_frame_opcodes_are_decodable() {
        assert_eq!(Opcode::try_from(71), Ok(Opcode::CallValueArguments));
        assert_eq!(Opcode::try_from(72), Ok(Opcode::InitFrame));
    }

    #[cfg(not(feature = "function-arguments"))]
    #[test]
    fn omitted_argument_frame_opcodes_are_invalid() {
        assert!(Opcode::try_from(71).is_err());
        assert!(Opcode::try_from(72).is_err());
    }

    #[cfg(feature = "environments")]
    #[test]
    fn enabled_environment_cell_opcodes_are_decodable() {
        assert_eq!(Opcode::try_from(73), Ok(Opcode::NewEnvironmentCell));
        assert_eq!(Opcode::try_from(74), Ok(Opcode::LoadEnvironmentCell));
        assert_eq!(Opcode::try_from(75), Ok(Opcode::StoreEnvironmentCell));
    }

    #[cfg(feature = "recursive-functions")]
    #[test]
    fn enabled_recursive_closure_opcode_is_decodable() {
        assert_eq!(Opcode::try_from(76), Ok(Opcode::RecursiveClosure));
    }

    #[cfg(not(feature = "recursive-functions"))]
    #[test]
    fn omitted_recursive_closure_opcode_is_invalid() {
        assert!(Opcode::try_from(76).is_err());
    }

    #[cfg(feature = "async-functions")]
    #[test]
    fn enabled_async_closure_opcode_is_decodable() {
        assert_eq!(Opcode::try_from(77), Ok(Opcode::AsyncClosure));
    }

    #[cfg(not(feature = "async-functions"))]
    #[test]
    fn omitted_async_closure_opcode_is_invalid() {
        assert!(Opcode::try_from(77).is_err());
    }
}
