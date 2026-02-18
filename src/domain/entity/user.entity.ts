export class UserEntity {
    constructor(
      public readonly userId: number,
      public readonly email: string,
      public readonly passwordHash: string | null,
      public readonly loginPlatform: string,
      public readonly walletAddress: string | null,
      public readonly isActive: boolean,
      public readonly role: string,
      public readonly createdAt: Date
    ) {}

    static create(data: {
      userId: number;
      email: string;
      passwordHash?: string | null;
      loginPlatform: string;
      walletAddress?: string | null;
      isActive?: boolean;
      role?: string;
      createdAt?: Date;
    }): UserEntity {
      return new UserEntity(
        data.userId,
        data.email,
        data.passwordHash ?? null,
        data.loginPlatform,
        data.walletAddress ?? null,
        data.isActive ?? true,
        data.role ?? 'DONOR',
        data.createdAt ?? new Date()
      );
    }

    toJSON() {
      return {
        userId: this.userId,
        email: this.email,
        loginPlatform: this.loginPlatform,
        walletAddress: this.walletAddress,
        isActive: this.isActive,
        role: this.role,
        createdAt: this.createdAt,
      };
    }

    // 비밀번호 해시는 보안상 제외
    toPublicJSON() {
      return {
        userId: this.userId,
        email: this.email,
        loginPlatform: this.loginPlatform,
        isActive: this.isActive,
        role: this.role,
        createdAt: this.createdAt,
      };
    }
  }
