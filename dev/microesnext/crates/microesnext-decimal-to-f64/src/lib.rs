#![no_std]

// Independent Rust implementation of Nigel Tao's Simple Decimal Conversion.
// Rust core's Apache-2.0/MIT `dec2flt` slow path and the article at
// nigeltao.github.io/blog/2020/parse-number-f64-simple.html informed the
// representation and normalization bounds.

const MAX_DIGITS: usize = 768;
const MAX_SHIFT: usize = 60;
const MAX_SHIFT_DIGITS: usize = 19;

struct Decimal {
    digits: [u8; MAX_DIGITS],
    len: usize,
    point: i32,
    truncated: bool,
}

impl Decimal {
    fn parse(mut source: &[u8]) -> Option<(Self, bool)> {
        let negative = match source.first() {
            Some(b'+') => {
                source = &source[1..];
                false
            }
            Some(b'-') => {
                source = &source[1..];
                true
            }
            _ => false,
        };
        let mut digits = [0; MAX_DIGITS];
        let mut len = 0;
        let mut significant_len = 0;
        let mut integer_digits = 0_i32;
        let mut leading_zeros = 0_i32;
        let mut seen_nonzero = false;
        let mut seen_dot = false;
        let mut index = 0;
        while let Some(&byte) = source.get(index) {
            match byte {
                b'0'..=b'9' => {
                    if !seen_dot {
                        integer_digits = integer_digits.saturating_add(1);
                    }
                    let digit = byte - b'0';
                    if !seen_nonzero && digit == 0 {
                        leading_zeros = leading_zeros.saturating_add(1);
                    } else {
                        seen_nonzero = true;
                        if len < MAX_DIGITS {
                            digits[len] = digit;
                            len += 1;
                        }
                        significant_len += 1;
                    }
                    index += 1;
                }
                b'.' if !seen_dot => {
                    seen_dot = true;
                    index += 1;
                }
                _ => break,
            }
        }
        if index == 0 || (index == 1 && seen_dot) {
            return None;
        }
        let mut exponent = 0_i32;
        if matches!(source.get(index), Some(b'e' | b'E')) {
            index += 1;
            let exponent_negative = match source.get(index) {
                Some(b'+') => {
                    index += 1;
                    false
                }
                Some(b'-') => {
                    index += 1;
                    true
                }
                _ => false,
            };
            let start = index;
            while let Some(digit @ b'0'..=b'9') = source.get(index).copied() {
                exponent = exponent
                    .saturating_mul(10)
                    .saturating_add((digit - b'0') as i32)
                    .min(10_000);
                index += 1;
            }
            if index == start {
                return None;
            }
            if exponent_negative {
                exponent = -exponent;
            }
        }
        if index != source.len() {
            return None;
        }
        let mut decimal = Self {
            digits,
            len,
            point: integer_digits - leading_zeros + exponent,
            truncated: significant_len > MAX_DIGITS,
        };
        decimal.trim();
        Some((decimal, negative))
    }

    fn trim(&mut self) {
        while self.len != 0 && self.digits[self.len - 1] == 0 {
            self.len -= 1;
        }
    }

    fn left_shift(&mut self, shift: usize) {
        if self.len == 0 {
            return;
        }
        let old_len = self.len;
        let mut shifted = [0; MAX_DIGITS + MAX_SHIFT_DIGITS];
        let mut write = shifted.len();
        let mut carry = 0_u64;
        for digit in self.digits[..self.len].iter().rev().copied() {
            carry += (digit as u64) << shift;
            write -= 1;
            shifted[write] = (carry % 10) as u8;
            carry /= 10;
        }
        while carry != 0 {
            write -= 1;
            shifted[write] = (carry % 10) as u8;
            carry /= 10;
        }
        let produced = shifted.len() - write;
        self.point += produced as i32 - old_len as i32;
        self.len = produced.min(MAX_DIGITS);
        self.digits[..self.len].copy_from_slice(&shifted[write..write + self.len]);
        self.truncated |= shifted[write + self.len..].iter().any(|digit| *digit != 0);
        self.trim();
    }

    fn right_shift(&mut self, shift: usize) {
        let mut read = 0;
        let mut write = 0;
        let mut value = 0_u64;
        while value >> shift == 0 {
            if read < self.len {
                value = 10 * value + self.digits[read] as u64;
                read += 1;
            } else if value == 0 {
                return;
            } else {
                while value >> shift == 0 {
                    value *= 10;
                    read += 1;
                }
                break;
            }
        }
        self.point -= read as i32 - 1;
        let mask = (1_u64 << shift) - 1;
        while read < self.len {
            self.digits[write] = (value >> shift) as u8;
            write += 1;
            value = 10 * (value & mask) + self.digits[read] as u64;
            read += 1;
        }
        while value != 0 {
            let digit = (value >> shift) as u8;
            value = 10 * (value & mask);
            if write < MAX_DIGITS {
                self.digits[write] = digit;
                write += 1;
            } else if digit != 0 {
                self.truncated = true;
            }
        }
        self.len = write;
        self.trim();
    }

    fn rounded_integer(&self) -> u64 {
        if self.len == 0 || self.point < 0 {
            return 0;
        }
        if self.point >= 19 {
            return u64::MAX;
        }
        let point = self.point as usize;
        let mut value = 0_u64;
        for index in 0..point {
            value = value * 10 + self.digits.get(index).copied().unwrap_or(0) as u64;
        }
        if point >= self.len {
            return value;
        }
        let round = self.digits[point];
        let tie = round == 5 && point + 1 == self.len && !self.truncated;
        if round > 5 || (round == 5 && (!tie || value & 1 != 0)) {
            value += 1;
        }
        value
    }

    fn into_f64(mut self, negative: bool) -> f64 {
        let sign = u64::from(negative) << 63;
        if self.len == 0 || self.point < -324 {
            return f64::from_bits(sign);
        }
        if self.point >= 310 {
            return f64::from_bits(sign | (0x7ff << 52));
        }
        let mut exponent = 0_i32;
        while self.point > 0 {
            let shift = shift_for(self.point as usize);
            self.right_shift(shift);
            exponent += shift as i32;
        }
        while self.point <= 0 {
            let shift = if self.point == 0 {
                match self.digits[0] {
                    5..=9 => break,
                    0 | 1 => 2,
                    _ => 1,
                }
            } else {
                shift_for((-self.point) as usize)
            };
            self.left_shift(shift);
            exponent -= shift as i32;
        }
        exponent -= 1;
        while exponent < -1022 {
            let shift = (-1022 - exponent).min(MAX_SHIFT as i32) as usize;
            self.right_shift(shift);
            exponent += shift as i32;
        }
        if exponent + 1023 >= 2047 {
            return f64::from_bits(sign | (0x7ff << 52));
        }
        self.left_shift(53);
        let mut mantissa = self.rounded_integer();
        if mantissa >= 1_u64 << 53 {
            self.right_shift(1);
            exponent += 1;
            mantissa = self.rounded_integer();
            if exponent + 1023 >= 2047 {
                return f64::from_bits(sign | (0x7ff << 52));
            }
        }
        let mut biased = exponent + 1023;
        if mantissa < 1_u64 << 52 {
            biased -= 1;
        }
        let fraction = mantissa & ((1_u64 << 52) - 1);
        f64::from_bits(sign | ((biased.max(0) as u64) << 52) | fraction)
    }
}

fn shift_for(decimal_places: usize) -> usize {
    const SHIFTS: [u8; 19] = [
        0, 3, 6, 9, 13, 16, 19, 23, 26, 29, 33, 36, 39, 43, 46, 49, 53, 56, 59,
    ];
    SHIFTS
        .get(decimal_places)
        .copied()
        .unwrap_or(MAX_SHIFT as u8) as usize
}

pub fn parse(source: &[u8]) -> Option<f64> {
    let (decimal, negative) = Decimal::parse(source)?;
    Some(decimal.into_f64(negative))
}

#[cfg(test)]
mod tests {
    extern crate std;

    use super::parse;
    use std::format;

    #[test]
    fn matches_hard_boundaries() {
        for source in [
            "0",
            "-0",
            ".5",
            "1.",
            "1e309",
            "1e-400",
            "5e-324",
            "2.2250738585072014e-308",
            "1.7976931348623157e308",
            "9007199254740993",
            "16777217.000000001",
        ] {
            let expected = source.parse::<f64>().unwrap();
            assert_eq!(
                parse(source.as_bytes()).unwrap().to_bits(),
                expected.to_bits(),
                "{source}"
            );
        }
    }

    #[test]
    fn matches_generated_decimal_inputs() {
        let mut state = 0x243f_6a88_85a3_08d3_u64;
        for _ in 0..20_000 {
            state ^= state << 13;
            state ^= state >> 7;
            state ^= state << 17;
            let mantissa = state % 10_000_000_000_000_000_000_u64;
            let exponent = ((state >> 32) % 700) as i32 - 350;
            let source = format!("{mantissa}e{exponent}");
            let expected = source.parse::<f64>().unwrap();
            assert_eq!(
                parse(source.as_bytes()).unwrap().to_bits(),
                expected.to_bits(),
                "{source}"
            );

            state ^= state << 13;
            state ^= state >> 7;
            state ^= state << 17;
            let fraction = state % 1_000_000_000_000_000_000;
            let sign = if state & 1 == 0 { "" } else { "-" };
            let source = format!("{sign}{mantissa}.{fraction:018}e{exponent}");
            let expected = source.parse::<f64>().unwrap();
            assert_eq!(
                parse(source.as_bytes()).unwrap().to_bits(),
                expected.to_bits(),
                "{source}"
            );
        }
    }

    #[test]
    fn retains_the_significant_end_of_very_long_inputs() {
        for source in [
            format!("{}e-800", "1".repeat(800)),
            format!("1{}5e-800", "0".repeat(799)),
            format!("0.{}1", "0".repeat(767)),
        ] {
            let expected = source.parse::<f64>().unwrap();
            assert_eq!(
                parse(source.as_bytes()).unwrap().to_bits(),
                expected.to_bits(),
                "{} bytes",
                source.len()
            );
        }
    }

    #[test]
    fn round_trips_generated_finite_f64_values() {
        let mut state = 0x1319_8a2e_0370_7344_u64;
        for _ in 0..100_000 {
            state ^= state << 13;
            state ^= state >> 7;
            state ^= state << 17;
            let value = f64::from_bits(state);
            if !value.is_finite() {
                continue;
            }
            let source = format!("{value}");
            assert_eq!(
                parse(source.as_bytes()).unwrap().to_bits(),
                value.to_bits(),
                "{source}"
            );
        }
    }
}
