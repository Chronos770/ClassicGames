// ═══════════════════════════════════════════════════════════════════
// BonksSprites.ts — Pixel art & texture baking for BB&C
// All sprites defined as string arrays, each char → palette color
// '.' = transparent. PX=2 means each art pixel = 2×2 screen pixels.
// ═══════════════════════════════════════════════════════════════════

import { Application, Graphics, Texture } from 'pixi.js';

export const PX = 2;
export const FONT_W = 5;
export const FONT_H = 7;

// ═══════════════════════════════════════
// PALETTES
// ═══════════════════════════════════════

// Human characters share palette KEYS (same letters → same body part)
// s = skin, w = white, k = black, b = hair, h = blush
// o/O = overalls, y = yellow, n = mouth, r/R = boots

const PAL_BOOBONKS: Record<string, number> = {
  s: 0xFFCC99, S: 0xDDAA77, // skin
  w: 0xFFFFFF, k: 0x222222, // white, black
  b: 0xFFAA33, h: 0xFF8899, // golden hair, blush
  o: 0xFFAACC, O: 0xEE88AA, // pink dress
  y: 0xFFDD00, n: 0xCC4444, // yellow buttons, mouth
  r: 0xDD2222, R: 0xAA1111, // red boots
};

const PAL_BOOBONKS_FIRE: Record<string, number> = {
  ...PAL_BOOBONKS,
  o: 0xFFFFFF, O: 0xDDDDDD, // white dress (fire mode)
};

const PAL_BOJANGLES: Record<string, number> = {
  s: 0xFFCC99, S: 0xDDAA77, // skin
  w: 0xFFFFFF, k: 0x222222,
  b: 0x554422, h: 0xFFBBAA, // darker hair
  o: 0x2244CC, O: 0x1133AA, // dark blue overalls
  y: 0xFFDD00, n: 0xCC4444,
  r: 0x885522, R: 0x664411, // brown boots
};

const PAL_BOJANGLES_FIRE: Record<string, number> = {
  ...PAL_BOJANGLES,
  o: 0x33BBBB, O: 0x229999, // teal overalls (fire mode)
};

const PAL_CHONK: Record<string, number> = {
  f: 0xFFFFFF, F: 0xDDDDDD, // white fur / shadow
  k: 0x333333, K: 0x222222, // black (nose/eyes)
  t: 0xFF6699, T: 0xDD4477, // tongue pink
  c: 0xDD3333, C: 0xAA2222, // collar red
  e: 0xFFBBCC,               // ear inside pink
  w: 0xFFFFFF,               // eye white
  p: 0x222222,               // pupil
  n: 0x444444,               // nose detail
};

const PAL_GOOMBA: Record<string, number> = {
  b: 0x996644, B: 0x774422, // mushroom cap
  s: 0xDDBB88, S: 0xBB9966, // body tan
  w: 0xFFFFFF, k: 0x222222, // eyes
};

const PAL_KOOPA: Record<string, number> = {
  g: 0x44BB44, G: 0x228822, // shell green
  s: 0xFFDD88, S: 0xDDBB66, // body yellow
  w: 0xFFFFFF, k: 0x222222,
  f: 0x44AA44,               // feet
};

const PAL_BUZZER: Record<string, number> = {
  b: 0xBB4422, B: 0xDD8844, // body, belly
  w: 0xFFFFFF, k: 0x222222,
  W: 0xCCDDFF,               // wings
};

const PAL_SPIKEBALL: Record<string, number> = {
  m: 0x888899, M: 0xBBBBCC, // metal
  s: 0xDDDD44, S: 0xBBBB22, // spikes
};

const PAL_TILES: Record<string, number> = {
  g: 0x55BB33, G: 0x44AA22, // grass
  d: 0x8B6534, D: 0x7A5424, // dirt
  b: 0xC87533, B: 0xAA5522, // brick
  m: 0xAA9977,               // mortar
  q: 0xF5C542, Q: 0xD4A020, // question gold
  w: 0xFFFFFF,               // white
  u: 0x7A6655, U: 0x665544, // used block
  p: 0x33AA33, P: 0x228822, // pipe
  H: 0x55CC55,               // pipe highlight
  k: 0x222222,               // outline
  l: 0xFF6600, L: 0xFFAA00, // lava
  t: 0x8B7355,               // wood platform
  T: 0x6B5335,               // wood dark
  f: 0xDDDDDD, F: 0xCC3333, // flag (white→red)
};

const PAL_TILES_CAVE: Record<string, number> = {
  ...PAL_TILES,
  g: 0x667788, G: 0x556677, // stone
  d: 0x556666, D: 0x445555, // dark stone
  b: 0x778899, B: 0x667788, // stone brick
  m: 0x889999,
};

const PAL_TILES_CASTLE: Record<string, number> = {
  ...PAL_TILES,
  g: 0x555566, G: 0x444455,
  d: 0x444455, D: 0x333344,
  b: 0x666677, B: 0x555566,
  m: 0x777788,
};

const PAL_ITEMS: Record<string, number> = {
  r: 0xDD2222, R: 0xAA1111, // red (mushroom cap)
  w: 0xFFFFFF, W: 0xDDDDDD, // white
  s: 0xDDBB88, S: 0xBB9966, // stem tan
  g: 0x33AA33, G: 0x228822, // green (stem/1up)
  o: 0xFF8833, O: 0xDD6622, // orange (fire petals)
  y: 0xFFDD00, Y: 0xDDCC00, // gold (star/coin)
  k: 0x222222,               // black
  p: 0xFFAACC,               // pink (fire petals)
  b: 0xDDBB88, B: 0xBB9966, // bone (dog treat)
  c: 0xDD3333, C: 0xAA2222, // collar (dog treat)
};

// ═══════════════════════════════════════
// BOOBONKS SPRITES (16×16 small, 16×24 big)
// ═══════════════════════════════════════

const BB_SM_IDLE = [
  '................',
  '.....bbbb.......',
  '....bbbbbbb.....',
  '..bbbbbbbbbbb...',
  '..bbssssssbbbb..',
  '..bsssssssbbb...',
  '.bskwsskwssbbb..',
  '.bsshssshssbbb..',
  '..bssnsssbbb....',
  '.s.ooooooo.bbb..',
  '..oooyooyoo.bb..',
  '.sooooooooooo...',
  '..ooooooooooo...',
  '....ss..ss......',
  '...rr...rr......',
  '................',
];

const BB_SM_WALK1 = [
  '................',
  '.....bbbb.......',
  '....bbbbbbb.....',
  '..bbbbbbbbbbb...',
  '..bbssssssbbbb..',
  '..bsssssssbbb...',
  '.bskwsskwssbbb..',
  '.bsshssshssbbb..',
  '..bssnsssbbb....',
  'ss.ooooooo..bbb.',
  '..oooyooyoo..bb.',
  '..ooooooooooo...',
  '.ooooooooooooo..',
  '...ss....ss.....',
  '..rr.....rr.....',
  '................',
];

const BB_SM_WALK2 = [
  '................',
  '.....bbbb.......',
  '....bbbbbbb.....',
  '..bbbbbbbbbbb...',
  '..bbssssssbbbb..',
  '..bsssssssbbb...',
  '.bskwsskwssbbb..',
  '.bsshssshssbbb..',
  '..bssnsssbbb....',
  '...ooooooo.bbbs.',
  '..oooyooyoo.bb..',
  '..ooooooooooo.b.',
  '..ooooooooooo...',
  '....ss..ss......',
  '...rr...rr......',
  '................',
];

const BB_SM_JUMP = [
  '................',
  '.....bbbb.......',
  '....bbbbbbb.....',
  '..bbbbbbbbbbb...',
  '..bbssssssbbbb..',
  '..bsssssssbbb...',
  '.bskwsskwssbbb..',
  '.bsshssshssbbb..',
  '..bssnsssbbb....',
  's..ooooooo.bbb..',
  's.oooyooyoo.bb..',
  '..ooooooooooo.b.',
  '..ooooooooooo...',
  '....ss..ss......',
  '...rr...rr......',
  '................',
];

const BB_SM_FALL = [
  '................',
  '.....bbbb.......',
  '....bbbbbbb.....',
  '..bbbbbbbbbbb...',
  '..bbssssssbbbb..',
  '..bsssssssbbb...',
  '.bskwsskwssbbb..',
  '.bsshssshssbbb..',
  '..bssnssbbb.....',
  's..ooooooo.b....',
  '..oooyooyoo.....',
  's.ooooooooooo...',
  '.ooooooooooooo..',
  '...ss....ss.....',
  '..rr.....rr.....',
  '................',
];

const BB_SM_DEATH = [
  '................',
  '.....bbbb.......',
  '....bbbbbbb.....',
  '..bbbbbbbbbbb...',
  '..bbssssssbbbb..',
  '..bsssssssbbb...',
  '.bskkssskksbbb..',
  '.bsshssshssbbb..',
  '..bssnsssbbb....',
  '...ooooooo.bb...',
  '..oooyooyoo.bb..',
  '..ooooooooooo...',
  '..ooooooooooo...',
  '....ss..ss......',
  '...rr...rr......',
  '................',
];

// BooBonks big (16×24)
const BB_BG_IDLE = [
  '................',
  '.....bbbb.......',
  '....bbbbbbb.....',
  '..bbbbbbbbbbb...',
  '..bbssssssbbbb..',
  '..bsssssssbbb...',
  '.bskwsskwssbbb..',
  '.bsshssshssbbb..',
  '..bssnsssbbb....',
  '...ooooooo.bbb..',
  '..oooyooyoo.bb..',
  '.s.ooooooo..b...',
  '..ooooooooo.....',
  '..ooOoooOoo.....',
  '..ooooooooo.....',
  '.sooooooooooo...',
  '..ooooooooooo...',
  '.ooooooooooooo..',
  '..ooooooooooo...',
  '....ss....ss....',
  '....ss....ss....',
  '...rrr..rrr.....',
  '..rrrR..rrrR....',
  '................',
];

const BB_BG_WALK1 = [
  '................',
  '.....bbbb.......',
  '....bbbbbbb.....',
  '..bbbbbbbbbbb...',
  '..bbssssssbbbb..',
  '..bsssssssbbb...',
  '.bskwsskwssbbb..',
  '.bsshssshssbbb..',
  '..bssnsssbbb....',
  'ss.ooooooo..bbb.',
  '..oooyooyoo..bb.',
  '..ooooooooo.....',
  '..ooooooooo.....',
  '..ooOoooOoo.....',
  '..ooooooooo.....',
  '..ooooooooooo...',
  '.ooooooooooooo..',
  '.ooooooooooooo..',
  '..ooooooooooo...',
  '...ss.....ss....',
  '...ss.....ss....',
  '..rrr....rrr....',
  '..rRr....rRr....',
  '................',
];

const BB_BG_WALK2 = [
  '................',
  '.....bbbb.......',
  '....bbbbbbb.....',
  '..bbbbbbbbbbb...',
  '..bbssssssbbbb..',
  '..bsssssssbbb...',
  '.bskwsskwssbbb..',
  '.bsshssshssbbb..',
  '..bssnsssbbb....',
  '...ooooooo.bbbs.',
  '..oooyooyoo.bb..',
  '..ooooooooo..bb.',
  '..ooooooooo.....',
  '..ooOoooOoo.....',
  '..ooooooooo.....',
  '..ooooooooooo...',
  '.ooooooooooooo..',
  '.ooooooooooooo..',
  '..ooooooooooo...',
  '....ss...ss.....',
  '....ss...ss.....',
  '...rrr..rrr.....',
  '...rRr..rRr.....',
  '................',
];

const BB_BG_JUMP = [
  '................',
  '.....bbbb.......',
  '....bbbbbbb.....',
  '..bbbbbbbbbbb...',
  '..bbssssssbbbb..',
  '..bsssssssbbb...',
  '.bskwsskwssbbb..',
  '.bsshssshssbbb..',
  '..bssnsssbbb....',
  's..ooooooo.bbb..',
  's.oooyooyoo.bb..',
  '..ooooooooo..bb.',
  '..ooooooooo.....',
  '..ooOoooOoo.....',
  '..ooooooooo.....',
  '..ooooooooooo...',
  '.ooooooooooooo..',
  '..ooooooooooo...',
  '..ooooooooooo...',
  '....ss....ss....',
  '....ss....ss....',
  '...rr......rr...',
  '..rR........rR..',
  '................',
];

const BB_BG_FALL = [
  '................',
  '.....bbbb.......',
  '....bbbbbbb.....',
  '..bbbbbbbbbbb...',
  '..bbssssssbbbb..',
  '..bsssssssbbb...',
  '.bskwsskwssbbb..',
  '.bsshssshssbbb..',
  '..bssnssbbb.....',
  's..ooooooo.b....',
  '..oooyooyoo.....',
  's..ooooooo......',
  '..ooooooooo.....',
  '..ooOoooOoo.....',
  '..ooooooooo.....',
  '..ooooooooooo...',
  '.ooooooooooooo..',
  '.ooooooooooooo..',
  '..ooooooooooo...',
  '...ss.....ss....',
  '..ss.......ss...',
  '.rrR.......rrR..',
  '.rrR.......rrR..',
  '................',
];

const BB_BG_DEATH = [
  '................',
  '.....bbbb.......',
  '....bbbbbbb.....',
  '..bbbbbbbbbbb...',
  '..bbssssssbbbb..',
  '..bsssssssbbb...',
  '.bskkssskksbbb..',
  '.bsshssshssbbb..',
  '..bssnsssbbb....',
  '...ooooooo.bb...',
  '..oooyooyoo.bb..',
  '..ooooooooooo...',
  '..ooooooooooo...',
  '..ooOoooOoo.....',
  '..ooooooooo.....',
  '..ooooooooooo...',
  '..ooooooooooo...',
  '.ooooooooooooo..',
  '..ooooooooooo...',
  '....ss....ss....',
  '....ss....ss....',
  '...rrr..rrr.....',
  '..rrrR..rrrR....',
  '................',
];

// ═══════════════════════════════════════
// BOJANGLES SPRITES (16×16 small, 16×24 big)
// Same palette KEYS, different palette VALUES
// Slightly different proportions: wider leg gap, no ponytail
// ═══════════════════════════════════════

const BJ_SM_IDLE = [
  '................',
  '.....bbbb.......',
  '....bbbbbb......',
  '...bbbbbbbb.....',
  '..bbssssssbb....',
  '...ssssssss.....',
  '..skwsssskws....',
  '..sshsssshss....',
  '...sssnsss......',
  's...ooooo.......',
  '...ooyooyoo.....',
  's..ooooooooo....',
  '....oo..oo......',
  '...rrr..rrr.....',
  '...rRr..rRr.....',
  '................',
];

const BJ_SM_WALK1 = [
  '................',
  '.....bbbb.......',
  '....bbbbbb......',
  '...bbbbbbbb.....',
  '..bbssssssbb....',
  '...ssssssss.....',
  '..skwsssskws....',
  '..sshsssshss....',
  '...sssnsss......',
  'ss..ooooo.......',
  '...ooyooyoo.....',
  '...ooooooooo....',
  '...oooo..oo.....',
  '...rrr...rr.....',
  '..rRr...rRr.....',
  '................',
];

const BJ_SM_WALK2 = [
  '................',
  '.....bbbb.......',
  '....bbbbbb......',
  '...bbbbbbbb.....',
  '..bbssssssbb....',
  '...ssssssss.....',
  '..skwsssskws....',
  '..sshsssshss....',
  '...sssnsss......',
  '....ooooo....s..',
  '...ooyooyoo.....',
  '...ooooooooo....',
  '...oo..oooo.....',
  '..rr...rrr......',
  '..rRr...rRr.....',
  '................',
];

const BJ_SM_JUMP = [
  '................',
  '.....bbbb.......',
  '....bbbbbb......',
  '...bbbbbbbb.....',
  '..bbssssssbb....',
  '...ssssssss.....',
  '..skwsssskws....',
  '..sshsssshss....',
  '...sssnsss......',
  's...ooooo.......',
  's..ooyooyoo.....',
  '...ooooooooo....',
  '..ooo.....ooo...',
  '..rr.......rr...',
  '..rR.......rR...',
  '................',
];

const BJ_SM_FALL = [
  '................',
  '.....bbbb.......',
  '....bbbbbb......',
  '...bbbbbbbb.....',
  '..bbssssssbb....',
  '...ssssssss.....',
  '..skwsssskws....',
  '..sshsssshss....',
  '...sssnss.......',
  's...ooooo.......',
  '...ooyooyoo.....',
  's..ooooooooo....',
  '..oo.......oo...',
  '..rr.......rr...',
  '.rrR.......rrR..',
  '................',
];

const BJ_SM_DEATH = [
  '................',
  '.....bbbb.......',
  '....bbbbbb......',
  '...bbbbbbbb.....',
  '..bbssssssbb....',
  '...ssssssss.....',
  '..skkssssskks...',
  '..sshsssshss....',
  '...sssnsss......',
  '....ooooo.......',
  '...ooyooyoo.....',
  '...ooooooooo....',
  '....oo..oo......',
  '...rrr..rrr.....',
  '...rRr..rRr.....',
  '................',
];

// BoJangles big (16×24)
const BJ_BG_IDLE = [
  '................',
  '.....bbbb.......',
  '....bbbbbb......',
  '...bbbbbbbb.....',
  '..bbssssssbb....',
  '...ssssssss.....',
  '..skwsssskws....',
  '..sshsssshss....',
  '...sssnsss......',
  's...ooooo.......',
  '...ooyooyoo.....',
  's..ooooooooo....',
  '...ooooooooo....',
  '...ooOoooOoo....',
  '...ooooooooo....',
  's..ooooooooo....',
  '....oo..oo......',
  '....oo..oo......',
  '...oo....oo.....',
  '...oo....oo.....',
  '...rrr..rrr.....',
  '...rrr..rrr.....',
  '..rrrR..rrrR....',
  '................',
];

const BJ_BG_WALK1 = [
  '................',
  '.....bbbb.......',
  '....bbbbbb......',
  '...bbbbbbbb.....',
  '..bbssssssbb....',
  '...ssssssss.....',
  '..skwsssskws....',
  '..sshsssshss....',
  '...sssnsss......',
  'ss..ooooo.......',
  '...ooyooyoo.....',
  '...ooooooooo....',
  '...ooooooooo....',
  '...ooOoooOoo....',
  '...ooooooooo....',
  '...ooooooooo....',
  '...oooo..oo.....',
  '...oooo..oo.....',
  '...ooo....oo....',
  '..rrr.....oo....',
  '..rrr....rrr....',
  '..rRr....rrr....',
  '.........rRr....',
  '................',
];

const BJ_BG_WALK2 = [
  '................',
  '.....bbbb.......',
  '....bbbbbb......',
  '...bbbbbbbb.....',
  '..bbssssssbb....',
  '...ssssssss.....',
  '..skwsssskws....',
  '..sshsssshss....',
  '...sssnsss......',
  '....ooooo....s..',
  '...ooyooyoo.....',
  '...ooooooooo....',
  '...ooooooooo....',
  '...ooOoooOoo....',
  '...ooooooooo....',
  '...ooooooooo....',
  '...oo..oooo.....',
  '...oo..oooo.....',
  '..oo....ooo.....',
  '..oo....rrr.....',
  '..rrr...rrr.....',
  '..rrr...rRr.....',
  '..rRr...........',
  '................',
];

const BJ_BG_JUMP = [
  '................',
  '.....bbbb.......',
  '....bbbbbb......',
  '...bbbbbbbb.....',
  '..bbssssssbb....',
  '...ssssssss.....',
  '..skwsssskws....',
  '..sshsssshss....',
  '...sssnsss......',
  's...ooooo.......',
  's..ooyooyoo.....',
  '...ooooooooo....',
  '...ooooooooo....',
  '...ooOoooOoo....',
  '...ooooooooo....',
  '...ooooooooo....',
  '..ooo.....ooo...',
  '..ooo.....ooo...',
  '..oo.......oo...',
  '..rr.......rr...',
  '..rr.......rr...',
  '..rR.......rR...',
  '................',
  '................',
];

const BJ_BG_FALL = [
  '................',
  '.....bbbb.......',
  '....bbbbbb......',
  '...bbbbbbbb.....',
  '..bbssssssbb....',
  '...ssssssss.....',
  '..skwsssskws....',
  '..sshsssshss....',
  '...sssnss.......',
  's...ooooo.......',
  '...ooyooyoo.....',
  's..ooooooooo....',
  '...ooooooooo....',
  '...ooOoooOoo....',
  '...ooooooooo....',
  's..ooooooooo....',
  '..oo.......oo...',
  '..oo.......oo...',
  '..rr.......rr...',
  '..rr.......rr...',
  '.rrR.......rrR..',
  '.rrR.......rrR..',
  '................',
  '................',
];

const BJ_BG_DEATH = [
  '................',
  '.....bbbb.......',
  '....bbbbbb......',
  '...bbbbbbbb.....',
  '..bbssssssbb....',
  '...ssssssss.....',
  '..skkssssskks...',
  '..sshsssshss....',
  '...sssnsss......',
  '....ooooo.......',
  '...ooyooyoo.....',
  '...ooooooooo....',
  '...ooooooooo....',
  '...ooOoooOoo....',
  '...ooooooooo....',
  '...ooooooooo....',
  '....oo..oo......',
  '....oo..oo......',
  '...oo....oo.....',
  '...oo....oo.....',
  '...rrr..rrr.....',
  '...rrr..rrr.....',
  '..rrrR..rrrR....',
  '................',
];

// ═══════════════════════════════════════
// CHONK SPRITES (16×16 small, 16×24 big)
// Big round white dog with floppy ears, red collar, pink tongue
// ═══════════════════════════════════════

const CH_SM_IDLE = [
  '...ee....ee.....',
  '..effe..effe....',
  '..ffffffffff....',
  '.fwpffffffwpf...',
  '..fffkkffff.....',
  '..ffffttfff.....',
  '..FFFFFFFFFF....',
  '...cccccccc.....',
  '..ffffffffff....',
  '.ffffffffffff...',
  '.fFffffffffFf...',
  '..ff..ff..ff....',
  '..ff..ff..ff....',
  '.FFF..FFF..Ff...',
  '................',
  '................',
];

const CH_SM_WALK1 = [
  '...ee....ee.....',
  '..effe..effe....',
  '..ffffffffff....',
  '.fwpffffffwpf...',
  '..fffkkffff.....',
  '..ffffttfff.....',
  '..FFFFFFFFFF....',
  '...cccccccc.....',
  '..ffffffffff....',
  '.ffffffffffff...',
  '.fFffffffffFf...',
  '.fff..ff...ff...',
  '..ff..ff..ff....',
  '..FF...FFF.f....',
  '................',
  '................',
];

const CH_SM_WALK2 = [
  '...ee....ee.....',
  '..effe..effe....',
  '..ffffffffff....',
  '.fwpffffffwpf...',
  '..fffkkffff.....',
  '..ffffttfff.....',
  '..FFFFFFFFFF....',
  '...cccccccc.....',
  '..ffffffffff....',
  '.ffffffffffff...',
  '.fFffffffffFf...',
  '..ff...ff.fff...',
  '..ff..ff..ff....',
  '..f.FFF...FF....',
  '................',
  '................',
];

const CH_SM_JUMP = [
  '...ee....ee.....',
  '..effe..effe....',
  '..ffffffffff....',
  '.fwpffffffwpf...',
  '..fffkkffff.....',
  '..ffffffffff....',
  '..FFFFFFFFFF....',
  '...cccccccc.....',
  '..ffffffffff....',
  '.ffffffffffff...',
  '.fFffffffffFf...',
  '.ff..........f..',
  '.ff..........f..',
  '................',
  '................',
  '................',
];

const CH_SM_FLUTTER = [
  '...ee....ee.....',
  '..effe..effe....',
  '..ffffffffff....',
  '.fwpffffffwpf...',
  '..fffkkffff.....',
  '..ffffffffff....',
  '..FFFFFFFFFF....',
  '...cccccccc.....',
  '..ffffffffff....',
  '.ffffffffffff...',
  '.fFffffffffFf...',
  '.ff.ff..ff..f...',
  '..f..ff..ff.....',
  '................',
  '................',
  '................',
];

const CH_SM_TONGUE = [
  '...ee....ee.....',
  '..effe..effe....',
  '..ffffffffff....',
  '.fwpffffffwpf...',
  '..fffkkffff.....',
  '..fffffffttttt..',
  '..FFFFFFFFFF....',
  '...cccccccc.....',
  '..ffffffffff....',
  '.ffffffffffff...',
  '.fFffffffffFf...',
  '..ff..ff..ff....',
  '..ff..ff..ff....',
  '.FFF..FFF..Ff...',
  '................',
  '................',
];

const CH_SM_FALL = [
  '..ee......ee....',
  '.effe....effe...',
  '..ffffffffff....',
  '.fwpffffffwpf...',
  '..fffkkffff.....',
  '..ffffffffff....',
  '..FFFFFFFFFF....',
  '...cccccccc.....',
  '..ffffffffff....',
  '.ffffffffffff...',
  '.fFffffffffFf...',
  'ff............ff',
  'ff............ff',
  '................',
  '................',
  '................',
];

const CH_SM_DEATH = [
  '...ee....ee.....',
  '..effe..effe....',
  '..ffffffffff....',
  '.fkpffffffkpf...',
  '..fffkkffff.....',
  '..ffffttfff.....',
  '..FFFFFFFFFF....',
  '...cccccccc.....',
  '..ffffffffff....',
  '.ffffffffffff...',
  '.fFffffffffFf...',
  '..ff..ff..ff....',
  '..ff..ff..ff....',
  '.FFF..FFF..Ff...',
  '................',
  '................',
];

// Chonk big (16×24) — taller body
const CH_BG_IDLE = [
  '...ee....ee.....',
  '..effe..effe....',
  '..ffffffffff....',
  '.fwpffffffwpf...',
  '..fffkkffff.....',
  '..ffffttfff.....',
  '..FFFFFFFFFF....',
  '...cccccccc.....',
  '..ffffffffff....',
  '.ffffffffffff...',
  '.ffffffffffff...',
  '.fFffffffffFf...',
  '.ffffffffffff...',
  '.fFffffffffFf...',
  '.ffffffffffff...',
  '..ffffffffff....',
  '..ff..ff..ff....',
  '..ff..ff..ff....',
  '..ff..ff..ff....',
  '..ff..ff..ff....',
  '.FFF..FFF..Ff...',
  '.FFF..FFF..Ff...',
  '................',
  '................',
];

const CH_BG_WALK1 = [
  '...ee....ee.....',
  '..effe..effe....',
  '..ffffffffff....',
  '.fwpffffffwpf...',
  '..fffkkffff.....',
  '..ffffttfff.....',
  '..FFFFFFFFFF....',
  '...cccccccc.....',
  '..ffffffffff....',
  '.ffffffffffff...',
  '.ffffffffffff...',
  '.fFffffffffFf...',
  '.ffffffffffff...',
  '.fFffffffffFf...',
  '.ffffffffffff...',
  '..ffffffffff....',
  '.fff..ff...ff...',
  '..ff..ff..ff....',
  '..ff..ff..ff....',
  '..ff..ff..ff....',
  '..FF...FFF.f....',
  '..FF...FFF.f....',
  '................',
  '................',
];

const CH_BG_WALK2 = [
  '...ee....ee.....',
  '..effe..effe....',
  '..ffffffffff....',
  '.fwpffffffwpf...',
  '..fffkkffff.....',
  '..ffffttfff.....',
  '..FFFFFFFFFF....',
  '...cccccccc.....',
  '..ffffffffff....',
  '.ffffffffffff...',
  '.ffffffffffff...',
  '.fFffffffffFf...',
  '.ffffffffffff...',
  '.fFffffffffFf...',
  '.ffffffffffff...',
  '..ffffffffff....',
  '..ff...ff.fff...',
  '..ff..ff..ff....',
  '..ff..ff..ff....',
  '..ff..ff..ff....',
  '..f.FFF...FF....',
  '..f.FFF...FF....',
  '................',
  '................',
];

const CH_BG_JUMP = [
  '...ee....ee.....',
  '..effe..effe....',
  '..ffffffffff....',
  '.fwpffffffwpf...',
  '..fffkkffff.....',
  '..ffffffffff....',
  '..FFFFFFFFFF....',
  '...cccccccc.....',
  '..ffffffffff....',
  '.ffffffffffff...',
  '.ffffffffffff...',
  '.fFffffffffFf...',
  '.ffffffffffff...',
  '.fFffffffffFf...',
  '.ffffffffffff...',
  '..ffffffffff....',
  '.ff..........f..',
  '.ff..........f..',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
];

const CH_BG_FLUTTER = [
  '...ee....ee.....',
  '..effe..effe....',
  '..ffffffffff....',
  '.fwpffffffwpf...',
  '..fffkkffff.....',
  '..ffffffffff....',
  '..FFFFFFFFFF....',
  '...cccccccc.....',
  '..ffffffffff....',
  '.ffffffffffff...',
  '.ffffffffffff...',
  '.fFffffffffFf...',
  '.ffffffffffff...',
  '.fFffffffffFf...',
  '.ffffffffffff...',
  '..ffffffffff....',
  '.ff.ff..ff..f...',
  '..f..ff..ff.....',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
];

const CH_BG_TONGUE = [
  '...ee....ee.....',
  '..effe..effe....',
  '..ffffffffff....',
  '.fwpffffffwpf...',
  '..fffkkffff.....',
  '..fffffffttttt..',
  '..FFFFFFFFFF....',
  '...cccccccc.....',
  '..ffffffffff....',
  '.ffffffffffff...',
  '.ffffffffffff...',
  '.fFffffffffFf...',
  '.ffffffffffff...',
  '.fFffffffffFf...',
  '.ffffffffffff...',
  '..ffffffffff....',
  '..ff..ff..ff....',
  '..ff..ff..ff....',
  '..ff..ff..ff....',
  '..ff..ff..ff....',
  '.FFF..FFF..Ff...',
  '.FFF..FFF..Ff...',
  '................',
  '................',
];

const CH_BG_FALL = [
  '..ee......ee....',
  '.effe....effe...',
  '..ffffffffff....',
  '.fwpffffffwpf...',
  '..fffkkffff.....',
  '..ffffffffff....',
  '..FFFFFFFFFF....',
  '...cccccccc.....',
  '..ffffffffff....',
  '.ffffffffffff...',
  '.ffffffffffff...',
  '.fFffffffffFf...',
  '.ffffffffffff...',
  '.fFffffffffFf...',
  '.ffffffffffff...',
  '..ffffffffff....',
  'ff............ff',
  'ff............ff',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
];

const CH_BG_DEATH = [
  '...ee....ee.....',
  '..effe..effe....',
  '..ffffffffff....',
  '.fkpffffffkpf...',
  '..fffkkffff.....',
  '..ffffttfff.....',
  '..FFFFFFFFFF....',
  '...cccccccc.....',
  '..ffffffffff....',
  '.ffffffffffff...',
  '.ffffffffffff...',
  '.fFffffffffFf...',
  '.ffffffffffff...',
  '.fFffffffffFf...',
  '.ffffffffffff...',
  '..ffffffffff....',
  '..ff..ff..ff....',
  '..ff..ff..ff....',
  '..ff..ff..ff....',
  '..ff..ff..ff....',
  '.FFF..FFF..Ff...',
  '.FFF..FFF..Ff...',
  '................',
  '................',
];

// ═══════════════════════════════════════
// ENEMY SPRITES (16×16)
// ═══════════════════════════════════════

const GOOMBA_WALK1 = [
  '................',
  '......bb........',
  '....bbbbbb......',
  '...bbbbbbbb.....',
  '..bbbbbbbbbb....',
  '..Bbwkbbwkbb....',
  '..bbbbbbbbbb....',
  '...BBBBBBBB.....',
  '....ssssss......',
  '...ssssssss.....',
  '...ssssssss.....',
  '...ssssssss.....',
  '....ss..ss......',
  '...sss..sss.....',
  '...sSs..sSs.....',
  '................',
];

const GOOMBA_WALK2 = [
  '................',
  '......bb........',
  '....bbbbbb......',
  '...bbbbbbbb.....',
  '..bbbbbbbbbb....',
  '..Bbwkbbwkbb....',
  '..bbbbbbbbbb....',
  '...BBBBBBBB.....',
  '....ssssss......',
  '...ssssssss.....',
  '...ssssssss.....',
  '...ssssssss.....',
  '...ss....ss.....',
  '..sss....sss....',
  '..sSs....sSs....',
  '................',
];

const GOOMBA_SQUISH = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '..bbbbbbbbbb....',
  '..Bbwkbbwkbb....',
  '..BBBBBBBBBB....',
  '..ssssssssss....',
  '................',
];

const KOOPA_WALK1 = [
  '................',
  '......gg........',
  '....gggggg......',
  '...ggGGGggg.....',
  '..ggGGGGGggg....',
  '..ggGGGGGggg....',
  '..gggggggggg....',
  '....ssssss......',
  '...swksssks.....',
  '...ssssssss.....',
  '....ssss........',
  '...ff..ff.......',
  '...ff..ff.......',
  '..fff..fff......',
  '................',
  '................',
];

const KOOPA_WALK2 = [
  '................',
  '......gg........',
  '....gggggg......',
  '...ggGGGggg.....',
  '..ggGGGGGggg....',
  '..ggGGGGGggg....',
  '..gggggggggg....',
  '....ssssss......',
  '...swksssks.....',
  '...ssssssss.....',
  '....ssss........',
  '....ff..ff......',
  '..fff..fff......',
  '...ff..ff.......',
  '................',
  '................',
];

const KOOPA_SHELL = [
  '................',
  '................',
  '................',
  '................',
  '....gggggg......',
  '...gggggggg.....',
  '..ggGGGGGggg....',
  '..ggGGGGGGgg....',
  '..ggGGGGGggg....',
  '...gggggggg.....',
  '....gggggg......',
  '................',
  '................',
  '................',
  '................',
  '................',
];

const BUZZER_FLY1 = [
  '................',
  '..WW......WW....',
  '.WWWW....WWWW...',
  '..WWWW..WWWW....',
  '....bbbbbb......',
  '...bbbbbbbb.....',
  '..bbbwkwkbbb....',
  '..bbbbbbbbbb....',
  '...bBBBBBBb.....',
  '....bbbbbb......',
  '....bb..bb......',
  '................',
  '................',
  '................',
  '................',
  '................',
];

const BUZZER_FLY2 = [
  '.WW........WW...',
  '..WWWW..WWWW....',
  '...WW....WW.....',
  '................',
  '....bbbbbb......',
  '...bbbbbbbb.....',
  '..bbbwkwkbbb....',
  '..bbbbbbbbbb....',
  '...bBBBBBBb.....',
  '....bbbbbb......',
  '....bb..bb......',
  '................',
  '................',
  '................',
  '................',
  '................',
];

const SPIKE_ROLL1 = [
  '....s..ss..s....',
  '.....ssssss.....',
  '..s.mmmmmm.s....',
  '...mmmMmmmm.....',
  '...mmmmmmmm.....',
  '..smmmmmmmms....',
  '..smmmmmmmms....',
  '...mmmmmmmm.....',
  '...mmmmMmmm.....',
  '..s.mmmmmm.s....',
  '.....ssssss.....',
  '....s..ss..s....',
  '................',
  '................',
  '................',
  '................',
];

const SPIKE_ROLL2 = [
  '.....s.ss.s.....',
  '....ssssssss....',
  '..s..mmmmmm.s...',
  '...mmMmmmmm.....',
  '..smmmmmmmmm....',
  '..smmmmmmmms....',
  '..smmmmmmmms....',
  '..smmmmmmmms....',
  '...mmmmmMmm.....',
  '..s..mmmmmm.s...',
  '....ssssssss....',
  '.....s.ss.s.....',
  '................',
  '................',
  '................',
  '................',
];

// ═══════════════════════════════════════
// TILE SPRITES (16×16)
// ═══════════════════════════════════════

const TILE_GROUND = [
  'gGgGgGgGgGgGgGgG',
  'GgGggGgGgGgGggGg',
  'gGgGgGgGgGgGgGgG',
  'dddddddddddddddd',
  'dDddddDdddDdddDd',
  'dddddddddddddddd',
  'ddDdddDdddddDddd',
  'dddddddddddddddd',
  'dDddddDdddDdddDd',
  'dddddddddddddddd',
  'ddDdddddDdddDddd',
  'dddddddddddddddd',
  'dDdddDddddDdddDd',
  'dddddddddddddddd',
  'ddDdddddDdddddDd',
  'dddddddddddddddd',
];

const TILE_BRICK = [
  'bbbbbbbmbbbbbbbb',
  'bbbbbbbmbbbbbbbb',
  'bbbbbbbmbbbbbbbb',
  'mmmmmmmmmmmmmmmm',
  'bbbmbbbbbbbbmbbb',
  'bbbmbbbbbbbbmbbb',
  'bbbmbbbbbbbbmbbb',
  'mmmmmmmmmmmmmmmm',
  'bbbbbbbmbbbbbbbb',
  'bbbbbbbmbbbbbbbb',
  'bbbbbbbmbbbbbbbb',
  'mmmmmmmmmmmmmmmm',
  'bbbmbbbbbbbbmbbb',
  'bbbmbbbbbbbbmbbb',
  'bbbmbbbbbbbbmbbb',
  'mmmmmmmmmmmmmmmm',
];

const TILE_QUESTION1 = [
  'QQQQQQQQQQQQQQQQ',
  'QqqqqqqqqqqqqqqQ',
  'Qq..qqqqqqqq..qQ',
  'Qq....qwwq....qQ',
  'Qq...qwqqwq...qQ',
  'Qq...qqqqwq...qQ',
  'Qq....qqwq....qQ',
  'Qq....qwqq....qQ',
  'Qq....qwqq....qQ',
  'Qq....qqqq....qQ',
  'Qq....qwqq....qQ',
  'Qq....qqqq....qQ',
  'Qq..qqqqqqqq..qQ',
  'QqqqqqqqqqqqqqqQ',
  'QQQQQQQQQQQQQQQQ',
  'QQQQQQQQQQQQQQQQ',
];

const TILE_QUESTION2 = [
  'qqqqqqqqqqqqqqqq',
  'qQQQQQQQQQQQQQQq',
  'qQ..QQQQQQQQ..Qq',
  'qQ....QwwQ....Qq',
  'qQ...QwQQwQ...Qq',
  'qQ...QQQQwQ...Qq',
  'qQ....QQwQ....Qq',
  'qQ....QwQQ....Qq',
  'qQ....QwQQ....Qq',
  'qQ....QQQQ....Qq',
  'qQ....QwQQ....Qq',
  'qQ....QQQQ....Qq',
  'qQ..QQQQQQQQ..Qq',
  'qQQQQQQQQQQQQQQq',
  'qqqqqqqqqqqqqqqq',
  'qqqqqqqqqqqqqqqq',
];

const TILE_USED = [
  'uuuuuuuuuuuuuuuu',
  'uUUUUUUUUUUUUUUu',
  'uUuuuuuuuuuuuuUu',
  'uUuuuuuuuuuuuuUu',
  'uUuuuuuuuuuuuuUu',
  'uUuuuuuuuuuuuuUu',
  'uUuuuuuuuuuuuuUu',
  'uUuuuuuuuuuuuuUu',
  'uUuuuuuuuuuuuuUu',
  'uUuuuuuuuuuuuuUu',
  'uUuuuuuuuuuuuuUu',
  'uUuuuuuuuuuuuuUu',
  'uUuuuuuuuuuuuuUu',
  'uUUUUUUUUUUUUUUu',
  'uuuuuuuuuuuuuuuu',
  'uuuuuuuuuuuuuuuu',
];

const TILE_PIPE_TOP = [
  'PPppppppppppppPP',
  'PHppppppppppppPP',
  'PHppppppppppppPP',
  'PHppppppppppppPP',
  'PPppppppppppppPP',
  'PPppppppppppppPP',
  'PPppppppppppppPP',
  'PPppppppppppppPP',
  'PPppppppppppppPP',
  'PPppppppppppppPP',
  'PPppppppppppppPP',
  'PPppppppppppppPP',
  'PPppppppppppppPP',
  'PPppppppppppppPP',
  'PPppppppppppppPP',
  'PPppppppppppppPP',
];

const TILE_PIPE_BODY = [
  '..PPppppppppPP..',
  '..PHppppppppPP..',
  '..PHppppppppPP..',
  '..PPppppppppPP..',
  '..PPppppppppPP..',
  '..PPppppppppPP..',
  '..PPppppppppPP..',
  '..PPppppppppPP..',
  '..PPppppppppPP..',
  '..PPppppppppPP..',
  '..PPppppppppPP..',
  '..PPppppppppPP..',
  '..PPppppppppPP..',
  '..PPppppppppPP..',
  '..PPppppppppPP..',
  '..PPppppppppPP..',
];

const TILE_PLATFORM = [
  'tTtTtTtTtTtTtTtT',
  'TtTtTtTtTtTtTtTt',
  'tttttttttttttttt',
  'TTTTTTTTTTTTTTTT',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
];

const TILE_CHECKPOINT = [
  '......kk........',
  '......kk........',
  '......kk........',
  '......kk........',
  '......kk........',
  '......kk........',
  '......kk........',
  '......kk........',
  '......kk........',
  '......kk........',
  '..ffffkk........',
  '..ffffkk........',
  '..ffffkk........',
  '......kk........',
  '......kk........',
  '......kk........',
];

const TILE_LAVA = [
  'LLLlLLLlLLLlLLLl',
  'lLlLlLlLlLlLlLlL',
  'llllllllllllllll',
  'llllllllllllllll',
  'llllllllllllllll',
  'llllllllllllllll',
  'llllllllllllllll',
  'llllllllllllllll',
  'llllllllllllllll',
  'llllllllllllllll',
  'llllllllllllllll',
  'llllllllllllllll',
  'llllllllllllllll',
  'llllllllllllllll',
  'llllllllllllllll',
  'llllllllllllllll',
];

// ═══════════════════════════════════════
// ITEM SPRITES (16×16)
// ═══════════════════════════════════════

const ITEM_MUSHROOM = [
  '................',
  '......rrrr......',
  '....rrrrrrrr....',
  '...rrwrrrrwrr...',
  '..rrrwwrrwwrrr..',
  '..rrrwwrrwwrrr..',
  '..rrrrrrrrrrrr..',
  '...rrrrrrrrrr...',
  '....ssssssss....',
  '...ssssssssss...',
  '...ssssssssss...',
  '...ssssssssss...',
  '....ssssssss....',
  '.....ssssss.....',
  '................',
  '................',
];

const ITEM_FIRE_FLOWER = [
  '................',
  '.......ww.......',
  '....wwwrrwww....',
  '....wrrrrrrw....',
  '...wrroooorw....',
  '...wrrooorrrw...',
  '....wrrrrrrw....',
  '....wwwrrwww....',
  '.......gg.......',
  '.......gg.......',
  '......gggg......',
  '.....gg.gg......',
  '......gg........',
  '.......gg.......',
  '................',
  '................',
];

const ITEM_STAR = [
  '................',
  '.......yy.......',
  '......yyyy......',
  '.....yyyyyy.....',
  '...yyyyyyyyyy...',
  '..yyyyyyyyyyyy..',
  '.yyYyyyyyyYyyy..',
  '..yyyyyyyyyyyy..',
  '...yyyyyyyyyy...',
  '....yyyyyyyy....',
  '...yyyy..yyyy...',
  '...yyy....yyy...',
  '..yyy......yyy..',
  '..yy........yy..',
  '................',
  '................',
];

const ITEM_1UP = [
  '................',
  '......gggg......',
  '....gggggggg....',
  '...ggwggggwgg...',
  '..gggwwggwwggg..',
  '..gggwwggwwggg..',
  '..gggggggggggg..',
  '...gggggggggg...',
  '....ssssssss....',
  '...ssssssssss...',
  '...ssssssssss...',
  '...ssssssssss...',
  '....ssssssss....',
  '.....ssssss.....',
  '................',
  '................',
];

const ITEM_DOG_TREAT = [
  '................',
  '................',
  '....bbBBbb......',
  '...bBbbbbBb.....',
  '..bBbbbbbbBb....',
  '..bbbbbbbbbb....',
  '...bBbbbbBb.....',
  '....bbBBbb......',
  '......cc........',
  '....bbbbbb......',
  '....ccCCcc......',
  '....bbbbbb......',
  '......cc........',
  '................',
  '................',
  '................',
];

const ITEM_COIN = [
  '................',
  '.....yyyyyy.....',
  '....yyyyyyyy....',
  '...yyYyyyYyyy...',
  '...yyYyyyYyyy...',
  '...yyyyyyyyyy...',
  '...yyYYYYYyyy...',
  '...yyYyyyYyyy...',
  '...yyYyyyYyyy...',
  '...yyYYYYYyyy...',
  '...yyyyyyyyyy...',
  '....yyyyyyyy....',
  '.....yyyyyy.....',
  '................',
  '................',
  '................',
];

// ═══════════════════════════════════════
// EFFECT SPRITES (8×8)
// ═══════════════════════════════════════

const FX_DEBRIS = [
  '..bb....',
  '.bbBb...',
  '.bBBb...',
  '..bb....',
  '........',
  '........',
  '........',
  '........',
];

const FX_STOMP = [
  '..y..y..',
  '.y.yy.y.',
  '..yyyy..',
  'yy.yy.yy',
  '..yyyy..',
  '.y.yy.y.',
  '..y..y..',
  '........',
];

const FX_DUST1 = [
  '........',
  '..ww....',
  '.wwww...',
  '.wwww...',
  '..ww....',
  '........',
  '........',
  '........',
];

const FX_DUST2 = [
  '.w...w..',
  '..www...',
  '.wwwww..',
  '.wwwww..',
  '..www...',
  '.w...w..',
  '........',
  '........',
];

const FX_DUST3 = [
  'w..w..w.',
  '..w..w..',
  '.w....w.',
  'w......w',
  '.w....w.',
  '..w..w..',
  'w..w..w.',
  '........',
];

const FX_SPARKLE1 = [
  '...y....',
  '..yyy...',
  '.yyyyy..',
  '..yyy...',
  '...y....',
  '........',
  '........',
  '........',
];

const FX_SPARKLE2 = [
  '........',
  '...Y....',
  '..YyY...',
  '.YyyyY..',
  '..YyY...',
  '...Y....',
  '........',
  '........',
];

const FX_SPARKLE3 = [
  '.Y...Y..',
  '..Y.Y...',
  '...y....',
  '..yYy...',
  '...y....',
  '..Y.Y...',
  '.Y...Y..',
  '........',
];

const FX_FEATHER = [
  '...w....',
  '..ww....',
  '.www....',
  '..wwW...',
  '...wW...',
  '....W...',
  '........',
  '........',
];

const FX_FIREBALL = [
  '..oy....',
  '.ooyy...',
  '.oooy...',
  '..oy....',
  '........',
  '........',
  '........',
  '........',
];

const FX_SPIT = [
  '..gg....',
  '.ggGg...',
  '.gGGg...',
  '..gg....',
  '........',
  '........',
  '........',
  '........',
];

// ═══════════════════════════════════════
// HUD ICONS (8×8) + PORTRAITS (16×16)
// ═══════════════════════════════════════

const HUD_HEART = [
  '.rr.rr..',
  'rrrrrrrr',
  'rrrrrrrr',
  '.rrrrrr.',
  '..rrrr..',
  '...rr...',
  '........',
  '........',
];

const HUD_COIN_ICON = [
  '..yyyy..',
  '.yyyyyy.',
  '.yyYyyy.',
  '.yyYyyy.',
  '.yyYyyy.',
  '.yyyyyy.',
  '..yyyy..',
  '........',
];

const HUD_CLOCK = [
  '..wwww..',
  '.wkwwkw.',
  'ww.kk.ww',
  'ww.k..ww',
  'ww.k..ww',
  '.wwwwww.',
  '..wwww..',
  '........',
];

// Character portraits for HUD (16×16)
const PORTRAIT_BB = [
  '................',
  '.....bbbb.......',
  '....bbbbbbb.....',
  '..bbbbbbbbbbb...',
  '..bbssssssbbbb..',
  '..bsssssssbbb...',
  '.bskwsskwssbbb..',
  '.bsshssshssbbb..',
  '..bssnsssbbb....',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
];

const PORTRAIT_BJ = [
  '................',
  '.....bbbb.......',
  '....bbbbbb......',
  '...bbbbbbbb.....',
  '..bbssssssbb....',
  '...ssssssss.....',
  '..skwsssskws....',
  '..sshsssshss....',
  '...sssnsss......',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
];

const PORTRAIT_CH = [
  '...ee....ee.....',
  '..effe..effe....',
  '..ffffffffff....',
  '.fwpffffffwpf...',
  '..fffkkffff.....',
  '..ffffttfff.....',
  '..FFFFFFFFFF....',
  '...cccccccc.....',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
];

// ═══════════════════════════════════════
// TITLE / UI SPRITES
// ═══════════════════════════════════════

// Menu cursor arrow (8×8)
const UI_CURSOR = [
  '..y.....',
  '..yy....',
  '..yyy...',
  '..yyyy..',
  '..yyy...',
  '..yy....',
  '..y.....',
  '........',
];

// ═══════════════════════════════════════
// CINEMATIC SCENE ILLUSTRATIONS (64×48)
// ═══════════════════════════════════════

// Scene 1: Fizzlewood Village — green hills, small houses, glowing sparkstones
const PAL_SCENE: Record<string, number> = {
  g: 0x55BB33, G: 0x44AA22, d: 0x8B6534, D: 0x7A5424,
  s: 0x88BBFF, S: 0x6699DD, w: 0xFFFFFF, W: 0xDDDDDD,
  b: 0xCC8844, B: 0xAA6633, r: 0xDD3333, R: 0xAA2222,
  y: 0xFFDD00, Y: 0xFFAA00, k: 0x333333, K: 0x222222,
  t: 0x8B7355, T: 0x6B5335, p: 0xFFAACC, P: 0xFF88AA,
  c: 0x6699FF, C: 0x4477DD, o: 0xFF8833, O: 0xDD6622,
  m: 0xBB66DD, M: 0x9944BB, n: 0x44DD77, N: 0x22BB55,
  l: 0xFFEECC, L: 0xDDCCAA, f: 0x77AAFF, F: 0x5588DD,
  h: 0xDDBB88, H: 0xBB9966, e: 0xFFCC99, E: 0xDDAA77,
};

const SCENE_VILLAGE = [
  '................................................................',
  '....sssssssssssssssssssssssssssssssssssssssssssssssssssssssss.....',
  '...sssssssssSSSsssssssssssssSSSssssssssSSSsssssssssssSSSsssss....',
  '..sssssssSSSSSSSssssssssSSSSSSSsssssSSSSSSSssssssSSSSSSSsssss...',
  '..ssssSSSSSSSSSSSsssSSSSSSSSSSSssSSSSSSSSSSSssSSSSSSSSSSSssss...',
  '..ssy.sssssssssssy..sssssssssy..ssssssssy..sssssssssy..sssss...',
  '..ss...sssssssssss...ssssssss...ssssssss...ssssssssss...ssss...',
  '..ss.y.ssssssssss.y.ssssssss.y.sssssss.y.sssssssss.y.sssss...',
  '..ssssssssssssssssssssssssssssssssssssssssssssssssssssssssss...',
  '..ssssssssssssssssssssssssssssssssssssssssssssssssssssssssss...',
  '..ssssssssssssssssssssssssssssssssssssssssssssssssssssssssss...',
  '..ssssssssssssssssssssssssssssssssssssssssssssssssssssssssss...',
  '..ssssssssssssssssssssssssssssssssssssssssssssssssssssssssss...',
  '..ssssssssssssssssssssssssssssssssssssssssssssssssssssssssss...',
  '..ssssssssssssssssssssssssssssssssssssssssssssssssssssssssss...',
  '..ssssssssssssssssssssssssssssssssssssssssssssssssssssssssss...',
  '..ssssssssssssssssssssssssssssssssssssssssssssssssssssssssss...',
  '..ssssssssssssssssssssssssssssssssssssssssssssssssssssssssss...',
  '..ssssssssssssssssssssssssssssssssssssssssssssssssssssssssss...',
  '..ssssssssssssssssssssssssssssssssssssssssssssssssssssssssss...',
  '..ssssssssssssssssssssssssssssssssssssssssssssssssssssssssss...',
  '..ssssssssssssssssssssssssssssssssssssssssssssssssssssssssss...',
  '..ssssssssssssssssssssssssssssssssssssssssssssssssssssssssss...',
  '..ss...rrrrr.........rrrrr................rrrrr......sssssss...',
  '..ss..rrrrrrrr......rrrrrrrr.............rrrrrrrr....sssssss...',
  '..ss..rrbbrrrr......rrbbrrrr.............rrbbrrrr....sssssss...',
  '..ss..rrbbrrrr......rrbbrrrr.............rrbbrrrr....sssssss...',
  '..ss..rrrrrrrr......rrrrrrrr.............rrrrrrrr....sssssss...',
  '..ss..rrHHrrrr......rrHHrrrr.............rrHHrrrr...sssssss...',
  '..ss..rrHHrrrr......rrHHrrrr.............rrHHrrrr...sssssss...',
  '..ss..dddddddd......dddddddd.............dddddddd...sssssss...',
  '..gggGgGgGggGggGgGgGggGggGgGgGggGgGgGggGggGgGgGggGgggggg.....',
  '..gGgggGgggGgGgggGgggGgGgggGgggGgGgggGgggGgGgggGgggGgggg.....',
  '..gggGgGgGggGggGgGgGggGggGgGgGggGgGgGggGggGgGgGggGgggggg.....',
  '..gGgggGgggGgGgggGgggGgGgggGgggGgGgggGgggGgGgggGgggGgggg.....',
  '..gggGgGgGggGggGgGgGggGggGgGgGggGgGgGggGggGgGgGggGgggggg.....',
  '..dddddddddddddddddddddddddddddddddddddddddddddddddddddd.....',
  '..dDdddDddDdDdddDddDdDdddDddDdDdddDddDdDdddDddDdDdddDddd.....',
  '..dddddddddddddddddddddddddddddddddddddddddddddddddddddd.....',
  '..dDdddDddDdDdddDddDdDdddDddDdDdddDddDdDdddDddDdDdddDddd.....',
  '..dddddddddddddddddddddddddddddddddddddddddddddddddddddd.....',
  '..dddddddddddddddddddddddddddddddddddddddddddddddddddddd.....',
  '..dDdddDddDdDdddDddDdDdddDddDdDdddDddDdDdddDddDdDdddDddd.....',
  '..dddddddddddddddddddddddddddddddddddddddddddddddddddddd.....',
  '..dddddddddddddddddddddddddddddddddddddddddddddddddddddd.....',
  '..dddddddddddddddddddddddddddddddddddddddddddddddddddddd.....',
  '..dddddddddddddddddddddddddddddddddddddddddddddddddddddd.....',
  '................................................................',
];

// Scene 2: King Grumble stealing — dark sky, villain silhouette, sparkstones pulled away
const PAL_SCENE2: Record<string, number> = {
  ...PAL_SCENE,
  s: 0x222244, S: 0x1a1a33, // dark sky
  g: 0x224422, G: 0x113311, // dark grass
  d: 0x443322, D: 0x332211, // dark dirt
};

const SCENE_VILLAIN = [
  '................................................................',
  '....ssssssssssssssssssssssssssssssssssssssssssssssssssssssssss....',
  '...ssssssssssSSSssssssssssssssSSSssssssssSSSssssssssssSSSssss....',
  '..sssssssSSSSSSSssssssssSSSSSSSsssssSSSSSSSssssssSSSSSSSsssss...',
  '..ssssSSSSSSSSSSSsssSSSSSSSSSSSssSSSSSSSSSSSssSSSSSSSSSSSssss...',
  '..sssssssssssssssssssssssssssssssssssssssssssssssssssssssssss...',
  '..sssssssssssssssssy..sssssssssy..ssssssssssssssssssssssssss....',
  '..ssssssssssssssssssssy...sssssssy..sssssssssssssssssssssss.....',
  '..sssssssssssssssssssssssssssssssssssssssssssssssssssssssss.....',
  '..sssssssssssssssssssssssssssssssssssssssssssssssssssssssss.....',
  '..ssssssssssssssssssssKKKKKsssssssssssssssssssssssssssssss.....',
  '..sssssssssssssssssssKKKKKKKssssssssssssssssssssssssssssss.....',
  '..sssssssssssssssssKKKKKKKKKKssssssssssssssssssssssssssss.....',
  '..ssssssssssssssssKKKKKKKKKKKKsssssssssssssssssssssssssss.....',
  '..sssssssssssssssKKKKKKKKKKKKKKssssssssssssssssssssssssss.....',
  '..sssssssssssssssKKKKKKKKKKKKKKssssssssssssssssssssssssss.....',
  '..ssssssssssssssKKKKKrKKKrKKKKKKsssssssssssssssssssssssss.....',
  '..ssssssssssssssKKKKKKKKKKKKKKKKsssssssssssssssssssssssss.....',
  '..ssssssssssssssKKKKKyKKKKyKKKKKsssssssssssssssssssssssss.....',
  '..sssssssssssssKKKKKKKKKKKKKKKKKKssssssssssssssssssssssss.....',
  '..sssssssssssssKKKKKKKKKKKKKKKKKKssssssssssssssssssssssss.....',
  '..sssssssssssssKKKKKKKKKKKKKKKKKKssssssssssssssssssssssss.....',
  '..sssssssssssssKKKKKKKKKKKKKKKKKKssssssssssssssssssssssss.....',
  '..sssssssssssssKKKKKKKKKKKKKKKKKKssssssssssssssssssssssss.....',
  '..sssssssssssssKKKKKKKKKKKKKKKKKKssssssssssssssssssssssss.....',
  '..ssssssssssssssKKKKKKKKKKKKKKKKsssssssssssssssssssssssss.....',
  '..sssssssssssssssKKKKKKKKKKKKKKssssssssssssssssssssssssss.....',
  '..sssssssssssssssssKKKKKKKKKKssssssssssssssssssssssssssss.....',
  '..ssssssssssssssssssKKKKKKKKsssssssssssssssssssssssssssss.....',
  '..sssssssssssssssssssKKKKKKssssssssssssssssssssssssssssss.....',
  '..sssssssssssssssssssssssssssssssssssssssssssssssssssssss.....',
  '..gggGgGgGggGggGgGgGggGggGgGgGggGgGgGggGggGgGgGggGggggg.....',
  '..gGgggGgggGgGgggGgggGgGgggGgggGgGgggGgggGgGgggGgggGggg.....',
  '..gggGgGgGggGggGgGgGggGggGgGgGggGgGgGggGggGgGgGggGggggg.....',
  '..gGgggGgggGgGgggGgggGgGgggGgggGgGgggGgggGgGgggGgggGggg.....',
  '..gggGgGgGggGggGgGgGggGggGgGgGggGgGgGggGggGgGgGggGggggg.....',
  '..dddddddddddddddddddddddddddddddddddddddddddddddddddd.....',
  '..dDdddDddDdDdddDddDdDdddDddDdDdddDddDdDdddDddDdDdddDdd.....',
  '..dddddddddddddddddddddddddddddddddddddddddddddddddddd.....',
  '..dDdddDddDdDdddDddDdDdddDddDdDdddDddDdDdddDddDdDdddDdd.....',
  '..dddddddddddddddddddddddddddddddddddddddddddddddddddd.....',
  '..dddddddddddddddddddddddddddddddddddddddddddddddddddd.....',
  '..dddddddddddddddddddddddddddddddddddddddddddddddddddd.....',
  '..dddddddddddddddddddddddddddddddddddddddddddddddddddd.....',
  '..dddddddddddddddddddddddddddddddddddddddddddddddddddd.....',
  '..dddddddddddddddddddddddddddddddddddddddddddddddddddd.....',
  '..dddddddddddddddddddddddddddddddddddddddddddddddddddd.....',
  '................................................................',
];

// Scene 3: Heroes set out — sunrise, BooBonks + BoJangles on a hill
const PAL_SCENE3: Record<string, number> = {
  ...PAL_SCENE,
  s: 0xFF8866, S: 0xDD6644, // sunrise sky
  c: 0xFFAA44, C: 0xFF8822, // warm clouds
};

const SCENE_HEROES = [
  '................................................................',
  '....ssssssssssssssssssssssssssssssssssssssssssssssssssssssssss....',
  '...ssssssccccccsssssssssccccccsssssssccccccssssssssccccccsssss...',
  '..sssssccccccccccssssccccccccccssssccccccccccsscccccccccccssss...',
  '..ssscccccccccccccscccccccccccccscccccccccccccccccccccccccsss....',
  '..ssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss...',
  '..ssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss...',
  '..ssssssssssssssssssssy..ssssssssssssssssssssssssssssssssssss...',
  '..ssssssssssssssssssssssssssssssssssssssssssssssssssssssssss....',
  '..ssssssssssssssssssssssssssssssssssssssssssssssssssssssssss....',
  '..ssssssssssssssssssssssssssssssssssssssssssssssssssssssssss....',
  '..ssssssssssssssssssssssssssssssssssssssssssssssssssssssssss....',
  '..ssssssssssssssssssssssssssssssssssssssssssssssssssssssssss....',
  '..ssssssssssssssssssssssssssssssssssssssssssssssssssssssssss....',
  '..ssssssssssssssssssssssssssssssssssssssssssssssssssssssssss....',
  '..ssssssssssssssssssssssssssssssssssssssssssssssssssssssssss....',
  '..ssssssssssssssssssssssssssssssssssssssssssssssssssssssssss....',
  '..ssssssssssssssssssssssssssssssssssssssssssssssssssssssssss....',
  '..ssssssssssssssssssssssssssssssssssssssssssssssssssssssssss....',
  '..ssssssssssssssssssssssssssssssssssssssssssssssssssssssssss....',
  '..ssssssssssssssssssssssssssssssssssssssssssssssssssssssssss....',
  '..ssssssssssssssssssssssssssssssssssssssssssssssssssssssssss....',
  '..sssssssssssssssssssssssssssssssssssggGggssssssssssssssssss....',
  '..ssssssssssssssssssssssssssssssssgGGGgGGGGgsssssssssssssss....',
  '..ssssssssssssssssssssssssssssssGGGGgGGgGGGGGGsssssssssssss....',
  '..ssssssssssssssssssssssssssssGGGGGGgGGGgGGGGGGGsssssssssss....',
  '..sssssssssssssssssssssssssGGGGGGGGGgGGGGGGGGGGGGGsssssssss....',
  '..sssssssssssssssssssssssGGGGGGGGGGGGGGGGGGGGGGGGGGGsssssss....',
  '..sssssssssssssssssssssGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGsssss...',
  '..gggGgGgGggGggGgGgGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGggg...',
  '..gGgggGgggGgGgggGgGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGgg...',
  '..gggGgGgGggGggGgGgGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGggg...',
  '..gGgggGgggGgGgggGgGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGgg...',
  '..gggGgGgGggGggGgGgGggGggGgGgGggGgGgGggGggGgGgGggGgggggg.....',
  '..gGgggGgggGgGgggGgggGgGgggGgggGgGgggGgggGgGgggGgggGgggg.....',
  '..gggGgGgGggGggGgGgGggGggGgGgGggGgGgGggGggGgGgGggGgggggg.....',
  '..dddddddddddddddddddddddddddddddddddddddddddddddddddddd.....',
  '..dDdddDddDdDdddDddDdDdddDddDdDdddDddDdDdddDddDdDdddDddd.....',
  '..dddddddddddddddddddddddddddddddddddddddddddddddddddddd.....',
  '..dDdddDddDdDdddDddDdDdddDddDdDdddDddDdDdddDddDdDdddDddd.....',
  '..dddddddddddddddddddddddddddddddddddddddddddddddddddddd.....',
  '..dddddddddddddddddddddddddddddddddddddddddddddddddddddd.....',
  '..dddddddddddddddddddddddddddddddddddddddddddddddddddddd.....',
  '..dddddddddddddddddddddddddddddddddddddddddddddddddddddd.....',
  '..dddddddddddddddddddddddddddddddddddddddddddddddddddddd.....',
  '..dddddddddddddddddddddddddddddddddddddddddddddddddddddd.....',
  '..dddddddddddddddddddddddddddddddddddddddddddddddddddddd.....',
  '................................................................',
];

// ═══════════════════════════════════════
// BACKGROUND SPRITES
// ═══════════════════════════════════════

const BG_CLOUD = [
  '................................',
  '..........wwww..................',
  '.......wwwwwwwwww...............',
  '....wwwwwwwwwwwwwwww............',
  '..wwwwwwwwwwwwwwwwwwww..........',
  '.wwwwwwwwwwwwwwwwwwwwww.........',
  'wwwwwwwwwwwwwwwwwwwwwwww........',
  'wwwwwwwwwwwwwwwwwwwwwwww........',
  '.wwwwwwwwwwwwwwwwwwwwww.........',
  '...wwwwwwwwwwwwwwwwww...........',
  '................................',
  '................................',
];

const BG_HILL = [
  '..............gg................',
  '............gggggg..............',
  '..........gggggggggg............',
  '.......gggGggggggGggg..........',
  '.....gggGGggggggGGggggg........',
  '...ggggGGggggggggGGggggg.......',
  '..gggggGGgggggggGGGgggggg......',
  '.ggggggggggggggggggggggggg.....',
  'ggggggggggggggggggggggggggg....',
];

const BG_BUSH = [
  '.......gggg...........',
  '....gggGgggggg........',
  '..ggggGGGggggggg......',
  '.ggggGGGGGGgggggg.....',
  'gggggGGGGGGGggggggg...',
  'gggggggggggggggggggg..',
];

// ═══════════════════════════════════════
// FONT DATA — 5×7 binary-encoded glyphs
// Each number = one row, 5 bits wide (MSB = left pixel)
// ═══════════════════════════════════════

const FONT_DATA: Record<string, number[]> = {
  '0': [0x0E, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0E],
  '1': [0x04, 0x0C, 0x04, 0x04, 0x04, 0x04, 0x0E],
  '2': [0x0E, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1F],
  '3': [0x0E, 0x11, 0x01, 0x06, 0x01, 0x11, 0x0E],
  '4': [0x02, 0x06, 0x0A, 0x12, 0x1F, 0x02, 0x02],
  '5': [0x1F, 0x10, 0x1E, 0x01, 0x01, 0x11, 0x0E],
  '6': [0x06, 0x08, 0x10, 0x1E, 0x11, 0x11, 0x0E],
  '7': [0x1F, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  '8': [0x0E, 0x11, 0x11, 0x0E, 0x11, 0x11, 0x0E],
  '9': [0x0E, 0x11, 0x11, 0x0F, 0x01, 0x02, 0x0C],
  'A': [0x0E, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11],
  'B': [0x1E, 0x11, 0x11, 0x1E, 0x11, 0x11, 0x1E],
  'C': [0x0E, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0E],
  'D': [0x1C, 0x12, 0x11, 0x11, 0x11, 0x12, 0x1C],
  'E': [0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x1F],
  'F': [0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x10],
  'G': [0x0E, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0E],
  'H': [0x11, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11],
  'I': [0x0E, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0E],
  'J': [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0C],
  'K': [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  'L': [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1F],
  'M': [0x11, 0x1B, 0x15, 0x15, 0x11, 0x11, 0x11],
  'N': [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  'O': [0x0E, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E],
  'P': [0x1E, 0x11, 0x11, 0x1E, 0x10, 0x10, 0x10],
  'Q': [0x0E, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0D],
  'R': [0x1E, 0x11, 0x11, 0x1E, 0x14, 0x12, 0x11],
  'S': [0x0E, 0x11, 0x10, 0x0E, 0x01, 0x11, 0x0E],
  'T': [0x1F, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  'U': [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E],
  'V': [0x11, 0x11, 0x11, 0x11, 0x0A, 0x0A, 0x04],
  'W': [0x11, 0x11, 0x11, 0x15, 0x15, 0x1B, 0x11],
  'X': [0x11, 0x11, 0x0A, 0x04, 0x0A, 0x11, 0x11],
  'Y': [0x11, 0x11, 0x0A, 0x04, 0x04, 0x04, 0x04],
  'Z': [0x1F, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1F],
  ' ': [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
  '-': [0x00, 0x00, 0x00, 0x1F, 0x00, 0x00, 0x00],
  ':': [0x00, 0x04, 0x04, 0x00, 0x04, 0x04, 0x00],
  '!': [0x04, 0x04, 0x04, 0x04, 0x04, 0x00, 0x04],
  '.': [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x04],
  '+': [0x00, 0x04, 0x04, 0x1F, 0x04, 0x04, 0x00],
  'x': [0x00, 0x11, 0x0A, 0x04, 0x0A, 0x11, 0x00],
};

// ═══════════════════════════════════════════════════════════════════
// HD SPRITES — 32×32 small, 32×48 big (baked at px=1 for 4× detail)
// Same texture dimensions as normal sprites, 4× the pixel detail.
// Head rows shared between poses; bodies differ per animation frame.
// ═══════════════════════════════════════════════════════════════════

// ── HD Palettes (extended shading for each character) ──

const PAL_BB_HD: Record<string, number> = {
  '1': 0xFFDDB5, s: 0xFFCC99, S: 0xDDAA77, '2': 0xBB8855,  // skin 4-tone
  p: 0xFFCC55, b: 0xFFAA33, B: 0xDD8822, i: 0xBB7711,       // hair 4-tone
  w: 0xFFFFFF, e: 0x5599DD, k: 0x222222,                      // eyes
  h: 0xFF8899, n: 0xDD5555,                                    // blush, mouth
  c: 0xFFDDEE, o: 0xFFAACC, O: 0xEE88AA, D: 0xCC6688,        // dress 4-tone
  y: 0xFFDD00,                                                  // buttons
  l: 0xFF4444, r: 0xDD2222, R: 0xAA1111, L: 0x881111,        // boots 4-tone
};
const PAL_BB_FIRE_HD: Record<string, number> = {
  ...PAL_BB_HD,
  c: 0xFFFFFF, o: 0xEEEEEE, O: 0xCCCCCC, D: 0xAAAAAA,        // white dress
};

const PAL_BJ_HD: Record<string, number> = {
  '1': 0xFFDDB5, s: 0xFFCC99, S: 0xDDAA77, '2': 0xBB8855,
  p: 0x776644, b: 0x554422, B: 0x443311, i: 0x332200,         // dark brown hair
  w: 0xFFFFFF, e: 0x55AA55, k: 0x222222,                       // green eyes
  h: 0xFFBBAA, n: 0xDD5555,
  c: 0x4466DD, o: 0x2244CC, O: 0x1133AA, D: 0x0E2288,        // blue overalls
  y: 0xFFDD00,
  l: 0xAA7744, r: 0x885522, R: 0x664411, L: 0x443300,        // brown boots
};
const PAL_BJ_FIRE_HD: Record<string, number> = {
  ...PAL_BJ_HD,
  c: 0x55DDDD, o: 0x33BBBB, O: 0x229999, D: 0x117777,        // teal overalls
};

const PAL_CH_HD: Record<string, number> = {
  f: 0xFFFFFF, F: 0xDDDDDD, g: 0xBBBBBB, G: 0x999999,        // fur 4-tone
  k: 0x333333, K: 0x111111,                                     // dark (nose/eyes)
  w: 0xFFFFFF, p: 0x222222,                                     // eye white, pupil
  t: 0xFF6699, T: 0xDD4477,                                     // tongue
  c: 0xEE3333, C: 0xBB1111,                                     // collar
  e: 0xFFBBCC, E: 0xFFDDEE,                                     // ear pink
  n: 0x555555,                                                   // nose detail
};

// ── BooBonks HD — Head (shared rows 0-16, 17 rows) ──

const BB_HD_HEAD = [
  '................................',  // 0
  '...........bbbb.................',  // 1
  '..........bpbbbb................',  // 2
  '.........bpbbbbbbb..............',  // 3
  '........bbbbbbbbbbb.............',  // 4
  '.......bbbbbbbbbbbbbb...........',  // 5
  '......bbbbbbbbbbbbbbbbb.........',  // 6
  '.....bbbbbbbbbbbbbbbbbbb........',  // 7
  '.....bbbsssssssbbbbbbbbb........',  // 8
  '.....bbssssssssssbbbbbbbb.......',  // 9
  '.....bbskwessskwesbbbbbbb.......',  // 10
  '.....bbssshssshssbbbbbbb........',  // 11
  '......bsssssnssssbbbbbbbb.......',  // 12
  '......bssssnnssssbbbbbbbb.......',  // 13
  '.......bssssssssbbbbbbb.........',  // 14
  '........bssssssbbbbbbb..........',  // 15
  '.........soooosbbbbbb...........',  // 16
];

const BB_HD_HEAD_DEATH = [
  '................................',
  '...........bbbb.................',
  '..........bpbbbb................',
  '.........bpbbbbbbb..............',
  '........bbbbbbbbbbb.............',
  '.......bbbbbbbbbbbbbb...........',
  '......bbbbbbbbbbbbbbbbb.........',
  '.....bbbbbbbbbbbbbbbbbbb........',
  '.....bbbsssssssbbbbbbbbb........',
  '.....bbssssssssssbbbbbbbb.......',
  '.....bbskksssskksbbbbbbbb.......',  // X-eyes
  '.....bbssshssshssbbbbbbb........',
  '......bsssssnssssbbbbbbbb.......',
  '......bssssnnssssbbbbbbbb.......',
  '.......bssssssssbbbbbbb.........',
  '........bssssssbbbbbbb..........',
  '.........soooosbbbbbb...........',
];

// ── BooBonks HD — Small body parts (rows 17-31, 15 rows each) ──

const BB_HD_BODY_SM_IDLE = [
  '.........ooooooobbbbb...........',  // 17
  '......s..ooyooyoo.bbbb..........',  // 18
  '......s..ooooooooo.bbb..........',  // 19
  '.........oOooooOoo..bb..........',  // 20
  '.........oooooooooo.............',  // 21
  '........oooooooooooo............',  // 22
  '........oooDooDoooo.............',  // 23
  '.........oooooooooo.............',  // 24
  '..........sss..sss..............',  // 25
  '..........ss...ss...............',  // 26
  '.........rrr..rrr...............',  // 27
  '.........rlr..rlr...............',  // 28
  '.........rRr..rRr...............',  // 29
  '.........LLL..LLL...............',  // 30
  '................................',  // 31
];

const BB_HD_BODY_SM_WALK1 = [
  '.........ooooooobbbbb...........',
  '...ss...ooyooyoo.bbbb...........',
  '....s...ooooooooo..bbb..........',
  '.........oOooooOoo..bb..........',
  '.........oooooooooo.............',
  '........oooooooooooo............',
  '........oooDooDoooo.............',
  '.........oooooooooo.............',
  '.........sss.....sss............',
  '.........ss.......ss............',
  '........rrr......rrr............',
  '........rlr......rlr............',
  '........rRr......rRr............',
  '........LLL......LLL............',
  '................................',
];

const BB_HD_BODY_SM_WALK2 = [
  '.........ooooooobbbbb...........',
  '......s..ooyooyoo.bbbbs.........',
  '......s..ooooooooo.bbb..........',
  '.........oOooooOoo..bb..........',
  '.........oooooooooo.............',
  '........oooooooooooo............',
  '........oooDooDoooo.............',
  '.........oooooooooo.............',
  '..........sss..sss..............',
  '..........ss...ss...............',
  '.........rrr..rrr...............',
  '.........rlr..rlr...............',
  '.........rRr..rRr...............',
  '.........LLL..LLL...............',
  '................................',
];

const BB_HD_BODY_SM_JUMP = [
  '.........ooooooobbbbb...........',
  '....s...ooyooyoo.bbbb...........',
  '....s...ooooooooo.bbb...........',
  '.........oOooooOoo..bb..........',
  '.........oooooooooo.............',
  '........oooooooooooo............',
  '........oooDooDoooo.............',
  '.........oooooooooo.............',
  '..........sss..sss..............',
  '..........ss...ss...............',
  '.........rr.....rr..............',
  '.........rl.....rl..............',
  '.........rR.....rR..............',
  '.........LL.....LL..............',
  '................................',
];

const BB_HD_BODY_SM_FALL = [
  '.........ooooooobbbbb...........',
  '....s...ooyooyoo.bbbb...........',
  '......s.ooooooooo..bbb..........',
  '........oOooooOoo...............',
  '.........oooooooooo.............',
  '........oooooooooooo............',
  '........oooDooDoooo.............',
  '.........oooooooooo.............',
  '.........sss....sss.............',
  '........ss.......ss.............',
  '.......rRr.......rRr............',
  '.......rRr.......rRr............',
  '................................',
  '................................',
  '................................',
];

// Assemble small sprites by combining head + body
const BB_HD_SM_IDLE = [...BB_HD_HEAD, ...BB_HD_BODY_SM_IDLE];
const BB_HD_SM_WALK1 = [...BB_HD_HEAD, ...BB_HD_BODY_SM_WALK1];
const BB_HD_SM_WALK2 = [...BB_HD_HEAD, ...BB_HD_BODY_SM_WALK2];
const BB_HD_SM_JUMP = [...BB_HD_HEAD, ...BB_HD_BODY_SM_JUMP];
const BB_HD_SM_FALL = [...BB_HD_HEAD, ...BB_HD_BODY_SM_FALL];
const BB_HD_SM_DEATH = [...BB_HD_HEAD_DEATH, ...BB_HD_BODY_SM_IDLE];

// ── BooBonks HD — Big body parts (rows 17-47, 31 rows each) ──

const BB_HD_BODY_BG_IDLE = [
  '.........coooooobbbbb...........',  // 17
  '........coooooooobbbbb..........',  // 18
  '......s..ooyooyoo.bbbb..........',  // 19
  '......s..ooooooooo.bbb..........',  // 20
  '.........oooooooooo..bb.........',  // 21
  '.........oOooooOooo.............',  // 22
  '.........oooooooooo.............',  // 23
  '........oooooooooooo............',  // 24
  '........oooooooooooo............',  // 25
  '........oooDooDoooo.............',  // 26
  '........oooooooooooo............',  // 27
  '.........oooooooooo.............',  // 28
  '.........ooooooooo..............',  // 29
  '..........sss..sss..............',  // 30
  '..........sss..sss..............',  // 31
  '..........ss...ss...............',  // 32
  '..........ss...ss...............',  // 33
  '.........rrr..rrr...............',  // 34
  '.........rrr..rrr...............',  // 35
  '.........rlr..rlr...............',  // 36
  '.........rRR..rRR...............',  // 37
  '.........LLL..LLL...............',  // 38
  '................................',  // 39
  '................................',  // 40
  '................................',  // 41
  '................................',  // 42
  '................................',  // 43
  '................................',  // 44
  '................................',  // 45
  '................................',  // 46
  '................................',  // 47
];

const BB_HD_BODY_BG_WALK1 = [
  '.........coooooobbbbb...........',
  '........coooooooobbbbb..........',
  '...ss...ooyooyoo.bbbb...........',
  '....s...ooooooooo..bbb..........',
  '.........oooooooooo..bb.........',
  '.........oOooooOooo.............',
  '.........oooooooooo.............',
  '........oooooooooooo............',
  '........oooooooooooo............',
  '........oooDooDoooo.............',
  '........oooooooooooo............',
  '.........oooooooooo.............',
  '.........ooooooooo..............',
  '.........sss......sss...........',
  '.........sss......sss...........',
  '.........ss........ss...........',
  '.........ss........ss...........',
  '........rrr.......rrr...........',
  '........rrr.......rrr...........',
  '........rlr.......rlr...........',
  '........rRR.......rRR...........',
  '........LLL.......LLL...........',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
];

const BB_HD_BODY_BG_WALK2 = [
  '.........coooooobbbbb...........',
  '........coooooooobbbbb..........',
  '......s..ooyooyoo.bbbbs.........',
  '......s..ooooooooo.bbb..........',
  '.........oooooooooo..bb.........',
  '.........oOooooOooo.............',
  '.........oooooooooo.............',
  '........oooooooooooo............',
  '........oooooooooooo............',
  '........oooDooDoooo.............',
  '........oooooooooooo............',
  '.........oooooooooo.............',
  '.........ooooooooo..............',
  '..........sss..sss..............',
  '..........sss..sss..............',
  '..........ss...ss...............',
  '..........ss...ss...............',
  '.........rrr..rrr...............',
  '.........rrr..rrr...............',
  '.........rlr..rlr...............',
  '.........rRR..rRR...............',
  '.........LLL..LLL...............',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
];

const BB_HD_BODY_BG_JUMP = [
  '.........coooooobbbbb...........',
  '........coooooooobbbbb..........',
  '....s...ooyooyoo.bbbb...........',
  '....s...ooooooooo.bbb...........',
  '.........oooooooooo..bb.........',
  '.........oOooooOooo.............',
  '.........oooooooooo.............',
  '........oooooooooooo............',
  '........oooooooooooo............',
  '........oooDooDoooo.............',
  '........oooooooooooo............',
  '.........oooooooooo.............',
  '.........ooooooooo..............',
  '..........sss..sss..............',
  '..........sss..sss..............',
  '..........ss...ss...............',
  '..........ss...ss...............',
  '.........rr.....rr..............',
  '.........rr.....rr..............',
  '.........rl.....rl..............',
  '.........rR.....rR..............',
  '.........LL.....LL..............',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
];

const BB_HD_BODY_BG_FALL = [
  '.........coooooobbbbb...........',
  '........coooooooobbbbb..........',
  '....s...ooyooyoo.bbbb...........',
  '......s.ooooooooo..bbb..........',
  '.........oooooooooo.............',
  '.........oOooooOooo.............',
  '.........oooooooooo.............',
  '........oooooooooooo............',
  '........oooooooooooo............',
  '........oooDooDoooo.............',
  '........oooooooooooo............',
  '.........oooooooooo.............',
  '.........ooooooooo..............',
  '.........sss....sss.............',
  '.........sss....sss.............',
  '........ss.......ss.............',
  '........ss.......ss.............',
  '.......rRr.......rRr............',
  '.......rRr.......rRr............',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
];

const BB_HD_BG_IDLE = [...BB_HD_HEAD, ...BB_HD_BODY_BG_IDLE];
const BB_HD_BG_WALK1 = [...BB_HD_HEAD, ...BB_HD_BODY_BG_WALK1];
const BB_HD_BG_WALK2 = [...BB_HD_HEAD, ...BB_HD_BODY_BG_WALK2];
const BB_HD_BG_JUMP = [...BB_HD_HEAD, ...BB_HD_BODY_BG_JUMP];
const BB_HD_BG_FALL = [...BB_HD_HEAD, ...BB_HD_BODY_BG_FALL];
const BB_HD_BG_DEATH = [...BB_HD_HEAD_DEATH, ...BB_HD_BODY_BG_IDLE];

// ═══════════════════════════════════════
// BOJANGLES HD SPRITES
// ═══════════════════════════════════════

const BJ_HD_HEAD = [
  '................................',
  '...........bbbb.................',
  '..........bbbbbb................',
  '.........bpbbbbbb...............',
  '........bbbbbbbbbb..............',
  '.......bbbbbbbbbbbb.............',
  '......bbbbbbbbbbbbbb............',
  '......bbbbbbbbbbbbbbb...........',
  '......bbbsssssssbbbbb...........',
  '......bbssssssssssbbbb..........',
  '......bbskwessskwesbbbb.........',
  '......bbssshssshssbbbb..........',
  '.......bsssssnssssbbbb..........',
  '.......bssssnnssssbbbb..........',
  '........bssssssssbbbbb..........',
  '.........bssssssbbbbb...........',
  '..........soooosbbbbb...........',
];

const BJ_HD_HEAD_DEATH = [
  '................................',
  '...........bbbb.................',
  '..........bbbbbb................',
  '.........bpbbbbbb...............',
  '........bbbbbbbbbb..............',
  '.......bbbbbbbbbb...............',
  '......bbbbbbbbbbbbbb............',
  '......bbbbbbbbbbbbbbb...........',
  '......bbbsssssssbbbbb...........',
  '......bbssssssssssbbbb..........',
  '......bbskksssskksbbbbb.........',
  '......bbssshssshssbbbb..........',
  '.......bsssssnssssbbbb..........',
  '.......bssssnnssssbbbb..........',
  '........bssssssssbbbbb..........',
  '.........bssssssbbbbb...........',
  '..........soooosbbbbb...........',
];

const BJ_HD_BODY_SM_IDLE = [
  '..........ooooooo...............',
  '.......s..ooyooyoo..............',
  '.......s..ooooooooo.............',
  '..........ooOooOooo.............',
  '..........ooooooooo.............',
  '.........ooooooooooo............',
  '.........oooDooDoooo............',
  '..........ooooooooo.............',
  '...........sss..sss.............',
  '...........ss...ss..............',
  '..........rrr..rrr..............',
  '..........rlr..rlr..............',
  '..........rRr..rRr..............',
  '..........LLL..LLL..............',
  '................................',
];

const BJ_HD_BODY_SM_WALK1 = [
  '..........ooooooo...............',
  '....ss...ooyooyoo...............',
  '.....s...ooooooooo..............',
  '..........ooOooOooo.............',
  '..........ooooooooo.............',
  '.........ooooooooooo............',
  '.........oooDooDoooo............',
  '..........ooooooooo.............',
  '..........sss....sss............',
  '..........ss......ss............',
  '.........rrr.....rrr............',
  '.........rlr.....rlr............',
  '.........rRr.....rRr............',
  '.........LLL.....LLL............',
  '................................',
];

const BJ_HD_BODY_SM_WALK2 = [
  '..........ooooooo...............',
  '.......s..ooyooyoo..........s...',
  '.......s..ooooooooo.............',
  '..........ooOooOooo.............',
  '..........ooooooooo.............',
  '.........ooooooooooo............',
  '.........oooDooDoooo............',
  '..........ooooooooo.............',
  '...........sss..sss.............',
  '...........ss...ss..............',
  '..........rrr..rrr..............',
  '..........rlr..rlr..............',
  '..........rRr..rRr..............',
  '..........LLL..LLL..............',
  '................................',
];

const BJ_HD_BODY_SM_JUMP = [
  '..........ooooooo...............',
  '.....s...ooyooyoo...............',
  '.....s...ooooooooo..............',
  '..........ooOooOooo.............',
  '..........ooooooooo.............',
  '.........ooooooooooo............',
  '.........oooDooDoooo............',
  '..........ooooooooo.............',
  '...........sss..sss.............',
  '...........ss...ss..............',
  '..........rr.....rr.............',
  '..........rl.....rl.............',
  '..........rR.....rR.............',
  '..........LL.....LL.............',
  '................................',
];

const BJ_HD_BODY_SM_FALL = [
  '..........ooooooo...............',
  '.....s...ooyooyoo...............',
  '.......s.ooooooooo..............',
  '..........ooOooOoo..............',
  '..........ooooooooo.............',
  '.........ooooooooooo............',
  '.........oooDooDoooo............',
  '..........ooooooooo.............',
  '..........sss....sss............',
  '.........ss.......ss............',
  '........rRr.......rRr...........',
  '........rRr.......rRr...........',
  '................................',
  '................................',
  '................................',
];

const BJ_HD_SM_IDLE = [...BJ_HD_HEAD, ...BJ_HD_BODY_SM_IDLE];
const BJ_HD_SM_WALK1 = [...BJ_HD_HEAD, ...BJ_HD_BODY_SM_WALK1];
const BJ_HD_SM_WALK2 = [...BJ_HD_HEAD, ...BJ_HD_BODY_SM_WALK2];
const BJ_HD_SM_JUMP = [...BJ_HD_HEAD, ...BJ_HD_BODY_SM_JUMP];
const BJ_HD_SM_FALL = [...BJ_HD_HEAD, ...BJ_HD_BODY_SM_FALL];
const BJ_HD_SM_DEATH = [...BJ_HD_HEAD_DEATH, ...BJ_HD_BODY_SM_IDLE];

// BoJangles big bodies
const BJ_HD_BODY_BG_IDLE = [
  '..........coooooo...............',
  '.........cooooooooo.............',
  '.......s..ooyooyoo..............',
  '.......s..ooooooooo.............',
  '..........oooooooooo............',
  '..........oOooooOooo............',
  '..........oooooooooo............',
  '.........ooooooooooo............',
  '.........ooooooooooo............',
  '.........oooDooDoooo............',
  '.........ooooooooooo............',
  '..........ooooooooo.............',
  '..........oooooooo..............',
  '...........sss..sss.............',
  '...........sss..sss.............',
  '...........ss...ss..............',
  '...........ss...ss..............',
  '..........rrr..rrr..............',
  '..........rrr..rrr..............',
  '..........rlr..rlr..............',
  '..........rRR..rRR..............',
  '..........LLL..LLL..............',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
];

const BJ_HD_BODY_BG_WALK1 = [
  '..........coooooo...............',
  '.........cooooooooo.............',
  '....ss...ooyooyoo...............',
  '.....s...ooooooooo..............',
  '..........oooooooooo............',
  '..........oOooooOooo............',
  '..........oooooooooo............',
  '.........ooooooooooo............',
  '.........ooooooooooo............',
  '.........oooDooDoooo............',
  '.........ooooooooooo............',
  '..........ooooooooo.............',
  '..........oooooooo..............',
  '..........sss......sss..........',
  '..........sss......sss..........',
  '..........ss........ss..........',
  '..........ss........ss..........',
  '.........rrr.......rrr..........',
  '.........rrr.......rrr..........',
  '.........rlr.......rlr..........',
  '.........rRR.......rRR..........',
  '.........LLL.......LLL..........',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
];

const BJ_HD_BODY_BG_WALK2 = [...BJ_HD_BODY_BG_IDLE]; // same pose as idle for walk2
const BJ_HD_BODY_BG_JUMP = [
  '..........coooooo...............',
  '.........cooooooooo.............',
  '.....s...ooyooyoo...............',
  '.....s...ooooooooo..............',
  '..........oooooooooo............',
  '..........oOooooOooo............',
  '..........oooooooooo............',
  '.........ooooooooooo............',
  '.........ooooooooooo............',
  '.........oooDooDoooo............',
  '.........ooooooooooo............',
  '..........ooooooooo.............',
  '..........oooooooo..............',
  '...........sss..sss.............',
  '...........sss..sss.............',
  '...........ss...ss..............',
  '...........ss...ss..............',
  '..........rr.....rr.............',
  '..........rr.....rr.............',
  '..........rl.....rl.............',
  '..........rR.....rR.............',
  '..........LL.....LL.............',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
];

const BJ_HD_BODY_BG_FALL = [
  '..........coooooo...............',
  '.........cooooooooo.............',
  '.....s...ooyooyoo...............',
  '.......s.ooooooooo..............',
  '..........oooooooooo............',
  '..........oOooooOooo............',
  '..........oooooooooo............',
  '.........ooooooooooo............',
  '.........ooooooooooo............',
  '.........oooDooDoooo............',
  '.........ooooooooooo............',
  '..........ooooooooo.............',
  '..........oooooooo..............',
  '..........sss....sss............',
  '..........sss....sss............',
  '.........ss.......ss............',
  '.........ss.......ss............',
  '........rRr.......rRr...........',
  '........rRr.......rRr...........',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
];

const BJ_HD_BG_IDLE = [...BJ_HD_HEAD, ...BJ_HD_BODY_BG_IDLE];
const BJ_HD_BG_WALK1 = [...BJ_HD_HEAD, ...BJ_HD_BODY_BG_WALK1];
const BJ_HD_BG_WALK2 = [...BJ_HD_HEAD, ...BJ_HD_BODY_BG_WALK2];
const BJ_HD_BG_JUMP = [...BJ_HD_HEAD, ...BJ_HD_BODY_BG_JUMP];
const BJ_HD_BG_FALL = [...BJ_HD_HEAD, ...BJ_HD_BODY_BG_FALL];
const BJ_HD_BG_DEATH = [...BJ_HD_HEAD_DEATH, ...BJ_HD_BODY_BG_IDLE];

// ═══════════════════════════════════════
// CHONK HD SPRITES (dog — completely different body shape)
// ═══════════════════════════════════════

const CH_HD_SM_IDLE = [
  '................................',
  '....ee......ee..................',
  '...efFe....efFe.................',
  '...eFFFe..eFFFe.................',
  '...effffffffffe.................',
  '..fffffffffffffe................',
  '.ffwpfffffffwpff................',
  '.ffffkkkfffffff.................',
  '..fffftttfffff..................',
  '..ffffffFFFFFF..................',
  '...cccccccccccc.................',
  '..fffffffffffffffe..............',
  '.ffffffffffffffffff.............',
  '.ffFfffffffFfffff...............',
  '.fffffffffffffffffff............',
  '..fffffffffffffffffff...........',
  '...ffffffffffffffffff...........',
  '....ffffffffffffffff............',
  '......ff..fff..fff..............',
  '......ff..fff..fff..............',
  '......ff..fff..fff..............',
  '.....gFf..gFf..gFf..............',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
];

const CH_HD_SM_WALK1 = [
  '................................',
  '....ee......ee..................',
  '...efFe....efFe.................',
  '...eFFFe..eFFFe.................',
  '...effffffffffe.................',
  '..fffffffffffffe................',
  '.ffwpfffffffwpff................',
  '.ffffkkkfffffff.................',
  '..fffftttfffff..................',
  '..ffffffFFFFFF..................',
  '...cccccccccccc.................',
  '..fffffffffffffffe..............',
  '.ffffffffffffffffff.............',
  '.ffFfffffffFfffff...............',
  '.fffffffffffffffffff............',
  '..fffffffffffffffffff...........',
  '...ffffffffffffffffff...........',
  '....ffffffffffffffff............',
  '.....ff...fff....fff............',
  '.....ff...fff....fff............',
  '.....ff...fff....fff............',
  '....gFf...gFf....gFf............',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
];

const CH_HD_SM_WALK2 = [...CH_HD_SM_IDLE]; // same as idle for walk2 alternation

const CH_HD_SM_JUMP = [
  '................................',
  '....ee......ee..................',
  '...efFe....efFe.................',
  '...eFFFe..eFFFe.................',
  '...effffffffffe.................',
  '..fffffffffffffe................',
  '.ffwpfffffffwpff................',
  '.ffffkkkfffffff.................',
  '..fffftttfffff..................',
  '..ffffffFFFFFF..................',
  '...cccccccccccc.................',
  '..fffffffffffffffe..............',
  '.ffffffffffffffffff.............',
  '.ffFfffffffFfffff...............',
  '.fffffffffffffffffff............',
  '..fffffffffffffffffff...........',
  '...ffffffffffffffffff...........',
  '....ffffffffffffffff............',
  '......ff..fff..fff..............',
  '......ff..fff..fff..............',
  '.....gFf..gFf..gFf..............',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
];

const CH_HD_SM_FALL = [...CH_HD_SM_JUMP];

const CH_HD_SM_FLUTTER = [
  '................................',
  '...eee.....eee..................',
  '..eefFe...eefFe.................',
  '..eeFFFe..eeFFFe................',
  '...effffffffffe.................',
  '..fffffffffffffe................',
  '.ffwpfffffffwpff................',
  '.ffffkkkfffffff.................',
  '..fffftttfffff..................',
  '..ffffffFFFFFF..................',
  '...cccccccccccc.................',
  '..fffffffffffffffe..............',
  '.ffffffffffffffffff.............',
  '.ffFfffffffFfffff...............',
  '.fffffffffffffffffff............',
  '..fffffffffffffffffff...........',
  '...ffffffffffffffffff...........',
  '....ffffffffffffffff............',
  '......ff..fff..fff..............',
  '.......f...ff...ff..............',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
];

const CH_HD_SM_TONGUE = [
  '................................',
  '....ee......ee..................',
  '...efFe....efFe.................',
  '...eFFFe..eFFFe.................',
  '...effffffffffe.................',
  '..fffffffffffffe................',
  '.ffwpfffffffwpff................',
  '.ffffkkkfffffff.................',
  '..fffftttttttfffff..............',
  '..ffffffFFFFFF..................',
  '...cccccccccccc.................',
  '..fffffffffffffffe..............',
  '.ffffffffffffffffff.............',
  '.ffFfffffffFfffff...............',
  '.fffffffffffffffffff............',
  '..fffffffffffffffffff...........',
  '...ffffffffffffffffff...........',
  '....ffffffffffffffff............',
  '......ff..fff..fff..............',
  '......ff..fff..fff..............',
  '......ff..fff..fff..............',
  '.....gFf..gFf..gFf..............',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
];

const CH_HD_SM_DEATH = [
  '................................',
  '....ee......ee..................',
  '...efFe....efFe.................',
  '...eFFFe..eFFFe.................',
  '...effffffffffe.................',
  '..fffffffffffffe................',
  '.ffkpfffffffkpff................',
  '.ffffkkkfffffff.................',
  '..fffftttfffff..................',
  '..ffffffFFFFFF..................',
  '...cccccccccccc.................',
  '..fffffffffffffffe..............',
  '.ffffffffffffffffff.............',
  '.ffFfffffffFfffff...............',
  '.fffffffffffffffffff............',
  '..fffffffffffffffffff...........',
  '...ffffffffffffffffff...........',
  '....ffffffffffffffff............',
  '......ff..fff..fff..............',
  '......ff..fff..fff..............',
  '......ff..fff..fff..............',
  '.....gFf..gFf..gFf..............',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
];

// Chonk big sprites (32x48) — taller body
const CH_HD_BG_IDLE = [
  '................................',
  '....ee......ee..................',
  '...efFe....efFe.................',
  '...eFFFe..eFFFe.................',
  '...effffffffffe.................',
  '..fffffffffffffe................',
  '.ffwpfffffffwpff................',
  '.ffffkkkfffffff.................',
  '..fffftttfffff..................',
  '..ffffffFFFFFF..................',
  '...cccccccccccc.................',
  '..fffffffffffffffe..............',
  '.ffffffffffffffffff.............',
  '.fffffffffffffffffff............',
  '.ffFfffffffFffffff..............',
  '.fffffffffffffffffff............',
  '..fffffffffffffffffff...........',
  '..fffffffffffffffffff...........',
  '...ffffffffffffffffff...........',
  '...ffffffffffffffffff...........',
  '....ffffffffffffffff............',
  '....ffffffffffffffff............',
  '.....fffffffffffff..............',
  '......ff..fff..fff..............',
  '......ff..fff..fff..............',
  '......ff..fff..fff..............',
  '......ff..fff..fff..............',
  '......ff..fff..fff..............',
  '.....gFf..gFf..gFf..............',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
];

const CH_HD_BG_WALK1 = [...CH_HD_BG_IDLE]; // share for now
const CH_HD_BG_WALK2 = [...CH_HD_BG_IDLE];
const CH_HD_BG_JUMP = [...CH_HD_BG_IDLE];
const CH_HD_BG_FALL = [...CH_HD_BG_IDLE];
const CH_HD_BG_FLUTTER = [...CH_HD_BG_IDLE];
const CH_HD_BG_TONGUE = [...CH_HD_BG_IDLE];
const CH_HD_BG_DEATH = [...CH_HD_BG_IDLE];

// ═══════════════════════════════════════
// TEXTURE BAKING
// ═══════════════════════════════════════

const cache: Record<string, Texture> = {};

function bake(app: Application, data: string[], palette: Record<string, number>): Texture {
  const h = data.length;
  const w = data[0].length;
  const g = new Graphics();
  // Ensure non-empty bounds even if all pixels are transparent
  g.rect(0, 0, w * PX, h * PX).fill({ color: 0x000000, alpha: 0.001 });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = data[y]?.[x];
      if (!ch || ch === '.') continue;
      const color = palette[ch];
      if (color === undefined) continue;
      g.rect(x * PX, y * PX, PX, PX).fill({ color });
    }
  }
  const texture = app.renderer.generateTexture({ target: g, resolution: 1 });
  texture.source.scaleMode = 'nearest';
  g.destroy();
  return texture;
}

/** HD bake: each art pixel = 1 screen pixel (vs PX=2 for normal sprites).
 *  32x32 HD art → 32x32 texture (same size as 16x16 normal, but 4x detail). */
function bakeHD(app: Application, data: string[], palette: Record<string, number>): Texture {
  const h = data.length;
  const w = data[0].length;
  const g = new Graphics();
  g.rect(0, 0, w, h).fill({ color: 0x000000, alpha: 0.001 });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = data[y]?.[x];
      if (!ch || ch === '.') continue;
      const color = palette[ch];
      if (color === undefined) continue;
      g.rect(x, y, 1, 1).fill({ color });
    }
  }
  const texture = app.renderer.generateTexture({ target: g, resolution: 1 });
  texture.source.scaleMode = 'nearest';
  g.destroy();
  return texture;
}

function bakeGlyph(app: Application, bits: number[], color: number): Texture {
  const g = new Graphics();
  // Ensure non-empty bounds (space char has all-zero bits)
  g.rect(0, 0, FONT_W * PX, FONT_H * PX).fill({ color: 0x000000, alpha: 0.001 });
  for (let y = 0; y < bits.length; y++) {
    for (let x = 0; x < 5; x++) {
      if (bits[y] & (1 << (4 - x))) {
        g.rect(x * PX, y * PX, PX, PX).fill({ color });
      }
    }
  }
  const texture = app.renderer.generateTexture({ target: g, resolution: 1 });
  texture.source.scaleMode = 'nearest';
  g.destroy();
  return texture;
}

// ═══════════════════════════════════════
// INIT — bakes ALL textures into cache
// ═══════════════════════════════════════

export function initBonksTextures(app: Application): void {
  // Helper to bake a set of frames for a character with a given palette
  const bakeChar = (prefix: string, pal: Record<string, number>, frames: Record<string, string[]>) => {
    for (const [name, data] of Object.entries(frames)) {
      cache[`${prefix}-${name}`] = bake(app, data, pal);
    }
  };

  // ── BooBonks ──
  bakeChar('bb-sm', PAL_BOOBONKS, {
    idle: BB_SM_IDLE, walk1: BB_SM_WALK1, walk2: BB_SM_WALK2,
    jump: BB_SM_JUMP, fall: BB_SM_FALL, death: BB_SM_DEATH,
  });
  bakeChar('bb-bg', PAL_BOOBONKS, {
    idle: BB_BG_IDLE, walk1: BB_BG_WALK1, walk2: BB_BG_WALK2,
    jump: BB_BG_JUMP, fall: BB_BG_FALL, death: BB_BG_DEATH,
  });
  bakeChar('bb-fire', PAL_BOOBONKS_FIRE, {
    idle: BB_BG_IDLE, walk1: BB_BG_WALK1, walk2: BB_BG_WALK2,
    jump: BB_BG_JUMP, fall: BB_BG_FALL, death: BB_BG_DEATH,
  });

  // ── BoJangles ──
  bakeChar('bj-sm', PAL_BOJANGLES, {
    idle: BJ_SM_IDLE, walk1: BJ_SM_WALK1, walk2: BJ_SM_WALK2,
    jump: BJ_SM_JUMP, fall: BJ_SM_FALL, death: BJ_SM_DEATH,
  });
  bakeChar('bj-bg', PAL_BOJANGLES, {
    idle: BJ_BG_IDLE, walk1: BJ_BG_WALK1, walk2: BJ_BG_WALK2,
    jump: BJ_BG_JUMP, fall: BJ_BG_FALL, death: BJ_BG_DEATH,
  });
  bakeChar('bj-fire', PAL_BOJANGLES_FIRE, {
    idle: BJ_BG_IDLE, walk1: BJ_BG_WALK1, walk2: BJ_BG_WALK2,
    jump: BJ_BG_JUMP, fall: BJ_BG_FALL, death: BJ_BG_DEATH,
  });

  // ── Chonk ──
  bakeChar('ch-sm', PAL_CHONK, {
    idle: CH_SM_IDLE, walk1: CH_SM_WALK1, walk2: CH_SM_WALK2,
    jump: CH_SM_JUMP, fall: CH_SM_FALL, death: CH_SM_DEATH,
    flutter: CH_SM_FLUTTER, tongue: CH_SM_TONGUE,
  });
  bakeChar('ch-bg', PAL_CHONK, {
    idle: CH_BG_IDLE, walk1: CH_BG_WALK1, walk2: CH_BG_WALK2,
    jump: CH_BG_JUMP, fall: CH_BG_FALL, death: CH_BG_DEATH,
    flutter: CH_BG_FLUTTER, tongue: CH_BG_TONGUE,
  });

  // ── HD overrides (same cache keys, higher detail) ──
  const bakeCharHD = (prefix: string, pal: Record<string, number>, frames: Record<string, string[]>) => {
    for (const [name, data] of Object.entries(frames)) {
      cache[`${prefix}-${name}`] = bakeHD(app, data, pal);
    }
  };

  bakeCharHD('bb-sm', PAL_BB_HD, {
    idle: BB_HD_SM_IDLE, walk1: BB_HD_SM_WALK1, walk2: BB_HD_SM_WALK2,
    jump: BB_HD_SM_JUMP, fall: BB_HD_SM_FALL, death: BB_HD_SM_DEATH,
  });
  bakeCharHD('bb-bg', PAL_BB_HD, {
    idle: BB_HD_BG_IDLE, walk1: BB_HD_BG_WALK1, walk2: BB_HD_BG_WALK2,
    jump: BB_HD_BG_JUMP, fall: BB_HD_BG_FALL, death: BB_HD_BG_DEATH,
  });
  bakeCharHD('bb-fire', PAL_BB_FIRE_HD, {
    idle: BB_HD_BG_IDLE, walk1: BB_HD_BG_WALK1, walk2: BB_HD_BG_WALK2,
    jump: BB_HD_BG_JUMP, fall: BB_HD_BG_FALL, death: BB_HD_BG_DEATH,
  });

  bakeCharHD('bj-sm', PAL_BJ_HD, {
    idle: BJ_HD_SM_IDLE, walk1: BJ_HD_SM_WALK1, walk2: BJ_HD_SM_WALK2,
    jump: BJ_HD_SM_JUMP, fall: BJ_HD_SM_FALL, death: BJ_HD_SM_DEATH,
  });
  bakeCharHD('bj-bg', PAL_BJ_HD, {
    idle: BJ_HD_BG_IDLE, walk1: BJ_HD_BG_WALK1, walk2: BJ_HD_BG_WALK2,
    jump: BJ_HD_BG_JUMP, fall: BJ_HD_BG_FALL, death: BJ_HD_BG_DEATH,
  });
  bakeCharHD('bj-fire', PAL_BJ_FIRE_HD, {
    idle: BJ_HD_BG_IDLE, walk1: BJ_HD_BG_WALK1, walk2: BJ_HD_BG_WALK2,
    jump: BJ_HD_BG_JUMP, fall: BJ_HD_BG_FALL, death: BJ_HD_BG_DEATH,
  });

  bakeCharHD('ch-sm', PAL_CH_HD, {
    idle: CH_HD_SM_IDLE, walk1: CH_HD_SM_WALK1, walk2: CH_HD_SM_WALK2,
    jump: CH_HD_SM_JUMP, fall: CH_HD_SM_FALL, death: CH_HD_SM_DEATH,
    flutter: CH_HD_SM_FLUTTER, tongue: CH_HD_SM_TONGUE,
  });
  bakeCharHD('ch-bg', PAL_CH_HD, {
    idle: CH_HD_BG_IDLE, walk1: CH_HD_BG_WALK1, walk2: CH_HD_BG_WALK2,
    jump: CH_HD_BG_JUMP, fall: CH_HD_BG_FALL, death: CH_HD_BG_DEATH,
    flutter: CH_HD_BG_FLUTTER, tongue: CH_HD_BG_TONGUE,
  });

  // ── Enemies ──
  cache['enemy-goomba-walk1'] = bake(app, GOOMBA_WALK1, PAL_GOOMBA);
  cache['enemy-goomba-walk2'] = bake(app, GOOMBA_WALK2, PAL_GOOMBA);
  cache['enemy-goomba-squish'] = bake(app, GOOMBA_SQUISH, PAL_GOOMBA);
  cache['enemy-koopa-walk1'] = bake(app, KOOPA_WALK1, PAL_KOOPA);
  cache['enemy-koopa-walk2'] = bake(app, KOOPA_WALK2, PAL_KOOPA);
  cache['enemy-koopa-shell'] = bake(app, KOOPA_SHELL, PAL_KOOPA);
  cache['enemy-buzzer-fly1'] = bake(app, BUZZER_FLY1, PAL_BUZZER);
  cache['enemy-buzzer-fly2'] = bake(app, BUZZER_FLY2, PAL_BUZZER);
  cache['enemy-spike-roll1'] = bake(app, SPIKE_ROLL1, PAL_SPIKEBALL);
  cache['enemy-spike-roll2'] = bake(app, SPIKE_ROLL2, PAL_SPIKEBALL);

  // ── Tiles (green theme) ──
  cache['tile-ground'] = bake(app, TILE_GROUND, PAL_TILES);
  cache['tile-brick'] = bake(app, TILE_BRICK, PAL_TILES);
  cache['tile-question1'] = bake(app, TILE_QUESTION1, PAL_TILES);
  cache['tile-question2'] = bake(app, TILE_QUESTION2, PAL_TILES);
  cache['tile-used'] = bake(app, TILE_USED, PAL_TILES);
  cache['tile-pipe-top'] = bake(app, TILE_PIPE_TOP, PAL_TILES);
  cache['tile-pipe-body'] = bake(app, TILE_PIPE_BODY, PAL_TILES);
  cache['tile-platform'] = bake(app, TILE_PLATFORM, PAL_TILES);
  cache['tile-checkpoint'] = bake(app, TILE_CHECKPOINT, PAL_TILES);
  cache['tile-lava'] = bake(app, TILE_LAVA, PAL_TILES);

  // Tiles (cave theme)
  cache['tile-cave-ground'] = bake(app, TILE_GROUND, PAL_TILES_CAVE);
  cache['tile-cave-brick'] = bake(app, TILE_BRICK, PAL_TILES_CAVE);

  // Tiles (castle theme)
  cache['tile-castle-ground'] = bake(app, TILE_GROUND, PAL_TILES_CASTLE);
  cache['tile-castle-brick'] = bake(app, TILE_BRICK, PAL_TILES_CASTLE);

  // ── Items ──
  cache['item-mushroom'] = bake(app, ITEM_MUSHROOM, PAL_ITEMS);
  cache['item-flower'] = bake(app, ITEM_FIRE_FLOWER, PAL_ITEMS);
  cache['item-star'] = bake(app, ITEM_STAR, PAL_ITEMS);
  cache['item-1up'] = bake(app, ITEM_1UP, PAL_ITEMS);
  cache['item-treat'] = bake(app, ITEM_DOG_TREAT, PAL_ITEMS);
  cache['item-coin'] = bake(app, ITEM_COIN, PAL_ITEMS);

  // ── Effects ──
  const fxPal = { b: 0x8B4513, B: 0x6B3513, y: 0xFFDD00, Y: 0xFFAA00, w: 0xFFFFFF, W: 0xDDDDDD, o: 0xFF8833, g: 0x44BB44, G: 0x228822, r: 0xDD2222 };
  cache['fx-debris'] = bake(app, FX_DEBRIS, fxPal);
  cache['fx-stomp'] = bake(app, FX_STOMP, fxPal);
  cache['fx-dust1'] = bake(app, FX_DUST1, fxPal);
  cache['fx-dust2'] = bake(app, FX_DUST2, fxPal);
  cache['fx-dust3'] = bake(app, FX_DUST3, fxPal);
  cache['fx-sparkle1'] = bake(app, FX_SPARKLE1, fxPal);
  cache['fx-sparkle2'] = bake(app, FX_SPARKLE2, fxPal);
  cache['fx-sparkle3'] = bake(app, FX_SPARKLE3, fxPal);
  cache['fx-feather'] = bake(app, FX_FEATHER, fxPal);
  cache['fx-fireball'] = bake(app, FX_FIREBALL, fxPal);
  cache['fx-spit'] = bake(app, FX_SPIT, fxPal);

  // ── HUD icons ──
  const hudPal = { r: 0xFF3333, y: 0xFFDD00, Y: 0xDDCC00, w: 0xFFFFFF, k: 0x222222 };
  cache['hud-heart'] = bake(app, HUD_HEART, hudPal);
  cache['hud-coin'] = bake(app, HUD_COIN_ICON, hudPal);
  cache['hud-clock'] = bake(app, HUD_CLOCK, hudPal);

  // ── Portraits ──
  cache['portrait-bb'] = bake(app, PORTRAIT_BB, PAL_BOOBONKS);
  cache['portrait-bj'] = bake(app, PORTRAIT_BJ, PAL_BOJANGLES);
  cache['portrait-ch'] = bake(app, PORTRAIT_CH, PAL_CHONK);

  // ── Background sprites ──
  const bgPal = { w: 0xFFFFFF, g: 0x55BB33, G: 0x44AA22 };
  cache['bg-cloud'] = bake(app, BG_CLOUD, bgPal);
  cache['bg-hill'] = bake(app, BG_HILL, bgPal);
  cache['bg-bush'] = bake(app, BG_BUSH, bgPal);

  // ── UI sprites ──
  const uiPal = { y: 0xFFDD00, Y: 0xDDCC00 };
  cache['ui-cursor'] = bake(app, UI_CURSOR, uiPal);

  // ── Cinematic scenes ──
  cache['scene-village'] = bake(app, SCENE_VILLAGE, PAL_SCENE);
  cache['scene-villain'] = bake(app, SCENE_VILLAIN, PAL_SCENE2);
  cache['scene-heroes'] = bake(app, SCENE_HEROES, PAL_SCENE3);

  // ── Font ──
  const FONT_COLOR = 0xFFFFFF;
  for (const [ch, bits] of Object.entries(FONT_DATA)) {
    cache[`font-${ch}`] = bakeGlyph(app, bits, FONT_COLOR);
  }
  // Also bake a gold variant for score popups
  for (const [ch, bits] of Object.entries(FONT_DATA)) {
    cache[`font-gold-${ch}`] = bakeGlyph(app, bits, 0xFFDD00);
  }
}

// ═══════════════════════════════════════
// ACCESSOR
// ═══════════════════════════════════════

export function tex(name: string): Texture {
  return cache[name];
}

export function hasTex(name: string): boolean {
  return name in cache;
}
