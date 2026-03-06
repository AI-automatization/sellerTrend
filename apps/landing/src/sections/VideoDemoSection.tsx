import { motion } from 'framer-motion';
import { useLang } from '../lib/LangContext';

interface VideoDemoSectionProps {
  appUrl: string;
}

export function VideoDemoSection({ appUrl }: VideoDemoSectionProps) {
  const { t } = useLang();

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-600 uppercase tracking-wider mb-4">
            {t('demo.tag')}
          </span>
          <h2 className="text-3xl sm:text-4xl font-display font-700 text-base-content mb-4">
            {t('demo.title1')}{' '}
            <span className="gradient-text">{t('demo.title2')}</span>
          </h2>
          <p className="text-base-content/60 text-lg max-w-xl mx-auto">
            {t('demo.subtitle')}
          </p>
        </motion.div>

        {/* Video placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-base-200 border border-base-content/10 flex flex-col items-center justify-center gap-6 shadow-xl">
            {/* Play button placeholder */}
            <div className="w-20 h-20 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-primary ml-1" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <p className="text-base-content/50 text-sm">{t('demo.placeholder')}</p>

            {/* Decorative corner accents */}
            <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-primary/30 rounded-tl-lg" />
            <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-primary/30 rounded-tr-lg" />
            <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-primary/30 rounded-bl-lg" />
            <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-primary/30 rounded-br-lg" />
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          className="text-center mt-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <a
            href={appUrl}
            className="btn btn-primary btn-lg"
            onClick={() => window.plausible?.('CTA Click', { props: { location: 'video_demo' } })}
          >
            {t('demo.cta')}
          </a>
        </motion.div>
      </div>
    </section>
  );
}
