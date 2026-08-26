#![no_std]

use microesnext_arena::Arena;
#[cfg(feature = "functions")]
use microesnext_arena::closures::{capture, capture_stack, entry};
use microesnext_bytecode::Opcode;
#[cfg(feature = "exceptions")]
use microesnext_execution::exceptions::Handlers;
#[cfg(feature = "async")]
use microesnext_execution::suspension::{restore, restore_value, resume, resume_value, suspend};
#[cfg(feature = "async-functions")]
use microesnext_execution::suspension::{resume_context, suspend_context};
#[cfg(feature = "arrays")]
use microesnext_objects::arrays::{get as array_get, new as new_array, set as array_set};
#[cfg(feature = "objects")]
use microesnext_objects::{get, new_object, set};
use microesnext_types::{Error, RootId, Value};
#[cfg(feature = "atoms")]
use microesnext_values::strings::atoms::Atoms;
use microesnext_vm_core::{Core, CoreOutcome};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Outcome {
    Complete(Value),
    Throw(Value),
    Await {
        value: Value,
        continuation: RootId,
    },
    AsyncCall {
        function: Value,
        argument_count: usize,
    },
    PromiseResolverCall,
}

pub struct Machine<'code, 'memory> {
    core: Core<'code, 'memory>,
    #[cfg(feature = "exceptions")]
    handlers: Handlers,
    #[cfg(feature = "atoms")]
    atoms: Option<Atoms>,
    #[cfg(feature = "promise-resolvers")]
    resolver_call: Option<microesnext_execution::promises::resolvers::Call>,
}

impl<'code, 'memory> Machine<'code, 'memory> {
    pub fn new(code: &'code [u8], memory: &'memory mut [u32]) -> Self {
        #[cfg(feature = "atoms")]
        let root_capacity = 1;
        #[cfg(not(feature = "atoms"))]
        let root_capacity = 0;
        Self::with_root_capacity(code, memory, root_capacity)
    }

    pub fn with_root_capacity(
        code: &'code [u8],
        memory: &'memory mut [u32],
        root_capacity: usize,
    ) -> Self {
        Self {
            core: Core::new(code, memory, root_capacity),
            #[cfg(feature = "exceptions")]
            handlers: Handlers::new(),
            #[cfg(feature = "atoms")]
            atoms: None,
            #[cfg(feature = "promise-resolvers")]
            resolver_call: None,
        }
    }

    #[cfg(feature = "strings")]
    pub fn with_strings(
        code: &'code [u8],
        memory: &'memory mut [u32],
        root_capacity: usize,
    ) -> Result<Self, Error> {
        Ok(Self::with_root_capacity(code, memory, root_capacity))
    }

    #[cfg(feature = "atoms")]
    pub fn with_atoms(
        code: &'code [u8],
        memory: &'memory mut [u32],
        root_capacity: usize,
    ) -> Result<Self, Error> {
        let mut arena = Arena::with_root_capacity(memory, root_capacity);
        let atoms = Atoms::new(&mut arena)?;
        Ok(Self {
            core: Core::from_parts(arena, code, 0, None),
            #[cfg(feature = "exceptions")]
            handlers: Handlers::new(),
            atoms: Some(atoms),
            #[cfg(feature = "promise-resolvers")]
            resolver_call: None,
        })
    }

    #[cfg(feature = "objects")]
    pub fn with_objects(
        code: &'code [u8],
        memory: &'memory mut [u32],
        root_capacity: usize,
    ) -> Result<Self, Error> {
        Self::with_atoms(code, memory, root_capacity)
    }

    #[cfg(feature = "atoms")]
    pub fn intern_atom(&mut self, bytes: &[u8]) -> Result<Value, Error> {
        self.intern(bytes)
    }

    #[inline(always)]
    pub fn arena(&self) -> &Arena<'_> {
        self.core.arena()
    }

    #[inline(always)]
    pub fn arena_mut(&mut self) -> &mut Arena<'memory> {
        self.core.arena_mut()
    }

    pub fn retain(&mut self, value: Value) -> Result<RootId, Error> {
        self.core.arena_mut().retain(value)
    }

    pub fn root(&self, root: RootId) -> Result<Value, Error> {
        self.core.arena().root(root)
    }

    pub fn release(&mut self, root: RootId) -> Result<Value, Error> {
        self.core.arena_mut().release(root)
    }

    #[cfg(feature = "atoms")]
    fn intern(&mut self, bytes: &[u8]) -> Result<Value, Error> {
        if self.atoms.is_none() {
            self.atoms = Some(Atoms::new(self.core.arena_mut())?);
        }
        self.atoms
            .as_mut()
            .ok_or(Error::DanglingReference)?
            .intern(self.core.arena_mut(), bytes)
    }

    pub fn grow_into<'next>(
        self,
        memory: &'next mut [u32],
    ) -> Result<Machine<'code, 'next>, Error> {
        Ok(Machine {
            core: self.core.grow_into(memory)?,
            #[cfg(feature = "exceptions")]
            handlers: self.handlers,
            #[cfg(feature = "atoms")]
            atoms: self.atoms,
            #[cfg(feature = "promise-resolvers")]
            resolver_call: self.resolver_call,
        })
    }

    pub fn run(&mut self) -> Result<Outcome, Error> {
        loop {
            match self.core.run()? {
                CoreOutcome::Complete(value) => return Ok(Outcome::Complete(value)),
                CoreOutcome::Throw(value) => {
                    if let Some(outcome) = self.handle_throw(value)? {
                        return Ok(outcome);
                    }
                }
                CoreOutcome::Extension(opcode) => {
                    let opcode = Opcode::try_from(opcode)?;
                    if let Some(outcome) = self.run_extension(opcode)? {
                        return Ok(outcome);
                    }
                }
            }
        }
    }

    #[cold]
    #[inline(never)]
    #[cfg(any(
        feature = "async",
        feature = "arrays",
        feature = "atoms",
        feature = "control-flow",
        feature = "strings",
        feature = "stack-operations",
        feature = "string-operations",
        feature = "objects",
        feature = "functions",
        feature = "function-arguments",
        feature = "integer-operations",
        feature = "integer-negation",
        feature = "locals",
        feature = "logical-operations",
        feature = "numbers",
        feature = "number-negation",
        feature = "number-coercion",
        feature = "exceptions",
        feature = "environments",
        feature = "equality",
        feature = "async-functions",
        feature = "captured-assignment-expressions",
        feature = "array-assignment-expressions",
        feature = "property-assignment-expressions",
        feature = "promise-resolvers"
    ))]
    fn run_extension(&mut self, opcode: Opcode) -> Result<Option<Outcome>, Error> {
        match opcode {
            #[cfg(feature = "stack-operations")]
            Opcode::DuplicateTop => {
                microesnext_arena::stack_operations::duplicate_top(self.core.arena_mut())?;
                Ok(None)
            }
            #[cfg(feature = "stack-operations")]
            Opcode::DropTop => {
                microesnext_arena::stack_operations::drop_top(self.core.arena_mut())?;
                Ok(None)
            }
            #[cfg(feature = "async")]
            Opcode::Await => {
                let handler_depth = self.current_handler_depth();
                let (value, continuation) = suspend(&mut self.core, handler_depth)?;
                Ok(Some(Outcome::Await {
                    value,
                    continuation,
                }))
            }
            #[cfg(feature = "strings")]
            Opcode::ConstString => {
                let bytes = self.core.next_bytes()?;
                let value = microesnext_values::strings::new(self.core.arena_mut(), bytes)?;
                self.core.arena_mut().push(value)?;
                Ok(None)
            }
            #[cfg(feature = "string-operations")]
            Opcode::ConcatenateStrings => {
                let right = self.core.arena_mut().pop()?;
                let left = self.core.arena_mut().pop()?;
                let value = microesnext_values::strings::operations::concatenate(
                    self.core.arena_mut(),
                    left,
                    right,
                )?;
                self.core.arena_mut().push(value)?;
                Ok(None)
            }
            #[cfg(feature = "atoms")]
            Opcode::ConstAtom => {
                let bytes = self.core.next_bytes()?;
                let value = self.intern(bytes)?;
                self.core.arena_mut().push(value)?;
                Ok(None)
            }
            #[cfg(feature = "objects")]
            Opcode::NewObject => {
                let object = new_object(self.core.arena_mut(), Value::NULL)?;
                self.core.arena_mut().push(object)?;
                Ok(None)
            }
            #[cfg(feature = "objects")]
            Opcode::GetProperty => {
                let key = self.core.arena_mut().pop()?;
                let object = self.core.arena_mut().pop()?;
                let value = get(self.core.arena(), object, key)?;
                self.core.arena_mut().push(value)?;
                Ok(None)
            }
            #[cfg(feature = "method-calls")]
            Opcode::GetMethod => {
                let key = self.core.arena_mut().pop()?;
                let receiver = self.core.arena_mut().pop()?;
                microesnext_objects::method_calls::load(self.core.arena_mut(), receiver, key)?;
                Ok(None)
            }
            #[cfg(feature = "objects")]
            Opcode::SetProperty => {
                let value = self.core.arena_mut().pop()?;
                let key = self.core.arena_mut().pop()?;
                let object = self.core.arena_mut().pop()?;
                let object = set(self.core.arena_mut(), object, key, value)?;
                self.core.arena_mut().push(object)?;
                Ok(None)
            }
            #[cfg(feature = "property-assignment")]
            Opcode::SetPropertyStatement => {
                let value = self.core.arena_mut().pop()?;
                let key = self.core.arena_mut().pop()?;
                let object = self.core.arena_mut().pop()?;
                microesnext_objects::set(self.core.arena_mut(), object, key, value)?;
                Ok(None)
            }
            #[cfg(feature = "functions")]
            Opcode::Closure => {
                let target = self.core.next_u32()?;
                let capture_count = self.core.next_u16()? as usize;
                if target as usize >= self.core.code().len() {
                    return Err(Error::BadBytecode);
                }
                let closure = capture_stack(self.core.arena_mut(), target, capture_count)?;
                self.core.arena_mut().push(closure)?;
                Ok(None)
            }
            #[cfg(feature = "constructors")]
            Opcode::ToConstructor => {
                self.intern(b"prototype")?;
                let constructor_key = self.intern(b"constructor")?;
                let prototype_key = self.intern(b"prototype")?;
                let closure = self.core.arena_mut().pop()?;
                let function = microesnext_objects::callable::new_constructor(
                    self.core.arena_mut(),
                    closure,
                    Value::NULL,
                    Value::NULL,
                    prototype_key,
                    constructor_key,
                )?;
                self.core.arena_mut().push(function)?;
                Ok(None)
            }
            #[cfg(feature = "class-constructors")]
            Opcode::ToClassConstructor => {
                self.intern(b"prototype")?;
                let constructor_key = self.intern(b"constructor")?;
                let prototype_key = self.intern(b"prototype")?;
                let closure = self.core.arena_mut().pop()?;
                let constructor = microesnext_objects::class_constructor::new(
                    self.core.arena_mut(),
                    closure,
                    Value::NULL,
                    Value::NULL,
                    prototype_key,
                    constructor_key,
                )?;
                self.core.arena_mut().push(constructor)?;
                Ok(None)
            }
            #[cfg(feature = "method-calls")]
            Opcode::ToMethod => {
                let closure = self.core.arena_mut().pop()?;
                let method = microesnext_objects::callable::new(
                    self.core.arena_mut(),
                    closure,
                    Value::NULL,
                )?;
                self.core.arena_mut().push(method)?;
                Ok(None)
            }
            #[cfg(feature = "recursive-constructors")]
            Opcode::RebindConstructorSelf => {
                let constructor = self.core.arena().stack_value(0)?;
                microesnext_objects::recursive_constructor::rebind(
                    self.core.arena_mut(),
                    constructor,
                )?;
                Ok(None)
            }
            #[cfg(feature = "async-functions")]
            Opcode::AsyncClosure => {
                let target = self.core.next_u32()?;
                let capture_count = self.core.next_u16()? as usize;
                if target as usize >= self.core.code().len() {
                    return Err(Error::BadBytecode);
                }
                let closure = microesnext_execution::async_functions::capture_stack(
                    self.core.arena_mut(),
                    target,
                    capture_count,
                )?;
                self.core.arena_mut().push(closure)?;
                Ok(None)
            }
            #[cfg(feature = "recursive-async-functions")]
            Opcode::RecursiveAsyncClosure => {
                let target = self.core.next_u32()?;
                let capture_count = self.core.next_u16()? as usize;
                if target as usize >= self.core.code().len() {
                    return Err(Error::BadBytecode);
                }
                let closure = microesnext_execution::recursive_async_functions::capture_recursive_async_stack(
                    self.core.arena_mut(),
                    target,
                    capture_count,
                )?;
                self.core.arena_mut().push(closure)?;
                Ok(None)
            }
            #[cfg(feature = "recursive-functions")]
            Opcode::RecursiveClosure => {
                let target = self.core.next_u32()?;
                let capture_count = self.core.next_u16()? as usize;
                if target as usize >= self.core.code().len() {
                    return Err(Error::BadBytecode);
                }
                let closure = microesnext_bindings::recursive_functions::capture_recursive_stack(
                    self.core.arena_mut(),
                    target,
                    capture_count,
                )?;
                self.core.arena_mut().push(closure)?;
                Ok(None)
            }
            #[cfg(feature = "functions")]
            Opcode::CallValue => {
                let function = self.core.arena_mut().pop()?;
                #[cfg(all(feature = "callable-objects", feature = "receivers"))]
                let receiver_aware =
                    microesnext_objects::callable::is_callable_object(self.core.arena(), function);
                #[cfg(all(feature = "receivers", not(feature = "callable-objects")))]
                let receiver_aware = false;
                #[cfg(feature = "callable-objects")]
                let function = unwrap_callable(self.core.arena(), function)?;
                #[cfg(feature = "promise-resolvers")]
                if microesnext_execution::promises::resolvers::is_resolver(
                    self.core.arena(),
                    function,
                ) {
                    if let Some(call) = microesnext_execution::promises::resolvers::take_call(
                        self.core.arena_mut(),
                        function,
                        0,
                    )? {
                        if self.resolver_call.replace(call).is_some() {
                            return Err(Error::Type);
                        }
                        return Ok(Some(Outcome::PromiseResolverCall));
                    }
                    self.core.arena_mut().push(Value::UNDEFINED)?;
                    return Ok(None);
                }
                #[cfg(feature = "async-functions")]
                if microesnext_execution::async_functions::is_async(self.core.arena(), function) {
                    return Ok(Some(Outcome::AsyncCall {
                        function,
                        argument_count: 0,
                    }));
                }
                let target = entry(self.core.arena(), function)?;
                #[cfg(feature = "receivers")]
                if receiver_aware {
                    microesnext_bindings::receivers::append(
                        self.core.arena_mut(),
                        0,
                        Value::UNDEFINED,
                    )?;
                    self.core.enter_call_with_arguments(function, target, 1)?;
                } else {
                    self.core.enter_call(function, target)?;
                }
                #[cfg(not(feature = "receivers"))]
                self.core.enter_call(function, target)?;
                Ok(None)
            }
            #[cfg(feature = "function-arguments")]
            Opcode::CallValueArguments => {
                let argument_count = self.core.next_u16()? as usize;
                let function = microesnext_bindings::parameters::take_callable(
                    self.core.arena_mut(),
                    argument_count,
                )?;
                #[cfg(all(feature = "callable-objects", feature = "receivers"))]
                let receiver_aware =
                    microesnext_objects::callable::is_callable_object(self.core.arena(), function);
                #[cfg(all(feature = "receivers", not(feature = "callable-objects")))]
                let receiver_aware = false;
                #[cfg(feature = "callable-objects")]
                let function = unwrap_callable(self.core.arena(), function)?;
                #[cfg(feature = "promise-resolvers")]
                if microesnext_execution::promises::resolvers::is_resolver(
                    self.core.arena(),
                    function,
                ) {
                    if let Some(call) = microesnext_execution::promises::resolvers::take_call(
                        self.core.arena_mut(),
                        function,
                        argument_count,
                    )? {
                        if self.resolver_call.replace(call).is_some() {
                            return Err(Error::Type);
                        }
                        return Ok(Some(Outcome::PromiseResolverCall));
                    }
                    self.core.arena_mut().push(Value::UNDEFINED)?;
                    return Ok(None);
                }
                #[cfg(feature = "async-functions")]
                if microesnext_execution::async_functions::is_async(self.core.arena(), function) {
                    return Ok(Some(Outcome::AsyncCall {
                        function,
                        argument_count,
                    }));
                }
                let target = entry(self.core.arena(), function)?;
                #[cfg(feature = "receivers")]
                if receiver_aware {
                    microesnext_bindings::receivers::append(
                        self.core.arena_mut(),
                        argument_count,
                        Value::UNDEFINED,
                    )?;
                    self.core
                        .enter_call_with_arguments(function, target, argument_count + 1)?;
                } else {
                    self.core
                        .enter_call_with_arguments(function, target, argument_count)?;
                }
                #[cfg(not(feature = "receivers"))]
                self.core
                    .enter_call_with_arguments(function, target, argument_count)?;
                Ok(None)
            }
            #[cfg(feature = "method-calls")]
            Opcode::CallMethodArguments => {
                let argument_count = self.core.next_u16()? as usize;
                let (method, receiver) =
                    microesnext_objects::method_calls::take(self.core.arena_mut(), argument_count)?;
                let receiver_aware =
                    microesnext_objects::callable::is_callable_object(self.core.arena(), method);
                let function = unwrap_callable(self.core.arena(), method)?;
                let target = entry(self.core.arena(), function)?;
                if receiver_aware {
                    microesnext_bindings::receivers::append(
                        self.core.arena_mut(),
                        argument_count,
                        receiver,
                    )?;
                    self.core
                        .enter_call_with_arguments(function, target, argument_count + 1)?;
                } else {
                    self.core
                        .enter_call_with_arguments(function, target, argument_count)?;
                }
                Ok(None)
            }
            #[cfg(feature = "construction")]
            Opcode::ConstructValueArguments => {
                let argument_count = self.core.next_u16()? as usize;
                let prototype_key = self
                    .atoms
                    .as_mut()
                    .ok_or(Error::Type)?
                    .intern(self.core.arena_mut(), b"prototype")?;
                let constructor = microesnext_bindings::parameters::take_callable(
                    self.core.arena_mut(),
                    argument_count,
                )?;
                let (function, receiver) = microesnext_objects::construction::prepare(
                    self.core.arena_mut(),
                    constructor,
                    prototype_key,
                )?;
                let preserved_index = self.core.arena().stack_len() - argument_count;
                self.core
                    .arena_mut()
                    .insert_stack_value_from_bottom(preserved_index, receiver)?;
                microesnext_bindings::receivers::append(
                    self.core.arena_mut(),
                    argument_count,
                    receiver,
                )?;
                let target = entry(self.core.arena(), function)?;
                self.core
                    .enter_call_with_arguments(function, target, argument_count + 1)?;
                Ok(None)
            }
            #[cfg(feature = "construction")]
            Opcode::SelectConstructedResult => {
                let returned = self.core.arena_mut().pop()?;
                let receiver = self.core.arena_mut().pop()?;
                let result = microesnext_objects::construction::select(
                    self.core.arena(),
                    receiver,
                    returned,
                );
                self.core.arena_mut().push(result)?;
                Ok(None)
            }
            #[cfg(feature = "functions")]
            Opcode::LoadCapture => {
                let index = self.core.next_u16()? as usize;
                let frame_depth = self.core.frame_depth().ok_or(Error::BadBytecode)?;
                let function_index = self.core.arena().stack_len() - frame_depth;
                let function = self.core.arena().stack_value(function_index)?;
                #[cfg(feature = "async-functions")]
                let value = if microesnext_execution::async_functions::is_async(
                    self.core.arena(),
                    function,
                ) {
                    microesnext_execution::async_functions::capture(
                        self.core.arena(),
                        function,
                        index,
                    )?
                } else {
                    capture(self.core.arena(), function, index)?
                };
                #[cfg(not(feature = "async-functions"))]
                let value = capture(self.core.arena(), function, index)?;
                self.core.arena_mut().push(value)?;
                Ok(None)
            }
            #[cfg(feature = "numbers")]
            Opcode::ConstF64 => {
                let low = self.core.next_u32()? as u64;
                let high = self.core.next_u32()? as u64;
                let value = microesnext_values::numbers::new(
                    self.core.arena_mut(),
                    f64::from_bits(low | high << 32),
                )?;
                self.core.arena_mut().push(value)?;
                Ok(None)
            }
            #[cfg(feature = "number-operations")]
            Opcode::AddNumber => {
                let right = self.core.arena_mut().pop()?;
                let left = self.core.arena_mut().pop()?;
                let value = microesnext_values::numbers::operations::add(
                    self.core.arena_mut(),
                    left,
                    right,
                )?;
                self.core.arena_mut().push(value)?;
                Ok(None)
            }
            #[cfg(feature = "number-operations")]
            Opcode::SubtractNumber => {
                let right = self.core.arena_mut().pop()?;
                let left = self.core.arena_mut().pop()?;
                let value = microesnext_values::numbers::operations::subtract(
                    self.core.arena_mut(),
                    left,
                    right,
                )?;
                self.core.arena_mut().push(value)?;
                Ok(None)
            }
            #[cfg(feature = "number-operations")]
            Opcode::MultiplyNumber => {
                let right = self.core.arena_mut().pop()?;
                let left = self.core.arena_mut().pop()?;
                let value = microesnext_values::numbers::operations::multiply(
                    self.core.arena_mut(),
                    left,
                    right,
                )?;
                self.core.arena_mut().push(value)?;
                Ok(None)
            }
            #[cfg(feature = "number-operations")]
            Opcode::LessThanNumber => {
                let right = self.core.arena_mut().pop()?;
                let left = self.core.arena_mut().pop()?;
                let value = microesnext_values::numbers::operations::less_than(
                    self.core.arena(),
                    left,
                    right,
                )?;
                self.core.arena_mut().push(value)?;
                Ok(None)
            }
            #[cfg(feature = "number-operations")]
            Opcode::GreaterThanNumber => {
                let right = self.core.arena_mut().pop()?;
                let left = self.core.arena_mut().pop()?;
                let value = microesnext_values::numbers::operations::greater_than(
                    self.core.arena(),
                    left,
                    right,
                )?;
                self.core.arena_mut().push(value)?;
                Ok(None)
            }
            #[cfg(feature = "number-division")]
            Opcode::DivideNumber => {
                let right = self.core.arena_mut().pop()?;
                let left = self.core.arena_mut().pop()?;
                let value = microesnext_values::numbers::division::divide(
                    self.core.arena_mut(),
                    left,
                    right,
                )?;
                self.core.arena_mut().push(value)?;
                Ok(None)
            }
            #[cfg(feature = "number-remainder")]
            Opcode::RemainderNumber => {
                let right = self.core.arena_mut().pop()?;
                let left = self.core.arena_mut().pop()?;
                let value = microesnext_values::numbers::remainder::remainder(
                    self.core.arena_mut(),
                    left,
                    right,
                )?;
                self.core.arena_mut().push(value)?;
                Ok(None)
            }
            #[cfg(feature = "typeof")]
            Opcode::TypeOf => {
                let value = self.core.arena_mut().pop()?;
                let result =
                    microesnext_semantics::r#typeof::type_of(self.core.arena_mut(), value)?;
                self.core.arena_mut().push(result)?;
                Ok(None)
            }
            #[cfg(feature = "locals")]
            Opcode::InitLocals => {
                let count = self.core.next_u16()? as usize;
                let base = self.core.frame_base();
                microesnext_bindings::locals::init(self.core.arena_mut(), base, count)?;
                Ok(None)
            }
            #[cfg(feature = "function-arguments")]
            Opcode::InitFrame => {
                let count = self.core.next_u16()? as usize;
                let parameter_count = self.core.next_u16()? as usize;
                let base = self.core.frame_base();
                microesnext_bindings::parameters::init_frame(
                    self.core.arena_mut(),
                    base,
                    count,
                    parameter_count,
                )?;
                Ok(None)
            }
            #[cfg(feature = "receivers")]
            Opcode::InitReceiverFrame => {
                let count = self.core.next_u16()? as usize;
                let parameter_count = self.core.next_u16()? as usize;
                let base = self.core.frame_base();
                microesnext_bindings::receivers::init_frame(
                    self.core.arena_mut(),
                    base,
                    count,
                    parameter_count,
                )?;
                Ok(None)
            }
            #[cfg(feature = "receivers")]
            Opcode::LoadThis => {
                let receiver = microesnext_bindings::receivers::load(
                    self.core.arena(),
                    self.core.frame_base(),
                )?;
                self.core.arena_mut().push(receiver)?;
                Ok(None)
            }
            #[cfg(feature = "receivers")]
            Opcode::ReturnReceiverLocals => {
                let result = self.core.arena_mut().pop()?;
                let base = self.core.frame_base();
                microesnext_bindings::receivers::leave(self.core.arena_mut(), base)?;
                match self.core.return_value(result)? {
                    Some(CoreOutcome::Complete(value)) => Ok(Some(Outcome::Complete(value))),
                    Some(_) => Err(Error::BadBytecode),
                    None => Ok(None),
                }
            }
            #[cfg(feature = "environments")]
            Opcode::NewEnvironmentCell => {
                let value = self.core.arena_mut().pop()?;
                let cell = microesnext_bindings::environments::new(self.core.arena_mut(), value)?;
                self.core.arena_mut().push(cell)?;
                Ok(None)
            }
            #[cfg(feature = "environments")]
            Opcode::LoadEnvironmentCell => {
                let cell = self.core.arena_mut().pop()?;
                let value = microesnext_bindings::environments::get(self.core.arena(), cell)?;
                self.core.arena_mut().push(value)?;
                Ok(None)
            }
            #[cfg(feature = "environments")]
            Opcode::StoreEnvironmentCell => {
                let value = self.core.arena_mut().pop()?;
                let cell = self.core.arena_mut().pop()?;
                microesnext_bindings::environments::set(self.core.arena_mut(), cell, value)?;
                Ok(None)
            }
            #[cfg(feature = "captured-assignment-expressions")]
            Opcode::StoreEnvironmentCellResult => {
                microesnext_bindings::environments::assignment_expressions::store_result(
                    self.core.arena_mut(),
                )?;
                Ok(None)
            }
            #[cfg(feature = "property-assignment-expressions")]
            Opcode::SetPropertyResult => {
                microesnext_objects::assignment_expressions::store_result(self.core.arena_mut())?;
                Ok(None)
            }
            #[cfg(feature = "array-assignment-expressions")]
            Opcode::SetIndexResult => {
                microesnext_objects::arrays::assignment_expressions::store_result(
                    self.core.arena_mut(),
                )?;
                Ok(None)
            }
            #[cfg(feature = "locals")]
            Opcode::LoadLocal => {
                let slot = self.core.next_u16()? as usize;
                let value = microesnext_bindings::locals::load(
                    self.core.arena(),
                    self.core.frame_base(),
                    slot,
                )?;
                self.core.arena_mut().push(value)?;
                Ok(None)
            }
            #[cfg(feature = "locals")]
            Opcode::StoreLocal => {
                let slot = self.core.next_u16()? as usize;
                let base = self.core.frame_base();
                microesnext_bindings::locals::store(self.core.arena_mut(), base, slot)?;
                Ok(None)
            }
            #[cfg(feature = "locals")]
            Opcode::ReturnLocals => {
                let result = self.core.arena_mut().pop()?;
                let base = self.core.frame_base();
                microesnext_bindings::locals::leave(self.core.arena_mut(), base)?;
                match self.core.return_value(result)? {
                    Some(CoreOutcome::Complete(value)) => Ok(Some(Outcome::Complete(value))),
                    Some(_) => Err(Error::BadBytecode),
                    None => Ok(None),
                }
            }
            #[cfg(feature = "control-flow")]
            Opcode::Jump => {
                let target = self.core.next_u32()? as usize;
                self.core.jump(target)?;
                Ok(None)
            }
            #[cfg(feature = "control-flow")]
            Opcode::JumpIfFalseBoolean => {
                let target = self.core.next_u32()? as usize;
                let condition = self.core.arena_mut().pop()?;
                if condition == Value::FALSE {
                    self.core.jump(target)?;
                } else if condition != Value::TRUE {
                    return Err(Error::Type);
                }
                Ok(None)
            }
            #[cfg(feature = "control-flow")]
            Opcode::ToBoolean => {
                let value = self.core.arena_mut().pop()?;
                let value =
                    if microesnext_semantics::truthiness::to_boolean(self.core.arena(), value)? {
                        Value::TRUE
                    } else {
                        Value::FALSE
                    };
                self.core.arena_mut().push(value)?;
                Ok(None)
            }
            #[cfg(feature = "logical-operations")]
            Opcode::LogicalNot => {
                let operand = self.core.arena_mut().pop()?;
                let value = microesnext_semantics::logical_operations::logical_not(
                    self.core.arena(),
                    operand,
                )?;
                self.core.arena_mut().push(value)?;
                Ok(None)
            }
            #[cfg(feature = "integer-negation")]
            Opcode::NegateI30 => {
                let operand = self.core.arena_mut().pop()?;
                let value = microesnext_semantics::integer_operations::negation::negate(operand)?;
                self.core.arena_mut().push(value)?;
                Ok(None)
            }
            #[cfg(feature = "number-negation")]
            Opcode::NegateNumber => {
                let operand = self.core.arena_mut().pop()?;
                #[cfg(feature = "string-number-coercion")]
                let value = {
                    let number = microesnext_values::numbers::string_coercion::coerce(
                        self.core.arena(),
                        operand,
                    )?;
                    microesnext_values::numbers::negation::negate_coerced(
                        self.core.arena_mut(),
                        number,
                    )?
                };
                #[cfg(not(feature = "string-number-coercion"))]
                let value =
                    microesnext_values::numbers::negation::negate(self.core.arena_mut(), operand)?;
                self.core.arena_mut().push(value)?;
                Ok(None)
            }
            #[cfg(feature = "number-coercion")]
            Opcode::ToNumber => {
                let operand = self.core.arena_mut().pop()?;
                #[cfg(feature = "string-number-coercion")]
                let value = microesnext_values::numbers::string_coercion::to_number(
                    self.core.arena_mut(),
                    operand,
                )?;
                #[cfg(not(feature = "string-number-coercion"))]
                let value = microesnext_values::numbers::coercion::to_number(
                    self.core.arena_mut(),
                    operand,
                )?;
                self.core.arena_mut().push(value)?;
                Ok(None)
            }
            #[cfg(feature = "integer-operations")]
            Opcode::SubtractI30 => {
                let right = self.core.arena_mut().pop()?;
                let left = self.core.arena_mut().pop()?;
                let value = microesnext_semantics::integer_operations::subtract(left, right)?;
                self.core.arena_mut().push(value)?;
                Ok(None)
            }
            #[cfg(feature = "integer-operations")]
            Opcode::MultiplyI30 => {
                let right = self.core.arena_mut().pop()?;
                let left = self.core.arena_mut().pop()?;
                let value = microesnext_semantics::integer_operations::multiply(left, right)?;
                self.core.arena_mut().push(value)?;
                Ok(None)
            }
            #[cfg(feature = "integer-operations")]
            Opcode::LessThanI30 => {
                let right = self.core.arena_mut().pop()?;
                let left = self.core.arena_mut().pop()?;
                let value = microesnext_semantics::integer_operations::less_than(left, right)?;
                self.core.arena_mut().push(value)?;
                Ok(None)
            }
            #[cfg(feature = "integer-operations")]
            Opcode::GreaterThanI30 => {
                let right = self.core.arena_mut().pop()?;
                let left = self.core.arena_mut().pop()?;
                let value = microesnext_semantics::integer_operations::greater_than(left, right)?;
                self.core.arena_mut().push(value)?;
                Ok(None)
            }
            #[cfg(feature = "equality")]
            Opcode::StrictEqual => {
                let right = self.core.arena_mut().pop()?;
                let left = self.core.arena_mut().pop()?;
                let equal =
                    microesnext_semantics::equality::strict_equal(self.core.arena(), left, right)?;
                self.core
                    .arena_mut()
                    .push(if equal { Value::TRUE } else { Value::FALSE })?;
                Ok(None)
            }
            #[cfg(feature = "equality")]
            Opcode::StrictNotEqual => {
                let right = self.core.arena_mut().pop()?;
                let left = self.core.arena_mut().pop()?;
                let equal =
                    microesnext_semantics::equality::strict_equal(self.core.arena(), left, right)?;
                self.core
                    .arena_mut()
                    .push(if equal { Value::FALSE } else { Value::TRUE })?;
                Ok(None)
            }
            #[cfg(feature = "instanceof")]
            Opcode::InstanceOf => {
                let prototype_key = self
                    .atoms
                    .as_mut()
                    .ok_or(Error::Type)?
                    .intern(self.core.arena_mut(), b"prototype")?;
                let constructor = self.core.arena_mut().pop()?;
                let value = self.core.arena_mut().pop()?;
                let result = microesnext_objects::instanceof::ordinary(
                    self.core.arena(),
                    value,
                    constructor,
                    prototype_key,
                )?;
                self.core
                    .arena_mut()
                    .push(if result { Value::TRUE } else { Value::FALSE })?;
                Ok(None)
            }
            #[cfg(feature = "logical-operations")]
            Opcode::JumpIfFalsyOrPop => {
                let target = self.core.next_u32()? as usize;
                let value = self.core.arena().stack_value(0)?;
                if microesnext_semantics::logical_operations::is_falsy(self.core.arena(), value)? {
                    self.core.jump(target)?;
                } else {
                    self.core.arena_mut().pop()?;
                }
                Ok(None)
            }
            #[cfg(feature = "logical-operations")]
            Opcode::JumpIfTruthyOrPop => {
                let target = self.core.next_u32()? as usize;
                let value = self.core.arena().stack_value(0)?;
                if microesnext_semantics::logical_operations::is_truthy(self.core.arena(), value)? {
                    self.core.jump(target)?;
                } else {
                    self.core.arena_mut().pop()?;
                }
                Ok(None)
            }
            #[cfg(feature = "arrays")]
            Opcode::NewArray => {
                let array = new_array(self.core.arena_mut())?;
                self.core.arena_mut().push(array)?;
                Ok(None)
            }
            #[cfg(feature = "arrays")]
            Opcode::GetIndex => {
                let index = self
                    .core
                    .arena_mut()
                    .pop()?
                    .as_i30()
                    .and_then(|index| usize::try_from(index).ok())
                    .ok_or(Error::Type)?;
                let array = self.core.arena_mut().pop()?;
                let value = array_get(self.core.arena(), array, index)?;
                self.core.arena_mut().push(value)?;
                Ok(None)
            }
            #[cfg(feature = "arrays")]
            Opcode::SetIndex => {
                let value = self.core.arena_mut().pop()?;
                let index = self
                    .core
                    .arena_mut()
                    .pop()?
                    .as_i30()
                    .and_then(|index| usize::try_from(index).ok())
                    .ok_or(Error::Type)?;
                let array = self.core.arena_mut().pop()?;
                let array = array_set(self.core.arena_mut(), array, index, value)?;
                self.core.arena_mut().push(array)?;
                Ok(None)
            }
            #[cfg(feature = "exceptions")]
            Opcode::Try => {
                let catch_pc = self.core.next_u32()? as usize;
                self.handlers.install(&mut self.core, catch_pc)?;
                Ok(None)
            }
            #[cfg(feature = "exceptions")]
            Opcode::EndTry => {
                self.handlers.leave(&mut self.core)?;
                Ok(None)
            }
            #[cfg(feature = "exceptions")]
            Opcode::Drop => {
                self.core.arena_mut().pop()?;
                Ok(None)
            }
            _ => Err(Error::BadBytecode),
        }
    }

    #[inline(always)]
    #[cfg(not(any(
        feature = "async",
        feature = "arrays",
        feature = "atoms",
        feature = "control-flow",
        feature = "strings",
        feature = "stack-operations",
        feature = "objects",
        feature = "functions",
        feature = "integer-operations",
        feature = "integer-negation",
        feature = "locals",
        feature = "logical-operations",
        feature = "numbers",
        feature = "number-negation",
        feature = "number-coercion",
        feature = "exceptions",
        feature = "equality",
        feature = "environments",
        feature = "async-functions",
        feature = "promise-resolvers",
        feature = "receivers"
    )))]
    fn run_extension(&mut self, _opcode: Opcode) -> Result<Option<Outcome>, Error> {
        Err(Error::BadBytecode)
    }

    /// Enter a guest closure from a scheduler job without using a native call
    /// frame. The argument begins as the closure's sole operand.
    #[cfg(feature = "functions")]
    pub fn call_closure(&mut self, function: Value, argument: Value) -> Result<Outcome, Error> {
        #[cfg(feature = "callable-objects")]
        let function = unwrap_callable(self.core.arena(), function)?;
        let target = entry(self.core.arena(), function)?;
        self.core.enter_external_call(function, target, argument)?;
        self.run()
    }

    /// Enter a receiver-aware guest closure with already materialized values.
    /// This is the call shape required by object thenable assimilation.
    #[cfg(feature = "receivers")]
    pub fn call_closure_with_receiver(
        &mut self,
        function: Value,
        receiver: Value,
        arguments: &[Value],
    ) -> Result<Outcome, Error> {
        if self.core.frame_depth().is_some() || self.core.arena().stack_len() != 0 {
            return Err(Error::Type);
        }
        #[cfg(feature = "callable-objects")]
        let function = unwrap_callable(self.core.arena(), function)?;
        let target = entry(self.core.arena(), function)?;
        for argument in arguments {
            if let Err(error) = self.core.arena_mut().push(*argument) {
                self.core.abandon();
                return Err(error);
            }
        }
        if let Err(error) = microesnext_bindings::receivers::append(
            self.core.arena_mut(),
            arguments.len(),
            receiver,
        ) {
            self.core.abandon();
            return Err(error);
        }
        if let Err(error) =
            self.core
                .enter_external_call_with_arguments(function, target, arguments.len() + 1)
        {
            self.core.abandon();
            return Err(error);
        }
        self.run()
    }

    /// Continue the suspended caller after a one-shot resolving function has
    /// been handled by the Promise driver. JavaScript resolving functions
    /// return `undefined` regardless of whether they won the shared cell.
    #[cfg(feature = "promise-resolvers")]
    pub fn take_resolver_call(
        &mut self,
    ) -> Result<microesnext_execution::promises::resolvers::Call, Error> {
        self.resolver_call.take().ok_or(Error::Type)
    }

    #[cfg(feature = "promise-resolvers")]
    pub fn resume_resolver_call(&mut self) -> Result<Outcome, Error> {
        if self.resolver_call.is_some() {
            return Err(Error::Type);
        }
        self.core.arena_mut().push(Value::UNDEFINED)?;
        self.run()
    }

    /// Replace the current caller with an independent async invocation. The
    /// supplied root keeps its outer promise current across compaction; the
    /// caller snapshot already contains that promise as the call result.
    #[cfg(feature = "async-functions")]
    pub fn switch_to_async_call(
        &mut self,
        function: Value,
        argument_count: usize,
        promise: RootId,
    ) -> Result<RootId, Error> {
        let invocation = microesnext_execution::async_functions::take_invocation(
            self.core.arena_mut(),
            function,
            argument_count,
        )?;
        let invocation = self.core.arena_mut().retain(invocation)?;
        let promise_value = self.core.arena().root(promise)?;
        if let Err(error) = self.core.arena_mut().push(promise_value) {
            self.core.arena_mut().release(invocation)?;
            return Err(error);
        }
        let handler_depth = self.current_handler_depth();
        let caller = match suspend_context(&mut self.core, handler_depth) {
            Ok(caller) => caller,
            Err(error) => {
                self.core.arena_mut().release(invocation)?;
                return Err(error);
            }
        };
        let invocation = self.core.arena_mut().release(invocation)?;
        microesnext_execution::async_functions::start_invocation(&mut self.core, invocation)?;
        self.set_handler_depth(None);
        Ok(caller)
    }

    #[cfg(feature = "async-functions")]
    pub fn restore_caller(&mut self, caller: RootId) -> Result<(), Error> {
        let handler_depth = resume_context(&mut self.core, caller)?;
        self.set_handler_depth(handler_depth);
        Ok(())
    }

    #[cfg(feature = "async")]
    pub fn resume(&mut self, continuation: RootId, value: Value) -> Result<Outcome, Error> {
        let handler_depth = resume(&mut self.core, continuation, value)?;
        self.set_handler_depth(handler_depth);
        self.run()
    }

    #[cfg(feature = "async")]
    pub fn resume_value(&mut self, continuation: Value, value: Value) -> Result<Outcome, Error> {
        let handler_depth = resume_value(&mut self.core, continuation, value)?;
        self.set_handler_depth(handler_depth);
        self.run()
    }

    /// Resume an `await` with an abrupt completion. Exception handlers will
    /// consume this path once try/catch bytecode is added; until then it is an
    /// observable uncaught throw rather than a Rust error.
    #[cfg(feature = "async")]
    pub fn resume_rejected(
        &mut self,
        continuation: RootId,
        reason: Value,
    ) -> Result<Outcome, Error> {
        let handler_depth = restore(&mut self.core, continuation)?;
        self.set_handler_depth(handler_depth);
        match self.handle_throw(reason)? {
            Some(outcome) => Ok(outcome),
            None => self.run(),
        }
    }

    #[cfg(feature = "async")]
    pub fn resume_value_rejected(
        &mut self,
        continuation: Value,
        reason: Value,
    ) -> Result<Outcome, Error> {
        let handler_depth = restore_value(&mut self.core, continuation)?;
        self.set_handler_depth(handler_depth);
        match self.handle_throw(reason)? {
            Some(outcome) => Ok(outcome),
            None => self.run(),
        }
    }

    #[inline(always)]
    #[cfg(feature = "async")]
    fn current_handler_depth(&self) -> Option<usize> {
        #[cfg(feature = "exceptions")]
        return self.handlers.depth();
        #[cfg(not(feature = "exceptions"))]
        None
    }

    #[inline(always)]
    #[cfg(feature = "async")]
    fn set_handler_depth(&mut self, handler_depth: Option<usize>) {
        #[cfg(feature = "exceptions")]
        {
            self.handlers.restore(handler_depth);
        }
        #[cfg(not(feature = "exceptions"))]
        let _ = handler_depth;
    }

    fn handle_throw(&mut self, reason: Value) -> Result<Option<Outcome>, Error> {
        #[cfg(feature = "exceptions")]
        if self.handlers.unwind(&mut self.core, reason)? {
            return Ok(None);
        }
        self.core.abandon();
        Ok(Some(Outcome::Throw(reason)))
    }
}

#[cfg(feature = "callable-objects")]
#[inline]
fn unwrap_callable(arena: &microesnext_arena::Arena<'_>, value: Value) -> Result<Value, Error> {
    if microesnext_objects::callable::is_callable_object(arena, value) {
        microesnext_objects::callable::callable(arena, value)
    } else {
        Ok(value)
    }
}

#[cfg(test)]
mod tests {
    extern crate alloc;

    #[cfg(feature = "async")]
    use alloc::vec::Vec;
    use microesnext_compiler::Builder;

    use super::*;

    #[cfg(feature = "async-functions")]
    #[test]
    fn async_closure_call_yields_a_context_switch_request() {
        const BODY: u32 = 9;
        let code = [
            Opcode::AsyncClosure as u8,
            BODY as u8,
            0,
            0,
            0,
            0,
            0,
            Opcode::CallValue as u8,
            Opcode::Return as u8,
            Opcode::ConstImmediate as u8,
            microesnext_bytecode::Immediate::True as u8,
            Opcode::Return as u8,
        ];
        let mut memory = [0; 48];
        let mut machine = Machine::with_root_capacity(&code, &mut memory, 4);
        let Outcome::AsyncCall {
            function,
            argument_count,
        } = machine.run().unwrap()
        else {
            panic!("expected an async call")
        };
        assert_eq!(argument_count, 0);
        assert_eq!(
            microesnext_execution::async_functions::entry(machine.arena(), function),
            Ok(9)
        );
        let promise = machine.retain(Value::TRUE).unwrap();
        let caller = machine
            .switch_to_async_call(function, argument_count, promise)
            .unwrap();
        assert_eq!(machine.run(), Ok(Outcome::Complete(Value::TRUE)));
        machine.restore_caller(caller).unwrap();
        assert_eq!(machine.run(), Ok(Outcome::Complete(Value::TRUE)));
        machine.release(promise).unwrap();
    }

    #[cfg(feature = "async")]
    fn awaiting_program() -> Vec<u8> {
        Builder::new()
            .const_i30(40)
            .const_i30(2)
            .op(Opcode::Await)
            .op(Opcode::AddI30)
            .op(Opcode::Return)
            .finish()
    }

    #[cfg(feature = "async")]
    #[test]
    fn suspends_and_resumes_without_a_native_frame() {
        let code = awaiting_program();
        let mut memory = [0; 64];
        let mut machine = Machine::with_root_capacity(&code, &mut memory, 2);
        let Outcome::Await {
            value,
            continuation,
        } = machine.run().unwrap()
        else {
            panic!("expected suspension")
        };
        assert_eq!(value.as_i30(), Some(2));
        let Outcome::Complete(value) = machine
            .resume(continuation, Value::from_i30(2).unwrap())
            .unwrap()
        else {
            panic!("expected completion")
        };
        assert_eq!(value.as_i30(), Some(42));
    }

    #[cfg(feature = "async")]
    #[test]
    fn suspension_preserves_an_active_guest_call_frame() {
        let code = Builder::new()
            .call(6)
            .op(Opcode::Return)
            .const_i30(40)
            .const_i30(2)
            .op(Opcode::Await)
            .op(Opcode::AddI30)
            .op(Opcode::Return)
            .finish();
        let mut memory = [0; 64];
        let mut machine = Machine::with_root_capacity(&code, &mut memory, 2);
        let Outcome::Await { continuation, .. } = machine.run().unwrap() else {
            panic!("expected suspension")
        };
        assert_eq!(
            machine
                .resume(continuation, Value::from_i30(2).unwrap())
                .unwrap(),
            Outcome::Complete(Value::from_i30(42).unwrap())
        );
    }

    #[cfg(feature = "async")]
    #[test]
    fn rejected_await_is_an_abrupt_guest_completion() {
        let code = awaiting_program();
        let mut memory = [0; 64];
        let mut machine = Machine::with_root_capacity(&code, &mut memory, 2);
        let Outcome::Await { continuation, .. } = machine.run().unwrap() else {
            panic!("expected suspension")
        };
        let reason = Value::from_i30(17).unwrap();
        assert_eq!(
            machine.resume_rejected(continuation, reason).unwrap(),
            Outcome::Throw(reason)
        );
    }

    #[cfg(all(feature = "async", feature = "exceptions"))]
    #[test]
    fn rejected_await_resumes_at_its_preserved_guest_handler() {
        let code = Builder::new()
            .try_at(12)
            .const_i30(2)
            .op(Opcode::Await)
            .op(Opcode::EndTry)
            .op(Opcode::Return)
            .finish();
        let mut memory = [0; 64];
        let mut machine = Machine::with_root_capacity(&code, &mut memory, 2);
        let Outcome::Await { continuation, .. } = machine.run().unwrap() else {
            panic!("expected suspension")
        };
        let reason = Value::from_i30(17).unwrap();
        assert_eq!(
            machine.resume_rejected(continuation, reason).unwrap(),
            Outcome::Complete(reason)
        );
    }

    #[cfg(feature = "exceptions")]
    #[test]
    fn catches_a_throw_across_a_guest_call_frame() {
        let code = Builder::new()
            .try_at(12)
            .call(13)
            .op(Opcode::EndTry)
            .op(Opcode::Return)
            .op(Opcode::Return)
            .const_i30(17)
            .op(Opcode::Throw)
            .finish();
        let mut memory = [0; 48];
        let mut machine = Machine::new(&code, &mut memory);
        assert_eq!(
            machine.run().unwrap(),
            Outcome::Complete(Value::from_i30(17).unwrap())
        );
    }

    #[cfg(feature = "exceptions")]
    #[test]
    fn normal_completion_removes_its_handler_and_preserves_its_value() {
        let code = Builder::new()
            .try_at(11)
            .const_i30(42)
            .op(Opcode::EndTry)
            .op(Opcode::Return)
            .finish();
        let mut memory = [0; 32];
        let mut machine = Machine::new(&code, &mut memory);
        assert_eq!(
            machine.run().unwrap(),
            Outcome::Complete(Value::from_i30(42).unwrap())
        );
    }

    #[cfg(feature = "exceptions")]
    #[test]
    fn rethrow_reaches_the_next_outer_handler() {
        let code = Builder::new()
            .try_at(20)
            .try_at(19)
            .const_i30(17)
            .op(Opcode::Throw)
            .op(Opcode::EndTry)
            .op(Opcode::EndTry)
            .op(Opcode::Return)
            .op(Opcode::Throw)
            .op(Opcode::Return)
            .finish();
        let mut memory = [0; 40];
        let mut machine = Machine::new(&code, &mut memory);
        assert_eq!(
            machine.run().unwrap(),
            Outcome::Complete(Value::from_i30(17).unwrap())
        );
    }

    #[test]
    fn guest_calls_use_vm_frames_instead_of_native_recursion() {
        let code = Builder::new()
            .call(6)
            .op(Opcode::Return)
            .const_i30(20)
            .const_i30(22)
            .op(Opcode::AddI30)
            .op(Opcode::Return)
            .finish();
        let mut memory = [0; 64];
        let mut machine = Machine::new(&code, &mut memory);
        assert_eq!(
            machine.run().unwrap(),
            Outcome::Complete(Value::from_i30(42).unwrap())
        );
    }

    #[cfg(feature = "objects")]
    #[test]
    fn executes_interned_property_bytecode() {
        let code = Builder::new()
            .object()
            .atom(b"answer")
            .const_i30(42)
            .op(Opcode::SetProperty)
            .atom(b"answer")
            .op(Opcode::GetProperty)
            .op(Opcode::Return)
            .finish();
        let mut memory = [0; 128];
        let mut machine = Machine::with_objects(&code, &mut memory, 4).unwrap();
        assert_eq!(
            machine.run().unwrap(),
            Outcome::Complete(Value::from_i30(42).unwrap())
        );
    }

    #[cfg(feature = "strings")]
    #[test]
    fn executes_a_string_constant_without_objects() {
        let code = Builder::new().string(b"hello").op(Opcode::Return).finish();
        let mut memory = [0; 48];
        let mut machine = Machine::with_strings(&code, &mut memory, 1).unwrap();
        let Outcome::Complete(value) = machine.run().unwrap() else {
            panic!("expected string completion")
        };
        assert!(
            machine
                .arena()
                .bytes_equal(value.as_ref().unwrap(), b"hello")
                .unwrap()
        );
    }

    #[cfg(feature = "logical-operations")]
    #[test]
    fn executes_logical_negation_through_selected_truthiness() {
        let code = Builder::new()
            .immediate(microesnext_bytecode::Immediate::False)
            .op(Opcode::LogicalNot)
            .op(Opcode::LogicalNot)
            .op(Opcode::Return)
            .finish();
        let mut memory = [0; 16];
        let mut machine = Machine::new(&code, &mut memory);
        assert_eq!(machine.run(), Ok(Outcome::Complete(Value::FALSE)));
    }

    #[cfg(feature = "string-operations")]
    #[test]
    fn executes_strict_string_concatenation() {
        let code = Builder::new()
            .string(b"micro")
            .string(b"esnext")
            .op(Opcode::ConcatenateStrings)
            .op(Opcode::Return)
            .finish();
        let mut memory = [0; 48];
        let mut machine = Machine::with_strings(&code, &mut memory, 1).unwrap();
        let Outcome::Complete(value) = machine.run().unwrap() else {
            panic!("expected string completion")
        };
        assert!(
            machine
                .arena()
                .bytes_equal(value.as_ref().unwrap(), b"microesnext")
                .unwrap()
        );
    }

    #[cfg(feature = "typeof")]
    #[test]
    fn executes_optional_typeof_and_returns_an_ordinary_string() {
        let code = Builder::new()
            .immediate(microesnext_bytecode::Immediate::True)
            .op(Opcode::TypeOf)
            .op(Opcode::Return)
            .finish();
        let mut memory = [0; 48];
        let mut machine = Machine::with_strings(&code, &mut memory, 1).unwrap();
        let Outcome::Complete(value) = machine.run().unwrap() else {
            panic!("expected string completion")
        };
        assert!(
            machine
                .arena()
                .bytes_equal(value.as_ref().unwrap(), b"boolean")
                .unwrap()
        );
    }

    #[cfg(feature = "number-operations")]
    #[test]
    fn promotes_optional_fractional_arithmetic_without_changing_i30_addition() {
        let code = Builder::new()
            .const_f64(1.25)
            .const_i30(2)
            .op(Opcode::AddNumber)
            .op(Opcode::Return)
            .finish();
        let mut memory = [0; 48];
        let mut machine = Machine::new(&code, &mut memory);
        let Outcome::Complete(value) = machine.run().unwrap() else {
            panic!("expected number completion")
        };
        assert_eq!(
            microesnext_values::numbers::get(machine.arena(), value),
            Ok(3.25)
        );
    }

    #[cfg(all(feature = "number-division", feature = "number-remainder"))]
    #[test]
    fn executes_optional_division_without_the_arithmetic_feature() {
        let code = Builder::new()
            .const_i30(7)
            .const_i30(2)
            .op(Opcode::DivideNumber)
            .const_i30(1)
            .op(Opcode::RemainderNumber)
            .op(Opcode::Return)
            .finish();
        let mut memory = [0; 64];
        let mut machine = Machine::new(&code, &mut memory);
        let Outcome::Complete(value) = machine.run().unwrap() else {
            panic!("expected number completion")
        };
        assert_eq!(
            microesnext_values::numbers::get(machine.arena(), value),
            Ok(0.5)
        );
    }

    #[cfg(feature = "functions")]
    #[test]
    fn closure_captures_cross_an_explicit_call_frame() {
        let code = Builder::new()
            .const_i30(40)
            .closure(14, 1)
            .op(Opcode::CallValue)
            .op(Opcode::Return)
            .load_capture(0)
            .const_i30(2)
            .op(Opcode::AddI30)
            .op(Opcode::Return)
            .finish();
        let mut memory = [0; 96];
        let mut machine = Machine::new(&code, &mut memory);
        assert_eq!(
            machine.run().unwrap(),
            Outcome::Complete(Value::from_i30(42).unwrap())
        );
    }

    #[cfg(all(feature = "callable-objects", not(feature = "receivers")))]
    #[test]
    fn an_ordinary_callable_object_enters_its_compact_closure() {
        let code = Builder::new()
            .op(Opcode::CallValue)
            .op(Opcode::Return)
            .const_i30(42)
            .op(Opcode::Return)
            .finish();
        let mut memory = [0; 96];
        let mut machine = Machine::new(&code, &mut memory);
        let closure =
            microesnext_arena::closures::capture_stack(machine.arena_mut(), 2, 0).unwrap();
        let function =
            microesnext_objects::callable::new(machine.arena_mut(), closure, Value::NULL).unwrap();
        machine.arena_mut().push(function).unwrap();

        assert_eq!(
            machine.run(),
            Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
        );
    }

    #[cfg(feature = "constructors")]
    #[test]
    fn constructor_opcode_creates_an_ordinary_prototype_cycle() {
        let code = Builder::new()
            .closure(9, 0)
            .op(Opcode::ToConstructor)
            .op(Opcode::Return)
            .const_i30(42)
            .op(Opcode::Return)
            .finish();
        let mut memory = [0; 224];
        let mut machine = Machine::with_objects(&code, &mut memory, 4).unwrap();
        let Outcome::Complete(function) = machine.run().unwrap() else {
            panic!("expected a constructor value")
        };
        let prototype_key = machine.intern_atom(b"prototype").unwrap();
        let constructor_key = machine.intern_atom(b"constructor").unwrap();
        let prototype = microesnext_objects::get(machine.arena(), function, prototype_key).unwrap();

        assert_eq!(
            microesnext_objects::get(machine.arena(), prototype, constructor_key),
            Ok(function)
        );
        assert!(microesnext_objects::callable::is_callable_object(
            machine.arena(),
            function
        ));
    }

    #[cfg(feature = "class-constructors")]
    #[test]
    fn class_opcode_creates_a_distinct_prototype_cycle() {
        let code = Builder::new()
            .closure(9, 0)
            .op(Opcode::ToClassConstructor)
            .op(Opcode::Return)
            .const_i30(42)
            .op(Opcode::Return)
            .finish();
        let mut memory = [0; 224];
        let mut machine = Machine::with_objects(&code, &mut memory, 4).unwrap();
        let Outcome::Complete(constructor) = machine.run().unwrap() else {
            panic!("expected a class constructor value")
        };
        let prototype_key = machine.intern_atom(b"prototype").unwrap();
        let constructor_key = machine.intern_atom(b"constructor").unwrap();
        let prototype =
            microesnext_objects::get(machine.arena(), constructor, prototype_key).unwrap();

        assert!(
            microesnext_objects::class_constructor::is_class_constructor(
                machine.arena(),
                constructor
            )
        );
        assert_eq!(
            microesnext_objects::get(machine.arena(), prototype, constructor_key),
            Ok(constructor)
        );
        assert_eq!(
            microesnext_objects::callable::callable(machine.arena(), constructor),
            Err(Error::Type)
        );
    }

    #[cfg(feature = "instanceof")]
    #[test]
    fn instanceof_uses_the_callable_objects_prototype_property() {
        let code = Builder::new()
            .op(Opcode::InstanceOf)
            .op(Opcode::Return)
            .finish();
        let mut memory = [0; 224];
        let mut machine = Machine::with_objects(&code, &mut memory, 4).unwrap();
        let prototype_key = machine.intern_atom(b"prototype").unwrap();
        let prototype = microesnext_objects::new_object(machine.arena_mut(), Value::NULL).unwrap();
        let instance = microesnext_objects::new_object(machine.arena_mut(), prototype).unwrap();
        let closure =
            microesnext_arena::closures::capture_stack(machine.arena_mut(), 0, 0).unwrap();
        let constructor =
            microesnext_objects::callable::new(machine.arena_mut(), closure, Value::NULL).unwrap();
        let constructor =
            microesnext_objects::set(machine.arena_mut(), constructor, prototype_key, prototype)
                .unwrap();
        machine.arena_mut().push(instance).unwrap();
        machine.arena_mut().push(constructor).unwrap();

        assert_eq!(machine.run(), Ok(Outcome::Complete(Value::TRUE)));
    }

    #[cfg(feature = "functions")]
    #[test]
    fn scheduler_can_invoke_a_closure_with_an_argument() {
        let code = Builder::new().op(Opcode::Return).finish();
        let mut memory = [0; 64];
        let mut machine = Machine::new(&code, &mut memory);
        let function =
            microesnext_arena::closures::capture_stack(machine.arena_mut(), 0, 0).unwrap();
        let argument = Value::from_i30(42).unwrap();
        assert_eq!(
            machine.call_closure(function, argument).unwrap(),
            Outcome::Complete(argument)
        );
    }

    #[cfg(feature = "function-arguments")]
    #[test]
    fn external_arguments_initialize_parameter_slots() {
        let code = Builder::new()
            .init_frame(1, 1)
            .load_local(0)
            .op(Opcode::ReturnLocals)
            .finish();
        let mut memory = [0; 64];
        let mut machine = Machine::new(&code, &mut memory);
        let function =
            microesnext_arena::closures::capture_stack(machine.arena_mut(), 0, 0).unwrap();
        let argument = Value::from_i30(42).unwrap();
        assert_eq!(
            machine.call_closure(function, argument),
            Ok(Outcome::Complete(argument))
        );
    }

    #[cfg(feature = "promise-resolvers")]
    #[test]
    fn guest_resolver_call_yields_once_and_resumes_with_undefined() {
        let code = Builder::new()
            .init_frame(1, 1)
            .load_local(0)
            .const_i30(42)
            .call_value_arguments(1)
            .op(Opcode::ReturnLocals)
            .finish();
        let mut memory = [0; 128];
        let mut machine = Machine::new(&code, &mut memory);
        let function =
            microesnext_arena::closures::capture_stack(machine.arena_mut(), 0, 0).unwrap();
        let destination = microesnext_execution::promises::pending(machine.arena_mut()).unwrap();
        let pair =
            microesnext_execution::promises::resolvers::new(machine.arena_mut(), destination)
                .unwrap();

        let Outcome::PromiseResolverCall = machine.call_closure(function, pair.resolve).unwrap()
        else {
            panic!("expected a resolving-function call")
        };
        let call = machine.take_resolver_call().unwrap();
        assert_eq!(call.destination, destination);
        assert_eq!(
            call.settlement,
            microesnext_execution::promises::Settlement::Fulfilled
        );
        assert_eq!(call.argument.as_i30(), Some(42));
        assert_eq!(
            machine.resume_resolver_call(),
            Ok(Outcome::Complete(Value::UNDEFINED))
        );

        assert_eq!(
            machine.call_closure(function, pair.reject),
            Ok(Outcome::Complete(Value::UNDEFINED))
        );
    }

    #[cfg(feature = "receivers")]
    #[test]
    fn external_receiver_call_exposes_this_without_changing_parameters() {
        let code = Builder::new()
            .init_receiver_frame(1, 1)
            .op(Opcode::LoadThis)
            .op(Opcode::ReturnReceiverLocals)
            .finish();
        let mut memory = [0; 64];
        let mut machine = Machine::new(&code, &mut memory);
        let function =
            microesnext_arena::closures::capture_stack(machine.arena_mut(), 0, 0).unwrap();
        let argument = Value::from_i30(42).unwrap();

        assert_eq!(
            machine.call_closure_with_receiver(function, Value::TRUE, &[argument]),
            Ok(Outcome::Complete(Value::TRUE))
        );
        assert_eq!(machine.arena().stack_len(), 0);
    }

    #[cfg(feature = "function-arguments")]
    #[test]
    fn guest_calls_pass_evaluated_arguments_into_local_frames() {
        let code = Builder::new()
            .closure(16, 0)
            .const_i30(42)
            .call_value_arguments(1)
            .op(Opcode::Return)
            .init_frame(1, 1)
            .load_local(0)
            .op(Opcode::ReturnLocals)
            .finish();
        let mut memory = [0; 80];
        let mut machine = Machine::new(&code, &mut memory);
        assert_eq!(
            machine.run(),
            Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
        );
    }

    #[cfg(feature = "locals")]
    #[test]
    fn executes_optional_local_frames() {
        let code = Builder::new()
            .init_locals(2)
            .const_i30(40)
            .store_local(0)
            .const_i30(2)
            .store_local(1)
            .load_local(0)
            .load_local(1)
            .op(Opcode::AddI30)
            .op(Opcode::ReturnLocals)
            .finish();
        let mut memory = [0; 64];
        let mut machine = Machine::new(&code, &mut memory);
        assert_eq!(
            machine.run(),
            Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
        );

        let malformed = Builder::new()
            .init_locals(1)
            .load_local(1)
            .op(Opcode::ReturnLocals)
            .finish();
        let mut machine = Machine::new(&malformed, &mut memory);
        assert_eq!(machine.run(), Err(Error::BadBytecode));
    }

    #[cfg(all(feature = "environments", feature = "locals"))]
    #[test]
    fn environment_cell_mutation_is_shared_through_a_local_slot() {
        let code = Builder::new()
            .init_locals(1)
            .const_i30(40)
            .new_environment_cell()
            .store_local(0)
            .load_local(0)
            .const_i30(42)
            .store_environment_cell()
            .load_local(0)
            .load_environment_cell()
            .op(Opcode::ReturnLocals)
            .finish();
        let mut memory = [0; 64];
        let mut machine = Machine::new(&code, &mut memory);
        assert_eq!(
            machine.run(),
            Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
        );
    }

    #[cfg(feature = "control-flow")]
    #[test]
    fn branches_only_on_explicit_booleans() {
        let code = Builder::new()
            .const_i30(0)
            .to_boolean()
            .jump_if_false_boolean(17)
            .const_i30(1)
            .op(Opcode::Return)
            .const_i30(42)
            .op(Opcode::Return)
            .finish();
        let mut memory = [0; 32];
        let mut machine = Machine::new(&code, &mut memory);
        assert_eq!(
            machine.run(),
            Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
        );

        let malformed = Builder::new()
            .const_i30(0)
            .jump_if_false_boolean(10)
            .const_i30(1)
            .op(Opcode::Return)
            .finish();
        let mut machine = Machine::new(&malformed, &mut memory);
        assert_eq!(machine.run(), Err(Error::Type));
    }

    #[cfg(all(feature = "control-flow", feature = "numbers"))]
    #[test]
    fn coerces_optional_boxed_values_before_branching() {
        let number = Builder::new()
            .const_f64(f64::NAN)
            .to_boolean()
            .op(Opcode::Return)
            .finish();
        let mut memory = [0; 48];
        let mut machine = Machine::new(&number, &mut memory);
        assert_eq!(machine.run(), Ok(Outcome::Complete(Value::FALSE)));

        #[cfg(feature = "strings")]
        {
            let string = Builder::new()
                .string(b"")
                .to_boolean()
                .op(Opcode::Return)
                .finish();
            let mut machine = Machine::new(&string, &mut memory);
            assert_eq!(machine.run(), Ok(Outcome::Complete(Value::FALSE)));
        }
    }
}
