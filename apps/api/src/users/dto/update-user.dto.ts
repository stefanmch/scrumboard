import { ApiProperty } from '@nestjs/swagger'
import {
  IsOptional,
  IsString,
  IsObject,
  MaxLength,
  MinLength,
} from 'class-validator'

export class UpdateUserDto {
  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string

  @ApiProperty({
    description: 'User avatar URL or path',
    example: '/uploads/avatars/user123.jpg',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatar?: string

  @ApiProperty({
    description: 'User timezone (IANA format)',
    example: 'America/New_York',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  timeZone?: string

  @ApiProperty({
    description: 'Working hours configuration',
    example: '{"start": "09:00", "end": "17:00"}',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  workingHours?: string

  @ApiProperty({
    description: 'Notification preferences',
    example: '{"email": true, "push": false, "inApp": true}',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  notificationPrefs?: string
}
