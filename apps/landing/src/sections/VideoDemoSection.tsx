import { motion } from 'framer-motion';
import { useLang } from '../lib/LangContext';
import { useAnalytics } from '../hooks/useAnalytics';

interface VideoDemoSectionProps {
  appUrl: string;
}

export function VideoDemoSection({ appUrl }: VideoDemoSectionProps) {
  const { t } = useLang();
  const { track } = useAnalytics();

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="mesh-blob absolute top-1/2 -left-48 -translate-y-1/2 w-96 h-96 rounded-full opacity-10"
             style={{ background: 'radial-gradient(circle, #2E5BFF 0%, transparent 70%)' }} />
        <div className="mesh-blob absolute top-1/2 -right-48 -translate-y-1/2 w-96 h-96 rounded-full opacity-10"
             style={{ background: 'radial-gradient(circle, #7C3AED 0%, transparent 70%)', animationDelay: '-4s' }} />
        <div className="absolute inset-0 opacity-[0.03] grid-pattern-sm" />
      </div>

      <div className="max-w-5xl mx-auto relative">
        {/* Header */}
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 glass-card rounded-full px-4 py-2 mb-6">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs text-base-content/70 font-500">{t('demo.tag')}</span>
          </div>
          <h2 className="font-display font-800 text-3xl sm:text-4xl lg:text-5xl text-base-content mb-4 leading-tight">
            {t('demo.title1')}{' '}
            <span className="gradient-text">{t('demo.title2')}</span>
          </h2>
          <p className="text-base-content/50 text-lg max-w-xl mx-auto">
            {t('demo.subtitle')}
          </p>
        </motion.div>

        {/* Video frame */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="relative"
        >
          {/* Glow behind frame */}
          <div className="absolute -inset-4 rounded-3xl opacity-20 blur-2xl gradient-bg" />

          <div className="relative glass-card rounded-2xl overflow-hidden border border-white/10 shadow-2xl aspect-video flex flex-col items-center justify-center gap-5">
            {/* Fake browser bar */}
            <div className="absolute top-0 inset-x-0 h-8 bg-base-content/5 border-b border-white/5 flex items-center px-4 gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-error/50" />
              <span className="w-2.5 h-2.5 rounded-full bg-warning/50" />
              <span className="w-2.5 h-2.5 rounded-full bg-success/50" />
              <span className="mx-auto text-xs text-base-content/20 font-mono">ventra.uz — demo</span>
            </div>

            {/* Play button */}
            <motion.div
              className="w-20 h-20 rounded-full glass-card border border-primary/30 flex items-center justify-center cursor-pointer group"
              whileHover={{ scale: 1.08 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <div className="w-14 h-14 rounded-full gradient-bg flex items-center justify-center shadow-lg group-hover:shadow-primary/40 transition-shadow">
                <svg className="w-6 h-6 text-white ml-1" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </motion.div>

            <p className="text-base-content/30 text-sm">{t('demo.placeholder')}</p>

            {/* Corner accents */}
            <div className="absolute top-10 left-4 w-8 h-8 border-t-2 border-l-2 border-primary/20 rounded-tl-xl" />
            <div className="absolute top-10 right-4 w-8 h-8 border-t-2 border-r-2 border-primary/20 rounded-tr-xl" />
            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-primary/20 rounded-bl-xl" />
            <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-primary/20 rounded-br-xl" />
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          className="text-center mt-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <a
            href={`${appUrl}/register`}
            onClick={() => track('Register Click', { location: 'video_demo' })}
            className="btn btn-primary btn-lg rounded-full px-10 glow-btn font-600 text-base"
          >
            {t('demo.cta')}
          </a>
          <p className="text-base-content/30 text-xs mt-4">
            {/* reuse trust note */}
            {t('hero.trust2')} · {t('hero.trust1')}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
