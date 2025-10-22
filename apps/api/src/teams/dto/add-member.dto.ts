import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsEnum, IsOptional } from 'class-validator'
import { UserRole } from '@prisma/client'

export class AddMemberDto {
  @ApiProperty({
    description: 'User ID to add to team',
    example: 'user-123',
  })
  @IsString()
  userId: string

  @ApiProperty({
    description: 'Role to assign to member',
    enum: UserRole,
    default: UserRole.MEMBER,
    required: false,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole
}
