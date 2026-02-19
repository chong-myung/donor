export interface IBlockchainService {
    createTransaction(amount: string, orgWallet: string, platformWallet: string): Promise<{
        transactionHash: string;
        orgAmount: string;
        platformFee: string;
    }>;
}
