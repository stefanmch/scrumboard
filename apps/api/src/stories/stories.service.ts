import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateStoryDto } from './dto/create-story.dto'
import { UpdateStoryDto } from './dto/update-story.dto'
import { Story, StoryStatus } from '@prisma/client'

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
}
