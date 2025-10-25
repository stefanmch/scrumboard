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
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger'
import { StoriesService } from './stories.service'
import { CreateStoryDto } from './dto/create-story.dto'
import { UpdateStoryDto } from './dto/update-story.dto'
import { BacklogFilterDto } from './dto/backlog-filter.dto'
import { SplitStoryDto } from './dto/split-story.dto'
import { BulkUpdateStoriesDto, MoveStoryHierarchyDto } from './dto/bulk-update-stories.dto'
import { StoryStatus, RefinementStatus } from '@prisma/client'

@ApiTags('stories')
@Controller('stories')
export class StoriesController {
  constructor(private readonly storiesService: StoriesService) {}

  @Post()
  create(@Body() createStoryDto: CreateStoryDto) {
    return this.storiesService.create(createStoryDto)
  }

  @Get()
  findAll(
    @Query('projectId') projectId?: string,
    @Query('sprintId') sprintId?: string
  ) {
    return this.storiesService.findAll(projectId, sprintId)
  }

  @Get('by-status/:status')
  getByStatus(
    @Param('status') status: StoryStatus,
    @Query('projectId') projectId?: string
  ) {
    return this.storiesService.getStoriesByStatus(status, projectId)
  }

  @ApiOperation({
    summary: 'Get filtered and paginated backlog stories',
    description:
      'Retrieve backlog stories with advanced filtering, sorting, and pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Backlog stories retrieved successfully',
  })
  @Get('backlog')
  getBacklog(@Query() filterDto: BacklogFilterDto) {
    return this.storiesService.getBacklog(filterDto)
  }

  @Get('tree')
  @ApiOperation({ summary: 'Get story hierarchy tree for a project' })
  @ApiQuery({
    name: 'projectId',
    required: true,
    description: 'Project ID to get story tree for',
  })
  @ApiResponse({ status: 200, description: 'Story tree retrieved successfully' })
  getStoryTree(@Query('projectId') projectId: string) {
    return this.storiesService.getStoryTree(projectId)
  }

  @ApiOperation({
    summary: 'Get stories that need refinement',
    description: 'Retrieve stories with NOT_REFINED or NEEDS_SPLITTING status',
  })
  @ApiQuery({
    name: 'projectId',
    required: false,
    description: 'Filter by project ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Stories needing refinement retrieved',
  })
  @Get('needing-refinement')
  getStoriesNeedingRefinement(@Query('projectId') projectId?: string) {
    return this.storiesService.getStoriesNeedingRefinement(projectId)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.storiesService.findOne(id)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateStoryDto: UpdateStoryDto) {
    return this.storiesService.update(id, updateStoryDto)
  }

  @Put(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: StoryStatus) {
    return this.storiesService.updateStatus(id, status)
  }

  @Put(':id/move-to-sprint')
  moveToSprint(
    @Param('id') id: string,
    @Body('sprintId') sprintId: string | null
  ) {
    return this.storiesService.moveToSprint(id, sprintId)
  }

  @Put('reorder')
  reorderStories(@Body('storyIds') storyIds: string[]) {
    return this.storiesService.reorderStories(storyIds)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.storiesService.remove(id)
  }

  // ========== Hierarchy Management Endpoints ==========

  @ApiOperation({ summary: 'Move story in hierarchy' })
  @ApiParam({ name: 'id', description: 'Story ID to move' })
  @ApiBody({ type: MoveStoryHierarchyDto })
  @ApiResponse({ status: 200, description: 'Story moved successfully' })
  @Put(':id/move-hierarchy')
  moveStoryInHierarchy(
    @Param('id') id: string,
    @Body() moveDto: MoveStoryHierarchyDto
  ) {
    return this.storiesService.moveStoryInHierarchy(
      id,
      moveDto.newParentId ?? null,
      moveDto.position
    )
  }

  @ApiOperation({ summary: 'Split story into multiple child stories' })
  @ApiParam({ name: 'id', description: 'Story ID to split' })
  @ApiBody({ type: SplitStoryDto })
  @ApiResponse({
    status: 201,
    description: 'Stories created from split successfully',
  })
  @Post(':id/split')
  splitStory(@Param('id') id: string, @Body() splitStoryDto: SplitStoryDto) {
    return this.storiesService.splitStory(id, splitStoryDto)
  }

  // ========== Refinement Workflow Endpoints ==========

  @ApiOperation({ summary: 'Update refinement status of a story' })
  @ApiParam({ name: 'id', description: 'Story ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refinementStatus: {
          type: 'string',
          enum: Object.values(RefinementStatus),
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Refinement status updated successfully',
  })
  @Put(':id/refinement-status')
  updateRefinementStatus(
    @Param('id') id: string,
    @Body('refinementStatus') refinementStatus: RefinementStatus
  ) {
    return this.storiesService.updateRefinementStatus(id, refinementStatus)
  }

  @ApiOperation({
    summary: 'Mark story as ready for sprint',
    description:
      'Validate and mark story as refined (requires story points and acceptance criteria)',
  })
  @ApiParam({ name: 'id', description: 'Story ID' })
  @ApiResponse({ status: 200, description: 'Story marked as ready' })
  @Put(':id/mark-ready')
  markReadyForSprint(@Param('id') id: string) {
    return this.storiesService.markReadyForSprint(id)
  }

  // ========== Bulk Operations Endpoints ==========

  @ApiOperation({
    summary: 'Bulk update multiple stories',
    description: 'Update multiple stories at once with various fields',
  })
  @ApiBody({ type: BulkUpdateStoriesDto })
  @ApiResponse({ status: 200, description: 'Stories updated successfully' })
  @Put('bulk-update')
  bulkUpdateStories(@Body() bulkUpdateDto: BulkUpdateStoriesDto) {
    return this.storiesService.bulkUpdateStories(bulkUpdateDto)
  }
}
