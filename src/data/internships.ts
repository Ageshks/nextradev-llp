export interface Internship {
  id: string;
  title: string;
  department: string;
  duration: string;
  compensation: string;
  mode: string;
  skills: string[];
  deadline: string;
}

export const internships: Internship[] = [
  { id: 'flutter-intern', title: 'Flutter Development Intern', department: 'Mobile Engineering', duration: '3-6 months', compensation: 'To be confirmed', mode: 'Remote / Hybrid', skills: ['Dart','Flutter','Git'], deadline: 'Rolling' },
  { id: 'react-intern', title: 'React.js Development Intern', department: 'Web Engineering', duration: '3-6 months', compensation: 'To be confirmed', mode: 'Remote / Hybrid', skills: ['React','TypeScript','Tailwind CSS'], deadline: 'Rolling' },
  { id: 'backend-intern', title: 'Backend Development Intern', department: 'Backend Engineering', duration: '3-6 months', compensation: 'To be confirmed', mode: 'Remote / Hybrid', skills: ['Node.js','Databases','REST APIs'], deadline: 'Rolling' },
  { id: 'uiux-intern', title: 'UI/UX Design Intern', department: 'Design', duration: '3-6 months', compensation: 'To be confirmed', mode: 'Remote / Hybrid', skills: ['Figma','Prototyping','User Research'], deadline: 'Rolling' },
  { id: 'marketing-intern', title: 'Digital Marketing Intern', department: 'Marketing', duration: '3-6 months', compensation: 'To be confirmed', mode: 'Remote / Hybrid', skills: ['SEO','Social Media','Content'], deadline: 'Rolling' },
  { id: 'python-intern', title: 'Python Development Intern', department: 'Software Engineering', duration: '3-6 months', compensation: 'To be confirmed', mode: 'Remote / Hybrid', skills: ['Python','APIs','Automation'], deadline: 'Rolling' },
];

export const internshipStatuses = ['Pending','Under Review','Shortlisted','Rejected','Accepted'] as const;