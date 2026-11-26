import { useEffect, useState } from 'react';
import { getProjects, resolveMediaUrl } from '../utils/api';
import type { Project } from '../utils/api';

export default function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  useEffect(() => {
    let active = true;
    getProjects().then(rows => { if (active) setProjects(rows); }).catch(() => {});
    return () => { active = false; };
  }, []);
  return projects.map(project => ({ ...project, image: resolveMediaUrl(project.image) }));
}
