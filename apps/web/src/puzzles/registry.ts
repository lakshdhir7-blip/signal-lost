import type { PuzzleId } from '@signal-lost/shared/puzzle-ids';
import { PUZZLE_META } from '@signal-lost/shared/puzzle-ids';
import type { PuzzleDefinition } from './types';
import { BinaryPuzzle } from './binary/BinaryPuzzle';
import { HtmlPuzzle } from './html/HtmlPuzzle';
import { PasswordCheckerPuzzle } from './python/PasswordCheckerPuzzle';
import { PalindromePuzzle } from './python/PalindromePuzzle';
import { BlocklyPuzzle } from './blockly/BlocklyPuzzle';

/**
 * Single source of truth for all 5 puzzles. Each kind gets real validators
 * and components in Phases 1-3; Phase 0 uses PlaceholderPuzzle for all.
 */
export const PUZZLE_REGISTRY: Record<PuzzleId, PuzzleDefinition> = {
  p1: {
    id: 'p1',
    title: 'Animal Encyclopedia',
    kind: PUZZLE_META.p1.kind,
    codeWord: PUZZLE_META.p1.codeWord,
    storyBriefing:
      'GLITCH ate the zoo pages. Fix the encyclopedia or every animal page on the web goes blank.',
    redHerrings: [
      'Browser Console shows 5 warnings but only 4 are real errors.',
      "Style Guide mentions indentation and lowercase tags; only 'close all tags' matters here.",
    ],
    hintContext: 'HTML debug puzzle with 4 structural errors.',
    fallbackHints: [
      'Every tag that opens needs a matching tag that closes with a slash. Count carefully.',
      'Three mistakes are on closing tags (think: h1, li, td). The fourth is near the bottom.',
      'Look at the last few lines. One tag is missing a slash. And one section of HTML is sitting outside where it should be.',
    ],
    component: HtmlPuzzle,
  },
  p2: {
    id: 'p2',
    title: 'Beacon Code',
    kind: PUZZLE_META.p2.kind,
    codeWord: PUZZLE_META.p2.codeWord,
    storyBriefing:
      "GLITCH's beacon uses a password-strength rule. Write the check and we can trace him.",
    redHerrings: [
      'Security Policy Archive has 12 rules; only 3 are real.',
      "A teammate's 'employee suggestions' are noise.",
      'An unused is_emoji() stub sits at the top; ignore it.',
    ],
    hintContext: 'Password checker returning STRONG/MEDIUM/WEAK. Order-sensitive if chain.',
    fallbackHints: [
      'STRONG needs FOUR things at once. MEDIUM needs only TWO. Otherwise WEAK.',
      'You need three checks on the characters: is there any digit, any uppercase letter, and any symbol from the allowed set. Python has a function for "does ANY item match".',
      'Order matters. STRONG test has to come FIRST. MEDIUM test second. WEAK at the end. Return the label as an uppercase string, not a boolean.',
    ],
    component: PasswordCheckerPuzzle,
  },
  p3: {
    id: 'p3',
    title: 'Firewall Binary',
    kind: PUZZLE_META.p3.kind,
    codeWord: PUZZLE_META.p3.codeWord,
    storyBriefing:
      "Decode GLITCH's firewall keycode. The server displays memory in binary.",
    redHerrings: [
      'Keypad Manual shows full ASCII table including digits and lowercase letters.',
      "A fake 'LAST USED PIN' decodes to ED; ignore it.",
      "A 'recent attempts log' shows bytes like 11111111 that are not valid ASCII letters.",
    ],
    hintContext: 'Binary decode puzzle. 7 ASCII bytes spelling a friendly parting word.',
    fallbackHints: [
      'Each row is one byte, which equals one capital letter. 7 rows means a 7-letter word.',
      'For each row, add up the column values where you see a 1. The columns are worth 128, 64, 32, 16, 8, 4, 2, and 1 from left to right. That total is a number from the ASCII chart.',
      'The word is something friendly people say when they leave. Decode each byte carefully to be sure. Ignore the old pin in the notes, that is a trick.',
    ],
    component: BinaryPuzzle,
  },
  p4: {
    id: 'p4',
    title: 'Rescue Drone',
    kind: PUZZLE_META.p4.kind,
    codeWord: PUZZLE_META.p4.codeWord,
    storyBriefing:
      "Program the decoy drone to grab GLITCH's master key without tripping his camera traps.",
    redHerrings: [
      "The 'teleport' block is visible but locked (needs admin key you do not have).",
      "The 'shout' block runs but does nothing useful.",
      "A 'scan_camera' block returns fake sensor data.",
    ],
    hintContext: 'Blockly grid puzzle with chips on column 1 and danger at (2,2).',
    fallbackHints: [
      'Before you code, trace the path on paper. Where are the 3 chips? Where is the red tile you must avoid? And remember you MUST use a repeat block.',
      'The three chips are lined up on one column. A repeat block that moves and picks up fits perfectly there. Then go around the red tile.',
      'Four big steps: face the chips, collect them with a repeat, travel to the far side, then drop down to the end. Avoid the red tile the whole time.',
    ],
    component: BlocklyPuzzle,
  },
  p5: {
    id: 'p5',
    title: 'Front Page Rebuild',
    kind: PUZZLE_META.p5.kind,
    codeWord: PUZZLE_META.p5.codeWord,
    storyBriefing:
      'The final lock is a palindrome verifier. Write it yourself so you can trust BYTE\'s final phrase.',
    redHerrings: [
      '15 famous palindromes in the reference sheet; half are fake.',
      'A teammate comment lies that reversed() is broken; it is fine.',
      'A regex hint is offered but optional.',
    ],
    hintContext: 'Python palindrome check, case and punctuation insensitive.',
    fallbackHints: [
      'Two steps. Step 1: make a clean version of the phrase with ONLY letters, all lowercase. Step 2: check if that clean string matches itself reversed.',
      'For cleaning: go through each character and keep it only if it is a letter. Also lowercase it. Python has a way to reverse a string using slice syntax with a negative step.',
      'Your function is short. It builds a clean string, then compares that clean string to its reverse. Ignore the teammate comment that says reversed is broken. It is not.',
    ],
    hintCap: 5,
    component: PalindromePuzzle,
  },
};

export function getPuzzle(id: PuzzleId): PuzzleDefinition {
  return PUZZLE_REGISTRY[id];
}
