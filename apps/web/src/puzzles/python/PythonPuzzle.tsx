import { useEffect, useMemo, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';
import type { PuzzleProps } from '../types';
import { useSessionStore } from '@/state/session';
import {
  loadPyodideRuntime,
  prefetchPyodide,
  runPythonSafe,
  type PyodideInterface,
} from './pyodide-loader';
import {
  runPythonSuite,
  type PythonTestCase,
  type TestSuiteResult,
} from './test-runner';


export interface PythonPuzzleConfig {
  starter: string;
  functionName: string;
  cases: PythonTestCase<string, string | boolean>[];
  sideNotes?: readonly { title: string; lines: readonly string[]; herring?: boolean }[];
  onAllPassBeforeSubmit?: (setAnswer: (s: string) => void) => void;
  postSuccessPrompt?: {
    label: string;
    validator: (value: string) => boolean;
    rejectMessage: string;
    rejectHint?: string;
  };
  /**
   * Phrases shown as one-click test pills beneath the test bench. Students
   * click any to auto-fill the bench and run their function on it.
   */
  testablePhrases?: readonly string[];
  /** Pattern-match the student's code and return specific mistake hints. */
  analyzeMistakes?: (code: string) => string[];
}

interface Props extends PuzzleProps {
  config: PythonPuzzleConfig;
}

export function PythonPuzzle({ puzzleId, draft, onDraftChange, onSubmit, config }: Props) {
  const [code, setCode] = useState<string>(draft || config.starter);
  const [runState, setRunState] = useState<'idle' | 'loading' | 'running' | 'ready' | 'failed'>(
    'idle',
  );
  const [suite, setSuite] = useState<TestSuiteResult<string, string | boolean> | null>(null);
  const [promptInput, setPromptInput] = useState('');
  const [promptError, setPromptError] = useState<string | null>(null);
  const setByteContext = useSessionStore((s) => s.setByteContext);

  const handleCodeChange = (next: string) => {
    setCode(next);
    onDraftChange(next);
  };

  useEffect(() => {
    prefetchPyodide();
  }, []);

  const run = async () => {
    setRunState('loading');
    try {
      await loadPyodideRuntime().then((runtime: PyodideInterface) => void runtime);
      setRunState('running');
      const result = await runPythonSuite(code, config.functionName, config.cases);
      setSuite(result);
      setRunState('ready');
    } catch (err) {
      setRunState('failed');
      setSuite({
        allPass: false,
        cases: [],
        runtimeError: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const submit = () => {
    if (!suite?.allPass) {
      onSubmit({
        ok: false,
        reason: suite?.runtimeError ? 'runtime_error' : 'tests_failed',
        hintableMistake: suite?.runtimeError ? 'runtime_error' : 'tests_failed',
      });
      return;
    }
    if (config.postSuccessPrompt) {
      const valid = config.postSuccessPrompt.validator(promptInput);
      if (!valid) {
        setPromptError(config.postSuccessPrompt.rejectHint ?? config.postSuccessPrompt.rejectMessage);
        onSubmit({
          ok: false,
          reason: 'post_prompt_reject',
          hintableMistake: 'post_prompt_reject',
        });
        return;
      }
    }
    onSubmit({ ok: true });
  };

  const visibleCases = useMemo(
    () => (suite ? suite.cases.filter((c) => !c.hidden) : []),
    [suite],
  );
  const hiddenPass = useMemo(
    () => (suite ? suite.cases.filter((c) => c.hidden && c.pass).length : 0),
    [suite],
  );
  const hiddenTotal = useMemo(
    () => (suite ? suite.cases.filter((c) => c.hidden).length : 0),
    [suite],
  );
  const mistakeHints = useMemo(
    () => (config.analyzeMistakes && suite && !suite.allPass ? config.analyzeMistakes(code) : []),
    [code, config, suite],
  );

  // Publish last test-run results so BYTE can target feedback to failing cases.
  useEffect(() => {
    if (!suite) {
      setByteContext(puzzleId, 'No tests run yet.');
      return;
    }
    if (suite.runtimeError) {
      setByteContext(puzzleId, `Last run hit an error: ${suite.runtimeError}`);
      return;
    }
    const failing = suite.cases.filter((c) => !c.pass);
    const passing = suite.cases.filter((c) => c.pass);
    const failingSummary = failing
      .slice(0, 6)
      .map((c) => `"${c.label}" -> got ${JSON.stringify(c.actual)}, expected ${JSON.stringify(c.expected)}`)
      .join('; ');
    setByteContext(
      puzzleId,
      `Test run: ${passing.length}/${suite.cases.length} pass. ${failing.length > 0 ? `Failing: ${failingSummary}` : 'All pass.'}${mistakeHints.length > 0 ? ` Detected patterns: ${mistakeHints.join(' | ')}` : ''}`,
    );
  }, [suite, puzzleId, setByteContext, mistakeHints]);

  return (
    <div className="grid h-full grid-cols-1 gap-4 p-6 lg:grid-cols-[1fr_360px]">
      <div className="flex min-h-0 flex-col">
        <div className="mb-2 flex items-center justify-between">
          <label htmlFor="py-editor" className="font-mono text-xs text-cyan-brand/70">
            &gt; PYTHON EDITOR
          </label>
          <button
            type="button"
            onClick={() => handleCodeChange(config.starter)}
            className="font-mono text-[10px] text-cyan-brand/40 hover:text-cyan-brand"
          >
            reset
          </button>
        </div>
        <div className="flex-1 border-2 border-cyan-brand/30">
          <CodeMirror
            value={code}
            theme={oneDark}
            extensions={[python()]}
            onChange={handleCodeChange}
            height="520px"
            maxHeight="60vh"
            minHeight="320px"
            basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: true }}
          />
        </div>
        <div className="sticky bottom-0 z-10 -mx-2 mt-3 flex items-center gap-3 border-t border-cyan-brand/30 bg-navy-deep/95 px-2 py-3 backdrop-blur">
          <button
            type="button"
            onClick={run}
            disabled={runState === 'loading' || runState === 'running'}
            className="ranger-button"
          >
            [
            {runState === 'loading'
              ? ' LOADING PYTHON...'
              : runState === 'running'
                ? ' RUNNING...'
                : ' RUN TESTS '}
            ]
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!suite?.allPass || (!!config.postSuccessPrompt && !promptInput.trim())}
            className="ranger-button"
          >
            [ SUBMIT ]
          </button>
        </div>
        {config.postSuccessPrompt && suite?.allPass ? (
          <div className="mt-4 flex flex-col gap-3">
            <PhraseTester
              functionName={config.functionName}
              code={code}
              suggestedPhrases={config.testablePhrases}
              finalValidator={config.postSuccessPrompt?.validator}
            />
            <div className="border border-magenta-brand/40 bg-navy-brand/60 p-3">
              <label htmlFor="py-prompt" className="mb-1 block font-mono text-xs text-magenta-brand">
                {config.postSuccessPrompt.label}
              </label>
              <input
                id="py-prompt"
                value={promptInput}
                onChange={(e) => {
                  setPromptInput(e.target.value);
                  setPromptError(null);
                }}
                className="terminal-input"
              />
              {promptError ? (
                <p role="alert" className="mt-2 font-mono text-xs text-alert-brand">
                  {promptError}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <aside className="flex flex-col gap-3 overflow-auto pb-20">
        {mistakeHints.length > 0 ? (
          <div className="border-2 border-magenta-brand/40 bg-magenta-brand/10 p-3">
            <h3 className="mb-2 font-display text-[11px] uppercase tracking-widest text-magenta-brand">
              Common mistakes BYTE spotted
            </h3>
            <ul className="space-y-2 font-sans text-xs text-cyan-brand">
              {mistakeHints.map((h, i) => (
                <li key={i} className="flex gap-2">
                  <span aria-hidden="true" className="text-magenta-brand">&bull;</span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="border-2 border-cyan-brand/30 bg-navy-brand/60 p-3">
          <h3 className="mb-2 font-display text-xs uppercase tracking-widest text-magenta-brand">
            Test cases
          </h3>
          {!suite ? (
            <p className="font-mono text-xs text-cyan-brand/50">click RUN TESTS to see results.</p>
          ) : suite.runtimeError ? (
            <p className="font-mono text-xs text-alert-brand">{suite.runtimeError}</p>
          ) : (
            <ul className="space-y-1">
              {visibleCases.map((c) => (
                <li
                  key={c.label}
                  className={`flex items-baseline justify-between gap-2 font-mono text-xs ${c.pass ? 'text-green-400' : 'text-alert-brand'}`}
                >
                  <span className="truncate">
                    <span aria-hidden="true">{c.pass ? '✔' : '✗'}</span> {c.label}
                  </span>
                  {!c.pass ? (
                    <span className="text-cyan-brand/50">
                      got {String(c.actual)} expected {String(c.expected)}
                    </span>
                  ) : null}
                </li>
              ))}
              {hiddenTotal > 0 ? (
                <li className="mt-2 border-t border-cyan-brand/20 pt-2 font-mono text-xs text-cyan-brand/70">
                  hidden tests: {hiddenPass} / {hiddenTotal} pass
                </li>
              ) : null}
            </ul>
          )}
        </div>
        {(config.sideNotes ?? []).map((note) => (
          <div
            key={note.title}
            className={`border-2 p-3 ${note.herring ? 'border-yellow-700/40 bg-yellow-900/20' : 'border-cyan-brand/20 bg-navy-brand/40'}`}
          >
            <h4
              className={`mb-2 font-display text-xs uppercase tracking-widest ${note.herring ? 'text-yellow-500/80' : 'text-cyan-brand/70'}`}
            >
              {note.title}
            </h4>
            <ul className="space-y-1 font-mono text-xs">
              {note.lines.map((l, i) => (
                <li key={i} className={note.herring ? 'text-yellow-200/60' : 'text-cyan-brand/70'}>
                  {l}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </aside>
    </div>
  );
}

/**
 * Mini test-bench: student types any phrase, we run their function on it, show
 * True/False. Essential so they can verify phrases from the palindrome list
 * (catching BYTE's lie themselves).
 */
interface PhraseTesterProps {
  functionName: string;
  code: string;
  suggestedPhrases?: readonly string[];
  finalValidator?: (value: string) => boolean;
}

interface PhraseResult {
  fnTrue: boolean;
  letterLen: number;
  meetsFinal: boolean;
}

function PhraseTester({
  functionName,
  code,
  suggestedPhrases,
  finalValidator,
}: PhraseTesterProps) {
  const [phrase, setPhrase] = useState('');
  const [result, setResult] = useState<'true' | 'false' | 'error' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [phraseResults, setPhraseResults] = useState<Record<string, PhraseResult>>({});
  const [activePhrase, setActivePhrase] = useState<string | null>(null);

  const check = async (phraseToCheck?: string) => {
    const target = phraseToCheck ?? phrase;
    if (!target.trim()) return;
    setBusy(true);
    setErrorMsg(null);
    setActivePhrase(target);
    try {
      const pyodide = await loadPyodideRuntime();
      const escaped = JSON.stringify(target);
      const wrapped = `${code}\n__test_bench_result = bool(${functionName}(${escaped}))`;
      const r = await runPythonSafe(wrapped);
      if (!r.ok) {
        setResult('error');
        setErrorMsg(r.error ?? 'Your function threw an error on this phrase.');
      } else {
        const raw = pyodide.globals.get('__test_bench_result');
        const isTrue = Boolean(raw);
        setResult(isTrue ? 'true' : 'false');
        const letterLen = target.replace(/[^a-zA-Z]/g, '').length;
        const meetsFinal = finalValidator ? finalValidator(target) : false;
        setPhraseResults((prev) => ({
          ...prev,
          [target]: { fnTrue: isTrue, letterLen, meetsFinal },
        }));
      }
    } catch (err) {
      setResult('error');
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const testSuggested = (p: string) => {
    setPhrase(p);
    void check(p);
  };

  return (
    <div className="border-2 border-cyan-brand/40 bg-cyan-brand/5 p-3">
      <div className="mb-2 font-display text-[11px] uppercase tracking-widest text-cyan-brand">
        Test bench — try phrases with YOUR function
      </div>
      <p className="mb-2 font-sans text-[11px] text-cyan-brand/70">
        Type any phrase, or click one below. Your function will say TRUE or FALSE.
      </p>
      <div className="flex gap-2">
        <input
          value={phrase}
          onChange={(e) => {
            setPhrase(e.target.value);
            setResult(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !busy && phrase.trim()) void check();
          }}
          placeholder="type a phrase..."
          className="terminal-input flex-1 px-2 py-1 text-sm"
        />
        <button
          type="button"
          onClick={() => void check()}
          disabled={busy || !phrase.trim()}
          className="ranger-button px-3 py-1 text-xs"
        >
          {busy ? 'CHECKING...' : 'CHECK'}
        </button>
      </div>
      {result && activePhrase ? (
        <div className="mt-2 font-mono text-xs">
          {result === 'true' ? (
            <p className="text-green-400">
              <span className="font-display">TRUE</span> - <span className="text-cyan-brand/80">"{activePhrase}"</span> is a palindrome
              {phraseResults[activePhrase] ? ` (${phraseResults[activePhrase].letterLen} letters)` : ''}
              .
            </p>
          ) : result === 'false' ? (
            <p className="text-alert-brand">
              <span className="font-display">FALSE</span> - <span className="text-cyan-brand/80">"{activePhrase}"</span> is not a palindrome.
            </p>
          ) : (
            <p className="text-yellow-300">Error: {errorMsg}</p>
          )}
        </div>
      ) : null}

      {suggestedPhrases && suggestedPhrases.length > 0 ? (
        <div className="mt-3 border-t border-cyan-brand/20 pt-3">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-cyan-brand/70">
            Click any phrase to test it with your function:
          </div>
          <ul className="space-y-1">
            {suggestedPhrases.map((p) => {
              const res = phraseResults[p];
              const tested = Boolean(res);
              const iconClass = !tested
                ? 'text-cyan-brand/50'
                : res!.fnTrue
                  ? 'text-green-400'
                  : 'text-alert-brand';
              const lengthBadge = tested ? `${res!.letterLen}` : '';
              const longEnough = tested && res!.fnTrue && res!.meetsFinal;
              return (
                <li key={p}>
                  <button
                    type="button"
                    onClick={() => testSuggested(p)}
                    disabled={busy}
                    className={`flex w-full items-center justify-between gap-2 border px-2 py-1 text-left font-mono text-xs transition-colors ${
                      longEnough
                        ? 'border-green-400 bg-green-400/15 text-green-300'
                        : 'border-cyan-brand/20 bg-navy-deep/50 text-cyan-brand hover:border-cyan-brand'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span aria-hidden="true" className={iconClass}>
                        {tested ? (res!.fnTrue ? '✔' : '✗') : '?'}
                      </span>
                      <span className="truncate">{p}</span>
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-cyan-brand/50">
                      {tested ? <span>len {lengthBadge}</span> : null}
                      {longEnough ? <span className="text-green-300">← MATCH</span> : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
