export interface Project { id: string; title: string; description: string; category: 'Web Development' | 'Mobile Applications' | 'Business Software' | 'Creative Projects'; tags: string[]; image: string; }

export const projects: Project[] = [
  { id: 'spectra-crm', title: 'Spectra CRM', description: 'Business and service management platform.', category: 'Business Software', tags: ['React','Node.js','PostgreSQL'], image: '/images/projects/spectra.jpg' },
  { id: 'explorist', title: 'Explorist', description: 'Travel and exploration application.', category: 'Mobile Applications', tags: ['Flutter','Firebase'], image: '/images/projects/explorist.jpg' },
  { id: 'bus-buddy', title: 'Bus Buddy', description: 'Bus management and tracking application.', category: 'Mobile Applications', tags: ['React Native','Maps API'], image: '/images/projects/bus-buddy.jpg' },
  { id: 'aiscatty', title: 'AisCatty', description: 'Pet adoption application.', category: 'Mobile Applications', tags: ['Flutter','Cloud'], image: '/images/projects/aiscatty.jpg' },
  { id: 'jetskie', title: 'Jetskie', description: 'Interactive Flutter game.', category: 'Creative Projects', tags: ['Flutter','Game'], image: '/images/projects/jetskie.jpg' },
];

export const projectCategories = ['All','Web Development','Mobile Applications','Business Software','Creative Projects'] as const;