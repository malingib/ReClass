/** Public remedial surface. Cross-domain consumers import this file only. */
export {
  getAttendanceByTenant,
  getAttendanceCounts,
  getRecentAttendance,
  getAttendanceForEffectiveness,
  computeAttendanceRate,
} from './attendance';
export { getReclassStats } from './dashboard';
export { getSchedules, createSession, softDeleteSession, toggleSessionActive } from './scheduling';
