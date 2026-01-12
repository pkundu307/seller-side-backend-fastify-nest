import { LinkType } from '@prisma/client';
export declare class CreateHomepageItemDto {
    title?: string;
    subtitle?: string;
    linkType: LinkType;
    linkValue?: string;
    styleConfig?: string;
    position?: number;
}
