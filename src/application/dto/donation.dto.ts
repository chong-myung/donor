export interface CreateDonationDTO {
    userId?: number | null;
    projectId: number;
    fiatAmount?: string | null;
    fiatCurrency?: string | null;
    coinAmount: string;
    coinType: string;
    conversionRate?: string | null;
    transactionHash: string;
    isAnonymous?: boolean;
    status: string;
  }
  
  export interface UpdateDonationDTO {
    status?: string;
    fiatAmount?: string | null;
    fiatCurrency?: string | null;
    coinAmount?: string;
    conversionRate?: string | null;
  }
  
  export interface DonationFilterDTO {
    userId?: number;
    projectId?: number;
    coinType?: string;
    status?: string;
    isAnonymous?: boolean;
    startDate?: Date;
    endDate?: Date;
  }