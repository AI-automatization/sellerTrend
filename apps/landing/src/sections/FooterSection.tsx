import { useLang } from '../lib/LangContext';

export function FooterSection() {
  const { t } = useLang();

  const COLUMNS = [
    {
      title: t('footer.col1'),
      links: [
        { label: t('nav.features'), href: '#features' },
        { label: t('nav.pricing'), href: '#pricing' },
        { label: t('nav.desktop'), href: '#download' },
        { label: 'Browser Extension', href: '#' },
      ],
    },
    {
      title: t('footer.col2'),
      links: [
        { label: t('footer.about'), href: '#' },
        { label: 'Blog', href: '#' },
        { label: t('footer.contact'), href: 'mailto:support@ventra.uz' },
      ],
    },
    {
      title: t('footer.col3'),
      links: [
        { label: 'FAQ', href: '#faq' },
        { label: t('footer.docs'), href: '#' },
        { label: 'support@ventra.uz', href: 'mailto:support@ventra.uz' },
      ],
    },
  ];

  return (
    <footer className="border-t border-white/5 pt-16 pb-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
                <span className="text-white font-bold text-sm">V</span>
              </div>
              <span className="font-display font-700 text-lg text-white">VENTRA</span>
            </div>
            <p className="text-sm text-base-content/50 leading-relaxed mb-4">
              {t('footer.desc')}
            </p>
            {/* Social */}
            <div className="flex gap-3">
              <a href="https://t.me/ventra_uz" target="_blank" rel="noopener noreferrer"
                 className="btn btn-ghost btn-sm btn-circle text-base-content/50 hover:text-white">
                ✈️
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer"
                 className="btn btn-ghost btn-sm btn-circle text-base-content/50 hover:text-white">
                📸
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer"
                 className="btn btn-ghost btn-sm btn-circle text-base-content/50 hover:text-white">
                ▶️
              </a>
            </div>
          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h4 className="font-600 text-sm text-white mb-4">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-base-content/50 hover:text-white transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-base-content/40">
            {t('footer.copyright')}
          </p>
          <div className="flex gap-4">
            <a href="#" className="text-xs text-base-content/40 hover:text-white transition-colors">
              {t('footer.privacy')}
            </a>
            <a href="#" className="text-xs text-base-content/40 hover:text-white transition-colors">
              {t('footer.terms')}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
