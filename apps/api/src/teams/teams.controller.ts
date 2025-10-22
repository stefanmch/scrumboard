import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { TeamsService } from './services/teams.service'
import { SimpleJwtAuthGuard } from '../auth/guards/simple-jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import type { JwtPayload } from '../auth/services/simple-jwt.service'
import {
  CreateTeamDto,
  UpdateTeamDto,
  TeamResponseDto,
  AddMemberDto,
  UpdateMemberRoleDto,
  TeamMemberResponseDto,
} from './dto'

@ApiTags('teams')
@Controller('teams')
@UseGuards(SimpleJwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Create a new team' })
  @ApiResponse({
    status: 201,
    description: 'Team created successfully',
    type: TeamResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @Body() createTeamDto: CreateTeamDto,
    @CurrentUser() user: JwtPayload
  ): Promise<TeamResponseDto> {
    return this.teamsService.create(createTeamDto, user.sub)
  }

  @Get()
  @ApiOperation({ summary: "Get all teams for current user" })
  @ApiResponse({
    status: 200,
    description: 'Teams retrieved successfully',
    type: [TeamResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@CurrentUser() user: JwtPayload): Promise<TeamResponseDto[]> {
    return this.teamsService.findAllForUser(user.sub)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get team by ID' })
  @ApiResponse({
    status: 200,
    description: 'Team retrieved successfully',
    type: TeamResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not a team member' })
  @ApiResponse({ status: 404, description: 'Team not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ): Promise<TeamResponseDto> {
    return this.teamsService.findOne(id, user.sub)
  }

  @Patch(':id')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Update team' })
  @ApiResponse({
    status: 200,
    description: 'Team updated successfully',
    type: TeamResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not a team admin' })
  @ApiResponse({ status: 404, description: 'Team not found' })
  async update(
    @Param('id') id: string,
    @Body() updateTeamDto: UpdateTeamDto,
    @CurrentUser() user: JwtPayload
  ): Promise<TeamResponseDto> {
    return this.teamsService.update(id, updateTeamDto, user.sub)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete team' })
  @ApiResponse({ status: 204, description: 'Team deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not a team admin' })
  @ApiResponse({ status: 404, description: 'Team not found' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ): Promise<void> {
    return this.teamsService.remove(id, user.sub)
  }

  @Post(':id/members')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Add member to team' })
  @ApiResponse({
    status: 201,
    description: 'Member added successfully',
    type: TeamMemberResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not a team admin' })
  @ApiResponse({ status: 404, description: 'Team or user not found' })
  @ApiResponse({ status: 409, description: 'User already a member' })
  async addMember(
    @Param('id') id: string,
    @Body() addMemberDto: AddMemberDto,
    @CurrentUser() user: JwtPayload
  ): Promise<TeamMemberResponseDto> {
    return this.teamsService.addMember(id, addMemberDto, user.sub)
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove member from team' })
  @ApiResponse({ status: 204, description: 'Member removed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not a team admin' })
  @ApiResponse({ status: 404, description: 'Team or member not found' })
  @ApiResponse({ status: 400, description: 'Cannot remove last admin' })
  async removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<void> {
    return this.teamsService.removeMember(id, userId, user.sub)
  }

  @Patch(':id/members/:userId/role')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Update member role' })
  @ApiResponse({
    status: 200,
    description: 'Member role updated successfully',
    type: TeamMemberResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data or cannot change last admin' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not a team admin' })
  @ApiResponse({ status: 404, description: 'Team or member not found' })
  async updateMemberRole(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() updateRoleDto: UpdateMemberRoleDto,
    @CurrentUser() user: JwtPayload
  ): Promise<TeamMemberResponseDto> {
    return this.teamsService.updateMemberRole(id, userId, updateRoleDto, user.sub)
  }
}
