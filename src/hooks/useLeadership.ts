import { useEffect, useState } from 'react';
import { getLeadership, resolveMediaUrl } from '../utils/api';
import type { Leader } from '../utils/api';

export default function useLeadership() {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  useEffect(() => {
    let active = true;
    getLeadership().then(rows => { if (active) setLeaders(rows); }).catch(() => {});
    return () => { active = false; };
  }, []);
  return leaders.map(leader => ({ ...leader, image: resolveMediaUrl(leader.image) }));
}
