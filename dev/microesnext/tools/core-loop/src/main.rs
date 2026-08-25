use std::hint::black_box;
use std::time::Instant;

use microesnext::bytecode::Opcode;
use microesnext::{Core, CoreOutcome, Machine, Outcome};

const ADDITIONS: usize = 1_000;
const RUNS: usize = 10_000;

fn main() {
    let arguments: Vec<_> = std::env::args().skip(1).collect();
    if arguments.iter().any(|argument| argument == "--calls") {
        call_loop();
        return;
    }
    let machine = arguments.iter().any(|argument| argument == "--machine");
    let code = program();
    let started = Instant::now();
    for _ in 0..RUNS {
        let mut memory = [0; 64];
        if machine {
            let mut machine = Machine::new(black_box(&code), black_box(&mut memory));
            let value = match black_box(machine.run().unwrap()) {
                Outcome::Complete(value) => value,
                _ => unreachable!(),
            };
            assert_eq!(value.as_i30(), Some(ADDITIONS as i32));
        } else {
            let mut core = Core::new(black_box(&code), black_box(&mut memory), 0);
            let value = match black_box(core.run().unwrap()) {
                CoreOutcome::Complete(value) => value,
                _ => unreachable!(),
            };
            assert_eq!(value.as_i30(), Some(ADDITIONS as i32));
        }
    }
    let elapsed = started.elapsed();
    let instructions = RUNS * (ADDITIONS * 2 + 2);
    println!(
        "{} {} instructions in {:?}: {:.2} ns/instruction",
        if machine { "machine" } else { "core" },
        instructions,
        elapsed,
        elapsed.as_nanos() as f64 / instructions as f64,
    );
}

#[cfg(feature = "function-arguments")]
fn call_loop() {
    let code = call_program();
    let started = Instant::now();
    for _ in 0..RUNS {
        let mut memory = [0; 96];
        let mut machine = Machine::new(black_box(&code), black_box(&mut memory));
        let Outcome::Complete(value) = black_box(machine.run().unwrap()) else {
            unreachable!()
        };
        assert_eq!(value.as_i30(), Some(ADDITIONS as i32));
    }
    let elapsed = started.elapsed();
    let calls = RUNS * ADDITIONS;
    println!(
        "machine {calls} one-argument guest calls in {elapsed:?}: {:.2} ns/call",
        elapsed.as_nanos() as f64 / calls as f64,
    );
}

#[cfg(not(feature = "function-arguments"))]
fn call_loop() {
    panic!("--calls requires --features function-arguments");
}

#[cfg(feature = "function-arguments")]
fn call_program() -> Vec<u8> {
    let mut code = Vec::with_capacity(16 + ADDITIONS * 13);
    code.push(Opcode::InitLocals as u8);
    code.extend_from_slice(&1_u16.to_le_bytes());
    code.push(Opcode::Closure as u8);
    let target_patch = code.len();
    code.extend_from_slice(&0_u32.to_le_bytes());
    code.extend_from_slice(&0_u16.to_le_bytes());
    code.push(Opcode::StoreLocal as u8);
    code.extend_from_slice(&0_u16.to_le_bytes());
    code.push(Opcode::ConstI30 as u8);
    code.extend_from_slice(&0_i32.to_le_bytes());
    for _ in 0..ADDITIONS {
        code.push(Opcode::LoadLocal as u8);
        code.extend_from_slice(&0_u16.to_le_bytes());
        code.push(Opcode::ConstI30 as u8);
        code.extend_from_slice(&1_i32.to_le_bytes());
        code.push(Opcode::CallValueArguments as u8);
        code.extend_from_slice(&1_u16.to_le_bytes());
        code.push(Opcode::AddI30 as u8);
    }
    code.push(Opcode::ReturnLocals as u8);
    let target = u32::try_from(code.len()).unwrap();
    code[target_patch..target_patch + 4].copy_from_slice(&target.to_le_bytes());
    code.push(Opcode::InitFrame as u8);
    code.extend_from_slice(&1_u16.to_le_bytes());
    code.extend_from_slice(&1_u16.to_le_bytes());
    code.push(Opcode::LoadLocal as u8);
    code.extend_from_slice(&0_u16.to_le_bytes());
    code.push(Opcode::ReturnLocals as u8);
    code
}

fn program() -> Vec<u8> {
    let mut code = Vec::with_capacity(5 + ADDITIONS * 6 + 1);
    code.push(Opcode::ConstI30 as u8);
    code.extend_from_slice(&0_i32.to_le_bytes());
    for _ in 0..ADDITIONS {
        code.push(Opcode::ConstI30 as u8);
        code.extend_from_slice(&1_i32.to_le_bytes());
        code.push(Opcode::AddI30 as u8);
    }
    code.push(Opcode::Return as u8);
    code
}
