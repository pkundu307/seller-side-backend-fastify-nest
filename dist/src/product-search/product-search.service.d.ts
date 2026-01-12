import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { SearchProductsDto } from './dto/search-products.dto';
export declare class ProductSearchService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    searchProducts(dto: SearchProductsDto): Promise<{
        id: string;
        category: {
            name: string;
        };
        title: string;
        slug: string;
        images: string[];
        variants: {
            id: string;
            images: string[];
            price: Prisma.Decimal;
            mrp: Prisma.Decimal | null;
        }[];
    }[]>;
}
