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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { ProjectsService } from './services/projects.service'
import { CreateProjectDto } from './dto/create-project.dto'
import { UpdateProjectDto } from './dto/update-project.dto'
import { ProjectResponseDto } from './dto/project-response.dto'
import { ProjectStatsResponseDto } from './dto/project-stats-response.dto'
import { SimpleJwtAuthGuard } from '../auth/guards/simple-jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'

@ApiTags('projects')
@Controller('projects')
@UseGuards(SimpleJwtAuthGuard)
@ApiBearerAuth()
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Create a new project with associated teams' })
  @ApiResponse({ status: 201, description: 'Project created successfully', type: ProjectResponseDto })
  @ApiResponse({ status: 403, description: 'User is not a member of one or more teams' })
  async create(
    @Body() createProjectDto: CreateProjectDto,
    @CurrentUser() user: any,
  ): Promise<ProjectResponseDto> {
    return this.projectsService.create(createProjectDto, user.sub)
  }

  @Get()
  @ApiOperation({ summary: 'Get all projects for the current user' })
  @ApiResponse({ status: 200, description: 'Projects retrieved successfully', type: [ProjectResponseDto] })
  async findAll(@CurrentUser() user: any): Promise<ProjectResponseDto[]> {
    return this.projectsService.findAllForUser(user.sub)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific project by ID' })
  @ApiResponse({ status: 200, description: 'Project retrieved successfully', type: ProjectResponseDto })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 403, description: 'User is not a member of the team' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any): Promise<ProjectResponseDto> {
    return this.projectsService.findOne(id, user.sub)
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get detailed statistics for a project' })
  @ApiResponse({ status: 200, description: 'Project statistics retrieved successfully', type: ProjectStatsResponseDto })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 403, description: 'User is not a member of the team' })
  async getStats(@Param('id') id: string, @CurrentUser() user: any): Promise<ProjectStatsResponseDto> {
    return this.projectsService.getStats(id, user.sub)
  }

  @Patch(':id')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Update a project (admin only)' })
  @ApiResponse({ status: 200, description: 'Project updated successfully', type: ProjectResponseDto })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 403, description: 'User is not a team admin' })
  async update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @CurrentUser() user: any,
  ): Promise<ProjectResponseDto> {
    return this.projectsService.update(id, updateProjectDto, user.sub)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Delete a project (admin only)' })
  @ApiResponse({ status: 204, description: 'Project deleted successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 403, description: 'User is not a project admin' })
  async remove(@Param('id') id: string, @CurrentUser() user: any): Promise<void> {
    return this.projectsService.remove(id, user.sub)
  }

  @Post(':id/teams')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Add a team to a project' })
  @ApiResponse({ status: 200, description: 'Team added to project successfully' })
  @ApiResponse({ status: 404, description: 'Project or team not found' })
  @ApiResponse({ status: 403, description: 'User is not authorized' })
  async addTeam(
    @Param('id') projectId: string,
    @Body('teamId') teamId: string,
    @CurrentUser() user: any,
  ): Promise<void> {
    return this.projectsService.addTeam(projectId, teamId, user.sub)
  }

  @Delete(':id/teams/:teamId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Remove a team from a project' })
  @ApiResponse({ status: 204, description: 'Team removed from project successfully' })
  @ApiResponse({ status: 404, description: 'Project or team not found' })
  @ApiResponse({ status: 403, description: 'User is not authorized' })
  async removeTeam(
    @Param('id') projectId: string,
    @Param('teamId') teamId: string,
    @CurrentUser() user: any,
  ): Promise<void> {
    return this.projectsService.removeTeam(projectId, teamId, user.sub)
  }

  @Get(':id/teams')
  @ApiOperation({ summary: 'Get all teams associated with a project' })
  @ApiResponse({ status: 200, description: 'Teams retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 403, description: 'User does not have access to this project' })
  async getTeams(@Param('id') projectId: string, @CurrentUser() user: any) {
    return this.projectsService.getTeams(projectId, user.sub)
  }
}
