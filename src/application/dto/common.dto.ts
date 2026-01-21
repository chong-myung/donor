import { ApiProperty } from "@nestjs/swagger";

export class CommonResponseDTO<T> {
    @ApiProperty({ example: true })
    success: boolean;

    @ApiProperty({ required: false })
    data?: T;

    @ApiProperty({ required: false })
    error?: string | object;

    @ApiProperty({ required: false })
    message?: string;

    @ApiProperty({ required: false })
    statusCode?: number;

    @ApiProperty({ required: false })
    path?: string;

    @ApiProperty()
    timestamp: string = new Date().toISOString();
}