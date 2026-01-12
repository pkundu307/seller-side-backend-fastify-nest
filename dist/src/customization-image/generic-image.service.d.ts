import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../products/utils/s3Service';
import { AddGenericImagesDto } from './dto/create-generic-image.dto';
export interface UploadedFile {
    buffer: Buffer;
    filename: string;
    mimetype: string;
}
export declare class GenericImageService {
    private prisma;
    private s3Service;
    constructor(prisma: PrismaService, s3Service: S3Service);
    addImages(dto: AddGenericImagesDto, files?: UploadedFile[]): Promise<{
        success: boolean;
        message: string;
        count: number;
    }>;
    deleteImage(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
