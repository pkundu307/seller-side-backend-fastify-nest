import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../products/utils/s3Service';
import { CreateHomepageSectionDto } from './dto/create-homepage-section.dto';
import { UpdateHomepageSectionDto } from './dto/update-homepage-section.dto';
import { UpdateHomepageItemDto } from './dto/update-homepage-item.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { ReorderDto } from './dto/reorder.dto';
import { HomepageService } from 'src/homepage/homepage.service';

interface UploadedFile {
  buffer: Buffer;
  filename: string;
  mimetype: string;
}

@Injectable()
export class HomepageAdminService {
  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service,
     private homepageService: HomepageService, 
  ) {}

  // GET ALL (For Admin Panel Overview)
  async findAllSections() {
    return this.prisma.homepageSection.findMany({
      orderBy: { position: 'asc' },
      include: {
        items: {
          orderBy: { position: 'asc' },
        },
      },
    });
  }

  // 1. CREATE A SECTION (without items)
  async createSection(dto: CreateHomepageSectionDto) {
    const section = await this.prisma.homepageSection.create({
      data: {
        ...dto,
        styleConfig: dto.styleConfig ? JSON.parse(dto.styleConfig) : undefined,
      },
    });
    this.homepageService.invalidateCache();
    return section;
  }

  // 2. ADD AN ITEM TO A SECTION (with image)
async addItemToSection(sectionId: number, dto: UpdateHomepageItemDto, file?: UploadedFile) {
  const section = await this.prisma.homepageSection.findUnique({ where: { id: sectionId } });
  if (!section) throw new NotFoundException(`Section with ID ${sectionId} not found.`);

  let imageUrl: string | undefined;

  if (dto.imageUrl?.trim()) {
    // Use pasted URL directly — no upload needed
    imageUrl = dto.imageUrl.trim();
  } else if (file) {
    // Upload file to S3
    imageUrl = await this.s3Service.uploadImage(
      file.buffer,
      file.filename,
      file.mimetype,
      'homepage-items',
    );
  }

  return this.prisma.homepageItem.create({
    data: {
      sectionId,
      ...dto,
      imageUrl,                // override any imageUrl from dto spread with resolved value
      styleConfig: dto.styleConfig ? JSON.parse(dto.styleConfig) : undefined,
    },
  });
}

  // 3. EDIT A SECTION
  async updateSection(sectionId: number, dto: UpdateHomepageSectionDto) {
    return this.prisma.homepageSection.update({
      where: { id: sectionId },
      data: {
        ...dto,
        styleConfig: dto.styleConfig ? JSON.parse(dto.styleConfig) : undefined,
      },
    });
  }

  // 3. EDIT AN ITEM
  async updateItem(itemId: number, dto: UpdateHomepageItemDto, file?: UploadedFile) {
    const existingItem = await this.prisma.homepageItem.findUnique({ where: { id: itemId } });
    if (!existingItem) throw new NotFoundException(`Item with ID ${itemId} not found.`);

    let imageUrl = existingItem.imageUrl;
    const oldImageUrl = existingItem.imageUrl;

    if (file) {
      imageUrl = await this.s3Service.uploadImage(file.buffer, file.filename, file.mimetype, 'homepage-items');
    }

    const updatedItem = await this.prisma.homepageItem.update({
      where: { id: itemId },
      data: {
        ...dto,
        imageUrl,
        styleConfig: dto.styleConfig ? JSON.parse(dto.styleConfig) : undefined,
      },
    });

    // If a new image was uploaded and the old one existed, delete the old one
    if (file && oldImageUrl) {
      await this.s3Service.deleteImages([oldImageUrl]);
    }
    
    return updatedItem;
  }

  // 4. DELETE AN ITEM
  async deleteItem(itemId: number) {
    const itemToDelete = await this.prisma.homepageItem.findUnique({ where: { id: itemId } });
    if (!itemToDelete) throw new NotFoundException(`Item with ID ${itemId} not found.`);

    await this.prisma.homepageItem.delete({ where: { id: itemId } });

    if (itemToDelete.imageUrl) {
      await this.s3Service.deleteImages([itemToDelete.imageUrl]);
    }

    return { success: true, message: 'Item deleted successfully.' };
  }

  // 5. DELETE A SECTION
  async deleteSection(sectionId: number) {
    const sectionToDelete = await this.prisma.homepageSection.findUnique({
      where: { id: sectionId },
      include: { items: true },
    });
    if (!sectionToDelete) throw new NotFoundException(`Section with ID ${sectionId} not found.`);
    
    const imagesToDelete = sectionToDelete.items
      .map(item => item.imageUrl)
      .filter((url): url is string => !!url);

    // Use a transaction to delete items and the section together
    await this.prisma.$transaction([
      this.prisma.homepageItem.deleteMany({ where: { sectionId } }),
      this.prisma.homepageSection.delete({ where: { id: sectionId } }),
    ]);

    if (imagesToDelete.length > 0) {
      await this.s3Service.deleteImages(imagesToDelete);
    }

    return { success: true, message: 'Section and its items deleted successfully.' };
  }

  // 6. TOGGLE ITEM STATUS
  async updateItemStatus(itemId: number, dto: UpdateStatusDto) {
    return this.prisma.homepageItem.update({
      where: { id: itemId },
      data: { isActive: dto.isActive },
    });
  }

  // 7. TOGGLE SECTION STATUS
  async updateSectionStatus(sectionId: number, dto: UpdateStatusDto) {
    return this.prisma.homepageSection.update({
      where: { id: sectionId },
      data: { isActive: dto.isActive },
    });
  }

  //8. REORDER SECTIONS
   async reorderSections(dto: ReorderDto) {
    return this.prisma.$transaction(
      dto.items.map(item =>
        this.prisma.homepageSection.update({
          where: { id: item.id },
          data: { position: item.position },
        })
      )
    );
  }

  //9. REORDER ITEMS
  async reorderItems(dto: ReorderDto) {
    return this.prisma.$transaction(
      dto.items.map(item =>
        this.prisma.homepageItem.update({
          where: { id: item.id },
          data: { position: item.position },
        })
      )
    );
  }
}