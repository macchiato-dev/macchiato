use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

#[test]
fn source_compiles_suspends_and_resumes() {
    let code = compile_script("return 40 + await 2;").unwrap();
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
    assert_eq!(
        machine
            .resume(continuation, Value::from_i30(2).unwrap())
            .unwrap(),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn source_throw_is_a_guest_rejection_not_an_engine_error() {
    let code = microesnext_compiler::compile_script("throw 17;").unwrap();
    let mut memory = [0; 32];
    let mut machine = microesnext::Machine::new(&code, &mut memory);
    assert_eq!(
        machine.run().unwrap(),
        microesnext::Outcome::Throw(microesnext::Value::from_i30(17).unwrap())
    );
}

#[test]
fn source_throw_reaches_its_catch_binding() {
    let code = compile_script("try { throw 17; } catch (error) { return error; }").unwrap();
    let mut memory = [0; 48];
    let mut machine = Machine::new(&code, &mut memory);
    assert_eq!(
        machine.run().unwrap(),
        Outcome::Complete(Value::from_i30(17).unwrap())
    );
}

#[test]
fn source_catch_can_transform_or_ignore_its_reason() {
    for (source, expected) in [
        ("try { throw 17; } catch (error) { return error + 1; }", 18),
        ("try { throw 17; } catch { return 42; }", 42),
    ] {
        let code = compile_script(source).unwrap();
        let mut memory = [0; 48];
        let mut machine = Machine::new(&code, &mut memory);
        assert_eq!(
            machine.run().unwrap(),
            Outcome::Complete(Value::from_i30(expected).unwrap())
        );
    }
}

#[test]
fn rejected_source_await_reaches_the_same_catch_path() {
    let code = compile_script("try { return await 2; } catch (error) { return error; }").unwrap();
    let mut memory = [0; 64];
    let mut machine = Machine::with_root_capacity(&code, &mut memory, 2);
    let Outcome::Await { continuation, .. } = machine.run().unwrap() else {
        panic!("expected suspension")
    };
    let reason = Value::from_i30(29).unwrap();
    assert_eq!(
        machine.resume_rejected(continuation, reason).unwrap(),
        Outcome::Complete(reason)
    );
}

#[test]
fn fulfilled_source_await_removes_its_handler_normally() {
    let code = compile_script("try { return await 2; } catch { return 17; }").unwrap();
    let mut memory = [0; 64];
    let mut machine = Machine::with_root_capacity(&code, &mut memory, 2);
    let Outcome::Await { continuation, .. } = machine.run().unwrap() else {
        panic!("expected suspension")
    };
    let value = Value::from_i30(42).unwrap();
    assert_eq!(
        machine.resume(continuation, value).unwrap(),
        Outcome::Complete(value)
    );
}
