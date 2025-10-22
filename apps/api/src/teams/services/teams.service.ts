import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { UserRole } from '@prisma/client'
import {
  CreateTeamDto,
  UpdateTeamDto,
  TeamResponseDto,
  AddMemberDto,
  UpdateMemberRoleDto,
  TeamMemberResponseDto,
} from '../dto'

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new team
   * Creator is automatically added as ADMIN
   */
  async create(
    createTeamDto: CreateTeamDto,
    creatorId: string
  ): Promise<TeamResponseDto> {
    const team = await this.prisma.team.create({
      data: {
        name: createTeamDto.name,
        description: createTeamDto.description,
        creatorId,
        members: {
          create: {
            userId: creatorId,
            role: UserRole.ADMIN,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
      },
    })

    return new TeamResponseDto({
      ...team,
      description: team.description ?? undefined,
      members: team.members.map(
        (m) =>
          new TeamMemberResponseDto({
            id: m.id,
            userId: m.userId,
            userName: m.user.name,
            userEmail: m.user.email,
            userAvatar: m.user.avatar ?? undefined,
            teamId: m.teamId,
            role: m.role,
            joinedAt: m.joinedAt,
          })
      ),
      memberCount: team.members.length,
    })
  }

  /**
   * Get all teams for a user
   */
  async findAllForUser(userId: string): Promise<TeamResponseDto[]> {
    const teams = await this.prisma.team.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
            projects: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return teams.map(
      (team) =>
        new TeamResponseDto({
          ...team,
          description: team.description ?? undefined,
          members: team.members.map(
            (m) =>
              new TeamMemberResponseDto({
                id: m.id,
                userId: m.userId,
                userName: m.user.name,
                userEmail: m.user.email,
                userAvatar: m.user.avatar ?? undefined,
                teamId: m.teamId,
                role: m.role,
                joinedAt: m.joinedAt,
              })
          ),
          memberCount: team._count.members,
        })
    )
  }

  /**
   * Get team by ID
   */
  async findOne(teamId: string, userId: string): Promise<TeamResponseDto> {
    // Verify user has access to team
    await this.verifyTeamMembership(teamId, userId)

    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
            projects: true,
          },
        },
      },
    })

    if (!team) {
      throw new NotFoundException(`Team with ID ${teamId} not found`)
    }

    return new TeamResponseDto({
      ...team,
      description: team.description ?? undefined,
      members: team.members.map(
        (m) =>
          new TeamMemberResponseDto({
            id: m.id,
            userId: m.userId,
            userName: m.user.name,
            userEmail: m.user.email,
            userAvatar: m.user.avatar ?? undefined,
            teamId: m.teamId,
            role: m.role,
            joinedAt: m.joinedAt,
          })
      ),
      memberCount: team._count.members,
    })
  }

  /**
   * Update team
   * Only team admins can update
   */
  async update(
    teamId: string,
    updateTeamDto: UpdateTeamDto,
    userId: string
  ): Promise<TeamResponseDto> {
    // Verify user is team admin
    await this.verifyTeamAdmin(teamId, userId)

    const team = await this.prisma.team.update({
      where: { id: teamId },
      data: {
        name: updateTeamDto.name,
        description: updateTeamDto.description,
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
      },
    })

    return new TeamResponseDto({
      ...team,
      description: team.description ?? undefined,
      members: team.members.map(
        (m) =>
          new TeamMemberResponseDto({
            id: m.id,
            userId: m.userId,
            userName: m.user.name,
            userEmail: m.user.email,
            userAvatar: m.user.avatar ?? undefined,
            teamId: m.teamId,
            role: m.role,
            joinedAt: m.joinedAt,
          })
      ),
      memberCount: team.members.length,
    })
  }

  /**
   * Delete team
   * Only team admins can delete
   */
  async remove(teamId: string, userId: string): Promise<void> {
    // Verify user is team admin
    await this.verifyTeamAdmin(teamId, userId)

    await this.prisma.team.delete({
      where: { id: teamId },
    })
  }

  /**
   * Add member to team
   * Only team admins can add members
   */
  async addMember(
    teamId: string,
    addMemberDto: AddMemberDto,
    requesterId: string
  ): Promise<TeamMemberResponseDto> {
    // Verify requester is team admin
    await this.verifyTeamAdmin(teamId, requesterId)

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: addMemberDto.userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        isActive: true,
      },
    })

    if (!user) {
      throw new NotFoundException(
        `User with ID ${addMemberDto.userId} not found`
      )
    }

    if (!user.isActive) {
      throw new BadRequestException('Cannot add inactive user to team')
    }

    // Check if user is already a member
    const existingMember = await this.prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId: addMemberDto.userId,
          teamId,
        },
      },
    })

    if (existingMember) {
      throw new ConflictException('User is already a member of this team')
    }

    // Add member
    const member = await this.prisma.teamMember.create({
      data: {
        userId: addMemberDto.userId,
        teamId,
        role: addMemberDto.role || UserRole.MEMBER,
      },
    })

    return new TeamMemberResponseDto({
      id: member.id,
      userId: member.userId,
      userName: user.name,
      userEmail: user.email,
      userAvatar: user.avatar ?? undefined,
      teamId: member.teamId,
      role: member.role,
      joinedAt: member.joinedAt,
    })
  }

  /**
   * Remove member from team
   * Only team admins can remove members
   * Cannot remove the last admin
   */
  async removeMember(
    teamId: string,
    userIdToRemove: string,
    requesterId: string
  ): Promise<void> {
    // Verify requester is team admin
    await this.verifyTeamAdmin(teamId, requesterId)

    // Check if member exists
    const member = await this.prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId: userIdToRemove,
          teamId,
        },
      },
    })

    if (!member) {
      throw new NotFoundException('User is not a member of this team')
    }

    // If removing an admin, ensure there's at least one admin remaining
    if (member.role === UserRole.ADMIN) {
      const adminCount = await this.prisma.teamMember.count({
        where: {
          teamId,
          role: UserRole.ADMIN,
        },
      })

      if (adminCount <= 1) {
        throw new BadRequestException(
          'Cannot remove the last admin from the team'
        )
      }
    }

    await this.prisma.teamMember.delete({
      where: {
        userId_teamId: {
          userId: userIdToRemove,
          teamId,
        },
      },
    })
  }

  /**
   * Update member role
   * Only team admins can update roles
   * Cannot change role of last admin
   */
  async updateMemberRole(
    teamId: string,
    userIdToUpdate: string,
    updateRoleDto: UpdateMemberRoleDto,
    requesterId: string
  ): Promise<TeamMemberResponseDto> {
    // Verify requester is team admin
    await this.verifyTeamAdmin(teamId, requesterId)

    // Check if member exists
    const member = await this.prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId: userIdToUpdate,
          teamId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    })

    if (!member) {
      throw new NotFoundException('User is not a member of this team')
    }

    // If changing from admin to non-admin, ensure there's another admin
    if (
      member.role === UserRole.ADMIN &&
      updateRoleDto.role !== UserRole.ADMIN
    ) {
      const adminCount = await this.prisma.teamMember.count({
        where: {
          teamId,
          role: UserRole.ADMIN,
        },
      })

      if (adminCount <= 1) {
        throw new BadRequestException(
          'Cannot change role of the last admin. Assign another admin first.'
        )
      }
    }

    const updatedMember = await this.prisma.teamMember.update({
      where: {
        userId_teamId: {
          userId: userIdToUpdate,
          teamId,
        },
      },
      data: {
        role: updateRoleDto.role,
      },
    })

    return new TeamMemberResponseDto({
      id: updatedMember.id,
      userId: updatedMember.userId,
      userName: member.user.name,
      userEmail: member.user.email,
      userAvatar: member.user.avatar ?? undefined,
      teamId: updatedMember.teamId,
      role: updatedMember.role,
      joinedAt: updatedMember.joinedAt,
    })
  }

  /**
   * Verify user is a member of the team
   */
  private async verifyTeamMembership(
    teamId: string,
    userId: string
  ): Promise<void> {
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
   * Verify user is a team admin
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

    if (membership.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only team admins can perform this action')
    }
  }
}
