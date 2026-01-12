import { FastifyRequest } from 'fastify';
import { HomepageAdminService } from './homepage-admin.service';
import { CreateHomepageSectionDto } from './dto/create-homepage-section.dto';
import { UpdateHomepageSectionDto } from './dto/update-homepage-section.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { ReorderDto } from './dto/reorder.dto';
export declare class HomepageAdminController {
    private readonly homepageAdminService;
    constructor(homepageAdminService: HomepageAdminService);
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
    updateSection(id: number, dto: UpdateHomepageSectionDto): Promise<{
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
    updateSectionStatus(id: number, dto: UpdateStatusDto): Promise<{
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
    deleteSection(id: number): Promise<{
        success: boolean;
        message: string;
    }>;
    addItemToSection(sectionId: number, req: FastifyRequest): Promise<{
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
    updateItem(id: number, req: FastifyRequest): Promise<{
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
    updateItemStatus(id: number, dto: UpdateStatusDto): Promise<{
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
    deleteItem(id: number): Promise<{
        success: boolean;
        message: string;
    }>;
    private parseItemMultipart;
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
