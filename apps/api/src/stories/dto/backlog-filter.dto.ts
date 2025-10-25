import {
  IsOptional,
  IsEnum,
  IsString,
  IsInt,
  Min,
  Max,
  IsArray,
  IsBoolean,
} from 'class-validator'
import { Type, Transform } from 'class-transformer'
import {
  StoryStatus,
  StoryType,
  Priority,
  RefinementStatus,
} from '@prisma/client'
import { ApiPropertyOptional } from '@nestjs/swagger'

export enum BacklogSortField {
  RANK = 'rank',
  PRIORITY = 'priority',
  STORY_POINTS = 'storyPoints',
  BUSINESS_VALUE = 'businessValue',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class BacklogFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by project ID',
  })
  @IsOptional()
  @IsString()
  projectId?: string

  @ApiPropertyOptional({
    description: 'Filter by story status',
    enum: StoryStatus,
  })
  @IsOptional()
  @IsEnum(StoryStatus)
  status?: StoryStatus

  @ApiPropertyOptional({
    description: 'Filter by story type',
    enum: StoryType,
  })
  @IsOptional()
  @IsEnum(StoryType)
  type?: StoryType

  @ApiPropertyOptional({
    description: 'Filter by priority',
    enum: Priority,
  })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority

  @ApiPropertyOptional({
    description: 'Filter by refinement status',
    enum: RefinementStatus,
  })
  @IsOptional()
  @IsEnum(RefinementStatus)
  refinementStatus?: RefinementStatus

  @ApiPropertyOptional({
    description: 'Filter by assignee ID',
  })
  @IsOptional()
  @IsString()
  assigneeId?: string

  @ApiPropertyOptional({
    description: 'Filter by tags (array of tag strings)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]

  @ApiPropertyOptional({
    description: 'Exclude stories already in sprints',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  excludeSprintStories?: boolean

  @ApiPropertyOptional({
    description: 'Filter stories with no sprint (alias for excludeSprintStories)',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  hasNoSprint?: boolean

  @ApiPropertyOptional({
    description: 'Only show top-level stories (no parent)',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  onlyTopLevel?: boolean

  @ApiPropertyOptional({
    description: 'Search term for title or description',
  })
  @IsOptional()
  @IsString()
  search?: string

  @ApiPropertyOptional({
    description: 'Field to sort by',
    enum: BacklogSortField,
    default: BacklogSortField.RANK,
  })
  @IsOptional()
  @IsEnum(BacklogSortField)
  sortBy?: BacklogSortField

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: SortOrder,
    default: SortOrder.ASC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder

  @ApiPropertyOptional({
    description: 'Page number (1-indexed)',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  @ApiPropertyOptional({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number
}
