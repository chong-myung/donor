export interface CreateProjectMediaDTO {
    projectId: number;
    mediaUrl: string;
    mediaType: string;
    contentType: string;
    description?: string | null;
  }
  
  export interface UpdateProjectMediaDTO {
    mediaUrl?: string;
    mediaType?: string;
    contentType?: string;
    description?: string | null;
  }