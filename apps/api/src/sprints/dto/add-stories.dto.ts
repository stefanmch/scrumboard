import { IsArray, IsString, ArrayMinSize } from 'class-validator'

export class AddStoriesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  storyIds: string[]
}
