export class GroupCodeEntity {
    constructor(
        public readonly groupCode: string,
        public readonly groupName: string,
        public readonly useYn: string,
        public readonly description: string | null,
        public readonly createdAt: Date
    ) { }

    static create(data: {
        groupCode: string;
        groupName: string;
        useYn?: string;
        description?: string | null;
        createdAt?: Date;
    }): GroupCodeEntity {
        return new GroupCodeEntity(
            data.groupCode,
            data.groupName,
            data.useYn ?? 'Y',
            data.description ?? null,
            data.createdAt ?? new Date()
        );
    }
}
