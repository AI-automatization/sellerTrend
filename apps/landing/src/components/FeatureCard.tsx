import { motion } from 'framer-motion';

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  index: number;
}

export function FeatureCard({ icon, title, description, index }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      whileHover={{ scale: 1.03, y: -4 }}
      className="glass-card rounded-2xl p-6 cursor-default group transition-all duration-300
                 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10"
    >
      <div className="text-3xl mb-4">{icon}</div>
      <h3 className="font-display font-600 text-base text-white mb-2">{title}</h3>
      <p className="text-sm text-base-content/60 leading-relaxed">{description}</p>
    </motion.div>
  );
}
