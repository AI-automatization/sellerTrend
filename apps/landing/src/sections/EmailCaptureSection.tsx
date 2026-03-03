import { useState } from 'react';
import { motion } from 'framer-motion';
import { fadeUp, VIEWPORT } from '../lib/animations';
import { useLang } from '../lib/LangContext';
import { MailIcon } from '../components/icons';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// TODO(backend): Connect to /api/v1/newsletter/subscribe endpoint when ready
async function subscribeEmail(_email: string): Promise<void> {
  await new Promise((res) => setTimeout(res, 500));
  // Backend endpoint hali tayyor emas — hozircha success ko'rsatamiz
}

export function EmailCaptureSection() {
  const { t } = useLang();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) return;
    setStatus('loading');
    try {
      await subscribeEmail(email);
      setStatus('success');
      setEmail('');
    } catch {
      setStatus('error');
    }
  }

  return (
    <section id="newsletter" aria-label="Email obuna" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
          className="glass-card rounded-3xl p-8 sm:p-12 text-center"
        >
          <MailIcon className="w-10 h-10 text-primary mx-auto mb-4" />
          <h2 className="font-display font-700 text-2xl sm:text-3xl text-base-content mb-3">
            {t('email.title')}
          </h2>
          <p className="text-base-content/60 text-sm mb-8 max-w-sm mx-auto">
            {t('email.subtitle')}
          </p>

          {status === 'success' ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center justify-center gap-2 text-success font-600"
            >
              <span className="text-2xl">✅</span>
              <span>{t('email.success')}</span>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <div className="flex gap-2 max-w-sm mx-auto">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('email.placeholder')}
                  required
                  className="input input-bordered flex-1 rounded-full bg-base-200 border-base-300
                             focus:border-primary text-base-content placeholder:text-base-content/30"
                  disabled={status === 'loading'}
                />
                <button
                  type="submit"
                  disabled={status === 'loading' || !EMAIL_RE.test(email)}
                  className="btn btn-primary rounded-full px-5 min-w-[100px]"
                >
                  {status === 'loading'
                    ? <span className="loading loading-spinner loading-sm" />
                    : t('email.btn')
                  }
                </button>
              </div>

              {status === 'error' && (
                <p className="text-error text-xs mt-3">{t('email.error')}</p>
              )}

              <p className="text-base-content/40 text-xs mt-4">
                {t('email.privacy')}
              </p>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
}
