import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator'
import {
  StoryStatus,
  StoryType,
  Priority,
  RefinementStatus,
} from '@prisma/client'

export class CreateStoryDto {
  @IsString()
  title: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  acceptanceCriteria?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  storyPoints?: number

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority

  @IsOptional()
  @IsEnum(StoryStatus)
  status?: StoryStatus

  @IsOptional()
  @IsEnum(StoryType)
  type?: StoryType

  @IsOptional()
  @IsEnum(RefinementStatus)
  refinementStatus?: RefinementStatus

  @IsOptional()
  @IsString()
  projectId?: string

  @IsOptional()
  @IsString()
  sprintId?: string

  @IsOptional()
  @IsString()
  assigneeId?: string

  @IsOptional()
  @IsString()
  creatorId?: string

  @IsOptional()
  @IsString()
  parentId?: string

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  businessValue?: number

  @IsOptional()
  @IsString({ each: true })
  tags?: string[]
}
