import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface NavbarProps {
  appUrl: string;
}

const NAV_LINKS = [
  { label: 'Imkoniyatlar', href: '#features' },
  { label: 'Narxlar', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Desktop', href: '#download' },
];

export function Navbar({ appUrl }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

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
        scrolled
          ? 'bg-base-100/80 backdrop-blur-xl border-b border-white/5 shadow-lg'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <span className="font-display font-700 text-lg text-white">VENTRA</span>
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <button
                key={link.href}
                onClick={() => handleNavClick(link.href)}
                className="text-sm text-base-content/70 hover:text-white transition-colors cursor-pointer"
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* CTA buttons */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href={`${appUrl}/login`}
              className="text-sm text-base-content/70 hover:text-white transition-colors"
            >
              Kirish
            </a>
            <a
              href={`${appUrl}/register`}
              className="btn btn-primary btn-sm rounded-full px-5"
            >
              Dashboard →
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden btn btn-ghost btn-sm"
            onClick={() => setOpen(!open)}
            aria-label="Menyu"
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

        {/* Mobile menu */}
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-white/5 py-4 space-y-3"
          >
            {NAV_LINKS.map((link) => (
              <button
                key={link.href}
                onClick={() => handleNavClick(link.href)}
                className="block w-full text-left text-sm text-base-content/70 hover:text-white py-2 transition-colors cursor-pointer"
              >
                {link.label}
              </button>
            ))}
            <div className="flex gap-3 pt-2">
              <a href={`${appUrl}/login`} className="btn btn-ghost btn-sm flex-1">
                Kirish
              </a>
              <a href={`${appUrl}/register`} className="btn btn-primary btn-sm flex-1">
                Dashboard →
              </a>
            </div>
          </motion.div>
        )}
      </div>
    </motion.header>
  );
}
