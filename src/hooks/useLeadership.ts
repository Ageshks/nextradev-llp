import { useEffect, useState } from 'react';
import { leadership as defaults } from '../data/leadership';
import type { Leader } from '../data/leadership';
import { getLeadership, resolveMediaUrl } from '../utils/api';

export default function useLeadership() {
  const [leaders, setLeaders] = useState<Leader[]>(defaults);
  useEffect(() => {
    let active = true;
    getLeadership().then(rows => { if (active) setLeaders(rows); }).catch(() => {});
    return () => { active = false; };
  }, []);
  return leaders.map(leader => ({ ...leader, image: resolveMediaUrl(leader.image) }));
}
