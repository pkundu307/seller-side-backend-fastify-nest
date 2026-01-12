export declare class S3Service {
    private readonly s3;
    private readonly bucketName;
    private readonly accountId;
    private readonly allowedFolders;
    constructor();
    private validateFolder;
    uploadImage(fileBuffer: Buffer, fileName: string, mimeType: string, folder: string): Promise<string>;
    deleteImages(imageUrls: string[]): Promise<void>;
}
