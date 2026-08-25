#![no_std]

extern crate alloc;

use alloc::{vec, vec::Vec};
use microesnext_bytecode::{Immediate, Opcode};

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

    pub fn immediate(mut self, value: Immediate) -> Self {
        self.code.push(Opcode::ConstImmediate as u8);
        self.code.push(value as u8);
        self
    }

    pub fn init_locals(mut self, count: u16) -> Self {
        self.code.push(Opcode::InitLocals as u8);
        self.code.extend_from_slice(&count.to_le_bytes());
        self
    }

    pub fn init_frame(mut self, count: u16, parameter_count: u16) -> Self {
        self.code.push(Opcode::InitFrame as u8);
        self.code.extend_from_slice(&count.to_le_bytes());
        self.code.extend_from_slice(&parameter_count.to_le_bytes());
        self
    }

    pub fn init_receiver_frame(mut self, count: u16, parameter_count: u16) -> Self {
        self.code.push(Opcode::InitReceiverFrame as u8);
        self.code.extend_from_slice(&count.to_le_bytes());
        self.code.extend_from_slice(&parameter_count.to_le_bytes());
        self
    }

    pub fn load_local(mut self, slot: u16) -> Self {
        self.code.push(Opcode::LoadLocal as u8);
        self.code.extend_from_slice(&slot.to_le_bytes());
        self
    }

    pub fn store_local(mut self, slot: u16) -> Self {
        self.code.push(Opcode::StoreLocal as u8);
        self.code.extend_from_slice(&slot.to_le_bytes());
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

    pub fn jump(mut self, bytecode_offset: u32) -> Self {
        self.code.push(Opcode::Jump as u8);
        self.code.extend_from_slice(&bytecode_offset.to_le_bytes());
        self
    }

    pub fn jump_if_false_boolean(mut self, bytecode_offset: u32) -> Self {
        self.code.push(Opcode::JumpIfFalseBoolean as u8);
        self.code.extend_from_slice(&bytecode_offset.to_le_bytes());
        self
    }

    pub fn to_boolean(mut self) -> Self {
        self.code.push(Opcode::ToBoolean as u8);
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

    pub fn call_value_arguments(mut self, count: u16) -> Self {
        self.code.push(Opcode::CallValueArguments as u8);
        self.code.extend_from_slice(&count.to_le_bytes());
        self
    }

    pub fn new_environment_cell(mut self) -> Self {
        self.code.push(Opcode::NewEnvironmentCell as u8);
        self
    }

    pub fn load_environment_cell(mut self) -> Self {
        self.code.push(Opcode::LoadEnvironmentCell as u8);
        self
    }

    pub fn store_environment_cell(mut self) -> Self {
        self.code.push(Opcode::StoreEnvironmentCell as u8);
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
        locals: Vec::new(),
        outer_bindings: Vec::new(),
        captures: Vec::new(),
        functions: Vec::new(),
        relocations: Vec::new(),
        function_frame: false,
    };
    parser.whitespace();
    let locals_patch = parser.local_declarations()?;
    parser.terminal_statement()?;
    if parser.offset != parser.source.len() {
        return Err(parser.error("end of input"));
    }
    if let Some(patch) = locals_patch {
        let count = u16::try_from(parser.locals.len())
            .map_err(|_| parser.error("fewer than 65536 local bindings"))?;
        parser.output[patch..patch + 2].copy_from_slice(&count.to_le_bytes());
    }
    parser.append_function_bodies()?;
    Ok(parser.output)
}

struct Parser<'source> {
    source: &'source [u8],
    offset: usize,
    output: Vec<u8>,
    locals: Vec<Binding>,
    outer_bindings: Vec<Binding>,
    captures: Vec<Binding>,
    functions: Vec<PendingFunction>,
    relocations: Vec<usize>,
    function_frame: bool,
}

#[derive(Clone, Copy)]
struct Binding {
    start: usize,
    end: usize,
    slot: u16,
    captured: bool,
}

fn same_binding(left: Binding, right: Binding) -> bool {
    left.start == right.start && left.end == right.end
}

struct PendingFunction {
    target_patch: usize,
    code: Vec<u8>,
    relocations: Vec<usize>,
}

#[derive(Clone, Copy, Eq, PartialEq)]
enum TermKind {
    I30,
    General,
}

#[derive(Clone, Copy)]
enum CaptureSource {
    Local(usize),
    Outer(u16),
}

#[derive(Clone, Copy)]
enum FunctionBody {
    Block,
    Expression,
}

impl Parser<'_> {
    fn terminal_statement(&mut self) -> Result<(), CompileError> {
        self.local_assignments()?;
        if self.try_word_after_whitespace(b"if") {
            self.if_else()
        } else if self.try_word_after_whitespace(b"while") {
            self.while_loop()
        } else if self.try_word_after_whitespace(b"try") {
            self.try_catch()
        } else {
            self.completion(None, false, false)
        }
    }

    fn append_function_bodies(&mut self) -> Result<(), CompileError> {
        for mut function in core::mem::take(&mut self.functions) {
            let target = u32::try_from(self.output.len())
                .map_err(|_| self.error("bytecode smaller than 4 GiB"))?;
            self.output[function.target_patch..function.target_patch + 4]
                .copy_from_slice(&target.to_le_bytes());
            self.relocations.push(function.target_patch);
            for relocation in &function.relocations {
                let relative = u32::from_le_bytes(
                    function.code[*relocation..*relocation + 4]
                        .try_into()
                        .map_err(|_| self.error("a complete relocation"))?,
                );
                let relocated = relative
                    .checked_add(target)
                    .ok_or_else(|| self.error("bytecode smaller than 4 GiB"))?;
                function.code[*relocation..*relocation + 4]
                    .copy_from_slice(&relocated.to_le_bytes());
                self.relocations.push(target as usize + *relocation);
            }
            self.output.extend_from_slice(&function.code);
        }
        Ok(())
    }

    fn while_loop(&mut self) -> Result<(), CompileError> {
        let loop_start = u32::try_from(self.output.len())
            .map_err(|_| self.error("bytecode smaller than 4 GiB"))?;
        if !self.consume(b'(') {
            return Err(self.error("("));
        }
        self.expression(None)?;
        if !self.consume(b')') {
            return Err(self.error(")"));
        }
        self.output.push(Opcode::ToBoolean as u8);
        self.output.push(Opcode::JumpIfFalseBoolean as u8);
        let exit_patch = self.output.len();
        self.output.extend_from_slice(&0_u32.to_le_bytes());
        if !self.consume(b'{') {
            return Err(self.error("{"));
        }
        self.local_assignments()?;
        if !self.consume(b'}') {
            return Err(self.error("}"));
        }
        self.output.push(Opcode::Jump as u8);
        let loop_patch = self.output.len();
        self.output.extend_from_slice(&loop_start.to_le_bytes());
        let exit = u32::try_from(self.output.len())
            .map_err(|_| self.error("bytecode smaller than 4 GiB"))?;
        self.output[exit_patch..exit_patch + 4].copy_from_slice(&exit.to_le_bytes());
        self.relocations.push(exit_patch);
        self.relocations.push(loop_patch);
        self.local_assignments()?;
        self.completion(None, false, false)
    }

    fn if_else(&mut self) -> Result<(), CompileError> {
        if !self.consume(b'(') {
            return Err(self.error("("));
        }
        self.expression(None)?;
        if !self.consume(b')') {
            return Err(self.error(")"));
        }
        self.output.push(Opcode::ToBoolean as u8);
        self.output.push(Opcode::JumpIfFalseBoolean as u8);
        let alternate_patch = self.output.len();
        self.output.extend_from_slice(&0_u32.to_le_bytes());
        if !self.consume(b'{') {
            return Err(self.error("{"));
        }
        self.completion(None, false, false)?;
        if !self.consume(b'}') || !self.try_word_after_whitespace(b"else") {
            return Err(self.error("} else"));
        }
        if !self.consume(b'{') {
            return Err(self.error("{"));
        }
        let alternate = u32::try_from(self.output.len())
            .map_err(|_| self.error("bytecode smaller than 4 GiB"))?;
        self.output[alternate_patch..alternate_patch + 4].copy_from_slice(&alternate.to_le_bytes());
        self.relocations.push(alternate_patch);
        self.completion(None, false, false)?;
        if !self.consume(b'}') {
            return Err(self.error("}"));
        }
        self.whitespace();
        Ok(())
    }

    fn local_declarations(&mut self) -> Result<Option<usize>, CompileError> {
        let mut count_patch = None;
        self.frame_declarations(&mut count_patch)?;
        Ok(count_patch)
    }

    fn frame_declarations(&mut self, count_patch: &mut Option<usize>) -> Result<(), CompileError> {
        loop {
            self.whitespace();
            if self.try_word(b"function") {
                self.function_declaration(count_patch, false)?;
            } else if self.try_async_function() {
                self.function_declaration(count_patch, true)?;
            } else if self.try_word(b"let") {
                self.let_declaration(count_patch)?;
            } else {
                break;
            }
        }
        Ok(())
    }

    fn let_declaration(&mut self, count_patch: &mut Option<usize>) -> Result<(), CompileError> {
        if count_patch.is_none() {
            self.output.push(Opcode::InitLocals as u8);
            *count_patch = Some(self.output.len());
            self.output.extend_from_slice(&0_u16.to_le_bytes());
        }
        self.whitespace();
        let (start, end) = self.identifier()?;
        if self
            .locals
            .iter()
            .any(|binding| self.source[binding.start..binding.end] == self.source[start..end])
        {
            return Err(self.error("a unique local binding"));
        }
        if !self.consume(b'=') {
            return Err(self.error("="));
        }
        self.expression(None)?;
        let slot = u16::try_from(self.locals.len())
            .map_err(|_| self.error("fewer than 65536 local bindings"))?;
        self.output.push(Opcode::StoreLocal as u8);
        self.output.extend_from_slice(&slot.to_le_bytes());
        self.locals.push(Binding {
            start,
            end,
            slot,
            captured: false,
        });
        if !self.consume(b';') {
            return Err(self.error(";"));
        }
        self.whitespace();
        Ok(())
    }

    fn function_declaration(
        &mut self,
        count_patch: &mut Option<usize>,
        asynchronous: bool,
    ) -> Result<(), CompileError> {
        if count_patch.is_none() {
            self.output.push(Opcode::InitLocals as u8);
            *count_patch = Some(self.output.len());
            self.output.extend_from_slice(&0_u16.to_le_bytes());
        }
        self.whitespace();
        let (name_start, name_end) = self.identifier()?;
        if self.locals.iter().any(|binding| {
            self.source[binding.start..binding.end] == self.source[name_start..name_end]
        }) {
            return Err(self.error("a unique local binding"));
        }
        let slot = u16::try_from(self.locals.len())
            .map_err(|_| self.error("fewer than 65536 local bindings"))?;
        self.locals.push(Binding {
            start: name_start,
            end: name_end,
            slot,
            captured: false,
        });
        let parameters = self.function_parameters()?;
        self.function_value(
            parameters,
            Some(slot),
            FunctionBody::Block,
            None,
            asynchronous,
        )?;
        Ok(())
    }

    fn function_parameters(&mut self) -> Result<Vec<Binding>, CompileError> {
        if !self.consume(b'(') {
            return Err(self.error("("));
        }
        self.whitespace();
        let mut parameters = Vec::new();
        if self.consume_raw(b')') {
            return Ok(parameters);
        }
        loop {
            self.whitespace();
            let (start, end) = self.identifier()?;
            if parameters.iter().any(|binding: &Binding| {
                self.source[binding.start..binding.end] == self.source[start..end]
            }) {
                return Err(self.error("a unique parameter binding"));
            }
            let slot = u16::try_from(parameters.len())
                .map_err(|_| self.error("fewer than 65536 parameters"))?;
            parameters.push(Binding {
                start,
                end,
                slot,
                captured: false,
            });
            if self.consume(b')') {
                return Ok(parameters);
            }
            if !self.consume(b',') {
                return Err(self.error(", or )"));
            }
        }
    }

    fn try_arrow_parameters(&mut self) -> Result<Option<Vec<Binding>>, CompileError> {
        let start = self.offset;
        let parameters = if self.source.get(self.offset) == Some(&b'(') {
            self.function_parameters()?
        } else {
            let Some(first) = self.source.get(self.offset) else {
                return Ok(None);
            };
            if !first.is_ascii_alphabetic() && *first != b'_' && *first != b'$' {
                return Ok(None);
            }
            let (name_start, name_end) = self.identifier()?;
            vec![Binding {
                start: name_start,
                end: name_end,
                slot: 0,
                captured: false,
            }]
        };
        self.whitespace();
        if !self.source[self.offset..].starts_with(b"=>") {
            self.offset = start;
            return Ok(None);
        }
        self.offset += 2;
        Ok(Some(parameters))
    }

    fn function_value(
        &mut self,
        parameters: Vec<Binding>,
        destination: Option<u16>,
        body_kind: FunctionBody,
        expression_name: Option<Binding>,
        asynchronous: bool,
    ) -> Result<(), CompileError> {
        if matches!(body_kind, FunctionBody::Block) && !self.consume(b'{') {
            return Err(self.error("{"));
        }
        let parameter_count = u16::try_from(parameters.len())
            .map_err(|_| self.error("fewer than 65536 parameters"))?;
        let mut outer_bindings = self.outer_bindings.clone();
        outer_bindings.extend_from_slice(&self.locals);
        outer_bindings.extend(expression_name);
        let mut body = Parser {
            source: self.source,
            offset: self.offset,
            output: Builder::new()
                .init_frame(parameter_count, parameter_count)
                .finish(),
            locals: parameters,
            outer_bindings,
            captures: expression_name.into_iter().collect(),
            functions: Vec::new(),
            relocations: Vec::new(),
            function_frame: true,
        };
        let mut body_count_patch = Some(1);
        if matches!(body_kind, FunctionBody::Block) {
            body.frame_declarations(&mut body_count_patch)?;
        }
        let body_local_count = u16::try_from(body.locals.len())
            .map_err(|_| body.error("fewer than 65536 local bindings"))?;
        body.output[1..3].copy_from_slice(&body_local_count.to_le_bytes());
        match body_kind {
            FunctionBody::Block => {
                body.terminal_statement()?;
                if !body.consume(b'}') {
                    return Err(body.error("}"));
                }
            }
            FunctionBody::Expression => {
                body.expression(None)?;
                body.output.push(Opcode::ReturnLocals as u8);
            }
        }
        body.whitespace();
        body.append_function_bodies()?;
        self.offset = body.offset;

        let mut capture_sources = Vec::with_capacity(body.captures.len());
        for capture in &body.captures {
            if expression_name.is_some_and(|name| same_binding(name, *capture)) {
                continue;
            }
            if let Some(index) = self
                .locals
                .iter()
                .position(|binding| same_binding(*binding, *capture))
            {
                if !self.locals[index].captured {
                    let binding = &mut self.locals[index];
                    self.output.push(Opcode::LoadLocal as u8);
                    self.output.extend_from_slice(&binding.slot.to_le_bytes());
                    self.output.push(Opcode::NewEnvironmentCell as u8);
                    self.output.push(Opcode::StoreLocal as u8);
                    self.output.extend_from_slice(&binding.slot.to_le_bytes());
                    binding.captured = true;
                }
                capture_sources.push(CaptureSource::Local(index));
            } else if self
                .outer_bindings
                .iter()
                .any(|binding| same_binding(*binding, *capture))
            {
                let index = self.intern_capture(*capture)?;
                capture_sources.push(CaptureSource::Outer(index));
            } else {
                return Err(self.error("an enclosing binding"));
            }
        }
        let self_captured = destination.is_some_and(|slot| self.locals[slot as usize].captured);
        if self_captured {
            let slot = destination.expect("captured declarations have a destination");
            self.output.push(Opcode::LoadLocal as u8);
            self.output.extend_from_slice(&slot.to_le_bytes());
        }
        let capture_count = u16::try_from(capture_sources.len())
            .map_err(|_| self.error("fewer than 65536 captures"))?;
        for source in capture_sources {
            match source {
                CaptureSource::Local(index) => {
                    self.output.push(Opcode::LoadLocal as u8);
                    self.output
                        .extend_from_slice(&self.locals[index].slot.to_le_bytes());
                }
                CaptureSource::Outer(index) => {
                    self.output.push(Opcode::LoadCapture as u8);
                    self.output.extend_from_slice(&index.to_le_bytes());
                }
            }
        }
        self.output
            .push(if expression_name.is_some() && asynchronous {
                Opcode::RecursiveAsyncClosure as u8
            } else if expression_name.is_some() {
                Opcode::RecursiveClosure as u8
            } else if asynchronous {
                Opcode::AsyncClosure as u8
            } else {
                Opcode::Closure as u8
            });
        let target_patch = self.output.len();
        self.output.extend_from_slice(&0_u32.to_le_bytes());
        self.output.extend_from_slice(&capture_count.to_le_bytes());
        if self_captured {
            self.output.push(Opcode::StoreEnvironmentCell as u8);
        } else if let Some(slot) = destination {
            self.output.push(Opcode::StoreLocal as u8);
            self.output.extend_from_slice(&slot.to_le_bytes());
        }
        self.functions.push(PendingFunction {
            target_patch,
            code: body.output,
            relocations: body.relocations,
        });
        Ok(())
    }

    fn local_assignments(&mut self) -> Result<(), CompileError> {
        loop {
            self.whitespace();
            let start = self.offset;
            let local = self.local_at_offset();
            let capture = if local.is_none() {
                self.capture_at_offset()?
            } else {
                None
            };
            let Some(binding) = local.or_else(|| capture.map(|(_, binding)| binding)) else {
                return Ok(());
            };
            self.offset += binding.end - binding.start;
            if !self.consume(b'=') {
                self.offset = start;
                return Ok(());
            }
            if binding.captured {
                self.output.push(Opcode::LoadLocal as u8);
                self.output.extend_from_slice(&binding.slot.to_le_bytes());
            } else if let Some((capture, _)) = capture {
                self.output.push(Opcode::LoadCapture as u8);
                self.output.extend_from_slice(&capture.to_le_bytes());
            }
            self.expression(None)?;
            if binding.captured || capture.is_some() {
                self.output.push(Opcode::StoreEnvironmentCell as u8);
            } else {
                self.output.push(Opcode::StoreLocal as u8);
                self.output.extend_from_slice(&binding.slot.to_le_bytes());
            }
            if !self.consume(b';') {
                return Err(self.error(";"));
            }
        }
    }

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
        self.relocations.push(catch_patch);
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
        let returning = if self.try_word(b"return") {
            true
        } else if self.try_word(b"throw") {
            false
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
        if close_handler && returning {
            self.output.push(Opcode::EndTry as u8);
        }
        self.output.push(if returning {
            if !self.function_frame && self.locals.is_empty() {
                Opcode::Return as u8
            } else {
                Opcode::ReturnLocals as u8
            }
        } else {
            Opcode::Throw as u8
        });
        Ok(())
    }

    fn expression(&mut self, binding: Option<(usize, usize)>) -> Result<bool, CompileError> {
        let (used_binding, mut kind) = self.product(binding)?;
        loop {
            if self.consume(b'+') {
                let (_, right) = self.product(None)?;
                let immediate = kind == TermKind::I30 && right == TermKind::I30;
                self.output.push(if immediate {
                    Opcode::AddI30
                } else {
                    Opcode::AddNumber
                } as u8);
                kind = if immediate {
                    TermKind::I30
                } else {
                    TermKind::General
                };
            } else if self.consume(b'-') {
                let (_, right) = self.product(None)?;
                self.output.push(Opcode::SubtractI30 as u8);
                kind = if kind == TermKind::I30 && right == TermKind::I30 {
                    TermKind::I30
                } else {
                    TermKind::General
                };
            } else {
                break;
            }
        }
        Ok(used_binding)
    }

    fn product(
        &mut self,
        binding: Option<(usize, usize)>,
    ) -> Result<(bool, TermKind), CompileError> {
        let (used_binding, mut kind) = self.term(binding)?;
        while self.consume(b'*') {
            let (_, right) = self.term(None)?;
            self.output.push(Opcode::MultiplyI30 as u8);
            kind = if kind == TermKind::I30 && right == TermKind::I30 {
                TermKind::I30
            } else {
                TermKind::General
            };
        }
        Ok((used_binding, kind))
    }

    fn term(&mut self, binding: Option<(usize, usize)>) -> Result<(bool, TermKind), CompileError> {
        self.whitespace();
        let awaiting = self.try_word(b"await");
        self.whitespace();
        let async_start = self.offset;
        let async_prefix = self.try_word(b"async")
            && self
                .source
                .get(self.offset)
                .is_some_and(u8::is_ascii_whitespace);
        let mut asynchronous = false;
        let mut async_function = false;
        let mut arrow_parameters = None;
        if async_prefix {
            self.whitespace();
            arrow_parameters = self.try_arrow_parameters()?;
            asynchronous = arrow_parameters.is_some();
            if !asynchronous && self.try_word(b"function") {
                asynchronous = true;
                async_function = true;
            }
        }
        if !asynchronous {
            self.offset = async_start;
            arrow_parameters = self.try_arrow_parameters()?;
        }
        let binding = binding.filter(|(start, end)| {
            self.source[self.offset..].starts_with(&self.source[*start..*end])
                && self.identifier_end(self.offset + end - start)
        });
        let (used_binding, mut kind) = if let Some(parameters) = arrow_parameters {
            self.whitespace();
            let body = if self.source.get(self.offset) == Some(&b'{') {
                FunctionBody::Block
            } else {
                FunctionBody::Expression
            };
            self.function_value(parameters, None, body, None, asynchronous)?;
            (false, TermKind::General)
        } else if let Some((start, end)) = binding {
            self.offset += end - start;
            (true, TermKind::General)
        } else if let Some(local) = self.local_at_offset() {
            self.offset += local.end - local.start;
            self.output.push(Opcode::LoadLocal as u8);
            self.output.extend_from_slice(&local.slot.to_le_bytes());
            if local.captured {
                self.output.push(Opcode::LoadEnvironmentCell as u8);
            }
            (false, TermKind::General)
        } else if let Some((capture, binding)) = self.capture_at_offset()? {
            self.offset += binding.end - binding.start;
            self.output.push(Opcode::LoadCapture as u8);
            self.output.extend_from_slice(&capture.to_le_bytes());
            self.output.push(Opcode::LoadEnvironmentCell as u8);
            (false, TermKind::General)
        } else if async_function || self.try_word(b"function") {
            self.whitespace();
            let expression_name = if self.source.get(self.offset) == Some(&b'(') {
                None
            } else {
                let (start, end) = self.identifier()?;
                Some(Binding {
                    start,
                    end,
                    slot: 0,
                    captured: true,
                })
            };
            let parameters = self.function_parameters()?;
            self.function_value(
                parameters,
                None,
                FunctionBody::Block,
                expression_name,
                asynchronous,
            )?;
            (false, TermKind::General)
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
        } else if let Some(immediate) = self.immediate() {
            self.output.push(Opcode::ConstImmediate as u8);
            self.output.push(immediate as u8);
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
        loop {
            if self.consume(b'.') {
                self.whitespace();
                let (start, end) = self.identifier()?;
                self.output_atom_range(start, end);
                self.output.push(Opcode::GetProperty as u8);
                kind = TermKind::General;
                continue;
            }
            if self.consume(b'(') {
                let mut count = 0_u16;
                if !self.consume(b')') {
                    loop {
                        self.expression(None)?;
                        count = count
                            .checked_add(1)
                            .ok_or_else(|| self.error("fewer than 65536 arguments"))?;
                        if self.consume(b')') {
                            break;
                        }
                        if !self.consume(b',') {
                            return Err(self.error(", or )"));
                        }
                    }
                }
                self.output.push(Opcode::CallValueArguments as u8);
                self.output.extend_from_slice(&count.to_le_bytes());
                kind = TermKind::General;
                continue;
            }
            break;
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

    fn local_at_offset(&self) -> Option<Binding> {
        self.locals.iter().rev().copied().find(|binding| {
            let name = &self.source[binding.start..binding.end];
            self.source[self.offset..].starts_with(name)
                && self.identifier_end(self.offset + name.len())
        })
    }

    fn capture_at_offset(&mut self) -> Result<Option<(u16, Binding)>, CompileError> {
        let Some(binding) = self.outer_bindings.iter().rev().copied().find(|binding| {
            let name = &self.source[binding.start..binding.end];
            self.source[self.offset..].starts_with(name)
                && self.identifier_end(self.offset + name.len())
        }) else {
            return Ok(None);
        };
        let index = self.intern_capture(binding)?;
        Ok(Some((index, binding)))
    }

    fn intern_capture(&mut self, binding: Binding) -> Result<u16, CompileError> {
        let index = if let Some(index) = self
            .captures
            .iter()
            .position(|capture| same_binding(*capture, binding))
        {
            index
        } else {
            self.captures.push(binding);
            self.captures.len() - 1
        };
        u16::try_from(index).map_err(|_| self.error("fewer than 65536 captures"))
    }

    fn immediate(&mut self) -> Option<Immediate> {
        for (word, immediate) in [
            (&b"undefined"[..], Immediate::Undefined),
            (&b"null"[..], Immediate::Null),
            (&b"false"[..], Immediate::False),
            (&b"true"[..], Immediate::True),
        ] {
            if self.try_word(word) {
                return Some(immediate);
            }
        }
        None
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
        if !self.identifier_end(end) {
            return false;
        }
        self.offset = end;
        true
    }

    fn try_word_after_whitespace(&mut self, word: &[u8]) -> bool {
        self.whitespace();
        self.try_word(word)
    }

    fn try_async_function(&mut self) -> bool {
        let start = self.offset;
        if !self.try_word(b"async")
            || !self
                .source
                .get(self.offset)
                .is_some_and(u8::is_ascii_whitespace)
        {
            self.offset = start;
            return false;
        }
        self.whitespace();
        if self.try_word(b"function") {
            true
        } else {
            self.offset = start;
            false
        }
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

    #[test]
    fn compiles_base_language_immediates_without_capabilities() {
        for (source, immediate) in [
            ("return undefined;", Immediate::Undefined),
            ("return null;", Immediate::Null),
            ("return false;", Immediate::False),
            ("return true;", Immediate::True),
        ] {
            assert_eq!(
                compile_script(source).unwrap(),
                Builder::new()
                    .immediate(immediate)
                    .op(Opcode::Return)
                    .finish()
            );
        }
    }

    #[test]
    fn does_not_parse_a_keyword_prefix_as_an_immediate() {
        assert_eq!(compile_script("return trueValue;").unwrap_err().offset, 7);
        assert_eq!(compile_script("return true$value;").unwrap_err().offset, 7);
    }

    #[test]
    fn compiles_lexical_bindings_to_stable_local_slots() {
        assert_eq!(
            compile_script("let forty = 40; let answer = forty + 2; return answer;").unwrap(),
            Builder::new()
                .init_locals(2)
                .const_i30(40)
                .store_local(0)
                .load_local(0)
                .const_i30(2)
                .op(Opcode::AddNumber)
                .store_local(1)
                .load_local(1)
                .op(Opcode::ReturnLocals)
                .finish()
        );
    }

    #[test]
    fn appends_source_functions_and_backpatches_their_entry() {
        let code =
            compile_script("function identity(value) { return value; } return identity(42);")
                .unwrap();
        assert_eq!(code[0], Opcode::InitLocals as u8);
        assert_eq!(code[3], Opcode::Closure as u8);
        let target = u32::from_le_bytes(code[4..8].try_into().unwrap()) as usize;
        assert!(target < code.len());
        assert_eq!(code[target], Opcode::InitFrame as u8);
        assert!(
            code.windows(3)
                .any(|bytes| { bytes == [Opcode::CallValueArguments as u8, 1, 0] })
        );
        assert_eq!(code.last(), Some(&(Opcode::ReturnLocals as u8)));
    }

    #[test]
    fn compiles_async_declarations_to_the_async_closure_capability() {
        let code = compile_script("async function answer() { return await 42; } return answer();")
            .unwrap();
        assert!(code.contains(&(Opcode::AsyncClosure as u8)));
        assert!(code.contains(&(Opcode::Await as u8)));
        assert!(!code.contains(&(Opcode::Closure as u8)));
    }

    #[test]
    fn compiles_async_expressions_and_arrows_to_async_closures() {
        for source in [
            "return async function (value) { return await value; }(42);",
            "let answer = async () => await 42; return answer();",
            "let identity = async value => { return await value; }; return identity(42);",
        ] {
            let code = compile_script(source).unwrap();
            assert!(code.contains(&(Opcode::AsyncClosure as u8)));
            assert!(code.contains(&(Opcode::Await as u8)));
        }
    }

    #[test]
    fn compiles_named_async_expressions_with_a_private_self_capture() {
        let code =
            compile_script("return async function named() { return await named; }();").unwrap();
        assert!(code.contains(&(Opcode::RecursiveAsyncClosure as u8)));
        assert!(code.contains(&(Opcode::Await as u8)));
    }

    #[test]
    fn keeps_async_available_as_an_ordinary_binding() {
        let code = compile_script("let async = 41; return async + 1;").unwrap();
        assert!(!code.contains(&(Opcode::AsyncClosure as u8)));
    }

    #[test]
    fn compiles_zero_parameter_calls_with_a_function_frame() {
        let code = compile_script("function answer() { return 42; } return answer();").unwrap();
        let target = u32::from_le_bytes(code[4..8].try_into().unwrap()) as usize;
        assert_eq!(
            &code[target..target + 5],
            &[Opcode::InitFrame as u8, 0, 0, 0, 0]
        );
        assert_eq!(code.last(), Some(&(Opcode::ReturnLocals as u8)));
    }

    #[test]
    fn compiles_an_anonymous_function_expression_as_a_value() {
        let code = compile_script("return function (value) { return value; }(42);").unwrap();
        assert_eq!(code[0], Opcode::Closure as u8);
        let target = u32::from_le_bytes(code[1..5].try_into().unwrap()) as usize;
        assert_eq!(code[target], Opcode::InitFrame as u8);
        assert!(
            code.windows(3)
                .any(|bytes| { bytes == [Opcode::CallValueArguments as u8, 1, 0] })
        );
    }

    #[test]
    fn compiles_a_named_expression_with_a_private_self_capture() {
        let code = compile_script(
            "let value = function privateName() { return privateName; }; return value();",
        )
        .unwrap();
        assert!(code.contains(&(Opcode::RecursiveClosure as u8)));
        assert_eq!(
            compile_script(
                "let value = function privateName() { return 42; }; return privateName();"
            )
            .unwrap_err()
            .offset,
            58
        );
    }

    #[test]
    fn compiles_arrow_expression_and_block_bodies_as_closures() {
        for source in [
            "let identity = value => value; return identity(42);",
            "let identity = (value) => { return value; }; return identity(42);",
        ] {
            let code = compile_script(source).unwrap();
            assert!(code.contains(&(Opcode::Closure as u8)));
            assert!(
                code.windows(3)
                    .any(|bytes| { bytes == [Opcode::CallValueArguments as u8, 1, 0] })
            );
        }
    }

    #[test]
    fn compiles_multiple_parameters_and_arguments() {
        let code =
            compile_script("function add(left, right) { return left + right; } return add(40, 2);")
                .unwrap();
        assert!(
            code.windows(3)
                .any(|bytes| { bytes == [Opcode::CallValueArguments as u8, 2, 0] })
        );
        let target = u32::from_le_bytes(code[4..8].try_into().unwrap()) as usize;
        assert_eq!(
            &code[target..target + 5],
            &[Opcode::InitFrame as u8, 2, 0, 2, 0]
        );
    }

    #[test]
    fn rejects_duplicate_parameters() {
        assert_eq!(
            compile_script("function bad(value, value) { return value; } return bad(1, 2);")
                .unwrap_err()
                .expected,
            "a unique parameter binding"
        );
    }

    #[test]
    fn compiles_function_local_bindings_into_the_parameter_frame() {
        let code = compile_script(
            "function addBase(value) { let base = 40; return base + value; } return addBase(2);",
        )
        .unwrap();
        let target = u32::from_le_bytes(code[4..8].try_into().unwrap()) as usize;
        assert_eq!(
            &code[target..target + 5],
            &[Opcode::InitFrame as u8, 2, 0, 1, 0]
        );
        assert!(
            code[target..]
                .windows(3)
                .any(|bytes| { bytes == [Opcode::StoreLocal as u8, 1, 0] })
        );
    }

    #[test]
    fn boxes_only_a_binding_captured_by_a_source_function() {
        let code =
            compile_script("let count = 40; function read() { return count; } return read();")
                .unwrap();
        assert_eq!(
            code.iter()
                .filter(|opcode| **opcode == Opcode::NewEnvironmentCell as u8)
                .count(),
            1
        );
        assert!(
            code.windows(3)
                .any(|bytes| { bytes == [Opcode::LoadCapture as u8, 0, 0] })
        );
        assert!(code.contains(&(Opcode::LoadEnvironmentCell as u8)));
    }

    #[test]
    fn sibling_closures_reuse_one_environment_cell() {
        let code = compile_script(
            "let value = 40; function first() { return value; } function second() { return value; } return second();",
        )
        .unwrap();
        assert_eq!(
            code.iter()
                .filter(|opcode| **opcode == Opcode::NewEnvironmentCell as u8)
                .count(),
            1
        );
        assert_eq!(
            code.iter()
                .filter(|opcode| **opcode == Opcode::LoadEnvironmentCell as u8)
                .count(),
            2
        );
    }

    #[test]
    fn self_referential_function_initializes_its_own_cell() {
        let code = compile_script(
            "function selfReference() { return selfReference; } return selfReference();",
        )
        .unwrap();
        assert_eq!(
            code.iter()
                .filter(|opcode| **opcode == Opcode::NewEnvironmentCell as u8)
                .count(),
            1
        );
        assert!(code.contains(&(Opcode::StoreEnvironmentCell as u8)));
        assert!(
            code.windows(3)
                .any(|bytes| { bytes == [Opcode::LoadCapture as u8, 0, 0] })
        );
    }

    #[test]
    fn relocates_a_nested_function_body_when_appending_its_parent() {
        let code = compile_script(
            "function outer(value) { function inner() { return value; } return inner(); } return outer(42);",
        )
        .unwrap();
        let closure_targets: Vec<_> = code
            .iter()
            .enumerate()
            .filter(|(_, opcode)| **opcode == Opcode::Closure as u8)
            .map(|(index, _)| {
                u32::from_le_bytes(code[index + 1..index + 5].try_into().unwrap()) as usize
            })
            .collect();
        assert_eq!(closure_targets.len(), 2);
        assert!(closure_targets.iter().all(|target| *target < code.len()));
        assert!(
            closure_targets
                .iter()
                .all(|target| { code[*target] == Opcode::InitFrame as u8 })
        );
        assert_ne!(closure_targets[0], closure_targets[1]);
    }

    #[test]
    fn forwards_a_capture_through_an_intermediate_function() {
        let code = compile_script(
            "function outer(value) { function middle() { function inner() { return value; } return inner(); } return middle(); } return outer(42);",
        )
        .unwrap();
        assert_eq!(
            code.iter()
                .filter(|opcode| **opcode == Opcode::NewEnvironmentCell as u8)
                .count(),
            1
        );
        assert_eq!(
            code.iter()
                .filter(|opcode| **opcode == Opcode::Closure as u8)
                .count(),
            3
        );
    }

    #[test]
    fn rejects_duplicate_and_forward_local_bindings() {
        assert_eq!(
            compile_script("let value = 1; let value = 2; return value;")
                .unwrap_err()
                .expected,
            "a unique local binding"
        );
        assert_eq!(
            compile_script("let answer = later; let later = 42; return answer;")
                .unwrap_err()
                .offset,
            13
        );
    }

    #[test]
    fn compiles_terminal_if_else_without_an_ast() {
        let code = compile_script("if (0) { return 1; } else { return 42; }").unwrap();
        assert!(code.contains(&(Opcode::ToBoolean as u8)));
        let branch = code
            .iter()
            .position(|byte| *byte == Opcode::JumpIfFalseBoolean as u8)
            .unwrap();
        let alternate = u32::from_le_bytes(code[branch + 1..branch + 5].try_into().unwrap());
        assert_eq!(code[alternate as usize], Opcode::ConstI30 as u8);
        assert_eq!(*code.last().unwrap(), Opcode::Return as u8);
    }

    #[test]
    fn compiles_assignment_and_while_without_native_recursion() {
        let code = compile_script(
            "let running = true; let answer = 0; while (running) { answer = 42; running = false; } return answer;",
        )
        .unwrap();
        assert!(code.contains(&(Opcode::JumpIfFalseBoolean as u8)));
        assert!(code.contains(&(Opcode::Jump as u8)));
        assert_eq!(
            code.iter()
                .filter(|byte| **byte == Opcode::StoreLocal as u8)
                .count(),
            4
        );
        assert_eq!(*code.last().unwrap(), Opcode::ReturnLocals as u8);
    }

    #[test]
    fn compiles_integer_products_before_addition_and_subtraction() {
        let code = compile_script("return 10 - 2 * 3 + 1;").unwrap();
        let expected = Builder::new()
            .const_i30(10)
            .const_i30(2)
            .const_i30(3)
            .op(Opcode::MultiplyI30)
            .op(Opcode::SubtractI30)
            .const_i30(1)
            .op(Opcode::AddI30)
            .op(Opcode::Return)
            .finish();
        assert_eq!(code, expected);
    }
}
