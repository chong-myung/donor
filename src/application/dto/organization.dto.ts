export interface CreateOrganizationDTO {
    name: string;
    registrationNumber?: string | null;
    walletAddress: string;
    contactInfo?: string | null;
  }
  
  export interface UpdateOrganizationDTO {
    name?: string;
    registrationNumber?: string | null;
    walletAddress?: string;
    contactInfo?: string | null;
  }
  