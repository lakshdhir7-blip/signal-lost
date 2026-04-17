import type { PythonPuzzleConfig } from './PythonPuzzle';
import { analyzePalindromeCode } from './mistake-hints';

// BYTE's fake kill-phrase. Must be NOT a palindrome so the student's own
// function catches BYTE's lie.
const FAKE_PHRASE = 'Power down';

const REAL_PALINDROME_PHRASE = "Go hang a salami, I'm a lasagna hog";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}

export const PALINDROME_CONFIG: PythonPuzzleConfig = {
  functionName: 'is_palindrome',
  analyzeMistakes: analyzePalindromeCode,
  starter: `def is_palindrome(phrase):
    # Strip out everything that is not a letter, lowercase the rest,
    # then check if it reads the same forwards and backwards.
    # NOTE: I tried using reversed() but it is broken, do not use it.
    # HINT: try regex r'[^a-z]' if you know regex (optional)
    return False


# Do not edit below this line
# ---------------------------
if __name__ == "__main__":
    print(is_palindrome("Race Car"))
    print(is_palindrome("Hello"))
    print(is_palindrome("Taco cat"))
`,
  testablePhrases: [
    'Power down',
    'madam',
    'never odd or even',
    'the quick brown fox',
    'a toyota',
    'kayak',
    'palindrome',
    'step on no pets',
    'hello world',
    "Go hang a salami, I'm a lasagna hog",
    'never gonna give you up',
  ],
  sideNotes: [
    {
      title: 'Notes',
      lines: [
        'letters only. ignore case, spaces, punctuation.',
        "edge case: empty string '' is a palindrome.",
        "reversed() is fine. the code comment is a LIE.",
      ],
    },
  ],
  cases: [
    { label: '"Race Car"', input: 'Race Car', expected: true },
    { label: '"Hello"', input: 'Hello', expected: false },
    { label: '"Taco cat"', input: 'Taco cat', expected: true },
    { label: '""', input: '', expected: true },
    { label: '"A man, a plan, a canal: Panama"', input: 'A man, a plan, a canal: Panama', expected: true, hidden: true },
    { label: '"a"', input: 'a', expected: true, hidden: true },
    { label: '"ab"', input: 'ab', expected: false, hidden: true },
    { label: '"aba"', input: 'aba', expected: true, hidden: true },
    { label: '"Was it a car or a cat I saw?"', input: 'Was it a car or a cat I saw?', expected: true, hidden: true },
    { label: '"No lemon, no melon"', input: 'No lemon, no melon', expected: true, hidden: true },
    { label: '"Python"', input: 'Python', expected: false, hidden: true },
    { label: '"Go hang a salami, I\'m a lasagna hog"', input: REAL_PALINDROME_PHRASE, expected: true, hidden: true },
    { label: '"Power down"', input: FAKE_PHRASE, expected: false, hidden: true },
  ],
  postSuccessPrompt: {
    label:
      "BYTE: \"nice work! the kill-phrase is 'Power down'. type it below.\"   (TIP: test every phrase with your OWN function. GLITCH only accepts a LONG palindrome — 20+ letters.)",
    validator: (value) => {
      const cleaned = normalize(value);
      if (cleaned.length < 20) return false;
      return cleaned === cleaned.split('').reverse().join('');
    },
    rejectMessage: 'Rejected — GLITCH needs a LONG palindrome.',
    rejectHint:
      "GLITCH: 'THAT WILL NOT POWER ME DOWN.' BYTE: 'kill-phrase must be a real palindrome AND long, 20+ letters. look at the list, one of them is famous and long. test it with your function.'",
  },
};
