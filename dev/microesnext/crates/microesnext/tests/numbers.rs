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
