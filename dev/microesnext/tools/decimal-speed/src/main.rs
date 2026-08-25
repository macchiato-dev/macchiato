use std::hint::black_box;
use std::time::{Duration, Instant};

const COMMON: [&str; 8] = [
    "0",
    "1",
    "-42",
    "3.14159",
    ".125",
    "123456789.25",
    "6.02214076e20",
    "1e-20",
];
const FALLBACK: [&str; 8] = [
    "9007199254740993",
    "1.234567890123456789",
    "2.2250738585072014e-308",
    "1.7976931348623157e308",
    "5e-324",
    "1e-300",
    "123456789012345678901234567890e-20",
    "0.333333333333333333333333333333333333",
];
fn compact(corpus: &[&str], iterations: usize) -> Duration {
    let started = Instant::now();
    let mut bits = 0_u64;
    for index in 0..iterations {
        bits ^=
            microesnext_decimal_to_f64::parse(black_box(corpus[index % corpus.len()].as_bytes()))
                .unwrap()
                .to_bits();
    }
    black_box(bits);
    started.elapsed()
}

fn standard(corpus: &[&str], iterations: usize) -> Duration {
    let started = Instant::now();
    let mut bits = 0_u64;
    for index in 0..iterations {
        bits ^= black_box(corpus[index % corpus.len()])
            .parse::<f64>()
            .unwrap()
            .to_bits();
    }
    black_box(bits);
    started.elapsed()
}

fn report(name: &str, corpus: &[&str], iterations: usize) {
    // Warm both implementations before recording either one.
    black_box(compact(corpus, iterations / 10));
    black_box(standard(corpus, iterations / 10));
    let compact = compact(corpus, iterations);
    let standard = standard(corpus, iterations);
    println!(
        "{name}: compact={:.1}ns std={:.1}ns ratio={:.2}",
        compact.as_nanos() as f64 / iterations as f64,
        standard.as_nanos() as f64 / iterations as f64,
        compact.as_secs_f64() / standard.as_secs_f64()
    );
}

fn main() {
    report("common exact path", &COMMON, 5_000_000);
    report("correct-rounding fallback", &FALLBACK, 100_000);
}
