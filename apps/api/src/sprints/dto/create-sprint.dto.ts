import { IsString, IsNotEmpty, IsOptional, IsInt, Min, IsDateString } from 'class-validator'

export class CreateSprintDto {
  @IsString()
  @IsNotEmpty()
  name: string

  @IsString()
  @IsOptional()
  goal?: string

  @IsDateString()
  @IsNotEmpty()
  startDate: string

  @IsDateString()
  @IsNotEmpty()
  endDate: string

  @IsInt()
  @Min(0)
  @IsOptional()
  capacity?: number

  @IsString()
  @IsNotEmpty()
  projectId: string
}
