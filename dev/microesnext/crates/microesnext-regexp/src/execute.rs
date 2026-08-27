//! Direct translation of MicroQuickJS's regexp bytecode interpreter.

extern crate alloc;

use alloc::vec::Vec;

use crate::{Error, HEADER_CAPTURE_COUNT, HEADER_LEN, OpCode};

const UNSET: u32 = u32::MAX;

#[derive(Clone, Copy, Debug)]
pub struct Limits {
    pub steps: usize,
    pub states: usize,
}

impl Default for Limits {
    fn default() -> Self {
        Self { steps: 1_000_000, states: 65_536 }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum StateKind {
    Split,
    Lookahead,
    NegativeLookahead,
}

#[derive(Clone)]
struct State {
    kind: StateKind,
    pc: usize,
    position: usize,
    captures: Vec<u32>,
}

fn u16_at(bytes: &[u8], at: usize) -> Result<u16, Error> {
    let value = bytes.get(at..at + 2).ok_or(Error::InvalidBytecode)?;
    Ok(u16::from_le_bytes([value[0], value[1]]))
}

fn u32_at(bytes: &[u8], at: usize) -> Result<u32, Error> {
    let value = bytes.get(at..at + 4).ok_or(Error::InvalidBytecode)?;
    Ok(u32::from_le_bytes([value[0], value[1], value[2], value[3]]))
}

fn target(base: usize, displacement: u32, length: usize) -> Result<usize, Error> {
    let target = (base as isize)
        .checked_add(displacement as i32 as isize)
        .ok_or(Error::InvalidBytecode)?;
    usize::try_from(target).ok().filter(|value| *value < length)
        .ok_or(Error::InvalidBytecode)
}

fn decode(bytes: &[u8], at: usize) -> Result<(u32, usize), Error> {
    let first = *bytes.get(at).ok_or(Error::InvalidBytecode)?;
    if first < 0x80 {
        return Ok((u32::from(first), at + 1));
    }
    let width = if first < 0xe0 { 2 } else if first < 0xf0 { 3 } else { 4 };
    let value = bytes.get(at..at + width).ok_or(Error::InvalidBytecode)?;
    let text = core::str::from_utf8(value).map_err(|_| Error::InvalidBytecode)?;
    let character = text.chars().next().ok_or(Error::InvalidBytecode)?;
    Ok((character as u32, at + width))
}

fn previous(bytes: &[u8], at: usize) -> Result<u32, Error> {
    let mut start = at.checked_sub(1).ok_or(Error::InvalidBytecode)?;
    while bytes[start] & 0xc0 == 0x80 {
        start = start.checked_sub(1).ok_or(Error::InvalidBytecode)?;
    }
    decode(bytes, start).map(|value| value.0)
}

const fn line_terminator(character: u32) -> bool {
    matches!(character, 0x0a | 0x0d | 0x2028 | 0x2029)
}

const fn word_character(character: u32) -> bool {
    character >= b'0' as u32 && character <= b'9' as u32
        || character >= b'a' as u32 && character <= b'z' as u32
        || character >= b'A' as u32 && character <= b'Z' as u32
        || character == b'_' as u32
}

const fn canonical(character: u32) -> u32 {
    if character >= b'A' as u32 && character <= b'Z' as u32 {
        character - b'A' as u32 + b'a' as u32
    } else {
        character
    }
}

fn opcode(value: u8) -> Result<OpCode, Error> {
    if value <= OpCode::CheckAdvance as u8 {
        // SAFETY: OpCode is repr(u8), contiguous, and the bound is checked.
        Ok(unsafe { core::mem::transmute::<u8, OpCode>(value) })
    } else {
        Err(Error::InvalidBytecode)
    }
}

fn push_state(
    states: &mut Vec<State>, limits: Limits, kind: StateKind, pc: usize,
    position: usize, captures: &[u32],
) -> Result<(), Error> {
    if states.len() >= limits.states { return Err(Error::StackOverflow); }
    states.try_reserve(1).map_err(|_| Error::OutOfMemory)?;
    states.push(State { kind, pc, position, captures: captures.to_vec() });
    Ok(())
}

/// Execute MicroQuickJS regexp bytecode against UTF-8 input.
///
/// Capture offsets use byte positions, matching the embedded engine. The
/// caller supplies capture/register storage and controls execution limits.
pub fn execute(
    bytecode: &[u8], input: &[u8], start: usize, captures: &mut [u32], limits: Limits,
) -> Result<bool, Error> {
    if bytecode.len() < HEADER_LEN || start > input.len() {
        return Err(Error::InvalidBytecode);
    }
    let capture_count = bytecode[HEADER_CAPTURE_COUNT] as usize;
    if captures.len() < capture_count * 2 { return Err(Error::InvalidBytecode); }
    captures.fill(UNSET);

    let mut pc = HEADER_LEN;
    let mut position = start;
    let mut states: Vec<State> = Vec::new();
    let mut steps = 0usize;

    macro_rules! fail {
        () => {{
            let mut resumed = false;
            while let Some(state) = states.pop() {
                captures.copy_from_slice(&state.captures);
                pc = state.pc;
                position = state.position;
                match state.kind {
                    StateKind::Split => { resumed = true; break; }
                    StateKind::Lookahead => continue,
                    StateKind::NegativeLookahead => { resumed = true; break; }
                }
            }
            if !resumed { return Ok(false); }
            continue;
        }};
    }

    loop {
        steps = steps.checked_add(1).ok_or(Error::Timeout)?;
        if steps > limits.steps { return Err(Error::Timeout); }
        let operation = opcode(*bytecode.get(pc).ok_or(Error::InvalidBytecode)?)?;
        pc += 1;
        match operation {
            OpCode::Match => return Ok(true),
            OpCode::LookaheadMatch => {
                let Some(index) = states.iter().rposition(|state| state.kind == StateKind::Lookahead)
                    else { return Err(Error::InvalidBytecode) };
                let state = states[index].clone();
                states.truncate(index);
                pc = state.pc;
                position = state.position;
            }
            OpCode::NegativeLookaheadMatch => {
                let Some(index) = states.iter().rposition(|state| {
                    state.kind == StateKind::NegativeLookahead
                }) else { return Err(Error::InvalidBytecode) };
                let state = states[index].clone();
                states.truncate(index);
                captures.copy_from_slice(&state.captures);
                fail!();
            }
            OpCode::Char1 | OpCode::Char2 | OpCode::Char3 | OpCode::Char4 => {
                let width = operation as usize - OpCode::Char1 as usize + 1;
                let expected = bytecode.get(pc..pc + width).ok_or(Error::InvalidBytecode)?;
                let actual = input.get(position..position + width);
                if actual != Some(expected) { fail!(); }
                pc += width;
                position += width;
            }
            OpCode::Dot | OpCode::Any => {
                if position >= input.len() { fail!(); }
                let (character, next) = decode(input, position)?;
                if operation == OpCode::Dot && line_terminator(character) { fail!(); }
                position = next;
            }
            OpCode::Space | OpCode::NotSpace => {
                if position >= input.len() { fail!(); }
                let (character, next) = decode(input, position)?;
                let whitespace = char::from_u32(character).is_some_and(char::is_whitespace);
                if whitespace != (operation == OpCode::Space) { fail!(); }
                position = next;
            }
            OpCode::LineStart | OpCode::LineStartMultiline => {
                if position != 0 && (operation == OpCode::LineStart
                    || !line_terminator(previous(input, position)?)) { fail!(); }
            }
            OpCode::LineEnd | OpCode::LineEndMultiline => {
                if position != input.len() {
                    let current = decode(input, position)?.0;
                    if operation == OpCode::LineEnd || !line_terminator(current) { fail!(); }
                }
            }
            OpCode::GoTo => {
                let displacement = u32_at(bytecode, pc)?;
                pc = target(pc + 4, displacement, bytecode.len())?;
            }
            OpCode::SplitGoToFirst | OpCode::SplitNextFirst => {
                let displacement = u32_at(bytecode, pc)?;
                let next = pc + 4;
                let branch = target(next, displacement, bytecode.len())?;
                let (resume, chosen) = if operation == OpCode::SplitNextFirst {
                    (branch, next)
                } else {
                    (next, branch)
                };
                push_state(&mut states, limits, StateKind::Split, resume, position, captures)?;
                pc = chosen;
            }
            OpCode::Lookahead | OpCode::NegativeLookahead => {
                let displacement = u32_at(bytecode, pc)?;
                let next = pc + 4;
                let continuation = target(next, displacement, bytecode.len())?;
                let kind = if operation == OpCode::Lookahead {
                    StateKind::Lookahead
                } else {
                    StateKind::NegativeLookahead
                };
                push_state(&mut states, limits, kind, continuation, position, captures)?;
                pc = next;
            }
            OpCode::SaveStart | OpCode::SaveEnd => {
                let capture = *bytecode.get(pc).ok_or(Error::InvalidBytecode)? as usize;
                pc += 1;
                let side = usize::from(operation == OpCode::SaveEnd);
                let slot = capture.checked_mul(2).and_then(|value| value.checked_add(side))
                    .filter(|value| *value < captures.len()).ok_or(Error::InvalidBytecode)?;
                captures[slot] = u32::try_from(position).map_err(|_| Error::OutOfMemory)?;
            }
            OpCode::SaveReset => {
                let first = *bytecode.get(pc).ok_or(Error::InvalidBytecode)? as usize;
                let last = *bytecode.get(pc + 1).ok_or(Error::InvalidBytecode)? as usize;
                pc += 2;
                if first > last || last >= capture_count { return Err(Error::InvalidBytecode); }
                captures[first * 2..=last * 2 + 1].fill(UNSET);
            }
            OpCode::SetI32 => {
                let register = *bytecode.get(pc).ok_or(Error::InvalidBytecode)? as usize;
                let value = u32_at(bytecode, pc + 1)?;
                pc += 5;
                *captures.get_mut(capture_count * 2 + register)
                    .ok_or(Error::InvalidBytecode)? = value;
            }
            OpCode::SetCharPosition | OpCode::CheckAdvance => {
                let register = *bytecode.get(pc).ok_or(Error::InvalidBytecode)? as usize;
                pc += 1;
                let slot = captures.get_mut(capture_count * 2 + register)
                    .ok_or(Error::InvalidBytecode)?;
                if operation == OpCode::CheckAdvance && *slot == position as u32 { fail!(); }
                if operation == OpCode::SetCharPosition { *slot = position as u32; }
            }
            OpCode::WordBoundary | OpCode::NotWordBoundary => {
                let before = position > 0 && word_character(previous(input, position)?);
                let after = position < input.len() && word_character(decode(input, position)?.0);
                let boundary = before != after;
                if boundary != (operation == OpCode::WordBoundary) { fail!(); }
            }
            OpCode::BackReference | OpCode::BackReferenceIgnoreCase => {
                let capture = *bytecode.get(pc).ok_or(Error::InvalidBytecode)? as usize;
                pc += 1;
                let begin = *captures.get(capture * 2).ok_or(Error::InvalidBytecode)?;
                let end = *captures.get(capture * 2 + 1).ok_or(Error::InvalidBytecode)?;
                if begin != UNSET && end != UNSET {
                    let mut source = begin as usize;
                    while source < end as usize {
                        if position >= input.len() { fail!(); }
                        let (mut left, next_source) = decode(input, source)?;
                        let (mut right, next_position) = decode(input, position)?;
                        if operation == OpCode::BackReferenceIgnoreCase {
                            left = canonical(left); right = canonical(right);
                        }
                        if left != right { fail!(); }
                        source = next_source; position = next_position;
                    }
                }
            }
            OpCode::Range8 => {
                let count = *bytecode.get(pc).ok_or(Error::InvalidBytecode)? as usize;
                pc += 1;
                let ranges = bytecode.get(pc..pc + count * 2).ok_or(Error::InvalidBytecode)?;
                if position >= input.len() || count == 0 { fail!(); }
                let (character, next) = decode(input, position)?;
                let found = ranges.chunks_exact(2).any(|range| {
                    character >= range[0] as u32
                        && (character < range[1] as u32 || range[1] == 0xff)
                });
                if !found { fail!(); }
                pc += count * 2; position = next;
            }
            OpCode::Range => {
                let count = u16_at(bytecode, pc)? as usize;
                pc += 2;
                let ranges = bytecode.get(pc..pc + count * 8).ok_or(Error::InvalidBytecode)?;
                if position >= input.len() || count == 0 { fail!(); }
                let (character, next) = decode(input, position)?;
                let found = (0..count).any(|index| {
                    let low = u32_at(ranges, index * 8).unwrap_or(1);
                    let high = u32_at(ranges, index * 8 + 4).unwrap_or(0);
                    character >= low && character < high
                });
                if !found { fail!(); }
                pc += count * 8; position = next;
            }
            OpCode::Loop | OpCode::LoopSplitGoToFirst | OpCode::LoopSplitNextFirst
            | OpCode::LoopCheckAdvanceSplitGoToFirst
            | OpCode::LoopCheckAdvanceSplitNextFirst => {
                let register = *bytecode.get(pc).ok_or(Error::InvalidBytecode)? as usize;
                let slot = capture_count * 2 + register;
                let value = captures.get_mut(slot).ok_or(Error::InvalidBytecode)?;
                *value = value.wrapping_sub(1);
                if operation == OpCode::Loop {
                    let displacement = u32_at(bytecode, pc + 1)?;
                    pc += 5;
                    if *value != 0 { pc = target(pc, displacement, bytecode.len())?; }
                } else {
                    let limit = u32_at(bytecode, pc + 1)?;
                    let displacement = u32_at(bytecode, pc + 5)?;
                    pc += 9;
                    if *value > limit {
                        pc = target(pc, displacement, bytecode.len())?;
                    } else if *value != 0 {
                        let branch = target(pc, displacement, bytecode.len())?;
                        let next_first = matches!(operation, OpCode::LoopSplitNextFirst
                            | OpCode::LoopCheckAdvanceSplitNextFirst);
                        let (resume, chosen) = if next_first { (branch, pc) } else { (pc, branch) };
                        push_state(&mut states, limits, StateKind::Split,
                            resume, position, captures)?;
                        pc = chosen;
                    }
                }
            }
            OpCode::Invalid => return Err(Error::InvalidBytecode),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::alloc::{vec, vec::Vec};

    use super::{execute, Limits};
    use crate::{HEADER_LEN, OpCode};

    fn program(body: &[u8]) -> Vec<u8> {
        let mut result = vec![0, 0, 1, 0];
        result.extend_from_slice(body);
        result
    }

    #[test]
    fn executes_literal_and_capture_bytecode() {
        let code = program(&[
            OpCode::SaveStart as u8, 0,
            OpCode::Char3 as u8, b'c', b'a', b't',
            OpCode::SaveEnd as u8, 0,
            OpCode::Match as u8,
        ]);
        let mut captures = [0; 2];
        assert!(execute(&code, b"cat", 0, &mut captures, Limits::default()).unwrap());
        assert_eq!(captures, [0, 3]);
        assert_eq!(HEADER_LEN, 4);
    }

    #[test]
    fn backtracks_to_the_second_split_branch() {
        let mut body = vec![OpCode::SplitNextFirst as u8];
        body.extend_from_slice(&(3_u32).to_le_bytes());
        body.extend_from_slice(&[OpCode::Char1 as u8, b'a', OpCode::Match as u8]);
        body.extend_from_slice(&[OpCode::Char1 as u8, b'b', OpCode::Match as u8]);
        let code = program(&body);
        let mut captures = [0; 2];
        assert!(execute(&code, b"b", 0, &mut captures, Limits::default()).unwrap());
    }
}
