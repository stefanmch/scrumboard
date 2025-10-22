import { ApiProperty } from '@nestjs/swagger'
import { Exclude, Expose } from 'class-transformer'

@Exclude()
export class ProjectStatsResponseDto {
  @Expose()
  @ApiProperty({ description: 'Project ID' })
  projectId: string

  @Expose()
  @ApiProperty({ description: 'Project name' })
  projectName: string

  @Expose()
  @ApiProperty({ description: 'Total number of stories' })
  totalStories: number

  @Expose()
  @ApiProperty({ description: 'Number of completed stories' })
  completedStories: number

  @Expose()
  @ApiProperty({ description: 'Total number of sprints' })
  totalSprints: number

  @Expose()
  @ApiProperty({ description: 'Number of active sprints' })
  activeSprints: number

  @Expose()
  @ApiProperty({ description: 'Number of completed sprints' })
  completedSprints: number

  @Expose()
  @ApiProperty({ description: 'Total number of tasks' })
  totalTasks: number

  @Expose()
  @ApiProperty({ description: 'Number of completed tasks' })
  completedTasks: number

  @Expose()
  @ApiProperty({ description: 'Project completion percentage (0-100)' })
  completionPercentage: number

  constructor(partial: Partial<ProjectStatsResponseDto>) {
    Object.assign(this, partial)
  }
}
