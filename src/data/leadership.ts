export interface Leader { name: string; designation: string; image: string; bio: string; linkedin?: string; twitter?: string; }

export const leadership: Leader[] = [
  { name: 'Founder Name', designation: 'Founder & CEO', image: '/images/founders/founder-ceo.jpg', bio: 'Short professional introduction.', linkedin: 'https://linkedin.com/in/profile' },
  { name: 'Founder Name', designation: 'Co-Founder', image: '/images/founders/co-founder.jpg', bio: 'Short professional introduction.', linkedin: 'https://linkedin.com/in/profile' },
];