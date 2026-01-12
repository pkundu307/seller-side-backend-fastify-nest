import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../products/utils/s3Service';
import { CreateHomepageSectionDto } from './dto/create-homepage-section.dto';
import { UpdateHomepageSectionDto } from './dto/update-homepage-section.dto';
import { UpdateHomepageItemDto } from './dto/update-homepage-item.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { ReorderDto } from './dto/reorder.dto';
import { HomepageService } from 'src/homepage/homepage.service';
interface UploadedFile {
    buffer: Buffer;
    filename: string;
    mimetype: string;
}
export declare class HomepageAdminService {
    private prisma;
    private s3Service;
    private homepageService;
    constructor(prisma: PrismaService, s3Service: S3Service, homepageService: HomepageService);
    findAllSections(): Promise<({
        items: {
            id: number;
            title: string | null;
            imageUrl: string | null;
            position: number;
            isActive: boolean;
            subtitle: string | null;
            linkType: import(".prisma/client").$Enums.LinkType;
            linkValue: string | null;
            styleConfig: import("@prisma/client/runtime/library").JsonValue | null;
            sectionId: number;
            videoUrl: string | null;
        }[];
    } & {
        id: number;
        type: import(".prisma/client").$Enums.SectionType;
        title: string | null;
        position: number;
        isActive: boolean;
        subtitle: string | null;
        styleConfig: import("@prisma/client/runtime/library").JsonValue | null;
        endDate: Date | null;
        startDate: Date | null;
    })[]>;
    createSection(dto: CreateHomepageSectionDto): Promise<{
        id: number;
        type: import(".prisma/client").$Enums.SectionType;
        title: string | null;
        position: number;
        isActive: boolean;
        subtitle: string | null;
        styleConfig: import("@prisma/client/runtime/library").JsonValue | null;
        endDate: Date | null;
        startDate: Date | null;
    }>;
    addItemToSection(sectionId: number, dto: UpdateHomepageItemDto, file?: UploadedFile): Promise<{
        id: number;
        title: string | null;
        imageUrl: string | null;
        position: number;
        isActive: boolean;
        subtitle: string | null;
        linkType: import(".prisma/client").$Enums.LinkType;
        linkValue: string | null;
        styleConfig: import("@prisma/client/runtime/library").JsonValue | null;
        sectionId: number;
        videoUrl: string | null;
    }>;
    updateSection(sectionId: number, dto: UpdateHomepageSectionDto): Promise<{
        id: number;
        type: import(".prisma/client").$Enums.SectionType;
        title: string | null;
        position: number;
        isActive: boolean;
        subtitle: string | null;
        styleConfig: import("@prisma/client/runtime/library").JsonValue | null;
        endDate: Date | null;
        startDate: Date | null;
    }>;
    updateItem(itemId: number, dto: UpdateHomepageItemDto, file?: UploadedFile): Promise<{
        id: number;
        title: string | null;
        imageUrl: string | null;
        position: number;
        isActive: boolean;
        subtitle: string | null;
        linkType: import(".prisma/client").$Enums.LinkType;
        linkValue: string | null;
        styleConfig: import("@prisma/client/runtime/library").JsonValue | null;
        sectionId: number;
        videoUrl: string | null;
    }>;
    deleteItem(itemId: number): Promise<{
        success: boolean;
        message: string;
    }>;
    deleteSection(sectionId: number): Promise<{
        success: boolean;
        message: string;
    }>;
    updateItemStatus(itemId: number, dto: UpdateStatusDto): Promise<{
        id: number;
        title: string | null;
        imageUrl: string | null;
        position: number;
        isActive: boolean;
        subtitle: string | null;
        linkType: import(".prisma/client").$Enums.LinkType;
        linkValue: string | null;
        styleConfig: import("@prisma/client/runtime/library").JsonValue | null;
        sectionId: number;
        videoUrl: string | null;
    }>;
    updateSectionStatus(sectionId: number, dto: UpdateStatusDto): Promise<{
        id: number;
        type: import(".prisma/client").$Enums.SectionType;
        title: string | null;
        position: number;
        isActive: boolean;
        subtitle: string | null;
        styleConfig: import("@prisma/client/runtime/library").JsonValue | null;
        endDate: Date | null;
        startDate: Date | null;
    }>;
    reorderSections(dto: ReorderDto): Promise<{
        id: number;
        type: import(".prisma/client").$Enums.SectionType;
        title: string | null;
        position: number;
        isActive: boolean;
        subtitle: string | null;
        styleConfig: import("@prisma/client/runtime/library").JsonValue | null;
        endDate: Date | null;
        startDate: Date | null;
    }[]>;
    reorderItems(dto: ReorderDto): Promise<{
        id: number;
        title: string | null;
        imageUrl: string | null;
        position: number;
        isActive: boolean;
        subtitle: string | null;
        linkType: import(".prisma/client").$Enums.LinkType;
        linkValue: string | null;
        styleConfig: import("@prisma/client/runtime/library").JsonValue | null;
        sectionId: number;
        videoUrl: string | null;
    }[]>;
}
export {};
