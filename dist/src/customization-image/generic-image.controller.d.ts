import { ValidationPipe } from '@nestjs/common';
import { GenericImageService } from './generic-image.service';
import { FastifyRequest } from 'fastify';
export declare class GenericImageController {
    private readonly genericImageService;
    private readonly validationPipe;
    constructor(genericImageService: GenericImageService, validationPipe: ValidationPipe);
    addImages(req: FastifyRequest): Promise<{
        success: boolean;
        message: string;
        count: number;
    }>;
    deleteImage(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
    private parseMultipartRequest;
}
