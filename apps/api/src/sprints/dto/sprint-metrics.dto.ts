export class SprintMetricsDto {
  totalStoryPoints: number
  completedStoryPoints: number
  remainingStoryPoints: number
  completionPercentage: number
  storiesCount: {
    total: number
    todo: number
    inProgress: number
    done: number
    blocked: number
  }
  velocity?: number
  burndownData: BurndownDataPoint[]
}

export interface BurndownDataPoint {
  date: string
  remainingPoints: number
  idealRemaining: number
}
