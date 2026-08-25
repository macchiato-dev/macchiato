use microesnext::{Machine, Outcome};
use microesnext_bytecode::Opcode;
use microesnext_compiler::{Builder, compile_script};

#[test]
fn source_fractional_addition_uses_optional_numbers() {
    let code = compile_script("return 1.25 + 2;").unwrap();
    let mut memory = [0; 48];
    let mut machine = Machine::new(&code, &mut memory);
    let Outcome::Complete(value) = machine.run().unwrap() else {
        panic!("expected number completion")
    };
    assert_eq!(microesnext::numbers::get(machine.arena(), value), Ok(3.25));
}

#[test]
fn number_bytecode_promotes_arithmetic_and_compares_it() {
    let code = Builder::new()
        .const_i30((1 << 29) - 1)
        .const_i30(2)
        .op(Opcode::MultiplyNumber)
        .const_f64((1_u64 << 30) as f64)
        .op(Opcode::LessThanNumber)
        .op(Opcode::Return)
        .finish();
    let mut memory = [0; 64];
    let mut machine = Machine::new(&code, &mut memory);
    assert_eq!(
        machine.run(),
        Ok(Outcome::Complete(microesnext::Value::TRUE))
    );
}

#[test]
fn source_arithmetic_promotes_past_i30() {
    for (source, expected) in [
        ("return 536870911 + 1;", 536_870_912.0),
        ("let value = 536870911; return value * 2;", 1_073_741_822.0),
        ("let value = -536870912; return value - 1;", -536_870_913.0),
    ] {
        let code = compile_script(source).unwrap();
        let mut memory = [0; 64];
        let mut machine = Machine::new(&code, &mut memory);
        let Outcome::Complete(value) = machine.run().unwrap() else {
            panic!("expected number completion")
        };
        assert_eq!(
            microesnext::numbers::get(machine.arena(), value),
            Ok(expected)
        );
    }
}

#[test]
fn source_negation_preserves_fast_integers_and_negative_zero() {
    let code = compile_script("let value = 42; return - value;").unwrap();
    let mut memory = [0; 48];
    let mut machine = Machine::new(&code, &mut memory);
    assert_eq!(
        machine.run(),
        Ok(Outcome::Complete(
            microesnext::Value::from_i30(-42).unwrap()
        ))
    );

    for source in ["return -0;", "return - 0;"] {
        let code = compile_script(source).unwrap();
        let mut machine = Machine::new(&code, &mut memory);
        let Outcome::Complete(value) = machine.run().unwrap() else {
            panic!("expected number completion")
        };
        let value = microesnext::numbers::get(machine.arena(), value).unwrap();
        assert_eq!(value, 0.0);
        assert!(value.is_sign_negative());
    }
}
