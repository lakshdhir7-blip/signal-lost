import { loadPyodideRuntime, runPythonSafe } from './pyodide-loader';

export interface PythonTestCase<TArg, TExpected> {
  label: string;
  input: TArg;
  expected: TExpected;
  hidden?: boolean;
}

export interface TestCaseResult<TArg, TExpected> {
  label: string;
  input: TArg;
  expected: TExpected;
  actual: TExpected | null;
  pass: boolean;
  error?: string;
  hidden?: boolean;
}

export interface TestSuiteResult<TArg, TExpected> {
  allPass: boolean;
  cases: TestCaseResult<TArg, TExpected>[];
  runtimeError?: string;
}

/**
 * Runs a Python function against a suite of test cases. Produces a structured
 * per-case report. Catches SyntaxError, NameError, and run errors without
 * killing the puzzle UI.
 */
/**
 * Translate Pyodide / Python error messages into plain-English tips for kids.
 * Strips file paths and internal frames, leaves a short friendly sentence.
 */
export function translatePythonError(raw: string | undefined | null): string {
  if (!raw) return 'Your code ran into a problem. Check for missing colons, quotes, or parentheses.';
  const text = String(raw);

  // Find the short error class + message at the end of a traceback if present.
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const lastLine = lines[lines.length - 1] ?? '';

  // IndentationError
  if (/IndentationError.*unexpected indent/i.test(text)) {
    return 'Extra spaces at the start of a line. Each piece of code should line up correctly. Tip: click reset and then edit only the return line.';
  }
  if (/IndentationError.*expected an indented block/i.test(text)) {
    return 'After a line that ends with : (like def or if), the next line must be indented 4 spaces.';
  }
  if (/TabError/i.test(text)) {
    return 'You mixed tabs and spaces. Use only spaces to indent (4 spaces per level).';
  }

  // SyntaxError
  if (/SyntaxError.*unexpected EOF/i.test(text)) {
    return 'Your code stops in the middle. Check for a missing closing bracket, quote, or parenthesis.';
  }
  if (/SyntaxError.*invalid syntax/i.test(text) || /^\s*SyntaxError/i.test(lastLine)) {
    return 'There is a typo in your code. Check your colons, quotes, and parentheses.';
  }

  // NameError
  const nameMatch = /NameError: name '([^']+)' is not defined/.exec(text);
  if (nameMatch) {
    return `Python does not know the name "${nameMatch[1]}". Check your spelling and make sure it is defined above.`;
  }

  // TypeError
  if (/TypeError/i.test(text)) {
    return 'Your code used a value the wrong way (like adding text to a number). Check the types you pass around.';
  }

  // Timeout
  if (/timeout/i.test(text)) {
    return 'Your code ran too long. Look for an endless loop.';
  }

  // Fall-back: show only the last line, stripped of file paths.
  const scrubbed = lastLine.replace(/\bFile\b.*?, /g, '').replace(/\s+/g, ' ');
  if (scrubbed && scrubbed.length < 180) return scrubbed;
  return 'Your code hit an error. Check your indentation and spelling, then try again.';
}

/**
 * Normalize pasted Python code:
 *   1. Strip BOM / zero-width chars that paste tools sometimes add.
 *   2. Expand tabs to 4 spaces so mixed tab+space indent does not confuse Python.
 *   3. If every non-blank line shares a common leading indent, strip it.
 * This fixes the #1 paste-from-chat bug: "IndentationError: unindent does not
 * match any outer indentation level".
 */
function dedent(code: string): string {
  const stripped = code
    .replace(/^\uFEFF/, '')
    .replace(/\u00A0/g, ' ') // non-breaking spaces -> regular
    .replace(/\u200B/g, ''); // zero-width spaces
  const expanded = stripped.replace(/\t/g, '    ');
  const lines = expanded.split('\n');
  const indents: number[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const m = /^ */.exec(line);
    indents.push(m ? m[0].length : 0);
  }
  if (indents.length === 0) return expanded;
  const minIndent = Math.min(...indents);
  if (minIndent === 0) return expanded;
  return lines.map((l) => (l.trim() ? l.slice(minIndent) : l)).join('\n');
}

export async function runPythonSuite<TExpected extends string | boolean | number>(
  code: string,
  functionName: string,
  cases: PythonTestCase<string, TExpected>[],
): Promise<TestSuiteResult<string, TExpected>> {
  // Normalize indentation so stray leading whitespace does not kill the run.
  const normalizedCode = dedent(code);
  // First ensure the student code defines the function.
  // Use globals() so we see module-level names from the student's code.
  const prelude = `
${normalizedCode}

try:
    _sl_fn = ${functionName}
    __status = "ok" if callable(_sl_fn) else "not_callable"
except NameError:
    __status = "missing"
`;
  const statusResult = await runPythonSafe(prelude);
  if (!statusResult.ok) {
    const friendly = translatePythonError(statusResult.error ?? statusResult.stderr);
    return {
      allPass: false,
      cases: cases.map((c) => ({
        label: c.label,
        input: c.input,
        expected: c.expected,
        actual: null,
        pass: false,
        error: friendly,
        hidden: c.hidden,
      })),
      runtimeError: friendly,
    };
  }

  const pyodide = await loadPyodideRuntime();
  const statusRaw = pyodide.globals.get('__status');
  const status = typeof statusRaw === 'string' ? statusRaw : String(statusRaw);
  if (status !== 'ok') {
    const msg =
      status === 'missing'
        ? `your function should be named \`${functionName}\``
        : `\`${functionName}\` is defined but not callable`;
    return {
      allPass: false,
      cases: cases.map((c) => ({
        label: c.label,
        input: c.input,
        expected: c.expected,
        actual: null,
        pass: false,
        error: msg,
        hidden: c.hidden,
      })),
      runtimeError: msg,
    };
  }

  const results: TestCaseResult<string, TExpected>[] = [];
  for (const c of cases) {
    const escaped = JSON.stringify(c.input);
    const runCode = `__result = ${functionName}(${escaped})`;
    const r = await runPythonSafe(runCode);
    if (!r.ok) {
      results.push({
        label: c.label,
        input: c.input,
        expected: c.expected,
        actual: null,
        pass: false,
        error: translatePythonError(r.error ?? r.stderr),
        hidden: c.hidden,
      });
      continue;
    }
    const raw = pyodide.globals.get('__result');
    const actual = raw as TExpected;
    const pass = deepEqual(actual, c.expected);
    results.push({
      label: c.label,
      input: c.input,
      expected: c.expected,
      actual,
      pass,
      hidden: c.hidden,
    });
  }

  const allPass = results.every((r) => r.pass);
  return { allPass, cases: results };
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < 1e-9;
  return JSON.stringify(a) === JSON.stringify(b);
}
