import { Link } from 'react-router-dom';
import { ArrowRight, Globe, Smartphone, Code2, Palette, TrendingUp, Cloud } from 'lucide-react';
import SectionHeading from '../components/ui/SectionHeading';
import useSEO from '../hooks/useSEO';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { services } from '../data/services';

const iconMap: Record<string, any> = { Globe, Smartphone, Code2, Palette, TrendingUp, Cloud };

export default function Services() {
  useSEO({ title: 'Services | Nextradev Technologies LLP', description: 'Comprehensive digital services including web development, mobile apps, custom software, UI/UX, digital marketing, and cloud solutions.', path: '/services', keywords: ['software services', 'web development', 'mobile app development', 'custom software'] });
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <SectionHeading eyebrow="Services" title="Our Services" subtitle="Comprehensive digital services to build, grow, and scale your business." />
      <div className="space-y-8">
        {services.map((s) => {
          const Icon = iconMap[s.icon] || Globe;
          return (
            <Card key={s.id} className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-600/30 to-cyan-400/20 grid place-items-center mb-4">
                  <Icon className="text-cyan-400" />
                </div>
                <h3 className="text-white font-semibold text-xl">{s.title}</h3>
                <p className="text-muted mt-2">{s.description}</p>
              </div>
              <div className="md:col-span-2 grid sm:grid-cols-3 gap-4">
                <div>
                  <h4 className="text-white text-sm font-semibold mb-2">Key Features</h4>
                  <ul className="text-sm text-muted space-y-1">{s.features.map(f => <li key={f}>• {f}</li>)}</ul>
                </div>
                <div>
                  <h4 className="text-white text-sm font-semibold mb-2">Technologies</h4>
                  <div className="flex flex-wrap gap-2">{s.technologies.map(t => <span key={t} className="text-xs px-2 py-1 rounded-full bg-white/10 text-muted">{t}</span>)}</div>
                </div>
                <div>
                  <h4 className="text-white text-sm font-semibold mb-2">Benefits</h4>
                  <ul className="text-sm text-muted space-y-1">{s.benefits.map(b => <li key={b}>• {b}</li>)}</ul>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      <div className="text-center mt-12"><Link to="/contact"><Button>Start Your Project <ArrowRight size={18}/></Button></Link></div>
    </div>
  );
}