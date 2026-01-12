import { SectionType } from '@prisma/client';
import { CreateHomepageItemDto } from './create-homepage-item.dto';
export declare class CreateHomepageSectionDto {
    title: string;
    type: SectionType;
    styleConfig?: string;
    items: CreateHomepageItemDto[];
}
