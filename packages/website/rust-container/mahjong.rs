#![no_std]
// Port of the existing Mahjong example. Coordinates use half-tile units so
// the turtle's offset edges and centered cap are exact without allocation.
#[path = "guest-api.rs"] mod dom;
use core::fmt::{self, Write};

#[derive(Clone, Copy)]
struct Tile { x: i16, y: i16, z: i16, kind: u8, removed: bool, node: u32, image: u32 }
const TILE: Tile = Tile { x: 0, y: 0, z: 0, kind: 0, removed: false, node: 0, image: 0 };
struct Game {
    tiles: [Tile; 144], history: [(usize, usize); 72], count: usize,
    selected: Option<usize>, seed: u32, moves: u32, undos: u32, seconds: u32,
    second: Option<usize>, pending: u8, win_ticks: u8,
    clock: f64, started: f64,
    sprite: u32, bonus: u32, win: u32, stats: u32, undo: u32, hint: u32, status: u32,
    menu: u32, dismiss: u32, name: u32, options: [bool; 5], switches: [u32; 5],
    knobs: [u32; 5],
}
static mut GAME: Game = Game {
    tiles: [TILE; 144], history: [(0,0); 72], count: 0, selected: None,
    seed: 1, moves: 0, undos: 0, seconds: 0, sprite: 0, bonus: 0, win: 0, stats: 0,
    undo: 0, hint: 0, status: 0, menu: 0, dismiss: 0, name: 0,
    second: None, pending: 0, win_ticks: 0, clock: 0.0, started: 0.0,
    options: [false; 5], switches: [0; 5], knobs: [0; 5],
};
#[panic_handler]
fn panic(_: &core::panic::PanicInfo) -> ! { core::arch::wasm32::unreachable() }

struct Text { bytes: [u8; 128], len: usize }
impl Text {
    fn new() -> Self { Self { bytes: [0; 128], len: 0 } }
    fn str(&self) -> &str { core::str::from_utf8(&self.bytes[..self.len]).unwrap() }
}
impl Write for Text {
    fn write_str(&mut self, value: &str) -> fmt::Result {
        let end = self.len + value.len();
        if end > self.bytes.len() { return Err(fmt::Error); }
        self.bytes[self.len..end].copy_from_slice(value.as_bytes());
        self.len = end;
        Ok(())
    }
}

// Property numbers belong to the small DOM ABI, not arbitrary property names.
const WIDTH: u32 = 0; const HEIGHT: u32 = 1; const MAX_WIDTH: u32 = 2;
const MIN_HEIGHT: u32 = 3; const MARGIN: u32 = 4; const PADDING: u32 = 5;
const LEFT: u32 = 6; const TOP: u32 = 7; const RIGHT: u32 = 8;
const BOTTOM: u32 = 9; const GAP: u32 = 10; const RADIUS: u32 = 11;
const FONT_SIZE: u32 = 12; const Z: u32 = 13; const OPACITY: u32 = 14;
const DISPLAY: u32 = 15; const POSITION: u32 = 16; const ALIGN: u32 = 17;
const JUSTIFY: u32 = 18; const WRAP: u32 = 20; const OVERFLOW: u32 = 21;
const CURSOR: u32 = 22; const BOX: u32 = 23; const FONT: u32 = 24;
const WEIGHT: u32 = 25; const TEXT_ALIGN: u32 = 26; const OBJECT_FIT: u32 = 27;
const CONTAINER: u32 = 28; const COLOR: u32 = 29; const BACKGROUND: u32 = 30;
const BORDER_COLOR: u32 = 31; const BORDER_WIDTH: u32 = 32;
const BORDER_STYLE: u32 = 33; const POINTER: u32 = 34; const MARGIN_BOTTOM: u32 = 36;
const GOLD: u32 = 0xefc76fff; const INK: u32 = 0xf7f0dfff;
fn px(id: u32, prop: u32, value: i32) { dom::number(id, prop, value * 1000, 1); }
fn percent(id: u32, prop: u32, value: i32) { dom::number(id, prop, value * 1000, 2); }
fn scalar(id: u32, prop: u32, value: i32) { dom::number(id, prop, value * 1000, 0); }
fn board(id: u32, prop: u32, pixel_milli: i32) {
    dom::number(id, prop, pixel_milli * 100 / 760, 3);
}
fn element(parent: u32, tag: u32) -> u32 {
    let id = dom::node(parent, tag);
    dom::keyword(id, BOX, 13); // border-box
    id
}
fn button(parent: u32, label: &str, token: u32) -> u32 {
    let id = element(parent, 4);
    dom::text(id, label); dom::click(id, token);
    px(id, PADDING, 8); px(id, RADIUS, 7); px(id, FONT_SIZE, 13);
    px(id, BORDER_WIDTH, 1); dom::keyword(id, BORDER_STYLE, 24);
    dom::color(id, BORDER_COLOR, 0x8db7abff);
    dom::color(id, BACKGROUND, 0x205c4eff); dom::color(id, COLOR, INK);
    dom::keyword(id, CURSOR, 12);
    return id;
}

impl Game {
    fn random(&mut self) -> u32 {
        self.seed ^= self.seed << 13;
        self.seed ^= self.seed >> 17;
        self.seed ^= self.seed << 5;
        self.seed
    }
    fn positions(&mut self) {
        let mut at = 0;
        for (y, (width, x)) in [(12,2),(8,6),(10,4),(14,0),(13,1),(10,4),(8,6),(12,2)]
            .iter().enumerate() {
            for column in 0..*width {
                self.tiles[at].x = x + column * 2;
                self.tiles[at].y = y as i16 * 2;
                at += 1;
            }
        }
        for (z, width, x, y) in [(1,6,8,2),(2,4,10,4),(3,2,12,6)] {
            for row in 0..width { for column in 0..width {
                self.tiles[at].x = x + column * 2;
                self.tiles[at].y = y + row * 2;
                self.tiles[at].z = z;
                at += 1;
            } }
        }
        self.tiles[143].x = 13; self.tiles[143].y = 7; self.tiles[143].z = 4;
    }
    fn reset(&mut self) {
        // 34 regular types × 4 tiles, four flowers and four seasons = 144.
        let mut deck = [0u8; 144];
        for (i, kind) in deck.iter_mut().enumerate() {
            *kind = if i < 136 { (i / 4) as u8 } else { (i - 102) as u8 };
        }
        // Shuffle individual tiles, not predetermined pairs. No stored answer
        // constrains the deal, and a random deal is not guaranteed solvable.
        for i in (1..deck.len()).rev() {
            let j = self.random() as usize % (i + 1);
            deck.swap(i, j);
        }
        for (tile, kind) in self.tiles.iter_mut().zip(deck) {
            tile.kind = kind;
            tile.removed = false;
        }
        self.selected = None; self.second = None; self.pending = 0;
        self.count = 0; self.moves = 0; self.undos = 0; self.seconds = 0;
        self.started = self.clock; self.win_ticks = 0;
        dom::transition(self.win, OPACITY, 0, 0, 0);
        scalar(self.win, OPACITY, 0); dom::text(self.name, "");
        self.paint();
    }
    fn free(&self, index: usize) -> bool {
        let tile = self.tiles[index];
        if tile.removed { return false; }
        let (mut left, mut right) = (false, false);
        for (i, other) in self.tiles.iter().enumerate() {
            if i == index || other.removed { continue; }
            let dx = other.x - tile.x; let dy = other.y - tile.y;
            if other.z > tile.z && dx.abs() < 2 && dy.abs() < 2 { return false; }
            if other.z == tile.z && dy == 0 {
                if dx < 0 && dx >= -2 { left = true; }
                if dx > 0 && dx <= 2 { right = true; }
            }
        }
        !left || !right
    }
    fn matches(&self, a: usize, b: usize) -> bool {
        fn group(kind: u8) -> u8 { if kind < 34 { kind } else if kind < 38 { 34 } else { 35 } }
        group(self.tiles[a].kind) == group(self.tiles[b].kind)
    }
    fn pair(&self) -> Option<(usize, usize)> {
        for a in 0..144 { if self.free(a) {
            for b in a+1..144 { if self.free(b) && self.matches(a,b) { return Some((a,b)); } }
        } }
        None
    }
    fn choose(&mut self, index: usize) {
        if self.pending != 0 || !self.free(index) { return; }
        if let Some(a) = self.selected {
            if a != index && self.matches(a,index) {
                self.tiles[a].removed = true; self.tiles[index].removed = true;
                self.history[self.count] = (a,index); self.count += 1; self.moves += 1;
                self.second = Some(index); self.pending = 6;
            } else if a != index {
                self.second = Some(index); self.pending = 4;
            } else {
                self.selected = None;
            }
        } else { self.selected = Some(index); }
        self.paint();
    }
    fn tile_name(kind: u8) -> Text {
        let mut name = Text::new();
        if kind < 27 {
            write!(name, "{} {}", kind % 9 + 1,
                ["characters", "dots", "bamboo"][(kind / 9) as usize]).unwrap();
        } else {
            name.write_str(match kind {
                27 => "East wind", 28 => "South wind", 29 => "West wind", 30 => "North wind",
                31 => "Red dragon", 32 => "White dragon", 33 => "Green dragon",
                34..=37 => "Flower", _ => "Season",
            }).unwrap();
        }
        name
    }
    fn paint(&self) {
        for (i, tile) in self.tiles.iter().enumerate() {
            let selected = self.selected == Some(i) || self.second == Some(i);
            dom::hidden(tile.node, tile.removed && !(selected && self.pending != 0));
            scalar(tile.node, OPACITY, if tile.removed { 0 } else { 1 });
            dom::color(tile.node, BACKGROUND, if selected { 0x918571ff } else { 0xe8d9bdff });
            dom::number(tile.image, OPACITY, if selected { 550 } else { 1000 }, 0);
            dom::attr(tile.node, 0, Self::tile_name(tile.kind).str());
            if tile.kind < 34 {
                dom::image(tile.image, self.sprite);
                board(tile.image, WIDTH, 2048 * 435);
                board(tile.image, HEIGHT, 654 * 435);
                let (column, row) = if tile.kind < 27 { (tile.kind % 9, tile.kind / 9) } else { (tile.kind - 27, 3) };
                board(tile.image, LEFT, -((column as i32 * 204800 + 47000) * 435 / 1000));
                board(tile.image, TOP, -((row as i32 * 163500 + 7000) * 435 / 1000));
            } else {
                // Eight rasterized 150×200 source SVGs, in a single row.
                dom::image(tile.image, self.bonus);
                board(tile.image, WIDTH, 400000); board(tile.image, HEIGHT, 66000);
                board(tile.image, LEFT, -((tile.kind - 34) as i32 * 50000));
                board(tile.image, TOP, 0);
            }
        }
        self.paint_stats();
        dom::hidden(self.undo, !self.options[1]); dom::hidden(self.hint, !self.options[4]);
        let won = self.tiles.iter().all(|tile| tile.removed);
        dom::text(self.status, if self.options[3] && !won && self.pair().is_none() { "No moves remain." } else { "" });
        if self.options[0] {
            dom::text(self.name, self.selected.map(|i| Self::tile_name(self.tiles[i].kind))
                .as_ref().map_or("", |name| name.str()));
        } else { dom::text(self.name, ""); }
    }
    fn paint_stats(&self) {
        let mut value = Text::new();
        write!(value, "{}:{:02} · {} {}", self.seconds / 60, self.seconds % 60,
            self.moves, if self.moves == 1 { "move" } else { "moves" }).unwrap();
        if self.options[1] { write!(value, " · {} {}", self.undos,
            if self.undos == 1 { "undo" } else { "undos" }).unwrap(); }
        dom::text(self.stats, value.str());
        dom::hidden(self.stats, !self.options[2]);
    }
    fn tick(&mut self, now: f64) {
        if !now.is_finite() || now < self.clock { return; }
        if self.clock == 0.0 { self.started = now; }
        self.clock = now;
        if self.count < 72 {
            // Clock time, not timer counts: background throttling must not
            // make the optional elapsed-time display lose whole seconds.
            let seconds = ((now - self.started) / 1000.0) as u32;
            if seconds != self.seconds {
                self.seconds = seconds;
                if self.options[2] { self.paint_stats(); }
            }
        } else if self.win_ticks < 30 {
            self.win_ticks += 1;
            if self.win_ticks == 30 {
                dom::transition(self.win, OPACITY, 20_000, 0, 1);
                scalar(self.win, OPACITY, 1);
            }
        }
        if self.pending != 0 {
            self.pending -= 1;
            if self.pending == 0 { self.selected = None; self.second = None; self.paint(); }
        }
    }
    fn mount(&mut self) {
        px(0, MARGIN, 0); px(0, PADDING, 18);
        dom::color(0, BACKGROUND, 0x102e29ff); dom::color(0, COLOR, INK);
        dom::keyword(0, FONT, 15); dom::keyword(0, BOX, 13);
        dom::number(0, MIN_HEIGHT, 100000, 4);
        let main = element(0, 1); percent(main, WIDTH, 100); px(main, MAX_WIDTH, 940);
        dom::keyword(main, MARGIN, 5);
        let header = element(main, 2);
        dom::keyword(header, DISPLAY, 2); dom::keyword(header, ALIGN, 6);
        dom::keyword(header, JUSTIFY, 7); dom::keyword(header, WRAP, 10);
        px(header, GAP, 12); px(header, MARGIN_BOTTOM, 12);
        let title = element(header, 3); dom::text(title, "Classic Mahjong Solitaire");
        px(title, MARGIN, 0); px(title, FONT_SIZE, 34);
        dom::keyword(title, FONT, 14); dom::color(title, COLOR, GOLD);
        let controls = element(header, 0); dom::keyword(controls, DISPLAY, 2);
        dom::keyword(controls, ALIGN, 6); px(controls, GAP, 7);
        self.stats = element(controls, 5); px(self.stats, FONT_SIZE, 12);
        self.undo = button(controls, "Undo", 1002);
        self.hint = button(controls, "Hint", 1003);
        button(controls, "New game", 1001);
        let settings = button(controls, "⚙", 1004);
        dom::attr(settings, 0, "Settings");
        self.dismiss = element(main, 0); dom::keyword(self.dismiss, POSITION, 21);
        px(self.dismiss, LEFT, 0); px(self.dismiss, TOP, 0);
        px(self.dismiss, RIGHT, 0); px(self.dismiss, BOTTOM, 0);
        scalar(self.dismiss, Z, 900); dom::click(self.dismiss, 1005);
        dom::hidden(self.dismiss, true);
        self.menu = element(main, 0); dom::keyword(self.menu, POSITION, 21);
        px(self.menu, RIGHT, 18); px(self.menu, TOP, 64); px(self.menu, PADDING, 8);
        scalar(self.menu, Z, 1000); dom::color(self.menu, BACKGROUND, 0x133a32ff);
        for (i, label) in ["Show tile names", "Enable undo", "Show time / moves",
            "Inform when no move exists", "Show hint button"].iter().enumerate() {
            let id = button(self.menu, label, 1100 + i as u32);
            dom::keyword(id, DISPLAY, 2); percent(id, WIDTH, 100);
            dom::keyword(id, ALIGN, 6); dom::keyword(id, JUSTIFY, 7);
            px(id, GAP, 14); px(id, BORDER_WIDTH, 0);
            dom::color(id, BACKGROUND, 0x133a32ff);
            self.switches[i] = id; dom::attr(id, 1, "false");
            let track = element(id, 5); dom::keyword(track, POSITION, 3);
            px(track, WIDTH, 30); px(track, 39, 30); px(track, HEIGHT, 17);
            px(track, RADIUS, 9); dom::color(track, BACKGROUND, 0x0b2924ff);
            let knob = element(track, 5); dom::keyword(knob, POSITION, 4);
            px(knob, WIDTH, 11); px(knob, HEIGHT, 11); px(knob, TOP, 3);
            px(knob, LEFT, 3); px(knob, RADIUS, 6);
            dom::color(knob, BACKGROUND, 0xb9d1caff); self.knobs[i] = knob;
        }
        dom::hidden(self.menu, true);
        let panel = element(main, 6); px(panel, PADDING, 20); px(panel, RADIUS, 12);
        dom::color(panel, BACKGROUND, 0x0b2924ff);
        let surface = element(panel, 0); percent(surface, WIDTH, 100);
        px(surface, MAX_WIDTH, 760); dom::keyword(surface, MARGIN, 5);
        dom::keyword(surface, CONTAINER, 20);
        let board = element(surface, 0); dom::keyword(board, POSITION, 3);
        dom::number(board, HEIGHT, 77632, 3);
        self.sprite = dom::png(include_bytes!("tiles.png"));
        self.bonus = dom::png(include_bytes!("bonus.png"));
        self.positions();
        for (i, tile) in self.tiles.iter_mut().enumerate() {
            tile.node = element(board, 4); dom::click(tile.node, i as u32 + 1);
            dom::keyword(tile.node, POSITION, 4); dom::keyword(tile.node, CURSOR, 12);
            dom::keyword(tile.node, OVERFLOW, 11); px(tile.node, PADDING, 0);
            px(tile.node, BORDER_WIDTH, 1); dom::keyword(tile.node, BORDER_STYLE, 24);
            dom::color(tile.node, BORDER_COLOR, 0xc5b391ff); px(tile.node, RADIUS, 4);
            dom::shadows(tile.node, 3, &[
                [263, 395, 0, 0, 0x735e3dff],
                [-263, 526, 1053, 0, 0x00000042],
            ]);
            dom::transition(tile.node, OPACITY, 260, 0, 2);
            crate::board(tile.node, WIDTH, 50000); crate::board(tile.node, HEIGHT, 66000);
            crate::board(tile.node, LEFT, (15 + tile.x as i32 * 26 + tile.z as i32) * 1000);
            crate::board(tile.node, TOP, (24 + tile.y as i32 * 34 - tile.z as i32 * 3) * 1000);
            scalar(tile.node, Z, 10 + tile.z as i32 * 100 + tile.y as i32);
            tile.image = element(tile.node, 7); dom::image(tile.image, self.sprite);
            dom::keyword(tile.image, POSITION, 4); dom::keyword(tile.image, POINTER, 0);
            dom::keyword(tile.image, OBJECT_FIT, 19);
            dom::transition(tile.image, OPACITY, 100, 0, 0);
            crate::board(tile.image, WIDTH, 2048 * 435);
            crate::board(tile.image, HEIGHT, 654 * 435);
        }
        self.win = element(board, 0); dom::text(self.win, "You Win!");
        dom::keyword(self.win, POSITION, 4); percent(self.win, WIDTH, 100);
        percent(self.win, HEIGHT, 100); dom::keyword(self.win, DISPLAY, 2);
        dom::keyword(self.win, ALIGN, 6); dom::keyword(self.win, JUSTIFY, 6);
        dom::keyword(self.win, FONT, 14); px(self.win, FONT_SIZE, 41);
        dom::color(self.win, COLOR, GOLD); dom::keyword(self.win, POINTER, 0);
        self.name = element(panel, 0); dom::keyword(self.name, TEXT_ALIGN, 26);
        dom::color(self.name, COLOR, GOLD); dom::keyword(self.name, FONT, 14);
        self.status = element(main, 0); dom::keyword(self.status, TEXT_ALIGN, 6);
        let footer = element(main, 8); px(footer, FONT_SIZE, 11);
        dom::text(footer, "Tiles: FluffyStuff/riichi-mahjong-tiles (public domain). Rust port on Resources.");
        self.reset();
    }
}

#[no_mangle]
pub extern "C" fn start(seed: u32) {
    let game = unsafe { &mut *core::ptr::addr_of_mut!(GAME) };
    game.seed = seed.max(1); game.mount();
}
#[no_mangle]
pub extern "C" fn event(token: u32, now: f64) {
    let game = unsafe { &mut *core::ptr::addr_of_mut!(GAME) };
    match token {
        0 => game.tick(now),
        1..=144 => game.choose(token as usize - 1),
        1001 => game.reset(),
        1002 if game.options[1] && game.count > 0 => {
            game.count -= 1; let (a,b) = game.history[game.count];
            game.tiles[a].removed = false; game.tiles[b].removed = false;
            game.selected = None; game.second = None; game.pending = 0;
            game.win_ticks = 0; scalar(game.win, OPACITY, 0);
            game.undos += 1; game.paint();
        }
        1003 if game.options[4] && game.pending == 0 => {
            game.selected = game.pair().map(|pair| pair.0); game.paint();
        }
        1004 => { dom::hidden(game.menu, false); dom::hidden(game.dismiss, false); }
        1005 => { dom::hidden(game.menu, true); dom::hidden(game.dismiss, true); }
        1100..=1104 => {
            let i = (token - 1100) as usize; game.options[i] = !game.options[i];
            dom::attr(game.switches[i], 1, if game.options[i] { "true" } else { "false" });
            px(game.knobs[i], LEFT, if game.options[i] { 16 } else { 3 });
            dom::color(game.knobs[i], BACKGROUND, if game.options[i] { GOLD } else { 0xb9d1caff });
            dom::hidden(game.menu, true); dom::hidden(game.dismiss, true); game.paint();
        }
        _ => {}
    }
}
