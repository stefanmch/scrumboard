import { ApiProperty } from '@nestjs/swagger'
import { Exclude, Expose } from 'class-transformer'
import { ProjectStatus } from '@prisma/client'

@Exclude()
export class ProjectResponseDto {
  @Expose()
  @ApiProperty({ description: 'Project ID' })
  id: string

  @Expose()
  @ApiProperty({ description: 'Project name' })
  name: string

  @Expose()
  @ApiProperty({ description: 'Project description', required: false })
  description?: string

  @Expose()
  @ApiProperty({ description: 'Project status', enum: ProjectStatus })
  status: ProjectStatus

  @Expose()
  @ApiProperty({ description: 'Team ID that owns this project' })
  teamId: string

  @Expose()
  @ApiProperty({ description: 'Team name', required: false })
  teamName?: string

  @Expose()
  @ApiProperty({ description: 'Project creation timestamp' })
  createdAt: Date

  @Expose()
  @ApiProperty({ description: 'Project last update timestamp' })
  updatedAt: Date

  @Expose()
  @ApiProperty({ description: 'Number of stories in project', required: false })
  storyCount?: number

  @Expose()
  @ApiProperty({ description: 'Number of sprints in project', required: false })
  sprintCount?: number

  @Expose()
  @ApiProperty({ description: 'Number of tasks in project', required: false })
  taskCount?: number

  constructor(partial: Partial<ProjectResponseDto>) {
    Object.assign(this, partial)
  }
}
