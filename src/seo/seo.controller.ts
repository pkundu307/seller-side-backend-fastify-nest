// src/seo/seo.controller.ts
import { Controller, Get, Res, Param, Query } from '@nestjs/common';
import { FastifyReply } from 'fastify'; // <-- CORRECT IMPORT FOR FASTIFY
import { SeoService } from './seo.service';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('SEO')
@Controller('seo') // Changed base path to /seo for clarity
export class SeoController {
  constructor(private readonly seoService: SeoService) {}

  @Get('sitemap.xml')
  @ApiOperation({ summary: 'Generate the sitemap.xml for the website' })
  async getSitemap(@Res() reply: FastifyReply) { // <-- USE FASTIFYREPLY
    const sitemap = await this.seoService.generateSitemap();
    reply.header('Content-Type', 'application/xml');
    reply.send(sitemap);
  }

  @Get('robots.txt')
  @ApiOperation({ summary: 'Generate the robots.txt for the website' })
  async getRobotsTxt(@Res() reply: FastifyReply) { // <-- USE FASTIFYREPLY
    const robotsTxt = await this.seoService.generateRobotsTxt();
    reply.header('Content-Type', 'text/plain');
    reply.send(robotsTxt);
  }
  
  @Get('meta')
  @ApiOperation({ summary: 'Get SEO metadata for a specific page' })
  @ApiQuery({ name: 'type', required: true, enum: ['product', 'category', 'home', 'other'] })
  @ApiQuery({ name: 'slug', required: false, type: String })
  async getPageMeta(
    @Query('type') type: 'product' | 'category' | 'home' | 'other',
    @Query('slug') slug?: string,
  ) {
    return this.seoService.getPageMeta(type, slug);
  }
}