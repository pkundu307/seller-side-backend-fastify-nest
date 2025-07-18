// src/products/util/S3Service.ts

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { env } from 'process';

@Injectable()
export class S3Service {
  private readonly s3: S3Client;

  constructor() {
    if (!process.env.secretAccessKey) {
      throw new Error('AWS secretAccessKey is not defined in environment variables');
    }
    if(!process.env.region) {
      throw new Error('AWS region is not defined in environment variables');
    }

    this.s3 = new S3Client({
      region: process.env.region, // Default to ap-south-1 if not set
      credentials: {
        accessKeyId: process.env.accessKeyId || (() => { throw new Error('AWS accessKeyId is not defined in environment variables'); })(),
        secretAccessKey: process.env.secretAccessKey,
      },
    });
  }

  async uploadImage(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<string> {
    const uniqueName = `products/${randomUUID()}-${fileName}`;
console.log('====================================');
console.log(fileBuffer);
console.log('====================================');
if(!process.env.Bucket) {
        throw new Error('AWS Bucket name is not defined in environment variables');
        }
    const command = new PutObjectCommand({

      Bucket: process.env.Bucket,
      Key: uniqueName,
      Body: fileBuffer,
      ContentType: mimeType,
      ACL: 'public-read',
    });

    await this.s3.send(command);

    return `https://${process.env.Bucket}.s3.${process.env.region}.amazonaws.com/${uniqueName}`;
  }
}
