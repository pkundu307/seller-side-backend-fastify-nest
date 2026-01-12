import { HomepageService } from './homepage.service';
export declare class HomepageController {
    private readonly homepageService;
    constructor(homepageService: HomepageService);
    getHomepageLayout(): Promise<{
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
}
