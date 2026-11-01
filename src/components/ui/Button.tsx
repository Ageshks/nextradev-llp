import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface ButtonProps { children: ReactNode; variant?: 'primary' | 'ghost'; onClick?: () => void; className?: string; type?: 'button'|'submit'; }

export default function Button({ children, variant='primary', onClick, className='', type='button' }: ButtonProps) {
  return (
    <motion.button type={type} onClick={onClick} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}
      className={`inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all ${variant==='primary' ? 'bg-gradient-to-r from-blue-600 to-cyan-400 text-white shadow-lg shadow-blue-500/30' : 'border border-white/20 text-white hover:bg-white/5'} ${className}`}>
      {children}
    </motion.button>
  );
}
