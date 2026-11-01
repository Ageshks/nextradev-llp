import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface Props { children: ReactNode; className?: string; hover?: boolean; }
export default function Card({ children, className='', hover=true }: Props) {
  return (
    <motion.div whileHover={hover ? { y: -6 } : undefined}
      className={`rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 ${className}`}>
      {children}
    </motion.div>
  );
}