export class ProjectMediaEntity {
    constructor(
      public readonly mediaId: number,
      public readonly projectId: number,
      public readonly mediaUrl: string,
      public readonly mediaType: string,
      public readonly contentType: string,
      public readonly description: string | null,
      public readonly uploadedAt: Date
    ) {}
  
    static create(data: {
      mediaId: number;
      projectId: number;
      mediaUrl: string;
      mediaType: string;
      contentType: string;
      description?: string | null;
      uploadedAt?: Date;
    }): ProjectMediaEntity {
      return new ProjectMediaEntity(
        data.mediaId,
        data.projectId,
        data.mediaUrl,
        data.mediaType,
        data.contentType,
        data.description ?? null,
        data.uploadedAt ?? new Date()
      );
    }
  
    toJSON() {
      return {
        mediaId: this.mediaId,
        projectId: this.projectId,
        mediaUrl: this.mediaUrl,
        mediaType: this.mediaType,
        contentType: this.contentType,
        description: this.description,
        uploadedAt: this.uploadedAt,
      };
    }
  
    isPreDonation(): boolean {
      return this.contentType === 'Pre-donation';
    }
  
    isPostImpact(): boolean {
      return this.contentType === 'Post-impact';
    }
  }