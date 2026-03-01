const APP_URL = 'https://app.ventra.uz';

const COLUMNS = [
  {
    title: 'Mahsulot',
    links: [
      { label: 'Imkoniyatlar', href: '#features' },
      { label: 'Narxlar', href: '#pricing' },
      { label: 'Desktop Ilova', href: '#download' },
      { label: 'Browser Extension', href: '#' },
    ],
  },
  {
    title: 'Kompaniya',
    links: [
      { label: 'Biz haqimizda', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Aloqa', href: 'mailto:support@ventra.uz' },
    ],
  },
  {
    title: 'Yordam',
    links: [
      { label: 'FAQ', href: '#faq' },
      { label: 'Hujjatlar', href: '#' },
      { label: 'support@ventra.uz', href: 'mailto:support@ventra.uz' },
    ],
  },
];

export function FooterSection() {
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
              Uzum.uz sotuvchilari uchun premium AI analytics platforma.
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
            <div key={col.title}>
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
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-base-content/40">
            © 2026 VENTRA. Barcha huquqlar himoyalangan.
          </p>
          <div className="flex gap-4">
            <a href="#" className="text-xs text-base-content/40 hover:text-white transition-colors">
              Maxfiylik siyosati
            </a>
            <a href="#" className="text-xs text-base-content/40 hover:text-white transition-colors">
              Foydalanish shartlari
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
