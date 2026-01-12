import { FastifyReply } from 'fastify';
import { SeoService } from './seo.service';
export declare class SeoController {
    private readonly seoService;
    constructor(seoService: SeoService);
    getSitemap(reply: FastifyReply): Promise<void>;
    getRobotsTxt(reply: FastifyReply): Promise<void>;
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
