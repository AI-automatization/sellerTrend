import { Link } from 'react-router-dom';
import { MagnifyingGlassIcon, ArrowTrendingUpIcon } from '../icons';
import { FadeIn } from './FadeIn';
import { useI18n } from '../../i18n/I18nContext';

interface Props {
  userEmail: string;
  onStartAnalysis: () => void;
}

const EXAMPLE_PRODUCTS = [
  { id: 4700, title: 'Smartfon Samsung Galaxy', score: 8.4 },
  { id: 35767, title: 'Simsiz naushnik TWS', score: 7.9 },
  { id: 89318, title: 'Elektr choynak 1.8L', score: 7.2 },
];

interface CheckItemProps {
  done: boolean;
  step: number;
  label: string;
  action?: React.ReactNode;
}

function CheckItem({ done, step, label, action }: CheckItemProps) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
      done ? 'bg-success/6' : 'bg-base-content/3 hover:bg-base-content/5'
    }`}>
      {/* Icon */}
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
        done
          ? 'bg-success/15 text-success'
          : 'bg-base-content/8 text-base-content/40'
      }`}>
        {done ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        ) : (
          <span>{step}</span>
        )}
      </div>

      {/* Label */}
      <span className={`flex-1 text-sm font-medium ${
        done ? 'text-success/80 line-through decoration-success/30' : 'text-base-content/70'
      }`}>
        {label}
      </span>

      {/* Action */}
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function EmptyState({ userEmail, onStartAnalysis }: Props) {
  const { t } = useI18n();
  const userName = userEmail.split('@')[0];

  return (
    <div className="space-y-6 w-full max-w-3xl mx-auto">
      {/* Welcome header */}
      <FadeIn>
        <div className="text-center pt-4 pb-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary via-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20 mx-auto mb-4 ring-1 ring-primary/20">
            <span className="text-primary-content font-black text-2xl font-heading">V</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight font-heading">
            {t('empty.welcome')}, <span className="ventra-gradient-text">{userName}</span>!
          </h1>
          <p className="text-sm text-base-content/40 mt-2 max-w-md mx-auto">
            {t('empty.subtitle')}
          </p>
        </div>
      </FadeIn>

      {/* Checklist card */}
      <FadeIn delay={100}>
        <div className="ventra-card rounded-2xl border border-base-300/40 bg-base-200/30 p-5 lg:p-6">
          <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-base-content/35 mb-4">
            {t('empty.steps')}
          </h2>
          <div className="space-y-2">
            <CheckItem
              done
              step={1}
              label={t('empty.step1')}
            />
            <CheckItem
              done={false}
              step={2}
              label={t('empty.step2')}
              action={
                <button
                  onClick={onStartAnalysis}
                  className="btn btn-primary btn-sm gap-1.5 shadow-md shadow-primary/15 text-xs"
                >
                  <MagnifyingGlassIcon className="w-3.5 h-3.5" />
                  {t('empty.start')}
                </button>
              }
            />
            <CheckItem
              done={false}
              step={3}
              label={t('empty.step3')}
            />
            <CheckItem
              done={false}
              step={4}
              label={t('empty.step4')}
              action={
                <a
                  href="https://t.me/ventra_bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-sm border border-base-300/40 gap-1.5 hover:border-primary/20 transition-all text-xs"
                >
                  {t('empty.connect')}
                </a>
              }
            />
          </div>
        </div>
      </FadeIn>

      {/* Divider */}
      <FadeIn delay={200}>
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-base-300/40" />
          <span className="text-xs text-base-content/25 font-medium uppercase tracking-wider">
            {t('empty.or')}
          </span>
          <div className="h-px flex-1 bg-base-300/40" />
        </div>
      </FadeIn>

      {/* Example products */}
      <FadeIn delay={300}>
        <div>
          <div className="flex items-center gap-2 mb-4">
            <ArrowTrendingUpIcon className="w-4 h-4 text-primary/60" />
            <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-base-content/35">
              {t('empty.topProducts')}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {EXAMPLE_PRODUCTS.map((p) => (
              <div
                key={p.id}
                className="ventra-card rounded-2xl border border-base-300/40 bg-base-200/30 p-4 flex flex-col gap-3 hover:border-primary/20 transition-all group"
              >
                {/* Product image placeholder */}
                <div className="w-full aspect-square rounded-xl bg-base-content/5 flex items-center justify-center">
                  <span className="text-3xl text-base-content/10 font-heading font-bold">
                    {p.id}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate text-base-content/80">
                    {p.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                      {p.score}
                    </span>
                    <span className="text-[11px] text-base-content/30">score</span>
                  </div>
                </div>

                {/* Action */}
                <Link
                  to={`/analyze?productId=${p.id}`}
                  className="btn btn-ghost btn-sm w-full border border-base-300/40 gap-1.5 hover:border-primary/20 text-xs group-hover:border-primary/30 transition-all"
                >
                  <MagnifyingGlassIcon className="w-3.5 h-3.5" />
                  {t('empty.analyze')}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </FadeIn>

      {/* Discovery link */}
      <FadeIn delay={400}>
        <div className="text-center pb-4">
          <Link
            to="/discovery"
            className="inline-flex items-center gap-2 text-xs text-base-content/35 hover:text-primary transition-colors font-medium"
          >
            <ArrowTrendingUpIcon className="w-3.5 h-3.5" />
            {t('empty.exploreDiscovery')}
          </Link>
        </div>
      </FadeIn>
    </div>
  );
}
