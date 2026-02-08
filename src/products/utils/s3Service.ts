//src/products/utils/s3Service.ts
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectsCommand,
  ObjectIdentifier,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';

@Injectable()
export class S3Service {
  private readonly s3: S3Client;
  private readonly bucketName: string;
  private readonly accountId: string;

  // Allowed folders (Security + validation)
  private readonly allowedFolders = ['products', 'banners', 'avatars', 'categories', 'others','cart','assets','homepage-items'];

  constructor() {
    const secretAccessKey = process.env.R2_SECRET_KEY;
    const accessKeyId = process.env.R2_ACCESS_KEY;
    const bucketName = process.env.R2_BUCKET;
    const accountId = process.env.R2_ACCOUNT_ID;
    const endpoint = process.env.R2_ENDPOINT;

    if (!secretAccessKey) throw new Error('R2_SECRET_KEY missing');
    if (!accessKeyId) throw new Error('R2_ACCESS_KEY missing');
    if (!bucketName) throw new Error('R2_BUCKET missing');
    if (!accountId) throw new Error('R2_ACCOUNT_ID missing');
    if (!endpoint) throw new Error('R2_ENDPOINT missing');

    this.bucketName = bucketName;
    this.accountId = accountId;

    this.s3 = new S3Client({
      region: 'auto',
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  // Validate folder
  private validateFolder(folder: string) {
    if (!folder || typeof folder !== 'string') {
      throw new BadRequestException('Folder name is required.');
    }
    if (!this.allowedFolders.includes(folder)) {
      throw new BadRequestException(
        `Invalid folder "${folder}". Allowed folders: ${this.allowedFolders.join(', ')}`,
      );
    }
  }

  async uploadImage(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    folder: string,
  ): Promise<string> {
    this.validateFolder(folder);

    const uniqueKey = `${folder}/${randomUUID()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: uniqueKey,
      Body: fileBuffer,
      ContentType: mimeType,
    });

    await this.s3.send(command);

    return `${process.env.R2_PUBLIC_URL}/${uniqueKey}`;
  }

  async deleteImages(imageUrls: string[]): Promise<void> {
    if (!imageUrls || imageUrls.length === 0) return;

    const objectsToDelete: ObjectIdentifier[] = imageUrls.map((url) => {
      const key = url.replace(`${process.env.R2_PUBLIC_URL}/`, '');
      return { Key: key };
    });

    try {
      const command = new DeleteObjectsCommand({
        Bucket: this.bucketName,
        Delete: {
          Objects: objectsToDelete,
          Quiet: false,
        },
      });

      const response = await this.s3.send(command);

      if (response.Errors?.length) {
        console.error('R2 delete errors:', response.Errors);
        throw new InternalServerErrorException('Some images could not be deleted from R2.');
      }
    } catch (error) {
      console.error('R2 delete error:', error);
      throw new InternalServerErrorException('Failed to delete images from R2.');
    }
  }
}
