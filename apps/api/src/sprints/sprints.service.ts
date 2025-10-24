import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateSprintDto } from './dto/create-sprint.dto'
import { UpdateSprintDto } from './dto/update-sprint.dto'
import { CreateSprintCommentDto } from './dto/create-sprint-comment.dto'
import { SprintMetricsDto, BurndownDataPoint } from './dto/sprint-metrics.dto'
import { Sprint, SprintStatus, SprintComment, StoryStatus } from '@prisma/client'

@Injectable()
export class SprintsService {
  constructor(private prisma: PrismaService) {}

  async create(createSprintDto: CreateSprintDto): Promise<Sprint> {
    // Validate dates
    const startDate = new Date(createSprintDto.startDate)
    const endDate = new Date(createSprintDto.endDate)

    if (startDate >= endDate) {
      throw new BadRequestException('End date must be after start date')
    }

    // Check for overlapping sprints in the same project
    const overlappingSprints = await this.prisma.sprint.findMany({
      where: {
        projectId: createSprintDto.projectId,
        status: { in: [SprintStatus.PLANNING, SprintStatus.ACTIVE] },
        OR: [
          {
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        ],
      },
    })

    if (overlappingSprints.length > 0) {
      throw new ConflictException(
        'Sprint dates overlap with existing active or planning sprint'
      )
    }

    return this.prisma.sprint.create({
      data: {
        name: createSprintDto.name,
        goal: createSprintDto.goal,
        startDate,
        endDate,
        capacity: createSprintDto.capacity,
        projectId: createSprintDto.projectId,
        status: SprintStatus.PLANNING,
      },
      include: {
        project: true,
        stories: {
          include: {
            assignee: true,
            creator: true,
            tasks: true,
          },
        },
        comments: {
          include: {
            author: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })
  }

  async findAll(
    projectId?: string,
    status?: SprintStatus
  ): Promise<Sprint[]> {
    const where: any = {}

    if (projectId) {
      where.projectId = projectId
    }

    if (status) {
      where.status = status
    }

    return this.prisma.sprint.findMany({
      where,
      include: {
        project: true,
        stories: {
          include: {
            assignee: true,
            creator: true,
            tasks: true,
          },
        },
        comments: {
          include: {
            author: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        retrospectives: true,
      },
      orderBy: [{ status: 'asc' }, { startDate: 'desc' }],
    })
  }

  async findOne(id: string): Promise<Sprint> {
    const sprint = await this.prisma.sprint.findUnique({
      where: { id },
      include: {
        project: true,
        stories: {
          include: {
            assignee: true,
            creator: true,
            tasks: true,
            comments: true,
          },
          orderBy: { rank: 'asc' },
        },
        comments: {
          include: {
            author: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        retrospectives: {
          include: {
            items: true,
            actionItems: true,
          },
        },
      },
    })

    if (!sprint) {
      throw new NotFoundException(`Sprint with ID ${id} not found`)
    }

    return sprint
  }

  async update(id: string, updateSprintDto: UpdateSprintDto): Promise<Sprint> {
    await this.findOne(id)

    // Validate dates if provided
    if (updateSprintDto.startDate || updateSprintDto.endDate) {
      const sprint = await this.prisma.sprint.findUnique({ where: { id } })

      if (!sprint) {
        throw new NotFoundException(`Sprint with ID ${id} not found`)
      }

      const startDate = updateSprintDto.startDate
        ? new Date(updateSprintDto.startDate)
        : sprint.startDate
      const endDate = updateSprintDto.endDate
        ? new Date(updateSprintDto.endDate)
        : sprint.endDate

      if (startDate >= endDate) {
        throw new BadRequestException('End date must be after start date')
      }
    }

    return this.prisma.sprint.update({
      where: { id },
      data: {
        ...updateSprintDto,
        startDate: updateSprintDto.startDate
          ? new Date(updateSprintDto.startDate)
          : undefined,
        endDate: updateSprintDto.endDate
          ? new Date(updateSprintDto.endDate)
          : undefined,
        updatedAt: new Date(),
      },
      include: {
        project: true,
        stories: {
          include: {
            assignee: true,
            creator: true,
            tasks: true,
          },
        },
        comments: {
          include: {
            author: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })
  }

  async remove(id: string): Promise<Sprint> {
    await this.findOne(id)

    // Remove sprint association from stories first
    await this.prisma.story.updateMany({
      where: { sprintId: id },
      data: { sprintId: null },
    })

    return this.prisma.sprint.delete({
      where: { id },
      include: {
        project: true,
        stories: true,
        comments: true,
      },
    })
  }

  async startSprint(id: string): Promise<Sprint> {
    const sprint = await this.findOne(id)

    if (sprint.status !== SprintStatus.PLANNING) {
      throw new BadRequestException(
        'Only sprints in PLANNING status can be started'
      )
    }

    // Check if there's already an active sprint in the same project
    const activeSprints = await this.prisma.sprint.findMany({
      where: {
        projectId: sprint.projectId,
        status: SprintStatus.ACTIVE,
      },
    })

    if (activeSprints.length > 0) {
      throw new ConflictException(
        'Cannot start sprint: Another sprint is already active in this project'
      )
    }

    return this.prisma.sprint.update({
      where: { id },
      data: {
        status: SprintStatus.ACTIVE,
        updatedAt: new Date(),
      },
      include: {
        project: true,
        stories: {
          include: {
            assignee: true,
            creator: true,
            tasks: true,
          },
        },
        comments: {
          include: {
            author: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })
  }

  async completeSprint(id: string): Promise<Sprint> {
    const sprint = await this.findOne(id) as any

    if (sprint.status !== SprintStatus.ACTIVE) {
      throw new BadRequestException(
        'Only active sprints can be completed'
      )
    }

    // Calculate velocity (completed story points)
    const completedStories = (sprint.stories || []).filter(
      (story) => story.status === StoryStatus.DONE
    )
    const velocity = completedStories.reduce(
      (sum, story) => sum + (story.storyPoints || 0),
      0
    )

    // Move incomplete stories back to backlog
    await this.prisma.story.updateMany({
      where: {
        sprintId: id,
        status: { not: StoryStatus.DONE },
      },
      data: { sprintId: null },
    })

    return this.prisma.sprint.update({
      where: { id },
      data: {
        status: SprintStatus.COMPLETED,
        velocity,
        updatedAt: new Date(),
      },
      include: {
        project: true,
        stories: {
          include: {
            assignee: true,
            creator: true,
            tasks: true,
          },
        },
        comments: {
          include: {
            author: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })
  }

  async addStories(id: string, storyIds: string[]): Promise<Sprint> {
    const sprint = await this.findOne(id)

    // Verify all stories exist and belong to the same project
    const stories = await this.prisma.story.findMany({
      where: { id: { in: storyIds } },
    })

    if (stories.length !== storyIds.length) {
      throw new NotFoundException('One or more stories not found')
    }

    const invalidStories = stories.filter(
      (story) => story.projectId !== sprint.projectId
    )
    if (invalidStories.length > 0) {
      throw new BadRequestException(
        'All stories must belong to the same project as the sprint'
      )
    }

    // Add stories to sprint
    await this.prisma.story.updateMany({
      where: { id: { in: storyIds } },
      data: { sprintId: id },
    })

    return this.findOne(id)
  }

  async removeStory(sprintId: string, storyId: string): Promise<Sprint> {
    await this.findOne(sprintId)

    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
    })

    if (!story) {
      throw new NotFoundException(`Story with ID ${storyId} not found`)
    }

    if (story.sprintId !== sprintId) {
      throw new BadRequestException('Story does not belong to this sprint')
    }

    await this.prisma.story.update({
      where: { id: storyId },
      data: { sprintId: null },
    })

    return this.findOne(sprintId)
  }

  async getMetrics(id: string): Promise<SprintMetricsDto> {
    const sprint = await this.findOne(id) as any
    const stories = sprint.stories || []

    const totalStoryPoints = stories.reduce(
      (sum, story) => sum + (story.storyPoints || 0),
      0
    )

    const completedStoryPoints = stories
      .filter((story) => story.status === StoryStatus.DONE)
      .reduce((sum, story) => sum + (story.storyPoints || 0), 0)

    const remainingStoryPoints = totalStoryPoints - completedStoryPoints

    const completionPercentage =
      totalStoryPoints > 0 ? (completedStoryPoints / totalStoryPoints) * 100 : 0

    const storiesCount = {
      total: stories.length,
      todo: stories.filter((s) => s.status === StoryStatus.TODO).length,
      inProgress: stories.filter(
        (s) => s.status === StoryStatus.IN_PROGRESS
      ).length,
      done: stories.filter((s) => s.status === StoryStatus.DONE).length,
      blocked: stories.filter((s) => s.status === StoryStatus.BLOCKED)
        .length,
    }

    // Generate burndown chart data
    const burndownData = this.generateBurndownData(
      sprint.startDate,
      sprint.endDate,
      totalStoryPoints
    )

    return {
      totalStoryPoints,
      completedStoryPoints,
      remainingStoryPoints,
      completionPercentage: Math.round(completionPercentage * 100) / 100,
      storiesCount,
      velocity: sprint.velocity || undefined,
      burndownData,
    }
  }

  private generateBurndownData(
    startDate: Date,
    endDate: Date,
    totalPoints: number
  ): BurndownDataPoint[] {
    const data: BurndownDataPoint[] = []
    const start = new Date(startDate)
    const end = new Date(endDate)
    const totalDays = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    )

    for (let day = 0; day <= totalDays; day++) {
      const currentDate = new Date(start)
      currentDate.setDate(currentDate.getDate() + day)

      const idealRemaining =
        totalPoints - (totalPoints / totalDays) * day

      data.push({
        date: currentDate.toISOString().split('T')[0],
        remainingPoints: totalPoints, // In real implementation, this would be actual remaining points
        idealRemaining: Math.max(0, Math.round(idealRemaining)),
      })
    }

    return data
  }

  async addComment(
    sprintId: string,
    createCommentDto: CreateSprintCommentDto,
    authorId: string
  ): Promise<SprintComment> {
    await this.findOne(sprintId)

    return this.prisma.sprintComment.create({
      data: {
        content: createCommentDto.content,
        type: createCommentDto.type || 'GENERAL',
        sprintId,
        authorId,
      },
      include: {
        author: true,
        sprint: true,
      },
    })
  }

  async getComments(sprintId: string): Promise<SprintComment[]> {
    await this.findOne(sprintId)

    return this.prisma.sprintComment.findMany({
      where: { sprintId },
      include: {
        author: true,
      },
      orderBy: { createdAt: 'desc' },
    })
  }
}
