#![cfg_attr(target_arch = "wasm32", no_std)]
#![cfg_attr(target_arch = "wasm32", no_main)]

#[cfg(all(
    target_arch = "wasm32",
    any(
        feature = "async",
        feature = "equality",
        feature = "logical-operations",
        feature = "promise-resolution",
        feature = "promise-resolvers",
        feature = "receivers"
    )
))]
use microesnext::Value;
#[cfg(target_arch = "wasm32")]
use microesnext::bytecode::Opcode;
#[cfg(target_arch = "wasm32")]
use microesnext::{Core, CoreOutcome};
#[cfg(all(
    target_arch = "wasm32",
    any(
        feature = "arrays",
        feature = "async",
        feature = "async-functions",
        feature = "control-flow",
        feature = "exceptions",
        feature = "environments",
        feature = "equality",
        feature = "function-arguments",
        feature = "functions",
        feature = "locals",
        feature = "logical-operations",
        feature = "integer-negation",
        feature = "instanceof",
        feature = "minimal-program",
        feature = "numbers",
        feature = "number-coercion",
        feature = "number-division",
        feature = "number-remainder",
        feature = "string-number-coercion",
        feature = "number-negation",
        feature = "objects",
        feature = "promise-resolvers",
        feature = "recursive-functions",
        feature = "recursive-async-functions",
        feature = "receivers",
        feature = "strings",
        feature = "callable-objects",
        feature = "thenables",
        feature = "typeof"
    )
))]
use microesnext::{Machine, Outcome};

#[cfg(all(not(test), target_arch = "wasm32"))]
#[panic_handler]
fn panic(_info: &core::panic::PanicInfo<'_>) -> ! {
    loop {}
}

#[cfg(target_arch = "wasm32")]
#[unsafe(no_mangle)]
pub extern "C" fn core_probe() -> i32 {
    let code = [Opcode::ConstI30 as u8, 42, 0, 0, 0, Opcode::Return as u8];
    let mut memory = [0; 32];
    let mut core = Core::new(&code, &mut memory, 0);
    match core.run() {
        Ok(CoreOutcome::Complete(value)) => value.as_i30().unwrap_or(-1),
        _ => -1,
    }
}

#[cfg(all(feature = "prototype-chain", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn prototype_chain_probe() -> i32 {
    let mut memory = [0; 64];
    let mut arena = microesnext_arena::Arena::new(&mut memory);
    let prototype = microesnext::objects::new_object(&mut arena, microesnext::Value::NULL);
    let Ok(prototype) = prototype else { return 0 };
    let value = microesnext::objects::new_object(&mut arena, prototype);
    let Ok(value) = value else { return 0 };
    microesnext::prototype_chain::contains(&arena, value, prototype).unwrap_or(false) as i32
}

#[cfg(all(feature = "callable-objects", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn callable_objects_probe() -> i32 {
    let code = [
        Opcode::CallValue as u8,
        Opcode::Return as u8,
        Opcode::ConstI30 as u8,
        42,
        0,
        0,
        0,
        Opcode::Return as u8,
    ];
    let mut memory = [0; 96];
    let mut machine = Machine::new(&code, &mut memory);
    let Ok(closure) = microesnext::functions::capture_stack(machine.arena_mut(), 2, 0) else {
        return -1;
    };
    let Ok(function) =
        microesnext::callable_objects::new(machine.arena_mut(), closure, microesnext::Value::NULL)
    else {
        return -1;
    };
    if machine.arena_mut().push(function).is_err() {
        return -1;
    }
    match machine.run() {
        Ok(Outcome::Complete(value)) => value.as_i30().unwrap_or(-1),
        _ => -1,
    }
}

#[cfg(all(feature = "instanceof", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn instanceof_probe() -> i32 {
    let code = [Opcode::InstanceOf as u8, Opcode::Return as u8];
    let mut memory = [0; 224];
    let Ok(mut machine) = Machine::with_objects(&code, &mut memory, 4) else {
        return 0;
    };
    let Ok(key) = machine.intern_atom(b"prototype") else {
        return 0;
    };
    let Ok(prototype) =
        microesnext::objects::new_object(machine.arena_mut(), microesnext::Value::NULL)
    else {
        return 0;
    };
    let Ok(instance) = microesnext::objects::new_object(machine.arena_mut(), prototype) else {
        return 0;
    };
    let Ok(closure) = microesnext::functions::capture_stack(machine.arena_mut(), 0, 0) else {
        return 0;
    };
    let Ok(constructor) =
        microesnext::callable_objects::new(machine.arena_mut(), closure, microesnext::Value::NULL)
    else {
        return 0;
    };
    let Ok(constructor) =
        microesnext::objects::set(machine.arena_mut(), constructor, key, prototype)
    else {
        return 0;
    };
    if machine.arena_mut().push(instance).is_err() || machine.arena_mut().push(constructor).is_err()
    {
        return 0;
    }
    matches!(
        machine.run(),
        Ok(Outcome::Complete(microesnext::Value::TRUE))
    ) as i32
}

#[cfg(all(feature = "locals", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn locals_probe() -> i32 {
    let code = [
        Opcode::InitLocals as u8,
        1,
        0,
        Opcode::ConstI30 as u8,
        42,
        0,
        0,
        0,
        Opcode::StoreLocal as u8,
        0,
        0,
        Opcode::LoadLocal as u8,
        0,
        0,
        Opcode::ReturnLocals as u8,
    ];
    let mut memory = [0; 32];
    let mut machine = Machine::new(&code, &mut memory);
    match machine.run() {
        Ok(Outcome::Complete(value)) => value.as_i30().unwrap_or(-1),
        _ => -1,
    }
}

#[cfg(all(feature = "control-flow", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn control_flow_probe() -> i32 {
    let code = [
        Opcode::ConstImmediate as u8,
        microesnext::bytecode::Immediate::False as u8,
        Opcode::JumpIfFalseBoolean as u8,
        8,
        0,
        0,
        0,
        Opcode::Return as u8,
        Opcode::ConstI30 as u8,
        42,
        0,
        0,
        0,
        Opcode::Return as u8,
    ];
    let mut memory = [0; 32];
    let mut machine = Machine::new(&code, &mut memory);
    match machine.run() {
        Ok(Outcome::Complete(value)) => value.as_i30().unwrap_or(-1),
        _ => -1,
    }
}

#[cfg(all(feature = "minimal-program", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn minimal_program_probe() -> i32 {
    let code = [
        Opcode::InitLocals as u8,
        2,
        0,
        Opcode::ConstI30 as u8,
        6,
        0,
        0,
        0,
        Opcode::StoreLocal as u8,
        0,
        0,
        Opcode::ConstI30 as u8,
        1,
        0,
        0,
        0,
        Opcode::StoreLocal as u8,
        1,
        0,
        Opcode::LoadLocal as u8,
        0,
        0,
        Opcode::ConstI30 as u8,
        1,
        0,
        0,
        0,
        Opcode::GreaterThanI30 as u8,
        Opcode::ToBoolean as u8,
        Opcode::JumpIfFalseBoolean as u8,
        61,
        0,
        0,
        0,
        Opcode::LoadLocal as u8,
        1,
        0,
        Opcode::LoadLocal as u8,
        0,
        0,
        Opcode::MultiplyI30 as u8,
        Opcode::StoreLocal as u8,
        1,
        0,
        Opcode::LoadLocal as u8,
        0,
        0,
        Opcode::ConstI30 as u8,
        1,
        0,
        0,
        0,
        Opcode::SubtractI30 as u8,
        Opcode::StoreLocal as u8,
        0,
        0,
        Opcode::Jump as u8,
        19,
        0,
        0,
        0,
        Opcode::LoadLocal as u8,
        1,
        0,
        Opcode::ReturnLocals as u8,
    ];
    let mut memory = [0; 64];
    let mut machine = Machine::new(&code, &mut memory);
    match machine.run() {
        Ok(Outcome::Complete(value)) => value.as_i30().unwrap_or(-1),
        _ => -1,
    }
}

#[cfg(all(feature = "equality", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn equality_probe() -> i32 {
    let code = [
        Opcode::ConstImmediate as u8,
        microesnext::bytecode::Immediate::True as u8,
        Opcode::ConstImmediate as u8,
        microesnext::bytecode::Immediate::True as u8,
        Opcode::StrictEqual as u8,
        Opcode::Return as u8,
    ];
    let mut memory = [0; 32];
    let mut machine = Machine::new(&code, &mut memory);
    match machine.run() {
        Ok(Outcome::Complete(Value::TRUE)) => 1,
        _ => 0,
    }
}

#[cfg(all(feature = "equality", feature = "numbers", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn number_equality_probe() -> i32 {
    let nan = f64::NAN.to_bits().to_le_bytes();
    let number_code = [
        Opcode::ConstF64 as u8,
        nan[0],
        nan[1],
        nan[2],
        nan[3],
        nan[4],
        nan[5],
        nan[6],
        nan[7],
        Opcode::ConstF64 as u8,
        nan[0],
        nan[1],
        nan[2],
        nan[3],
        nan[4],
        nan[5],
        nan[6],
        nan[7],
        Opcode::StrictEqual as u8,
        Opcode::Return as u8,
    ];
    let mut number_memory = [0; 48];
    let mut number_machine = Machine::new(&number_code, &mut number_memory);
    match number_machine.run() {
        Ok(Outcome::Complete(Value::FALSE)) => 1,
        _ => 0,
    }
}

#[cfg(all(feature = "equality", feature = "strings", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn string_equality_probe() -> i32 {
    let string_code = [
        Opcode::ConstString as u8,
        1,
        0,
        b'x',
        Opcode::ConstString as u8,
        1,
        0,
        b'x',
        Opcode::StrictEqual as u8,
        Opcode::Return as u8,
    ];
    let mut string_memory = [0; 48];
    let mut string_machine = Machine::new(&string_code, &mut string_memory);
    match string_machine.run() {
        Ok(Outcome::Complete(Value::TRUE)) => 1,
        _ => 0,
    }
}

#[cfg(all(feature = "logical-operations", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn logical_operations_probe() -> i32 {
    let code = [
        Opcode::ConstImmediate as u8,
        microesnext::bytecode::Immediate::False as u8,
        Opcode::JumpIfFalsyOrPop as u8,
        13,
        0,
        0,
        0,
        Opcode::ConstI30 as u8,
        9,
        0,
        0,
        0,
        Opcode::Throw as u8,
        Opcode::LogicalNot as u8,
        Opcode::Return as u8,
    ];
    let mut memory = [0; 32];
    let mut machine = Machine::new(&code, &mut memory);
    match machine.run() {
        Ok(Outcome::Complete(Value::TRUE)) => 1,
        _ => 0,
    }
}

#[cfg(all(
    feature = "logical-operations",
    feature = "numbers",
    target_arch = "wasm32"
))]
#[unsafe(no_mangle)]
pub extern "C" fn number_logical_operations_probe() -> i32 {
    let nan = f64::NAN.to_bits().to_le_bytes();
    let code = [
        Opcode::ConstF64 as u8,
        nan[0],
        nan[1],
        nan[2],
        nan[3],
        nan[4],
        nan[5],
        nan[6],
        nan[7],
        Opcode::JumpIfTruthyOrPop as u8,
        19,
        0,
        0,
        0,
        Opcode::ConstI30 as u8,
        42,
        0,
        0,
        0,
        Opcode::Return as u8,
    ];
    let mut memory = [0; 48];
    let mut machine = Machine::new(&code, &mut memory);
    match machine.run() {
        Ok(Outcome::Complete(value)) => value.as_i30().unwrap_or(-1),
        _ => -1,
    }
}

#[cfg(all(
    feature = "logical-operations",
    feature = "strings",
    target_arch = "wasm32"
))]
#[unsafe(no_mangle)]
pub extern "C" fn string_logical_operations_probe() -> i32 {
    let code = [
        Opcode::ConstString as u8,
        0,
        0,
        Opcode::JumpIfTruthyOrPop as u8,
        13,
        0,
        0,
        0,
        Opcode::ConstI30 as u8,
        42,
        0,
        0,
        0,
        Opcode::Return as u8,
    ];
    let mut memory = [0; 48];
    let mut machine = Machine::new(&code, &mut memory);
    match machine.run() {
        Ok(Outcome::Complete(value)) => value.as_i30().unwrap_or(-1),
        _ => -1,
    }
}

#[cfg(all(
    feature = "control-flow",
    feature = "numbers",
    feature = "strings",
    target_arch = "wasm32"
))]
#[unsafe(no_mangle)]
pub extern "C" fn scalar_truthiness_probe() -> i32 {
    let nan = f64::NAN.to_bits();
    let number = [
        Opcode::ConstF64 as u8,
        nan as u8,
        (nan >> 8) as u8,
        (nan >> 16) as u8,
        (nan >> 24) as u8,
        (nan >> 32) as u8,
        (nan >> 40) as u8,
        (nan >> 48) as u8,
        (nan >> 56) as u8,
        Opcode::ToBoolean as u8,
        Opcode::Return as u8,
    ];
    let string = [
        Opcode::ConstString as u8,
        0,
        0,
        Opcode::ToBoolean as u8,
        Opcode::Return as u8,
    ];
    let mut number_memory = [0; 32];
    let mut string_memory = [0; 32];
    let mut number_machine = Machine::new(&number, &mut number_memory);
    let mut string_machine = Machine::new(&string, &mut string_memory);
    i32::from(
        number_machine.run() == Ok(Outcome::Complete(microesnext::Value::FALSE))
            && string_machine.run() == Ok(Outcome::Complete(microesnext::Value::FALSE)),
    )
}

#[cfg(all(feature = "async", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn async_probe() -> i32 {
    let code = [
        Opcode::ConstI30 as u8,
        42,
        0,
        0,
        0,
        Opcode::Await as u8,
        Opcode::Return as u8,
    ];
    let mut memory = [0; 32];
    let mut machine = Machine::with_root_capacity(&code, &mut memory, 1);
    let Ok(Outcome::Await { continuation, .. }) = machine.run() else {
        return -1;
    };
    match machine.resume(continuation, Value::from_i30(7).unwrap()) {
        Ok(Outcome::Complete(value)) => value.as_i30().unwrap_or(-1),
        _ => -1,
    }
}

#[cfg(all(feature = "async-functions", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn async_functions_probe() -> i32 {
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
        Opcode::ConstI30 as u8,
        42,
        0,
        0,
        0,
        Opcode::Await as u8,
        Opcode::Return as u8,
    ];
    let mut memory = [0; 192];
    let mut machine = Machine::with_root_capacity(&code, &mut memory, 16);
    let mut job_slots = [None; 1];
    let mut queue = microesnext::promises::JobQueue::new(&mut job_slots);
    let mut frame_slots = [None; 1];
    let mut frames = microesnext::async_functions::Frames::new(&mut frame_slots);
    let Ok(microesnext::r#async::Progress::Complete(promise)) =
        microesnext::r#async::run_functions(&mut machine, &mut queue, &mut frames)
    else {
        return -1;
    };
    if microesnext::r#async::run_one_reaction(&mut machine, &mut queue) != Ok(true) {
        return -1;
    }
    match microesnext::promises::settled_result(machine.arena(), promise) {
        Ok(Some((microesnext::promises::Settlement::Fulfilled, value))) => {
            value.as_i30().unwrap_or(-1)
        }
        _ => -1,
    }
}

#[cfg(all(feature = "exceptions", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn exceptions_probe() -> i32 {
    let code = [
        Opcode::Try as u8,
        12,
        0,
        0,
        0,
        Opcode::ConstI30 as u8,
        42,
        0,
        0,
        0,
        Opcode::Throw as u8,
        Opcode::EndTry as u8,
        Opcode::Return as u8,
    ];
    let mut memory = [0; 32];
    let mut machine = Machine::new(&code, &mut memory);
    match machine.run() {
        Ok(Outcome::Complete(value)) => value.as_i30().unwrap_or(-1),
        _ => -1,
    }
}

#[cfg(all(feature = "arrays", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn arrays_probe() -> usize {
    let code = [
        Opcode::NewArray as u8,
        Opcode::ConstI30 as u8,
        0,
        0,
        0,
        0,
        Opcode::ConstI30 as u8,
        42,
        0,
        0,
        0,
        Opcode::SetIndex as u8,
        Opcode::ConstI30 as u8,
        0,
        0,
        0,
        0,
        Opcode::GetIndex as u8,
        Opcode::Return as u8,
    ];
    let mut memory = [0; 64];
    let mut machine = Machine::new(&code, &mut memory);
    match machine.run() {
        Ok(Outcome::Complete(value)) => value.as_i30().unwrap_or(-1) as usize,
        _ => usize::MAX,
    }
}

#[cfg(all(feature = "iterators", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn iterators_probe() -> usize {
    let mut memory = [0; 32];
    let mut arena = microesnext_arena::Arena::new(&mut memory);
    let source = microesnext::Value::from_i30(42).unwrap();
    let iterator = microesnext::iterators::new(&mut arena, source, 7).unwrap();
    microesnext::iterators::set_index(&mut arena, iterator, 3).unwrap();
    let (actual, index, kind) = microesnext::iterators::state(&arena, iterator).unwrap();
    usize::from(actual == source) + index + kind as usize
}

#[cfg(all(feature = "array-iterators", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn array_iterators_probe() -> i32 {
    let mut memory = [0; 64];
    let mut arena = microesnext_arena::Arena::new(&mut memory);
    let array = microesnext::arrays::new(&mut arena).unwrap();
    let array = microesnext::arrays::push(&mut arena, array, microesnext::Value::TRUE).unwrap();
    let iterator = microesnext::array_iterators::new_values(&mut arena, array).unwrap();
    i32::from(
        microesnext::array_iterators::next(&mut arena, iterator).unwrap()
            == Some(microesnext::Value::TRUE),
    )
}

#[cfg(all(feature = "collections", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn collections_probe() -> usize {
    let mut memory = [0; 64];
    let mut arena = microesnext_arena::Arena::new(&mut memory);
    let map = microesnext::collections::new_map(&mut arena).unwrap();
    microesnext::collections::len(&arena, map).unwrap()
}

#[cfg(all(feature = "collection-iterators", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn collection_iterators_probe() -> i32 {
    let mut memory = [0; 80];
    let mut arena = microesnext_arena::Arena::new(&mut memory);
    let set = microesnext::collections::new_set(&mut arena).unwrap();
    let set = microesnext::collections::add(&mut arena, set, microesnext::Value::TRUE).unwrap();
    let iterator = microesnext::collection_iterators::new_values(&mut arena, set).unwrap();
    i32::from(
        microesnext::collection_iterators::next(&mut arena, iterator).unwrap()
            == Some(microesnext::Value::TRUE),
    )
}

#[cfg(all(feature = "collection-entry-iterators", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn collection_entry_iterators_probe() -> i32 {
    let mut memory = [0; 128];
    let mut arena = microesnext_arena::Arena::new(&mut memory);
    let map = microesnext::collections::new_map(&mut arena).unwrap();
    let map = microesnext::collections::set(
        &mut arena,
        map,
        microesnext::Value::from_i30(4).unwrap(),
        microesnext::Value::from_i30(2).unwrap(),
    )
    .unwrap();
    let iterator = microesnext::collection_entry_iterators::new(&mut arena, map).unwrap();
    let pair = microesnext::collection_entry_iterators::next(&mut arena, iterator)
        .unwrap()
        .unwrap();
    let key = microesnext::arrays::get(&arena, pair, 0)
        .unwrap()
        .as_i30()
        .unwrap_or(-1);
    let value = microesnext::arrays::get(&arena, pair, 1)
        .unwrap()
        .as_i30()
        .unwrap_or(-1);
    key * 10 + value
}

#[cfg(all(
    feature = "collections",
    feature = "numbers",
    feature = "strings",
    target_arch = "wasm32"
))]
#[unsafe(no_mangle)]
pub extern "C" fn collection_equality_probe() -> i32 {
    let mut memory = [0; 160];
    let mut arena = microesnext_arena::Arena::new(&mut memory);
    let map = microesnext::collections::new_map(&mut arena).unwrap();
    let nan_a = microesnext::numbers::new(&mut arena, f64::NAN).unwrap();
    let nan_b = microesnext::numbers::new(&mut arena, f64::NAN).unwrap();
    let map =
        microesnext::collections::set(&mut arena, map, nan_a, microesnext::Value::TRUE).unwrap();
    let left = microesnext::strings::new(&mut arena, b"key").unwrap();
    let right = microesnext::strings::new(&mut arena, b"key").unwrap();
    let map =
        microesnext::collections::set(&mut arena, map, left, microesnext::Value::FALSE).unwrap();
    i32::from(
        microesnext::collections::get(&arena, map, nan_b).unwrap() == microesnext::Value::TRUE
            && microesnext::collections::get(&arena, map, right).unwrap()
                == microesnext::Value::FALSE,
    )
}

#[cfg(all(feature = "functions", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn functions_probe() -> i32 {
    const BODY: u32 = 9;
    let code = [
        Opcode::Closure as u8,
        BODY as u8,
        0,
        0,
        0,
        0,
        0,
        Opcode::CallValue as u8,
        Opcode::Return as u8,
        Opcode::ConstI30 as u8,
        42,
        0,
        0,
        0,
        Opcode::Return as u8,
    ];
    let mut memory = [0; 48];
    let mut machine = Machine::new(&code, &mut memory);
    match machine.run() {
        Ok(Outcome::Complete(value)) => value.as_i30().unwrap_or(-1),
        _ => -1,
    }
}

#[cfg(all(feature = "recursive-functions", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn recursive_functions_probe() -> i32 {
    const BODY: u32 = 9;
    let code = [
        Opcode::RecursiveClosure as u8,
        BODY as u8,
        0,
        0,
        0,
        0,
        0,
        Opcode::CallValue as u8,
        Opcode::Return as u8,
        Opcode::LoadCapture as u8,
        0,
        0,
        Opcode::LoadEnvironmentCell as u8,
        Opcode::Return as u8,
    ];
    let mut memory = [0; 48];
    let mut machine = Machine::new(&code, &mut memory);
    let Ok(Outcome::Complete(function)) = machine.run() else {
        return -1;
    };
    match microesnext::functions::entry(machine.arena(), function) {
        Ok(entry) if entry == BODY as usize => 42,
        _ => -1,
    }
}

#[cfg(all(feature = "recursive-async-functions", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn recursive_async_functions_probe() -> i32 {
    const BODY: u32 = 9;
    let code = [
        Opcode::RecursiveAsyncClosure as u8,
        BODY as u8,
        0,
        0,
        0,
        0,
        0,
        Opcode::Return as u8,
        Opcode::Return as u8,
        Opcode::LoadCapture as u8,
        0,
        0,
        Opcode::LoadEnvironmentCell as u8,
        Opcode::Return as u8,
    ];
    let mut memory = [0; 64];
    let mut machine = Machine::new(&code, &mut memory);
    let Ok(Outcome::Complete(function)) = machine.run() else {
        return -1;
    };
    let Ok(cell) = microesnext::async_functions::capture(machine.arena(), function, 0) else {
        return -1;
    };
    match microesnext::environments::get(machine.arena(), cell) {
        Ok(identity) if identity == function => 42,
        _ => -1,
    }
}

#[cfg(all(feature = "environments", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn environments_probe() -> i32 {
    let code = [
        Opcode::ConstI30 as u8,
        42,
        0,
        0,
        0,
        Opcode::NewEnvironmentCell as u8,
        Opcode::LoadEnvironmentCell as u8,
        Opcode::Return as u8,
    ];
    let mut memory = [0; 32];
    let mut machine = Machine::new(&code, &mut memory);
    match machine.run() {
        Ok(Outcome::Complete(value)) => value.as_i30().unwrap_or(-1),
        _ => -1,
    }
}

#[cfg(all(feature = "errors", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn errors_probe() -> i32 {
    let mut memory = [0; 32];
    let mut arena = microesnext_arena::Arena::new(&mut memory);
    let Ok(error) =
        microesnext::errors::new(&mut arena, microesnext::errors::ErrorKind::Type, &mut [])
    else {
        return -1;
    };
    match microesnext::errors::kind(&arena, error) {
        Ok(microesnext::errors::ErrorKind::Type) => 42,
        _ => -1,
    }
}

#[cfg(all(
    feature = "environments",
    feature = "functions",
    feature = "locals",
    target_arch = "wasm32"
))]
#[unsafe(no_mangle)]
pub extern "C" fn closure_environments_probe() -> i32 {
    const BODY: u32 = 24;
    let code = [
        Opcode::InitLocals as u8,
        1,
        0,
        Opcode::ConstI30 as u8,
        40,
        0,
        0,
        0,
        Opcode::NewEnvironmentCell as u8,
        Opcode::StoreLocal as u8,
        0,
        0,
        Opcode::LoadLocal as u8,
        0,
        0,
        Opcode::Closure as u8,
        BODY as u8,
        0,
        0,
        0,
        1,
        0,
        Opcode::CallValue as u8,
        Opcode::ReturnLocals as u8,
        Opcode::LoadCapture as u8,
        0,
        0,
        Opcode::ConstI30 as u8,
        42,
        0,
        0,
        0,
        Opcode::StoreEnvironmentCell as u8,
        Opcode::LoadCapture as u8,
        0,
        0,
        Opcode::LoadEnvironmentCell as u8,
        Opcode::Return as u8,
    ];
    let mut memory = [0; 64];
    let mut machine = Machine::new(&code, &mut memory);
    match machine.run() {
        Ok(Outcome::Complete(value)) => value.as_i30().unwrap_or(-1),
        _ => -1,
    }
}

#[cfg(all(feature = "function-arguments", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn function_arguments_probe() -> i32 {
    const BODY: u32 = 16;
    let code = [
        Opcode::Closure as u8,
        BODY as u8,
        0,
        0,
        0,
        0,
        0,
        Opcode::ConstI30 as u8,
        42,
        0,
        0,
        0,
        Opcode::CallValueArguments as u8,
        1,
        0,
        Opcode::Return as u8,
        Opcode::InitFrame as u8,
        1,
        0,
        1,
        0,
        Opcode::LoadLocal as u8,
        0,
        0,
        Opcode::ReturnLocals as u8,
    ];
    let mut memory = [0; 64];
    let mut machine = Machine::new(&code, &mut memory);
    match machine.run() {
        Ok(Outcome::Complete(value)) => value.as_i30().unwrap_or(-1),
        _ => -1,
    }
}

#[cfg(all(feature = "receivers", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn receivers_probe() -> i32 {
    let code = [
        Opcode::InitReceiverFrame as u8,
        1,
        0,
        1,
        0,
        Opcode::LoadThis as u8,
        Opcode::ReturnReceiverLocals as u8,
    ];
    let mut memory = [0; 64];
    let mut machine = Machine::new(&code, &mut memory);
    let function = microesnext::functions::capture_stack(machine.arena_mut(), 0, 0).unwrap();
    match machine.call_closure_with_receiver(function, Value::from_i30(42).unwrap(), &[Value::TRUE])
    {
        Ok(Outcome::Complete(value)) => value.as_i30().unwrap_or(-1),
        _ => -1,
    }
}

#[cfg(all(feature = "numbers", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn numbers_probe() -> f64 {
    let left = 1.25_f64.to_bits();
    let code = [
        Opcode::ConstF64 as u8,
        left as u8,
        (left >> 8) as u8,
        (left >> 16) as u8,
        (left >> 24) as u8,
        (left >> 32) as u8,
        (left >> 40) as u8,
        (left >> 48) as u8,
        (left >> 56) as u8,
        Opcode::Return as u8,
    ];
    let mut memory = [0; 48];
    let mut machine = Machine::new(&code, &mut memory);
    let Ok(Outcome::Complete(value)) = machine.run() else {
        return f64::NAN;
    };
    microesnext::numbers::get(machine.arena(), value).unwrap_or(f64::NAN)
}

#[cfg(all(feature = "number-operations", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn number_operations_probe() -> f64 {
    let left = 1.25_f64.to_bits();
    let code = [
        Opcode::ConstF64 as u8,
        left as u8,
        (left >> 8) as u8,
        (left >> 16) as u8,
        (left >> 24) as u8,
        (left >> 32) as u8,
        (left >> 40) as u8,
        (left >> 48) as u8,
        (left >> 56) as u8,
        Opcode::ConstI30 as u8,
        2,
        0,
        0,
        0,
        Opcode::AddNumber as u8,
        Opcode::Return as u8,
    ];
    let mut memory = [0; 48];
    let mut machine = Machine::new(&code, &mut memory);
    let Ok(Outcome::Complete(value)) = machine.run() else {
        return f64::NAN;
    };
    microesnext::numbers::get(machine.arena(), value).unwrap_or(f64::NAN)
}

#[cfg(all(feature = "number-division", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn number_division_probe() -> f64 {
    let code = [
        Opcode::ConstI30 as u8,
        7,
        0,
        0,
        0,
        Opcode::ConstI30 as u8,
        2,
        0,
        0,
        0,
        Opcode::DivideNumber as u8,
        Opcode::Return as u8,
    ];
    let mut memory = [0; 64];
    let mut machine = Machine::new(&code, &mut memory);
    let Ok(Outcome::Complete(value)) = machine.run() else {
        return f64::NAN;
    };
    microesnext::numbers::get(machine.arena(), value).unwrap_or(f64::NAN)
}

#[cfg(all(feature = "number-remainder", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn number_remainder_probe() -> i32 {
    let code = [
        Opcode::ConstI30 as u8,
        7,
        0,
        0,
        0,
        Opcode::ConstI30 as u8,
        2,
        0,
        0,
        0,
        Opcode::RemainderNumber as u8,
        Opcode::Return as u8,
    ];
    let mut memory = [0; 32];
    let mut machine = Machine::new(&code, &mut memory);
    match machine.run() {
        Ok(Outcome::Complete(value)) => value.as_i30().unwrap_or(-1),
        _ => -1,
    }
}

#[cfg(all(feature = "integer-negation", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn integer_negation_probe() -> i32 {
    let code = [
        Opcode::ConstI30 as u8,
        42,
        0,
        0,
        0,
        Opcode::NegateI30 as u8,
        Opcode::Return as u8,
    ];
    let mut memory = [0; 16];
    let mut machine = Machine::new(&code, &mut memory);
    match machine.run() {
        Ok(Outcome::Complete(value)) => value.as_i30().unwrap_or(0),
        _ => 0,
    }
}

#[cfg(all(feature = "number-coercion", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn number_coercion_probe() -> i32 {
    let code = [
        Opcode::ConstImmediate as u8,
        microesnext::bytecode::Immediate::True as u8,
        Opcode::ToNumber as u8,
        Opcode::Return as u8,
    ];
    let mut memory = [0; 16];
    let mut machine = Machine::new(&code, &mut memory);
    match machine.run() {
        Ok(Outcome::Complete(value)) => value.as_i30().unwrap_or(0),
        _ => 0,
    }
}

#[cfg(all(feature = "string-number-coercion", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn string_number_coercion_probe() -> i32 {
    let code = [
        Opcode::ConstString as u8,
        4,
        0,
        b' ',
        b'4',
        b'2',
        b' ',
        Opcode::ToNumber as u8,
        Opcode::Return as u8,
    ];
    let mut memory = [0; 32];
    let mut machine = Machine::new(&code, &mut memory);
    match machine.run() {
        Ok(Outcome::Complete(value)) => value.as_i30().unwrap_or(0),
        _ => 0,
    }
}

#[cfg(all(feature = "number-negation", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn number_negation_probe() -> i32 {
    let code = [
        Opcode::ConstI30 as u8,
        0,
        0,
        0,
        0,
        Opcode::NegateNumber as u8,
        Opcode::Return as u8,
    ];
    let mut memory = [0; 32];
    let mut machine = Machine::new(&code, &mut memory);
    let Ok(Outcome::Complete(value)) = machine.run() else {
        return 0;
    };
    microesnext::numbers::get(machine.arena(), value).is_ok_and(f64::is_sign_negative) as i32
}

#[cfg(all(feature = "objects", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn objects_probe() -> i32 {
    let code = [
        Opcode::NewObject as u8,
        Opcode::ConstAtom as u8,
        1,
        0,
        b'x',
        Opcode::ConstI30 as u8,
        42,
        0,
        0,
        0,
        Opcode::SetProperty as u8,
        Opcode::ConstAtom as u8,
        1,
        0,
        b'x',
        Opcode::GetProperty as u8,
        Opcode::Return as u8,
    ];
    let mut memory = [0; 96];
    let mut machine = Machine::with_objects(&code, &mut memory, 1).unwrap();
    match machine.run() {
        Ok(Outcome::Complete(value)) => value.as_i30().unwrap_or(-1),
        _ => -1,
    }
}

#[cfg(all(feature = "strings", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn strings_probe() -> u32 {
    let code = [
        Opcode::ConstString as u8,
        5,
        0,
        b'h',
        b'e',
        b'l',
        b'l',
        b'o',
        Opcode::Return as u8,
    ];
    let mut memory = [0; 48];
    let mut machine = Machine::with_strings(&code, &mut memory, 1).unwrap();
    match machine.run() {
        Ok(Outcome::Complete(value)) => value.raw(),
        _ => 0,
    }
}

#[cfg(all(feature = "typeof", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn typeof_probe() -> i32 {
    let code = [
        Opcode::ConstImmediate as u8,
        microesnext::bytecode::Immediate::True as u8,
        Opcode::TypeOf as u8,
        Opcode::Return as u8,
    ];
    let mut memory = [0; 48];
    let mut machine = Machine::with_strings(&code, &mut memory, 1).unwrap();
    match machine.run() {
        Ok(Outcome::Complete(value))
            if machine
                .arena()
                .bytes_equal(value.as_ref().unwrap(), b"boolean")
                .unwrap_or(false) =>
        {
            1
        }
        _ => 0,
    }
}

#[cfg(all(feature = "symbols", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn symbols_probe() -> u32 {
    let mut memory = [0; 32];
    let mut arena = microesnext_arena::Arena::new(&mut memory);
    let first = microesnext::symbols::new(&mut arena, microesnext::Value::UNDEFINED).unwrap();
    let second = microesnext::symbols::new(&mut arena, microesnext::Value::UNDEFINED).unwrap();
    u32::from(first != second && microesnext::symbols::description(&arena, first).is_ok())
}

#[cfg(all(feature = "well-known-symbols", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn well_known_symbols_probe() -> u32 {
    let mut memory = [0; 32];
    let mut arena = microesnext_arena::Arena::with_root_capacity(&mut memory, 1);
    let symbols = microesnext::well_known_symbols::WellKnownSymbols::new(&mut arena).unwrap();
    symbols.iterator(&arena).unwrap().raw()
}

#[cfg(all(feature = "iterator-results", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn iterator_results_probe() -> i32 {
    let mut memory = [0; 256];
    let mut arena = microesnext_arena::Arena::with_root_capacity(&mut memory, 3);
    let mut atoms = microesnext::atoms::Atoms::new(&mut arena).unwrap();
    let keys =
        microesnext::iterator_results::IteratorResultKeys::new(&mut arena, &mut atoms).unwrap();
    let result = keys
        .create_next(
            &mut arena,
            microesnext::Value::NULL,
            microesnext::Value::from_i30(42),
        )
        .unwrap();
    let value = atoms.intern(&mut arena, b"value").unwrap();
    let answer = microesnext::objects::get(&arena, result, value)
        .unwrap()
        .as_i30()
        .unwrap_or(-1);
    let exhausted = keys
        .create_next(&mut arena, microesnext::Value::NULL, None)
        .unwrap();
    let done = atoms.intern(&mut arena, b"done").unwrap();
    if microesnext::objects::get(&arena, exhausted, done) == Ok(microesnext::Value::TRUE) {
        answer
    } else {
        -1
    }
}

#[cfg(all(feature = "iterable-protocol", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn iterable_protocol_probe() -> u32 {
    let mut memory = [0; 96];
    let mut arena = microesnext_arena::Arena::with_root_capacity(&mut memory, 1);
    let symbols = microesnext::well_known_symbols::WellKnownSymbols::new(&mut arena).unwrap();
    let prototype = microesnext::objects::new_object(&mut arena, microesnext::Value::NULL).unwrap();
    let prototype = microesnext::iterable_protocol::define(
        &mut arena,
        prototype,
        &symbols,
        microesnext::Value::TRUE,
    )
    .unwrap();
    let iterable = microesnext::objects::new_object(&mut arena, prototype).unwrap();
    u32::from(
        microesnext::iterable_protocol::get(&arena, iterable, &symbols).unwrap()
            == Some(microesnext::Value::TRUE),
    )
}

#[cfg(all(feature = "atoms", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn atoms_probe() -> u32 {
    let code = [
        Opcode::ConstAtom as u8,
        3,
        0,
        b'k',
        b'e',
        b'y',
        Opcode::Return as u8,
    ];
    let mut memory = [0; 48];
    let mut machine = Machine::with_atoms(&code, &mut memory, 1).unwrap();
    match machine.run() {
        Ok(Outcome::Complete(value)) => value.raw(),
        _ => 0,
    }
}

#[cfg(all(feature = "promises", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn promises_probe() -> u32 {
    let mut memory = [0; 48];
    let mut arena = microesnext_arena::Arena::new(&mut memory);
    microesnext::promises::pending(&mut arena).unwrap().raw()
}

#[cfg(all(feature = "promise-resolution", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn promise_resolution_probe() -> i32 {
    let mut memory = [0; 192];
    let mut arena = microesnext_arena::Arena::with_root_capacity(&mut memory, 8);
    let Ok(source) = microesnext::promises::pending(&mut arena) else {
        return -1;
    };
    let Ok(destination) = microesnext::promises::pending(&mut arena) else {
        return -1;
    };
    let mut slots = [None; 1];
    let mut queue = microesnext::promises::JobQueue::new(&mut slots);
    if microesnext::promise_resolution::resolve_native(&mut arena, &mut queue, destination, source)
        .is_err()
    {
        return -1;
    }
    let answer = Value::from_i30(42).unwrap();
    if microesnext::promises::settle(
        &mut arena,
        &mut queue,
        source,
        microesnext::promises::Settlement::Fulfilled,
        answer,
    )
    .is_err()
    {
        return -1;
    }
    let Ok(Some(job)) = queue.pop(&mut arena) else {
        return -1;
    };
    if microesnext::promises::settle(
        &mut arena,
        &mut queue,
        job.destination,
        job.settlement,
        job.argument,
    )
    .is_err()
    {
        return -1;
    }
    let Ok(self_reference) = microesnext::promises::pending(&mut arena) else {
        return -1;
    };
    if microesnext::promise_resolution::resolve_native(
        &mut arena,
        &mut queue,
        self_reference,
        self_reference,
    )
    .is_err()
    {
        return -1;
    }
    let Ok(Some((microesnext::promises::Settlement::Rejected, reason))) =
        microesnext::promises::settled_result(&arena, self_reference)
    else {
        return -1;
    };
    if microesnext::errors::kind(&arena, reason) != Ok(microesnext::errors::ErrorKind::Type) {
        return -1;
    }
    match microesnext::promises::settled_result(&arena, destination) {
        Ok(Some((microesnext::promises::Settlement::Fulfilled, value))) => {
            value.as_i30().unwrap_or(-1)
        }
        _ => -1,
    }
}

#[cfg(all(feature = "promise-resolvers", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn promise_resolvers_probe() -> i32 {
    let code = [
        Opcode::ConstI30 as u8,
        42,
        0,
        0,
        0,
        Opcode::CallValueArguments as u8,
        1,
        0,
        Opcode::Return as u8,
    ];
    let mut memory = [0; 128];
    let mut machine = Machine::with_root_capacity(&code, &mut memory, 4);
    let destination = microesnext::promises::pending(machine.arena_mut()).unwrap();
    let pair = microesnext::promise_resolvers::new(machine.arena_mut(), destination).unwrap();
    machine.arena_mut().push(pair.resolve).unwrap();
    let Ok(Outcome::PromiseResolverCall) = machine.run() else {
        return -1;
    };
    let call = machine.take_resolver_call().unwrap();
    let mut slots = [None; 0];
    let mut queue = microesnext::promises::JobQueue::new(&mut slots);
    microesnext::promise_resolvers::settle_call(machine.arena_mut(), &mut queue, call).unwrap();
    let Ok(Outcome::Complete(_)) = machine.resume_resolver_call() else {
        return -1;
    };
    match microesnext::promises::settled_result(machine.arena(), destination) {
        Ok(Some((microesnext::promises::Settlement::Fulfilled, value))) => {
            value.as_i30().unwrap_or(-1)
        }
        _ => -1,
    }
}

#[cfg(all(feature = "thenables", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn thenables_probe() -> i32 {
    let code = [
        Opcode::InitReceiverFrame as u8,
        2,
        0,
        2,
        0,
        Opcode::LoadLocal as u8,
        0,
        0,
        Opcode::ConstI30 as u8,
        42,
        0,
        0,
        0,
        Opcode::CallValueArguments as u8,
        1,
        0,
        Opcode::ReturnReceiverLocals as u8,
    ];
    let mut memory = [0; 192];
    let mut machine = Machine::with_root_capacity(&code, &mut memory, 8);
    let then = microesnext::functions::capture_stack(machine.arena_mut(), 0, 0).unwrap();
    let key = Value::TRUE;
    let object = microesnext::objects::new_object(machine.arena_mut(), Value::NULL).unwrap();
    let object = microesnext::objects::set(machine.arena_mut(), object, key, then).unwrap();
    let destination = microesnext::promises::pending(machine.arena_mut()).unwrap();
    let mut slots = [None; 0];
    let mut queue = microesnext::promises::JobQueue::new(&mut slots);
    let Ok(microesnext::thenables::Prepared::Job(job)) =
        microesnext::thenables::prepare(&mut machine, &mut queue, destination, object, key)
    else {
        return -1;
    };
    if microesnext::thenables::run(&mut machine, &mut queue, job).is_err() {
        return -1;
    }
    match microesnext::promises::settled_result(machine.arena(), destination) {
        Ok(Some((microesnext::promises::Settlement::Fulfilled, value))) => {
            value.as_i30().unwrap_or(-1)
        }
        _ => -1,
    }
}

#[cfg(all(feature = "async-thenables", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn async_thenables_probe() -> i32 {
    const BODY: u32 = 9;
    const THEN: u32 = 13;
    let code = [
        Opcode::AsyncClosure as u8,
        BODY as u8,
        0,
        0,
        0,
        1,
        0,
        Opcode::CallValue as u8,
        Opcode::Return as u8,
        Opcode::LoadCapture as u8,
        0,
        0,
        Opcode::Return as u8,
        Opcode::InitReceiverFrame as u8,
        2,
        0,
        2,
        0,
        Opcode::LoadLocal as u8,
        0,
        0,
        Opcode::ConstI30 as u8,
        42,
        0,
        0,
        0,
        Opcode::CallValueArguments as u8,
        1,
        0,
        Opcode::ReturnReceiverLocals as u8,
    ];
    let mut memory = [0; 320];
    let mut machine = Machine::with_root_capacity(&code, &mut memory, 20);
    let then = microesnext::functions::capture_stack(machine.arena_mut(), THEN, 0).unwrap();
    let then_key = Value::TRUE;
    let object = microesnext::objects::new_object(machine.arena_mut(), Value::NULL).unwrap();
    let object = microesnext::objects::set(machine.arena_mut(), object, then_key, then).unwrap();
    machine.arena_mut().push(object).unwrap();
    let mut promise_slots = [None; 2];
    let mut promise_jobs = microesnext::promises::JobQueue::new(&mut promise_slots);
    let mut frame_slots = [None; 1];
    let mut frames = microesnext::async_functions::Frames::new(&mut frame_slots);
    let mut thenable_slots = [const { None }; 2];
    let mut thenable_jobs = microesnext::thenables::Jobs::new(&mut thenable_slots);
    let mut resolver =
        microesnext::async_thenables::Resolver::new(&mut machine, &mut thenable_jobs, then_key)
            .unwrap();
    let Ok(microesnext::r#async::Progress::Complete(promise)) =
        microesnext::r#async::run_functions_with(
            &mut machine,
            &mut promise_jobs,
            &mut frames,
            &mut resolver,
        )
    else {
        return -1;
    };
    let promise = machine.retain(promise).unwrap();
    resolver.release(&mut machine).unwrap();
    if thenable_jobs
        .run_one(&mut machine, &mut promise_jobs)
        .is_err()
    {
        return -1;
    }
    match microesnext::promises::settled_result(machine.arena(), machine.root(promise).unwrap()) {
        Ok(Some((microesnext::promises::Settlement::Fulfilled, value))) => {
            value.as_i30().unwrap_or(-1)
        }
        _ => -1,
    }
}

#[cfg(all(feature = "weak-collections", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn weak_collections_probe() -> u32 {
    let mut memory = [0; 64];
    let mut arena = microesnext_arena::Arena::new(&mut memory);
    microesnext::weak_collections::new_weak_map(&mut arena)
        .unwrap()
        .raw()
}

#[cfg(not(target_arch = "wasm32"))]
fn main() {}
