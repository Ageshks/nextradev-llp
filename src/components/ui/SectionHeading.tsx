import { motion } from 'framer-motion';

interface Props { eyebrow?: string; title: string; subtitle?: string; align?: 'left'|'center'; }
export default function SectionHeading({ eyebrow, title, subtitle, align='center' }: Props) {
  return (
    <div className={`mb-12 ${align==='center' ? 'text-center' : 'text-left'}`}>
      {eyebrow && <motion.p initial={{opacity:0,y:10}} whileInView={{opacity:1,y:0}} viewport={{once:true}} className="text-sm uppercase tracking-[0.3em] text-cyan-400 mb-3">{eyebrow}</motion.p>}
      <motion.h2 initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:0.1}} className="text-3xl md:text-5xl font-bold">{title}</motion.h2>
      {subtitle && <motion.p initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:0.2}} className="mt-4 text-muted max-w-2xl mx-auto">{subtitle}</motion.p>}
    </div>
  );
}