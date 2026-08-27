//! Translation of MicroQuickJS's regexp bytecode declarations.

pub const HEADER_LEN: usize = 4;
pub const HEADER_FLAGS: usize = 0;
pub const HEADER_CAPTURE_COUNT: usize = 2;
pub const HEADER_REGISTER_COUNT: usize = 3;

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct Flags(pub u16);

impl Flags {
    pub const GLOBAL: Self = Self(1 << 0);
    pub const IGNORE_CASE: Self = Self(1 << 1);
    pub const MULTILINE: Self = Self(1 << 2);
    pub const DOT_ALL: Self = Self(1 << 3);
    pub const UNICODE: Self = Self(1 << 4);
    pub const STICKY: Self = Self(1 << 5);

    pub const fn contains(self, other: Self) -> bool {
        self.0 & other.0 == other.0
    }
}

/// Opcode values and fixed sizes match `mquickjs_opcode.h` exactly.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u8)]
pub enum OpCode {
    Invalid,
    Char1,
    Char2,
    Char3,
    Char4,
    Dot,
    Any,
    Space,
    NotSpace,
    LineStart,
    LineStartMultiline,
    LineEnd,
    LineEndMultiline,
    GoTo,
    SplitGoToFirst,
    SplitNextFirst,
    Match,
    LookaheadMatch,
    NegativeLookaheadMatch,
    SaveStart,
    SaveEnd,
    SaveReset,
    Loop,
    LoopSplitGoToFirst,
    LoopSplitNextFirst,
    LoopCheckAdvanceSplitGoToFirst,
    LoopCheckAdvanceSplitNextFirst,
    SetI32,
    WordBoundary,
    NotWordBoundary,
    BackReference,
    BackReferenceIgnoreCase,
    Range8,
    Range,
    Lookahead,
    NegativeLookahead,
    SetCharPosition,
    CheckAdvance,
}

impl OpCode {
    pub const fn fixed_size(self) -> usize {
        match self {
            Self::Invalid | Self::Dot | Self::Any | Self::Space
            | Self::NotSpace | Self::LineStart | Self::LineStartMultiline
            | Self::LineEnd | Self::LineEndMultiline | Self::Match
            | Self::LookaheadMatch | Self::NegativeLookaheadMatch
            | Self::WordBoundary | Self::NotWordBoundary => 1,
            Self::Char1 | Self::SaveStart | Self::SaveEnd
            | Self::BackReference | Self::BackReferenceIgnoreCase
            | Self::Range8 | Self::SetCharPosition | Self::CheckAdvance => 2,
            Self::Char2 | Self::SaveReset | Self::Range => 3,
            Self::Char3 => 4,
            Self::Char4 | Self::GoTo | Self::SplitGoToFirst
            | Self::SplitNextFirst | Self::Lookahead
            | Self::NegativeLookahead => 5,
            Self::Loop | Self::SetI32 => 6,
            Self::LoopSplitGoToFirst | Self::LoopSplitNextFirst
            | Self::LoopCheckAdvanceSplitGoToFirst
            | Self::LoopCheckAdvanceSplitNextFirst => 10,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::OpCode;

    #[test]
    fn translated_opcode_sizes_match_reference_boundaries() {
        assert_eq!(OpCode::Char1.fixed_size(), 2);
        assert_eq!(OpCode::GoTo.fixed_size(), 5);
        assert_eq!(OpCode::Loop.fixed_size(), 6);
        assert_eq!(OpCode::LoopCheckAdvanceSplitNextFirst.fixed_size(), 10);
    }
}

