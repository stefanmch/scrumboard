import { ApiProperty } from '@nestjs/swagger'
import { Exclude, Expose, Type } from 'class-transformer'
import { TeamMemberResponseDto } from './team-member-response.dto'

@Exclude()
export class TeamResponseDto {
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
  @ApiProperty({ description: 'Team creator user ID' })
  creatorId: string

  @Expose()
  @ApiProperty({ description: 'Team creation timestamp' })
  createdAt: Date

  @Expose()
  @ApiProperty({ description: 'Team last update timestamp' })
  updatedAt: Date

  @Expose()
  @ApiProperty({
    description: 'Team members',
    type: [TeamMemberResponseDto],
    required: false
  })
  @Type(() => TeamMemberResponseDto)
  members?: TeamMemberResponseDto[]

  @Expose()
  @ApiProperty({ description: 'Number of members in team', required: false })
  memberCount?: number

  constructor(partial: Partial<TeamResponseDto>) {
    Object.assign(this, partial)
  }
}
