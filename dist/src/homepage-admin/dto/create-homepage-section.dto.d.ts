import { SectionType } from '@prisma/client';
export declare class CreateHomepageSectionDto {
    title: string;
    type: SectionType;
    subtitle?: string;
    styleConfig?: string;
}
