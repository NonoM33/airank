// Re-export from plan-data.ts — the single source of truth for plan limits.
// Kept as a stable import path for existing API routes. Do NOT redefine limits
// here: any drift (e.g. missing `citations`/`teamSeats`) silently breaks gates.
export { PLAN_LIMITS, getPlanLimits, type PlanKey } from './plan-data'
