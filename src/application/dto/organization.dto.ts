export interface CreateOrganizationDTO {
    name: string;
    registrationNumber?: string | null;
    walletAddress: string;
    contactInfo?: string | null;
    userId?: number | null;
    planType?: string;
    status?: string;
  }

  export interface UpdateOrganizationDTO {
    name?: string;
    registrationNumber?: string | null;
    walletAddress?: string;
    contactInfo?: string | null;
    userId?: number | null;
    planType?: string;
    status?: string;
  }
