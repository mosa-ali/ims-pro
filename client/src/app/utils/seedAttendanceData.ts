/**
 * ============================================================================
 * SEED ATTENDANCE DATA
 * ============================================================================
 * 
 * Generates sample attendance data for testing and demonstration
 * 
 * ============================================================================
 */

import { attendanceService } from '@/app/services/attendanceService';

export function seedAttendanceData() {
 // Check if data already exists
 const existingRecords = attendanceService.getAll();
 if (existingRecords.length > 0) {
 console.log('Attendance data already exists. Skipping seed.');
 return;
 }

 console.log('Seeding attendance data...');

 // Sample staff
 const sampleStaff = [
 { id: 'EMP-001', name: 'Ahmed Hassan' },
 { id: 'EMP-002', name: 'Fatima Ali' },
 { id: 'EMP-003', name: 'Mohammed Khalil' },
 { id: 'EMP-004', name: 'Layla Ibrahim' },
 { id: 'EMP-005', name: 'Omar Youssef' },
 { id: 'EMP-006', name: 'Zainab Mansour' },
 { id: 'EMP-007', name: 'Khalid Saeed' },
 { id: 'EMP-008', name: 'Nour Abdallah' }
 ];

 // Generate records for the last 30 days
 const today = new Date();
 const daysToGenerate = 30;

 for (let i = 0; i < daysToGenerate; i++) {
 const date = new Date(today);
 date.setDate(date.getDate() - i);
 const dateStr = date.toISOString().split('T')[0];

 // Skip weekends (Friday and Saturday)
 const dayOfWeek = date.getDay();
 if (dayOfWeek === 5 || dayOfWeek === 6) continue;

 // Generate records for each staff member
 sampleStaff.forEach((staff, index) => {
 // Randomize attendance scenarios
 const scenarios = [
 // Present on time
 {
 plannedStart: '08:00',
 plannedEnd: '16:00',
 actualCheckIn: '08:00',
 actualCheckOut: '16:00',
 source: 'microsoft_teams_shifts' as const
 },
 // Late arrival
 {
 plannedStart: '08:00',
 plannedEnd: '16:00',
 actualCheckIn: '08:25',
 actualCheckOut: '16:00',
 source: 'microsoft_teams_shifts' as const
 },
 // With overtime
 {
 plannedStart: '08:00',
 plannedEnd: '16:00',
 actualCheckIn: '08:00',
 actualCheckOut: '18:30',
 source: 'microsoft_teams_shifts' as const
 },
 // Manual entry (field work)
 {
 plannedStart: '08:00',
 plannedEnd: '16:00',
 actualCheckIn: '09:00',
 actualCheckOut: '17:00',
 source: 'manual_hr_entry' as const
 },
 // Present on time
 {
 plannedStart: '08:00',
 plannedEnd: '16:00',
 actualCheckIn: '07:55',
 actualCheckOut: '16:05',
 source: 'microsoft_teams_shifts' as const
 }
 ];

 // Use deterministic randomization based on staff index and day
 const scenarioIndex = (index + i) % scenarios.length;
 const scenario = scenarios[scenarioIndex];

 // 10% chance of absence
 if ((index + i) % 10 === 0) {
 attendanceService.create({
 staffId: staff.id,
 staffName: staff.name,
 date: dateStr,
 plannedShiftStart: '08:00',
 plannedShiftEnd: '16:00',
 source: 'microsoft_teams_shifts',
 actualCheckIn: null,
 actualCheckOut: null,
 notes: 'Absent',
 createdBy: 'System'
 });
 } else {
 attendanceService.create({
 staffId: staff.id,
 staffName: staff.name,
 date: dateStr,
 plannedShiftStart: scenario.plannedStart,
 plannedShiftEnd: scenario.plannedEnd,
 source: scenario.source,
 actualCheckIn: scenario.actualCheckIn,
 actualCheckOut: scenario.actualCheckOut,
 notes: scenario.source === 'manual_hr_entry' ? 'Field work' : '',
 createdBy: 'System'
 });
 }
 });
 }

 // Create current period
 const currentPeriod = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
 attendanceService.createOrUpdatePeriod(currentPeriod);

 // Create last month period
 const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
 const lastPeriod = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
 attendanceService.createOrUpdatePeriod(lastPeriod);

 console.log('Attendance data seeded successfully!');
}
