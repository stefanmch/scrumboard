import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateStoryDto } from './dto/create-story.dto'
import { UpdateStoryDto } from './dto/update-story.dto'
import { BacklogFilterDto, BacklogSortField, SortOrder } from './dto/backlog-filter.dto'
import { SplitStoryDto } from './dto/split-story.dto'
import { BulkUpdateStoriesDto } from './dto/bulk-update-stories.dto'
import { Story, StoryStatus, RefinementStatus } from '@prisma/client'

@Injectable()
export class StoriesService {
  constructor(private prisma: PrismaService) {}

  async create(createStoryDto: CreateStoryDto): Promise<Story> {
    const storyCount = await this.prisma.story.count()

    // For now, use a default project and creator since we don't have authentication
    const defaultProjectId = 'default-project'
    const defaultCreatorId = 'default-user'

    return this.prisma.story.create({
      data: {
        title: createStoryDto.title,
        description: createStoryDto.description,
        storyPoints: createStoryDto.storyPoints,
        status: createStoryDto.status || StoryStatus.TODO,
        projectId: createStoryDto.projectId || defaultProjectId,
        creatorId: createStoryDto.creatorId || defaultCreatorId,
        rank: storyCount + 1,
      },
      include: {
        assignee: true,
        creator: true,
        parent: true,
        children: true,
        project: true,
        sprint: true,
        tasks: true,
        comments: true,
      },
    })
  }

  async findAll(projectId?: string, sprintId?: string): Promise<Story[]> {
    const where: any = {}

    if (projectId) {
      where.projectId = projectId
    }

    if (sprintId) {
      where.sprintId = sprintId
    }

    return this.prisma.story.findMany({
      where,
      include: {
        assignee: true,
        creator: true,
        parent: true,
        children: true,
        project: true,
        sprint: true,
        tasks: true,
        comments: true,
      },
      orderBy: [{ status: 'asc' }, { rank: 'asc' }],
    })
  }

  async findOne(id: string): Promise<Story> {
    const story = await this.prisma.story.findUnique({
      where: { id },
      include: {
        assignee: true,
        creator: true,
        parent: true,
        children: true,
        project: true,
        sprint: true,
        tasks: true,
        comments: true,
      },
    })

    if (!story) {
      throw new NotFoundException(`Story with ID ${id} not found`)
    }

    return story
  }

  async update(id: string, updateStoryDto: UpdateStoryDto): Promise<Story> {
    const existingStory = await this.findOne(id)

    return this.prisma.story.update({
      where: { id },
      data: {
        ...updateStoryDto,
        updatedAt: new Date(),
      },
      include: {
        assignee: true,
        creator: true,
        parent: true,
        children: true,
        project: true,
        sprint: true,
        tasks: true,
        comments: true,
      },
    })
  }

  async remove(id: string): Promise<Story> {
    const existingStory = await this.findOne(id)

    return this.prisma.story.delete({
      where: { id },
      include: {
        assignee: true,
        creator: true,
        parent: true,
        children: true,
        project: true,
        sprint: true,
        tasks: true,
        comments: true,
      },
    })
  }

  async updateStatus(id: string, status: StoryStatus): Promise<Story> {
    return this.update(id, { status })
  }

  async moveToSprint(id: string, sprintId: string | null): Promise<Story> {
    return this.update(id, { sprintId: sprintId || undefined })
  }

  async reorderStories(storyIds: string[]): Promise<Story[]> {
    const updates = storyIds.map((storyId, index) =>
      this.prisma.story.update({
        where: { id: storyId },
        data: { rank: index + 1 },
      })
    )

    await this.prisma.$transaction(updates)

    return this.findAll()
  }

  async getStoriesByStatus(
    status: StoryStatus,
    projectId?: string
  ): Promise<Story[]> {
    const where: any = { status }

    if (projectId) {
      where.projectId = projectId
    }

    return this.prisma.story.findMany({
      where,
      include: {
        assignee: true,
        creator: true,
        parent: true,
        children: true,
        project: true,
        sprint: true,
        tasks: true,
        comments: true,
      },
      orderBy: { rank: 'asc' },
    })
  }

  // ========== Hierarchy Management Methods ==========

  /**
   * Get complete story tree/hierarchy
   */
  async getStoryTree(projectId: string): Promise<Story[]> {
    // Get all top-level stories (no parent)
    const topLevelStories = await this.prisma.story.findMany({
      where: {
        projectId,
        parentId: null,
      },
      include: {
        assignee: true,
        creator: true,
        children: {
          include: {
            assignee: true,
            creator: true,
            children: {
              include: {
                assignee: true,
                creator: true,
              },
            },
          },
        },
        project: true,
        sprint: true,
        tasks: true,
        comments: true,
      },
      orderBy: { rank: 'asc' },
    })

    return topLevelStories
  }

  /**
   * Move a story in the hierarchy (change parent and/or position)
   */
  async moveStoryInHierarchy(
    storyId: string,
    newParentId: string | null,
    position?: number
  ): Promise<Story> {
    const story = await this.findOne(storyId)

    // Check if new parent exists and is not the story itself
    if (newParentId) {
      if (newParentId === storyId) {
        throw new BadRequestException('A story cannot be its own parent')
      }

      const newParent = await this.findOne(newParentId)

      // Prevent circular references
      if (await this.isDescendant(newParentId, storyId)) {
        throw new BadRequestException(
          'Cannot move story: would create circular reference'
        )
      }

      // Ensure parent and child are in the same project
      if (newParent.projectId !== story.projectId) {
        throw new BadRequestException(
          'Parent and child stories must be in the same project'
        )
      }
    }

    // Update the story
    const updatedStory = await this.prisma.story.update({
      where: { id: storyId },
      data: {
        parentId: newParentId,
        rank: position !== undefined ? position : story.rank,
        updatedAt: new Date(),
      },
      include: {
        assignee: true,
        creator: true,
        parent: true,
        children: true,
        project: true,
        sprint: true,
        tasks: true,
        comments: true,
      },
    })

    return updatedStory
  }

  /**
   * Check if a story is a descendant of another story
   */
  private async isDescendant(
    potentialAncestorId: string,
    storyId: string
  ): Promise<boolean> {
    const potentialAncestor = await this.prisma.story.findUnique({
      where: { id: potentialAncestorId },
      include: { children: true },
    })

    if (!potentialAncestor) return false

    // Check direct children
    if (potentialAncestor.children.some((child) => child.id === storyId)) {
      return true
    }

    // Recursively check descendants
    for (const child of potentialAncestor.children) {
      if (await this.isDescendant(child.id, storyId)) {
        return true
      }
    }

    return false
  }

  /**
   * Split a story into multiple child stories
   */
  async splitStory(
    storyId: string,
    splitStoryDto: SplitStoryDto
  ): Promise<Story[]> {
    const originalStory = await this.findOne(storyId)

    // Validate that we have stories to create
    if (!splitStoryDto.stories || splitStoryDto.stories.length === 0) {
      throw new BadRequestException('Must provide at least one story to create')
    }

    const newStories: Story[] = []
    const parentId = splitStoryDto.keepOriginalAsParent
      ? storyId
      : originalStory.parentId

    // If keeping original as parent, update it to be an Epic
    if (splitStoryDto.keepOriginalAsParent) {
      await this.prisma.story.update({
        where: { id: storyId },
        data: {
          type: 'EPIC',
          refinementStatus: RefinementStatus.REFINED,
          updatedAt: new Date(),
        },
      })
    }

    // Create the new stories
    for (let i = 0; i < splitStoryDto.stories.length; i++) {
      const storyData = splitStoryDto.stories[i]
      const newStory = await this.prisma.story.create({
        data: {
          title: storyData.title,
          description: storyData.description,
          storyPoints: storyData.storyPoints,
          acceptanceCriteria: storyData.acceptanceCriteria,
          projectId: originalStory.projectId,
          creatorId: originalStory.creatorId,
          parentId: parentId,
          rank: originalStory.rank + i + 1,
          priority: originalStory.priority,
          status: StoryStatus.TODO,
          type: originalStory.type === 'EPIC' ? 'FEATURE' : originalStory.type,
          tags: originalStory.tags,
        },
        include: {
          assignee: true,
          creator: true,
          parent: true,
          children: true,
          project: true,
          sprint: true,
          tasks: true,
          comments: true,
        },
      })

      newStories.push(newStory)
    }

    // If not keeping original, optionally delete it
    if (!splitStoryDto.keepOriginalAsParent) {
      await this.prisma.story.delete({
        where: { id: storyId },
      })
    }

    return newStories
  }

  // ========== Backlog Management Methods ==========

  /**
   * Get filtered and sorted backlog stories
   */
  async getBacklog(filterDto: BacklogFilterDto): Promise<{
    stories: Story[]
    total: number
    page: number
    limit: number
    totalPages: number
  }> {
    const {
      projectId,
      status,
      type,
      priority,
      refinementStatus,
      assigneeId,
      tags,
      excludeSprintStories = false,
      hasNoSprint = false,
      onlyTopLevel = false,
      search,
      sortBy = BacklogSortField.RANK,
      sortOrder = SortOrder.ASC,
      page = 1,
      limit = 50,
    } = filterDto

    // Build where clause
    const where: any = {}

    if (projectId) where.projectId = projectId
    if (status) where.status = status
    if (type) where.type = type
    if (priority) where.priority = priority
    if (refinementStatus) where.refinementStatus = refinementStatus
    if (assigneeId) where.assigneeId = assigneeId
    // Support both excludeSprintStories and hasNoSprint parameters
    if (excludeSprintStories || hasNoSprint) where.sprintId = null
    if (onlyTopLevel) where.parentId = null

    // Tag filtering
    if (tags && tags.length > 0) {
      where.tags = {
        hasSome: tags,
      }
    }

    // Search filtering
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Count total matching records
    const total = await this.prisma.story.count({ where })

    // Calculate pagination
    const skip = (page - 1) * limit
    const totalPages = Math.ceil(total / limit)

    // Build orderBy clause
    const orderBy: any = {}
    switch (sortBy) {
      case BacklogSortField.RANK:
        orderBy.rank = sortOrder
        break
      case BacklogSortField.PRIORITY:
        orderBy.priority = sortOrder
        break
      case BacklogSortField.STORY_POINTS:
        orderBy.storyPoints = sortOrder
        break
      case BacklogSortField.BUSINESS_VALUE:
        orderBy.businessValue = sortOrder
        break
      case BacklogSortField.CREATED_AT:
        orderBy.createdAt = sortOrder
        break
      case BacklogSortField.UPDATED_AT:
        orderBy.updatedAt = sortOrder
        break
      default:
        orderBy.rank = sortOrder
    }

    // Fetch stories
    const stories = await this.prisma.story.findMany({
      where,
      include: {
        assignee: true,
        creator: true,
        parent: true,
        children: true,
        project: true,
        sprint: true,
        tasks: true,
        comments: true,
      },
      orderBy,
      skip,
      take: limit,
    })

    return {
      stories,
      total,
      page,
      limit,
      totalPages,
    }
  }

  // ========== Refinement Workflow Methods ==========

  /**
   * Update refinement status of a story
   */
  async updateRefinementStatus(
    storyId: string,
    refinementStatus: RefinementStatus
  ): Promise<Story> {
    return this.update(storyId, { refinementStatus })
  }

  /**
   * Get stories that need refinement
   */
  async getStoriesNeedingRefinement(projectId?: string): Promise<Story[]> {
    const where: any = {
      refinementStatus: {
        in: [RefinementStatus.NOT_REFINED, RefinementStatus.NEEDS_SPLITTING],
      },
      sprintId: null, // Only backlog items
    }

    if (projectId) {
      where.projectId = projectId
    }

    return this.prisma.story.findMany({
      where,
      include: {
        assignee: true,
        creator: true,
        parent: true,
        children: true,
        project: true,
        sprint: true,
        tasks: true,
        comments: true,
      },
      orderBy: [{ priority: 'desc' }, { rank: 'asc' }],
    })
  }

  /**
   * Mark story as ready for sprint (refined and estimated)
   */
  async markReadyForSprint(storyId: string): Promise<Story> {
    const story = await this.findOne(storyId)

    // Validate story is ready
    if (!story.storyPoints || story.storyPoints === 0) {
      throw new BadRequestException(
        'Story must have story points estimated before marking ready'
      )
    }

    if (!story.acceptanceCriteria || story.acceptanceCriteria.trim() === '') {
      throw new BadRequestException(
        'Story must have acceptance criteria before marking ready'
      )
    }

    return this.update(storyId, {
      refinementStatus: RefinementStatus.REFINED,
    })
  }

  // ========== Bulk Operations ==========

  /**
   * Bulk update multiple stories
   */
  async bulkUpdateStories(
    bulkUpdateDto: BulkUpdateStoriesDto
  ): Promise<Story[]> {
    const {
      storyIds,
      status,
      priority,
      refinementStatus,
      type,
      assigneeId,
      sprintId,
      addTags,
      removeTags,
    } = bulkUpdateDto

    // Verify all stories exist
    const stories = await this.prisma.story.findMany({
      where: { id: { in: storyIds } },
    })

    if (stories.length !== storyIds.length) {
      throw new NotFoundException('One or more stories not found')
    }

    // Build update data
    const updateData: any = { updatedAt: new Date() }
    if (status !== undefined) updateData.status = status
    if (priority !== undefined) updateData.priority = priority
    if (refinementStatus !== undefined)
      updateData.refinementStatus = refinementStatus
    if (type !== undefined) updateData.type = type
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId
    if (sprintId !== undefined) updateData.sprintId = sprintId

    // Handle tag operations
    if (addTags || removeTags) {
      // For tags, we need to update each story individually
      const updates = stories.map((story) => {
        let newTags = [...story.tags]

        if (addTags) {
          newTags = [...new Set([...newTags, ...addTags])]
        }

        if (removeTags) {
          newTags = newTags.filter((tag) => !removeTags.includes(tag))
        }

        return this.prisma.story.update({
          where: { id: story.id },
          data: { ...updateData, tags: newTags },
        })
      })

      await this.prisma.$transaction(updates)
    } else {
      // Simple bulk update without tag modifications
      await this.prisma.story.updateMany({
        where: { id: { in: storyIds } },
        data: updateData,
      })
    }

    // Return updated stories
    return this.prisma.story.findMany({
      where: { id: { in: storyIds } },
      include: {
        assignee: true,
        creator: true,
        parent: true,
        children: true,
        project: true,
        sprint: true,
        tasks: true,
        comments: true,
      },
    })
  }
}
