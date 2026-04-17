/**
 * Lightweight pattern analysis of student Python code. Flags common mistakes
 * so we can show targeted hints when tests fail. Not a real linter — just
 * cheap regex checks that catch the well-known traps.
 */

export function analyzePasswordCheckerCode(code: string): string[] {
  const hints: string[] = [];
  const body = extractFunctionBody(code, 'check_password');

  // Returning booleans instead of strings
  if (/return\s+(True|False)\b/.test(body)) {
    hints.push('Your function returns True or False. The rules want a word, not a yes/no. Think about what three words the rules mention.');
  }

  // Lowercase strings returned
  if (/return\s+["'](strong|medium|weak)["']/.test(body)) {
    hints.push('Capitalization matters. The rules use ALL-CAPS words. Match them exactly.');
  }

  // Whole-string methods instead of per-character check
  if (/\bpw\.isdigit\(\)/.test(body)) {
    hints.push('pw.isdigit() only says yes if EVERY character is a digit. You need to check if ANY character is a digit. Python has a helper for "ANY item matches the rule".');
  }
  if (/\bpw\.isupper\(\)/.test(body)) {
    hints.push('pw.isupper() checks the whole password. You want to know if even one character is uppercase. Look up Python helpers for "does any character match a rule".');
  }

  // Missing checks
  if (!/isupper|is_upper/.test(body) && !/[A-Z]/.test(body.replace(/["'].*?["']/g, ''))) {
    hints.push('STRONG needs an uppercase letter check. Right now your code does not check for capital letters.');
  }
  if (!/isdigit|is_digit/.test(body)) {
    hints.push('Your code does not check for digits. STRONG and MEDIUM both need a digit check.');
  }
  if (!/!@#\$/.test(body)) {
    hints.push('The symbol check should use exactly the characters !@#$%. Other special characters do not count.');
  }

  // Order mistake: MEDIUM check before STRONG
  const strongIdx = body.search(/["']STRONG["']/);
  const mediumIdx = body.search(/["']MEDIUM["']/);
  if (strongIdx !== -1 && mediumIdx !== -1 && mediumIdx < strongIdx) {
    hints.push('You are checking MEDIUM before STRONG. With first-match-wins, a super-strong password gets labeled MEDIUM and never reaches the STRONG check. Swap the order.');
  }

  return hints;
}

export function analyzePalindromeCode(code: string): string[] {
  const hints: string[] = [];
  const body = extractFunctionBody(code, 'is_palindrome');

  // Compare directly to reversed without cleaning
  if (
    /return\s+phrase\s*==\s*phrase\[::-1\]/.test(body) ||
    /return\s+phrase\[::-1\]\s*==\s*phrase/.test(body)
  ) {
    hints.push('You are comparing the phrase to its reverse directly. Spaces, case, and punctuation will throw this off. You need to clean the string first.');
  }

  // Returning strings instead of booleans
  if (/return\s+["'](True|False)["']/.test(body)) {
    hints.push('You returned the string "True" or "False" with quotes. You need the real True or False, no quotes.');
  }

  // isalnum instead of isalpha
  if (/isalnum/.test(body) && !/isalpha/.test(body)) {
    hints.push('isalnum keeps digits too. The rules say LETTERS only. Python has a different character method that matches only letters.');
  }

  // Infinite loop risk
  if (/\bwhile\s+True\b/.test(body) && !/break/.test(body)) {
    hints.push('while True with no break can run forever. You do not need a while loop for this problem. Python has a one-line way to reverse a string.');
  }

  // Missing lowercase conversion
  if (!/\.lower\(\)/.test(body)) {
    hints.push('You are not making letters lowercase. "Race Car" reversed is "raC ecaR" which does not match. You need to lowercase everything before comparing.');
  }

  return hints;
}

/** Very simple extractor. Finds `def name(...)` and returns the body. */
function extractFunctionBody(code: string, name: string): string {
  const re = new RegExp(`def\\s+${name}\\s*\\([^)]*\\)\\s*:`);
  const m = re.exec(code);
  if (!m) return code;
  const start = m.index + m[0].length;
  // Find the next top-level def or end of file
  const rest = code.slice(start);
  const nextTop = rest.search(/\n(?:def\s|class\s|if\s+__name__)/);
  return nextTop === -1 ? rest : rest.slice(0, nextTop);
}
