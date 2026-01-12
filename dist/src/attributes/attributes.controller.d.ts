import { AttributesService } from './attributes.service';
export declare class AttributesController {
    private readonly attributesService;
    constructor(attributesService: AttributesService);
    getOptionsForAttribute(attributeId: number): Promise<({
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
