export type { InternshipApplication, InternshipOpening, Project, Leader } from './api';
import {
  getApplications as apiGetApplications,
  getApplication as apiGetApplication,
  submitApplication as apiSubmitApplication,
  isDuplicateApplication,
  updateApplicationStatus,
  deleteApplication as apiDeleteApplication,
  getOpenings as apiGetOpenings,
  addOpening as apiAddOpening,
  deleteOpening as apiDeleteOpening,
  updateOpening as apiUpdateOpening,
  resetOpenings as apiResetOpenings,
  getProjects as apiGetProjects,
  addProject as apiAddProject,
  updateProject as apiUpdateProject,
  deleteProject as apiDeleteProject,
  resetProjects as apiResetProjects,
  getLeadership as apiGetLeadership,
  addLeader as apiAddLeader,
  updateLeader as apiUpdateLeader,
  deleteLeader as apiDeleteLeader,
  resetLeadership as apiResetLeadership,
} from './api';

export async function getApplications(position = 'All') {
  return apiGetApplications(position);
}

export async function getApplication(id: string) {
  return apiGetApplication(id);
}

export async function addApplication(app: any) {
  const { id, ...rest } = app || {};
  await apiSubmitApplication(rest);
}

export async function isDuplicate(email: string, position: string) {
  return isDuplicateApplication(email, position);
}

export async function updateStatus(id: string, status: string) {
  await updateApplicationStatus(id, status);
}
export async function deleteApplication(id: string) {
  await apiDeleteApplication(id);
}

export async function getOpenings() {
  return apiGetOpenings();
}

export async function saveOpenings(list: any[]) {
  await apiResetOpenings();
  for (const o of list) {
    await apiAddOpening(o);
  }
}

export async function resetOpenings() {
  await apiResetOpenings();
}

export async function addOpening(opening: any) {
  return apiAddOpening(opening);
}

export async function deleteOpening(id: string) {
  await apiDeleteOpening(id);
}

export async function updateOpening(id: string, opening: any) {
  return apiUpdateOpening(id, opening);
}

// Projects
export async function getProjects() {
  return apiGetProjects();
}

export async function addProject(project: any) {
  return apiAddProject(project);
}

export async function updateProject(id: string, project: any) {
  return apiUpdateProject(id, project);
}

export async function deleteProject(id: string) {
  await apiDeleteProject(id);
}

export async function resetProjects() {
  await apiResetProjects();
}

// Leadership
export async function getLeadership() {
  return apiGetLeadership();
}

export async function addLeader(formData: FormData) {
  return apiAddLeader(formData);
}

export async function updateLeader(id: string, formData: FormData) {
  return apiUpdateLeader(id, formData);
}

export async function deleteLeader(id: string) {
  await apiDeleteLeader(id);
}

export async function resetLeadership() {
  await apiResetLeadership();
}

