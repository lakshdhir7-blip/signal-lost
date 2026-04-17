import { useMemo, useState } from 'react';
import type { PuzzleProps } from '../types';
import {
  BINARY_BYTES,
  byteToChar,
  byteToDecimal,
  validateBinaryAnswer,
  WRONG_ANSWER_HINTS,
} from './validator';

const POWERS_OF_TWO = [128, 64, 32, 16, 8, 4, 2, 1];

interface RowState {
  bits: [number, number, number, number, number, number, number, number];
  override: boolean; // true if student toggled bits away from the original
}

function bytesToRows(): RowState[] {
  return BINARY_BYTES.map((byte) => ({
    bits: byte.split('').map((b) => Number(b)) as RowState['bits'],
    override: false,
  }));
}

interface DraftShape {
  answer?: string;
  decoded?: { bits: string; decimal: number; char: string | null }[];
}

function parseDraft(raw: string): { rows: RowState[] | null; answer: string | null } {
  if (!raw) return { rows: null, answer: null };
  try {
    const parsed = JSON.parse(raw) as DraftShape;
    const rows: RowState[] | null = parsed.decoded
      ? parsed.decoded.map((d) => ({
          bits: d.bits.split('').map((b) => Number(b)) as RowState['bits'],
          override: true,
        }))
      : null;
    return { rows, answer: parsed.answer ?? null };
  } catch {
    // Legacy drafts were just the raw text answer.
    return { rows: null, answer: raw };
  }
}

export function BinaryPuzzle({ onSubmit, draft, onDraftChange }: PuzzleProps) {
  const parsedDraft = useMemo(() => parseDraft(draft), [draft]);
  const [rows, setRows] = useState<RowState[]>(parsedDraft.rows ?? bytesToRows);
  const [answer, setAnswer] = useState(parsedDraft.answer ?? '');
  const [mistake, setMistake] = useState<string | null>(null);

  // Persist bit state + answer as one JSON payload so BYTE sees the full state.
  const persistDraft = (nextRows: RowState[], nextAnswer: string) => {
    onDraftChange(
      JSON.stringify({
        answer: nextAnswer,
        decoded: nextRows
          .map((r) => ({
            bits: r.bits.join(''),
            decimal: byteToDecimal(r.bits.join('')),
            char: byteToChar(r.bits.join('')),
          })),
      }),
    );
  };

  const toggleBit = (rowIdx: number, bitIdx: number) => {
    setRows((prev) => {
      const next = prev.map((row, i) => {
        if (i !== rowIdx) return row;
        const nextBits: RowState['bits'] = [...row.bits] as RowState['bits'];
        nextBits[bitIdx] = nextBits[bitIdx] === 1 ? 0 : 1;
        return { bits: nextBits, override: true };
      });
      persistDraft(next, answer);
      return next;
    });
  };

  const submit = () => {
    const result = validateBinaryAnswer(answer);
    if (!result.ok) {
      setMistake(result.hintableMistake ?? result.reason);
    } else {
      setMistake(null);
    }
    onSubmit(result);
  };

  return (
    <div className="grid h-full grid-cols-1 gap-6 p-6 lg:grid-cols-[1fr_320px]">
      <div className="flex min-h-0 flex-col gap-4">
        <div className="flex max-h-[65vh] flex-col overflow-hidden border-2 border-cyan-brand/30 bg-navy-brand/60">
          <div className="border-b border-cyan-brand/20 bg-cyan-brand/10 px-4 py-2 font-mono text-xs uppercase tracking-widest text-cyan-brand">
            &gt; MEMORY DUMP // click bits to toggle
          </div>
          <div className="overflow-y-auto p-4 font-mono text-sm">
            <div className="mb-2 grid grid-cols-[auto_1fr_80px_40px] gap-3 text-xs text-cyan-brand/50">
              <div>row</div>
              <div>bits (128 64 32 16 8 4 2 1)</div>
              <div className="text-right">decimal</div>
              <div className="text-center">char</div>
            </div>
            {rows.map((row, rIdx) => {
              const decimal = byteToDecimal(row.bits.join(''));
              const char = byteToChar(row.bits.join(''));
              return (
                <div
                  key={rIdx}
                  className="mb-1 grid grid-cols-[auto_1fr_80px_40px] items-center gap-3 border-b border-cyan-brand/10 py-1"
                >
                  <div className="text-cyan-brand/60">{String(rIdx + 1).padStart(2, '0')}</div>
                  <div className="flex gap-1">
                    {row.bits.map((bit, bIdx) => (
                      <button
                        key={bIdx}
                        type="button"
                        onClick={() => toggleBit(rIdx, bIdx)}
                        aria-label={`Row ${rIdx + 1} bit ${bIdx + 1}, value ${bit}, worth ${POWERS_OF_TWO[bIdx]}`}
                        className={`h-9 w-9 border font-display text-base transition-colors ${
                          bit === 1
                            ? 'border-magenta-brand bg-magenta-brand/20 text-magenta-brand hover:bg-magenta-brand hover:text-navy-deep'
                            : 'border-cyan-brand/40 bg-navy-deep text-cyan-brand/50 hover:border-cyan-brand'
                        }`}
                      >
                        {bit}
                      </button>
                    ))}
                  </div>
                  <div className="text-right text-cyan-brand">{decimal}</div>
                  <div className="text-center font-display text-lg text-acid-brand">
                    {char ?? '?'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <label htmlFor="binary-answer" className="mb-2 block font-mono text-xs text-cyan-brand/70">
            &gt; ENTER DECODED WORD (UPPERCASE)
          </label>
          <input
            id="binary-answer"
            value={answer}
            onChange={(e) => {
              const v = e.target.value.toUpperCase().slice(0, 20);
              setAnswer(v);
              persistDraft(rows, v);
              setMistake(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
            className="terminal-input uppercase"
            placeholder="???????"
            autoComplete="off"
          />
          {mistake && WRONG_ANSWER_HINTS[mistake] ? (
            <p role="alert" className="mt-2 font-mono text-xs text-alert-brand">
              {WRONG_ANSWER_HINTS[mistake]}
            </p>
          ) : null}
          <div className="sticky bottom-0 z-10 mt-4 border-t border-cyan-brand/30 bg-navy-deep/95 py-3 backdrop-blur">
            <button
              type="button"
              onClick={submit}
              disabled={!answer.trim()}
              className="ranger-button w-full"
            >
              [ SUBMIT KEYCODE ]
            </button>
          </div>
        </div>
      </div>

      <aside className="flex flex-col gap-4 overflow-auto pb-20">
        <div className="border-2 border-cyan-brand/20 bg-navy-brand/40 p-4">
          <h3 className="mb-2 font-display text-xs uppercase tracking-widest text-magenta-brand">
            How to read a byte
          </h3>
          <p className="mb-2 font-sans text-xs text-cyan-brand/90">
            Each row has 8 spots. A 1 counts. A 0 does not. Add up the numbers where you see a 1.
          </p>
          <p className="mb-2 font-sans text-xs text-cyan-brand/90">
            The spots are worth, from left to right:
          </p>
          <div className="mb-3 flex justify-between font-mono text-[11px] text-acid-brand">
            {POWERS_OF_TWO.map((n) => (
              <span key={n} className="w-7 text-center">{n}</span>
            ))}
          </div>
          <p className="mb-2 font-sans text-xs text-cyan-brand/90">
            The total is a number. Find the letter that matches that number on the chart below.
          </p>
          <div className="mt-3 border border-cyan-brand/30 bg-navy-deep/60 p-2 font-mono text-xs text-cyan-brand/80">
            <div className="mb-1 text-magenta-brand">Example</div>
            <div>
              <span className="text-acid-brand">01001000</span>
            </div>
            <div className="text-[11px] text-cyan-brand/70">
              0 + 64 + 0 + 0 + 8 + 0 + 0 + 0 = 72
            </div>
            <div>
              Number 72 is the letter <span className="text-acid-brand">H</span>.
            </div>
          </div>
        </div>
        <div className="border-2 border-yellow-700/40 bg-yellow-900/20 p-4">
          <h3 className="mb-2 font-display text-xs uppercase tracking-widest text-yellow-500/80">
            Old notes (be careful!)
          </h3>
          <p className="mb-1 font-sans text-xs text-yellow-200/80">
            Last code used: <span className="font-mono">01000101 01000100</span> — do NOT use this one.
          </p>
          <p className="font-sans text-xs text-yellow-200/70">
            Tries that did not work: <span className="font-mono">10101010, 11111111, 00000001</span>.
          </p>
        </div>
        <div className="border-2 border-cyan-brand/10 bg-navy-brand/30 p-4">
          <h3 className="mb-2 font-display text-xs uppercase tracking-widest text-cyan-brand/60">
            Letter chart
          </h3>
          <p className="mb-2 font-sans text-[11px] text-cyan-brand/70">
            Use this to match a number to a CAPITAL letter.
          </p>
          <div className="grid grid-cols-4 gap-x-2 gap-y-1 font-mono text-[10px] text-cyan-brand/70">
            {Array.from({ length: 16 }, (_, i) => {
              const code = 65 + i;
              return (
                <div key={code} className="flex justify-between">
                  <span className="text-acid-brand">{String.fromCharCode(code)}</span>
                  <span>{code}</span>
                </div>
              );
            })}
            <div className="col-span-4 mt-1 border-t border-cyan-brand/20 pt-1 font-sans text-[10px] text-cyan-brand/60">
              Small letters are 97 to 122. Numbers 0-9 are 48 to 57. Not needed here.
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
