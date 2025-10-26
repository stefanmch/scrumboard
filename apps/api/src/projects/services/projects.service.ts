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
   * Create a new project with associated teams
   * User must be a member of at least one of the teams
   */
  async create(createProjectDto: CreateProjectDto, userId: string): Promise<ProjectResponseDto> {
    // Extract team IDs from DTO
    const teamIds = createProjectDto.teamIds

    if (!teamIds || teamIds.length === 0) {
      throw new ForbiddenException('At least one team must be associated with the project')
    }

    // Verify user is a member of at least one team
    const userTeams = await this.prisma.teamMember.findMany({
      where: {
        userId,
        teamId: { in: teamIds },
      },
    })

    if (userTeams.length === 0) {
      throw new ForbiddenException('You must be a member of at least one of the specified teams')
    }

    // Create project and associate teams
    const project = await this.prisma.project.create({
      data: {
        name: createProjectDto.name,
        description: createProjectDto.description,
        status: ProjectStatus.ACTIVE,
        teams: {
          create: teamIds.map((teamId: string) => ({
            teamId,
            role: 'PRIMARY',
          })),
        },
      },
      include: {
        teams: {
          include: {
            team: true,
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
      teams: project.teams.map((pt) => ({
        id: pt.team.id,
        name: pt.team.name,
        description: pt.team.description,
        role: pt.role,
        joinedAt: pt.joinedAt,
        memberCount: 0, // Will be populated if needed
      })),
      storyCount: project._count.stories,
      sprintCount: project._count.sprints,
      taskCount: project._count.tasks,
    })
  }

  /**
   * Find all projects for the current user
   * Returns projects from any team the user is a member of
   */
  async findAllForUser(userId: string): Promise<ProjectResponseDto[]> {
    // Get all teams the user is a member of
    const userTeams = await this.prisma.teamMember.findMany({
      where: { userId },
      select: { teamId: true },
    })

    const teamIds = userTeams.map((tm) => tm.teamId)

    if (teamIds.length === 0) {
      return []
    }

    // Find all projects associated with any of the user's teams
    const projects = await this.prisma.project.findMany({
      where: {
        teams: {
          some: {
            teamId: { in: teamIds },
          },
        },
      },
      include: {
        teams: {
          include: {
            team: true,
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
        teams: project.teams.map((pt) => ({
          id: pt.team.id,
          name: pt.team.name,
          description: pt.team.description,
          role: pt.role,
          joinedAt: pt.joinedAt,
          memberCount: 0,
        })),
        storyCount: project._count.stories,
        sprintCount: project._count.sprints,
        taskCount: project._count.tasks,
      }),
    )
  }

  /**
   * Find a specific project by ID
   * User must be a member of any team associated with the project
   */
  async findOne(projectId: string, userId: string): Promise<ProjectResponseDto> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        teams: {
          include: {
            team: true,
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

    // Verify user has access through any team
    await this.verifyProjectAccess(projectId, userId)

    return plainToInstance(ProjectResponseDto, {
      ...project,
      teams: project.teams.map((pt) => ({
        id: pt.team.id,
        name: pt.team.name,
        description: pt.team.description,
        role: pt.role,
        joinedAt: pt.joinedAt,
        memberCount: 0,
      })),
      storyCount: project._count.stories,
      sprintCount: project._count.sprints,
      taskCount: project._count.tasks,
    })
  }

  /**
   * Update a project
   * Only admins of associated teams can update projects
   */
  async update(projectId: string, updateProjectDto: UpdateProjectDto, userId: string): Promise<ProjectResponseDto> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    })

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`)
    }

    // Verify user is an admin of at least one associated team
    await this.verifyProjectAdmin(projectId, userId)

    const updatedProject = await this.prisma.project.update({
      where: { id: projectId },
      data: updateProjectDto,
      include: {
        teams: {
          include: {
            team: true,
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
      teams: updatedProject.teams.map((pt) => ({
        id: pt.team.id,
        name: pt.team.name,
        description: pt.team.description,
        role: pt.role,
        joinedAt: pt.joinedAt,
        memberCount: 0,
      })),
      storyCount: updatedProject._count.stories,
      sprintCount: updatedProject._count.sprints,
      taskCount: updatedProject._count.tasks,
    })
  }

  /**
   * Delete a project
   * Only admins of associated teams can delete projects
   */
  async remove(projectId: string, userId: string): Promise<void> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    })

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`)
    }

    // Verify user is an admin of at least one associated team
    await this.verifyProjectAdmin(projectId, userId)

    await this.prisma.project.delete({
      where: { id: projectId },
    })
  }

  /**
   * Get detailed statistics for a project
   * User must have access to the project
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

    // Verify user has access through any team
    await this.verifyProjectAccess(projectId, userId)

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
   * Add a team to a project
   * Only admins can add teams
   */
  async addTeam(projectId: string, teamId: string, userId: string): Promise<void> {
    // Verify project exists
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    })

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`)
    }

    // Verify team exists
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    })

    if (!team) {
      throw new NotFoundException(`Team with ID ${teamId} not found`)
    }

    // Verify user is an admin of the project
    await this.verifyProjectAdmin(projectId, userId)

    // Check if team is already associated
    const existing = await this.prisma.projectTeam.findUnique({
      where: {
        projectId_teamId: {
          projectId,
          teamId,
        },
      },
    })

    if (existing) {
      throw new ForbiddenException('Team is already associated with this project')
    }

    // Add team to project
    await this.prisma.projectTeam.create({
      data: {
        projectId,
        teamId,
      },
    })
  }

  /**
   * Remove a team from a project
   * Only admins can remove teams
   */
  async removeTeam(projectId: string, teamId: string, userId: string): Promise<void> {
    // Verify project exists
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        teams: true,
      },
    })

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`)
    }

    // Verify user is an admin of the project
    await this.verifyProjectAdmin(projectId, userId)

    // Ensure at least one team remains
    if (project.teams.length <= 1) {
      throw new ForbiddenException('Cannot remove the last team from a project')
    }

    // Remove team from project
    await this.prisma.projectTeam.delete({
      where: {
        projectId_teamId: {
          projectId,
          teamId,
        },
      },
    })
  }

  /**
   * Get all teams associated with a project
   */
  async getTeams(projectId: string, userId: string) {
    // Verify project exists
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    })

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`)
    }

    // Verify user has access
    await this.verifyProjectAccess(projectId, userId)

    // Get all teams
    const projectTeams = await this.prisma.projectTeam.findMany({
      where: { projectId },
      include: {
        team: {
          include: {
            _count: {
              select: {
                members: true,
              },
            },
          },
        },
      },
    })

    return projectTeams.map((pt) => ({
      id: pt.team.id,
      name: pt.team.name,
      description: pt.team.description,
      memberCount: pt.team._count.members,
    }))
  }

  /**
   * Verify that a user has access to a project through any associated team
   * Throws ForbiddenException if no access
   */
  private async verifyProjectAccess(projectId: string, userId: string): Promise<void> {
    // Get all teams associated with the project
    const projectTeams = await this.prisma.projectTeam.findMany({
      where: { projectId },
      select: { teamId: true },
    })

    if (projectTeams.length === 0) {
      throw new ForbiddenException('No teams are associated with this project')
    }

    const teamIds = projectTeams.map((pt) => pt.teamId)

    // Check if user is a member of any of these teams
    const membership = await this.prisma.teamMember.findFirst({
      where: {
        userId,
        teamId: { in: teamIds },
      },
    })

    if (!membership) {
      throw new ForbiddenException('You do not have access to this project')
    }
  }

  /**
   * Verify that a user is an admin of at least one team associated with the project
   * Throws ForbiddenException if not an admin
   */
  private async verifyProjectAdmin(projectId: string, userId: string): Promise<void> {
    // Get all teams associated with the project
    const projectTeams = await this.prisma.projectTeam.findMany({
      where: { projectId },
      select: { teamId: true },
    })

    if (projectTeams.length === 0) {
      throw new ForbiddenException('No teams are associated with this project')
    }

    const teamIds = projectTeams.map((pt) => pt.teamId)

    // Check if user is an admin of any of these teams
    const adminMembership = await this.prisma.teamMember.findFirst({
      where: {
        userId,
        teamId: { in: teamIds },
        role: 'ADMIN',
      },
    })

    if (!adminMembership) {
      throw new ForbiddenException('You must be an admin of at least one associated team to perform this action')
    }
  }
}
