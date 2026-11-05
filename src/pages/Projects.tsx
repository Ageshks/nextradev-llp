import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SectionHeading from '../components/ui/SectionHeading';
import usePageMeta from '../hooks/usePageMeta';
import Card from '../components/ui/Card';
import { projectCategories } from '../data/projects';
import useProjects from '../hooks/useProjects';

export default function Projects() {
  usePageMeta('Projects | Nextradev Technologies LLP');
  const [filter, setFilter] = useState<string>('All');
  const [selected, setSelected] = useState<any>(null);
  const projects = useProjects();
  const filtered = filter === 'All' ? projects : projects.filter(p => p.category === filter);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <SectionHeading eyebrow="Portfolio" title="Projects" subtitle="Explore our work across web, mobile, and software." />
      <div className="flex flex-wrap gap-2 justify-center mb-10">
        {projectCategories.map(c => (
          <button key={c} onClick={() => setFilter(c)}
            className={`px-4 py-2 rounded-full text-sm border transition-all ${filter===c ? 'bg-gradient-to-r from-blue-600 to-cyan-400 text-white border-transparent' : 'border-white/10 text-muted hover:text-white'}`}>{c}</button>
        ))}
      </div>
      <motion.div layout className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filtered.map(p => (
            <motion.div key={p.id} layout initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.95}}>
              <Card className="cursor-pointer" hover>
                <div onClick={() => setSelected(p)}>
                  <div className="h-40 rounded-xl bg-gradient-to-br from-blue-600/30 to-cyan-400/10 mb-4 grid place-items-center text-muted text-sm overflow-hidden"><img src={p.image} alt={p.title} className="h-full w-full object-cover" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} /></div>
                  <h3 className="text-white font-semibold text-lg">{p.title}</h3>
                  <p className="text-sm text-muted mt-1">{p.description}</p>
                  <span className="inline-block mt-2 text-xs px-2 py-1 rounded-full bg-white/10 text-muted">{p.category}</span>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {p.tags.map(t => <span key={t} className="text-xs px-2 py-1 rounded-full bg-white/5 text-muted">{t}</span>)}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {selected && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4" onClick={() => setSelected(null)}>
            <motion.div initial={{scale:0.9,y:20}} animate={{scale:1,y:0}} exit={{scale:0.9,y:20}} className="bg-bg2 rounded-2xl border border-white/10 p-6 max-w-lg w-full" onClick={e => e.stopPropagation()}>
              <h3 className="text-white font-semibold text-2xl">{selected.title}</h3>
              <img src={selected.image} alt={selected.title} className="mt-4 max-h-64 w-full rounded-xl object-cover" />
              <p className="text-muted mt-2">{selected.description}</p>
              <p className="text-sm text-cyan-400 mt-3">{selected.category}</p>
              <div className="mt-3 flex flex-wrap gap-2">{selected.tags.map((t:string) => <span key={t} className="text-xs px-2 py-1 rounded-full bg-white/10 text-muted">{t}</span>)}</div>
              <button onClick={() => setSelected(null)} className="mt-6 px-4 py-2 rounded-full bg-white/10 text-white text-sm">Close</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
