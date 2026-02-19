import { ProjectEntity } from '@/domain/entity/project.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';

export class CreateProjectDTO {
  @ApiProperty()
  orgId: number;

  @ApiProperty({ description: '프로젝트 국가', example: 'KR' })
  nation: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  thumbnailUrl?: string | null;

  @ApiPropertyOptional()
  shortDescription?: string | null;

  @ApiPropertyOptional()
  detailedDescription?: string | null;

  @ApiPropertyOptional()
  goalAmount?: string | null;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  startDate?: Date | null;
}

export class UpdateProjectDTO {
  @ApiPropertyOptional()
  title?: string;

  @ApiPropertyOptional()
  thumbnailUrl?: string | null;

  @ApiPropertyOptional()
  shortDescription?: string | null;

  @ApiPropertyOptional()
  detailedDescription?: string | null;

  @ApiPropertyOptional()
  goalAmount?: string | null;

  @ApiPropertyOptional()
  currentRaisedUsdc?: string;

  @ApiPropertyOptional()
  status?: string;

  @ApiPropertyOptional()
  startDate?: Date | null;
}

export class ProjectFilterDTO {
  @ApiPropertyOptional()
  page?: number;

  @ApiPropertyOptional()
  limit?: number;

  @ApiPropertyOptional()
  nation?: string;

  @ApiPropertyOptional()
  status?: string;

  @ApiPropertyOptional()
  minGoalAmount?: string;

  @ApiPropertyOptional()
  maxGoalAmount?: string;
}

// 프로젝트 목록
export const toProjectList = (projectList: ProjectEntity[]) => {
  return projectList.map((project) => {
    return {
      projectId: project.projectId,
      title: project.title,
      nation: project.nation,
      thumbnailUrl: project.thumbnailUrl,
      shortDescription: project.shortDescription,
      goalAmount: project.goalAmount,
      currentRaisedUsdc: project.currentRaisedUsdc,
      status: project.status,
      startDate: project.startDate,
    };
  });
};

// 프로젝트 상세조회
export const toProjectDetail = (project: ProjectEntity) => {
  return {
    projectId: project.projectId,
    orgId: project.orgId,
    beneficiaryId: project.beneficiaryId,
    title: project.title,
    thumbnailUrl: project.thumbnailUrl,
    shortDescription: project.shortDescription,
    detailedDescription: project.detailedDescription,
    goalAmount: project.goalAmount,
    currentRaisedUsdc: project.currentRaisedUsdc,
    status: project.status,
    startDate: project.startDate,
    organization: project.organization?.toJSON(),
    beneficiary: project.beneficiary?.toJSON(),
  };
};


