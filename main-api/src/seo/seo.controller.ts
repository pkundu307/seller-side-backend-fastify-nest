// src/seo/seo.controller.ts
import { Controller, Get, Res, Param, Query, Headers } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { SeoService } from './seo.service';
import { ApiOperation, ApiQuery, ApiTags, ApiParam, ApiResponse } from '@nestjs/swagger';
import { DefaultValuePipe, ParseIntPipe } from '@nestjs/common';

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

  // --- Product Details API ---
  @Get('products/:slug')
  @ApiOperation({ summary: 'Get product details by slug' })
  @ApiParam({ name: 'slug', example: 'wireless-bluetooth-headphones' })
  async getProductDetails(@Param('slug') slug: string) {
    return this.seoService.getProductDetails(slug);
  }

  // --- Category Details API ---
  @Get('categories/:slug')
  @ApiOperation({ summary: 'Get category details by slug' })
  @ApiParam({ name: 'slug', example: 'electronics' })
  async getCategoryDetails(@Param('slug') slug: string) {
    return this.seoService.getCategoryDetails(slug);
  }

  // --- Seller Store API ---
  @Get('sellers/:slug')
  @ApiOperation({ summary: 'Get seller store details by slug' })
  @ApiParam({ name: 'slug', example: 'tech-gadgets-store' })
  async getSellerStore(@Param('slug') slug: string) {
    return this.seoService.getSellerStore(slug);
  }

  // --- Product Schema JSON (JSON-LD) ---
  @Get('products/:slug/schema.json')
  @ApiOperation({ summary: 'Get product structured data (JSON-LD)' })
  @ApiParam({ name: 'slug', example: 'wireless-bluetooth-headphones' })
  @ApiResponse({ status: 200, description: 'Returns JSON-LD schema for product' })
  async getProductSchemaJson(@Param('slug') slug: string, @Res() reply: FastifyReply) {
    const schema = await this.seoService.getProductSchemaJson(slug);
    reply.header('Content-Type', 'application/ld+json');
    reply.send(schema);
  }

  // --- Category Schema JSON (JSON-LD) ---
  @Get('categories/:slug/schema.json')
  @ApiOperation({ summary: 'Get category structured data (JSON-LD)' })
  @ApiParam({ name: 'slug', example: 'electronics' })
  @ApiResponse({ status: 200, description: 'Returns JSON-LD schema for category' })
  async getCategorySchemaJson(@Param('slug') slug: string, @Res() reply: FastifyReply) {
    const schema = await this.seoService.getCategorySchemaJson(slug);
    reply.header('Content-Type', 'application/ld+json');
    reply.send(schema);
  }

  // --- Seller Schema JSON (JSON-LD) ---
  @Get('sellers/:slug/schema.json')
  @ApiOperation({ summary: 'Get seller structured data (JSON-LD)' })
  @ApiParam({ name: 'slug', example: 'tech-gadgets-store' })
  @ApiResponse({ status: 200, description: 'Returns JSON-LD schema for seller' })
  async getSellerSchemaJson(@Param('slug') slug: string, @Res() reply: FastifyReply) {
    const schema = await this.seoService.getSellerSchemaJson(slug);
    reply.header('Content-Type', 'application/ld+json');
    reply.send(schema);
  }

  // --- Search API ---
  @Get('search')
  @ApiOperation({ summary: 'Search products' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  async getSearchResults(
    @Query('q') query: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.seoService.getSearchResults(query, page, limit);
  }

  // --- Product Reviews API ---
  @Get('products/:productId/reviews')
  @ApiOperation({ summary: 'Get product reviews' })
  @ApiParam({ name: 'productId', example: 'uuid' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getProductReviews(
    @Param('productId') productId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.seoService.getProductReviews(productId, page, limit);
  }

  // --- Google Merchant Center Feed ---
  @Get('merchant-feed.xml')
  @ApiOperation({ summary: 'Generate Google Shopping feed for Merchant Center' })
  async getMerchantFeed(@Res() reply: FastifyReply) {
    const feed = await this.seoService.generateGoogleShoppingFeed();
    reply.header('Content-Type', 'application/xml; charset=UTF-8');
    reply.send(feed);
  }
}