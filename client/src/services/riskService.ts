import { Risk, Incident } from '@/app/types/risk.types';
import { v4 as uuidv4 } from 'uuid';

const RISKS_STORAGE_KEY = 'ims_risks';
const INCIDENTS_STORAGE_KEY = 'ims_incidents';

export const riskService = {
 // Risks CRUD
 getRisks: (): Risk[] => {
 const stored = localStorage.getItem(RISKS_STORAGE_KEY);
 return stored ? JSON.parse(stored) : [];
 },

 saveRisk: (risk: Omit<Risk, 'id' | 'createdAt' | 'updatedAt' | 'score'>): Risk => {
 const risks = riskService.getRisks();
 const score = risk.likelihood * risk.impact;
 const newRisk: Risk = {
 ...risk,
 id: uuidv4(),
 score,
 createdAt: new Date().toISOString(),
 updatedAt: new Date().toISOString(),
 };
 localStorage.setItem(RISKS_STORAGE_KEY, JSON.stringify([...risks, newRisk]));
 return newRisk;
 },

 updateRisk: (id: string, updates: Partial<Risk>): Risk => {
 const risks = riskService.getRisks();
 const index = risks.findIndex(r => r.id === id);
 if (index === -1) throw new Error('Risk not found');

 const updatedRisk = {
 ...risks[index],
 ...updates,
 updatedAt: new Date().toISOString(),
 };

 if (updates.likelihood !== undefined || updates.impact !== undefined) {
 updatedRisk.score = updatedRisk.likelihood * updatedRisk.impact;
 }

 risks[index] = updatedRisk;
 localStorage.setItem(RISKS_STORAGE_KEY, JSON.stringify(risks));
 return updatedRisk;
 },

 deleteRisk: (id: string): void => {
 const risks = riskService.getRisks();
 const filtered = risks.filter(r => r.id !== id);
 localStorage.setItem(RISKS_STORAGE_KEY, JSON.stringify(filtered));
 },

 // Incidents CRUD
 getIncidents: (): Incident[] => {
 const stored = localStorage.getItem(INCIDENTS_STORAGE_KEY);
 return stored ? JSON.parse(stored) : [];
 },

 saveIncident: (incident: Omit<Incident, 'id' | 'createdAt'>): Incident => {
 const incidents = riskService.getIncidents();
 const newIncident: Incident = {
 ...incident,
 id: uuidv4(),
 createdAt: new Date().toISOString(),
 };
 localStorage.setItem(INCIDENTS_STORAGE_KEY, JSON.stringify([...incidents, newIncident]));
 return newIncident;
 },

 updateIncident: (id: string, updates: Partial<Incident>): Incident => {
 const incidents = riskService.getIncidents();
 const index = incidents.findIndex(i => i.id === id);
 if (index === -1) throw new Error('Incident not found');

 incidents[index] = { ...incidents[index], ...updates };
 localStorage.setItem(INCIDENTS_STORAGE_KEY, JSON.stringify(incidents));
 return incidents[index];
 },

 deleteIncident: (id: string): void => {
 const incidents = riskService.getIncidents();
 const filtered = incidents.filter(i => i.id !== id);
 localStorage.setItem(INCIDENTS_STORAGE_KEY, JSON.stringify(filtered));
 },

 // Helper: Get Risk Level based on score
 getRiskLevel: (score: number): string => {
 if (score <= 5) return 'Low';
 if (score <= 10) return 'Medium';
 if (score <= 15) return 'High';
 return 'Critical';
 },

 getRiskColor: (score: number): string => {
 if (score <= 5) return 'bg-green-100 text-green-800 border-green-200';
 if (score <= 10) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
 if (score <= 15) return 'bg-orange-100 text-orange-800 border-orange-200';
 return 'bg-red-100 text-red-800 border-red-200';
 }
};
