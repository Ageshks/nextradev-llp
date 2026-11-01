import SectionHeading from '../components/ui/SectionHeading';
import usePageMeta from '../hooks/usePageMeta';
import Card from '../components/ui/Card';
import { leadership } from '../data/leadership';

const values = ['Innovation','Reliability','Quality','Customer satisfaction'];
const tech = ['React','TypeScript','Node.js','Python','Flutter','AWS','Docker','PostgreSQL'];

export default function About() {
  usePageMeta('About Us | Nextradev Technologies LLP');
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <SectionHeading eyebrow="About Us" title="Who We Are" subtitle="Nextradev Technologies LLP is a technology and digital solutions company helping businesses build, grow, and scale through technology." />
      <div className="grid md:grid-cols-2 gap-6 mb-16">
        <Card><h3 className="text-white font-semibold mb-2">Our Mission</h3><p className="text-muted">To empower businesses with reliable, scalable, and innovative digital solutions.</p></Card>
        <Card><h3 className="text-white font-semibold mb-2">Our Vision</h3><p className="text-muted">To be a trusted technology partner for businesses worldwide.</p></Card>
      </div>
      <SectionHeading title="Our Values" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        {values.map(v => <Card key={v}><p className="text-white font-medium">{v}</p></Card>)}
      </div>
      <SectionHeading title="Our Approach" />
      <p className="text-muted max-w-3xl mx-auto text-center mb-16">We combine discovery, design, engineering, and continuous support to deliver outcomes that matter.</p>
      <SectionHeading title="Technology Expertise" />
      <div className="flex flex-wrap gap-3 justify-center mb-16">
        {tech.map(t => <span key={t} className="px-4 py-2 rounded-full bg-white/10 text-muted text-sm">{t}</span>)}
      </div>
      <SectionHeading title="Leadership Team" />
      <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {leadership.map((l,i) => (
          <Card key={i}>
            <div className="h-40 rounded-xl bg-gradient-to-br from-blue-600/20 to-cyan-400/10 mb-4 overflow-hidden grid place-items-center">
              <img src={l.image} alt={l.name} className="h-full w-full object-cover" onError={(e)=>{(e.target as HTMLImageElement).style.display='none';}} />
            </div>
            <h3 className="text-white font-semibold">{l.name}</h3>
            <p className="text-cyan-400 text-sm">{l.designation}</p>
            <p className="text-muted text-sm mt-2">{l.bio}</p>
            {l.linkedin && <a href={l.linkedin} target="_blank" rel="noreferrer" className="text-cyan-400 text-sm mt-2 inline-block">LinkedIn</a>}
          </Card>
        ))}
      </div>
    </div>
  );
}