import { OrganizationEntity } from "./organization.entity";
import { BeneficiaryEntity } from "./beneficiary.entity";

export class ProjectEntity {
  constructor(
    public readonly projectId: number,
    public readonly orgId: number | null,
    public readonly beneficiaryId: number | null,
    public readonly nation: string,
    public readonly title: string,
    public readonly thumbnailUrl: string | null,
    public readonly shortDescription: string | null,
    public readonly detailedDescription: string | null,
    public readonly goalAmount: string | null,
    public readonly currentRaisedUsdc: string,
    public readonly status: string,
    public readonly startDate: Date | null,
    public readonly organization?: OrganizationEntity,
    public readonly beneficiary?: BeneficiaryEntity
  ) { }

  static create(data: {
    projectId: number;
    orgId?: number | null;
    beneficiaryId?: number | null;
    nation: string;
    title: string;
    thumbnailUrl?: string | null;
    shortDescription?: string | null;
    detailedDescription?: string | null;
    goalAmount?: string | null;
    currentRaisedUsdc?: string;
    status: string;
    startDate?: Date | null;
    organization?: OrganizationEntity;
    beneficiary?: BeneficiaryEntity;
  }): ProjectEntity {
    return new ProjectEntity(
      data.projectId,
      data.orgId ?? null,
      data.beneficiaryId ?? null,
      data.nation,
      data.title,
      data.thumbnailUrl ?? null,
      data.shortDescription ?? null,
      data.detailedDescription ?? null,
      data.goalAmount ?? null,
      data.currentRaisedUsdc ?? '0.00',
      data.status,
      data.startDate ?? null,
      data.organization,
      data.beneficiary
    );
  }

  toJSON(): any {
    return {
      projectId: this.projectId,
      orgId: this.orgId,
      beneficiaryId: this.beneficiaryId,
      title: this.title,
      thumbnailUrl: this.thumbnailUrl,
      shortDescription: this.shortDescription,
      detailedDescription: this.detailedDescription,
      goalAmount: this.goalAmount,
      currentRaisedUsdc: this.currentRaisedUsdc,
      status: this.status,
      startDate: this.startDate,
      organization: this.organization?.toJSON(),
      beneficiary: this.beneficiary?.toJSON(),
    };
  }

  // 목표 달성 퍼센트 계산
  getFundingPercentage(): number | null {
    if (!this.goalAmount) return null;
    const goal = parseFloat(this.goalAmount);
    const raised = parseFloat(this.currentRaisedUsdc);
    if (goal === 0) return 0;
    return Math.min((raised / goal) * 100, 100);
  }

  // 목표 달성 여부
  isGoalReached(): boolean {
    if (!this.goalAmount) return false;
    const goal = parseFloat(this.goalAmount);
    const raised = parseFloat(this.currentRaisedUsdc);
    return raised >= goal;
  }
}
