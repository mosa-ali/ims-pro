/**
 * Projects Database Service
 * 
 * Provides access to all projects stored in the system
 * This is the AUTHORITATIVE source for APR auto-aggregation and ALL modules
 * 
 * CRITICAL: Uses 'pms_projects' storage key to match Project Management Dashboard
 */

import { Project } from '@/app/hooks/useProjectData';

const PROJECTS_STORAGE_KEY = 'pms_projects';

/**
 * Projects Database - Centralized access to all projects
 */
export const projectsDatabase = {
 /**
 * Get all projects from localStorage
 */
 getAllProjects(): Project[] {
 try {
 const stored = localStorage.getItem(PROJECTS_STORAGE_KEY);
 return stored ? JSON.parse(stored) : [];
 } catch (error) {
 console.error('Error reading projects from database:', error);
 return [];
 }
 },

 /**
 * Get a single project by ID
 */
 getProjectById(id: string): Project | null {
 const projects = this.getAllProjects();
 return projects.find(p => p.id === id) || null;
 },

 /**
 * Save/update projects (used by other modules)
 */
 saveProjects(projects: Project[]): void {
 try {
 localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
 } catch (error) {
 console.error('Error saving projects to database:', error);
 throw error;
 }
 },

 /**
 * Get projects filtered by year
 */
 getProjectsByYear(year: number): Project[] {
 const allProjects = this.getAllProjects();
 return allProjects.filter(project => {
 const projectYear = new Date(project.startDate).getFullYear();
 const projectEndYear = new Date(project.endDate).getFullYear();
 return projectYear <= year && projectEndYear >= year;
 });
 },

 /**
 * Get projects filtered by status
 */
 getProjectsByStatus(status: string): Project[] {
 const allProjects = this.getAllProjects();
 return allProjects.filter(p => p.status === status);
 },

 /**
 * Get projects filtered by country
 */
 getProjectsByCountry(country: string): Project[] {
 const allProjects = this.getAllProjects();
 return allProjects.filter(p => p.country === country);
 }
};