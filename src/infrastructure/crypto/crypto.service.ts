import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class CryptoService {
    private readonly algorithm = 'aes-256-cbc';
    private readonly key: Buffer;
    private readonly ivLength = 16;

    constructor(private configService: ConfigService) {
        // ENCRYPTION_KEY must be 32 chars (256-bit)
        const keyString = this.configService.get<string>('ENCRYPTION_KEY') || '12345678901234567890123456789012';
        this.key = Buffer.from(keyString);
    }

    encrypt(text: string): string {
        const iv = crypto.randomBytes(this.ivLength);
        const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return `${iv.toString('hex')}:${encrypted}`;
    }

    decrypt(text: string): string {
        const [ivHex, encryptedHex] = text.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
}
