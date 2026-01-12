declare class OptionInputDto {
    value: string;
}
declare class AttributeInputDto {
    name: string;
    options: OptionInputDto[];
}
export declare class AddAttributesBatchDto {
    categoryId: number;
    attributes: AttributeInputDto[];
}
export {};
