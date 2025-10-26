import { ApiProperty } from '@nestjs/swagger'
import { Exclude, Expose, Type } from 'class-transformer'
import { ProjectStatus } from '@prisma/client'
import { ProjectTeamResponseDto } from './project-team-response.dto'

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
  @Type(() => ProjectTeamResponseDto)
  @ApiProperty({
    description: 'Teams associated with this project',
    type: [ProjectTeamResponseDto],
    required: false
  })
  teams?: ProjectTeamResponseDto[]

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
