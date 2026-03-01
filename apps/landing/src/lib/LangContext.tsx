import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { t } from './i18n';
import type { Lang, TranslationKey } from './i18n';

const LANG_KEY = 'ventra-landing-lang';

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem(LANG_KEY);
    return (stored === 'ru' ? 'ru' : 'uz') as Lang;
  });

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem(LANG_KEY, l);
  }, []);

  const translate = useCallback(
    (key: TranslationKey) => t(lang, key),
    [lang],
  );

  return (
    <LangContext.Provider value={{ lang, setLang, t: translate }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used inside LangProvider');
  return ctx;
}
