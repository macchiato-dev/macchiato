#![no_std]

extern crate alloc;

#[cfg(feature = "functions")]
use alloc::vec;
use alloc::vec::Vec;
use microesnext_bytecode::{Immediate, Opcode};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct CompileError {
    #[cfg(feature = "source-positions")]
    pub offset: usize,
    pub expected: &'static str,
}

#[cfg(any(feature = "number-negation", feature = "number-operations"))]
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum NumberMode {
    /// Preserve JavaScript Number behavior, promoting beyond immediate i30s.
    #[default]
    JavaScript,
    /// Emit the smaller integer-only instruction set and fail outside i30.
    BoundedI30,
}

#[cfg(not(any(feature = "number-negation", feature = "number-operations")))]
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum NumberMode {
    /// The reduced compiler emits only the bounded immediate-number subset.
    #[default]
    BoundedI30,
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct CompileOptions {
    pub numbers: NumberMode,
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

    #[cfg(feature = "locals")]
    pub fn init_locals(mut self, count: u16) -> Self {
        self.code.push(Opcode::InitLocals as u8);
        self.code.extend_from_slice(&count.to_le_bytes());
        self
    }

    #[cfg(feature = "function-arguments")]
    pub fn init_frame(mut self, count: u16, parameter_count: u16) -> Self {
        self.code.push(Opcode::InitFrame as u8);
        self.code.extend_from_slice(&count.to_le_bytes());
        self.code.extend_from_slice(&parameter_count.to_le_bytes());
        self
    }

    #[cfg(feature = "receivers")]
    pub fn init_receiver_frame(mut self, count: u16, parameter_count: u16) -> Self {
        self.code.push(Opcode::InitReceiverFrame as u8);
        self.code.extend_from_slice(&count.to_le_bytes());
        self.code.extend_from_slice(&parameter_count.to_le_bytes());
        self
    }

    #[cfg(feature = "locals")]
    pub fn load_local(mut self, slot: u16) -> Self {
        self.code.push(Opcode::LoadLocal as u8);
        self.code.extend_from_slice(&slot.to_le_bytes());
        self
    }

    #[cfg(feature = "locals")]
    pub fn store_local(mut self, slot: u16) -> Self {
        self.code.push(Opcode::StoreLocal as u8);
        self.code.extend_from_slice(&slot.to_le_bytes());
        self
    }

    #[cfg(feature = "numbers")]
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

    #[cfg(feature = "control-flow")]
    pub fn jump(mut self, bytecode_offset: u32) -> Self {
        self.code.push(Opcode::Jump as u8);
        self.code.extend_from_slice(&bytecode_offset.to_le_bytes());
        self
    }

    #[cfg(feature = "control-flow")]
    pub fn jump_if_false_boolean(mut self, bytecode_offset: u32) -> Self {
        self.code.push(Opcode::JumpIfFalseBoolean as u8);
        self.code.extend_from_slice(&bytecode_offset.to_le_bytes());
        self
    }

    #[cfg(feature = "control-flow")]
    pub fn to_boolean(mut self) -> Self {
        self.code.push(Opcode::ToBoolean as u8);
        self
    }

    #[cfg(feature = "exceptions")]
    pub fn try_at(mut self, catch_offset: u32) -> Self {
        self.code.push(Opcode::Try as u8);
        self.code.extend_from_slice(&catch_offset.to_le_bytes());
        self
    }

    #[cfg(feature = "strings")]
    pub fn string(mut self, bytes: &[u8]) -> Self {
        assert!(u16::try_from(bytes.len()).is_ok());
        self.output_string(bytes);
        self
    }

    #[cfg(feature = "string-operations")]
    pub fn concatenate_strings(mut self) -> Self {
        self.code.push(Opcode::ConcatenateStrings as u8);
        self
    }

    #[cfg(feature = "atoms")]
    pub fn atom(mut self, bytes: &[u8]) -> Self {
        assert!(u16::try_from(bytes.len()).is_ok());
        self.output_atom(bytes);
        self
    }

    #[cfg(feature = "objects")]
    pub fn object(mut self) -> Self {
        self.code.push(Opcode::NewObject as u8);
        self
    }

    #[cfg(feature = "functions")]
    pub fn closure(mut self, bytecode_offset: u32, captures: u16) -> Self {
        self.code.push(Opcode::Closure as u8);
        self.code.extend_from_slice(&bytecode_offset.to_le_bytes());
        self.code.extend_from_slice(&captures.to_le_bytes());
        self
    }

    #[cfg(feature = "functions")]
    pub fn load_capture(mut self, index: u16) -> Self {
        self.code.push(Opcode::LoadCapture as u8);
        self.code.extend_from_slice(&index.to_le_bytes());
        self
    }

    #[cfg(feature = "function-arguments")]
    pub fn call_value_arguments(mut self, count: u16) -> Self {
        self.code.push(Opcode::CallValueArguments as u8);
        self.code.extend_from_slice(&count.to_le_bytes());
        self
    }

    #[cfg(feature = "environments")]
    pub fn new_environment_cell(mut self) -> Self {
        self.code.push(Opcode::NewEnvironmentCell as u8);
        self
    }

    #[cfg(feature = "environments")]
    pub fn load_environment_cell(mut self) -> Self {
        self.code.push(Opcode::LoadEnvironmentCell as u8);
        self
    }

    #[cfg(feature = "environments")]
    pub fn store_environment_cell(mut self) -> Self {
        self.code.push(Opcode::StoreEnvironmentCell as u8);
        self
    }

    #[cfg(feature = "strings")]
    fn output_string(&mut self, bytes: &[u8]) {
        self.code.push(Opcode::ConstString as u8);
        self.code
            .extend_from_slice(&(bytes.len() as u16).to_le_bytes());
        self.code.extend_from_slice(bytes);
    }

    #[cfg(feature = "atoms")]
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
    compile_script_with_host_globals(source, &[])
}

pub fn compile_script_with_host_globals(
    source: &str,
    globals: &[&str],
) -> Result<Vec<u8>, CompileError> {
    compile_script_with_options_and_host_globals(source, CompileOptions::default(), globals)
}

pub fn compile_script_with_options(
    source: &str,
    options: CompileOptions,
) -> Result<Vec<u8>, CompileError> {
    compile_script_with_options_and_host_globals(source, options, &[])
}

fn compile_script_with_options_and_host_globals(
    source: &str,
    options: CompileOptions,
    globals: &[&str],
) -> Result<Vec<u8>, CompileError> {
    #[cfg(not(any(feature = "number-negation", feature = "number-operations")))]
    let _ = options;
    let mut parser = Parser {
        source: source.as_bytes(),
        offset: 0,
        output: Vec::new(),
        #[cfg(feature = "host-bindings")]
        host_globals: globals
            .iter()
            .map(|name| name.as_bytes().to_vec())
            .collect(),
        #[cfg(feature = "locals")]
        locals: Vec::new(),
        #[cfg(feature = "environments")]
        outer_bindings: Vec::new(),
        #[cfg(feature = "environments")]
        captures: Vec::new(),
        #[cfg(feature = "functions")]
        functions: Vec::new(),
        #[cfg(feature = "functions")]
        relocations: Vec::new(),
        #[cfg(feature = "functions")]
        function_frame: false,
        #[cfg(feature = "receivers")]
        receiver_frame: false,
        #[cfg(any(feature = "number-negation", feature = "number-operations"))]
        options,
    };
    parser.whitespace();
    #[cfg(feature = "locals")]
    let locals_patch = parser.local_declarations()?;
    #[cfg(not(feature = "locals"))]
    parser.local_declarations()?;
    parser.terminal_statement()?;
    if parser.offset != parser.source.len() {
        return Err(parser.error("end of input"));
    }
    #[cfg(feature = "locals")]
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
    #[cfg(feature = "host-bindings")]
    host_globals: Vec<Vec<u8>>,
    #[cfg(feature = "locals")]
    locals: Vec<Binding>,
    #[cfg(feature = "environments")]
    outer_bindings: Vec<Binding>,
    #[cfg(feature = "environments")]
    captures: Vec<Binding>,
    #[cfg(feature = "functions")]
    functions: Vec<PendingFunction>,
    #[cfg(feature = "functions")]
    relocations: Vec<usize>,
    #[cfg(feature = "functions")]
    function_frame: bool,
    #[cfg(feature = "receivers")]
    receiver_frame: bool,
    #[cfg(any(feature = "number-negation", feature = "number-operations"))]
    options: CompileOptions,
}

#[cfg(feature = "locals")]
#[derive(Clone, Copy)]
struct Binding {
    start: usize,
    end: usize,
    slot: u16,
    #[cfg(feature = "environments")]
    captured: bool,
}

#[cfg(any(
    feature = "array-assignment-expressions",
    feature = "property-assignment-expressions"
))]
#[derive(Clone, Copy)]
enum AssignmentBase {
    Local(Binding),
    #[cfg(feature = "environments")]
    Capture(Binding),
    #[cfg(all(feature = "functions", feature = "receivers"))]
    Receiver,
}

#[cfg(feature = "array-assignment-expressions")]
#[derive(Clone, Copy)]
enum AssignmentSuffix {
    #[cfg(feature = "objects")]
    Property(usize, usize),
    Index(usize, usize),
}

#[cfg(feature = "environments")]
fn same_binding(left: Binding, right: Binding) -> bool {
    left.start == right.start && left.end == right.end
}

#[cfg(feature = "functions")]
struct PendingFunction {
    target_patch: usize,
    code: Vec<u8>,
    relocations: Vec<usize>,
}

#[derive(Clone, Copy, Eq, PartialEq)]
enum TermKind {
    I30(i32),
    #[cfg(feature = "strings")]
    String,
    General,
}

#[cfg(all(
    feature = "typeof",
    any(
        feature = "integer-negation",
        feature = "logical-operations",
        feature = "number-coercion"
    )
))]
#[derive(Clone, Copy)]
enum UnaryOperator {
    TypeOf,
    #[cfg(feature = "logical-operations")]
    LogicalNot,
    #[cfg(feature = "integer-negation")]
    Negate,
    #[cfg(feature = "number-coercion")]
    ToNumber,
}

#[cfg(feature = "strings")]
const fn string_term_kind() -> TermKind {
    TermKind::String
}

#[cfg(not(feature = "strings"))]
const fn string_term_kind() -> TermKind {
    TermKind::General
}

#[cfg(feature = "environments")]
#[derive(Clone, Copy)]
enum CaptureSource {
    Local(usize),
    Outer(u16),
}

#[cfg(feature = "functions")]
#[derive(Clone, Copy)]
enum FunctionBody {
    Block,
    Expression,
    #[cfg(feature = "classes")]
    ClassConstructor,
    #[cfg(feature = "class-methods")]
    Method,
}

#[cfg(all(feature = "nested-conditionals", not(feature = "nested-loops")))]
#[derive(Clone, Copy)]
enum ConditionalSide {
    Consequent,
    Alternate,
}

#[cfg(all(feature = "nested-conditionals", not(feature = "nested-loops")))]
struct ConditionalFrame {
    alternate_patch: usize,
    join_patch: Option<usize>,
    consequent_abrupt: bool,
    side: ConditionalSide,
}

#[cfg(all(feature = "nested-loops", not(feature = "structured-statements")))]
enum ControlFrame {
    Conditional {
        alternate_patch: usize,
        join_patch: Option<usize>,
        consequent_abrupt: bool,
        alternate: bool,
    },
    Loop {
        start: u32,
        exit_patch: usize,
    },
}

#[cfg(all(feature = "nested-exceptions", not(feature = "structured-statements")))]
enum ExceptionFrame {
    Try {
        catch_patch: usize,
    },
    Catch {
        binding: Option<(usize, usize)>,
        join_patch: Option<usize>,
        try_fallthrough: bool,
        pending: bool,
    },
}

#[cfg(feature = "structured-statements")]
enum StructuredStart {
    Conditional,
    Loop,
    Exception,
}

#[cfg(feature = "structured-statements")]
enum StructuredFrame {
    Conditional {
        alternate_patch: usize,
        join_patch: Option<usize>,
        consequent_abrupt: bool,
        alternate: bool,
    },
    Loop {
        start: u32,
        exit_patch: usize,
    },
    Try {
        catch_patch: usize,
    },
    Catch {
        binding: Option<(usize, usize)>,
        join_patch: Option<usize>,
        try_fallthrough: bool,
        pending: bool,
    },
}

impl Parser<'_> {
    #[cfg(all(
        feature = "control-flow",
        feature = "nonterminal-conditionals",
        not(feature = "nested-loops")
    ))]
    fn terminal_statement(&mut self) -> Result<(), CompileError> {
        loop {
            self.statement_prefix()?;
            if self.try_word_after_whitespace(b"if") {
                let abrupt = self.if_else()?;
                if abrupt && self.at_body_end() {
                    return Ok(());
                }
                continue;
            }
            if self.try_word_after_whitespace(b"while") {
                self.while_loop()?;
                continue;
            }
            #[cfg(feature = "exceptions")]
            if self.try_word_after_whitespace(b"try") {
                #[cfg(feature = "nonterminal-exceptions")]
                {
                    #[cfg(feature = "nested-exceptions")]
                    let abrupt = self.try_catch()?;
                    #[cfg(not(feature = "nested-exceptions"))]
                    let abrupt = self.nonterminal_try_catch()?;
                    if abrupt && self.at_body_end() {
                        return Ok(());
                    }
                    continue;
                }
                #[cfg(not(feature = "nonterminal-exceptions"))]
                return self.try_catch();
            }
            return self.completion(None, false, false);
        }
    }

    #[cfg(feature = "nested-loops")]
    fn terminal_statement(&mut self) -> Result<(), CompileError> {
        loop {
            self.statement_prefix()?;
            if self.try_word_after_whitespace(b"if") {
                #[cfg(feature = "structured-statements")]
                let abrupt = self.structured_statement(StructuredStart::Conditional)?;
                #[cfg(not(feature = "structured-statements"))]
                let abrupt = self.control_statement(true)?;
                if abrupt && self.at_body_end() {
                    return Ok(());
                }
                continue;
            }
            if self.try_word_after_whitespace(b"while") {
                #[cfg(feature = "structured-statements")]
                self.structured_statement(StructuredStart::Loop)?;
                #[cfg(not(feature = "structured-statements"))]
                self.control_statement(false)?;
                continue;
            }
            #[cfg(feature = "exceptions")]
            if self.try_word_after_whitespace(b"try") {
                #[cfg(feature = "structured-statements")]
                {
                    let abrupt = self.structured_statement(StructuredStart::Exception)?;
                    if abrupt && self.at_body_end() {
                        return Ok(());
                    }
                    continue;
                }
                #[cfg(not(feature = "structured-statements"))]
                #[cfg(feature = "nonterminal-exceptions")]
                {
                    #[cfg(feature = "nested-exceptions")]
                    let abrupt = self.try_catch()?;
                    #[cfg(not(feature = "nested-exceptions"))]
                    let abrupt = self.nonterminal_try_catch()?;
                    if abrupt && self.at_body_end() {
                        return Ok(());
                    }
                    continue;
                }
                #[cfg(all(
                    not(feature = "structured-statements"),
                    not(feature = "nonterminal-exceptions")
                ))]
                return self.try_catch();
            }
            return self.completion(None, false, false);
        }
    }

    #[cfg(all(feature = "control-flow", not(feature = "nonterminal-conditionals")))]
    fn terminal_statement(&mut self) -> Result<(), CompileError> {
        loop {
            self.statement_prefix()?;
            if self.try_word_after_whitespace(b"if") {
                return self.if_else();
            }
            if self.try_word_after_whitespace(b"while") {
                self.while_loop()?;
                continue;
            }
            #[cfg(feature = "exceptions")]
            if self.try_word_after_whitespace(b"try") {
                #[cfg(feature = "nonterminal-exceptions")]
                {
                    #[cfg(feature = "nested-exceptions")]
                    let abrupt = self.try_catch()?;
                    #[cfg(not(feature = "nested-exceptions"))]
                    let abrupt = self.nonterminal_try_catch()?;
                    if abrupt && self.at_body_end() {
                        return Ok(());
                    }
                    continue;
                }
                #[cfg(not(feature = "nonterminal-exceptions"))]
                return self.try_catch();
            }
            return self.completion(None, false, false);
        }
    }

    #[cfg(any(
        feature = "nonterminal-conditionals",
        feature = "nonterminal-exceptions"
    ))]
    fn at_body_end(&self) -> bool {
        self.source.get(self.offset).is_none() || self.source.get(self.offset) == Some(&b'}')
    }

    #[cfg(not(feature = "control-flow"))]
    fn terminal_statement(&mut self) -> Result<(), CompileError> {
        self.statement_prefix()?;
        #[cfg(feature = "exceptions")]
        if self.try_word_after_whitespace(b"try") {
            return self.try_catch();
        }
        self.completion(None, false, false)
    }

    #[cfg(feature = "expression-statements")]
    fn statement_prefix(&mut self) -> Result<(), CompileError> {
        loop {
            self.property_assignments()?;
            self.local_assignments()?;
            self.whitespace();
            if self.at_terminal_statement() {
                return Ok(());
            }
            self.expression(None)?;
            if !self.consume(b';') {
                return Err(self.error(";"));
            }
            self.output.push(Opcode::DropTop as u8);
        }
    }

    #[cfg(not(feature = "expression-statements"))]
    fn statement_prefix(&mut self) -> Result<(), CompileError> {
        self.property_assignments()?;
        self.local_assignments()
    }

    #[cfg(feature = "expression-statements")]
    fn at_terminal_statement(&self) -> bool {
        let Some(byte) = self.source.get(self.offset) else {
            return true;
        };
        if *byte == b'}' {
            return true;
        }
        self.word_at_offset(b"return")
            || self.word_at_offset(b"throw")
            || cfg!(feature = "control-flow")
                && (self.word_at_offset(b"if") || self.word_at_offset(b"while"))
            || cfg!(feature = "exceptions") && self.word_at_offset(b"try")
    }

    #[cfg(feature = "expression-statements")]
    fn word_at_offset(&self, word: &[u8]) -> bool {
        self.source[self.offset..].starts_with(word)
            && self.identifier_end(self.offset + word.len())
    }

    #[cfg(feature = "functions")]
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

    #[cfg(not(feature = "functions"))]
    fn append_function_bodies(&mut self) -> Result<(), CompileError> {
        Ok(())
    }

    #[cfg(all(feature = "control-flow", not(feature = "nested-loops")))]
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
        self.statement_prefix()?;
        if !self.consume(b'}') {
            return Err(self.error("}"));
        }
        self.output.push(Opcode::Jump as u8);
        #[cfg(feature = "functions")]
        let loop_patch = self.output.len();
        self.output.extend_from_slice(&loop_start.to_le_bytes());
        let exit = u32::try_from(self.output.len())
            .map_err(|_| self.error("bytecode smaller than 4 GiB"))?;
        self.output[exit_patch..exit_patch + 4].copy_from_slice(&exit.to_le_bytes());
        #[cfg(feature = "functions")]
        {
            self.relocations.push(exit_patch);
            self.relocations.push(loop_patch);
        }
        Ok(())
    }

    #[cfg(all(
        feature = "control-flow",
        feature = "nonterminal-conditionals",
        not(feature = "nested-conditionals")
    ))]
    fn if_else(&mut self) -> Result<bool, CompileError> {
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
        let consequent_abrupt = self.conditional_branch()?;
        let join_patch = if consequent_abrupt {
            None
        } else {
            self.output.push(Opcode::Jump as u8);
            let patch = self.output.len();
            self.output.extend_from_slice(&0_u32.to_le_bytes());
            Some(patch)
        };
        if !self.try_word_after_whitespace(b"else") || !self.consume(b'{') {
            return Err(self.error("else {"));
        }
        let alternate = u32::try_from(self.output.len())
            .map_err(|_| self.error("bytecode smaller than 4 GiB"))?;
        self.output[alternate_patch..alternate_patch + 4].copy_from_slice(&alternate.to_le_bytes());
        #[cfg(feature = "functions")]
        self.relocations.push(alternate_patch);
        let alternate_abrupt = self.conditional_branch()?;
        if let Some(patch) = join_patch {
            let join = u32::try_from(self.output.len())
                .map_err(|_| self.error("bytecode smaller than 4 GiB"))?;
            self.output[patch..patch + 4].copy_from_slice(&join.to_le_bytes());
            #[cfg(feature = "functions")]
            self.relocations.push(patch);
        }
        self.whitespace();
        Ok(consequent_abrupt && alternate_abrupt)
    }

    #[cfg(all(feature = "nested-conditionals", not(feature = "nested-loops")))]
    fn if_else(&mut self) -> Result<bool, CompileError> {
        let mut frames = Vec::new();
        self.begin_conditional(&mut frames)?;
        loop {
            self.statement_prefix()?;
            self.whitespace();
            if self.try_word(b"if") {
                self.begin_conditional(&mut frames)?;
                continue;
            }
            let branch_abrupt = if self.source.get(self.offset) == Some(&b'}') {
                false
            } else {
                self.completion(None, false, false)?;
                true
            };
            if !self.consume(b'}') {
                return Err(self.error("}"));
            }
            let mut completed_abrupt = branch_abrupt;
            loop {
                let Some(frame) = frames.last_mut() else {
                    return Err(self.error("an active conditional frame"));
                };
                match frame.side {
                    ConditionalSide::Consequent => {
                        frame.consequent_abrupt = completed_abrupt;
                        if !completed_abrupt {
                            self.output.push(Opcode::Jump as u8);
                            let patch = self.output.len();
                            self.output.extend_from_slice(&0_u32.to_le_bytes());
                            frame.join_patch = Some(patch);
                        }
                        if !self.try_word_after_whitespace(b"else") || !self.consume(b'{') {
                            return Err(self.error("else {"));
                        }
                        let alternate = u32::try_from(self.output.len())
                            .map_err(|_| self.error("bytecode smaller than 4 GiB"))?;
                        self.output[frame.alternate_patch..frame.alternate_patch + 4]
                            .copy_from_slice(&alternate.to_le_bytes());
                        #[cfg(feature = "functions")]
                        self.relocations.push(frame.alternate_patch);
                        frame.side = ConditionalSide::Alternate;
                        break;
                    }
                    ConditionalSide::Alternate => {
                        if let Some(patch) = frame.join_patch {
                            let join = u32::try_from(self.output.len())
                                .map_err(|_| self.error("bytecode smaller than 4 GiB"))?;
                            self.output[patch..patch + 4].copy_from_slice(&join.to_le_bytes());
                            #[cfg(feature = "functions")]
                            self.relocations.push(patch);
                        }
                        completed_abrupt = frame.consequent_abrupt && completed_abrupt;
                        frames.pop();
                        if frames.is_empty() {
                            self.whitespace();
                            return Ok(completed_abrupt);
                        }
                        if completed_abrupt {
                            if !self.consume(b'}') {
                                return Err(self.error("}"));
                            }
                            continue;
                        }
                        break;
                    }
                }
            }
        }
    }

    #[cfg(all(feature = "nested-conditionals", not(feature = "nested-loops")))]
    fn begin_conditional(
        &mut self,
        frames: &mut Vec<ConditionalFrame>,
    ) -> Result<(), CompileError> {
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
        frames.push(ConditionalFrame {
            alternate_patch,
            join_patch: None,
            consequent_abrupt: false,
            side: ConditionalSide::Consequent,
        });
        Ok(())
    }

    #[cfg(all(feature = "nested-loops", not(feature = "structured-statements")))]
    fn control_statement(&mut self, conditional: bool) -> Result<bool, CompileError> {
        let mut frames = Vec::new();
        if conditional {
            self.begin_control_conditional(&mut frames)?;
        } else {
            self.begin_control_loop(&mut frames)?;
        }
        loop {
            self.statement_prefix()?;
            self.whitespace();
            if self.try_word(b"if") {
                self.begin_control_conditional(&mut frames)?;
                continue;
            }
            if self.try_word(b"while") {
                self.begin_control_loop(&mut frames)?;
                continue;
            }
            let branch_abrupt = if self.source.get(self.offset) == Some(&b'}') {
                false
            } else {
                self.completion(None, false, false)?;
                true
            };
            if !self.consume(b'}') {
                return Err(self.error("}"));
            }
            let mut completed_abrupt = branch_abrupt;
            loop {
                let Some(frame) = frames.pop() else {
                    return Err(self.error("an active control frame"));
                };
                match frame {
                    ControlFrame::Conditional {
                        alternate_patch,
                        alternate: false,
                        ..
                    } => {
                        let join_patch = if completed_abrupt {
                            None
                        } else {
                            self.output.push(Opcode::Jump as u8);
                            let patch = self.output.len();
                            self.output.extend_from_slice(&0_u32.to_le_bytes());
                            Some(patch)
                        };
                        if !self.try_word_after_whitespace(b"else") || !self.consume(b'{') {
                            return Err(self.error("else {"));
                        }
                        let alternate = u32::try_from(self.output.len())
                            .map_err(|_| self.error("bytecode smaller than 4 GiB"))?;
                        self.output[alternate_patch..alternate_patch + 4]
                            .copy_from_slice(&alternate.to_le_bytes());
                        #[cfg(feature = "functions")]
                        self.relocations.push(alternate_patch);
                        frames.push(ControlFrame::Conditional {
                            alternate_patch,
                            join_patch,
                            consequent_abrupt: completed_abrupt,
                            alternate: true,
                        });
                        break;
                    }
                    ControlFrame::Conditional {
                        join_patch,
                        consequent_abrupt,
                        alternate: true,
                        ..
                    } => {
                        if let Some(patch) = join_patch {
                            let join = u32::try_from(self.output.len())
                                .map_err(|_| self.error("bytecode smaller than 4 GiB"))?;
                            self.output[patch..patch + 4].copy_from_slice(&join.to_le_bytes());
                            #[cfg(feature = "functions")]
                            self.relocations.push(patch);
                        }
                        completed_abrupt = consequent_abrupt && completed_abrupt;
                    }
                    ControlFrame::Loop { start, exit_patch } => {
                        if !completed_abrupt {
                            self.output.push(Opcode::Jump as u8);
                            #[cfg(feature = "functions")]
                            let start_patch = self.output.len();
                            self.output.extend_from_slice(&start.to_le_bytes());
                            #[cfg(feature = "functions")]
                            self.relocations.push(start_patch);
                        }
                        let exit = u32::try_from(self.output.len())
                            .map_err(|_| self.error("bytecode smaller than 4 GiB"))?;
                        self.output[exit_patch..exit_patch + 4]
                            .copy_from_slice(&exit.to_le_bytes());
                        #[cfg(feature = "functions")]
                        self.relocations.push(exit_patch);
                        completed_abrupt = false;
                    }
                }
                if frames.is_empty() {
                    self.whitespace();
                    return Ok(completed_abrupt);
                }
                if completed_abrupt {
                    if !self.consume(b'}') {
                        return Err(self.error("}"));
                    }
                    continue;
                }
                break;
            }
        }
    }

    #[cfg(all(feature = "nested-loops", not(feature = "structured-statements")))]
    fn begin_control_conditional(
        &mut self,
        frames: &mut Vec<ControlFrame>,
    ) -> Result<(), CompileError> {
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
        frames.push(ControlFrame::Conditional {
            alternate_patch,
            join_patch: None,
            consequent_abrupt: false,
            alternate: false,
        });
        Ok(())
    }

    #[cfg(all(feature = "nested-loops", not(feature = "structured-statements")))]
    fn begin_control_loop(&mut self, frames: &mut Vec<ControlFrame>) -> Result<(), CompileError> {
        let start = u32::try_from(self.output.len())
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
        frames.push(ControlFrame::Loop { start, exit_patch });
        Ok(())
    }

    #[cfg(feature = "structured-statements")]
    fn structured_statement(&mut self, start: StructuredStart) -> Result<bool, CompileError> {
        let mut frames = Vec::new();
        self.begin_structured(&mut frames, start)?;
        loop {
            self.statement_prefix()?;
            self.whitespace();
            if self.try_word(b"if") {
                self.begin_structured(&mut frames, StructuredStart::Conditional)?;
                continue;
            }
            if self.try_word(b"while") {
                self.begin_structured(&mut frames, StructuredStart::Loop)?;
                continue;
            }
            if self.try_word(b"try") {
                if let Some(StructuredFrame::Catch {
                    binding, pending, ..
                }) = frames.last_mut()
                {
                    if *pending {
                        self.output.push(Opcode::Drop as u8);
                        *binding = None;
                        *pending = false;
                    }
                }
                self.begin_structured(&mut frames, StructuredStart::Exception)?;
                continue;
            }

            let fallthrough = self.source.get(self.offset) == Some(&b'}');
            if !fallthrough {
                let close_handlers = frames
                    .iter()
                    .filter(|frame| matches!(frame, StructuredFrame::Try { .. }))
                    .count();
                let (binding, pending_exception) = frames
                    .iter()
                    .rev()
                    .find_map(|frame| match frame {
                        StructuredFrame::Catch {
                            binding, pending, ..
                        } if *pending => Some((*binding, true)),
                        _ => None,
                    })
                    .unwrap_or((None, false));
                self.nested_exception_completion(binding, close_handlers, pending_exception)?;
            }
            if !self.consume(b'}') {
                return Err(self.error("}"));
            }

            let mut completed_abrupt = !fallthrough;
            loop {
                let Some(frame) = frames.pop() else {
                    return Err(self.error("an active structured frame"));
                };
                match frame {
                    StructuredFrame::Conditional {
                        alternate_patch,
                        alternate: false,
                        ..
                    } => {
                        let join_patch = if completed_abrupt {
                            None
                        } else {
                            self.output.push(Opcode::Jump as u8);
                            let patch = self.output.len();
                            self.output.extend_from_slice(&0_u32.to_le_bytes());
                            Some(patch)
                        };
                        if !self.try_word_after_whitespace(b"else") || !self.consume(b'{') {
                            return Err(self.error("else {"));
                        }
                        let alternate = u32::try_from(self.output.len())
                            .map_err(|_| self.error("bytecode smaller than 4 GiB"))?;
                        self.output[alternate_patch..alternate_patch + 4]
                            .copy_from_slice(&alternate.to_le_bytes());
                        #[cfg(feature = "functions")]
                        self.relocations.push(alternate_patch);
                        frames.push(StructuredFrame::Conditional {
                            alternate_patch,
                            join_patch,
                            consequent_abrupt: completed_abrupt,
                            alternate: true,
                        });
                        break;
                    }
                    StructuredFrame::Conditional {
                        join_patch,
                        consequent_abrupt,
                        alternate: true,
                        ..
                    } => {
                        if let Some(patch) = join_patch {
                            let join = u32::try_from(self.output.len())
                                .map_err(|_| self.error("bytecode smaller than 4 GiB"))?;
                            self.output[patch..patch + 4].copy_from_slice(&join.to_le_bytes());
                            #[cfg(feature = "functions")]
                            self.relocations.push(patch);
                        }
                        completed_abrupt = consequent_abrupt && completed_abrupt;
                    }
                    StructuredFrame::Loop { start, exit_patch } => {
                        if !completed_abrupt {
                            self.output.push(Opcode::Jump as u8);
                            #[cfg(feature = "functions")]
                            let start_patch = self.output.len();
                            self.output.extend_from_slice(&start.to_le_bytes());
                            #[cfg(feature = "functions")]
                            self.relocations.push(start_patch);
                        }
                        let exit = u32::try_from(self.output.len())
                            .map_err(|_| self.error("bytecode smaller than 4 GiB"))?;
                        self.output[exit_patch..exit_patch + 4]
                            .copy_from_slice(&exit.to_le_bytes());
                        #[cfg(feature = "functions")]
                        self.relocations.push(exit_patch);
                        completed_abrupt = false;
                    }
                    StructuredFrame::Try { catch_patch } => {
                        let try_fallthrough = !completed_abrupt;
                        let join_patch = if try_fallthrough {
                            self.output.push(Opcode::ConstImmediate as u8);
                            self.output.push(Immediate::Undefined as u8);
                            self.output.push(Opcode::EndTry as u8);
                            self.output.push(Opcode::Drop as u8);
                            self.output.push(Opcode::Jump as u8);
                            let patch = self.output.len();
                            self.output.extend_from_slice(&0_u32.to_le_bytes());
                            Some(patch)
                        } else {
                            None
                        };
                        let binding = self.catch_header(catch_patch)?;
                        frames.push(StructuredFrame::Catch {
                            binding,
                            join_patch,
                            try_fallthrough,
                            pending: true,
                        });
                        break;
                    }
                    StructuredFrame::Catch {
                        join_patch,
                        try_fallthrough,
                        pending,
                        ..
                    } => {
                        let catch_fallthrough = !completed_abrupt;
                        if catch_fallthrough && pending {
                            self.output.push(Opcode::Drop as u8);
                        }
                        let join = u32::try_from(self.output.len())
                            .map_err(|_| self.error("bytecode smaller than 4 GiB"))?;
                        if let Some(patch) = join_patch {
                            self.output[patch..patch + 4].copy_from_slice(&join.to_le_bytes());
                            #[cfg(feature = "functions")]
                            self.relocations.push(patch);
                        }
                        completed_abrupt = !try_fallthrough && !catch_fallthrough;
                    }
                }
                if frames.is_empty() {
                    self.whitespace();
                    return Ok(completed_abrupt);
                }
                if completed_abrupt {
                    if !self.consume(b'}') {
                        return Err(self.error("}"));
                    }
                    continue;
                }
                break;
            }
        }
    }

    #[cfg(feature = "structured-statements")]
    fn begin_structured(
        &mut self,
        frames: &mut Vec<StructuredFrame>,
        start: StructuredStart,
    ) -> Result<(), CompileError> {
        match start {
            StructuredStart::Conditional => {
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
                frames.push(StructuredFrame::Conditional {
                    alternate_patch,
                    join_patch: None,
                    consequent_abrupt: false,
                    alternate: false,
                });
            }
            StructuredStart::Loop => {
                let start = u32::try_from(self.output.len())
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
                frames.push(StructuredFrame::Loop { start, exit_patch });
            }
            StructuredStart::Exception => {
                if !self.consume(b'{') {
                    return Err(self.error("{"));
                }
                let catch_patch = self.output.len() + 1;
                self.output.push(Opcode::Try as u8);
                self.output.extend_from_slice(&0_u32.to_le_bytes());
                frames.push(StructuredFrame::Try { catch_patch });
            }
        }
        Ok(())
    }

    #[cfg(all(
        feature = "nonterminal-conditionals",
        not(feature = "nested-conditionals")
    ))]
    fn conditional_branch(&mut self) -> Result<bool, CompileError> {
        self.statement_prefix()?;
        self.whitespace();
        if self.consume_raw(b'}') {
            return Ok(false);
        }
        self.completion(None, false, false)?;
        if !self.consume(b'}') {
            return Err(self.error("}"));
        }
        Ok(true)
    }

    #[cfg(all(feature = "control-flow", not(feature = "nonterminal-conditionals")))]
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
        self.statement_prefix()?;
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
        #[cfg(feature = "functions")]
        self.relocations.push(alternate_patch);
        self.statement_prefix()?;
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

    #[cfg(feature = "functions")]
    fn frame_declarations(&mut self, count_patch: &mut Option<usize>) -> Result<(), CompileError> {
        loop {
            self.whitespace();
            if self.try_word(b"function") {
                self.function_declaration(count_patch, false)?;
            } else if cfg!(feature = "classes") && self.try_word(b"class") {
                #[cfg(feature = "classes")]
                self.class_declaration(count_patch)?;
            } else if cfg!(feature = "async-functions") && self.try_async_function() {
                self.function_declaration(count_patch, true)?;
            } else if self.try_word(b"let") {
                self.let_declaration(count_patch)?;
            } else if cfg!(feature = "var-declarations") && self.try_word(b"var") {
                #[cfg(feature = "var-declarations")]
                self.let_declaration(count_patch)?;
            } else {
                break;
            }
        }
        Ok(())
    }

    #[cfg(all(feature = "locals", not(feature = "functions")))]
    fn frame_declarations(&mut self, count_patch: &mut Option<usize>) -> Result<(), CompileError> {
        loop {
            self.whitespace();
            if self.try_word(b"let") {
                self.let_declaration(count_patch)?;
            } else if cfg!(feature = "var-declarations") && self.try_word(b"var") {
                #[cfg(feature = "var-declarations")]
                self.let_declaration(count_patch)?;
            } else {
                return Ok(());
            }
        }
    }

    #[cfg(not(feature = "locals"))]
    fn frame_declarations(&mut self, _count_patch: &mut Option<usize>) -> Result<(), CompileError> {
        Ok(())
    }

    #[cfg(feature = "locals")]
    fn let_declaration(&mut self, count_patch: &mut Option<usize>) -> Result<(), CompileError> {
        if count_patch.is_none() {
            self.output.push(Opcode::InitLocals as u8);
            *count_patch = Some(self.output.len());
            self.output.extend_from_slice(&0_u16.to_le_bytes());
        }
        loop {
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
                #[cfg(feature = "environments")]
                captured: false,
            });
            if !self.consume(b',') {
                break;
            }
        }
        if !self.consume(b';') {
            return Err(self.error(";"));
        }
        self.whitespace();
        Ok(())
    }

    #[cfg(feature = "functions")]
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
            #[cfg(feature = "environments")]
            captured: false,
        });
        let parameters = self.function_parameters()?;
        self.function_value(
            parameters,
            Some(slot),
            FunctionBody::Block,
            None,
            asynchronous,
            !asynchronous,
        )?;
        Ok(())
    }

    #[cfg(all(feature = "classes", not(feature = "class-default-constructors")))]
    fn class_declaration(&mut self, count_patch: &mut Option<usize>) -> Result<(), CompileError> {
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
            #[cfg(feature = "environments")]
            captured: false,
        });
        if !self.consume(b'{') || !self.try_word_after_whitespace(b"constructor") {
            return Err(self.error("{ constructor"));
        }
        let parameters = self.function_parameters()?;
        self.function_value(
            parameters,
            Some(slot),
            FunctionBody::ClassConstructor,
            None,
            false,
            true,
        )?;
        #[cfg(not(feature = "class-methods"))]
        if !self.consume(b'}') {
            return Err(self.error("}"));
        }
        #[cfg(feature = "class-methods")]
        loop {
            self.whitespace();
            if self.consume_raw(b'}') {
                break;
            }
            self.class_method(slot)?;
        }
        self.consume(b';');
        self.whitespace();
        Ok(())
    }

    #[cfg(feature = "class-default-constructors")]
    fn class_declaration(&mut self, count_patch: &mut Option<usize>) -> Result<(), CompileError> {
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
            #[cfg(feature = "environments")]
            captured: false,
        });
        if !self.consume(b'{') {
            return Err(self.error("{"));
        }
        if self.try_word_after_whitespace(b"constructor") {
            let parameters = self.function_parameters()?;
            self.function_value(
                parameters,
                Some(slot),
                FunctionBody::ClassConstructor,
                None,
                false,
                true,
            )?;
        } else {
            self.default_class_constructor(slot);
        }
        #[cfg(not(feature = "class-methods"))]
        if !self.consume(b'}') {
            return Err(self.error("}"));
        }
        #[cfg(feature = "class-methods")]
        loop {
            self.whitespace();
            if self.consume_raw(b'}') {
                break;
            }
            self.class_method(slot)?;
        }
        self.consume(b';');
        self.whitespace();
        Ok(())
    }

    #[cfg(feature = "class-default-constructors")]
    fn default_class_constructor(&mut self, destination: u16) {
        self.output.push(Opcode::Closure as u8);
        let target_patch = self.output.len();
        self.output.extend_from_slice(&0_u32.to_le_bytes());
        self.output.extend_from_slice(&0_u16.to_le_bytes());
        self.output.push(Opcode::ToClassConstructor as u8);
        self.output.push(Opcode::StoreLocal as u8);
        self.output.extend_from_slice(&destination.to_le_bytes());
        let code = self
            .initial_function_frame(0, true)
            .into_iter()
            .chain([Opcode::LoadThis as u8, Opcode::ReturnReceiverLocals as u8])
            .collect();
        self.functions.push(PendingFunction {
            target_patch,
            code,
            relocations: Vec::new(),
        });
    }

    #[cfg(all(feature = "class-methods", not(feature = "class-static-methods")))]
    fn class_method(&mut self, class_slot: u16) -> Result<(), CompileError> {
        let (name_start, name_end) = self.identifier()?;
        let parameters = self.function_parameters()?;
        self.output.push(Opcode::LoadLocal as u8);
        self.output.extend_from_slice(&class_slot.to_le_bytes());
        self.output.push(Opcode::ConstAtom as u8);
        self.output
            .extend_from_slice(&(b"prototype".len() as u16).to_le_bytes());
        self.output.extend_from_slice(b"prototype");
        self.output.push(Opcode::GetProperty as u8);
        self.output_atom_range(name_start, name_end);
        self.function_value(parameters, None, FunctionBody::Method, None, false, false)?;
        self.output.push(Opcode::SetPropertyStatement as u8);
        Ok(())
    }

    #[cfg(feature = "class-static-methods")]
    fn class_method(&mut self, class_slot: u16) -> Result<(), CompileError> {
        let static_method = self.try_word(b"static");
        if static_method {
            self.whitespace();
        }
        let (name_start, name_end) = self.identifier()?;
        let parameters = self.function_parameters()?;
        self.output.push(Opcode::LoadLocal as u8);
        self.output.extend_from_slice(&class_slot.to_le_bytes());
        if !static_method {
            self.output.push(Opcode::ConstAtom as u8);
            self.output
                .extend_from_slice(&(b"prototype".len() as u16).to_le_bytes());
            self.output.extend_from_slice(b"prototype");
            self.output.push(Opcode::GetProperty as u8);
        }
        self.output_atom_range(name_start, name_end);
        self.function_value(parameters, None, FunctionBody::Method, None, false, false)?;
        self.output.push(Opcode::SetPropertyStatement as u8);
        Ok(())
    }

    #[cfg(feature = "function-arguments")]
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
                #[cfg(feature = "environments")]
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

    #[cfg(all(feature = "functions", not(feature = "function-arguments")))]
    fn function_parameters(&mut self) -> Result<Vec<Binding>, CompileError> {
        if !self.consume(b'(') {
            return Err(self.error("("));
        }
        if !self.consume(b')') {
            return Err(self.error(")"));
        }
        Ok(Vec::new())
    }

    #[cfg(feature = "functions")]
    fn try_arrow_parameters(&mut self) -> Result<Option<Vec<Binding>>, CompileError> {
        let start = self.offset;
        let parameters = if self.source.get(self.offset) == Some(&b'(') {
            match self.function_parameters() {
                Ok(parameters) => parameters,
                Err(_) => {
                    self.offset = start;
                    return Ok(None);
                }
            }
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
                #[cfg(feature = "environments")]
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

    #[cfg(feature = "functions")]
    fn function_value(
        &mut self,
        parameters: Vec<Binding>,
        destination: Option<u16>,
        body_kind: FunctionBody,
        expression_name: Option<Binding>,
        asynchronous: bool,
        constructible: bool,
    ) -> Result<(), CompileError> {
        let receiver_frame = constructible && cfg!(feature = "constructors");
        #[cfg(feature = "class-methods")]
        let receiver_frame = receiver_frame || matches!(body_kind, FunctionBody::Method);
        if !matches!(body_kind, FunctionBody::Expression) && !self.consume(b'{') {
            return Err(self.error("{"));
        }
        let parameter_count = u16::try_from(parameters.len())
            .map_err(|_| self.error("fewer than 65536 parameters"))?;
        #[cfg(feature = "environments")]
        let outer_bindings = {
            let mut bindings = self.outer_bindings.clone();
            bindings.extend_from_slice(&self.locals);
            bindings.extend(expression_name);
            bindings
        };
        let mut body = Parser {
            source: self.source,
            offset: self.offset,
            output: self.initial_function_frame(parameter_count, receiver_frame),
            #[cfg(feature = "host-bindings")]
            host_globals: self.host_globals.clone(),
            locals: parameters,
            #[cfg(feature = "environments")]
            outer_bindings,
            #[cfg(feature = "environments")]
            captures: expression_name.into_iter().collect(),
            functions: Vec::new(),
            relocations: Vec::new(),
            function_frame: true,
            #[cfg(feature = "receivers")]
            receiver_frame,
            #[cfg(any(feature = "number-negation", feature = "number-operations"))]
            options: self.options,
        };
        let mut body_count_patch = Some(1);
        if !matches!(body_kind, FunctionBody::Expression) {
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
            #[cfg(feature = "classes")]
            FunctionBody::ClassConstructor => {
                body.statement_prefix()?;
                body.whitespace();
                if body.source.get(body.offset) == Some(&b'}') {
                    body.output.push(Opcode::LoadThis as u8);
                    body.output.push(Opcode::ReturnReceiverLocals as u8);
                } else {
                    body.terminal_statement()?;
                }
                if !body.consume(b'}') {
                    return Err(body.error("}"));
                }
            }
            #[cfg(feature = "class-methods")]
            FunctionBody::Method => {
                body.terminal_statement()?;
                if !body.consume(b'}') {
                    return Err(body.error("}"));
                }
            }
        }
        body.whitespace();
        body.append_function_bodies()?;
        self.offset = body.offset;

        #[cfg(feature = "environments")]
        let (capture_count, self_captured) =
            self.emit_capture_sources(&body, expression_name, destination)?;
        #[cfg(not(feature = "environments"))]
        let capture_count = 0_u16;
        self.output
            .push(self.closure_opcode(expression_name.is_some(), asynchronous) as u8);
        let target_patch = self.output.len();
        self.output.extend_from_slice(&0_u32.to_le_bytes());
        self.output.extend_from_slice(&capture_count.to_le_bytes());
        #[cfg(feature = "class-methods")]
        if matches!(body_kind, FunctionBody::Method) {
            self.output.push(Opcode::ToMethod as u8);
        }
        #[cfg(feature = "constructors")]
        if constructible {
            #[cfg(feature = "classes")]
            let constructor_opcode = if matches!(body_kind, FunctionBody::ClassConstructor) {
                Opcode::ToClassConstructor
            } else {
                Opcode::ToConstructor
            };
            #[cfg(not(feature = "classes"))]
            let constructor_opcode = Opcode::ToConstructor;
            self.output.push(constructor_opcode as u8);
            #[cfg(feature = "recursive-constructors")]
            if expression_name.is_some() {
                self.output.push(Opcode::RebindConstructorSelf as u8);
            }
        }
        #[cfg(not(feature = "constructors"))]
        let _ = constructible;
        #[cfg(feature = "environments")]
        if self_captured {
            self.output.push(Opcode::StoreEnvironmentCell as u8);
        } else if let Some(slot) = destination {
            self.output.push(Opcode::StoreLocal as u8);
            self.output.extend_from_slice(&slot.to_le_bytes());
        }
        #[cfg(not(feature = "environments"))]
        if let Some(slot) = destination {
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

    #[cfg(feature = "function-arguments")]
    fn initial_function_frame(&self, parameter_count: u16, constructible: bool) -> Vec<u8> {
        #[cfg(feature = "receivers")]
        if constructible {
            return Builder::new()
                .init_receiver_frame(parameter_count, parameter_count)
                .finish();
        }
        #[cfg(not(feature = "receivers"))]
        let _ = constructible;
        Builder::new()
            .init_frame(parameter_count, parameter_count)
            .finish()
    }

    #[cfg(all(feature = "functions", not(feature = "function-arguments")))]
    fn initial_function_frame(&self, parameter_count: u16, constructible: bool) -> Vec<u8> {
        debug_assert_eq!(parameter_count, 0);
        let _ = constructible;
        Builder::new().init_locals(0).finish()
    }

    #[cfg(feature = "environments")]
    fn emit_capture_sources(
        &mut self,
        body: &Parser<'_>,
        expression_name: Option<Binding>,
        destination: Option<u16>,
    ) -> Result<(u16, bool), CompileError> {
        let mut sources = Vec::with_capacity(body.captures.len());
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
                sources.push(CaptureSource::Local(index));
            } else if self
                .outer_bindings
                .iter()
                .any(|binding| same_binding(*binding, *capture))
            {
                sources.push(CaptureSource::Outer(self.intern_capture(*capture)?));
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
        let count =
            u16::try_from(sources.len()).map_err(|_| self.error("fewer than 65536 captures"))?;
        for source in sources {
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
        Ok((count, self_captured))
    }

    #[cfg(feature = "functions")]
    fn closure_opcode(&self, named: bool, asynchronous: bool) -> Opcode {
        #[cfg(feature = "async-functions")]
        if asynchronous {
            #[cfg(feature = "recursive-async-functions")]
            if named {
                return Opcode::RecursiveAsyncClosure;
            }
            return Opcode::AsyncClosure;
        }
        #[cfg(not(feature = "async-functions"))]
        let _ = asynchronous;
        #[cfg(feature = "recursive-functions")]
        if named {
            return Opcode::RecursiveClosure;
        }
        #[cfg(not(feature = "recursive-functions"))]
        let _ = named;
        Opcode::Closure
    }

    #[cfg(feature = "property-assignment")]
    fn property_assignments(&mut self) -> Result<(), CompileError> {
        loop {
            self.whitespace();
            let source_start = self.offset;
            let output_start = self.output.len();
            if !self.property_receiver_term() && !self.property_local_term() {
                return Ok(());
            }
            if !self.consume(b'.') {
                self.offset = source_start;
                self.output.truncate(output_start);
                return Ok(());
            }
            self.whitespace();
            let (key_start, key_end) = self.identifier()?;
            if !self.consume(b'=') {
                self.offset = source_start;
                self.output.truncate(output_start);
                return Ok(());
            }
            self.output_atom_range(key_start, key_end);
            self.expression(None)?;
            self.output.push(Opcode::SetPropertyStatement as u8);
            if !self.consume(b';') {
                return Err(self.error(";"));
            }
        }
    }

    #[cfg(not(feature = "property-assignment"))]
    fn property_assignments(&mut self) -> Result<(), CompileError> {
        Ok(())
    }

    #[cfg(all(feature = "property-assignment", feature = "receivers"))]
    fn property_receiver_term(&mut self) -> bool {
        self.receiver_term()
    }

    #[cfg(all(feature = "property-assignment", not(feature = "receivers")))]
    fn property_receiver_term(&mut self) -> bool {
        false
    }

    #[cfg(all(feature = "property-assignment", feature = "locals"))]
    fn property_local_term(&mut self) -> bool {
        let Some(local) = self.local_at_offset() else {
            return false;
        };
        self.offset += local.end - local.start;
        self.output.push(Opcode::LoadLocal as u8);
        self.output.extend_from_slice(&local.slot.to_le_bytes());
        #[cfg(feature = "environments")]
        if local.captured {
            self.output.push(Opcode::LoadEnvironmentCell as u8);
        }
        true
    }

    #[cfg(all(feature = "property-assignment", not(feature = "locals")))]
    fn property_local_term(&mut self) -> bool {
        false
    }

    #[cfg(feature = "environments")]
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

    #[cfg(all(feature = "functions", not(feature = "environments")))]
    fn local_assignments(&mut self) -> Result<(), CompileError> {
        loop {
            self.whitespace();
            let start = self.offset;
            let Some(binding) = self.local_at_offset() else {
                return Ok(());
            };
            self.offset += binding.end - binding.start;
            if !self.consume(b'=') {
                self.offset = start;
                return Ok(());
            }
            self.expression(None)?;
            self.output.push(Opcode::StoreLocal as u8);
            self.output.extend_from_slice(&binding.slot.to_le_bytes());
            if !self.consume(b';') {
                return Err(self.error(";"));
            }
        }
    }

    #[cfg(all(feature = "locals", not(feature = "functions")))]
    fn local_assignments(&mut self) -> Result<(), CompileError> {
        loop {
            self.whitespace();
            let start = self.offset;
            let Some(binding) = self.local_at_offset() else {
                return Ok(());
            };
            self.offset += binding.end - binding.start;
            if !self.consume(b'=') {
                self.offset = start;
                return Ok(());
            }
            self.expression(None)?;
            self.output.push(Opcode::StoreLocal as u8);
            self.output.extend_from_slice(&binding.slot.to_le_bytes());
            if !self.consume(b';') {
                return Err(self.error(";"));
            }
        }
    }

    #[cfg(not(feature = "locals"))]
    fn local_assignments(&mut self) -> Result<(), CompileError> {
        Ok(())
    }

    #[cfg(all(
        feature = "exceptions",
        not(feature = "nested-exceptions"),
        not(feature = "nonterminal-exceptions")
    ))]
    fn try_catch(&mut self) -> Result<(), CompileError> {
        if !self.consume(b'{') {
            return Err(self.error("{"));
        }
        let catch_patch = self.output.len() + 1;
        self.output.push(Opcode::Try as u8);
        self.output.extend_from_slice(&0_u32.to_le_bytes());
        self.statement_prefix()?;
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
        #[cfg(feature = "functions")]
        self.relocations.push(catch_patch);
        self.statement_prefix()?;
        self.completion(binding, false, true)?;
        if !self.consume(b'}') {
            return Err(self.error("}"));
        }
        self.whitespace();
        Ok(())
    }

    #[cfg(all(feature = "nonterminal-exceptions", not(feature = "nested-exceptions")))]
    fn nonterminal_try_catch(&mut self) -> Result<bool, CompileError> {
        if !self.consume(b'{') {
            return Err(self.error("{"));
        }
        let catch_patch = self.output.len() + 1;
        self.output.push(Opcode::Try as u8);
        self.output.extend_from_slice(&0_u32.to_le_bytes());
        self.statement_prefix()?;
        self.whitespace();
        let try_fallthrough = self.source.get(self.offset) == Some(&b'}');
        let join_patch = if try_fallthrough {
            self.output.push(Opcode::ConstImmediate as u8);
            self.output.push(Immediate::Undefined as u8);
            self.output.push(Opcode::EndTry as u8);
            self.output.push(Opcode::Drop as u8);
            self.output.push(Opcode::Jump as u8);
            let patch = self.output.len();
            self.output.extend_from_slice(&0_u32.to_le_bytes());
            Some(patch)
        } else {
            self.completion(None, true, false)?;
            None
        };
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
        #[cfg(feature = "functions")]
        self.relocations.push(catch_patch);
        self.statement_prefix()?;
        self.whitespace();
        let catch_fallthrough = self.source.get(self.offset) == Some(&b'}');
        if catch_fallthrough {
            self.output.push(Opcode::Drop as u8);
        } else {
            self.completion(binding, false, true)?;
        }
        if !self.consume(b'}') {
            return Err(self.error("}"));
        }
        let join = u32::try_from(self.output.len())
            .map_err(|_| self.error("bytecode smaller than 4 GiB"))?;
        if let Some(patch) = join_patch {
            self.output[patch..patch + 4].copy_from_slice(&join.to_le_bytes());
            #[cfg(feature = "functions")]
            self.relocations.push(patch);
        }
        self.whitespace();
        Ok(!try_fallthrough && !catch_fallthrough)
    }

    #[cfg(all(feature = "nested-exceptions", not(feature = "structured-statements")))]
    fn try_catch(&mut self) -> Result<bool, CompileError> {
        let mut frames = Vec::new();
        self.begin_exception(&mut frames)?;
        loop {
            self.statement_prefix()?;
            if self.try_word_after_whitespace(b"try") {
                if let Some(ExceptionFrame::Catch {
                    binding, pending, ..
                }) = frames.last_mut()
                {
                    if *pending {
                        self.output.push(Opcode::Drop as u8);
                        *binding = None;
                        *pending = false;
                    }
                }
                self.begin_exception(&mut frames)?;
                continue;
            }

            self.whitespace();
            let fallthrough = self.source.get(self.offset) == Some(&b'}');
            if !fallthrough {
                let close_handlers = frames
                    .iter()
                    .filter(|frame| matches!(frame, ExceptionFrame::Try { .. }))
                    .count();
                let (binding, pending_exception) = match frames.last() {
                    Some(ExceptionFrame::Catch {
                        binding, pending, ..
                    }) => (*binding, *pending),
                    _ => (None, false),
                };
                self.nested_exception_completion(binding, close_handlers, pending_exception)?;
            }
            if !self.consume(b'}') {
                return Err(self.error("}"));
            }

            let mut completed_abrupt = !fallthrough;
            loop {
                let Some(frame) = frames.pop() else {
                    return Err(self.error("an active exception frame"));
                };
                match frame {
                    ExceptionFrame::Try { catch_patch } => {
                        let try_fallthrough = !completed_abrupt;
                        let join_patch = if try_fallthrough {
                            self.output.push(Opcode::ConstImmediate as u8);
                            self.output.push(Immediate::Undefined as u8);
                            self.output.push(Opcode::EndTry as u8);
                            self.output.push(Opcode::Drop as u8);
                            self.output.push(Opcode::Jump as u8);
                            let patch = self.output.len();
                            self.output.extend_from_slice(&0_u32.to_le_bytes());
                            Some(patch)
                        } else {
                            None
                        };
                        let binding = self.catch_header(catch_patch)?;
                        frames.push(ExceptionFrame::Catch {
                            binding,
                            join_patch,
                            try_fallthrough,
                            pending: true,
                        });
                        break;
                    }
                    ExceptionFrame::Catch {
                        join_patch,
                        try_fallthrough,
                        pending,
                        ..
                    } => {
                        let catch_fallthrough = !completed_abrupt;
                        if catch_fallthrough && pending {
                            self.output.push(Opcode::Drop as u8);
                        }
                        let join = u32::try_from(self.output.len())
                            .map_err(|_| self.error("bytecode smaller than 4 GiB"))?;
                        if let Some(patch) = join_patch {
                            self.output[patch..patch + 4].copy_from_slice(&join.to_le_bytes());
                            #[cfg(feature = "functions")]
                            self.relocations.push(patch);
                        }
                        completed_abrupt = !try_fallthrough && !catch_fallthrough;
                        if frames.is_empty() {
                            self.whitespace();
                            return Ok(completed_abrupt);
                        }
                        if !completed_abrupt {
                            break;
                        }
                        if !self.consume(b'}') {
                            return Err(self.error("}"));
                        }
                    }
                }
            }
        }
    }

    #[cfg(all(feature = "nested-exceptions", not(feature = "structured-statements")))]
    fn begin_exception(&mut self, frames: &mut Vec<ExceptionFrame>) -> Result<(), CompileError> {
        if !self.consume(b'{') {
            return Err(self.error("{"));
        }
        let catch_patch = self.output.len() + 1;
        self.output.push(Opcode::Try as u8);
        self.output.extend_from_slice(&0_u32.to_le_bytes());
        frames.push(ExceptionFrame::Try { catch_patch });
        Ok(())
    }

    #[cfg(feature = "nested-exceptions")]
    fn catch_header(&mut self, catch_patch: usize) -> Result<Option<(usize, usize)>, CompileError> {
        if !self.try_word_after_whitespace(b"catch") {
            return Err(self.error("catch"));
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
        #[cfg(feature = "functions")]
        self.relocations.push(catch_patch);
        Ok(binding)
    }

    #[cfg(feature = "nested-exceptions")]
    fn nested_exception_completion(
        &mut self,
        binding: Option<(usize, usize)>,
        close_handlers: usize,
        pending_exception: bool,
    ) -> Result<(), CompileError> {
        self.whitespace();
        let returning = self.source[self.offset..].starts_with(b"return")
            && self.identifier_end(self.offset + b"return".len())
            || cfg!(feature = "implicit-completions")
                && (self.source.get(self.offset).is_none()
                    || self.source.get(self.offset) == Some(&b'}'));
        self.completion(binding, false, pending_exception)?;
        if returning {
            let return_offset = self
                .output
                .len()
                .checked_sub(1)
                .ok_or_else(|| self.error("a return instruction"))?;
            self.output.splice(
                return_offset..return_offset,
                core::iter::repeat_n(Opcode::EndTry as u8, close_handlers),
            );
        }
        Ok(())
    }

    #[cfg(feature = "implicit-completions")]
    fn completion(
        &mut self,
        binding: Option<(usize, usize)>,
        close_handler: bool,
        pending_exception: bool,
    ) -> Result<(), CompileError> {
        #[cfg(not(feature = "exceptions"))]
        let _ = (close_handler, pending_exception);
        self.whitespace();
        let (returning, undefined) = if self.try_word(b"return") {
            self.whitespace();
            (true, self.consume_raw(b';'))
        } else if self.try_word(b"throw") {
            (false, false)
        } else if self.source.get(self.offset).is_none()
            || self.source.get(self.offset) == Some(&b'}')
        {
            (true, true)
        } else {
            return Err(self.error("return or throw"));
        };
        #[cfg(feature = "exceptions")]
        if pending_exception && undefined {
            self.output.push(Opcode::Drop as u8);
        }
        if undefined {
            self.output.push(Opcode::ConstImmediate as u8);
            self.output.push(Immediate::Undefined as u8);
        }
        #[cfg(feature = "exceptions")]
        if !undefined {
            let expression_start = self.output.len();
            let used_binding = self.expression(binding)?;
            if pending_exception && !used_binding {
                self.output.insert(expression_start, Opcode::Drop as u8);
            }
        }
        #[cfg(not(feature = "exceptions"))]
        if !undefined {
            self.expression(binding)?;
        }
        if !undefined && self.consume(b';') {
            self.whitespace();
        }
        #[cfg(feature = "exceptions")]
        if close_handler && returning {
            self.output.push(Opcode::EndTry as u8);
        }
        if returning {
            #[cfg(feature = "receivers")]
            if self.receiver_frame {
                self.output.push(Opcode::ReturnReceiverLocals as u8);
                return Ok(());
            }
            #[cfg(feature = "locals")]
            let plain_return = self.locals.is_empty() && {
                #[cfg(feature = "functions")]
                {
                    !self.function_frame
                }
                #[cfg(not(feature = "functions"))]
                {
                    true
                }
            };
            #[cfg(feature = "locals")]
            self.output.push(if plain_return {
                Opcode::Return as u8
            } else {
                Opcode::ReturnLocals as u8
            });
            #[cfg(not(feature = "locals"))]
            self.output.push(Opcode::Return as u8);
        } else {
            self.output.push(Opcode::Throw as u8);
        }
        Ok(())
    }

    #[cfg(not(feature = "implicit-completions"))]
    fn completion(
        &mut self,
        binding: Option<(usize, usize)>,
        close_handler: bool,
        pending_exception: bool,
    ) -> Result<(), CompileError> {
        #[cfg(not(feature = "exceptions"))]
        let _ = (close_handler, pending_exception);
        self.whitespace();
        let returning = if self.try_word(b"return") {
            true
        } else if self.try_word(b"throw") {
            false
        } else {
            return Err(self.error("return or throw"));
        };
        #[cfg(feature = "exceptions")]
        {
            let expression_start = self.output.len();
            let used_binding = self.expression(binding)?;
            if pending_exception && !used_binding {
                self.output.insert(expression_start, Opcode::Drop as u8);
            }
        }
        #[cfg(not(feature = "exceptions"))]
        self.expression(binding)?;
        if self.consume(b';') {
            self.whitespace();
        }
        #[cfg(feature = "exceptions")]
        if close_handler && returning {
            self.output.push(Opcode::EndTry as u8);
        }
        if returning {
            #[cfg(feature = "receivers")]
            if self.receiver_frame {
                self.output.push(Opcode::ReturnReceiverLocals as u8);
                return Ok(());
            }
            #[cfg(feature = "locals")]
            let plain_return = self.locals.is_empty() && {
                #[cfg(feature = "functions")]
                {
                    !self.function_frame
                }
                #[cfg(not(feature = "functions"))]
                {
                    true
                }
            };
            #[cfg(feature = "locals")]
            self.output.push(if plain_return {
                Opcode::Return as u8
            } else {
                Opcode::ReturnLocals as u8
            });
            #[cfg(not(feature = "locals"))]
            self.output.push(Opcode::Return as u8);
        } else {
            self.output.push(Opcode::Throw as u8);
        }
        Ok(())
    }

    #[cfg(any(
        feature = "array-assignment-expressions",
        feature = "captured-assignment-expressions",
        feature = "local-assignment-expressions",
        feature = "property-assignment-expressions"
    ))]
    fn expression(&mut self, binding: Option<(usize, usize)>) -> Result<bool, CompileError> {
        self.whitespace();
        #[cfg(feature = "array-assignment-expressions")]
        if self.array_assignment_expression()? {
            return Ok(false);
        }
        #[cfg(feature = "property-assignment-expressions")]
        if self.property_assignment_expression()? {
            return Ok(false);
        }
        let start = self.offset;
        if let Some(local) = self.local_at_offset() {
            self.offset += local.end - local.start;
            #[cfg(feature = "environments")]
            if local.captured && self.consume_plain_assignment() {
                #[cfg(feature = "captured-assignment-expressions")]
                {
                    self.output.push(Opcode::LoadLocal as u8);
                    self.output.extend_from_slice(&local.slot.to_le_bytes());
                    self.expression(None)?;
                    self.output.push(Opcode::StoreEnvironmentCellResult as u8);
                    return Ok(false);
                }
            }
            #[cfg(not(feature = "environments"))]
            let local_is_captured = false;
            #[cfg(feature = "environments")]
            let local_is_captured = local.captured;
            if !local_is_captured && self.consume_plain_assignment() {
                #[cfg(feature = "local-assignment-expressions")]
                {
                    self.expression(None)?;
                    self.output.push(Opcode::DuplicateTop as u8);
                    self.output.push(Opcode::StoreLocal as u8);
                    self.output.extend_from_slice(&local.slot.to_le_bytes());
                    return Ok(false);
                }
            }
        }
        self.offset = start;
        #[cfg(feature = "captured-assignment-expressions")]
        if let Some(capture) = self.outer_binding_at_offset() {
            self.offset += capture.end - capture.start;
            if self.consume_plain_assignment() {
                let index = self.intern_capture(capture)?;
                self.output.push(Opcode::LoadCapture as u8);
                self.output.extend_from_slice(&index.to_le_bytes());
                self.expression(None)?;
                self.output.push(Opcode::StoreEnvironmentCellResult as u8);
                return Ok(false);
            }
        }
        self.offset = start;
        let (used_binding, _) = self.conditional(binding)?;
        Ok(used_binding)
    }

    #[cfg(not(any(
        feature = "array-assignment-expressions",
        feature = "captured-assignment-expressions",
        feature = "local-assignment-expressions",
        feature = "property-assignment-expressions"
    )))]
    fn expression(&mut self, binding: Option<(usize, usize)>) -> Result<bool, CompileError> {
        let (used_binding, _) = self.conditional(binding)?;
        Ok(used_binding)
    }

    #[cfg(feature = "conditional-expressions")]
    fn conditional(
        &mut self,
        binding: Option<(usize, usize)>,
    ) -> Result<(bool, TermKind), CompileError> {
        let (used_binding, kind) = self.logical_or(binding)?;
        if !self.consume(b'?') {
            return Ok((used_binding, kind));
        }

        self.output.push(Opcode::ToBoolean as u8);
        self.output.push(Opcode::JumpIfFalseBoolean as u8);
        let alternate_patch = self.output.len();
        self.output.extend_from_slice(&0_u32.to_le_bytes());
        self.expression(None)?;
        if !self.consume(b':') {
            return Err(self.error(":"));
        }
        self.output.push(Opcode::Jump as u8);
        let end_patch = self.output.len();
        self.output.extend_from_slice(&0_u32.to_le_bytes());

        let alternate = u32::try_from(self.output.len())
            .map_err(|_| self.error("bytecode smaller than 4 GiB"))?;
        self.output[alternate_patch..alternate_patch + 4].copy_from_slice(&alternate.to_le_bytes());
        #[cfg(feature = "functions")]
        self.relocations.push(alternate_patch);

        self.expression(None)?;
        self.patch_expression_end(&[end_patch])?;
        Ok((used_binding, TermKind::General))
    }

    #[cfg(not(feature = "conditional-expressions"))]
    fn conditional(
        &mut self,
        binding: Option<(usize, usize)>,
    ) -> Result<(bool, TermKind), CompileError> {
        self.logical_or(binding)
    }

    #[cfg(any(
        feature = "array-assignment-expressions",
        feature = "captured-assignment-expressions",
        feature = "local-assignment-expressions",
        feature = "property-assignment-expressions"
    ))]
    fn consume_plain_assignment(&mut self) -> bool {
        self.whitespace();
        if self.source.get(self.offset) != Some(&b'=')
            || matches!(self.source.get(self.offset + 1), Some(b'=' | b'>'))
        {
            return false;
        }
        self.offset += 1;
        true
    }

    #[cfg(feature = "property-assignment-expressions")]
    fn property_assignment_expression(&mut self) -> Result<bool, CompileError> {
        let start = self.offset;
        let Some(base) = self.assignment_base() else {
            return Ok(false);
        };

        let mut properties = Vec::new();
        while self.consume(b'.') {
            self.whitespace();
            properties.push(self.identifier()?);
        }
        if properties.is_empty() || !self.consume_plain_assignment() {
            self.offset = start;
            return Ok(false);
        }

        self.emit_assignment_base(base)?;
        let final_property = properties.pop().expect("a property was checked above");
        for (property_start, property_end) in properties {
            self.output_atom_range(property_start, property_end);
            self.output.push(Opcode::GetProperty as u8);
        }
        self.output_atom_range(final_property.0, final_property.1);
        self.expression(None)?;
        self.output.push(Opcode::SetPropertyResult as u8);
        Ok(true)
    }

    #[cfg(feature = "array-assignment-expressions")]
    fn array_assignment_expression(&mut self) -> Result<bool, CompileError> {
        let start = self.offset;
        let Some(base) = self.assignment_base() else {
            return Ok(false);
        };
        let mut suffixes = Vec::new();
        loop {
            #[cfg(feature = "objects")]
            if self.consume(b'.') {
                self.whitespace();
                let (start, end) = self.identifier()?;
                suffixes.push(AssignmentSuffix::Property(start, end));
                continue;
            }
            if self.consume(b'[') {
                let expression_start = self.offset;
                let expression_end = self.index_expression_end()?;
                suffixes.push(AssignmentSuffix::Index(expression_start, expression_end));
                self.offset = expression_end + 1;
                continue;
            }
            break;
        }
        if !matches!(suffixes.last(), Some(AssignmentSuffix::Index(_, _)))
            || !self.consume_plain_assignment()
        {
            self.offset = start;
            return Ok(false);
        }
        let rhs = self.offset;
        self.emit_assignment_base(base)?;
        let final_suffix = suffixes.pop().expect("an index was checked above");
        for suffix in suffixes {
            self.emit_assignment_suffix(suffix, rhs)?;
        }
        self.emit_index_suffix(final_suffix, rhs)?;
        self.offset = rhs;
        self.expression(None)?;
        self.output.push(Opcode::SetIndexResult as u8);
        Ok(true)
    }

    #[cfg(any(
        feature = "array-assignment-expressions",
        feature = "property-assignment-expressions"
    ))]
    fn assignment_base(&mut self) -> Option<AssignmentBase> {
        if let Some(local) = self.local_at_offset() {
            self.offset += local.end - local.start;
            return Some(AssignmentBase::Local(local));
        }
        #[cfg(feature = "environments")]
        if let Some(capture) = self.outer_binding_at_offset() {
            self.offset += capture.end - capture.start;
            return Some(AssignmentBase::Capture(capture));
        }
        #[cfg(all(feature = "functions", feature = "receivers"))]
        if self.receiver_frame && self.try_word(b"this") {
            return Some(AssignmentBase::Receiver);
        }
        None
    }

    #[cfg(any(
        feature = "array-assignment-expressions",
        feature = "property-assignment-expressions"
    ))]
    fn emit_assignment_base(&mut self, base: AssignmentBase) -> Result<(), CompileError> {
        match base {
            AssignmentBase::Local(local) => {
                self.output.push(Opcode::LoadLocal as u8);
                self.output.extend_from_slice(&local.slot.to_le_bytes());
                #[cfg(feature = "environments")]
                if local.captured {
                    self.output.push(Opcode::LoadEnvironmentCell as u8);
                }
            }
            #[cfg(feature = "environments")]
            AssignmentBase::Capture(capture) => {
                let index = self.intern_capture(capture)?;
                self.output.push(Opcode::LoadCapture as u8);
                self.output.extend_from_slice(&index.to_le_bytes());
                self.output.push(Opcode::LoadEnvironmentCell as u8);
            }
            #[cfg(all(feature = "functions", feature = "receivers"))]
            AssignmentBase::Receiver => self.output.push(Opcode::LoadThis as u8),
        }
        Ok(())
    }

    #[cfg(feature = "array-assignment-expressions")]
    fn emit_assignment_suffix(
        &mut self,
        suffix: AssignmentSuffix,
        resume: usize,
    ) -> Result<(), CompileError> {
        match suffix {
            #[cfg(feature = "objects")]
            AssignmentSuffix::Property(start, end) => {
                self.output_atom_range(start, end);
                self.output.push(Opcode::GetProperty as u8);
            }
            AssignmentSuffix::Index(_, _) => {
                self.emit_index_suffix(suffix, resume)?;
                self.output.push(Opcode::GetIndex as u8);
            }
        }
        Ok(())
    }

    #[cfg(feature = "array-assignment-expressions")]
    fn emit_index_suffix(
        &mut self,
        suffix: AssignmentSuffix,
        resume: usize,
    ) -> Result<(), CompileError> {
        let (start, end) = match suffix {
            AssignmentSuffix::Index(start, end) => (start, end),
            #[cfg(feature = "objects")]
            AssignmentSuffix::Property(_, _) => return Err(self.error("an array index")),
        };
        self.offset = start;
        self.expression(None)?;
        self.whitespace();
        if self.offset != end {
            return Err(self.error("]"));
        }
        self.offset = resume;
        Ok(())
    }

    #[cfg(feature = "array-assignment-expressions")]
    fn index_expression_end(&mut self) -> Result<usize, CompileError> {
        let mut endings = Vec::from(*b"]");
        let mut offset = self.offset;
        while let Some(byte) = self.source.get(offset).copied() {
            match byte {
                b'\'' | b'"' | b'`' => {
                    let quote = byte;
                    offset += 1;
                    while let Some(byte) = self.source.get(offset).copied() {
                        offset += 1;
                        if byte == b'\\' {
                            offset = offset.saturating_add(1);
                        } else if byte == quote {
                            break;
                        }
                    }
                }
                b'[' => endings.push(b']'),
                b'(' => endings.push(b')'),
                b'{' => endings.push(b'}'),
                b']' | b')' | b'}' => {
                    if endings.pop() != Some(byte) {
                        self.offset = offset;
                        return Err(self.error("a balanced array index"));
                    }
                    if endings.is_empty() {
                        return Ok(offset);
                    }
                }
                _ => {}
            }
            offset += 1;
        }
        self.offset = offset;
        Err(self.error("]"))
    }

    #[cfg(feature = "logical-operations")]
    fn logical_or(
        &mut self,
        binding: Option<(usize, usize)>,
    ) -> Result<(bool, TermKind), CompileError> {
        let (used_binding, mut kind) = self.logical_and(binding)?;
        let mut patches = Vec::new();
        while self.consume_bytes(b"||") {
            self.output.push(Opcode::JumpIfTruthyOrPop as u8);
            patches.push(self.output.len());
            self.output.extend_from_slice(&0_u32.to_le_bytes());
            self.logical_and(None)?;
            kind = TermKind::General;
        }
        self.patch_expression_end(&patches)?;
        Ok((used_binding, kind))
    }

    #[cfg(not(feature = "logical-operations"))]
    fn logical_or(
        &mut self,
        binding: Option<(usize, usize)>,
    ) -> Result<(bool, TermKind), CompileError> {
        self.equality(binding)
    }

    #[cfg(feature = "logical-operations")]
    fn logical_and(
        &mut self,
        binding: Option<(usize, usize)>,
    ) -> Result<(bool, TermKind), CompileError> {
        let (used_binding, mut kind) = self.equality(binding)?;
        let mut patches = Vec::new();
        while self.consume_bytes(b"&&") {
            self.output.push(Opcode::JumpIfFalsyOrPop as u8);
            patches.push(self.output.len());
            self.output.extend_from_slice(&0_u32.to_le_bytes());
            self.equality(None)?;
            kind = TermKind::General;
        }
        self.patch_expression_end(&patches)?;
        Ok((used_binding, kind))
    }

    #[cfg(any(feature = "conditional-expressions", feature = "logical-operations"))]
    fn patch_expression_end(&mut self, patches: &[usize]) -> Result<(), CompileError> {
        let target = u32::try_from(self.output.len())
            .map_err(|_| self.error("bytecode smaller than 4 GiB"))?;
        for patch in patches {
            self.output[*patch..*patch + 4].copy_from_slice(&target.to_le_bytes());
            #[cfg(feature = "functions")]
            self.relocations.push(*patch);
        }
        Ok(())
    }

    #[cfg(feature = "equality")]
    fn equality(
        &mut self,
        binding: Option<(usize, usize)>,
    ) -> Result<(bool, TermKind), CompileError> {
        let (used_binding, mut kind) = self.relational(binding)?;
        loop {
            let opcode = if self.consume_bytes(b"===") {
                Opcode::StrictEqual
            } else if self.consume_bytes(b"!==") {
                Opcode::StrictNotEqual
            } else {
                break;
            };
            self.relational(None)?;
            self.output.push(opcode as u8);
            kind = TermKind::General;
        }
        Ok((used_binding, kind))
    }

    #[cfg(not(feature = "equality"))]
    fn equality(
        &mut self,
        binding: Option<(usize, usize)>,
    ) -> Result<(bool, TermKind), CompileError> {
        self.relational(binding)
    }

    #[cfg(all(feature = "integer-operations", not(feature = "instanceof")))]
    fn relational(
        &mut self,
        binding: Option<(usize, usize)>,
    ) -> Result<(bool, TermKind), CompileError> {
        let (used_binding, mut kind) = self.additive(binding)?;
        loop {
            let less = if self.consume(b'<') {
                true
            } else if self.consume(b'>') {
                false
            } else {
                break;
            };
            let (_, right) = self.additive(None)?;
            let immediate = matches!((kind, right), (TermKind::I30(_), TermKind::I30(_)));
            let opcode = self.relational_opcode(less, immediate);
            self.output.push(opcode as u8);
            kind = TermKind::General;
        }
        Ok((used_binding, kind))
    }

    #[cfg(all(feature = "integer-operations", feature = "instanceof"))]
    fn relational(
        &mut self,
        binding: Option<(usize, usize)>,
    ) -> Result<(bool, TermKind), CompileError> {
        let (used_binding, mut kind) = self.additive(binding)?;
        loop {
            let relation = if self.consume(b'<') {
                Some(true)
            } else if self.consume(b'>') {
                Some(false)
            } else {
                None
            };
            if let Some(less) = relation {
                let (_, right) = self.additive(None)?;
                let immediate = matches!((kind, right), (TermKind::I30(_), TermKind::I30(_)));
                let opcode = self.relational_opcode(less, immediate);
                self.output.push(opcode as u8);
                kind = TermKind::General;
            } else if self.consume_instanceof() {
                self.additive(None)?;
                self.output.push(Opcode::InstanceOf as u8);
                kind = TermKind::General;
            } else {
                break;
            }
        }
        Ok((used_binding, kind))
    }

    #[cfg(all(feature = "instanceof", not(feature = "integer-operations")))]
    fn relational(
        &mut self,
        binding: Option<(usize, usize)>,
    ) -> Result<(bool, TermKind), CompileError> {
        let (used_binding, mut kind) = self.additive(binding)?;
        while self.consume_instanceof() {
            self.additive(None)?;
            self.output.push(Opcode::InstanceOf as u8);
            kind = TermKind::General;
        }
        Ok((used_binding, kind))
    }

    #[cfg(all(not(feature = "integer-operations"), not(feature = "instanceof")))]
    fn relational(
        &mut self,
        binding: Option<(usize, usize)>,
    ) -> Result<(bool, TermKind), CompileError> {
        self.additive(binding)
    }

    #[cfg(feature = "integer-operations")]
    fn additive(
        &mut self,
        binding: Option<(usize, usize)>,
    ) -> Result<(bool, TermKind), CompileError> {
        let (used_binding, mut kind) = self.product(binding)?;
        loop {
            if self.consume(b'+') {
                let (_, right) = self.product(None)?;
                #[cfg(feature = "string-operations")]
                if kind == TermKind::String && right == TermKind::String {
                    self.output.push(Opcode::ConcatenateStrings as u8);
                    kind = TermKind::String;
                    continue;
                }
                let result = match (kind, right) {
                    (TermKind::I30(left), TermKind::I30(right)) => left
                        .checked_add(right)
                        .filter(|value| (-(1 << 29)..(1 << 29)).contains(value)),
                    _ => None,
                };
                self.output.push(self.add_opcode(result.is_some()) as u8);
                kind = result.map_or(TermKind::General, TermKind::I30);
            } else if self.consume(b'-') {
                let (_, right) = self.product(None)?;
                let result = match (kind, right) {
                    (TermKind::I30(left), TermKind::I30(right)) => left
                        .checked_sub(right)
                        .filter(|value| (-(1 << 29)..(1 << 29)).contains(value)),
                    _ => None,
                };
                self.output
                    .push(self.subtract_opcode(result.is_some()) as u8);
                kind = result.map_or(TermKind::General, TermKind::I30);
            } else {
                break;
            }
        }
        Ok((used_binding, kind))
    }

    #[cfg(not(feature = "integer-operations"))]
    fn additive(
        &mut self,
        binding: Option<(usize, usize)>,
    ) -> Result<(bool, TermKind), CompileError> {
        let (used_binding, mut kind) = self.product(binding)?;
        while self.consume(b'+') {
            let (_, right) = self.product(None)?;
            #[cfg(feature = "string-operations")]
            if kind == TermKind::String && right == TermKind::String {
                self.output.push(Opcode::ConcatenateStrings as u8);
                kind = TermKind::String;
                continue;
            }
            let result = match (kind, right) {
                (TermKind::I30(left), TermKind::I30(right)) => left
                    .checked_add(right)
                    .filter(|value| (-(1 << 29)..(1 << 29)).contains(value)),
                _ => None,
            };
            self.output.push(self.add_opcode(result.is_some()) as u8);
            kind = result.map_or(TermKind::General, TermKind::I30);
        }
        Ok((used_binding, kind))
    }

    #[cfg(any(
        feature = "integer-operations",
        feature = "number-division",
        feature = "number-remainder"
    ))]
    fn product(
        &mut self,
        binding: Option<(usize, usize)>,
    ) -> Result<(bool, TermKind), CompileError> {
        let (used_binding, mut kind) = self.unary(binding)?;
        loop {
            #[cfg(feature = "integer-operations")]
            if self.consume(b'*') {
                let (_, right) = self.unary(None)?;
                let result = match (kind, right) {
                    (TermKind::I30(left), TermKind::I30(right)) => left
                        .checked_mul(right)
                        .filter(|value| (-(1 << 29)..(1 << 29)).contains(value)),
                    _ => None,
                };
                self.output
                    .push(self.multiply_opcode(result.is_some()) as u8);
                kind = result.map_or(TermKind::General, TermKind::I30);
                continue;
            }
            #[cfg(feature = "number-division")]
            if self.consume(b'/') {
                self.unary(None)?;
                self.output.push(Opcode::DivideNumber as u8);
                kind = TermKind::General;
                continue;
            }
            #[cfg(feature = "number-remainder")]
            if self.consume(b'%') {
                self.unary(None)?;
                self.output.push(Opcode::RemainderNumber as u8);
                kind = TermKind::General;
                continue;
            }
            break;
        }
        Ok((used_binding, kind))
    }

    #[cfg(not(any(
        feature = "integer-operations",
        feature = "number-division",
        feature = "number-remainder"
    )))]
    fn product(
        &mut self,
        binding: Option<(usize, usize)>,
    ) -> Result<(bool, TermKind), CompileError> {
        self.unary(binding)
    }

    #[cfg(all(
        feature = "logical-operations",
        not(feature = "integer-negation"),
        not(feature = "number-coercion"),
        not(feature = "typeof")
    ))]
    fn unary(&mut self, binding: Option<(usize, usize)>) -> Result<(bool, TermKind), CompileError> {
        let mut negations = 0_usize;
        while self.consume(b'!') {
            negations += 1;
        }
        let (used_binding, kind) = self.term(binding)?;
        self.output
            .extend(core::iter::repeat_n(Opcode::LogicalNot as u8, negations));
        Ok((
            used_binding,
            if negations == 0 {
                kind
            } else {
                TermKind::General
            },
        ))
    }

    #[cfg(all(
        feature = "integer-negation",
        not(feature = "logical-operations"),
        not(feature = "number-coercion"),
        not(feature = "typeof")
    ))]
    fn unary(&mut self, binding: Option<(usize, usize)>) -> Result<(bool, TermKind), CompileError> {
        let mut negations = 0_usize;
        while self.consume_unary_minus() {
            negations += 1;
        }
        let (used_binding, mut kind) = self.term(binding)?;
        for _ in 0..negations {
            kind = self.emit_numeric_negation(kind);
        }
        Ok((used_binding, kind))
    }

    #[cfg(all(
        feature = "number-coercion",
        not(feature = "integer-negation"),
        not(feature = "logical-operations"),
        not(feature = "typeof")
    ))]
    fn unary(&mut self, binding: Option<(usize, usize)>) -> Result<(bool, TermKind), CompileError> {
        let mut coercions = 0_usize;
        while self.consume_unary_plus() {
            coercions += 1;
        }
        let (used_binding, kind) = self.term(binding)?;
        if coercions != 0 && !matches!(kind, TermKind::I30(_)) {
            self.output.push(Opcode::ToNumber as u8);
        }
        Ok((used_binding, kind))
    }

    #[cfg(all(
        not(feature = "typeof"),
        any(
            all(feature = "integer-negation", feature = "logical-operations"),
            all(feature = "integer-negation", feature = "number-coercion"),
            all(feature = "logical-operations", feature = "number-coercion")
        )
    ))]
    fn unary(&mut self, binding: Option<(usize, usize)>) -> Result<(bool, TermKind), CompileError> {
        let operators_start = self.offset;
        loop {
            self.whitespace();
            #[cfg(feature = "logical-operations")]
            if self.consume_raw(b'!') {
                continue;
            }
            #[cfg(feature = "integer-negation")]
            if self.consume_unary_minus() {
                continue;
            }
            #[cfg(feature = "number-coercion")]
            if self.consume_unary_plus() {
                continue;
            }
            break;
        }
        let operators_end = self.offset;
        let (used_binding, mut kind) = self.term(binding)?;
        for operator in self.source[operators_start..operators_end]
            .iter()
            .rev()
            .copied()
        {
            match operator {
                #[cfg(feature = "logical-operations")]
                b'!' => {
                    self.output.push(Opcode::LogicalNot as u8);
                    kind = TermKind::General;
                }
                #[cfg(feature = "integer-negation")]
                b'-' => kind = self.emit_numeric_negation(kind),
                #[cfg(feature = "number-coercion")]
                b'+' if !matches!(kind, TermKind::I30(_)) => {
                    self.output.push(Opcode::ToNumber as u8);
                }
                _ => {}
            }
        }
        Ok((used_binding, kind))
    }

    #[cfg(all(
        feature = "typeof",
        not(feature = "integer-negation"),
        not(feature = "logical-operations"),
        not(feature = "number-coercion")
    ))]
    fn unary(&mut self, binding: Option<(usize, usize)>) -> Result<(bool, TermKind), CompileError> {
        let mut operators = 0_usize;
        while self.consume_typeof() {
            operators += 1;
        }
        let (used_binding, kind) = self.term(binding)?;
        self.output
            .extend(core::iter::repeat_n(Opcode::TypeOf as u8, operators));
        Ok((
            used_binding,
            if operators == 0 {
                kind
            } else {
                TermKind::String
            },
        ))
    }

    #[cfg(all(
        feature = "typeof",
        any(
            feature = "integer-negation",
            feature = "logical-operations",
            feature = "number-coercion"
        )
    ))]
    fn unary(&mut self, binding: Option<(usize, usize)>) -> Result<(bool, TermKind), CompileError> {
        let mut operators = Vec::new();
        loop {
            if self.consume_typeof() {
                operators.push(UnaryOperator::TypeOf);
                continue;
            }
            #[cfg(feature = "logical-operations")]
            if self.consume(b'!') {
                operators.push(UnaryOperator::LogicalNot);
                continue;
            }
            #[cfg(feature = "integer-negation")]
            if self.consume_unary_minus() {
                operators.push(UnaryOperator::Negate);
                continue;
            }
            #[cfg(feature = "number-coercion")]
            if self.consume_unary_plus() {
                operators.push(UnaryOperator::ToNumber);
                continue;
            }
            break;
        }
        let (used_binding, mut kind) = self.term(binding)?;
        for operator in operators.into_iter().rev() {
            match operator {
                UnaryOperator::TypeOf => {
                    self.output.push(Opcode::TypeOf as u8);
                    kind = TermKind::String;
                }
                #[cfg(feature = "logical-operations")]
                UnaryOperator::LogicalNot => {
                    self.output.push(Opcode::LogicalNot as u8);
                    kind = TermKind::General;
                }
                #[cfg(feature = "integer-negation")]
                UnaryOperator::Negate => kind = self.emit_numeric_negation(kind),
                #[cfg(feature = "number-coercion")]
                UnaryOperator::ToNumber if !matches!(kind, TermKind::I30(_)) => {
                    self.output.push(Opcode::ToNumber as u8);
                    kind = TermKind::General;
                }
                #[cfg(feature = "number-coercion")]
                UnaryOperator::ToNumber => {}
            }
        }
        Ok((used_binding, kind))
    }

    #[cfg(not(any(
        feature = "integer-negation",
        feature = "logical-operations",
        feature = "number-coercion",
        feature = "typeof"
    )))]
    fn unary(&mut self, binding: Option<(usize, usize)>) -> Result<(bool, TermKind), CompileError> {
        self.term(binding)
    }

    #[cfg(feature = "integer-negation")]
    fn consume_unary_minus(&mut self) -> bool {
        self.whitespace();
        if self.source[self.offset..].starts_with(b"--")
            || self
                .source
                .get(self.offset + 1)
                .is_some_and(u8::is_ascii_digit)
        {
            return false;
        }
        self.consume_raw(b'-')
    }

    #[cfg(feature = "number-coercion")]
    fn consume_unary_plus(&mut self) -> bool {
        self.whitespace();
        if self.source[self.offset..].starts_with(b"++") {
            return false;
        }
        self.consume_raw(b'+')
    }

    #[cfg(feature = "typeof")]
    fn consume_typeof(&mut self) -> bool {
        self.whitespace();
        self.try_word(b"typeof")
    }

    #[cfg(feature = "instanceof")]
    fn consume_instanceof(&mut self) -> bool {
        self.whitespace();
        self.try_word(b"instanceof")
    }

    #[cfg(feature = "integer-negation")]
    fn emit_numeric_negation(&mut self, kind: TermKind) -> TermKind {
        let result = match kind {
            TermKind::I30(value) => value
                .checked_neg()
                .filter(|value| (-(1 << 29)..(1 << 29)).contains(value)),
            _ => None,
        };
        #[cfg(feature = "number-negation")]
        let immediate = result.is_some()
            && (self.options.numbers == NumberMode::BoundedI30 || result != Some(0));
        #[cfg(not(feature = "number-negation"))]
        let immediate = result.is_some();
        self.output.push(self.negate_opcode(immediate) as u8);
        if immediate {
            TermKind::I30(result.unwrap())
        } else {
            TermKind::General
        }
    }

    #[cfg(feature = "number-operations")]
    fn add_opcode(&self, proven_i30: bool) -> Opcode {
        if self.options.numbers == NumberMode::JavaScript && !proven_i30 {
            Opcode::AddNumber
        } else {
            Opcode::AddI30
        }
    }

    #[cfg(not(feature = "number-operations"))]
    fn add_opcode(&self, _proven_i30: bool) -> Opcode {
        Opcode::AddI30
    }

    #[cfg(feature = "number-negation")]
    fn negate_opcode(&self, proven_i30: bool) -> Opcode {
        if self.options.numbers == NumberMode::JavaScript && !proven_i30 {
            Opcode::NegateNumber
        } else {
            Opcode::NegateI30
        }
    }

    #[cfg(all(feature = "integer-negation", not(feature = "number-negation")))]
    fn negate_opcode(&self, _proven_i30: bool) -> Opcode {
        Opcode::NegateI30
    }

    #[cfg(feature = "number-operations")]
    #[cfg(feature = "integer-operations")]
    fn subtract_opcode(&self, proven_i30: bool) -> Opcode {
        if self.options.numbers == NumberMode::JavaScript && !proven_i30 {
            Opcode::SubtractNumber
        } else {
            Opcode::SubtractI30
        }
    }

    #[cfg(all(feature = "integer-operations", not(feature = "number-operations")))]
    fn subtract_opcode(&self, _proven_i30: bool) -> Opcode {
        Opcode::SubtractI30
    }

    #[cfg(feature = "number-operations")]
    #[cfg(feature = "integer-operations")]
    fn multiply_opcode(&self, proven_i30: bool) -> Opcode {
        if self.options.numbers == NumberMode::JavaScript && !proven_i30 {
            Opcode::MultiplyNumber
        } else {
            Opcode::MultiplyI30
        }
    }

    #[cfg(all(feature = "integer-operations", not(feature = "number-operations")))]
    fn multiply_opcode(&self, _proven_i30: bool) -> Opcode {
        Opcode::MultiplyI30
    }

    #[cfg(feature = "number-operations")]
    #[cfg(feature = "integer-operations")]
    fn relational_opcode(&self, less: bool, proven_i30: bool) -> Opcode {
        if self.options.numbers != NumberMode::JavaScript || proven_i30 {
            if less {
                Opcode::LessThanI30
            } else {
                Opcode::GreaterThanI30
            }
        } else if less {
            Opcode::LessThanNumber
        } else {
            Opcode::GreaterThanNumber
        }
    }

    #[cfg(all(feature = "integer-operations", not(feature = "number-operations")))]
    fn relational_opcode(&self, less: bool, _proven_i30: bool) -> Opcode {
        if less {
            Opcode::LessThanI30
        } else {
            Opcode::GreaterThanI30
        }
    }

    #[cfg(all(feature = "arrays", not(feature = "literal-expressions")))]
    fn array_literal(&mut self) -> Result<bool, CompileError> {
        if !self.consume_raw(b'[') {
            return Ok(false);
        }
        self.output.push(Opcode::NewArray as u8);
        let mut index = 0_i32;
        if !self.consume(b']') {
            loop {
                self.output.push(Opcode::ConstI30 as u8);
                self.output.extend_from_slice(&index.to_le_bytes());
                let _ = self.number()?;
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
        Ok(true)
    }

    #[cfg(all(feature = "arrays", feature = "literal-expressions"))]
    fn array_literal(&mut self) -> Result<bool, CompileError> {
        if !self.consume_raw(b'[') {
            return Ok(false);
        }
        self.output.push(Opcode::NewArray as u8);
        let mut index = 0_i32;
        if !self.consume(b']') {
            loop {
                self.output.push(Opcode::ConstI30 as u8);
                self.output.extend_from_slice(&index.to_le_bytes());
                self.expression(None)?;
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
        Ok(true)
    }

    #[cfg(not(feature = "arrays"))]
    fn array_literal(&mut self) -> Result<bool, CompileError> {
        Ok(false)
    }

    #[cfg(all(feature = "objects", not(feature = "literal-expressions")))]
    fn object_literal(&mut self) -> Result<bool, CompileError> {
        if !self.consume_raw(b'{') {
            return Ok(false);
        }
        self.output.push(Opcode::NewObject as u8);
        if !self.consume(b'}') {
            loop {
                self.whitespace();
                let (start, end) = self.identifier()?;
                if !self.consume(b':') {
                    return Err(self.error(":"));
                }
                self.output_atom_range(start, end);
                let _ = self.number()?;
                self.output.push(Opcode::SetProperty as u8);
                if self.consume(b'}') {
                    break;
                }
                if !self.consume(b',') {
                    return Err(self.error(", or }"));
                }
            }
        }
        Ok(true)
    }

    #[cfg(all(feature = "objects", feature = "literal-expressions"))]
    fn object_literal(&mut self) -> Result<bool, CompileError> {
        if !self.consume_raw(b'{') {
            return Ok(false);
        }
        self.output.push(Opcode::NewObject as u8);
        if !self.consume(b'}') {
            loop {
                self.whitespace();
                let (start, end) = self.identifier()?;
                if !self.consume(b':') {
                    return Err(self.error(":"));
                }
                self.output_atom_range(start, end);
                self.expression(None)?;
                self.output.push(Opcode::SetProperty as u8);
                if self.consume(b'}') {
                    break;
                }
                if !self.consume(b',') {
                    return Err(self.error(", or }"));
                }
            }
        }
        Ok(true)
    }

    #[cfg(not(feature = "objects"))]
    fn object_literal(&mut self) -> Result<bool, CompileError> {
        Ok(false)
    }

    #[cfg(feature = "functions")]
    fn term(&mut self, binding: Option<(usize, usize)>) -> Result<(bool, TermKind), CompileError> {
        self.whitespace();
        #[cfg(feature = "construction")]
        if self.try_word(b"new") {
            self.whitespace();
            self.construction_reference()?;
            if self.consume(b'(') {
                #[cfg(feature = "method-calls")]
                self.call_suffix(false)?;
                #[cfg(not(feature = "method-calls"))]
                self.call_suffix()?;
                let call = self.output.len() - 3;
                debug_assert_eq!(self.output[call], Opcode::CallValueArguments as u8);
                self.output[call] = Opcode::ConstructValueArguments as u8;
            } else {
                self.output.push(Opcode::ConstructValueArguments as u8);
                self.output.extend_from_slice(&0_u16.to_le_bytes());
            }
            self.output.push(Opcode::SelectConstructedResult as u8);
            self.post_construction_suffixes()?;
            return Ok((false, TermKind::General));
        }
        #[cfg(feature = "async")]
        let awaiting = self.try_word(b"await");
        self.whitespace();
        let async_start = self.offset;
        #[cfg(feature = "async-functions")]
        let async_prefix = self.try_word(b"async")
            && self
                .source
                .get(self.offset)
                .is_some_and(u8::is_ascii_whitespace);
        #[cfg(not(feature = "async-functions"))]
        let async_prefix = false;
        #[cfg(feature = "async-functions")]
        let mut asynchronous = false;
        #[cfg(not(feature = "async-functions"))]
        let asynchronous = false;
        #[cfg(feature = "async-functions")]
        let mut async_function = false;
        #[cfg(not(feature = "async-functions"))]
        let async_function = false;
        let mut arrow_parameters = None;
        if async_prefix {
            #[cfg(feature = "async-functions")]
            {
                self.whitespace();
                arrow_parameters = self.try_arrow_parameters()?;
                asynchronous = arrow_parameters.is_some();
                if !asynchronous && self.try_word(b"function") {
                    asynchronous = true;
                    async_function = true;
                }
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
            self.function_value(parameters, None, body, None, asynchronous, false)?;
            (false, TermKind::General)
        } else if let Some((start, end)) = binding {
            self.offset += end - start;
            (true, TermKind::General)
        } else if let Some(local) = self.local_at_offset() {
            self.offset += local.end - local.start;
            self.output.push(Opcode::LoadLocal as u8);
            self.output.extend_from_slice(&local.slot.to_le_bytes());
            #[cfg(feature = "environments")]
            if local.captured {
                self.output.push(Opcode::LoadEnvironmentCell as u8);
            }
            (false, TermKind::General)
        } else if let Some(captured) = self.capture_at_offset()? {
            #[cfg(feature = "environments")]
            {
                let (capture, binding) = captured;
                self.offset += binding.end - binding.start;
                self.output.push(Opcode::LoadCapture as u8);
                self.output.extend_from_slice(&capture.to_le_bytes());
                self.output.push(Opcode::LoadEnvironmentCell as u8);
                (false, TermKind::General)
            }
            #[cfg(not(feature = "environments"))]
            {
                let _ = captured;
                unreachable!()
            }
        } else if let Some(host) = self.host_global_at_offset() {
            #[cfg(feature = "host-bindings")]
            {
                self.offset += self.host_globals[host as usize].len();
                self.output.push(Opcode::ConstHost as u8);
                self.output.extend_from_slice(&host.to_le_bytes());
            }
            (false, TermKind::General)
        } else if self.receiver_term() {
            (false, TermKind::General)
        } else if cfg!(feature = "class-expressions") && self.try_word(b"class") {
            #[cfg(feature = "class-expressions")]
            self.class_expression()?;
            (false, TermKind::General)
        } else if async_function || self.try_word(b"function") {
            self.whitespace();
            let expression_name = if self.source.get(self.offset) == Some(&b'(') {
                None
            } else if self.allows_named_function(asynchronous) {
                let (start, end) = self.identifier()?;
                Some(Binding {
                    start,
                    end,
                    slot: 0,
                    #[cfg(feature = "environments")]
                    captured: true,
                })
            } else {
                None
            };
            let parameters = self.function_parameters()?;
            self.function_value(
                parameters,
                None,
                FunctionBody::Block,
                expression_name,
                asynchronous,
                !asynchronous,
            )?;
            (false, TermKind::General)
        } else if cfg!(feature = "parenthesized-expressions") && self.consume_raw(b'(') {
            #[cfg(feature = "parenthesized-expressions")]
            {
                self.expression(None)?;
                if !self.consume(b')') {
                    return Err(self.error(")"));
                }
            }
            (false, TermKind::General)
        } else if self.string_literal()? {
            (false, string_term_kind())
        } else if self.array_literal()? || self.object_literal()? {
            (false, TermKind::General)
        } else if let Some(immediate) = self.immediate() {
            self.output.push(Opcode::ConstImmediate as u8);
            self.output.push(immediate as u8);
            (false, TermKind::General)
        } else {
            let immediate = self.number()?;
            (false, immediate.map_or(TermKind::General, TermKind::I30))
        };
        #[cfg(feature = "method-calls")]
        let mut method_call = false;
        loop {
            #[cfg(feature = "objects")]
            if self.consume(b'.') {
                self.whitespace();
                let (start, end) = self.identifier()?;
                self.output_atom_range(start, end);
                #[cfg(feature = "method-calls")]
                {
                    self.whitespace();
                    method_call = self.source.get(self.offset) == Some(&b'(');
                    self.output.push(if method_call {
                        Opcode::GetMethod as u8
                    } else {
                        Opcode::GetProperty as u8
                    });
                }
                #[cfg(not(feature = "method-calls"))]
                self.output.push(Opcode::GetProperty as u8);
                kind = TermKind::General;
                continue;
            }
            #[cfg(feature = "array-indexing")]
            if self.consume(b'[') {
                self.expression(None)?;
                if !self.consume(b']') {
                    return Err(self.error("]"));
                }
                self.output.push(Opcode::GetIndex as u8);
                #[cfg(feature = "method-calls")]
                {
                    method_call = false;
                }
                kind = TermKind::General;
                continue;
            }
            if self.consume(b'(') {
                #[cfg(feature = "method-calls")]
                self.call_suffix(method_call)?;
                #[cfg(not(feature = "method-calls"))]
                self.call_suffix()?;
                #[cfg(feature = "method-calls")]
                {
                    method_call = false;
                }
                kind = TermKind::General;
                continue;
            }
            break;
        }
        #[cfg(feature = "async")]
        if awaiting {
            self.output.push(Opcode::Await as u8);
        }
        Ok((used_binding, kind))
    }

    #[cfg(feature = "construction")]
    fn construction_reference(&mut self) -> Result<(), CompileError> {
        if let Some(local) = self.local_at_offset() {
            self.offset += local.end - local.start;
            self.output.push(Opcode::LoadLocal as u8);
            self.output.extend_from_slice(&local.slot.to_le_bytes());
            #[cfg(feature = "environments")]
            if local.captured {
                self.output.push(Opcode::LoadEnvironmentCell as u8);
            }
        } else if let Some(captured) = self.capture_at_offset()? {
            #[cfg(feature = "environments")]
            {
                let (capture, binding) = captured;
                self.offset += binding.end - binding.start;
                self.output.push(Opcode::LoadCapture as u8);
                self.output.extend_from_slice(&capture.to_le_bytes());
                self.output.push(Opcode::LoadEnvironmentCell as u8);
            }
            #[cfg(not(feature = "environments"))]
            {
                let _ = captured;
                unreachable!()
            }
        } else {
            return Err(self.error("a constructor binding"));
        }

        #[cfg(any(feature = "array-indexing", feature = "objects"))]
        loop {
            #[cfg(feature = "objects")]
            if self.consume(b'.') {
                self.whitespace();
                let (start, end) = self.identifier()?;
                self.output_atom_range(start, end);
                self.output.push(Opcode::GetProperty as u8);
                continue;
            }
            #[cfg(feature = "array-indexing")]
            if self.consume(b'[') {
                self.expression(None)?;
                if !self.consume(b']') {
                    return Err(self.error("]"));
                }
                self.output.push(Opcode::GetIndex as u8);
                continue;
            }
            break;
        }
        Ok(())
    }

    #[cfg(feature = "construction")]
    fn post_construction_suffixes(&mut self) -> Result<(), CompileError> {
        #[cfg(feature = "method-calls")]
        let mut method_call = false;
        loop {
            #[cfg(feature = "objects")]
            if self.consume(b'.') {
                self.whitespace();
                let (start, end) = self.identifier()?;
                self.output_atom_range(start, end);
                #[cfg(feature = "method-calls")]
                {
                    self.whitespace();
                    method_call = self.source.get(self.offset) == Some(&b'(');
                    self.output.push(if method_call {
                        Opcode::GetMethod
                    } else {
                        Opcode::GetProperty
                    } as u8);
                }
                #[cfg(not(feature = "method-calls"))]
                self.output.push(Opcode::GetProperty as u8);
                continue;
            }
            #[cfg(feature = "array-indexing")]
            if self.consume(b'[') {
                self.expression(None)?;
                if !self.consume(b']') {
                    return Err(self.error("]"));
                }
                self.output.push(Opcode::GetIndex as u8);
                #[cfg(feature = "method-calls")]
                {
                    method_call = false;
                }
                continue;
            }
            if self.consume(b'(') {
                #[cfg(feature = "method-calls")]
                self.call_suffix(method_call)?;
                #[cfg(not(feature = "method-calls"))]
                self.call_suffix()?;
                #[cfg(feature = "method-calls")]
                {
                    method_call = false;
                }
                continue;
            }
            break;
        }
        Ok(())
    }

    #[cfg(all(feature = "functions", feature = "receivers"))]
    fn receiver_term(&mut self) -> bool {
        if !self.receiver_frame || !self.try_word(b"this") {
            return false;
        }
        self.output.push(Opcode::LoadThis as u8);
        true
    }

    #[cfg(all(feature = "functions", not(feature = "receivers")))]
    fn receiver_term(&mut self) -> bool {
        false
    }

    #[cfg(feature = "class-expressions")]
    fn class_expression(&mut self) -> Result<(), CompileError> {
        if !self.consume(b'{') {
            return Err(self.error("{"));
        }
        if self.try_word_after_whitespace(b"constructor") {
            let parameters = self.function_parameters()?;
            self.function_value(
                parameters,
                None,
                FunctionBody::ClassConstructor,
                None,
                false,
                true,
            )?;
        } else {
            self.default_class_value();
        }
        loop {
            self.whitespace();
            if self.consume_raw(b'}') {
                break;
            }
            self.class_expression_method()?;
        }
        Ok(())
    }

    #[cfg(feature = "class-expressions")]
    fn default_class_value(&mut self) {
        self.output.push(Opcode::Closure as u8);
        let target_patch = self.output.len();
        self.output.extend_from_slice(&0_u32.to_le_bytes());
        self.output.extend_from_slice(&0_u16.to_le_bytes());
        self.output.push(Opcode::ToClassConstructor as u8);
        let code = self
            .initial_function_frame(0, true)
            .into_iter()
            .chain([Opcode::LoadThis as u8, Opcode::ReturnReceiverLocals as u8])
            .collect();
        self.functions.push(PendingFunction {
            target_patch,
            code,
            relocations: Vec::new(),
        });
    }

    #[cfg(feature = "class-expressions")]
    fn class_expression_method(&mut self) -> Result<(), CompileError> {
        let static_method = self.try_word(b"static");
        if static_method {
            self.whitespace();
        }
        let (name_start, name_end) = self.identifier()?;
        let parameters = self.function_parameters()?;
        self.output.push(Opcode::DuplicateTop as u8);
        if !static_method {
            self.output.push(Opcode::ConstAtom as u8);
            self.output
                .extend_from_slice(&(b"prototype".len() as u16).to_le_bytes());
            self.output.extend_from_slice(b"prototype");
            self.output.push(Opcode::GetProperty as u8);
        }
        self.output_atom_range(name_start, name_end);
        self.function_value(parameters, None, FunctionBody::Method, None, false, false)?;
        self.output.push(Opcode::SetPropertyStatement as u8);
        Ok(())
    }

    #[cfg(feature = "function-arguments")]
    fn call_suffix(
        &mut self,
        #[cfg(feature = "method-calls")] method: bool,
    ) -> Result<(), CompileError> {
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
        #[cfg(feature = "method-calls")]
        self.output.push(if method {
            Opcode::CallMethodArguments as u8
        } else {
            Opcode::CallValueArguments as u8
        });
        #[cfg(not(feature = "method-calls"))]
        self.output.push(Opcode::CallValueArguments as u8);
        self.output.extend_from_slice(&count.to_le_bytes());
        Ok(())
    }

    #[cfg(all(feature = "functions", not(feature = "function-arguments")))]
    fn call_suffix(
        &mut self,
        #[cfg(feature = "method-calls")] method: bool,
    ) -> Result<(), CompileError> {
        if !self.consume(b')') {
            return Err(self.error(")"));
        }
        #[cfg(feature = "method-calls")]
        {
            if method {
                self.output.push(Opcode::CallMethodArguments as u8);
                self.output.extend_from_slice(&0_u16.to_le_bytes());
            } else {
                self.output.push(Opcode::CallValue as u8);
            }
        }
        #[cfg(not(feature = "method-calls"))]
        self.output.push(Opcode::CallValue as u8);
        Ok(())
    }

    #[cfg(not(feature = "functions"))]
    fn term(&mut self, binding: Option<(usize, usize)>) -> Result<(bool, TermKind), CompileError> {
        self.whitespace();
        #[cfg(feature = "async")]
        let awaiting = self.try_word(b"await");
        self.whitespace();
        let binding = binding.filter(|(start, end)| {
            self.source[self.offset..].starts_with(&self.source[*start..*end])
                && self.identifier_end(self.offset + end - start)
        });
        let (used_binding, kind) = if let Some((start, end)) = binding {
            self.offset += end - start;
            (true, TermKind::General)
        } else if let Some(local) = self.non_function_local_term() {
            local
        } else {
            if self.string_literal()? {
                (false, string_term_kind())
            } else if self.array_literal()? || self.object_literal()? {
                (false, TermKind::General)
            } else if let Some(immediate) = self.immediate() {
                self.output.push(Opcode::ConstImmediate as u8);
                self.output.push(immediate as u8);
                (false, TermKind::General)
            } else {
                let immediate = self.number()?;
                (false, immediate.map_or(TermKind::General, TermKind::I30))
            }
        };
        #[cfg(any(feature = "array-indexing", feature = "objects"))]
        let mut kind = kind;
        #[cfg(any(feature = "array-indexing", feature = "objects"))]
        loop {
            #[cfg(feature = "objects")]
            if self.consume(b'.') {
                self.whitespace();
                let (start, end) = self.identifier()?;
                self.output_atom_range(start, end);
                self.output.push(Opcode::GetProperty as u8);
                kind = TermKind::General;
                continue;
            }
            #[cfg(feature = "array-indexing")]
            if self.consume(b'[') {
                self.expression(None)?;
                if !self.consume(b']') {
                    return Err(self.error("]"));
                }
                self.output.push(Opcode::GetIndex as u8);
                kind = TermKind::General;
                continue;
            }
            break;
        }
        #[cfg(feature = "async")]
        if awaiting {
            self.output.push(Opcode::Await as u8);
        }
        Ok((used_binding, kind))
    }

    #[cfg(all(not(feature = "functions"), feature = "locals"))]
    fn non_function_local_term(&mut self) -> Option<(bool, TermKind)> {
        let local = self.local_at_offset()?;
        self.offset += local.end - local.start;
        self.output.push(Opcode::LoadLocal as u8);
        self.output.extend_from_slice(&local.slot.to_le_bytes());
        Some((false, TermKind::General))
    }

    #[cfg(all(not(feature = "functions"), not(feature = "locals")))]
    fn non_function_local_term(&mut self) -> Option<(bool, TermKind)> {
        None
    }

    #[cfg(feature = "strings")]
    fn string_literal(&mut self) -> Result<bool, CompileError> {
        let Some(delimiter @ (b'\'' | b'"' | b'`')) = self.source.get(self.offset).copied() else {
            return Ok(false);
        };
        self.offset += 1;
        self.output.push(Opcode::ConstString as u8);
        let length_patch = self.output.len();
        self.output.extend_from_slice(&0_u16.to_le_bytes());
        let content_start = self.output.len();
        loop {
            let Some(byte) = self.source.get(self.offset).copied() else {
                return Err(self.error("a closing string delimiter"));
            };
            if byte == delimiter {
                self.offset += 1;
                break;
            }
            if delimiter != b'`' && matches!(byte, b'\n' | b'\r') {
                return Err(self.error("a closing string delimiter"));
            }
            if delimiter == b'`' && self.source[self.offset..].starts_with(b"${") {
                return Err(self.error("a template literal without substitutions"));
            }
            self.offset += 1;
            if byte != b'\\' {
                self.output.push(byte);
                continue;
            }
            let Some(escaped) = self.source.get(self.offset).copied() else {
                return Err(self.error("a string escape"));
            };
            self.offset += 1;
            self.output.push(match escaped {
                b'b' => 0x08,
                b'f' => 0x0c,
                b'n' => b'\n',
                b'r' => b'\r',
                b't' => b'\t',
                b'v' => 0x0b,
                b'0' => 0,
                b'\'' | b'"' | b'`' | b'\\' => escaped,
                _ => return Err(self.error("a supported string escape")),
            });
        }
        let length = self.output.len() - content_start;
        let length =
            u16::try_from(length).map_err(|_| self.error("a string shorter than 64 KiB"))?;
        self.output[length_patch..length_patch + 2].copy_from_slice(&length.to_le_bytes());
        Ok(true)
    }

    #[cfg(not(feature = "strings"))]
    fn string_literal(&mut self) -> Result<bool, CompileError> {
        Ok(false)
    }

    fn identifier_end(&self, offset: usize) -> bool {
        !self
            .source
            .get(offset)
            .is_some_and(|byte| byte.is_ascii_alphanumeric() || *byte == b'_' || *byte == b'$')
    }

    #[cfg(feature = "host-bindings")]
    fn host_global_at_offset(&self) -> Option<u32> {
        self.host_globals
            .iter()
            .enumerate()
            .find_map(|(index, name)| {
                (self.source[self.offset..].starts_with(name)
                    && self.identifier_end(self.offset + name.len()))
                .then(|| u32::try_from(index).ok())
                .flatten()
            })
    }

    #[cfg(not(feature = "host-bindings"))]
    fn host_global_at_offset(&self) -> Option<u32> {
        None
    }

    #[cfg(all(feature = "recursive-async-functions", feature = "recursive-functions"))]
    fn allows_named_function(&self, _asynchronous: bool) -> bool {
        true
    }

    #[cfg(all(
        feature = "recursive-async-functions",
        not(feature = "recursive-functions")
    ))]
    fn allows_named_function(&self, asynchronous: bool) -> bool {
        asynchronous
    }

    #[cfg(all(
        not(feature = "recursive-async-functions"),
        feature = "recursive-functions"
    ))]
    fn allows_named_function(&self, asynchronous: bool) -> bool {
        !asynchronous
    }

    #[cfg(all(
        feature = "functions",
        not(feature = "recursive-async-functions"),
        not(feature = "recursive-functions")
    ))]
    fn allows_named_function(&self, _asynchronous: bool) -> bool {
        false
    }

    #[cfg(feature = "locals")]
    fn local_at_offset(&self) -> Option<Binding> {
        self.locals.iter().rev().copied().find(|binding| {
            let name = &self.source[binding.start..binding.end];
            self.source[self.offset..].starts_with(name)
                && self.identifier_end(self.offset + name.len())
        })
    }

    #[cfg(feature = "environments")]
    fn capture_at_offset(&mut self) -> Result<Option<(u16, Binding)>, CompileError> {
        let Some(binding) = self.outer_binding_at_offset() else {
            return Ok(None);
        };
        let index = self.intern_capture(binding)?;
        Ok(Some((index, binding)))
    }

    #[cfg(feature = "environments")]
    fn outer_binding_at_offset(&self) -> Option<Binding> {
        self.outer_bindings.iter().rev().copied().find(|binding| {
            let name = &self.source[binding.start..binding.end];
            self.source[self.offset..].starts_with(name)
                && self.identifier_end(self.offset + name.len())
        })
    }

    #[cfg(all(feature = "functions", not(feature = "environments")))]
    fn capture_at_offset(&mut self) -> Result<Option<(u16, Binding)>, CompileError> {
        Ok(None)
    }

    #[cfg(feature = "environments")]
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

    fn number(&mut self) -> Result<Option<i32>, CompileError> {
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
                #[cfg(any(feature = "number-negation", feature = "number-operations"))]
                let preserve_negative_zero = self.options.numbers == NumberMode::JavaScript
                    && value == 0
                    && source.starts_with('-');
                #[cfg(not(any(feature = "number-negation", feature = "number-operations")))]
                let preserve_negative_zero = false;
                if !preserve_negative_zero && (-(1 << 29)..(1 << 29)).contains(&value) {
                    self.output.push(Opcode::ConstI30 as u8);
                    self.output.extend_from_slice(&value.to_le_bytes());
                    return Ok(Some(value));
                }
            }
        }
        #[cfg(not(feature = "numbers"))]
        {
            self.offset = start;
            Err(self.error("a number"))
        }
        #[cfg(feature = "numbers")]
        {
            let value = microesnext_values::decimal_to_f64::parse(source.as_bytes())
                .ok_or_else(|| self.error("a number"))?;
            self.output.push(Opcode::ConstF64 as u8);
            self.output
                .extend_from_slice(&value.to_bits().to_le_bytes());
            Ok(None)
        }
    }

    #[cfg(any(
        feature = "exceptions",
        feature = "functions",
        feature = "locals",
        feature = "objects"
    ))]
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

    #[cfg(feature = "objects")]
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

    #[cfg(any(feature = "classes", feature = "control-flow", feature = "exceptions"))]
    fn try_word_after_whitespace(&mut self, word: &[u8]) -> bool {
        self.whitespace();
        self.try_word(word)
    }

    #[cfg(all(feature = "functions", feature = "async-functions"))]
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

    #[cfg(all(feature = "functions", not(feature = "async-functions")))]
    fn try_async_function(&mut self) -> bool {
        false
    }

    fn consume(&mut self, byte: u8) -> bool {
        self.whitespace();
        self.consume_raw(byte)
    }

    #[cfg(any(feature = "equality", feature = "logical-operations"))]
    fn consume_bytes(&mut self, bytes: &[u8]) -> bool {
        self.whitespace();
        if self.source[self.offset..].starts_with(bytes) {
            self.offset += bytes.len();
            true
        } else {
            false
        }
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
        loop {
            while self
                .source
                .get(self.offset)
                .is_some_and(|byte| byte.is_ascii_whitespace())
            {
                self.offset += 1;
            }
            #[cfg(feature = "comments")]
            if self.source[self.offset..].starts_with(b"//") {
                self.offset += 2;
                while self
                    .source
                    .get(self.offset)
                    .is_some_and(|byte| !matches!(byte, b'\n' | b'\r'))
                {
                    self.offset += 1;
                }
                continue;
            }
            #[cfg(feature = "comments")]
            if self.source[self.offset..].starts_with(b"/*") {
                self.offset += 2;
                while self.offset < self.source.len()
                    && !self.source[self.offset..].starts_with(b"*/")
                {
                    self.offset += 1;
                }
                if self.offset < self.source.len() {
                    self.offset += 2;
                }
                continue;
            }
            break;
        }
    }

    fn error(&self, expected: &'static str) -> CompileError {
        CompileError {
            #[cfg(feature = "source-positions")]
            offset: self.offset,
            expected,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[cfg(feature = "comments")]
    fn ignores_line_and_block_comments_between_tokens() {
        assert!(compile_script("// heading\nreturn /* value */ 42;").is_ok());
    }

    #[test]
    #[cfg(feature = "var-declarations")]
    fn compiles_var_bindings_with_the_local_storage_model() {
        assert!(compile_script("var answer = 42; return answer;").is_ok());
    }

    #[test]
    #[cfg(feature = "host-bindings")]
    fn compiles_named_host_globals_as_opaque_references() {
        let code = compile_script_with_host_globals("return parseInt;", &["parseInt"]).unwrap();
        assert!(
            code.windows(5)
                .any(|bytes| bytes == [Opcode::ConstHost as u8, 0, 0, 0, 0])
        );
    }

    #[cfg(feature = "locals")]
    fn unknown_add_opcode() -> Opcode {
        #[cfg(feature = "number-operations")]
        {
            Opcode::AddNumber
        }
        #[cfg(not(feature = "number-operations"))]
        {
            Opcode::AddI30
        }
    }

    #[cfg(feature = "receivers")]
    fn function_frame_opcode() -> Opcode {
        Opcode::InitReceiverFrame
    }

    #[cfg(all(feature = "function-arguments", not(feature = "receivers")))]
    fn function_frame_opcode() -> Opcode {
        Opcode::InitFrame
    }

    #[cfg(all(feature = "functions", not(feature = "function-arguments")))]
    fn function_frame_opcode() -> Opcode {
        Opcode::InitLocals
    }

    #[cfg(feature = "async")]
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

    #[cfg(feature = "implicit-completions")]
    #[test]
    fn compiles_empty_returns_and_fallthrough_as_undefined() {
        assert_eq!(
            compile_script("").unwrap(),
            [
                Opcode::ConstImmediate as u8,
                Immediate::Undefined as u8,
                Opcode::Return as u8,
            ]
        );
        assert_eq!(
            compile_script("return;").unwrap(),
            [
                Opcode::ConstImmediate as u8,
                Immediate::Undefined as u8,
                Opcode::Return as u8,
            ]
        );
    }

    #[cfg(all(feature = "implicit-completions", feature = "expression-statements"))]
    #[test]
    fn compiles_statement_only_scripts_to_undefined_completion() {
        let code = compile_script("1; true;").unwrap();
        assert_eq!(code.last(), Some(&(Opcode::Return as u8)));
        assert!(
            code.windows(2).any(|bytes| {
                bytes == [Opcode::ConstImmediate as u8, Immediate::Undefined as u8]
            })
        );
    }

    #[cfg(not(feature = "implicit-completions"))]
    #[test]
    fn reduced_compilers_require_explicit_value_completions() {
        assert_eq!(compile_script("").unwrap_err().expected, "return or throw");
        assert_eq!(compile_script("return;").unwrap_err().expected, "a number");
    }

    #[cfg(feature = "expression-statements")]
    #[test]
    fn compiles_expression_statements_as_generic_discards() {
        let code = compile_script("1; true; return 42;").unwrap();
        assert_eq!(
            code.iter()
                .filter(|opcode| **opcode == Opcode::DropTop as u8)
                .count(),
            2
        );
    }

    #[cfg(not(feature = "expression-statements"))]
    #[test]
    fn reduced_compilers_leave_expression_statements_unconsumed() {
        assert_eq!(
            compile_script("1; return 42;").unwrap_err().expected,
            "return or throw"
        );
    }

    #[cfg(all(
        feature = "expression-statements",
        feature = "array-assignment-expressions"
    ))]
    #[test]
    fn compiles_array_assignment_statements_by_composition() {
        let code = compile_script("let values = [0]; values[0] = 42; return values[0];").unwrap();
        assert!(
            code.windows(2).any(|opcodes| {
                opcodes == [Opcode::SetIndexResult as u8, Opcode::DropTop as u8]
            })
        );
    }

    #[cfg(all(
        feature = "expression-statements",
        feature = "function-arguments",
        feature = "control-flow"
    ))]
    #[test]
    fn compiles_calls_before_function_and_branch_completions() {
        let code = compile_script(
            "let ping = () => { 1; return 0; }; if (true) { ping(); return 42; } else { ping(); return 0; }",
        )
        .unwrap();
        assert_eq!(
            code.iter()
                .filter(|opcode| **opcode == Opcode::DropTop as u8)
                .count(),
            3
        );
    }

    #[cfg(feature = "conditional-expressions")]
    #[test]
    fn compiles_right_associative_conditional_expressions() {
        let code = compile_script("return false ? 1 : true ? 2 : 3;").unwrap();
        assert_eq!(
            code.iter()
                .filter(|opcode| **opcode == Opcode::JumpIfFalseBoolean as u8)
                .count(),
            2
        );
        assert_eq!(
            code.iter()
                .filter(|opcode| **opcode == Opcode::Jump as u8)
                .count(),
            2
        );
    }

    #[cfg(all(feature = "control-flow", not(feature = "conditional-expressions")))]
    #[test]
    fn reduced_control_flow_compilers_leave_conditional_syntax_unconsumed() {
        assert_eq!(
            compile_script("return true ? 1 : 2;").unwrap_err().expected,
            "end of input"
        );
    }

    #[cfg(feature = "property-assignment-expressions")]
    #[test]
    fn compiles_local_and_nested_property_assignment_expressions() {
        let direct = compile_script("let object = {}; return object.value = 42;").unwrap();
        assert!(direct.contains(&(Opcode::SetPropertyResult as u8)));

        let nested = compile_script(
            "let inner = {}; let outer = { inner: inner }; return outer.inner.value = 42;",
        )
        .unwrap();
        assert!(nested.contains(&(Opcode::GetProperty as u8)));
        assert!(nested.contains(&(Opcode::SetPropertyResult as u8)));
    }

    #[cfg(all(
        feature = "property-assignment-expressions",
        feature = "captured-assignment-expressions",
        feature = "function-arguments"
    ))]
    #[test]
    fn compiles_captured_property_assignment_expressions() {
        let code = compile_script(
            "let object = {}; let set = () => { return object.value = 42; }; return set();",
        )
        .unwrap();
        assert!(code.contains(&(Opcode::LoadCapture as u8)));
        assert!(code.contains(&(Opcode::SetPropertyResult as u8)));
    }

    #[cfg(all(feature = "property-assignment-expressions", feature = "receivers"))]
    #[test]
    fn compiles_receiver_property_assignment_expressions() {
        let code =
            compile_script("class Box { set() { return this.value = 42; } } return 0;").unwrap();
        assert!(code.contains(&(Opcode::LoadThis as u8)));
        assert!(code.contains(&(Opcode::SetPropertyResult as u8)));
    }

    #[cfg(feature = "exceptions")]
    #[test]
    fn backpatches_a_directly_emitted_catch_target() {
        let code = compile_script("try { throw 17; } catch (error) { return error; }").unwrap();
        assert_eq!(code[0], Opcode::Try as u8);
        let target = u32::from_le_bytes(code[1..5].try_into().unwrap()) as usize;
        assert_eq!(code[target], Opcode::Return as u8);
        assert_eq!(*code.last().unwrap(), Opcode::Return as u8);
    }

    #[cfg(all(feature = "async", feature = "exceptions"))]
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

    #[cfg(feature = "nested-exceptions")]
    #[test]
    fn compiles_nested_exception_regions_from_an_explicit_worklist() {
        let code =
            compile_script("try { try { return 42; } catch { return 1; } } catch { return 2; }")
                .unwrap();
        assert_eq!(
            code.iter()
                .filter(|opcode| **opcode == Opcode::Try as u8)
                .count(),
            2
        );
        assert!(code.windows(3).any(|ops| {
            ops == [
                Opcode::EndTry as u8,
                Opcode::EndTry as u8,
                Opcode::Return as u8,
            ]
        }));
    }

    #[cfg(feature = "nested-exceptions")]
    #[test]
    fn exception_source_depth_does_not_consume_the_rust_stack() {
        let depth = 2_048;
        let mut source = alloc::string::String::new();
        for _ in 0..depth {
            source.push_str("try {");
        }
        source.push_str("return 42;");
        for _ in 0..depth {
            source.push_str("} catch { return 0; }");
        }

        let code = compile_script(&source).unwrap();
        assert!(code.len() > depth * 12);
    }

    #[cfg(feature = "arrays")]
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

    #[cfg(feature = "array-indexing")]
    #[test]
    fn compiles_computed_array_index_reads() {
        let computed = compile_script("return [7, 42][0 + 1];").unwrap();
        assert!(computed.contains(&(Opcode::GetIndex as u8)));
    }

    #[cfg(all(feature = "array-indexing", feature = "literal-expressions"))]
    #[test]
    fn compiles_chained_array_index_reads() {
        let nested = compile_script("return [[1], [42]][1][0];").unwrap();
        assert_eq!(
            nested
                .iter()
                .filter(|opcode| **opcode == Opcode::GetIndex as u8)
                .count(),
            2
        );
    }

    #[cfg(all(feature = "arrays", not(feature = "array-indexing")))]
    #[test]
    fn reduced_array_compilers_leave_index_syntax_unconsumed() {
        assert_eq!(
            compile_script("return [7][0];").unwrap_err().expected,
            "end of input"
        );
    }

    #[cfg(feature = "array-assignment-expressions")]
    #[test]
    fn compiles_computed_and_nested_array_assignment_expressions() {
        let computed =
            compile_script("let values = [0, 0]; let index = 1; return values[index] = 42;")
                .unwrap();
        assert!(computed.contains(&(Opcode::SetIndexResult as u8)));

        let nested = compile_script("let values = [[0]]; return values[0][0] = 42;").unwrap();
        assert!(nested.contains(&(Opcode::GetIndex as u8)));
        assert!(nested.contains(&(Opcode::SetIndexResult as u8)));

        let receiver =
            compile_script("class Box { set() { return this.items[0] = 42; } } return 0;").unwrap();
        assert!(receiver.contains(&(Opcode::LoadThis as u8)));
        assert!(receiver.contains(&(Opcode::GetProperty as u8)));
        assert!(receiver.contains(&(Opcode::SetIndexResult as u8)));
    }

    #[cfg(all(
        feature = "array-indexing",
        feature = "locals",
        not(feature = "array-assignment-expressions")
    ))]
    #[test]
    fn reduced_indexing_compilers_leave_array_assignment_unconsumed() {
        assert_eq!(
            compile_script("let values = [0]; return values[0] = 42;")
                .unwrap_err()
                .expected,
            "end of input"
        );
    }

    #[cfg(all(
        feature = "arrays",
        feature = "literal-expressions",
        feature = "locals"
    ))]
    #[test]
    fn compiles_enclosing_bindings_as_array_values() {
        assert!(compile_script("let value = 7; return [value];").is_ok());
    }

    #[cfg(all(feature = "arrays", not(feature = "literal-expressions")))]
    #[test]
    fn reduced_array_literals_keep_the_numeric_value_parser() {
        assert!(compile_script("return [7];").is_ok());
        assert_eq!(
            compile_script("return [true];").unwrap_err().expected,
            "a number"
        );
    }

    #[cfg(feature = "local-assignment-expressions")]
    #[test]
    fn compiles_right_associative_local_assignment_values() {
        let code =
            compile_script("let left = 0; let right = 0; return left = right = 42;").unwrap();
        assert_eq!(
            code.iter()
                .filter(|byte| **byte == Opcode::DuplicateTop as u8)
                .count(),
            2
        );
    }

    #[cfg(all(feature = "local-assignment-expressions", feature = "equality"))]
    #[test]
    fn assignment_detection_does_not_consume_strict_equality() {
        assert!(compile_script("let value = 1; return value === 1;").is_ok());
    }

    #[cfg(all(feature = "local-assignment-expressions", feature = "functions"))]
    #[test]
    fn assignment_detection_does_not_consume_an_arrow() {
        assert!(compile_script("let identity = value => value; return identity(1);").is_ok());
    }

    #[cfg(all(feature = "locals", not(feature = "local-assignment-expressions")))]
    #[test]
    fn reduced_local_compilers_leave_assignment_expressions_unconsumed() {
        assert_eq!(
            compile_script("let value = 1; return value = 2;")
                .unwrap_err()
                .expected,
            "end of input"
        );
    }

    #[cfg(feature = "captured-assignment-expressions")]
    #[test]
    fn compiles_result_preserving_assignments_to_captured_cells() {
        let outer =
            compile_script("let value = 1; let set = () => { return value = 42; }; return set();")
                .unwrap();
        assert!(outer.contains(&(Opcode::StoreEnvironmentCellResult as u8)));

        let local = compile_script(
            "let value = 1; let read = () => value; let assigned = value = 42; return read();",
        )
        .unwrap();
        assert!(local.contains(&(Opcode::StoreEnvironmentCellResult as u8)));
    }

    #[cfg(all(
        feature = "environments",
        not(feature = "captured-assignment-expressions")
    ))]
    #[test]
    fn reduced_environment_compilers_leave_captured_assignment_unconsumed() {
        assert!(
            compile_script("let value = 1; let set = () => { return value = 42; }; return set();")
                .is_err()
        );
    }

    #[cfg(all(
        feature = "locals",
        feature = "objects",
        not(feature = "property-assignment-expressions")
    ))]
    #[test]
    fn reduced_object_compilers_leave_property_assignment_expressions_unconsumed() {
        assert_eq!(
            compile_script("let object = {}; return object.value = 42;")
                .unwrap_err()
                .expected,
            "end of input"
        );
    }

    #[cfg(all(
        feature = "objects",
        feature = "literal-expressions",
        feature = "locals"
    ))]
    #[test]
    fn compiles_enclosing_bindings_and_nested_object_values() {
        assert!(
            compile_script("let value = 7; return { outer: { answer: value } }.outer.answer;")
                .is_ok()
        );
    }

    #[cfg(all(feature = "objects", not(feature = "literal-expressions")))]
    #[test]
    fn reduced_object_literals_keep_the_numeric_value_parser() {
        assert!(compile_script("return { answer: 7 };").is_ok());
        assert_eq!(
            compile_script("let value = 7; return { answer: value };")
                .unwrap_err()
                .expected,
            "a number"
        );
    }

    #[cfg(feature = "source-positions")]
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

    #[cfg(all(not(feature = "numbers"), feature = "source-positions"))]
    #[test]
    fn reduced_numeric_parser_reports_the_ordinary_source_error() {
        assert_eq!(
            compile_script("return 1.25;").unwrap_err(),
            CompileError {
                offset: 7,
                expected: "a number",
            }
        );
        assert_eq!(compile_script("return 536870912;").unwrap_err().offset, 7);
    }

    #[cfg(all(not(feature = "equality"), feature = "source-positions"))]
    #[test]
    fn reduced_parser_leaves_equality_as_an_ordinary_unexpected_token() {
        assert_eq!(compile_script("return 1 === 1;").unwrap_err().offset, 9);
    }

    #[cfg(all(not(feature = "logical-operations"), feature = "source-positions"))]
    #[test]
    fn reduced_parser_leaves_logical_syntax_as_an_ordinary_unexpected_token() {
        assert_eq!(
            compile_script("return true || false;").unwrap_err().offset,
            12
        );
        assert_eq!(compile_script("return !true;").unwrap_err().offset, 7);
    }

    #[cfg(feature = "logical-operations")]
    #[test]
    fn compiles_repeated_logical_not_without_parser_recursion() {
        let code = compile_script("return !!!false;").unwrap();
        assert_eq!(
            code.iter()
                .filter(|opcode| **opcode == Opcode::LogicalNot as u8)
                .count(),
            3
        );

        let mut source = alloc::string::String::from("return ");
        source.extend(core::iter::repeat_n('!', 20_000));
        source.push_str("false;");
        assert!(compile_script(&source).is_ok());
    }

    #[cfg(all(not(feature = "integer-operations"), feature = "source-positions"))]
    #[test]
    fn reduced_parser_leaves_integer_operators_as_unexpected_tokens() {
        assert_eq!(compile_script("return 2 * 3;").unwrap_err().offset, 9);
    }

    #[cfg(all(not(feature = "integer-negation"), feature = "source-positions"))]
    #[test]
    fn reduced_parser_leaves_numeric_negation_as_an_unexpected_token() {
        assert_eq!(compile_script("return - true;").unwrap_err().offset, 7);
    }

    #[cfg(all(not(feature = "number-coercion"), feature = "source-positions"))]
    #[test]
    fn reduced_parser_leaves_unary_plus_as_an_unexpected_token() {
        assert_eq!(compile_script("return +true;").unwrap_err().offset, 7);
    }

    #[cfg(all(not(feature = "arrays"), feature = "source-positions"))]
    #[test]
    fn reduced_parser_leaves_array_literals_as_unexpected_tokens() {
        assert_eq!(compile_script("return [1];").unwrap_err().offset, 7);
    }

    #[cfg(all(not(feature = "objects"), feature = "source-positions"))]
    #[test]
    fn reduced_parser_leaves_object_syntax_as_unexpected_tokens() {
        assert_eq!(
            compile_script("return { value: 1 };").unwrap_err().offset,
            7
        );
        #[cfg(feature = "locals")]
        assert_eq!(
            compile_script("let value = 1; return value.name;")
                .unwrap_err()
                .offset,
            27
        );
    }

    #[cfg(all(not(feature = "strings"), feature = "source-positions"))]
    #[test]
    fn reduced_parser_leaves_string_literals_as_unexpected_tokens() {
        assert_eq!(compile_script("return 'value';").unwrap_err().offset, 7);
        assert_eq!(compile_script("return `value`; ").unwrap_err().offset, 7);
    }

    #[cfg(all(not(feature = "control-flow"), feature = "source-positions"))]
    #[test]
    fn reduced_parser_leaves_control_flow_as_an_unexpected_token() {
        assert_eq!(
            compile_script("if (true) { return 1; } else { return 2; }")
                .unwrap_err()
                .offset,
            0
        );
        assert_eq!(
            compile_script("while (true) { return 1; } return 2;")
                .unwrap_err()
                .offset,
            0
        );
    }

    #[cfg(all(not(feature = "exceptions"), feature = "source-positions"))]
    #[test]
    fn reduced_parser_leaves_try_as_an_unexpected_token() {
        assert_eq!(
            compile_script("try { return 1; } catch { return 2; }")
                .unwrap_err()
                .offset,
            0
        );
    }

    #[cfg(all(not(feature = "async"), feature = "source-positions"))]
    #[test]
    fn reduced_parser_leaves_await_as_an_unexpected_token() {
        assert_eq!(compile_script("return await 1;").unwrap_err().offset, 7);
    }

    #[cfg(all(not(feature = "async-functions"), feature = "source-positions"))]
    #[test]
    fn reduced_parser_leaves_async_functions_as_unexpected_tokens() {
        assert_eq!(
            compile_script("async function value() { return 1; } return value();")
                .unwrap_err()
                .offset,
            0
        );
    }

    #[cfg(all(not(feature = "locals"), feature = "source-positions"))]
    #[test]
    fn reduced_parser_leaves_local_declarations_as_unexpected_tokens() {
        assert_eq!(
            compile_script("let value = 1; return value;")
                .unwrap_err()
                .offset,
            0
        );
    }

    #[cfg(all(not(feature = "functions"), feature = "source-positions"))]
    #[test]
    fn reduced_parser_leaves_functions_and_calls_as_unexpected_tokens() {
        assert_eq!(
            compile_script("function value() { return 1; } return value();")
                .unwrap_err()
                .offset,
            0
        );
        assert_eq!(compile_script("return 1();").unwrap_err().offset, 8);
    }

    #[cfg(all(
        feature = "functions",
        not(feature = "environments"),
        feature = "source-positions"
    ))]
    #[test]
    fn basic_functions_leave_outer_bindings_as_ordinary_unexpected_tokens() {
        let source = "let value = 1; function read() { return value; } return read();";
        let error = compile_script(source).unwrap_err();
        assert_eq!(error.expected, "a number");
        assert_eq!(error.offset, source.find("value; }").unwrap());
    }

    #[cfg(all(
        feature = "functions",
        not(feature = "recursive-functions"),
        feature = "source-positions"
    ))]
    #[test]
    fn basic_functions_leave_named_expressions_as_unexpected_tokens() {
        assert_eq!(
            compile_script("return function named() { return 1; };")
                .unwrap_err()
                .offset,
            16
        );
    }

    #[cfg(all(
        feature = "functions",
        not(feature = "function-arguments"),
        feature = "source-positions"
    ))]
    #[test]
    fn basic_functions_leave_parameters_and_arguments_as_unexpected_tokens() {
        let parameters = "function value(input) { return 1; } return value();";
        assert_eq!(
            compile_script(parameters).unwrap_err().offset,
            parameters.find("input").unwrap()
        );
        let arguments = "function value() { return 1; } return value(1);";
        assert_eq!(
            compile_script(arguments).unwrap_err().offset,
            arguments.find("1);").unwrap()
        );
    }

    #[cfg(all(
        feature = "async-functions",
        not(feature = "recursive-async-functions"),
        feature = "source-positions"
    ))]
    #[test]
    fn basic_async_functions_leave_named_expressions_as_unexpected_tokens() {
        assert_eq!(
            compile_script("return async function named() { return 1; };")
                .unwrap_err()
                .offset,
            22
        );
    }

    #[cfg(feature = "number-operations")]
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

    #[cfg(feature = "number-division")]
    #[test]
    fn emits_division_as_an_independent_product_family() {
        let code = compile_script("return 7 / 2;").unwrap();
        assert!(code.contains(&(Opcode::DivideNumber as u8)));
    }

    #[cfg(feature = "number-remainder")]
    #[test]
    fn emits_remainder_as_an_independent_product_family() {
        let code = compile_script("return 7 % 2;").unwrap();
        assert!(code.contains(&(Opcode::RemainderNumber as u8)));
    }

    #[cfg(all(not(feature = "number-division"), feature = "source-positions"))]
    #[test]
    fn reduced_parser_leaves_division_as_an_unexpected_token() {
        assert_eq!(compile_script("return 7 / 2;").unwrap_err().offset, 9);
    }

    #[cfg(all(not(feature = "number-remainder"), feature = "source-positions"))]
    #[test]
    fn reduced_parser_leaves_remainder_as_an_unexpected_token() {
        assert_eq!(compile_script("return 7 % 2;").unwrap_err().offset, 9);
    }

    #[cfg(feature = "number-negation")]
    #[test]
    fn selects_immediate_or_promoted_numeric_negation() {
        let negative = compile_script("return - 42;").unwrap();
        assert!(negative.contains(&(Opcode::NegateI30 as u8)));
        assert!(!negative.contains(&(Opcode::NegateNumber as u8)));

        let spaced_negative_zero = compile_script("return - 0;").unwrap();
        assert!(spaced_negative_zero.contains(&(Opcode::NegateNumber as u8)));

        #[cfg(feature = "numbers")]
        assert!(
            compile_script("return -0;")
                .unwrap()
                .contains(&(Opcode::ConstF64 as u8))
        );
    }

    #[cfg(feature = "number-coercion")]
    #[test]
    fn emits_unary_plus_only_when_coercion_is_needed() {
        let integer = compile_script("return +42;").unwrap();
        assert!(!integer.contains(&(Opcode::ToNumber as u8)));
        let boolean = compile_script("return +true;").unwrap();
        assert!(boolean.contains(&(Opcode::ToNumber as u8)));
    }

    #[cfg(feature = "typeof")]
    #[test]
    fn compiles_typeof_as_a_repeatable_unary_operator() {
        let single = compile_script("return typeof true;").unwrap();
        assert!(single.contains(&(Opcode::TypeOf as u8)));
        let repeated = compile_script("return typeof typeof true;").unwrap();
        assert_eq!(
            repeated
                .iter()
                .filter(|opcode| **opcode == Opcode::TypeOf as u8)
                .count(),
            2
        );
    }

    #[cfg(all(feature = "typeof", feature = "number-coercion"))]
    #[test]
    fn preserves_mixed_unary_operator_order() {
        let code = compile_script("return typeof +true;").unwrap();
        assert!(
            code.windows(2)
                .any(|operations| { operations == [Opcode::ToNumber as u8, Opcode::TypeOf as u8] })
        );
    }

    #[cfg(all(not(feature = "typeof"), feature = "source-positions"))]
    #[test]
    fn reduced_parser_leaves_typeof_as_an_unexpected_word() {
        assert_eq!(compile_script("return typeof true;").unwrap_err().offset, 7);
    }

    #[cfg(all(feature = "typeof", feature = "source-positions"))]
    #[test]
    fn does_not_parse_a_typeof_identifier_prefix_as_the_operator() {
        assert_eq!(compile_script("return typeofValue;").unwrap_err().offset, 7);
    }

    #[cfg(feature = "instanceof")]
    #[test]
    fn compiles_left_associative_instanceof_without_numeric_relations() {
        let code = compile_script("return null instanceof true instanceof false;").unwrap();
        assert_eq!(
            code.iter()
                .filter(|opcode| **opcode == Opcode::InstanceOf as u8)
                .count(),
            2
        );
    }

    #[cfg(not(feature = "instanceof"))]
    #[test]
    fn leaves_instanceof_unconsumed_when_omitted() {
        assert_eq!(
            compile_script("return null instanceof true;")
                .unwrap_err()
                .expected,
            "end of input"
        );
    }

    #[cfg(feature = "integer-negation")]
    #[test]
    fn compiles_numeric_negation_without_native_parser_recursion() {
        let mut source = alloc::string::String::from("return ");
        source.extend(core::iter::repeat_n("- ", 20_000));
        source.push_str("1;");
        let code = compile_script_with_options(
            &source,
            CompileOptions {
                numbers: NumberMode::BoundedI30,
            },
        )
        .unwrap();
        assert_eq!(
            code.iter()
                .filter(|opcode| **opcode == Opcode::NegateI30 as u8)
                .count(),
            20_000
        );
    }

    #[cfg(all(feature = "locals", feature = "number-operations"))]
    #[test]
    fn promotes_only_when_the_selected_numeric_target_requires_it() {
        let overflow = compile_script("return 536870911 + 1;").unwrap();
        assert!(overflow.contains(&(Opcode::AddNumber as u8)));
        assert!(!overflow.contains(&(Opcode::AddI30 as u8)));

        let bounded = compile_script_with_options(
            "let value = 536870911; return value + 1;",
            CompileOptions {
                numbers: NumberMode::BoundedI30,
            },
        )
        .unwrap();
        assert!(bounded.contains(&(Opcode::AddI30 as u8)));
        assert!(!bounded.contains(&(Opcode::AddNumber as u8)));

        let promoted = compile_script("let value = 536870911; return value * 2;").unwrap();
        assert!(promoted.contains(&(Opcode::MultiplyNumber as u8)));
    }

    #[cfg(feature = "objects")]
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

    #[cfg(feature = "strings")]
    #[test]
    fn compiles_quoted_strings_directly_to_string_bytecode() {
        assert_eq!(
            compile_script("return \"hello\\nworld\";").unwrap(),
            Builder::new()
                .string(b"hello\nworld")
                .op(Opcode::Return)
                .finish()
        );
        assert_eq!(
            compile_script("return 'it\\'s compact';").unwrap(),
            Builder::new()
                .string(b"it's compact")
                .op(Opcode::Return)
                .finish()
        );
    }

    #[cfg(feature = "strings")]
    #[test]
    fn compiles_no_substitution_templates_and_rejects_unknown_forms() {
        assert_eq!(
            compile_script("return `first\nsecond`;").unwrap(),
            Builder::new()
                .string(b"first\nsecond")
                .op(Opcode::Return)
                .finish()
        );
        assert_eq!(
            compile_script("return `value: ${value}`;")
                .unwrap_err()
                .expected,
            "a template literal without substitutions"
        );
        assert_eq!(
            compile_script("return '\\x41';").unwrap_err().expected,
            "a supported string escape"
        );
    }

    #[cfg(feature = "string-operations")]
    #[test]
    fn emits_strict_concatenation_only_for_proven_strings() {
        let code = compile_script("return 'micro' + `esnext`;").unwrap();
        assert!(code.contains(&(Opcode::ConcatenateStrings as u8)));

        let numeric = compile_script("return 1 + 2;").unwrap();
        assert!(!numeric.contains(&(Opcode::ConcatenateStrings as u8)));
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

    #[cfg(feature = "source-positions")]
    #[test]
    fn does_not_parse_a_keyword_prefix_as_an_immediate() {
        assert_eq!(compile_script("return trueValue;").unwrap_err().offset, 7);
        assert_eq!(compile_script("return true$value;").unwrap_err().offset, 7);
    }

    #[cfg(feature = "locals")]
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
                .op(unknown_add_opcode())
                .store_local(1)
                .load_local(1)
                .op(Opcode::ReturnLocals)
                .finish()
        );
    }

    #[cfg(feature = "locals")]
    #[test]
    fn compiles_multiple_bindings_in_one_declaration() {
        assert_eq!(
            compile_script("let forty = 40, answer = forty + 2; return answer;").unwrap(),
            Builder::new()
                .init_locals(2)
                .const_i30(40)
                .store_local(0)
                .load_local(0)
                .const_i30(2)
                .op(unknown_add_opcode())
                .store_local(1)
                .load_local(1)
                .op(Opcode::ReturnLocals)
                .finish()
        );
    }

    #[cfg(feature = "function-arguments")]
    #[test]
    fn appends_source_functions_and_backpatches_their_entry() {
        let code =
            compile_script("function identity(value) { return value; } return identity(42);")
                .unwrap();
        assert_eq!(code[0], Opcode::InitLocals as u8);
        assert_eq!(code[3], Opcode::Closure as u8);
        let target = u32::from_le_bytes(code[4..8].try_into().unwrap()) as usize;
        assert!(target < code.len());
        assert_eq!(code[target], function_frame_opcode() as u8);
        assert!(
            code.windows(3)
                .any(|bytes| { bytes == [Opcode::CallValueArguments as u8, 1, 0] })
        );
        #[cfg(feature = "receivers")]
        assert_eq!(code.last(), Some(&(Opcode::ReturnReceiverLocals as u8)));
        #[cfg(not(feature = "receivers"))]
        assert_eq!(code.last(), Some(&(Opcode::ReturnLocals as u8)));
    }

    #[cfg(feature = "async-functions")]
    #[test]
    fn compiles_async_declarations_to_the_async_closure_capability() {
        let code = compile_script("async function answer() { return await 42; } return answer();")
            .unwrap();
        assert!(code.contains(&(Opcode::AsyncClosure as u8)));
        assert!(code.contains(&(Opcode::Await as u8)));
        assert!(!code.contains(&(Opcode::Closure as u8)));
    }

    #[cfg(feature = "async-functions")]
    #[test]
    fn compiles_async_expressions_and_arrows_to_async_closures() {
        for source in [
            "return async function () { return await 42; }();",
            "let answer = async () => await 42; return answer();",
        ] {
            let code = compile_script(source).unwrap();
            assert!(code.contains(&(Opcode::AsyncClosure as u8)));
            assert!(code.contains(&(Opcode::Await as u8)));
        }
    }

    #[cfg(all(feature = "async-functions", feature = "function-arguments"))]
    #[test]
    fn compiles_async_parameters_and_arguments() {
        let code = compile_script(
            "let identity = async value => { return await value; }; return identity(42);",
        )
        .unwrap();
        assert!(code.contains(&(Opcode::AsyncClosure as u8)));
        assert!(code.contains(&(Opcode::CallValueArguments as u8)));
    }

    #[cfg(feature = "recursive-async-functions")]
    #[test]
    fn compiles_named_async_expressions_with_a_private_self_capture() {
        let code =
            compile_script("return async function named() { return await named; }();").unwrap();
        assert!(code.contains(&(Opcode::RecursiveAsyncClosure as u8)));
        assert!(code.contains(&(Opcode::Await as u8)));
    }

    #[cfg(feature = "async-functions")]
    #[test]
    fn keeps_async_available_as_an_ordinary_binding() {
        let code = compile_script("let async = 41; return async + 1;").unwrap();
        assert!(!code.contains(&(Opcode::AsyncClosure as u8)));
    }

    #[cfg(feature = "function-arguments")]
    #[test]
    fn compiles_zero_parameter_calls_with_a_function_frame() {
        let code = compile_script("function answer() { return 42; } return answer();").unwrap();
        let target = u32::from_le_bytes(code[4..8].try_into().unwrap()) as usize;
        assert_eq!(
            &code[target..target + 5],
            &[function_frame_opcode() as u8, 0, 0, 0, 0]
        );
        #[cfg(feature = "receivers")]
        assert_eq!(code.last(), Some(&(Opcode::ReturnReceiverLocals as u8)));
        #[cfg(not(feature = "receivers"))]
        assert_eq!(code.last(), Some(&(Opcode::ReturnLocals as u8)));
    }

    #[cfg(all(feature = "functions", not(feature = "function-arguments")))]
    #[test]
    fn compiles_zero_parameter_calls_without_an_argument_frame() {
        let code = compile_script("function answer() { return 42; } return answer();").unwrap();
        let target = u32::from_le_bytes(code[4..8].try_into().unwrap()) as usize;
        assert_eq!(&code[target..target + 3], &[Opcode::InitLocals as u8, 0, 0]);
        assert!(code.contains(&(Opcode::CallValue as u8)));
    }

    #[cfg(feature = "function-arguments")]
    #[test]
    fn compiles_an_anonymous_function_expression_as_a_value() {
        let code = compile_script("return function (value) { return value; }(42);").unwrap();
        assert_eq!(code[0], Opcode::Closure as u8);
        let target = u32::from_le_bytes(code[1..5].try_into().unwrap()) as usize;
        assert_eq!(code[target], function_frame_opcode() as u8);
        assert!(
            code.windows(3)
                .any(|bytes| { bytes == [Opcode::CallValueArguments as u8, 1, 0] })
        );
    }

    #[cfg(feature = "recursive-functions")]
    #[test]
    fn compiles_a_named_expression_with_a_private_self_capture() {
        let code = compile_script(
            "let value = function privateName() { return privateName; }; return value();",
        )
        .unwrap();
        assert!(code.contains(&(Opcode::RecursiveClosure as u8)));
        #[cfg(feature = "source-positions")]
        assert_eq!(
            compile_script(
                "let value = function privateName() { return 42; }; return privateName();"
            )
            .unwrap_err()
            .offset,
            58
        );
    }

    #[cfg(feature = "function-arguments")]
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
    #[cfg(feature = "parenthesized-expressions")]
    fn compiles_parenthesized_expressions_and_immediate_calls() {
        assert!(compile_script("return (40 + 2);").is_ok());
        assert!(compile_script("return (() => 42)();").is_ok());
    }

    #[cfg(feature = "constructors")]
    #[test]
    fn wraps_ordinary_functions_but_not_arrows_as_constructors() {
        let function = compile_script("return function () { return true; };").unwrap();
        assert!(function.contains(&(Opcode::ToConstructor as u8)));

        let arrow = compile_script("return () => true;").unwrap();
        assert!(!arrow.contains(&(Opcode::ToConstructor as u8)));

        #[cfg(feature = "async-functions")]
        {
            let asynchronous =
                compile_script("return async function () { return true; };").unwrap();
            assert!(!asynchronous.contains(&(Opcode::ToConstructor as u8)));
        }
    }

    #[cfg(feature = "construction")]
    #[test]
    fn compiles_direct_new_calls_as_construct_and_result_selection() {
        let code = compile_script(
            "let Constructor = function () { return this; }; return new Constructor();",
        )
        .unwrap();
        assert!(
            code.windows(3)
                .any(|bytes| { bytes == [Opcode::ConstructValueArguments as u8, 0, 0] })
        );
        assert!(code.contains(&(Opcode::SelectConstructedResult as u8)));
        assert!(code.contains(&(Opcode::LoadThis as u8)));

        let without_parentheses = compile_script(
            "let Constructor = function () { return this; }; return new Constructor;",
        )
        .unwrap();
        assert!(
            without_parentheses
                .windows(3)
                .any(|bytes| { bytes == [Opcode::ConstructValueArguments as u8, 0, 0] })
        );

        #[cfg(feature = "objects")]
        {
            let continued = compile_script(
                "let Constructor = function () { return this; }; \
                 return new Constructor().answer;",
            )
            .unwrap();
            let construct = continued
                .iter()
                .position(|byte| *byte == Opcode::ConstructValueArguments as u8)
                .unwrap();
            let property = continued
                .iter()
                .rposition(|byte| *byte == Opcode::GetProperty as u8)
                .unwrap();
            assert!(construct < property);
        }

        #[cfg(feature = "method-calls")]
        assert!(
            compile_script(
                "class Type { constructor() {} read() { return 42; } } \
             return new Type().read();"
            )
            .is_ok()
        );
    }

    #[cfg(all(feature = "property-assignment", feature = "receivers"))]
    #[test]
    fn compiles_receiver_property_assignment_as_a_statement() {
        let code = compile_script(
            "let Constructor = function (value) { this.answer = value; return this; }; \
             return new Constructor(42);",
        )
        .unwrap();
        assert!(code.contains(&(Opcode::SetPropertyStatement as u8)));
    }

    #[cfg(feature = "recursive-constructors")]
    #[test]
    fn rebinds_only_named_constructor_expressions() {
        let named =
            compile_script("return function PrivateName() { return PrivateName; };").unwrap();
        assert!(named.contains(&(Opcode::RebindConstructorSelf as u8)));

        let declaration =
            compile_script("function declared() { return declared; } return declared;").unwrap();
        assert!(!declaration.contains(&(Opcode::RebindConstructorSelf as u8)));
    }

    #[cfg(feature = "function-arguments")]
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
            &[function_frame_opcode() as u8, 2, 0, 2, 0]
        );
    }

    #[cfg(feature = "function-arguments")]
    #[test]
    fn rejects_duplicate_parameters() {
        assert_eq!(
            compile_script("function bad(value, value) { return value; } return bad(1, 2);")
                .unwrap_err()
                .expected,
            "a unique parameter binding"
        );
    }

    #[cfg(feature = "function-arguments")]
    #[test]
    fn compiles_function_local_bindings_into_the_parameter_frame() {
        let code = compile_script(
            "function addBase(value) { let base = 40; return base + value; } return addBase(2);",
        )
        .unwrap();
        let target = u32::from_le_bytes(code[4..8].try_into().unwrap()) as usize;
        assert_eq!(
            &code[target..target + 5],
            &[function_frame_opcode() as u8, 2, 0, 1, 0]
        );
        assert!(
            code[target..]
                .windows(3)
                .any(|bytes| { bytes == [Opcode::StoreLocal as u8, 1, 0] })
        );
    }

    #[cfg(feature = "environments")]
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

    #[cfg(feature = "environments")]
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

    #[cfg(feature = "environments")]
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

    #[cfg(feature = "functions")]
    #[test]
    fn relocates_a_nested_function_body_when_appending_its_parent() {
        let code = compile_script(
            "function outer() { function inner() { return 42; } return inner(); } return outer();",
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
                .all(|target| { code[*target] == function_frame_opcode() as u8 })
        );
        assert_ne!(closure_targets[0], closure_targets[1]);
    }

    #[cfg(feature = "environments")]
    #[test]
    fn forwards_a_capture_through_an_intermediate_function() {
        let code = compile_script(
            "function outer() { let value = 42; function middle() { function inner() { return value; } return inner(); } return middle(); } return outer();",
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

    #[cfg(feature = "locals")]
    #[test]
    fn rejects_duplicate_and_forward_local_bindings() {
        assert_eq!(
            compile_script("let value = 1; let value = 2; return value;")
                .unwrap_err()
                .expected,
            "a unique local binding"
        );
        #[cfg(feature = "source-positions")]
        assert_eq!(
            compile_script("let answer = later; let later = 42; return answer;")
                .unwrap_err()
                .offset,
            13
        );
    }

    #[cfg(feature = "control-flow")]
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

    #[cfg(feature = "nonterminal-conditionals")]
    #[test]
    fn compiles_fallthrough_conditionals_before_later_statements() {
        let code = compile_script("if (true) {} else {} return 42;").unwrap();
        assert_eq!(
            code.iter()
                .filter(|opcode| **opcode == Opcode::JumpIfFalseBoolean as u8)
                .count(),
            1
        );
        assert_eq!(
            code.iter()
                .filter(|opcode| **opcode == Opcode::Jump as u8)
                .count(),
            1
        );
    }

    #[cfg(feature = "nonterminal-conditionals")]
    #[test]
    fn avoids_a_join_jump_after_an_abrupt_consequent() {
        let code = compile_script("if (true) { return 42; } else {} return 7;").unwrap();
        assert!(!code.contains(&(Opcode::Jump as u8)));
    }

    #[cfg(feature = "nested-conditionals")]
    #[test]
    fn compiles_nested_conditional_joins_from_an_explicit_worklist() {
        let code = compile_script(
            "let answer = 0; \
             if (true) { \
               if (false) { answer = 1; } else { answer = 42; } \
             } else { answer = 7; } \
             return answer;",
        )
        .unwrap();
        assert_eq!(
            code.iter()
                .filter(|opcode| **opcode == Opcode::JumpIfFalseBoolean as u8)
                .count(),
            2
        );
    }

    #[cfg(feature = "nested-conditionals")]
    #[test]
    fn conditional_source_depth_does_not_consume_the_rust_stack() {
        let depth = 2_048;
        let mut source = alloc::string::String::new();
        for _ in 0..depth {
            source.push_str("if (true) {");
        }
        source.push_str("return 42;");
        for _ in 0..depth {
            source.push_str("} else { return 0; }");
        }

        let code = compile_script(&source).unwrap();
        assert!(code.len() > depth * 10);
    }

    #[cfg(feature = "nested-loops")]
    #[test]
    fn compiles_mixed_nested_loops_and_conditionals_from_one_worklist() {
        let code = compile_script(
            "let outer = true; let inner = false; \
             while (outer) { \
               if (true) { while (inner) {} } else {} \
               outer = false; \
             } \
             return 42;",
        )
        .unwrap();
        assert!(code.len() > 30);
    }

    #[cfg(feature = "nested-loops")]
    #[test]
    fn loop_source_depth_does_not_consume_the_rust_stack() {
        let depth = 2_048;
        let mut source = alloc::string::String::new();
        for _ in 0..depth {
            source.push_str("while (false) {");
        }
        for _ in 0..depth {
            source.push('}');
        }
        source.push_str("return 42;");

        let code = compile_script(&source).unwrap();
        assert!(code.len() > depth * 10);
    }

    #[cfg(all(feature = "control-flow", feature = "locals"))]
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

    #[cfg(feature = "integer-operations")]
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

    #[cfg(feature = "classes")]
    #[test]
    fn compiles_a_focused_class_constructor_without_lowering_it_to_a_function() {
        let code = compile_script(
            "class Rectangle { constructor(width) { this.width = width; } } \
             let rectangle = new Rectangle(42); return rectangle.width;",
        )
        .unwrap();

        assert!(code.contains(&(Opcode::ToClassConstructor as u8)));
        assert!(code.contains(&(Opcode::ConstructValueArguments as u8)));
        assert!(code.contains(&(Opcode::LoadThis as u8)));
        assert!(code.contains(&(Opcode::SetPropertyStatement as u8)));
    }

    #[cfg(feature = "class-methods")]
    #[test]
    fn compiles_class_methods_with_explicit_receiver_calls() {
        let code = compile_script(
            "class Counter { constructor(value) { this.value = value; } \
             read() { return this.value; } } \
             let counter = new Counter(42); return counter.read();",
        )
        .unwrap();

        assert!(code.contains(&(Opcode::ToMethod as u8)));
        assert!(code.contains(&(Opcode::GetMethod as u8)));
        assert!(code.contains(&(Opcode::CallMethodArguments as u8)));
    }

    #[cfg(feature = "class-default-constructors")]
    #[test]
    fn synthesizes_only_the_missing_base_constructor() {
        let implicit = compile_script("class Empty {} return new Empty();").unwrap();
        let explicit =
            compile_script("class Empty { constructor() {} } return new Empty();").unwrap();

        assert!(implicit.contains(&(Opcode::ToClassConstructor as u8)));
        assert_eq!(
            implicit
                .iter()
                .filter(|byte| **byte == Opcode::ToClassConstructor as u8)
                .count(),
            1
        );
        assert_eq!(
            explicit
                .iter()
                .filter(|byte| **byte == Opcode::ToClassConstructor as u8)
                .count(),
            1
        );
    }

    #[cfg(all(feature = "classes", not(feature = "class-default-constructors")))]
    #[test]
    fn explicit_class_builds_reject_an_omitted_constructor() {
        assert_eq!(
            compile_script("class Empty {} return new Empty();")
                .unwrap_err()
                .expected,
            "{ constructor"
        );
    }

    #[cfg(feature = "class-static-methods")]
    #[test]
    fn compiles_static_methods_onto_the_class_record() {
        let code = compile_script(
            "class Identity { constructor() {} static read(value) { return value; } } \
             return Identity.read(42);",
        )
        .unwrap();

        assert!(code.contains(&(Opcode::ToMethod as u8)));
        assert!(code.contains(&(Opcode::GetMethod as u8)));
        assert!(code.contains(&(Opcode::CallMethodArguments as u8)));
    }

    #[cfg(all(feature = "class-methods", not(feature = "class-static-methods")))]
    #[test]
    fn instance_method_builds_reject_static_syntax() {
        assert_eq!(
            compile_script(
                "class Identity { constructor() {} static read(value) { return value; } } \
                 return Identity.read(42);"
            )
            .unwrap_err()
            .expected,
            "("
        );
    }

    #[cfg(feature = "class-expressions")]
    #[test]
    fn compiles_a_complete_anonymous_class_expression() {
        let code = compile_script(
            "let Type = class { constructor(value) { this.value = value; } \
             read() { return this.value; } static identity(value) { return value; } }; \
             let value = new Type(42); return Type.identity(value.read());",
        )
        .unwrap();

        assert!(code.contains(&(Opcode::DuplicateTop as u8)));
        assert!(code.contains(&(Opcode::ToClassConstructor as u8)));
    }

    #[cfg(all(feature = "classes", not(feature = "class-expressions")))]
    #[test]
    fn declaration_only_class_builds_reject_class_expressions() {
        assert!(compile_script("let Type = class {}; return Type;").is_err());
    }
}
