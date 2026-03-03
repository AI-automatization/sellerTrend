import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLang } from '../lib/LangContext';
import type { Lang } from '../lib/i18n';
import { SunIcon, MoonIcon } from './icons';

interface NavbarProps {
  appUrl: string;
}

const THEME_KEY = 'ventra-landing-theme';

function useTheme() {
  const [dark, setDark] = useState(() => {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored) return stored === 'dark';
    } catch { /* Safari private mode */ }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  function toggle() {
    const next = !dark;
    setDark(next);
    const theme = next ? 'ventra-dark' : 'ventra-light';
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(THEME_KEY, next ? 'dark' : 'light'); } catch { /* Safari private mode */ }
  }

  return { dark, toggle };
}

export function Navbar({ appUrl }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { dark, toggle } = useTheme();
  const { lang, setLang, t } = useLang();

  const NAV_LINKS = [
    { label: t('nav.features'), href: '#features' },
    { label: t('nav.pricing'), href: '#pricing' },
    { label: t('nav.faq'), href: '#faq' },
    { label: t('nav.desktop'), href: '#download' },
  ];

  function toggleLang() {
    setLang(lang === 'uz' ? 'ru' : 'uz' as Lang);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function handleNavClick(href: string) {
    setOpen(false);
    const el = document.querySelector(href);
    el?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled || open
          ? 'bg-base-100/80 backdrop-blur-xl border-b border-base-300 shadow-lg'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <span className="font-display font-700 text-lg text-base-content">VENTRA</span>
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <button
                key={link.href}
                onClick={() => handleNavClick(link.href)}
                className="text-sm text-base-content/70 hover:text-base-content transition-colors cursor-pointer"
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* CTA + theme + lang toggle */}
          <div className="hidden md:flex items-center gap-3">
            {/* Lang toggle */}
            <button
              onClick={toggleLang}
              aria-label="Til o'zgartirish"
              className="btn btn-ghost btn-sm text-base-content/60 hover:text-base-content font-600 text-xs px-2"
            >
              {lang === 'uz' ? 'RU' : 'UZ'}
            </button>
            {/* Theme toggle */}
            <button
              onClick={toggle}
              aria-label="Tema o'zgartirish"
              className="btn btn-ghost btn-sm btn-circle text-base-content/60 hover:text-base-content"
            >
              {dark ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
            </button>
            <a
              href={`${appUrl}/login`}
              className="text-sm text-base-content/70 hover:text-base-content transition-colors"
            >
              {t('nav.login')}
            </a>
            <a
              href={`${appUrl}/register`}
              className="btn btn-primary btn-sm rounded-full px-5"
            >
              {t('nav.dashboard')}
            </a>
          </div>

          {/* Mobile: lang + theme toggle + hamburger */}
          <div className="md:hidden flex items-center gap-1">
            <button
              onClick={toggleLang}
              className="btn btn-ghost btn-xs font-600 text-base-content/60 px-1"
            >
              {lang === 'uz' ? 'RU' : 'UZ'}
            </button>
            <button
              onClick={toggle}
              aria-label="Tema"
              className="btn btn-ghost btn-sm btn-circle text-base-content/60"
            >
              {dark ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setOpen(!open)}
              aria-label="Menyu"
              aria-expanded={open}
              aria-controls="mobile-menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {open ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {open && (
            <motion.div
              id="mobile-menu"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-base-300 py-4 space-y-3"
            >
              {NAV_LINKS.map((link) => (
                <button
                  key={link.href}
                  onClick={() => handleNavClick(link.href)}
                  className="block w-full text-left text-sm text-base-content/70 hover:text-base-content py-2 transition-colors cursor-pointer"
                >
                  {link.label}
                </button>
              ))}
              <div className="flex gap-3 pt-2">
                <a href={`${appUrl}/login`} className="btn btn-ghost btn-sm flex-1">
                  {t('nav.login')}
                </a>
                <a href={`${appUrl}/register`} className="btn btn-primary btn-sm flex-1">
                  {t('nav.dashboard')}
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}
