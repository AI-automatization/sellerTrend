import { motion } from 'framer-motion';
import { useLang } from '../lib/LangContext';
import { useAnalytics } from '../hooks/useAnalytics';

interface CTASectionProps {
  appUrl: string;
}

export function CTASection({ appUrl }: CTASectionProps) {
  const { t } = useLang();
  const { track } = useAnalytics();

  return (
    <section id="cta" aria-label="Boshlash" className="py-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 gradient-bg opacity-10" />
      <div className="absolute inset-0 pointer-events-none">
        <div className="mesh-blob absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 opacity-20 rounded-full"
             style={{ background: 'radial-gradient(circle, #2E5BFF 0%, transparent 70%)' }} />
        <div className="mesh-blob absolute top-1/2 right-1/4 -translate-y-1/2 w-80 h-80 opacity-15 rounded-full"
             style={{ background: 'radial-gradient(circle, #7C3AED 0%, transparent 70%)', animationDelay: '-5s' }} />
      </div>

      <div className="max-w-4xl mx-auto text-center relative">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <h2 className="font-display font-800 text-4xl sm:text-5xl lg:text-6xl text-base-content mb-6 leading-tight">
            {t('cta.title1')}{' '}
            <span className="gradient-text">{t('cta.title2')}</span>{' '}
            {t('cta.title3')}
          </h2>
          <p className="text-base-content/60 text-lg mb-10 max-w-xl mx-auto">
            {t('cta.desc')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href={`${appUrl}/register`}
              onClick={() => track('Register Click', { location: 'cta' })}
              className="btn btn-primary btn-lg rounded-full px-10 glow-btn font-600 text-base"
            >
              {t('cta.btn')}
            </a>
          </div>

          <p className="text-base-content/40 text-sm mt-6">
            {t('cta.note')}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
