import { ApiProperty } from '@nestjs/swagger'
import { IsEnum } from 'class-validator'
import { UserRole } from '@prisma/client'

export class UpdateMemberRoleDto {
  @ApiProperty({
    description: 'New role for team member',
    enum: UserRole,
    example: UserRole.SCRUM_MASTER,
  })
  @IsEnum(UserRole)
  role: UserRole
}
