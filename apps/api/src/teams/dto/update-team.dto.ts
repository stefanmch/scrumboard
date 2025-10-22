import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator'

export class UpdateTeamDto {
  @ApiProperty({
    description: 'Team name',
    example: 'Engineering Team',
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
    description: 'Team description',
    example: 'Core engineering team working on the main product',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string
}
