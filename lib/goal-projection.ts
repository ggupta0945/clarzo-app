// Project where a goal lands given a starting investment compounding at an
// expected rate. We default to 12% (rough long-term Indian equity blended
// return) but callers can override. SIP-needed math closes the gap with a
// monthly contribution: FV = P * ((1+i)^n - 1) / i, solved for P.

export type GoalStatus = 'on_track' | 'behind' | 'ahead'

export type GoalProjection = {
  yearsToGoal: number
  monthsToGoal: number
  futureValue: number
  shortfall: number
  monthlySipNeeded: number
  status: GoalStatus
}

export function projectGoal(
  currentInvestment: number,
  targetAmount: number,
  targetYear: number,
  expectedReturnPct = 12,
): GoalProjection {
  const currentYear = new Date().getFullYear()
  const yearsToGoal = Math.max(0, targetYear - currentYear)
  const monthsToGoal = yearsToGoal * 12

  const r = expectedReturnPct / 100
  const futureValue = currentInvestment * Math.pow(1 + r, yearsToGoal)
  const shortfall = Math.max(0, targetAmount - futureValue)

  let monthlySipNeeded = 0
  if (shortfall > 0 && monthsToGoal > 0) {
    const i = r / 12
    monthlySipNeeded = (shortfall * i) / (Math.pow(1 + i, monthsToGoal) - 1)
  }

  // Bands picked to feel honest, not punitive: 110% of target = "ahead",
  // below 85% = "behind", anything in between = "on track".
  let status: GoalStatus = 'on_track'
  if (futureValue >= targetAmount * 1.1) status = 'ahead'
  else if (futureValue < targetAmount * 0.85) status = 'behind'

  return {
    yearsToGoal,
    monthsToGoal,
    futureValue,
    shortfall,
    monthlySipNeeded,
    status,
  }
}
