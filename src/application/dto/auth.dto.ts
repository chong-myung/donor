import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDTO {
    @ApiProperty({
        description: 'Refresh token. If not provided, it will be read from the HttpOnly cookie.',
        required: false,
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    })
    refresh_token?: string;
}

export class AuthResponseDTO {
    @ApiProperty({
        description: 'New Access Token (Encrypted)',
        example: 'U2FsdGVkX19...',
    })
    access_token: string;

    @ApiProperty({
        description: 'New Refresh Token (Encrypted)',
        example: 'U2FsdGVkX19...',
    })
    refresh_token: string;
}
