use std::hint::black_box;
use std::time::Instant;

use microesnext::{Machine, Outcome};
use microesnext_compiler::Builder;

const ADDITIONS: usize = 1_000;
const RUNS: usize = 10_000;

fn main() {
    let mut builder = Builder::new().const_i30(0);
    for _ in 0..ADDITIONS {
        builder = builder
            .const_i30(1)
            .op(microesnext::bytecode::Opcode::AddI30);
    }
    let code = builder.op(microesnext::bytecode::Opcode::Return).finish();
    let started = Instant::now();
    for _ in 0..RUNS {
        let mut memory = [0; 64];
        let mut machine = Machine::new(black_box(&code), black_box(&mut memory));
        #[allow(unreachable_patterns)]
        let value = match black_box(machine.run().unwrap()) {
            Outcome::Complete(value) => value,
            _ => unreachable!(),
        };
        assert_eq!(value.as_i30(), Some(ADDITIONS as i32));
    }
    let elapsed = started.elapsed();
    let instructions = RUNS * (ADDITIONS * 2 + 2);
    println!(
        "{} instructions in {:?}: {:.2} ns/instruction",
        instructions,
        elapsed,
        elapsed.as_nanos() as f64 / instructions as f64,
    );
}
