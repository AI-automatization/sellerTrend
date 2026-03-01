import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** 'page' = full-screen fallback (default), 'section' = compact inline fallback */
  variant?: 'page' | 'section';
  /** Section label shown in compact fallback */
  label?: string;
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
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      if (this.props.variant === 'section') {
        return (
          <div className="rounded-2xl border border-error/20 bg-error/5 p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xl shrink-0">⚠️</span>
              <div>
                <p className="text-sm font-medium text-base-content/80">
                  {this.props.label ?? 'Bo\'lim'} yuklanmadi
                </p>
                <p className="text-xs text-base-content/40 mt-0.5">
                  {this.state.error?.message ?? 'Kutilmagan xato'}
                </p>
              </div>
            </div>
            <button
              className="btn btn-ghost btn-xs shrink-0"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Qayta
            </button>
          </div>
        );
      }

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
