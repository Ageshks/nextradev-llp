export interface Job { id: string; title: string; type: string; location: string; description: string; }

export const jobs: Job[] = [
  { id: 'flutter-dev', title: 'Flutter Developer', type: 'Full-time', location: 'India (Remote/Hybrid)', description: 'Build cross-platform mobile applications with Flutter.' },
  { id: 'react-dev', title: 'React Developer', type: 'Full-time', location: 'India (Remote/Hybrid)', description: 'Develop modern web applications using React and TypeScript.' },
  { id: 'backend-dev', title: 'Backend Developer', type: 'Full-time', location: 'India (Remote/Hybrid)', description: 'Design and build scalable backend services and APIs.' },
  { id: 'uiux-designer', title: 'UI/UX Designer', type: 'Full-time', location: 'India (Remote/Hybrid)', description: 'Create intuitive and beautiful digital experiences.' },
  { id: 'digital-marketing-intern', title: 'Digital Marketing Intern', type: 'Internship', location: 'India (Remote/Hybrid)', description: 'Support digital marketing campaigns and content.' },
];