import { BannersService } from './banner.service';
export declare class BannersController {
    private readonly bannersService;
    constructor(bannersService: BannersService);
    findAllActiveBanners(): Promise<{
        id: number;
        createdAt: Date;
        title: string;
        updatedAt: Date;
        position: number;
        isActive: boolean;
        discountText: string | null;
        targetUrl: string;
        bannerImageUrl: string;
        brandLogoUrl: string | null;
    }[]>;
}
