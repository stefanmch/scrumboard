import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Put,
} from '@nestjs/common';
import { StoriesService } from './stories.service';
import { CreateStoryDto } from './dto/create-story.dto';
import { UpdateStoryDto } from './dto/update-story.dto';
import { StoryStatus } from '@prisma/client';

@Controller('stories')
export class StoriesController {
  constructor(private readonly storiesService: StoriesService) {}

  @Post()
  create(@Body() createStoryDto: CreateStoryDto) {
    return this.storiesService.create(createStoryDto);
  }

  @Get()
  findAll(
    @Query('projectId') projectId?: string,
    @Query('sprintId') sprintId?: string,
  ) {
    return this.storiesService.findAll(projectId, sprintId);
  }

  @Get('by-status/:status')
  getByStatus(
    @Param('status') status: StoryStatus,
    @Query('projectId') projectId?: string,
  ) {
    return this.storiesService.getStoriesByStatus(status, projectId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.storiesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateStoryDto: UpdateStoryDto) {
    return this.storiesService.update(id, updateStoryDto);
  }

  @Put(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: StoryStatus,
  ) {
    return this.storiesService.updateStatus(id, status);
  }

  @Put(':id/move-to-sprint')
  moveToSprint(
    @Param('id') id: string,
    @Body('sprintId') sprintId: string | null,
  ) {
    return this.storiesService.moveToSprint(id, sprintId);
  }

  @Put('reorder')
  reorderStories(@Body('storyIds') storyIds: string[]) {
    return this.storiesService.reorderStories(storyIds);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.storiesService.remove(id);
  }
}