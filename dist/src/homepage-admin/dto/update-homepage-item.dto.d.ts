import { LinkType } from '@prisma/client';
export declare class UpdateHomepageItemDto {
    title?: string;
    subtitle?: string;
    linkType?: LinkType;
    linkValue?: string;
    styleConfig?: string;
}
