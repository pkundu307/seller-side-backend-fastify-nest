import { PrismaService } from '../prisma/prisma.service';
export declare class BannersService {
    private prisma;
    constructor(prisma: PrismaService);
    findAllActive(): Promise<{
        id: number;
        createdAt: Date;
        title: string;
        updatedAt: Date;
        position: number;
        isActive: boolean;
        discountText: string | null;
        targetUrl: string;
        bannerImageUrl: string;
        brandLogoUrl: string | null;
    }[]>;
}
