import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6 text-center">
          <div className="playful-card max-w-lg w-full p-12 space-y-8 bg-surface shadow-3xl border-4 border-soft-red/20">
            <div className="relative mx-auto w-24 h-24">
              <div className="absolute inset-0 bg-soft-red/20 blur-2xl rounded-full animate-pulse" />
              <div className="relative z-10 w-full h-full bg-soft-red/10 rounded-3xl flex items-center justify-center text-soft-red border-4 border-soft-red/20">
                <AlertTriangle className="w-12 h-12" />
              </div>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl font-black italic tracking-tighter text-text-main">Anomaly Detected!</h1>
              <p className="text-text-dim font-bold uppercase tracking-widest text-xs">
                The system encountered an unexpected exception in the mainframe.
              </p>
              <div className="p-4 bg-brand-bg/50 rounded-2xl border-2 border-border border-dashed">
                <code className="text-[10px] font-mono text-soft-red break-all opacity-80">
                  {this.state.error?.message || 'Unknown Runtime Error'}
                </code>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-4 bg-text-main text-surface rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-xl shadow-soft-blue/20"
              >
                <RefreshCw className="w-4 h-4" />
                Retry System Boot
              </button>
              <button
                onClick={this.handleReset}
                className="w-full py-4 bg-surface border-4 border-border text-text-dim rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:border-text-main hover:text-text-main transition-all"
              >
                <Home className="w-4 h-4" />
                Return to Base
              </button>
            </div>

            <p className="text-[9px] font-bold text-text-dim/40 uppercase tracking-[0.2em]">
              Error Code: 0xDEB006_CRASH
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
