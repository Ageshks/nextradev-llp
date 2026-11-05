import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SectionHeading from '../components/ui/SectionHeading';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { internships } from '../data/internships';
import { getOpenings } from '../utils/applicationStorage';
import usePageMeta from '../hooks/usePageMeta';

export default function Internships() {
  usePageMeta('Internships | Nextradev Technologies LLP');
  const [openings, setOpenings] = useState<any[]>(internships);
  useEffect(() => {
    getOpenings().then(o => { if (Array.isArray(o) && o.length) setOpenings(o); }).catch(() => {});
  }, []);
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <SectionHeading eyebrow="Internships" title="Internship Opportunities" subtitle="Gain real-world experience with Nextradev. Sample openings; details configurable." />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {openings.map((it: any) => (
          <Card key={it.id}>
            <h3 className="text-white font-semibold text-lg">{it.title}</h3>
            <p className="text-cyan-400 text-sm mt-1">{it.department}</p>
            <ul className="text-sm text-muted mt-3 space-y-1">
              <li>Duration: {it.duration}</li>
              <li>Compensation: {it.compensation}</li>
              <li>Mode: {it.mode}</li>
              <li>Deadline: {it.deadline}</li>
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              {it.skills.map((s: string) => <span key={s} className="text-xs px-2 py-1 rounded-full bg-white/10 text-muted">{s}</span>)}
            </div>
            <Link to={`/internships/apply?position=${encodeURIComponent(it.title)}`} className="mt-4 inline-block">
              <Button>Apply Now</Button>
            </Link>
          </Card>
        ))}
      </div>
      <div className="text-center mt-10">
        <Link to="/internships/apply"><Button variant="ghost">Open Application Form</Button></Link>
      </div>
    </div>
  );
}