import { Component, type ErrorInfo, type ReactNode } from 'react';
import { PrimaryButton } from './PrimaryButton';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches render-time errors in the child tree and shows a
 * recoverable fallback instead of crashing the whole OS.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[OS] Uncaught error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-[#e8eaf0] p-6 text-center">
          <div className="flex max-w-md flex-col items-center gap-3 rounded-[20px] border border-white/50 bg-white/70 p-8 shadow-[var(--shadow-window)] backdrop-blur-xl">
            <p className="text-[18px] font-semibold text-neutral-900">Something went wrong</p>
            <p className="text-[13.5px] leading-relaxed text-neutral-500">
              An unexpected error occurred. You can reload the page to restart the workspace.
            </p>
            <code className="max-w-full truncate rounded-[8px] bg-black/[0.05] px-3 py-1.5 text-[12px] text-neutral-500">
              {this.state.error?.message ?? 'Unknown error'}
            </code>
            <PrimaryButton onClick={() => window.location.reload()}>
              Reload workspace
            </PrimaryButton>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
