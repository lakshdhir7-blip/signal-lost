import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Signal Lost] Render crash:', error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-deep p-6">
        <div className="max-w-md border-2 border-alert-brand bg-navy-brand p-8 text-center font-mono text-cyan-brand">
          <h1 className="mb-4 font-display text-xl text-alert-brand">SIGNAL INTERRUPTED</h1>
          <p className="mb-6 text-sm leading-relaxed">
            something glitched. your progress is saved. refresh to pick up where you left off, ranger.
          </p>
          <button
            type="button"
            className="ranger-button"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
          {import.meta.env.DEV && this.state.error ? (
            <pre className="mt-6 overflow-auto text-left text-xs text-alert-brand/80">
              {this.state.error.stack ?? this.state.error.message}
            </pre>
          ) : null}
        </div>
      </div>
    );
  }
}
