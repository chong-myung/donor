export class CommonCodeEntity {
    constructor(
        public readonly groupCode: string,
        public readonly codeId: string,
        public readonly codeName: string,
        public readonly codeNameKo: string | null,
        public readonly sortOrder: number,
        public readonly useYn: string,
        public readonly createdAt: Date
    ) { }

    static create(data: {
        groupCode: string;
        codeId: string;
        codeName: string;
        codeNameKo?: string | null;
        sortOrder?: number;
        useYn?: string;
        createdAt?: Date;
    }): CommonCodeEntity {
        return new CommonCodeEntity(
            data.groupCode,
            data.codeId,
            data.codeName,
            data.codeNameKo ?? null,
            data.sortOrder ?? 0,
            data.useYn ?? 'Y',
            data.createdAt ?? new Date()
        );
    }
}
