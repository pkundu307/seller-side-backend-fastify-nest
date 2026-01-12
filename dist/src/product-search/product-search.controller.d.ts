import { ProductSearchService } from './product-search.service';
import { SearchProductsDto } from './dto/search-products.dto';
export declare class ProductSearchController {
    private readonly productSearchService;
    constructor(productSearchService: ProductSearchService);
    searchProducts(searchDto: SearchProductsDto): Promise<{
        id: string;
        category: {
            name: string;
        };
        title: string;
        slug: string;
        images: string[];
        variants: {
            id: string;
            images: string[];
            price: import("@prisma/client/runtime/library").Decimal;
            mrp: import("@prisma/client/runtime/library").Decimal | null;
        }[];
    }[]>;
}
