#![no_std]

extern crate alloc;

use alloc::vec::Vec;
use microesnext_bytecode::Opcode;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct CompileError {
    pub offset: usize,
    pub expected: &'static str,
}

/// An allocation-using construction API kept out of the runtime dependency
/// graph. The source parser will join this crate rather than the VM crate.
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

    pub fn call(mut self, bytecode_offset: u32) -> Self {
        self.code.push(Opcode::Call as u8);
        self.code.extend_from_slice(&bytecode_offset.to_le_bytes());
        self
    }

    pub fn try_at(mut self, catch_offset: u32) -> Self {
        self.code.push(Opcode::Try as u8);
        self.code.extend_from_slice(&catch_offset.to_le_bytes());
        self
    }

    pub fn string(mut self, bytes: &[u8]) -> Self {
        assert!(u16::try_from(bytes.len()).is_ok());
        self.output_string(bytes);
        self
    }

    pub fn object(mut self) -> Self {
        self.code.push(Opcode::NewObject as u8);
        self
    }

    pub fn closure(mut self, bytecode_offset: u32, captures: u16) -> Self {
        self.code.push(Opcode::Closure as u8);
        self.code.extend_from_slice(&bytecode_offset.to_le_bytes());
        self.code.extend_from_slice(&captures.to_le_bytes());
        self
    }

    pub fn load_capture(mut self, index: u16) -> Self {
        self.code.push(Opcode::LoadCapture as u8);
        self.code.extend_from_slice(&index.to_le_bytes());
        self
    }

    fn output_string(&mut self, bytes: &[u8]) {
        self.code.push(Opcode::ConstString as u8);
        self.code
            .extend_from_slice(&(bytes.len() as u16).to_le_bytes());
        self.code.extend_from_slice(bytes);
    }

    pub fn finish(self) -> Vec<u8> {
        self.code
    }
}

/// Compile the first deliberately narrow source slice without constructing an
/// AST or recursing on the native stack. This grows into the production parser
/// while preserving direct bytecode emission.
pub fn compile_script(source: &str) -> Result<Vec<u8>, CompileError> {
    let mut parser = Parser {
        source: source.as_bytes(),
        offset: 0,
        output: Vec::new(),
    };
    parser.whitespace();
    let completion = if parser.try_word(b"return") {
        Opcode::Return
    } else if parser.try_word(b"throw") {
        Opcode::Throw
    } else {
        return Err(parser.error("return or throw"));
    };
    parser.term()?;
    while parser.consume(b'+') {
        parser.term()?;
        parser.output.push(Opcode::AddI30 as u8);
    }
    if parser.consume(b';') {
        parser.whitespace();
    }
    if parser.offset != parser.source.len() {
        return Err(parser.error("end of input"));
    }
    parser.output.push(completion as u8);
    Ok(parser.output)
}

struct Parser<'source> {
    source: &'source [u8],
    offset: usize,
    output: Vec<u8>,
}

impl Parser<'_> {
    fn term(&mut self) -> Result<(), CompileError> {
        self.whitespace();
        let awaiting = self.try_word(b"await");
        self.whitespace();
        if self.consume_raw(b'[') {
            self.output.push(Opcode::NewArray as u8);
            let mut index = 0_i32;
            if !self.consume(b']') {
                loop {
                    self.output.push(Opcode::ConstI30 as u8);
                    self.output.extend_from_slice(&index.to_le_bytes());
                    self.integer()?;
                    self.output.push(Opcode::SetIndex as u8);
                    index = index
                        .checked_add(1)
                        .ok_or_else(|| self.error("an array index"))?;
                    if self.consume(b']') {
                        break;
                    }
                    if !self.consume(b',') {
                        return Err(self.error(", or ]"));
                    }
                }
            }
        } else if self.consume_raw(b'{') {
            self.output.push(Opcode::NewObject as u8);
            if !self.consume(b'}') {
                loop {
                    self.whitespace();
                    let (start, end) = self.identifier()?;
                    if !self.consume(b':') {
                        return Err(self.error(":"));
                    }
                    self.output_string_range(start, end);
                    self.integer()?;
                    self.output.push(Opcode::SetProperty as u8);
                    if self.consume(b'}') {
                        break;
                    }
                    if !self.consume(b',') {
                        return Err(self.error(", or }"));
                    }
                }
            }
        } else {
            self.integer()?;
        }
        while self.consume(b'.') {
            self.whitespace();
            let (start, end) = self.identifier()?;
            self.output_string_range(start, end);
            self.output.push(Opcode::GetProperty as u8);
        }
        if awaiting {
            self.output.push(Opcode::Await as u8);
        }
        Ok(())
    }

    fn integer(&mut self) -> Result<(), CompileError> {
        self.whitespace();
        let start = self.offset;
        let negative = self.consume_raw(b'-');
        let mut value = 0_i32;
        let mut digits = 0;
        while let Some(digit @ b'0'..=b'9') = self.source.get(self.offset).copied() {
            value = value
                .checked_mul(10)
                .and_then(|value| value.checked_add((digit - b'0') as i32))
                .ok_or_else(|| self.error("an i30 integer"))?;
            self.offset += 1;
            digits += 1;
        }
        if digits == 0 {
            self.offset = start;
            return Err(self.error("an integer"));
        }
        if negative {
            value = -value;
        }
        if value < -(1 << 29) || value >= (1 << 29) {
            return Err(self.error("an i30 integer"));
        }
        self.output.push(Opcode::ConstI30 as u8);
        self.output.extend_from_slice(&value.to_le_bytes());
        Ok(())
    }

    fn identifier(&mut self) -> Result<(usize, usize), CompileError> {
        let start = self.offset;
        let Some(first) = self.source.get(self.offset).copied() else {
            return Err(self.error("an identifier"));
        };
        if !first.is_ascii_alphabetic() && first != b'_' && first != b'$' {
            return Err(self.error("an identifier"));
        }
        self.offset += 1;
        while self
            .source
            .get(self.offset)
            .is_some_and(|byte| byte.is_ascii_alphanumeric() || *byte == b'_' || *byte == b'$')
        {
            self.offset += 1;
        }
        Ok((start, self.offset))
    }

    fn output_string_range(&mut self, start: usize, end: usize) {
        let length = end - start;
        debug_assert!(u16::try_from(length).is_ok());
        self.output.push(Opcode::ConstString as u8);
        self.output
            .extend_from_slice(&(length as u16).to_le_bytes());
        self.output.extend_from_slice(&self.source[start..end]);
    }

    fn try_word(&mut self, word: &[u8]) -> bool {
        if !self.source[self.offset..].starts_with(word) {
            return false;
        }
        let end = self.offset + word.len();
        if self
            .source
            .get(end)
            .is_some_and(|byte| byte.is_ascii_alphanumeric() || *byte == b'_')
        {
            return false;
        }
        self.offset = end;
        true
    }

    fn consume(&mut self, byte: u8) -> bool {
        self.whitespace();
        self.consume_raw(byte)
    }

    fn consume_raw(&mut self, byte: u8) -> bool {
        if self.source.get(self.offset) == Some(&byte) {
            self.offset += 1;
            true
        } else {
            false
        }
    }

    fn whitespace(&mut self) {
        while self
            .source
            .get(self.offset)
            .is_some_and(|byte| byte.is_ascii_whitespace())
        {
            self.offset += 1;
        }
    }

    fn error(&self, expected: &'static str) -> CompileError {
        CompileError {
            offset: self.offset,
            expected,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn compiles_directly_to_stack_bytecode() {
        assert_eq!(
            compile_script("return 40 + await 2;").unwrap(),
            Builder::new()
                .const_i30(40)
                .const_i30(2)
                .op(Opcode::Await)
                .op(Opcode::AddI30)
                .op(Opcode::Return)
                .finish()
        );
    }

    #[test]
    fn compiles_throw_as_an_abrupt_completion() {
        assert_eq!(
            compile_script("throw 17;").unwrap(),
            [Opcode::ConstI30 as u8, 17, 0, 0, 0, Opcode::Throw as u8,]
        );
    }

    #[test]
    fn compiles_array_literals_without_an_ast() {
        let code = compile_script("return [7, 9];").unwrap();
        assert_eq!(code[0], Opcode::NewArray as u8);
        assert_eq!(
            code.iter()
                .filter(|opcode| **opcode == Opcode::SetIndex as u8)
                .count(),
            2
        );
        assert_eq!(*code.last().unwrap(), Opcode::Return as u8);
    }

    #[test]
    fn reports_a_source_offset_without_an_ast() {
        assert_eq!(
            compile_script("return 1 + nope").unwrap_err(),
            CompileError {
                offset: 11,
                expected: "an integer",
            }
        );
    }

    #[test]
    fn compiles_an_object_without_recursive_parsing() {
        assert_eq!(
            compile_script("return { answer: 42 }.answer;").unwrap(),
            Builder::new()
                .object()
                .string(b"answer")
                .const_i30(42)
                .op(Opcode::SetProperty)
                .string(b"answer")
                .op(Opcode::GetProperty)
                .op(Opcode::Return)
                .finish()
        );
    }
}
