import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
} from 'class-validator'
import { Transform } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export enum UserRole {
  ADMIN = 'ADMIN',
  SCRUM_MASTER = 'SCRUM_MASTER',
  PRODUCT_OWNER = 'PRODUCT_OWNER',
  DEVELOPER = 'DEVELOPER',
  STAKEHOLDER = 'STAKEHOLDER',
  MEMBER = 'MEMBER',
}

export class RegisterDto {
  @ApiProperty({
    description: 'User email address',
    example: 'newuser@example.com',
    type: String,
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @Transform(({ value }) => value?.toLowerCase())
  email: string

  @ApiProperty({
    description: 'User password (minimum 8 characters)',
    example: 'SecurePassword123!',
    type: String,
    minLength: 8,
  })
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
    type: String,
  })
  @IsString({ message: 'Name must be a string' })
  @Transform(({ value }) => value?.trim())
  name: string

  @ApiPropertyOptional({
    description: 'User role in the system',
    enum: UserRole,
    example: UserRole.DEVELOPER,
    default: UserRole.MEMBER,
  })
  @IsOptional()
  @IsEnum(UserRole, {
    message:
      'Role must be one of: ADMIN, SCRUM_MASTER, PRODUCT_OWNER, DEVELOPER, STAKEHOLDER, MEMBER',
  })
  role?: UserRole
}
