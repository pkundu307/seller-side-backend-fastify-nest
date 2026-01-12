import { OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
type HomepageLayout = Awaited<ReturnType<HomepageService['buildHomepageLayout']>>;
export declare class HomepageService implements OnModuleInit {
    private prisma;
    private readonly cache;
    private readonly CACHE_KEY;
    constructor(prisma: PrismaService);
    onModuleInit(): Promise<void>;
    getHomepage(): Promise<HomepageLayout>;
    buildHomepageLayout(): Promise<{
        id: number;
        type: import(".prisma/client").$Enums.SectionType;
        items: {
            id: number;
            title: string | null;
            imageUrl: string | null;
            subtitle: string | null;
            linkType: import(".prisma/client").$Enums.LinkType;
            linkValue: string | null;
            styleConfig: import("@prisma/client/runtime/library").JsonValue;
            videoUrl: string | null;
        }[];
        title: string | null;
        subtitle: string | null;
        styleConfig: import("@prisma/client/runtime/library").JsonValue;
    }[]>;
    invalidateCache(): void;
}
export {};
