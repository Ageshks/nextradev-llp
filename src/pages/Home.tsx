import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Globe, Smartphone, Code2, Palette, TrendingUp, Cloud, CheckCircle2 } from 'lucide-react';
import SectionHeading from '../components/ui/SectionHeading';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { lazy, Suspense } from 'react';
import usePageMeta from '../hooks/usePageMeta';
import { services } from '../data/services';
import { projects } from '../data/projects';
import { leadership } from '../data/leadership';
const HeroScene = lazy(() => import('../components/three/HeroScene'));

const iconMap: Record<string, any> = { Globe, Smartphone, Code2, Palette, TrendingUp, Cloud };

const process = ['Discovery & Planning','UI/UX Design','Development','Testing & Quality Assurance','Deployment','Support & Maintenance'];
const why = ['Business-focused solutions','Modern technologies','Scalable architecture','Dedicated technical support','Transparent communication','On-time delivery'];

export default function Home() {
  usePageMeta('Nextradev Technologies LLP | Home', 'Building Digital Experiences. Engineering the Future.');
  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#080D1A]/40 to-[#080D1A]" />
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-cyan-400/10 blur-[120px]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <motion.p initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="text-sm uppercase tracking-[0.3em] text-cyan-400 mb-4">Nextradev Technologies LLP</motion.p>
            <motion.h1 initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.1}} className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight">
              Building Digital Experiences. <span className="text-gradient">Engineering the Future.</span>
            </motion.h1>
            <motion.p initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.2}} className="mt-6 text-lg text-muted max-w-xl">
              We transform ideas into powerful digital products through innovative technology, creative thinking, and intelligent solutions.
            </motion.p>
            <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.3}} className="mt-8 flex flex-wrap gap-4">
              <Link to="/services"><Button>Explore Our Services <ArrowRight size={18}/></Button></Link>
              <Link to="/contact"><Button variant="ghost">Let's Discuss Your Project</Button></Link>
            </motion.div>
          </div>
          <div className="h-[420px] md:h-[520px]">
            <Suspense fallback={<div className="h-full grid place-items-center text-muted">Loading 3D…</div>}>
              <HeroScene />
            </Suspense>
          </div>
        </div>
      </section>
'''
      {/* Company overview */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="About Us" title="Technology That Moves Businesses Forward" subtitle="We help businesses improve efficiency, streamline operations, and establish a strong digital presence through modern technology." />
          <div className="grid md:grid-cols-4 gap-6">
            {['Innovation','Reliability','Quality','Customer satisfaction'].map((v,i) => (
              <Card key={v}>
                <motion.div initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:i*0.1}}>
                  <CheckCircle2 className="text-cyan-400 mb-3" />
                  <h3 className="text-white font-semibold">{v}</h3>
                  <p className="text-sm text-muted mt-2">Built into every solution we deliver.</p>
                </motion.div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-24 bg-bg2/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Services" title="What We Do" subtitle="End-to-end digital services designed to help you build, grow, and scale." />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((s,i) => {
              const Icon = iconMap[s.icon] || Globe;
              return (
                <Card key={s.id}>
                  <motion.div initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:i*0.05}}>
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600/30 to-cyan-400/20 grid place-items-center mb-4">
                      <Icon className="text-cyan-400" />
                    </div>
                    <h3 className="text-white font-semibold text-lg">{s.title}</h3>
                    <p className="text-sm text-muted mt-2">{s.description}</p>
                    <Link to="/services" className="mt-4 inline-flex items-center gap-1 text-cyan-400 text-sm hover:gap-2 transition-all">Learn More <ArrowRight size={14}/></Link>
                  </motion.div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>
      {/* Why choose */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Why Us" title="Why Choose Nextradev" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {why.map((w,i) => (
              <motion.div key={w} initial={{opacity:0,scale:0.95}} whileInView={{opacity:1,scale:1}} viewport={{once:true}} transition={{delay:i*0.08}}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 flex items-center gap-3">
                <CheckCircle2 className="text-cyan-400 shrink-0" />
                <span className="text-white">{w}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured projects */}
      <section className="py-24 bg-bg2/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Projects" title="Featured Work" subtitle="A glimpse of products we've helped bring to life." />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((p,i) => (
              <Card key={p.id} className="overflow-hidden">
                <motion.div initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:i*0.08}}>
                  <div className="h-40 rounded-xl bg-gradient-to-br from-blue-600/30 to-cyan-400/10 mb-4 grid place-items-center text-muted text-sm">Project Preview</div>
                  <h3 className="text-white font-semibold text-lg">{p.title}</h3>
                  <p className="text-sm text-muted mt-1">{p.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {p.tags.map(t => <span key={t} className="text-xs px-2 py-1 rounded-full bg-white/10 text-muted">{t}</span>)}
                  </div>
                </motion.div>
              </Card>
            ))}
          </div>
          <div className="text-center mt-10"><Link to="/projects"><Button variant="ghost">View All Projects</Button></Link></div>
        </div>
      </section>
'''
      {/* Process */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Process" title="Our Development Process" />
          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
            {process.map((step,i) => (
              <motion.div key={step} initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:i*0.08}}
                className="relative rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
                <div className="text-cyan-400 font-bold text-xl mb-2">0{i+1}</div>
                <div className="text-sm text-white">{step}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Leadership */}
      <section className="py-24 bg-bg2/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Leadership" title="Meet the Minds Behind Nextradev" subtitle="Driven by vision, powered by innovation, and united by a passion for building technology that makes a difference." />
          <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {leadership.map((l,i) => (
              <Card key={i}>
                <motion.div initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:i*0.1}}>
                  <div className="h-48 rounded-xl bg-gradient-to-br from-blue-600/20 to-cyan-400/10 mb-4 grid place-items-center overflow-hidden">
                    <img src={l.image} alt={l.name} className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} />
                  </div>
                  <h3 className="text-white font-semibold text-lg">{l.name}</h3>
                  <p className="text-cyan-400 text-sm">{l.designation}</p>
                  <p className="text-sm text-muted mt-2">{l.bio}</p>
                  {l.linkedin && <a href={l.linkedin} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-cyan-400 hover:underline">LinkedIn</a>}
                </motion.div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Internship Banner */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-blue-600/20 to-cyan-400/10 p-10 md:p-16 text-center relative overflow-hidden">
            <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-cyan-400/20 blur-[80px]" />
            <h2 className="text-3xl md:text-5xl font-bold text-white">Start Your Tech Career with Nextradev!</h2>
            <p className="mt-4 text-muted max-w-2xl mx-auto">Turn your passion for technology into practical experience. Join Nextradev's internship program, work on real-world projects, learn from experienced developers, and take the first step towards your professional career.</p>
            <div className="mt-8 flex flex-wrap gap-4 justify-center">
              <Link to="/internships"><Button>Explore Internship Opportunities</Button></Link>
              <Link to="/internships/apply"><Button variant="ghost">Apply Now</Button></Link>
            </div>
          </div>
        </div>
      </section>

'''
      {/* CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <motion.div initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} className="rounded-3xl border border-white/10 bg-gradient-to-br from-blue-600/20 to-cyan-400/10 p-12">
            <h2 className="text-3xl md:text-5xl font-bold text-white">Have an Idea? Let's Build Something Great.</h2>
            <p className="mt-4 text-muted">Your next big idea deserves the right technology partner. Let's turn your vision into reality.</p>
            <div className="mt-8"><Link to="/contact"><Button>Start Your Project</Button></Link></div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
