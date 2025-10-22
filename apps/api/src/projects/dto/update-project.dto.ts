import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsOptional, MinLength, MaxLength, IsEnum } from 'class-validator'
import { ProjectStatus } from '@prisma/client'

export class UpdateProjectDto {
  @ApiProperty({
    description: 'Project name',
    example: 'E-commerce Platform',
    minLength: 3,
    maxLength: 100,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name?: string

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
    required: false,
  })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus
}
