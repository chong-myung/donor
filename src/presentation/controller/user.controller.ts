import { Controller, Post, Body, Res, HttpStatus, Get, Req } from '@nestjs/common';
import { Response } from 'express';
import { UserService } from '../../application/service/user.service';
import { CreateUserDTO, UserResponseDTO } from '../../application/dto/user.dto';
import { CommonResponseDTO } from '../../application/dto/common.dto';
import { ApiBearerAuth, ApiOperation, ApiOkResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';

@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) { }

    @Post('register')
    @ApiOperation({ summary: '이용자 Email 가입' })
    async register(@Body() createUserDto: CreateUserDTO, @Res() res: Response): Promise<void> {
        const newUser = await this.userService.register(createUserDto);
        res.status(HttpStatus.CREATED).json({
            success: true,
            data: newUser.toPublicJSON(),
        });
    }

    @Post('login')
    @ApiOperation({ summary: '이용자 Email 로그인' })
    async login(@Body() body: any, @Res() res: Response): Promise<void> {
        const { email, password } = body;
        const result = await this.userService.login(email, password);
        res.status(HttpStatus.OK).json({
            success: true,
            data: {
                accessToken: result.accessToken,
                user: result.user.toPublicJSON(),
            },
        });
    }

    @Get('info')
    @ApiBearerAuth()
    @ApiOperation({ summary: '이용자 정보 조회' })
    @ApiOkResponse({
        description: 'Successfully retrieved user information',
        type: CommonResponseDTO<UserResponseDTO>,
    })
    @ApiUnauthorizedResponse({
        description: 'Unauthorized',
        content: {
            'application/json': {
                example: {
                    success: false,
                    statusCode: 401,
                    timestamp: '2024-01-22T08:24:26.735Z',
                    path: '/api/users/info',
                    message: 'Unauthorized',
                    error: 'Unauthorized',
                },
            },
        },
    })
    async info(@Req() req, @Res() res): Promise<void> {
        const user = await this.userService.info(req.user.userId);
        res.status(HttpStatus.OK).json({
            success: true,
            data: user,
        });
    }

}
