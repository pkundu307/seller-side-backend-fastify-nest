// src/products/util/S3Service.ts

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class S3Service {
  private readonly s3: S3Client;

  constructor() {
    this.s3 = new S3Client({
      region: 'ap-south-1',
      credentials: {
        accessKeyId:'AKIAS74TMHW3BWRHKSXD',
        secretAccessKey: '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',
      },
    });
  }

  async uploadImage(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<string> {
    const uniqueName = `products/${randomUUID()}-${fileName}`;
console.log('====================================');
console.log(fileBuffer);
console.log('====================================');
    const command = new PutObjectCommand({
      Bucket: 'mahecom',
      Key: uniqueName,
      Body: fileBuffer,
      ContentType: mimeType,
      ACL: 'public-read',
    });

    await this.s3.send(command);

    return `https://mahecom.s3.ap-south-1.amazonaws.com/${uniqueName}`;
  }
}
