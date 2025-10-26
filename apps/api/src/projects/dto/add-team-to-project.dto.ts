import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsOptional, IsEnum } from 'class-validator'
import { ProjectRole } from '@prisma/client'

export class AddTeamToProjectDto {
  @ApiProperty({
    description: 'Team ID to add to the project',
    example: 'clx1234567890abcdefghij',
  })
  @IsString()
  teamId: string

  @ApiProperty({
    description: 'Role of the team in the project',
    enum: ProjectRole,
    example: ProjectRole.PRIMARY,
    required: false,
  })
  @IsOptional()
  @IsEnum(ProjectRole)
  role?: ProjectRole
}
