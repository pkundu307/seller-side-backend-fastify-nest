import {
  Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req, BadRequestException, ParseIntPipe
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { MultipartFile } from 'fastify-multipart';
import { Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { HomepageAdminService } from './homepage-admin.service';
import { CreateHomepageSectionDto } from './dto/create-homepage-section.dto';
import { UpdateHomepageSectionDto } from './dto/update-homepage-section.dto';
import { UpdateHomepageItemDto } from './dto/update-homepage-item.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { ReorderDto } from './dto/reorder.dto';

@ApiTags('Admin - Homepage Management')
@ApiBearerAuth()
@Roles('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/homepage')
export class HomepageAdminController {
  constructor(private readonly homepageAdminService: HomepageAdminService) {}

  @Get('sections')
  @ApiOperation({ summary: 'Get all homepage sections and their items' })
  findAllSections() {
    return this.homepageAdminService.findAllSections();
  }

  @Post('sections')
  @ApiOperation({ summary: '1. Create a new homepage section' })
  createSection(@Body() dto: CreateHomepageSectionDto) {
    return this.homepageAdminService.createSection(dto);
  }

  @Patch('sections/:id')
  @ApiOperation({ summary: '3. Edit a homepage section\'s properties' })
  updateSection(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateHomepageSectionDto) {
    return this.homepageAdminService.updateSection(id, dto);
  }
  
  @Patch('sections/:id/status')
  @ApiOperation({ summary: '7. Toggle a section\'s active status' })
  updateSectionStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStatusDto) {
    return this.homepageAdminService.updateSectionStatus(id, dto);
  }

  @Delete('sections/:id')
  @ApiOperation({ summary: '5. Delete a section and all its items' })
  deleteSection(@Param('id', ParseIntPipe) id: number) {
    return this.homepageAdminService.deleteSection(id);
  }

@Post('sections/:sectionId/items')
@ApiConsumes('multipart/form-data')
@ApiOperation({ summary: '2. Add a new item to a section' })
@ApiBody({
  schema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      subtitle: { type: 'string' },
      linkType: { type: 'string' },
      linkValue: { type: 'string' },
      styleConfig: { type: 'string', description: 'JSON string' },
      imageUrl: { type: 'string', description: 'Paste a direct image URL instead of uploading' },
      image: { type: 'string', format: 'binary', description: 'Upload an image file' },
    },
  },
})
async addItemToSection(
  @Param('sectionId', ParseIntPipe) sectionId: number,
  @Req() req: FastifyRequest,
) {
  const { dto, file } = await this.parseItemMultipart(req);
  return this.homepageAdminService.addItemToSection(sectionId, dto, file);
}


  @Patch('items/:id')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '3. Edit an item (and optionally replace its image)' })
  @ApiBody({
      schema: {
          type: 'object',
          properties: {
              title: { type: 'string' },
              subtitle: { type: 'string' },
              linkType: { type: 'string' },
              linkValue: { type: 'string' },
              styleConfig: { type: 'string', description: 'JSON string' },
              image: { type: 'string', format: 'binary' }
          }
      }
  })
  async updateItem(@Param('id', ParseIntPipe) id: number, @Req() req: FastifyRequest) {
    const { dto, file } = await this.parseItemMultipart(req);
    return this.homepageAdminService.updateItem(id, dto, file);
  }

  @Patch('items/:id/status')
  @ApiOperation({ summary: '6. Toggle an item\'s active status' })
  updateItemStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStatusDto) {
    return this.homepageAdminService.updateItemStatus(id, dto);
  }

  @Delete('items/:id')
  @ApiOperation({ summary: '4. Delete a single item from a section' })
  deleteItem(@Param('id', ParseIntPipe) id: number) {
    return this.homepageAdminService.deleteItem(id);
  }

  // Reusable multipart parser for item creation/update
  private async parseItemMultipart(req: FastifyRequest): Promise<{ dto: UpdateHomepageItemDto; file?: any }> {
    if (!req.isMultipart()) throw new BadRequestException('Request must be multipart/form-data.');
    
    const dto: any = {};
    let file: any;

    for await (const part of req.parts() as AsyncIterableIterator<MultipartFile>) {
      if (part.file) {
        if (part.fieldname === 'image') {
            file = { buffer: await part.toBuffer(), filename: part.filename, mimetype: part.mimetype };
        }
      } else {
        dto[(part as any).fieldname] = (part as any).value;
      }
    }
    return { dto, file };
  }

    @Patch('sections/reorder')
  @ApiOperation({ summary: 'Reorder all homepage sections' })
  reorderSections(@Body() dto: ReorderDto) {
    return this.homepageAdminService.reorderSections(dto);
  }

  @Patch('items/reorder')
  @ApiOperation({ summary: 'Reorder all items within a section' })
  reorderItems(@Body() dto: ReorderDto) {
    return this.homepageAdminService.reorderItems(dto);
  }
}