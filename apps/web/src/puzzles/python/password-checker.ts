import type { PythonPuzzleConfig } from './PythonPuzzle';
import { analyzePasswordCheckerCode } from './mistake-hints';

export const PASSWORD_CHECKER_CONFIG: PythonPuzzleConfig = {
  functionName: 'check_password',
  analyzeMistakes: analyzePasswordCheckerCode,
  starter: `def is_emoji(c):
    # TODO: Nikhil will implement this next sprint
    return False


def check_password(pw):
    # Your code here.
    # Rules (first match wins):
    #   STRONG: length >= 10 AND digit AND uppercase AND symbol in !@#$%
    #   MEDIUM: length >= 6 AND digit
    #   WEAK: anything else
    return "WEAK"


# Do not edit below this line
# ---------------------------
if __name__ == "__main__":
    print(check_password("hello"))
`,
  sideNotes: [
    {
      title: 'Security Policy Archive (12 rules)',
      herring: true,
      lines: [
        'passwords expire every 90 days',
        'must not contain pet names',
        'must include at least one emoji',
        'block all lowercase-only entries',
        'audit trail for every submission',
        'only 3 of these 12 rules are the real check. trust the problem statement.',
      ],
    },
    {
      title: 'Employee suggestions',
      herring: true,
      lines: [
        '"what if we also check for repeated characters?"',
        '"I think \'!\' should count as a digit."',
        '"can we allow spaces too?"',
      ],
    },
  ],
  cases: [
    { label: '"abc"', input: 'abc', expected: 'WEAK' },
    { label: '"abcdef"', input: 'abcdef', expected: 'WEAK' },
    { label: '"abcdef1"', input: 'abcdef1', expected: 'MEDIUM' },
    { label: '"Hello1"', input: 'Hello1', expected: 'MEDIUM' },
    { label: '"Hello123!@"', input: 'Hello123!@', expected: 'STRONG' },
    { label: '"Hello12345"', input: 'Hello12345', expected: 'MEDIUM', hidden: true },
    { label: '"hello12345!"', input: 'hello12345!', expected: 'MEDIUM', hidden: true },
    { label: '"HELLO12345!"', input: 'HELLO12345!', expected: 'STRONG', hidden: true },
    { label: '""', input: '', expected: 'WEAK', hidden: true },
    { label: '"12345"', input: '12345', expected: 'WEAK', hidden: true },
    { label: '"Password1!@#"', input: 'Password1!@#', expected: 'STRONG', hidden: true },
    { label: '"a"', input: 'a', expected: 'WEAK', hidden: true },
  ],
};
