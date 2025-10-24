import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common'
import { SprintsService } from './sprints.service'
import { CreateSprintDto } from './dto/create-sprint.dto'
import { UpdateSprintDto } from './dto/update-sprint.dto'
import { AddStoriesDto } from './dto/add-stories.dto'
import { CreateSprintCommentDto } from './dto/create-sprint-comment.dto'
import { SprintStatus } from '@prisma/client'
import { SimpleJwtAuthGuard } from '../auth/guards/simple-jwt-auth.guard'

@Controller('sprints')
@UseGuards(SimpleJwtAuthGuard)
export class SprintsController {
  constructor(private readonly sprintsService: SprintsService) {}

  @Post()
  create(@Body() createSprintDto: CreateSprintDto) {
    return this.sprintsService.create(createSprintDto)
  }

  @Get()
  findAll(
    @Query('projectId') projectId?: string,
    @Query('status') status?: SprintStatus
  ) {
    return this.sprintsService.findAll(projectId, status)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sprintsService.findOne(id)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSprintDto: UpdateSprintDto) {
    return this.sprintsService.update(id, updateSprintDto)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.sprintsService.remove(id)
  }

  @Post(':id/start')
  startSprint(@Param('id') id: string) {
    return this.sprintsService.startSprint(id)
  }

  @Post(':id/complete')
  completeSprint(@Param('id') id: string) {
    return this.sprintsService.completeSprint(id)
  }

  @Post(':id/stories')
  addStories(@Param('id') id: string, @Body() addStoriesDto: AddStoriesDto) {
    return this.sprintsService.addStories(id, addStoriesDto.storyIds)
  }

  @Delete(':id/stories/:storyId')
  removeStory(@Param('id') id: string, @Param('storyId') storyId: string) {
    return this.sprintsService.removeStory(id, storyId)
  }

  @Get(':id/metrics')
  getMetrics(@Param('id') id: string) {
    return this.sprintsService.getMetrics(id)
  }

  @Post(':id/comments')
  addComment(
    @Param('id') id: string,
    @Body() createCommentDto: CreateSprintCommentDto,
    @Request() req: any
  ) {
    const userId = req.user.sub || req.user.id
    return this.sprintsService.addComment(id, createCommentDto, userId)
  }

  @Get(':id/comments')
  getComments(@Param('id') id: string) {
    return this.sprintsService.getComments(id)
  }
}
