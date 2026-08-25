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
    parser.word(b"return")?;
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
    parser.output.push(Opcode::Return as u8);
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
        if awaiting {
            self.output.push(Opcode::Await as u8);
        }
        Ok(())
    }

    fn word(&mut self, word: &[u8]) -> Result<(), CompileError> {
        self.whitespace();
        if self.try_word(word) {
            Ok(())
        } else {
            Err(self.error("return"))
        }
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
    fn reports_a_source_offset_without_an_ast() {
        assert_eq!(
            compile_script("return 1 + nope").unwrap_err(),
            CompileError {
                offset: 11,
                expected: "an integer",
            }
        );
    }
}
