import { useEffect, useMemo, useRef, useState } from 'react';
import * as Blockly from 'blockly';
import type { PuzzleProps } from '../types';
import { useSessionStore } from '@/state/session';
import { DRONE_GRID, tileAt } from './grid';
import {
  blocksToInstructions,
  countBlockUses,
  DRONE_TOOLBOX,
  registerDroneBlocks,
} from './custom-blocks';
import {
  BLOCK_LIMITS,
  checkBlockLimits,
  simulate,
  verdict,
  type SimulatorResult,
} from './simulator';

const SIGNAL_LOST_THEME = Blockly.Theme.defineTheme('signal-lost', {
  name: 'signal-lost',
  base: Blockly.Themes.Classic,
  componentStyles: {
    // Keep workspace bright white like the default (user preference)
    workspaceBackgroundColour: '#FFFFFF',
    // Left toolbox: dark but with HIGH contrast text so categories pop
    toolboxBackgroundColour: '#0B0F2B',
    toolboxForegroundColour: '#FFFFFF',
    flyoutBackgroundColour: '#F4F6FA',
    flyoutForegroundColour: '#0B0F2B',
    flyoutOpacity: 1,
    scrollbarColour: '#64748b',
    scrollbarOpacity: 0.6,
    insertionMarkerColour: '#FF2BD6',
    insertionMarkerOpacity: 0.4,
    cursorColour: '#FF2BD6',
    markerColour: '#0066FF',
    selectedGlowColour: '#FF2BD6',
    selectedGlowOpacity: 0.6,
  },
  fontStyle: {
    family: 'Inter, system-ui, sans-serif',
    weight: '600',
    size: 14,
  },
  blockStyles: {},
  categoryStyles: {},
});

const CELL_PX = 48;

export function BlocklyPuzzle({ draft, onDraftChange, onSubmit }: PuzzleProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const [simResult, setSimResult] = useState<SimulatorResult | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [blockCounts, setBlockCounts] = useState<Record<string, number>>({});
  const setByteContext = useSessionStore((s) => s.setByteContext);

  useEffect(() => {
    const usage = Object.entries(blockCounts)
      .map(([k, v]) => `${k.replace('drone_', '')}:${v}`)
      .join(' ');
    const sim = simResult
      ? `last run: end=(${simResult.finalPos[0]},${simResult.finalPos[1]}) chips=${simResult.chipsCollected}/${simResult.totalChips} danger=${simResult.hitDanger} offGrid=${simResult.offGrid} usedRepeat=${simResult.usedRepeat}`
      : 'Not run yet.';
    setByteContext('p4', `Blockly state: ${sim}. Block usage: ${usage || 'empty'}. ${statusMsg ?? ''}`);
  }, [blockCounts, simResult, statusMsg, setByteContext]);

  useEffect(() => {
    registerDroneBlocks();
    if (!containerRef.current) return;
    const ws = Blockly.inject(containerRef.current, {
      toolbox: DRONE_TOOLBOX,
      theme: SIGNAL_LOST_THEME,
      media: '/blockly/',
      grid: { spacing: 20, length: 3, colour: '#d7e1ea', snap: true },
      trashcan: true,
      // Blockly needs the scrollbar machinery to enable drag-to-pan, even though
      // we hide the scrollbars visually via CSS.
      scrollbars: true,
      move: {
        drag: true, // click and drag empty space to pan
        wheel: false, // wheel is used for zoom, not scroll
        scrollbars: true,
      },
      zoom: {
        controls: true, // +/- buttons in the corner
        wheel: true, // scroll wheel zooms in/out
        startScale: 1,
        maxScale: 2,
        minScale: 0.5,
        scaleSpeed: 1.1,
        pinch: true,
      },
    });
    workspaceRef.current = ws;

    if (draft) {
      try {
        const parsed: unknown = JSON.parse(draft);
        Blockly.serialization.workspaces.load(parsed as Record<string, unknown>, ws);
      } catch {
        // ignore corrupt draft
      }
    }

    const persist = () => {
      const state = Blockly.serialization.workspaces.save(ws);
      onDraftChange(JSON.stringify(state));
      // Update live block usage counts
      const topBlocks = ws.getTopBlocks(false);
      const merged: Record<string, number> = {};
      for (const tb of topBlocks) {
        const c = countBlockUses(tb);
        for (const [k, v] of Object.entries(c)) {
          merged[k] = (merged[k] ?? 0) + v;
        }
      }
      setBlockCounts(merged);
      // Force a resize to clear any stale scrollbar remnants from flyout events.
      Blockly.svgResize(ws);
    };
    ws.addChangeListener(persist);

    // After any toolbox category open/close, sweep the DOM for stale scrollbar
    // handles that Blockly sometimes leaves behind on the workspace overlay.
    const toolbox = ws.getToolbox() as unknown as
      | { addActionListener?: (fn: () => void) => void }
      | null;
    const onToolboxChange = () => {
      window.setTimeout(() => {
        Blockly.svgResize(ws);
      }, 120);
    };
    toolbox?.addActionListener?.(onToolboxChange);

    const onResize = () => {
      if (workspaceRef.current) Blockly.svgResize(workspaceRef.current);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      ws.dispose();
      workspaceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = () => {
    const ws = workspaceRef.current;
    if (!ws) return;
    const topBlocks = ws.getTopBlocks(true);
    const first = topBlocks[0] ?? null;

    // Block-limit check runs BEFORE simulation.
    const merged: Record<string, number> = {};
    for (const tb of topBlocks) {
      const c = countBlockUses(tb);
      for (const [k, v] of Object.entries(c)) {
        merged[k] = (merged[k] ?? 0) + v;
      }
    }
    setBlockCounts(merged);
    const limitResult = checkBlockLimits(merged);
    if (!limitResult.ok) {
      const worst = limitResult.overLimit[0]!;
      const msg = `Too many "${worst.label}" blocks. Max is ${worst.max}, you used ${worst.used}. Try a repeat block to save blocks!`;
      setStatusMsg(msg);
      setSimResult(null);
      onSubmit({ ok: false, reason: 'over_limit', hintableMistake: 'over_limit' });
      return;
    }

    const program = first ? blocksToInstructions(first) : [];
    const result = simulate(program);
    const v = verdict(result, program.length > 0);
    setSimResult(result);
    setStatusMsg(v.message);
    onSubmit(v.ok ? { ok: true } : { ok: false, reason: v.reason ?? 'unknown', hintableMistake: v.reason });
  };

  const clearAll = () => {
    const ws = workspaceRef.current;
    if (!ws) return;
    ws.clear();
    setSimResult(null);
    setStatusMsg(null);
  };

  const pathSet = useMemo(() => {
    if (!simResult) return new Set<string>();
    return new Set(simResult.path.map(([c, r]) => `${c},${r}`));
  }, [simResult]);

  return (
    <div className="grid h-full grid-cols-1 gap-4 p-6 xl:grid-cols-[1fr_360px]">
      <div className="flex min-h-[520px] flex-col">
        <div className="sticky top-0 z-10 mb-2 flex items-center justify-between bg-navy-deep/95 py-2 backdrop-blur">
          <span className="font-mono text-xs text-cyan-brand/70">&gt; BLOCK WORKSPACE</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={clearAll}
              aria-label="Clear all blocks from the workspace"
              title="Delete every block and start fresh"
              className="flex items-center gap-1 border-2 border-alert-brand/60 bg-alert-brand/10 px-3 py-1 font-display text-xs tracking-wider text-alert-brand transition-colors hover:border-alert-brand hover:bg-alert-brand/20"
            >
              <span aria-hidden="true">🗑</span>
              <span>CLEAR ALL</span>
            </button>
            <button type="button" className="ranger-button" onClick={run}>
              [ RUN DRONE ]
            </button>
          </div>
        </div>
        <div
          ref={containerRef}
          style={{ minHeight: 480 }}
          className="flex-1 border-2 border-cyan-brand/30 bg-navy-deep"
        />
      </div>

      <aside className="flex flex-col gap-4 pb-20">
        <div className="border-2 border-cyan-brand/30 bg-navy-brand/60 p-3">
          <h3 className="mb-2 font-display text-xs uppercase tracking-widest text-magenta-brand">
            Grid
          </h3>
          <div
            className="grid gap-0.5"
            style={{ gridTemplateColumns: `repeat(${DRONE_GRID.width}, ${CELL_PX}px)` }}
          >
            {Array.from({ length: DRONE_GRID.width * DRONE_GRID.height }).map((_, idx) => {
              const col = idx % DRONE_GRID.width;
              const row = Math.floor(idx / DRONE_GRID.width);
              const kind = tileAt(DRONE_GRID, col, row);
              const onPath = pathSet.has(`${col},${row}`);
              const cellClasses = {
                start: 'bg-green-400/30 text-green-300',
                end: 'bg-acid-brand/25 text-acid-brand shadow-[0_0_10px_rgba(249,248,113,0.6)]',
                chip: 'bg-cyan-brand/30 text-cyan-brand',
                danger: 'bg-alert-brand/40 text-alert-brand',
                empty: 'bg-navy-deep text-cyan-brand/20',
              }[kind];
              const icon =
                kind === 'start'
                  ? 'S'
                  : kind === 'end'
                    ? '🔑'
                    : kind === 'chip'
                      ? 'M'
                      : kind === 'danger'
                        ? 'X'
                        : '';
              return (
                <div
                  key={`${col},${row}`}
                  style={{ width: CELL_PX, height: CELL_PX }}
                  className={`flex items-center justify-center border border-cyan-brand/20 font-display text-base ${cellClasses} ${onPath ? 'ring-2 ring-acid-brand/70' : ''}`}
                >
                  <span aria-label={kind === 'end' ? 'master key' : undefined}>{icon}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-2 font-mono text-[10px] leading-relaxed text-cyan-brand/70">
            <span className="text-green-300">S</span> = start,{' '}
            <span className="text-acid-brand">🔑</span> = master key (you must end here with ALL chips),{' '}
            <span className="text-cyan-brand">M</span> = memory chip,{' '}
            <span className="text-alert-brand">X</span> = danger. The drone starts facing DOWN.
          </p>
        </div>

        <div className="border-2 border-acid-brand/40 bg-navy-brand/60 p-3">
          <h4 className="mb-2 font-display text-xs uppercase tracking-widest text-acid-brand">
            Block limits
          </h4>
          <p className="mb-2 font-sans text-[11px] text-cyan-brand/70">
            You can only use a few of each. Use a <span className="text-magenta-brand">repeat</span> block to stretch further.
          </p>
          <ul className="space-y-1 font-mono text-xs">
            {Object.entries(BLOCK_LIMITS).map(([type, rule]) => {
              const used = blockCounts[type] ?? 0;
              const ratio = used / rule.max;
              const color =
                used > rule.max
                  ? 'text-alert-brand'
                  : ratio >= 1
                    ? 'text-yellow-300'
                    : 'text-cyan-brand';
              return (
                <li key={type} className={`flex items-center justify-between gap-2 ${color}`}>
                  <span>{rule.label}</span>
                  <span>
                    {used} / {rule.max}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="border-2 border-cyan-brand/20 bg-navy-brand/40 p-3">
          <h4 className="mb-2 font-display text-xs uppercase tracking-widest text-cyan-brand/70">
            Result
          </h4>
          {simResult ? (
            <ul className="space-y-1 font-mono text-xs">
              <li>
                chips: {simResult.chipsCollected}/{simResult.totalChips}
              </li>
              <li>used repeat: {simResult.usedRepeat ? 'yes' : 'no'}</li>
              <li>final: ({simResult.finalPos[0]},{simResult.finalPos[1]})</li>
              <li>steps: {simResult.stepCount}</li>
              {statusMsg ? <li className="text-magenta-brand">{statusMsg}</li> : null}
            </ul>
          ) : (
            <p className="font-mono text-xs text-cyan-brand/50">
              connect blocks and click RUN DRONE to test.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
