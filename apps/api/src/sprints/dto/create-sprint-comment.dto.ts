import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator'
import { CommentType } from '@prisma/client'

export class CreateSprintCommentDto {
  @IsString()
  @IsNotEmpty()
  content: string

  @IsEnum(CommentType)
  @IsOptional()
  type?: CommentType
}
