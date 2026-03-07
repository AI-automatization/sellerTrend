import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext';

export function NotFoundPage() {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 p-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-[30rem] h-[30rem] rounded-full bg-primary/3 blur-3xl" />
      </div>

      <div className="relative text-center space-y-6 max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
            <span className="text-primary-content font-black text-lg font-heading">V</span>
          </div>
          <span className="font-heading font-bold text-lg tracking-tight">VENTRA</span>
        </div>

        <h1 className="text-8xl font-black text-primary/20 font-heading tracking-tight leading-none">
          404
        </h1>

        <div className="space-y-2">
          <h2 className="text-xl font-bold">{t('notFound.title')}</h2>
          <p className="text-base-content/50 text-sm">{t('notFound.description')}</p>
        </div>

        <button
          onClick={() => navigate('/')}
          className="btn btn-primary shadow-lg shadow-primary/20"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
          {t('notFound.goHome')}
        </button>
      </div>
    </div>
  );
}
