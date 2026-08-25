use microesnext::{Machine, Value};
use microesnext_compiler::compile_script;

#[test]
fn source_async_function_returns_before_its_awaited_body_finishes() {
    let code =
        compile_script("async function answer() { return await 42; } return answer();").unwrap();
    let mut memory = [0; 256];
    let mut machine = Machine::with_root_capacity(&code, &mut memory, 16);
    let mut jobs: [Option<microesnext::promises::JobSlot>; 2] = [None; 2];
    let mut queue = microesnext::promises::JobQueue::new(&mut jobs);
    let mut frame_slots = [None; 1];
    let mut frames = microesnext::async_functions::Frames::new(&mut frame_slots);

    let microesnext::r#async::Progress::Complete(promise) =
        microesnext::r#async::run_functions(&mut machine, &mut queue, &mut frames).unwrap()
    else {
        panic!("expected the restored caller to return its promise")
    };
    assert_eq!(
        microesnext::promises::settled_result(machine.arena(), promise),
        Ok(None)
    );
    assert!(microesnext::r#async::run_one_reaction(&mut machine, &mut queue).unwrap());
    assert_eq!(
        microesnext::promises::settled_result(machine.arena(), promise),
        Ok(Some((
            microesnext::promises::Settlement::Fulfilled,
            Value::from_i30(42).unwrap(),
        )))
    );
}

#[test]
fn nested_async_calls_restore_each_caller_and_chain_their_promises() {
    let code = compile_script(
        "async function inner() { return await 42; } async function outer() { return await inner(); } return outer();",
    )
    .unwrap();
    let mut memory = [0; 384];
    let mut machine = Machine::with_root_capacity(&code, &mut memory, 24);
    let mut jobs: [Option<microesnext::promises::JobSlot>; 4] = [None; 4];
    let mut queue = microesnext::promises::JobQueue::new(&mut jobs);
    let mut frame_slots = [None; 2];
    let mut frames = microesnext::async_functions::Frames::new(&mut frame_slots);

    let microesnext::r#async::Progress::Complete(promise) =
        microesnext::r#async::run_functions(&mut machine, &mut queue, &mut frames).unwrap()
    else {
        panic!("expected the top-level caller to return")
    };
    assert_eq!(
        microesnext::promises::settled_result(machine.arena(), promise),
        Ok(None)
    );
    assert!(microesnext::r#async::run_one_reaction(&mut machine, &mut queue).unwrap());
    assert_eq!(
        microesnext::promises::settled_result(machine.arena(), promise),
        Ok(None)
    );
    assert!(microesnext::r#async::run_one_reaction(&mut machine, &mut queue).unwrap());
    assert_eq!(
        microesnext::promises::settled_result(machine.arena(), promise),
        Ok(Some((
            microesnext::promises::Settlement::Fulfilled,
            Value::from_i30(42).unwrap(),
        )))
    );
}

#[test]
fn async_closure_can_capture_another_async_closure() {
    let code = compile_script(
        "async function inner() { return 42; } async function outer() { return inner; } return outer();",
    )
    .unwrap();
    let mut memory = [0; 256];
    let mut machine = Machine::with_root_capacity(&code, &mut memory, 16);
    let mut jobs: [Option<microesnext::promises::JobSlot>; 1] = [None; 1];
    let mut queue = microesnext::promises::JobQueue::new(&mut jobs);
    let mut frame_slots = [None; 1];
    let mut frames = microesnext::async_functions::Frames::new(&mut frame_slots);
    let microesnext::r#async::Progress::Complete(promise) =
        microesnext::r#async::run_functions(&mut machine, &mut queue, &mut frames).unwrap()
    else {
        panic!("expected the caller to return")
    };
    let Some((microesnext::promises::Settlement::Fulfilled, inner)) =
        microesnext::promises::settled_result(machine.arena(), promise).unwrap()
    else {
        panic!("expected a fulfilled promise")
    };
    assert!(microesnext::async_functions::is_async(
        machine.arena(),
        inner
    ));
}

#[test]
fn synchronous_throw_rejects_the_async_functions_outer_promise() {
    let code = compile_script("async function fail() { throw 42; } return fail();").unwrap();
    let mut memory = [0; 192];
    let mut machine = Machine::with_root_capacity(&code, &mut memory, 12);
    let mut jobs: [Option<microesnext::promises::JobSlot>; 1] = [None; 1];
    let mut queue = microesnext::promises::JobQueue::new(&mut jobs);
    let mut frame_slots = [None; 1];
    let mut frames = microesnext::async_functions::Frames::new(&mut frame_slots);
    let microesnext::r#async::Progress::Complete(promise) =
        microesnext::r#async::run_functions(&mut machine, &mut queue, &mut frames).unwrap()
    else {
        panic!("expected the caller to receive a rejected promise")
    };
    assert_eq!(
        microesnext::promises::settled_result(machine.arena(), promise),
        Ok(Some((
            microesnext::promises::Settlement::Rejected,
            Value::from_i30(42).unwrap(),
        )))
    );
}
