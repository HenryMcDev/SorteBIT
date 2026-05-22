import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Erro capturado pelo ErrorBoundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleRestart = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Ops! Algo deu errado.</h2>
            <p className="text-zinc-400 text-sm mb-6">
              Ocorreu um erro inesperado na renderização do componente.
            </p>
            
            <div className="w-full bg-black/50 border border-zinc-800 rounded-lg p-4 mb-6 overflow-x-auto text-left">
              <p className="text-red-400 font-mono text-xs font-bold mb-2">
                {this.state.error?.toString()}
              </p>
              <pre className="text-zinc-500 font-mono text-[10px] whitespace-pre-wrap">
                {this.state.errorInfo?.componentStack}
              </pre>
            </div>

            <button
              onClick={this.handleRestart}
              className="w-full flex items-center justify-center h-12 bg-school-blue-600 hover:bg-school-blue-700 text-white font-bold rounded-xl transition-colors"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Reiniciar Aplicativo
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
