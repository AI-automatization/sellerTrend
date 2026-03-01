import { motion } from 'framer-motion';

interface CTASectionProps {
  appUrl: string;
}

export function CTASection({ appUrl }: CTASectionProps) {
  return (
    <section className="py-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
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
          <h2 className="font-display font-800 text-4xl sm:text-5xl lg:text-6xl text-white mb-6 leading-tight">
            Raqiblaringiz allaqachon{' '}
            <span className="gradient-text">VENTRA</span>{' '}
            ishlatayapti. Siz-chi?
          </h2>
          <p className="text-base-content/60 text-lg mb-10 max-w-xl mx-auto">
            Har kuni kechikish — yo'qotilgan sotuv. Hoziroq boshlang, 14 kun bepul sinab ko'ring.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href={`${appUrl}/register`}
              className="btn btn-primary btn-lg rounded-full px-10 glow-btn font-600 text-base"
            >
              Hoziroq boshlash — 14 kun bepul →
            </a>
          </div>

          <p className="text-base-content/40 text-sm mt-6">
            Bank kartasi talab qilinmaydi · Istalgan vaqt bekor qilish mumkin
          </p>
        </motion.div>
      </div>
    </section>
  );
}
