import { useState } from 'react';
import { toolsApi } from '../api/client';
import { getErrorMessage } from '../utils/getErrorMessage';
import { useI18n } from '../i18n/I18nContext';

interface DescResult {
  title_optimized: string;
  description: string;
  bullets: string[];
  seo_keywords: string[];
}

export function DescriptionGeneratorPage() {
  const { t } = useI18n();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [keywords, setKeywords] = useState('');
  const [result, setResult] = useState<DescResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setError('');
    setLoading(true);
    setResult(null);
    try {
      const res = await toolsApi.generateDescription({
        title: title.trim(),
        category: category.trim() || undefined,
        keywords: keywords.trim() ? keywords.split(',').map((k) => k.trim()) : undefined,
      });
      setResult(res.data);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function copyText(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  }

  return (
    <div className="w-full space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 lg:w-7 lg:h-7 text-secondary">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
          </svg>
          {t('aidesc.title')}
        </h1>
        <p className="text-base-content/50 text-sm mt-1">
          {t('aidesc.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="rounded-2xl bg-base-200/60 border border-base-300/50">
          <div className="card-body">
            <h2 className="card-title text-base">{t('aidesc.productInfo')}</h2>
            <form onSubmit={handleGenerate} className="space-y-3 mt-2">
              <fieldset className="fieldset">
                <legend className="fieldset-legend text-xs">{t('aidesc.productName')}</legend>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="input input-bordered w-full"
                  placeholder="Samsung Galaxy A54 5G 128GB"
                />
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend text-xs">{t('aidesc.category')}</legend>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="input input-bordered w-full"
                  placeholder="Smartfonlar"
                />
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend text-xs">{t('aidesc.keywords')}</legend>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  className="input input-bordered w-full"
                  placeholder="samsung, telefon, 5g, arzon"
                />
              </fieldset>

              {error && <p className="text-error text-sm">{error}</p>}

              <button type="submit" disabled={loading} className="btn btn-primary w-full">
                {loading && <span className="loading loading-spinner loading-sm" />}
                {loading ? t('aidesc.generating') : t('aidesc.generate')}
              </button>
            </form>
          </div>
        </div>

        {/* Result */}
        <div className="space-y-4">
          {result ? (
            <>
              {/* Optimized title */}
              <div className="rounded-2xl bg-base-200/60 border border-base-300/50">
                <div className="card-body p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm">{t('aidesc.optimizedTitle')}</h3>
                    <button
                      onClick={() => copyText(result.title_optimized, 'title')}
                      className="btn btn-ghost btn-xs"
                    >
                      {copied === 'title' ? t('common.copied') : t('common.copy')}
                    </button>
                  </div>
                  <p className="text-base mt-1">{result.title_optimized}</p>
                </div>
              </div>

              {/* Description */}
              <div className="rounded-2xl bg-base-200/60 border border-base-300/50">
                <div className="card-body p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm">{t('aidesc.description')}</h3>
                    <button
                      onClick={() => copyText(result.description, 'desc')}
                      className="btn btn-ghost btn-xs"
                    >
                      {copied === 'desc' ? t('common.copied') : t('common.copy')}
                    </button>
                  </div>
                  <p className="text-sm mt-1 whitespace-pre-line text-base-content/80">{result.description}</p>
                </div>
              </div>

              {/* Bullets */}
              {result.bullets.length > 0 && (
                <div className="rounded-2xl bg-base-200/60 border border-base-300/50">
                  <div className="card-body p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm">{t('aidesc.features')}</h3>
                      <button
                        onClick={() => copyText(result.bullets.map((b) => `• ${b}`).join('\n'), 'bullets')}
                        className="btn btn-ghost btn-xs"
                      >
                        {copied === 'bullets' ? t('common.copied') : t('common.copy')}
                      </button>
                    </div>
                    <ul className="mt-2 space-y-1">
                      {result.bullets.map((b, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-success mt-0.5">•</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* SEO Keywords */}
              {result.seo_keywords.length > 0 && (
                <div className="rounded-2xl bg-base-200/60 border border-base-300/50">
                  <div className="card-body p-4">
                    <h3 className="font-bold text-sm">{t('aidesc.seoKeywords')}</h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {result.seo_keywords.map((kw, i) => (
                        <span key={i} className="badge badge-outline badge-sm">{kw}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl bg-base-200/60 border border-base-300/50">
              <div className="card-body items-center py-16 text-base-content/40">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                <p>{t('aidesc.inputHint')}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
