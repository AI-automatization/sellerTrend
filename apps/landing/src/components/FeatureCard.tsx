import { motion } from 'framer-motion';
import { staggerItem, VIEWPORT } from '../lib/animations';

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  index: number;
}

export function FeatureCard({ icon, title, description, index: _index }: FeatureCardProps) {
  return (
    <motion.div
      variants={staggerItem}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
      whileHover={{ scale: 1.03, y: -4 }}
      transition={{ duration: 0.2 }}
      className="glass-card rounded-2xl p-6 cursor-default group
                 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10"
    >
      <div className="text-3xl mb-4">{icon}</div>
      <h3 className="font-display font-600 text-base text-white mb-2">{title}</h3>
      <p className="text-sm text-base-content/60 leading-relaxed">{description}</p>
    </motion.div>
  );
}
