import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 p-8">
          <div className="text-6xl">⚠️</div>
          <h2 className="text-xl font-bold text-base-content">
            Kutilmagan xato yuz berdi
          </h2>
          <p className="text-base-content/60 text-sm max-w-md text-center">
            {this.state.error?.message || "Sahifani qayta yuklang yoki boshqa sahifaga o'ting."}
          </p>
          <div className="flex gap-2">
            <button
              className="btn btn-primary btn-sm"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Qayta urinish
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => (window.location.href = '/')}
            >
              Bosh sahifaga
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
