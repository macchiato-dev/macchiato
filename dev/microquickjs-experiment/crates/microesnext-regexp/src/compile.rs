//! Direct Rust translation of MicroQuickJS's regexp parser and emitter.
//!
//! This first translation unit covers the structural grammar. Character-class
//! and Unicode tables remain deliberately local so the compiler can be omitted
//! completely from an interpreter-only build.

extern crate alloc;

use alloc::vec::Vec;

use crate::{Error, Flags, OpCode};

const INFINITY: usize = 0x3fff_ffff;

struct Parser<'a> {
    source: &'a [u8],
    position: usize,
    flags: Flags,
    captures: u8,
}

fn operation(opcode: OpCode) -> Vec<u8> {
    Vec::from([opcode as u8])
}

fn branch(opcode: OpCode, displacement: i32) -> Vec<u8> {
    let mut code = Vec::with_capacity(5);
    code.push(opcode as u8);
    code.extend_from_slice(&displacement.to_le_bytes());
    code
}

fn literal(character: char) -> Vec<u8> {
    let mut bytes = [0; 4];
    let text = character.encode_utf8(&mut bytes).as_bytes();
    let mut code = Vec::with_capacity(text.len() + 1);
    code.push(OpCode::Char1 as u8 + text.len() as u8 - 1);
    code.extend_from_slice(text);
    code
}

fn concatenate(mut left: Vec<u8>, right: Vec<u8>) -> Vec<u8> {
    let left_width = left.first().copied().and_then(character_width);
    let right_width = right.first().copied().and_then(character_width);
    if let (Some(a), Some(b)) = (left_width, right_width) {
        if a + b <= 4 && left.len() == a + 1 && right.len() == b + 1 {
            left[0] = OpCode::Char1 as u8 + (a + b) as u8 - 1;
            left.extend_from_slice(&right[1..]);
            return left;
        }
    }
    left.extend_from_slice(&right);
    left
}

fn character_width(opcode: u8) -> Option<usize> {
    (opcode >= OpCode::Char1 as u8 && opcode <= OpCode::Char4 as u8)
        .then_some(opcode as usize - OpCode::Char1 as usize + 1)
}

fn alternate(mut left: Vec<u8>, right: Vec<u8>) -> Result<Vec<u8>, Error> {
    let skip_left = i32::try_from(left.len() + 5).map_err(|_| Error::OutOfMemory)?;
    let skip_right = i32::try_from(right.len()).map_err(|_| Error::OutOfMemory)?;
    let mut code = branch(OpCode::SplitNextFirst, skip_left);
    code.append(&mut left);
    code.extend(branch(OpCode::GoTo, skip_right));
    code.extend(right);
    Ok(code)
}

fn repeat(atom: Vec<u8>, minimum: usize, maximum: usize, greedy: bool)
    -> Result<Vec<u8>, Error>
{
    if maximum < minimum { return Err(Error::InvalidPattern); }
    let mut code = Vec::new();
    for _ in 0..minimum {
        code.extend_from_slice(&atom);
    }
    if maximum == minimum { return Ok(code); }
    if maximum == INFINITY {
        if minimum == 0 {
            let exit = i32::try_from(atom.len() + 5).map_err(|_| Error::OutOfMemory)?;
            code.extend(branch(if greedy { OpCode::SplitNextFirst }
                else { OpCode::SplitGoToFirst }, exit));
            code.extend_from_slice(&atom);
            let back = -i32::try_from(atom.len() + 10).map_err(|_| Error::OutOfMemory)?;
            code.extend(branch(OpCode::GoTo, back));
        } else {
            let back = -i32::try_from(atom.len() + 5).map_err(|_| Error::OutOfMemory)?;
            code.extend(branch(if greedy { OpCode::SplitGoToFirst }
                else { OpCode::SplitNextFirst }, back));
        }
        return Ok(code);
    }
    for _ in minimum..maximum {
        let exit = i32::try_from(atom.len()).map_err(|_| Error::OutOfMemory)?;
        code.extend(branch(if greedy { OpCode::SplitNextFirst }
            else { OpCode::SplitGoToFirst }, exit));
        code.extend_from_slice(&atom);
    }
    Ok(code)
}

impl Parser<'_> {
    fn disjunction(&mut self) -> Result<Vec<u8>, Error> {
        let mut code = self.alternative()?;
        while self.take(b'|') {
            code = alternate(code, self.alternative()?)?;
        }
        Ok(code)
    }

    fn alternative(&mut self) -> Result<Vec<u8>, Error> {
        let mut code = Vec::new();
        while !self.done() && self.peek() != Some(b'|') && self.peek() != Some(b')') {
            let atom = self.atom()?;
            let (minimum, maximum, greedy) = self.quantifier()?;
            code = concatenate(code, repeat(atom, minimum, maximum, greedy)?);
        }
        Ok(code)
    }

    fn atom(&mut self) -> Result<Vec<u8>, Error> {
        let byte = self.next().ok_or(Error::InvalidPattern)?;
        match byte {
            b'^' => Ok(operation(if self.flags.contains(Flags::MULTILINE) {
                OpCode::LineStartMultiline
            } else { OpCode::LineStart })),
            b'$' => Ok(operation(if self.flags.contains(Flags::MULTILINE) {
                OpCode::LineEndMultiline
            } else { OpCode::LineEnd })),
            b'.' => Ok(operation(if self.flags.contains(Flags::DOT_ALL) {
                OpCode::Any
            } else { OpCode::Dot })),
            b'[' => self.character_class(),
            b'(' => self.group(),
            b'\\' => self.escape(false),
            b'*' | b'+' | b'?' => Err(Error::InvalidPattern),
            _ if byte < 0x80 => Ok(self.case_literal(byte as char)),
            _ => {
                self.position -= 1;
                let text = core::str::from_utf8(&self.source[self.position..])
                    .map_err(|_| Error::InvalidPattern)?;
                let character = text.chars().next().ok_or(Error::InvalidPattern)?;
                self.position += character.len_utf8();
                Ok(self.case_literal(character))
            }
        }
    }

    fn group(&mut self) -> Result<Vec<u8>, Error> {
        if self.take(b'?') {
            if self.take(b':') {
                let code = self.disjunction()?;
                self.expect(b')')?;
                return Ok(code);
            }
            let negative = if self.take(b'=') { false }
                else if self.take(b'!') { true }
                else { return Err(Error::InvalidPattern) };
            let body = self.disjunction()?;
            self.expect(b')')?;
            let end = i32::try_from(body.len() + 1).map_err(|_| Error::OutOfMemory)?;
            let mut code = branch(if negative { OpCode::NegativeLookahead }
                else { OpCode::Lookahead }, end);
            code.extend(body);
            code.push(if negative { OpCode::NegativeLookaheadMatch }
                else { OpCode::LookaheadMatch } as u8);
            return Ok(code);
        }
        if self.captures == u8::MAX { return Err(Error::InvalidPattern); }
        let capture = self.captures;
        self.captures += 1;
        let mut code = Vec::from([OpCode::SaveStart as u8, capture]);
        code.extend(self.disjunction()?);
        self.expect(b')')?;
        code.extend([OpCode::SaveEnd as u8, capture]);
        Ok(code)
    }

    fn character_class(&mut self) -> Result<Vec<u8>, Error> {
        let invert = self.take(b'^');
        let mut ranges = Vec::<(u32, u32)>::new();
        while !self.take(b']') {
            if self.done() { return Err(Error::InvalidPattern); }
            let first = self.class_character(&mut ranges)?;
            if self.take(b'-') {
                if self.peek() == Some(b']') {
                    if let Some(first) = first { ranges.push((first, first + 1)); }
                    ranges.push((b'-' as u32, b'-' as u32 + 1));
                } else {
                    let second = self.class_character(&mut ranges)?
                        .ok_or(Error::InvalidPattern)?;
                    let first = first.ok_or(Error::InvalidPattern)?;
                    if second < first { return Err(Error::InvalidPattern); }
                    ranges.push((first, second + 1));
                }
            } else if let Some(first) = first {
                ranges.push((first, first + 1));
            }
        }
        if self.flags.contains(Flags::IGNORE_CASE) {
            let original = ranges.clone();
            for (start, end) in original {
                let upper_start = start.max(b'A' as u32);
                let upper_end = end.min(b'Z' as u32 + 1);
                if upper_start < upper_end {
                    ranges.push((upper_start + 32, upper_end + 32));
                }
                let lower_start = start.max(b'a' as u32);
                let lower_end = end.min(b'z' as u32 + 1);
                if lower_start < lower_end {
                    ranges.push((lower_start - 32, lower_end - 32));
                }
            }
        }
        normalize_ranges(&mut ranges, invert);
        emit_ranges(&ranges)
    }

    fn class_character(&mut self, ranges: &mut Vec<(u32, u32)>)
        -> Result<Option<u32>, Error>
    {
        let byte = self.next().ok_or(Error::InvalidPattern)?;
        if byte == b'\\' {
            let escape = self.next().ok_or(Error::InvalidPattern)?;
            if class_escape(escape, ranges) { return Ok(None); }
            return self.escaped_character(escape).map(Some);
        }
        if byte < 0x80 { return Ok(Some(byte as u32)); }
        self.position -= 1;
        let text = core::str::from_utf8(&self.source[self.position..])
            .map_err(|_| Error::InvalidPattern)?;
        let character = text.chars().next().ok_or(Error::InvalidPattern)?;
        self.position += character.len_utf8();
        Ok(Some(character as u32))
    }

    fn escape(&mut self, _: bool) -> Result<Vec<u8>, Error> {
        let escape = self.next().ok_or(Error::InvalidPattern)?;
        match escape {
            b'b' => Ok(operation(OpCode::WordBoundary)),
            b'B' => Ok(operation(OpCode::NotWordBoundary)),
            b'd' | b'D' | b'w' | b'W' => {
                let mut ranges = Vec::new();
                class_escape(escape, &mut ranges);
                normalize_ranges(&mut ranges, escape.is_ascii_uppercase());
                emit_ranges(&ranges)
            }
            b's' => Ok(operation(OpCode::Space)),
            b'S' => Ok(operation(OpCode::NotSpace)),
            b'1'..=b'9' => Ok(Vec::from([if self.flags.contains(Flags::IGNORE_CASE) {
                OpCode::BackReferenceIgnoreCase
            } else { OpCode::BackReference } as u8, escape - b'0'])),
            _ => {
                let character = self.escaped_character(escape)?;
                Ok(self.case_literal(char::from_u32(character).ok_or(Error::InvalidPattern)?))
            }
        }
    }

    fn escaped_character(&mut self, escape: u8) -> Result<u32, Error> {
        Ok(match escape {
            b'n' => b'\n' as u32, b'r' => b'\r' as u32, b't' => b'\t' as u32,
            b'v' => 0x0b, b'f' => 0x0c, b'0' => 0,
            b'x' => self.hex(2)?, b'u' => self.hex(4)?,
            _ => escape as u32,
        })
    }

    fn hex(&mut self, count: usize) -> Result<u32, Error> {
        let mut value = 0u32;
        for _ in 0..count {
            value = value * 16 + char::from(self.next().ok_or(Error::InvalidPattern)?)
                .to_digit(16).ok_or(Error::InvalidPattern)?;
        }
        Ok(value)
    }

    fn quantifier(&mut self) -> Result<(usize, usize, bool), Error> {
        let pair = match self.peek() {
            Some(b'*') => { self.position += 1; (0, INFINITY) }
            Some(b'+') => { self.position += 1; (1, INFINITY) }
            Some(b'?') => { self.position += 1; (0, 1) }
            Some(b'{') => {
                let saved = self.position;
                self.position += 1;
                let Some(minimum) = self.decimal() else { self.position = saved; return Ok((1, 1, true)) };
                let maximum = if self.take(b',') { self.decimal().unwrap_or(INFINITY) }
                    else { minimum };
                self.expect(b'}')?;
                (minimum, maximum)
            }
            _ => return Ok((1, 1, true)),
        };
        Ok((pair.0, pair.1, !self.take(b'?')))
    }

    fn decimal(&mut self) -> Option<usize> {
        let start = self.position;
        let mut value = 0usize;
        while let Some(byte @ b'0'..=b'9') = self.peek() {
            self.position += 1;
            value = value.saturating_mul(10).saturating_add((byte - b'0') as usize);
        }
        (self.position != start).then_some(value.min(INFINITY))
    }

    fn case_literal(&self, character: char) -> Vec<u8> {
        if self.flags.contains(Flags::IGNORE_CASE) && character.is_ascii_alphabetic() {
            let upper = character.to_ascii_uppercase() as u8;
            Vec::from([OpCode::Range8 as u8, 2, upper, upper + 1, upper + 32, upper + 33])
        } else { literal(character) }
    }

    fn expect(&mut self, byte: u8) -> Result<(), Error> {
        self.take(byte).then_some(()).ok_or(Error::InvalidPattern)
    }
    fn take(&mut self, byte: u8) -> bool {
        if self.peek() == Some(byte) { self.position += 1; true } else { false }
    }
    fn next(&mut self) -> Option<u8> { let byte = self.peek()?; self.position += 1; Some(byte) }
    fn peek(&self) -> Option<u8> { self.source.get(self.position).copied() }
    fn done(&self) -> bool { self.position >= self.source.len() }
}

fn class_escape(escape: u8, ranges: &mut Vec<(u32, u32)>) -> bool {
    match escape.to_ascii_lowercase() {
        b'd' => ranges.push((b'0' as u32, b'9' as u32 + 1)),
        b's' => ranges.extend([
            (0x0009, 0x000e), (0x0020, 0x0021), (0x00a0, 0x00a1),
            (0x1680, 0x1681), (0x2000, 0x200b), (0x2028, 0x202a),
            (0x202f, 0x2030), (0x205f, 0x2060), (0x3000, 0x3001),
            (0xfeff, 0xff00),
        ]),
        b'w' => ranges.extend([(b'0' as u32, b'9' as u32 + 1),
            (b'A' as u32, b'Z' as u32 + 1), (b'_' as u32, b'_' as u32 + 1),
            (b'a' as u32, b'z' as u32 + 1)]),
        _ => return false,
    }
    true
}

fn normalize_ranges(ranges: &mut Vec<(u32, u32)>, invert: bool) {
    ranges.sort_unstable();
    let mut merged: Vec<(u32, u32)> = Vec::new();
    for &(start, end) in ranges.iter() {
        if let Some(last) = merged.last_mut().filter(|last| start <= last.1) {
            last.1 = last.1.max(end);
        } else if start < end { merged.push((start, end)); }
    }
    if invert {
        let mut result = Vec::new();
        let mut start = 0;
        for &(low, high) in &merged {
            if start < low { result.push((start, low)); }
            start = high;
        }
        if start < 0x11_0000 { result.push((start, 0x11_0000)); }
        *ranges = result;
    } else { *ranges = merged; }
}

fn emit_ranges(ranges: &[(u32, u32)]) -> Result<Vec<u8>, Error> {
    if ranges.len() < 16 && ranges.last().is_none_or(|range| range.1 <= 0xff) {
        let mut code = Vec::with_capacity(2 + ranges.len() * 2);
        code.extend([OpCode::Range8 as u8, ranges.len() as u8]);
        for &(start, end) in ranges { code.extend([start as u8, end as u8]); }
        return Ok(code);
    }
    let count = u16::try_from(ranges.len()).map_err(|_| Error::InvalidPattern)?;
    let mut code = Vec::with_capacity(3 + ranges.len() * 8);
    code.push(OpCode::Range as u8);
    code.extend_from_slice(&count.to_le_bytes());
    for &(start, end) in ranges {
        code.extend_from_slice(&start.to_le_bytes());
        code.extend_from_slice(&end.to_le_bytes());
    }
    Ok(code)
}

fn parse_flags(flags: &str) -> Result<Flags, Error> {
    let mut result = Flags::default();
    for byte in flags.bytes() {
        let flag = match byte { b'g' => Flags::GLOBAL, b'i' => Flags::IGNORE_CASE,
            b'm' => Flags::MULTILINE, b's' => Flags::DOT_ALL, b'u' => Flags::UNICODE,
            b'y' => Flags::STICKY, _ => return Err(Error::InvalidPattern) };
        if result.contains(flag) { return Err(Error::InvalidPattern); }
        result.0 |= flag.0;
    }
    Ok(result)
}

/// Compile an ECMAScript regexp to MicroQuickJS-compatible bytecode.
pub fn compile(pattern: &str, flags: &str) -> Result<Vec<u8>, Error> {
    let flags = parse_flags(flags)?;
    let mut parser = Parser { source: pattern.as_bytes(), position: 0, flags, captures: 1 };
    let mut body = parser.disjunction()?;
    if !parser.done() { return Err(Error::InvalidPattern); }
    let mut code = Vec::new();
    code.extend_from_slice(&flags.0.to_le_bytes());
    code.extend([parser.captures, 0]);
    if !flags.contains(Flags::STICKY) {
        code.extend(branch(OpCode::SplitGoToFirst, 6));
        code.push(OpCode::Any as u8);
        code.extend(branch(OpCode::GoTo, -11));
    }
    code.extend([OpCode::SaveStart as u8, 0]);
    code.append(&mut body);
    code.extend([OpCode::SaveEnd as u8, 0, OpCode::Match as u8]);
    Ok(code)
}

#[cfg(test)]
mod tests {
    use super::alloc::vec;
    use super::{compile, super::execute, super::Limits};

    fn matches(pattern: &str, flags: &str, input: &str) -> bool {
        let code = compile(pattern, flags).unwrap();
        let mut captures = vec![0; code[2] as usize * 2 + code[3] as usize];
        execute(&code, input.as_bytes(), 0, &mut captures, Limits::default()).unwrap()
    }

    #[test]
    fn compiles_literals_alternation_groups_and_repetition() {
        assert!(matches("^(cat|dog)+$", "", "catdogcat"));
        assert!(!matches("^(cat|dog)+$", "", "catbird"));
        assert!(matches("colou?r", "", "color"));
        assert!(matches("colou?r", "", "colour"));
    }

    #[test]
    fn compiles_classes_and_flags() {
        assert!(matches("^[a-z0-9_]+$", "i", "Macchiato_42"));
        assert!(matches("^@keyframes\\s+$", "i", "@keyframes "));
        assert!(matches("^[a-z_]+$", "i", "cm"));
        assert!(matches("^[a-z0-9_-]+$", "i", "cm-blink"));
        assert!(matches("^[^\\s]+$", "", "cm-scroller"));
        assert!(!matches("^[^\\s]+$", "", "cm scroller"));
        assert!(matches(
            "^@keyframes\\s+([a-z_][a-z0-9_-]*)$",
            "i",
            "@keyframes cm-blink",
        ));
        assert!(matches("^.$", "s", "\n"));
        assert!(compile("x", "gg").is_err());
    }
}
