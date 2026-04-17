/**
 * Lazy Pyodide loader. Injects the Pyodide runtime script from jsDelivr on
 * first use, caches the initialized instance for the life of the tab, and
 * exposes a 3-second watchdog executor that captures stdout.
 *
 * The loader is safe to call multiple times; parallel callers share the same
 * in-flight promise.
 */

const PYODIDE_VERSION = '0.26.4';
const PYODIDE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/pyodide.js`;
const PYODIDE_INDEX = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

declare global {
  interface Window {
    loadPyodide?: (config: { indexURL: string; stdout?: (s: string) => void; stderr?: (s: string) => void }) => Promise<PyodideInterface>;
  }
}

export interface PyodideInterface {
  runPython: (code: string) => unknown;
  runPythonAsync: (code: string) => Promise<unknown>;
  setStdout: (opts: { batched: (s: string) => void }) => void;
  setStderr: (opts: { batched: (s: string) => void }) => void;
  globals: {
    get: (name: string) => unknown;
    set: (name: string, value: unknown) => void;
  };
}

let loadPromise: Promise<PyodideInterface> | null = null;

function injectScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-pyodide]`);
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
      } else {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('Pyodide script failed to load')));
      }
      return;
    }
    const script = document.createElement('script');
    script.src = PYODIDE_URL;
    script.async = true;
    script.dataset.pyodide = 'true';
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error('Pyodide script failed to load'));
    document.head.appendChild(script);
  });
}

export function loadPyodideRuntime(): Promise<PyodideInterface> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    await injectScript();
    if (!window.loadPyodide) {
      throw new Error('Pyodide global missing after script load');
    }
    const pyodide = await window.loadPyodide({ indexURL: PYODIDE_INDEX });
    // Pin stdout/stderr so puzzles can capture.
    return pyodide;
  })();
  return loadPromise;
}

/** Start downloading Pyodide in the background. Fire-and-forget from idle hooks. */
export function prefetchPyodide() {
  if (loadPromise) return;
  const idle: (cb: () => void) => number =
    (window as typeof window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback ??
    ((cb) => window.setTimeout(cb, 0));
  idle(() => {
    loadPyodideRuntime().catch((err) => console.warn('[pyodide] prefetch failed', err));
  });
}

export interface PyodideRunResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  error?: string;
  timedOut?: boolean;
}

/** Run Python with 3-second watchdog. Captures stdout/stderr. */
export async function runPythonSafe(code: string, timeoutMs = 3000): Promise<PyodideRunResult> {
  const pyodide = await loadPyodideRuntime();
  let stdout = '';
  let stderr = '';
  pyodide.setStdout({ batched: (s) => (stdout += s) });
  pyodide.setStderr({ batched: (s) => (stderr += s) });

  const exec = pyodide.runPythonAsync(code);
  let timedOut = false;
  const timeout = new Promise<never>((_, reject) => {
    window.setTimeout(() => {
      timedOut = true;
      reject(new Error('timeout'));
    }, timeoutMs);
  });

  try {
    await Promise.race([exec, timeout]);
    return { ok: true, stdout, stderr };
  } catch (err) {
    if (timedOut) {
      return {
        ok: false,
        stdout,
        stderr,
        timedOut: true,
        error: 'your code ran too long. check for an endless loop.',
      };
    }
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, stdout, stderr, error: message };
  }
}
