// ADD DeleteObjectsCommand and ObjectIdentifier to your imports
import { S3Client, PutObjectCommand, DeleteObjectsCommand, ObjectIdentifier } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class S3Service {
  private readonly s3: S3Client;
  private readonly bucketName: string; // Declared here
  private readonly region: string;     // Declared here

  constructor() {
    // --- UPDATED CONSTRUCTOR ---
    const secretAccessKey = process.env.secretAccessKey;
    const accessKeyId = process.env.accessKeyId;
    
    // Fail-fast: Check all required env vars on startup
    if (!secretAccessKey) throw new Error('AWS secretAccessKey is not defined in environment variables');
    if (!accessKeyId) throw new Error('AWS accessKeyId is not defined in environment variables');
    if (!process.env.region) throw new Error('AWS region is not defined in environment variables');
    if (!process.env.Bucket) throw new Error('AWS Bucket name is not defined in environment variables');

    // Initialize class properties
    this.region = process.env.region;
    this.bucketName = process.env.Bucket;

    this.s3 = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
    });
  }

  async uploadImage(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<string> {
    const uniqueName = `products/${randomUUID()}-${fileName}`;

    const command = new PutObjectCommand({
      // UPDATE: Use the class property for consistency
      Bucket: this.bucketName,
      Key: uniqueName,
      Body: fileBuffer,
      ContentType: mimeType,
      ACL: 'public-read',
    });

    await this.s3.send(command);

    // UPDATE: Use the class properties here as well
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${uniqueName}`;
  }

  async deleteImages(imageUrls: string[]): Promise<void> {
    if (!imageUrls || imageUrls.length === 0) {
      return;
    }

    const objectsToDelete: ObjectIdentifier[] = imageUrls.map(url => {
      const urlPath = new URL(url).pathname;
      const key = urlPath.startsWith('/') ? urlPath.substring(1) : urlPath;
      return { Key: key };
    });

    try {
      const command = new DeleteObjectsCommand({
        // This will now correctly use the initialized bucket name
        Bucket: this.bucketName,
        Delete: {
          Objects: objectsToDelete,
          Quiet: false,
        },
      });

      const response = await this.s3.send(command);

      if (response.Errors && response.Errors.length > 0) {
        console.error('Failed to delete some objects from S3:', response.Errors);
        throw new InternalServerErrorException('Could not delete all specified images from storage.');
      }

      console.log('Successfully deleted objects from S3:', objectsToDelete.map(o => o.Key));
    } catch (error) {
      console.error('Error executing S3 delete command:', error);
      throw new InternalServerErrorException('An error occurred while trying to delete images from storage.');
    }
  }
}