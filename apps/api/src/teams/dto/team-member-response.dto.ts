import { ApiProperty } from '@nestjs/swagger'
import { Exclude, Expose } from 'class-transformer'
import { UserRole } from '@prisma/client'

@Exclude()
export class TeamMemberResponseDto {
  @Expose()
  @ApiProperty({ description: 'Membership ID' })
  id: string

  @Expose()
  @ApiProperty({ description: 'User ID' })
  userId: string

  @Expose()
  @ApiProperty({ description: 'User name' })
  userName?: string

  @Expose()
  @ApiProperty({ description: 'User email' })
  userEmail?: string

  @Expose()
  @ApiProperty({ description: 'User avatar URL', required: false })
  userAvatar?: string

  @Expose()
  @ApiProperty({ description: 'Team ID' })
  teamId: string

  @Expose()
  @ApiProperty({ description: 'Member role', enum: UserRole })
  role: UserRole

  @Expose()
  @ApiProperty({ description: 'Date when member joined team' })
  joinedAt: Date

  constructor(partial: Partial<TeamMemberResponseDto>) {
    Object.assign(this, partial)
  }
}
