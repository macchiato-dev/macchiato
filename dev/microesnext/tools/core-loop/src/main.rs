use std::hint::black_box;
use std::time::Instant;

use microesnext::bytecode::Opcode;
use microesnext::{Core, CoreOutcome, Machine, Outcome};

const ADDITIONS: usize = 1_000;
const RUNS: usize = 10_000;

fn main() {
    let machine = std::env::args()
        .skip(1)
        .any(|argument| argument == "--machine");
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
