import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator'

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
}
