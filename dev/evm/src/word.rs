use core::cmp::Ordering;

/// An EVM word stored as four little-endian limbs.
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
#[repr(C)]
pub struct Word(pub [u64; 4]);

impl Word {
    pub const ZERO: Self = Self([0; 4]);
    pub const ONE: Self = Self([1, 0, 0, 0]);
    pub const MAX: Self = Self([u64::MAX; 4]);

    pub const fn from_u64(value: u64) -> Self {
        Self([value, 0, 0, 0])
    }

    pub fn from_be_slice(bytes: &[u8]) -> Self {
        let mut result = Self::ZERO;
        let start = bytes.len().saturating_sub(32);
        for &byte in &bytes[start..] {
            result = result.shl(8);
            result.0[0] |= byte as u64;
        }
        result
    }

    pub fn write_be(self, output: &mut [u8; 32]) {
        for (index, byte) in output.iter_mut().enumerate() {
            let bit = (31 - index) * 8;
            *byte = (self.0[bit / 64] >> (bit % 64)) as u8;
        }
    }

    pub const fn is_zero(self) -> bool {
        self.0[0] == 0 && self.0[1] == 0 && self.0[2] == 0 && self.0[3] == 0
    }

    pub const fn low_u64(self) -> u64 { self.0[0] }
    pub const fn sign(self) -> bool { self.0[3] >> 63 != 0 }

    pub fn overflowing_add(self, other: Self) -> (Self, bool) {
        let mut out = [0; 4];
        let mut carry = false;
        for (index, slot) in out.iter_mut().enumerate() {
            let (first, a) = self.0[index].overflowing_add(other.0[index]);
            let (second, b) = first.overflowing_add(carry as u64);
            *slot = second;
            carry = a || b;
        }
        (Self(out), carry)
    }

    pub fn overflowing_sub(self, other: Self) -> (Self, bool) {
        let mut out = [0; 4];
        let mut borrow = false;
        for (index, slot) in out.iter_mut().enumerate() {
            let (first, a) = self.0[index].overflowing_sub(other.0[index]);
            let (second, b) = first.overflowing_sub(borrow as u64);
            *slot = second;
            borrow = a || b;
        }
        (Self(out), borrow)
    }

    pub fn wrapping_add(self, other: Self) -> Self { self.overflowing_add(other).0 }
    pub fn wrapping_sub(self, other: Self) -> Self { self.overflowing_sub(other).0 }
    pub fn wrapping_neg(self) -> Self { (!self).wrapping_add(Self::ONE) }

    pub fn wrapping_mul(self, other: Self) -> Self {
        let mut out = [0u64; 4];
        for left in 0..4 {
            let mut carry = 0u128;
            for right in 0..(4 - left) {
                let at = left + right;
                let value = self.0[left] as u128 * other.0[right] as u128
                    + out[at] as u128 + carry;
                out[at] = value as u64;
                carry = value >> 64;
            }
        }
        Self(out)
    }

    pub fn bit(self, index: usize) -> bool {
        index < 256 && (self.0[index / 64] >> (index % 64)) & 1 != 0
    }

    pub fn set_bit(&mut self, index: usize) {
        if index < 256 { self.0[index / 64] |= 1 << (index % 64); }
    }

    pub fn shl(self, amount: usize) -> Self {
        if amount >= 256 { return Self::ZERO; }
        let limbs = amount / 64;
        let bits = amount % 64;
        let mut out = [0; 4];
        for index in limbs..4 {
            out[index] = self.0[index - limbs] << bits;
            if bits != 0 && index > limbs {
                out[index] |= self.0[index - limbs - 1] >> (64 - bits);
            }
        }
        Self(out)
    }

    pub fn shr(self, amount: usize) -> Self {
        if amount >= 256 { return Self::ZERO; }
        let limbs = amount / 64;
        let bits = amount % 64;
        let mut out = [0; 4];
        for index in 0..(4 - limbs) {
            out[index] = self.0[index + limbs] >> bits;
            if bits != 0 && index + limbs + 1 < 4 {
                out[index] |= self.0[index + limbs + 1] << (64 - bits);
            }
        }
        Self(out)
    }

    pub fn sar(self, amount: usize) -> Self {
        if !self.sign() { return self.shr(amount); }
        if amount >= 256 { return Self::MAX; }
        let mut result = self.shr(amount);
        for bit in (256 - amount)..256 { result.set_bit(bit); }
        result
    }

    pub fn div_mod(self, divisor: Self) -> (Self, Self) {
        if divisor.is_zero() { return (Self::ZERO, self); }
        let mut quotient = Self::ZERO;
        let mut remainder = Self::ZERO;
        for bit in (0..256).rev() {
            remainder = remainder.shl(1);
            if self.bit(bit) { remainder.0[0] |= 1; }
            if remainder >= divisor {
                remainder = remainder.wrapping_sub(divisor);
                quotient.set_bit(bit);
            }
        }
        (quotient, remainder)
    }

    pub fn signed_cmp(self, other: Self) -> Ordering {
        match (self.sign(), other.sign()) {
            (true, false) => Ordering::Less,
            (false, true) => Ordering::Greater,
            _ => self.cmp(&other),
        }
    }
}

impl Ord for Word {
    fn cmp(&self, other: &Self) -> Ordering {
        for index in (0..4).rev() {
            match self.0[index].cmp(&other.0[index]) {
                Ordering::Equal => {}
                ordering => return ordering,
            }
        }
        Ordering::Equal
    }
}

impl PartialOrd for Word {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> { Some(self.cmp(other)) }
}

impl core::ops::Not for Word {
    type Output = Self;
    fn not(self) -> Self { Self(self.0.map(|limb| !limb)) }
}

impl core::ops::BitAnd for Word {
    type Output = Self;
    fn bitand(self, rhs: Self) -> Self {
        Self(core::array::from_fn(|index| self.0[index] & rhs.0[index]))
    }
}

impl core::ops::BitOr for Word {
    type Output = Self;
    fn bitor(self, rhs: Self) -> Self {
        Self(core::array::from_fn(|index| self.0[index] | rhs.0[index]))
    }
}

impl core::ops::BitXor for Word {
    type Output = Self;
    fn bitxor(self, rhs: Self) -> Self {
        Self(core::array::from_fn(|index| self.0[index] ^ rhs.0[index]))
    }
}

#[cfg(test)]
mod tests {
    use super::Word;

    #[test]
    fn arithmetic_wraps_at_256_bits() {
        assert_eq!(Word::MAX.wrapping_add(Word::ONE), Word::ZERO);
        assert_eq!(Word::ZERO.wrapping_sub(Word::ONE), Word::MAX);
        assert_eq!(Word::from_u64(9).div_mod(Word::from_u64(4)),
            (Word::from_u64(2), Word::from_u64(1)));
    }

    #[test]
    fn big_endian_round_trip() {
        let input = [0xabu8; 32];
        let word = Word::from_be_slice(&input);
        let mut output = [0; 32];
        word.write_be(&mut output);
        assert_eq!(input, output);
    }
}
