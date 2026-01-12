import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
export declare class SeoService {
    private prisma;
    private configService;
    constructor(prisma: PrismaService, configService: ConfigService);
    private getBaseUrl;
    generateSitemap(): Promise<string>;
    generateRobotsTxt(): Promise<string>;
    getPageMeta(type: 'product' | 'category' | 'home' | 'other', slug?: string): Promise<{
        title: string;
        description: string;
        keywords: string;
        ogTitle: string;
        ogDescription: string;
        ogImage: string;
        ogUrl: string;
        canonical: string;
    }>;
}
