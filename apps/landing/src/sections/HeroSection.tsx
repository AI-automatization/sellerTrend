import { motion } from 'framer-motion';
import { useLang } from '../lib/LangContext';

interface HeroSectionProps {
  appUrl: string;
}

export function HeroSection({ appUrl }: HeroSectionProps) {
  const { t } = useLang();

  return (
    <section id="hero" aria-label="Bosh sahifa" className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Animated gradient mesh background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="mesh-blob absolute top-1/4 -left-32 w-96 h-96 rounded-full opacity-20"
             style={{ background: 'radial-gradient(circle, #2E5BFF 0%, transparent 70%)' }} />
        <div className="mesh-blob absolute top-1/3 -right-32 w-96 h-96 rounded-full opacity-15"
             style={{ background: 'radial-gradient(circle, #7C3AED 0%, transparent 70%)', animationDelay: '-7s' }} />
        <div className="mesh-blob absolute bottom-1/4 left-1/3 w-64 h-64 rounded-full opacity-10"
             style={{ background: 'radial-gradient(circle, #06B6D4 0%, transparent 70%)', animationDelay: '-3s' }} />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-5"
             style={{
               backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
               backgroundSize: '60px 60px',
             }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text */}
          <div>
            {/* Social proof badge — no animation for LCP */}
            <div className="inline-flex items-center gap-2 glass-card rounded-full px-4 py-2 mb-6">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs text-base-content/70">{t('hero.badge')}</span>
            </div>

            {/* Heading — no animation for SEO crawlability + LCP */}
            <h1 className="font-display font-800 text-4xl sm:text-5xl lg:text-6xl text-white leading-tight mb-6">
              {t('hero.title1')}{' '}
              <span className="gradient-text">{t('hero.title2')}</span>
              {' '}{t('hero.title3')}
            </h1>

            {/* Description — no animation for crawler visibility */}
            <p className="text-base-content/60 text-lg leading-relaxed mb-8 max-w-xl">
              {t('hero.desc')}
            </p>

            {/* CTA buttons — no animation for LCP */}
            <div className="flex flex-wrap gap-3 mb-8">
              <a
                href={`${appUrl}/register`}
                className="btn btn-primary rounded-full px-8 py-3 text-base font-600 glow-btn"
                aria-label="Bepul ro'yxatdan o'tish"
              >
                {t('hero.cta1')}
              </a>
              <a
                href="#download"
                onClick={(e) => {
                  e.preventDefault();
                  document.querySelector('#download')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="btn btn-outline rounded-full px-8 py-3 text-base font-600 border-white/20 text-white hover:bg-white/10"
                aria-label="Desktop ilovani yuklab olish"
              >
                🖥️ {t('hero.cta2')}
              </a>
            </div>

            {/* Trust signals — no animation */}
            <div className="flex flex-wrap gap-4 text-sm text-base-content/50">
              <span className="flex items-center gap-1.5">
                <span className="text-success">✓</span> {t('hero.trust1')}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-success">✓</span> {t('hero.trust2')}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-success">✓</span> {t('hero.trust3')}
              </span>
            </div>
          </div>

          {/* Right: Dashboard mockup */}
          <motion.div
            initial={{ opacity: 0, x: 60, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="animate-float"
          >
            {/* Laptop frame */}
            <div className="relative">
              <div className="glass-card rounded-2xl p-3 shadow-2xl glow-blue">
                {/* Browser bar */}
                <div className="flex items-center gap-1.5 mb-3 px-2">
                  <div className="w-3 h-3 rounded-full bg-error/60" />
                  <div className="w-3 h-3 rounded-full bg-warning/60" />
                  <div className="w-3 h-3 rounded-full bg-success/60" />
                  <div className="flex-1 mx-3 bg-base-300 rounded-md h-5 flex items-center px-2">
                    <span className="text-xs text-base-content/40">app.ventra.uz</span>
                  </div>
                </div>
                {/* Dashboard preview */}
                <div className="bg-base-200 rounded-xl p-4 aspect-video flex flex-col gap-3">
                  {/* KPI row */}
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'Mahsulotlar', value: '247', color: 'text-primary' },
                      { label: 'Score avg', value: '8.4', color: 'text-success' },
                      { label: 'Trend', value: '+32%', color: 'text-warning' },
                      { label: 'Signal', value: '14', color: 'text-error' },
                    ].map((kpi) => (
                      <div key={kpi.label} className="bg-base-300 rounded-lg p-2">
                        <p className="text-xs text-base-content/40">{kpi.label}</p>
                        <p className={`font-display font-700 text-sm ${kpi.color}`}>{kpi.value}</p>
                      </div>
                    ))}
                  </div>
                  {/* Chart placeholder */}
                  <div className="flex-1 bg-base-300 rounded-lg flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 flex items-end px-4 gap-1 pb-2">
                      {[40, 65, 45, 80, 60, 90, 70, 85, 95, 75, 88, 92].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-sm"
                          style={{
                            height: `${h}%`,
                            background: `linear-gradient(to top, #2E5BFF, #7C3AED)`,
                            opacity: 0.7 + (i / 20),
                          }}
                        />
                      ))}
                    </div>
                    <span className="relative text-xs text-base-content/30 font-500">Analytics Chart</span>
                  </div>
                  {/* Table row */}
                  <div className="bg-base-300 rounded-lg p-2 flex items-center gap-2">
                    <div className="w-6 h-6 rounded gradient-bg flex-shrink-0" />
                    <div className="flex-1">
                      <div className="h-2 bg-base-100 rounded w-3/4 mb-1" />
                      <div className="h-1.5 bg-base-100/50 rounded w-1/2" />
                    </div>
                    <span className="text-xs text-success font-600">+24%</span>
                  </div>
                </div>
              </div>
              {/* Floating badges */}
              <div className="absolute -right-4 top-8 glass-card rounded-xl px-3 py-2 shadow-xl">
                <p className="text-xs text-base-content/60">Score</p>
                <p className="font-display font-700 text-primary text-lg">9.2</p>
              </div>
              <div className="absolute -left-4 bottom-12 glass-card rounded-xl px-3 py-2 shadow-xl">
                <p className="text-xs text-success flex items-center gap-1">
                  <span>↑</span> Trend topildi!
                </p>
                <p className="text-xs text-base-content/60">3 ta mahsulot</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
