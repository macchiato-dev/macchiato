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

    pub fn const_f64(mut self, value: f64) -> Self {
        self.code.push(Opcode::ConstF64 as u8);
        self.code.extend_from_slice(&value.to_bits().to_le_bytes());
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

    pub fn atom(mut self, bytes: &[u8]) -> Self {
        assert!(u16::try_from(bytes.len()).is_ok());
        self.output_atom(bytes);
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

    fn output_atom(&mut self, bytes: &[u8]) {
        self.code.push(Opcode::ConstAtom as u8);
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
    if parser.try_word(b"try") {
        parser.try_catch()?;
    } else {
        parser.completion(None, false, false)?;
    }
    if parser.offset != parser.source.len() {
        return Err(parser.error("end of input"));
    }
    Ok(parser.output)
}

struct Parser<'source> {
    source: &'source [u8],
    offset: usize,
    output: Vec<u8>,
}

#[derive(Clone, Copy, Eq, PartialEq)]
enum TermKind {
    I30,
    General,
}

impl Parser<'_> {
    fn try_catch(&mut self) -> Result<(), CompileError> {
        if !self.consume(b'{') {
            return Err(self.error("{"));
        }
        let catch_patch = self.output.len() + 1;
        self.output.push(Opcode::Try as u8);
        self.output.extend_from_slice(&0_u32.to_le_bytes());
        self.completion(None, true, false)?;
        if !self.consume(b'}') || !self.try_word_after_whitespace(b"catch") {
            return Err(self.error("} catch"));
        }
        let binding = if self.consume(b'(') {
            self.whitespace();
            let binding = self.identifier()?;
            if !self.consume(b')') {
                return Err(self.error(")"));
            }
            Some(binding)
        } else {
            None
        };
        if !self.consume(b'{') {
            return Err(self.error("{"));
        }
        let catch_offset = u32::try_from(self.output.len())
            .map_err(|_| self.error("bytecode smaller than 4 GiB"))?;
        self.output[catch_patch..catch_patch + 4].copy_from_slice(&catch_offset.to_le_bytes());
        self.completion(binding, false, true)?;
        if !self.consume(b'}') {
            return Err(self.error("}"));
        }
        self.whitespace();
        Ok(())
    }

    fn completion(
        &mut self,
        binding: Option<(usize, usize)>,
        close_handler: bool,
        pending_exception: bool,
    ) -> Result<(), CompileError> {
        self.whitespace();
        let completion = if self.try_word(b"return") {
            Opcode::Return
        } else if self.try_word(b"throw") {
            Opcode::Throw
        } else {
            return Err(self.error("return or throw"));
        };
        let expression_start = self.output.len();
        let used_binding = self.expression(binding)?;
        if pending_exception && !used_binding {
            self.output.insert(expression_start, Opcode::Drop as u8);
        }
        if self.consume(b';') {
            self.whitespace();
        }
        if close_handler && completion == Opcode::Return {
            self.output.push(Opcode::EndTry as u8);
        }
        self.output.push(completion as u8);
        Ok(())
    }

    fn expression(&mut self, binding: Option<(usize, usize)>) -> Result<bool, CompileError> {
        let (used_binding, mut kind) = self.term(binding)?;
        while self.consume(b'+') {
            let (_, right) = self.term(None)?;
            self.output
                .push(if kind == TermKind::I30 && right == TermKind::I30 {
                    Opcode::AddI30 as u8
                } else {
                    Opcode::AddNumber as u8
                });
            kind = TermKind::General;
        }
        Ok(used_binding)
    }

    fn term(&mut self, binding: Option<(usize, usize)>) -> Result<(bool, TermKind), CompileError> {
        self.whitespace();
        let awaiting = self.try_word(b"await");
        self.whitespace();
        let binding = binding.filter(|(start, end)| {
            self.source[self.offset..].starts_with(&self.source[*start..*end])
                && self.identifier_end(self.offset + end - start)
        });
        let (used_binding, mut kind) = if let Some((start, end)) = binding {
            self.offset += end - start;
            (true, TermKind::General)
        } else if self.consume_raw(b'[') {
            self.output.push(Opcode::NewArray as u8);
            let mut index = 0_i32;
            if !self.consume(b']') {
                loop {
                    self.output.push(Opcode::ConstI30 as u8);
                    self.output.extend_from_slice(&index.to_le_bytes());
                    self.number()?;
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
            (false, TermKind::General)
        } else if self.consume_raw(b'{') {
            self.output.push(Opcode::NewObject as u8);
            if !self.consume(b'}') {
                loop {
                    self.whitespace();
                    let (start, end) = self.identifier()?;
                    if !self.consume(b':') {
                        return Err(self.error(":"));
                    }
                    self.output_atom_range(start, end);
                    self.number()?;
                    self.output.push(Opcode::SetProperty as u8);
                    if self.consume(b'}') {
                        break;
                    }
                    if !self.consume(b',') {
                        return Err(self.error(", or }"));
                    }
                }
            }
            (false, TermKind::General)
        } else {
            let immediate = self.number()?;
            (
                false,
                if immediate {
                    TermKind::I30
                } else {
                    TermKind::General
                },
            )
        };
        while self.consume(b'.') {
            self.whitespace();
            let (start, end) = self.identifier()?;
            self.output_atom_range(start, end);
            self.output.push(Opcode::GetProperty as u8);
            kind = TermKind::General;
        }
        if awaiting {
            self.output.push(Opcode::Await as u8);
        }
        Ok((used_binding, kind))
    }

    fn identifier_end(&self, offset: usize) -> bool {
        !self
            .source
            .get(offset)
            .is_some_and(|byte| byte.is_ascii_alphanumeric() || *byte == b'_' || *byte == b'$')
    }

    fn number(&mut self) -> Result<bool, CompileError> {
        self.whitespace();
        let start = self.offset;
        self.consume_raw(b'-');
        let mut digits = 0_usize;
        while self.source.get(self.offset).is_some_and(u8::is_ascii_digit) {
            self.offset += 1;
            digits += 1;
        }
        let mut fractional = false;
        if self.consume_raw(b'.') {
            fractional = true;
            while self.source.get(self.offset).is_some_and(u8::is_ascii_digit) {
                self.offset += 1;
                digits += 1;
            }
        }
        if digits == 0 {
            self.offset = start;
            return Err(self.error("a number"));
        }
        if matches!(self.source.get(self.offset), Some(b'e' | b'E')) {
            fractional = true;
            self.offset += 1;
            if matches!(self.source.get(self.offset), Some(b'+' | b'-')) {
                self.offset += 1;
            }
            let exponent = self.offset;
            while self.source.get(self.offset).is_some_and(u8::is_ascii_digit) {
                self.offset += 1;
            }
            if self.offset == exponent {
                return Err(self.error("an exponent"));
            }
        }
        let source = core::str::from_utf8(&self.source[start..self.offset])
            .map_err(|_| self.error("a number"))?;
        if !fractional {
            if let Ok(value) = source.parse::<i32>() {
                if (-(1 << 29)..(1 << 29)).contains(&value) {
                    self.output.push(Opcode::ConstI30 as u8);
                    self.output.extend_from_slice(&value.to_le_bytes());
                    return Ok(true);
                }
            }
        }
        let value = source.parse::<f64>().map_err(|_| self.error("a number"))?;
        self.output.push(Opcode::ConstF64 as u8);
        self.output
            .extend_from_slice(&value.to_bits().to_le_bytes());
        Ok(false)
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

    fn output_atom_range(&mut self, start: usize, end: usize) {
        let length = end - start;
        debug_assert!(u16::try_from(length).is_ok());
        self.output.push(Opcode::ConstAtom as u8);
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

    fn try_word_after_whitespace(&mut self, word: &[u8]) -> bool {
        self.whitespace();
        self.try_word(word)
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
    fn backpatches_a_directly_emitted_catch_target() {
        let code = compile_script("try { throw 17; } catch (error) { return error; }").unwrap();
        assert_eq!(code[0], Opcode::Try as u8);
        let target = u32::from_le_bytes(code[1..5].try_into().unwrap()) as usize;
        assert_eq!(code[target], Opcode::Return as u8);
        assert_eq!(*code.last().unwrap(), Opcode::Return as u8);
    }

    #[test]
    fn closes_a_handler_before_a_normal_return() {
        let code = compile_script("try { return await 2; } catch { return 17; }").unwrap();
        assert!(
            code.windows(2)
                .any(|ops| ops == [Opcode::EndTry as u8, Opcode::Return as u8])
        );
        let target = u32::from_le_bytes(code[1..5].try_into().unwrap()) as usize;
        assert_eq!(code[target], Opcode::Drop as u8);
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
                expected: "a number",
            }
        );
    }

    #[test]
    fn preserves_fast_integer_addition_and_promotes_fractional_addition() {
        let integer = compile_script("return 1 + 2;").unwrap();
        assert!(integer.contains(&(Opcode::AddI30 as u8)));
        assert!(!integer.contains(&(Opcode::AddNumber as u8)));

        let fractional = compile_script("return 1.25 + 2;").unwrap();
        assert!(fractional.contains(&(Opcode::ConstF64 as u8)));
        assert!(fractional.contains(&(Opcode::AddNumber as u8)));

        let exponent = compile_script("return .5e2;").unwrap();
        assert!(exponent.contains(&(Opcode::ConstF64 as u8)));
    }

    #[test]
    fn compiles_an_object_without_recursive_parsing() {
        assert_eq!(
            compile_script("return { answer: 42 }.answer;").unwrap(),
            Builder::new()
                .object()
                .atom(b"answer")
                .const_i30(42)
                .op(Opcode::SetProperty)
                .atom(b"answer")
                .op(Opcode::GetProperty)
                .op(Opcode::Return)
                .finish()
        );
    }
}
