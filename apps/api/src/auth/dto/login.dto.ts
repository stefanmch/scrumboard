import { IsEmail, IsString, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @Transform(({ value }) => value?.toLowerCase())
  email: string;

  @IsString({ message: 'Password must be a string' })
  password: string;

  @IsOptional()
  @IsString({ message: 'IP address must be a string' })
  ipAddress?: string;

  @IsOptional()
  @IsString({ message: 'User agent must be a string' })
  userAgent?: string;
}
