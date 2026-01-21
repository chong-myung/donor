import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { ProjectService } from '../../application/service/project.service';
import { CreateProjectDTO, UpdateProjectDTO, ProjectFilterDTO } from '../../application/dto/project.dto';
import { ApiBearerAuth, ApiBody, ApiExcludeController } from '@nestjs/swagger';

@ApiExcludeController()
@Controller('projects')
export class ProjectController {
    constructor(private readonly projectService: ProjectService) { }

    @Get()
    @ApiBearerAuth()
    async getProjectList(@Query() filter: ProjectFilterDTO, @Res() res: Response) {
        const projectList = await this.projectService.getAllProjects(filter);
        res.status(HttpStatus.OK).json({
            success: true,
            data: projectList,
        });
    }

    @Get(':id')
    @ApiBearerAuth()
    async getProjectById(@Param('id') id: string, @Res() res: Response) {
        const project = await this.projectService.getProjectById(Number(id));
        res.status(HttpStatus.OK).json({
            success: true,
            data: project,
        });
    }

    @Post()
    @ApiBearerAuth()
    @ApiBody({ type: [CreateProjectDTO] })
    async createProject(@Body() data: CreateProjectDTO, @Res() res: Response) {
        const newProject = await this.projectService.createProject(data);
        res.status(HttpStatus.CREATED).json({
            success: true,
            data: newProject,
        });
    }
}
