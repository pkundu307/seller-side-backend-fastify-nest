import { PrismaService } from '../prisma/prisma.service';
export declare class AttributesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getAttributesForCategory(categoryId: number): Promise<({
        options: {
            id: number;
            value: string;
            slug: string;
            position: number;
            attributeId: number;
        }[];
    } & {
        id: number;
        name: string;
        categoryId: number;
        position: number;
    })[]>;
}
