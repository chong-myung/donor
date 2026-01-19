export interface CreateFavoriteProjectDTO {
    userId: number;
    projectId: number;
  }
  
  export interface FavoriteProjectFilterDTO {
    userId?: number;
    projectId?: number;
  }