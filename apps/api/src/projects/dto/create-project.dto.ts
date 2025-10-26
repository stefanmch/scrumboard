import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsOptional, MinLength, MaxLength, IsEnum, IsArray, ArrayMinSize } from 'class-validator'
import { ProjectStatus } from '@prisma/client'

export class CreateProjectDto {
  @ApiProperty({
    description: 'Project name',
    example: 'E-commerce Platform',
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string

  @ApiProperty({
    description: 'Project description',
    example: 'Building a scalable e-commerce platform with React and NestJS',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string

  @ApiProperty({
    description: 'Project status',
    enum: ProjectStatus,
    example: ProjectStatus.ACTIVE,
    default: ProjectStatus.ACTIVE,
    required: false,
  })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus

  @ApiProperty({
    description: 'Array of team IDs to associate with the project (supports multiple teams)',
    example: ['clh1234567890', 'clh0987654321'],
    type: [String],
    isArray: true,
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1, { message: 'At least one team must be associated with the project' })
  teamIds: string[]
}
