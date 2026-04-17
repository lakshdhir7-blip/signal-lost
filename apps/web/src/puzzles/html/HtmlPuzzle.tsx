import { useEffect, useMemo, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { html as htmlLang } from '@codemirror/lang-html';
import { oneDark } from '@codemirror/theme-one-dark';
import type { PuzzleProps } from '../types';
import { BROKEN_ANIMAL_HTML } from './starter';
import {
  checkHtml,
  findSurfaceMistakes,
  HTML_CHECK_HINTS,
  HTML_CHECK_LABELS,
  validateHtml,
} from './validator';
import { useSessionStore } from '@/state/session';

export function HtmlPuzzle({ draft, onDraftChange, onSubmit }: PuzzleProps) {
  const [code, setCode] = useState(draft || BROKEN_ANIMAL_HTML);

  const handleChange = (next: string) => {
    setCode(next);
    onDraftChange(next);
  };

  const report = useMemo(() => checkHtml(code), [code]);
  const fixesLanded = useMemo(
    () => Object.entries(report).filter(([k, v]) => k !== 'parseClean' && v).length,
    [report],
  );
  const totalFixes = Object.keys(HTML_CHECK_LABELS).length;
  const corruption = Math.max(0, 1 - fixesLanded / totalFixes);

  const failureHints = useMemo(() => {
    const hints: string[] = [];
    for (const key of Object.keys(HTML_CHECK_LABELS) as (keyof typeof HTML_CHECK_LABELS)[]) {
      const passed = (report as unknown as Record<string, boolean>)[key];
      if (!passed) hints.push(HTML_CHECK_HINTS[key]);
    }
    hints.push(...findSurfaceMistakes(code));
    return hints;
  }, [report, code]);

  const submit = () => onSubmit(validateHtml(code));

  // Publish current validator state to BYTE so hints can reference exact flags.
  const setByteContext = useSessionStore((s) => s.setByteContext);
  useEffect(() => {
    const passed = Object.entries(report)
      .filter(([k, v]) => k !== 'parseClean' && v)
      .map(([k]) => k);
    const failed = Object.entries(report)
      .filter(([k, v]) => k !== 'parseClean' && !v)
      .map(([k]) => k);
    const summary = `HTML validator report\n  passing: ${passed.join(', ') || 'none yet'}\n  still failing: ${failed.join(', ') || 'none (ready to submit)'}`;
    setByteContext('p1', summary);
  }, [report, setByteContext]);

  return (
    <div className="grid h-full grid-cols-1 gap-4 p-6 lg:grid-cols-2">
      <div className="flex min-h-0 flex-col">
        <div className="mb-2 flex items-center justify-between">
          <label htmlFor="html-editor" className="font-mono text-xs text-cyan-brand/70">
            &gt; EDITOR // fix 4 errors
          </label>
          <button
            type="button"
            onClick={() => handleChange(BROKEN_ANIMAL_HTML)}
            className="font-mono text-[10px] text-cyan-brand/40 hover:text-cyan-brand"
          >
            reset
          </button>
        </div>
        <div className="flex-1 border-2 border-cyan-brand/30">
          <CodeMirror
            value={code}
            theme={oneDark}
            extensions={[htmlLang()]}
            onChange={handleChange}
            height="520px"
            maxHeight="60vh"
            minHeight="300px"
            basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: true }}
          />
        </div>
        <div className="sticky bottom-0 z-10 -mx-2 mt-3 border-t border-cyan-brand/30 bg-navy-deep/95 px-2 py-3 backdrop-blur">
          <button type="button" onClick={submit} className="ranger-button">
            [ SUBMIT FIX ]
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-col pb-20 lg:pr-20">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-xs text-cyan-brand/70">
            &gt; LIVE PREVIEW // door lock status
          </span>
          <span className="font-mono text-xs text-magenta-brand">
            corruption: {Math.round(corruption * 100)}%
          </span>
        </div>
        <div className="relative min-h-0 flex-1 overflow-hidden border-2 border-cyan-brand/30 bg-white">
          <iframe
            title="html-preview"
            sandbox="allow-scripts"
            srcDoc={code}
            className="h-full w-full border-0"
          />
          <div
            aria-hidden="true"
            style={{ opacity: corruption }}
            className="pointer-events-none absolute inset-0 mix-blend-screen transition-opacity duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-magenta-brand/40 to-alert-brand/30" />
            <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(255,43,214,0.15)_0,rgba(255,43,214,0.15)_1px,transparent_1px,transparent_3px)]" />
          </div>
        </div>

        <div className="mt-3 border border-cyan-brand/20 bg-navy-brand/40 p-3 font-mono text-xs">
          <div className="mb-2 text-cyan-brand/60">browser console (5 warnings, only 4 real):</div>
          <ul className="space-y-1">
            {Object.entries(HTML_CHECK_LABELS).map(([key, label]) => {
              const pass = (report as unknown as Record<string, boolean>)[key];
              return (
                <li
                  key={key}
                  className={`flex items-center gap-2 ${pass ? 'text-green-400' : 'text-alert-brand'}`}
                >
                  <span aria-hidden="true">{pass ? '✔' : '✗'}</span>
                  <span className={pass ? 'line-through' : ''}>{label}</span>
                </li>
              );
            })}
            <li className="flex items-center gap-2 text-yellow-500/70">
              <span aria-hidden="true">!</span>
              <span>Warning: &lt;li&gt; elements should use role=&apos;listitem&apos; for accessibility (red herring)</span>
            </li>
          </ul>
        </div>
        {failureHints.length > 0 ? (
          <div className="mt-3 border border-magenta-brand/40 bg-magenta-brand/10 p-3 font-sans text-xs">
            <div className="mb-2 font-display text-[11px] uppercase tracking-widest text-magenta-brand">
              Fix list
            </div>
            <ul className="space-y-1 text-cyan-brand">
              {failureHints.map((h, i) => (
                <li key={i} className="flex gap-2">
                  <span aria-hidden="true" className="text-magenta-brand">&bull;</span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
