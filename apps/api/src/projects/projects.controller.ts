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
@Controller('teams/:teamId/projects')
@UseGuards(SimpleJwtAuthGuard)
@ApiBearerAuth()
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Create a new project in a team' })
  @ApiResponse({ status: 201, description: 'Project created successfully', type: ProjectResponseDto })
  @ApiResponse({ status: 403, description: 'User is not a member of the team' })
  async create(
    @Param('teamId') teamId: string,
    @Body() createProjectDto: CreateProjectDto,
    @CurrentUser() user: any,
  ): Promise<ProjectResponseDto> {
    return this.projectsService.create(teamId, createProjectDto, user.id)
  }

  @Get()
  @ApiOperation({ summary: 'Get all projects for a team' })
  @ApiResponse({ status: 200, description: 'Projects retrieved successfully', type: [ProjectResponseDto] })
  @ApiResponse({ status: 403, description: 'User is not a member of the team' })
  async findAll(@Param('teamId') teamId: string, @CurrentUser() user: any): Promise<ProjectResponseDto[]> {
    return this.projectsService.findAllForTeam(teamId, user.id)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific project by ID' })
  @ApiResponse({ status: 200, description: 'Project retrieved successfully', type: ProjectResponseDto })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 403, description: 'User is not a member of the team' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any): Promise<ProjectResponseDto> {
    return this.projectsService.findOne(id, user.id)
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get detailed statistics for a project' })
  @ApiResponse({ status: 200, description: 'Project statistics retrieved successfully', type: ProjectStatsResponseDto })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 403, description: 'User is not a member of the team' })
  async getStats(@Param('id') id: string, @CurrentUser() user: any): Promise<ProjectStatsResponseDto> {
    return this.projectsService.getStats(id, user.id)
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
    return this.projectsService.update(id, updateProjectDto, user.id)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Delete a project (admin only)' })
  @ApiResponse({ status: 204, description: 'Project deleted successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 403, description: 'User is not a team admin' })
  async remove(@Param('id') id: string, @CurrentUser() user: any): Promise<void> {
    return this.projectsService.remove(id, user.id)
  }
}
