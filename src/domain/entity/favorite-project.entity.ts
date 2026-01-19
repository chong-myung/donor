import { ProjectEntity } from "./project.entity";

export class FavoriteProjectEntity {
    constructor(
      public readonly userId: number,
      public readonly projectId: number,
      public readonly favoritedAt: Date,
      public readonly project?: ProjectEntity
    ) {}
  
    static create(data: {
      userId: number;
      projectId: number;
      favoritedAt?: Date;
      project?: ProjectEntity;
    }): FavoriteProjectEntity {
      return new FavoriteProjectEntity(
        data.userId,
        data.projectId,
        data.favoritedAt ?? new Date(),
        data.project
      );
    }
  
    toJSON() {
      return {
        userId: this.userId,
        projectId: this.projectId,
        favoritedAt: this.favoritedAt,
        project: this.project?.toJSON(),
      };
    }
  }