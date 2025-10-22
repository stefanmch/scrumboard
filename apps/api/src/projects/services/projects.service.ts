import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateProjectDto } from '../dto/create-project.dto'
import { UpdateProjectDto } from '../dto/update-project.dto'
import { ProjectResponseDto } from '../dto/project-response.dto'
import { ProjectStatsResponseDto } from '../dto/project-stats-response.dto'
import { plainToInstance } from 'class-transformer'
import { ProjectStatus } from '@prisma/client'

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new project in a team
   * User must be a member of the team
   */
  async create(teamId: string, createProjectDto: CreateProjectDto, userId: string): Promise<ProjectResponseDto> {
    // Verify user is a team member
    await this.verifyTeamMembership(teamId, userId)

    const project = await this.prisma.project.create({
      data: {
        name: createProjectDto.name,
        description: createProjectDto.description,
        status: ProjectStatus.ACTIVE,
        teamId,
      },
      include: {
        team: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            stories: true,
            sprints: true,
            tasks: true,
          },
        },
      },
    })

    return plainToInstance(ProjectResponseDto, {
      ...project,
      teamName: project.team.name,
      storyCount: project._count.stories,
      sprintCount: project._count.sprints,
      taskCount: project._count.tasks,
    })
  }

  /**
   * Find all projects for a specific team
   * User must be a member of the team
   */
  async findAllForTeam(teamId: string, userId: string): Promise<ProjectResponseDto[]> {
    // Verify user is a team member
    await this.verifyTeamMembership(teamId, userId)

    const projects = await this.prisma.project.findMany({
      where: { teamId },
      include: {
        team: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            stories: true,
            sprints: true,
            tasks: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return projects.map((project) =>
      plainToInstance(ProjectResponseDto, {
        ...project,
        teamName: project.team.name,
        storyCount: project._count.stories,
        sprintCount: project._count.sprints,
        taskCount: project._count.tasks,
      }),
    )
  }

  /**
   * Find a specific project by ID
   * User must be a member of the team that owns the project
   */
  async findOne(projectId: string, userId: string): Promise<ProjectResponseDto> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        team: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            stories: true,
            sprints: true,
            tasks: true,
          },
        },
      },
    })

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`)
    }

    // Verify user is a member of the team that owns the project
    await this.verifyTeamMembership(project.teamId, userId)

    return plainToInstance(ProjectResponseDto, {
      ...project,
      teamName: project.team.name,
      storyCount: project._count.stories,
      sprintCount: project._count.sprints,
      taskCount: project._count.tasks,
    })
  }

  /**
   * Update a project
   * Only team admins can update projects
   */
  async update(projectId: string, updateProjectDto: UpdateProjectDto, userId: string): Promise<ProjectResponseDto> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    })

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`)
    }

    // Verify user is a team admin
    await this.verifyTeamAdmin(project.teamId, userId)

    const updatedProject = await this.prisma.project.update({
      where: { id: projectId },
      data: updateProjectDto,
      include: {
        team: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            stories: true,
            sprints: true,
            tasks: true,
          },
        },
      },
    })

    return plainToInstance(ProjectResponseDto, {
      ...updatedProject,
      teamName: updatedProject.team.name,
      storyCount: updatedProject._count.stories,
      sprintCount: updatedProject._count.sprints,
      taskCount: updatedProject._count.tasks,
    })
  }

  /**
   * Delete a project
   * Only team admins can delete projects
   */
  async remove(projectId: string, userId: string): Promise<void> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    })

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`)
    }

    // Verify user is a team admin
    await this.verifyTeamAdmin(project.teamId, userId)

    await this.prisma.project.delete({
      where: { id: projectId },
    })
  }

  /**
   * Get detailed statistics for a project
   * User must be a member of the team that owns the project
   */
  async getStats(projectId: string, userId: string): Promise<ProjectStatsResponseDto> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        stories: {
          select: {
            status: true,
          },
        },
        sprints: {
          select: {
            status: true,
          },
        },
        tasks: {
          select: {
            status: true,
          },
        },
      },
    })

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`)
    }

    // Verify user is a member of the team that owns the project
    await this.verifyTeamMembership(project.teamId, userId)

    // Calculate statistics
    const totalStories = project.stories.length
    const completedStories = project.stories.filter((s) => s.status === 'DONE').length

    const totalSprints = project.sprints.length
    const activeSprints = project.sprints.filter((s) => s.status === 'ACTIVE').length
    const completedSprints = project.sprints.filter((s) => s.status === 'COMPLETED').length

    const totalTasks = project.tasks.length
    const completedTasks = project.tasks.filter((t) => t.status === 'DONE').length

    // Calculate completion percentage based on stories
    const completionPercentage = totalStories > 0 ? Math.round((completedStories / totalStories) * 100) : 0

    return plainToInstance(ProjectStatsResponseDto, {
      projectId: project.id,
      projectName: project.name,
      totalStories,
      completedStories,
      totalSprints,
      activeSprints,
      completedSprints,
      totalTasks,
      completedTasks,
      completionPercentage,
    })
  }

  /**
   * Verify that a user is a member of a team
   * Throws ForbiddenException if not a member
   */
  private async verifyTeamMembership(teamId: string, userId: string): Promise<void> {
    const membership = await this.prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId,
          teamId,
        },
      },
    })

    if (!membership) {
      throw new ForbiddenException('You are not a member of this team')
    }
  }

  /**
   * Verify that a user is an admin of a team
   * Throws ForbiddenException if not an admin
   */
  private async verifyTeamAdmin(teamId: string, userId: string): Promise<void> {
    const membership = await this.prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId,
          teamId,
        },
      },
    })

    if (!membership) {
      throw new ForbiddenException('You are not a member of this team')
    }

    if (membership.role !== 'ADMIN') {
      throw new ForbiddenException('Only team admins can perform this action')
    }
  }
}
