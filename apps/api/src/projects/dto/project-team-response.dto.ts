import { ApiProperty } from '@nestjs/swagger'
import { Exclude, Expose } from 'class-transformer'
import { ProjectRole } from '@prisma/client'

@Exclude()
export class ProjectTeamResponseDto {
  @Expose()
  @ApiProperty({ description: 'Team ID' })
  id: string

  @Expose()
  @ApiProperty({ description: 'Team name' })
  name: string

  @Expose()
  @ApiProperty({ description: 'Team description', required: false })
  description?: string

  @Expose()
  @ApiProperty({
    description: 'Role of the team in the project',
    enum: ProjectRole,
    required: false
  })
  role?: ProjectRole

  @Expose()
  @ApiProperty({ description: 'Timestamp when team joined the project' })
  joinedAt: Date

  @Expose()
  @ApiProperty({ description: 'Number of team members', required: false })
  memberCount?: number

  constructor(partial: Partial<ProjectTeamResponseDto>) {
    Object.assign(this, partial)
  }
}
