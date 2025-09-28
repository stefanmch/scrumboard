import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';

export enum UserRole {
  ADMIN = 'ADMIN',
  SCRUM_MASTER = 'SCRUM_MASTER',
  PRODUCT_OWNER = 'PRODUCT_OWNER',
  DEVELOPER = 'DEVELOPER',
  STAKEHOLDER = 'STAKEHOLDER',
  MEMBER = 'MEMBER'
}

export class RegisterDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @Transform(({ value }) => value?.toLowerCase())
  email: string;

  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @IsString({ message: 'Name must be a string' })
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'Role must be one of: ADMIN, SCRUM_MASTER, PRODUCT_OWNER, DEVELOPER, STAKEHOLDER, MEMBER' })
  role?: UserRole;
}
