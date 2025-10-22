import { ApiProperty } from '@nestjs/swagger'
import {
  IsOptional,
  IsString,
  IsObject,
  MaxLength,
  MinLength,
  ValidateNested,
  IsBoolean,
} from 'class-validator'
import { Type } from 'class-transformer'

class WorkingHoursDto {
  @IsString()
  start: string

  @IsString()
  end: string
}

class NotificationsDto {
  @IsBoolean()
  email: boolean

  @IsBoolean()
  push: boolean

  @IsBoolean()
  mentions: boolean

  @IsBoolean()
  updates: boolean
}

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
    description: 'User bio/description',
    example: 'Software engineer passionate about clean code',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string

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
  timezone?: string

  @ApiProperty({
    description: 'Working hours configuration',
    example: { start: '09:00', end: '17:00' },
    type: WorkingHoursDto,
    required: false,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => WorkingHoursDto)
  workingHours?: WorkingHoursDto

  @ApiProperty({
    description: 'Notification preferences',
    example: { email: true, push: false, mentions: true, updates: true },
    type: NotificationsDto,
    required: false,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => NotificationsDto)
  notifications?: NotificationsDto
}
