// src/seo/seo.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';

@Injectable()
export class SeoService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  private getBaseUrl(): string {
    return this.configService.get<string>('FRONTEND_URL') || 'https://jottosop.in';
  }

  private getMerchantBaseUrl(): string {
    return this.configService.get<string>('MERCHANT_CENTER_URL') || this.getBaseUrl();
  }

  // --- Google Shopping Feed Generator ---
async generateGoogleShoppingFeed() {
  const baseUrl = this.getMerchantBaseUrl();

  // 1. Fetch products
  const products = await this.prisma.product.findMany({
    where: { isPublished: true, isFeatured: true, deletedAt: null },
    select: {
      id: true, title: true, description: true, images: true, brand: true, slug: true,
      category: { select: { name: true } },
      variants: { where: { isDefault: true }, select: { price: true, stock: true, sku: true, weightInGrams: true }, take: 1 },
      business: { select: { name: true, id: true } },

    },
    take: 5000,
  });

  // 2. Build items as an array
  const items: string[] = [];

  for (const product of products) {
    const variant = product.variants[0];
    if (!variant) continue;

    const price = Number(variant.price).toFixed(2);
    const availability = (variant.stock ?? 0) > 0 ? 'in_stock' : 'out_of_stock';
    const weightGrams = variant?.weightInGrams || 500;

    // --- Define these INSIDE the loop ---
    const productType = this.escapeXml(product.category?.name || 'General');
    const gcategory = this.escapeXml(this.mapCategoryToGoogle(product.category?.name || ''));

    const validImages = product.images?.filter(img => img?.startsWith('http')) || [];
    if (validImages.length === 0) continue;

    const imageUrl = this.escapeXml(validImages[0]);
    const additionalImages = validImages.slice(1, 10)
      .map(img => `<g:additional_image_link>${this.escapeXml(img)}</g:additional_image_link>`)
      .join('\n      ');

    items.push(`
    <item>
      <g:id>${product.id}</g:id>
      <g:title>${this.escapeXml(product.title)}</g:title>
      <g:description>${this.escapeXml((product.description || '').substring(0, 5000)).replace(/\n/g, ' ')}</g:description>
      <g:link>${baseUrl}/product/${product.slug}</g:link>
      <g:image_link>${imageUrl}</g:image_link>
      ${additionalImages}
      <g:price>${price} INR</g:price>
      <g:availability>${availability}</g:availability>
      <g:condition>new</g:condition>
      <g:shipping_weight>${weightGrams} g</g:shipping_weight>
      <g:product_type>${productType}</g:product_type>
      <g:google_product_category>${gcategory || 'Shopping > Other'}</g:google_product_category>
      <g:brand>${this.escapeXml(product.brand || 'Unbranded')}</g:brand>
      ${variant?.sku ? `<g:gtin>${this.escapeXml(variant.sku)}</g:gtin>` : ''}
      <g:identifier_exists>false</g:identifier_exists>
    </item>`);
  }

  // 3. Build XML and return
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://google.com/schema_bases/1.63/shopping_base">
  <channel>
    <title>${this.escapeXml(baseUrl)}</title>
    <link>${baseUrl}</link>
    <description>Product feed for ${this.escapeXml(baseUrl)}</description>
    ${items.join('\n    ')}
  </channel>
</rss>`;

  return xml;
}
  private mapCategoryToGoogle(categoryName: string): string {
    const categoryMap: Record<string, string> = {
      'Electronics': 'Electronics > Audio > Headphones',
      'Fashion': 'Shopping > Clothing, Accessories & Shoes > Clothing > Tops & Tees > T-Shirts',
      'Clothing': 'Shopping > Clothing, Accessories & Shoes > Clothing > Tops & Tees > T-Shirts',
      'Shoes': 'Shopping > Clothing, Accessories & Shoes > Shoes > Athletic Shoes > Athletic Shoes - Walking & Training',
      'Accessories': 'Shopping > Clothing, Accessories & Shoes > Accessories',
      'Home & Kitchen': 'Shopping > Home, Furniture & Bedding > Kitchen & Dining > Kitchen Utensils & Gadgets > Cooking Utensils',
      'Home': 'Shopping > Home, Furniture & Bedding > Furniture > Tables',
      'Kitchen': 'Shopping > Home, Furniture & Bedding > Kitchen & Dining > Kitchen Utensils & Gadgets > Cooking Utensils',
      'Books': 'Arts, Entertainment & Sports > Books > Nonfiction',
      'Beauty': 'Shopping > Health & Beauty > Beauty > Makeup > Eyes > Mascara',
      'Health': 'Shopping > Health & Beauty > Health > Vitamins & Supplements > Vitamins',
      'Sports': 'Arts, Entertainment & Sports > Sports & Fitness > Sports > Outdoor Recreation > Camping & Hiking > Backpacks',
      'Toys': 'Arts, Entertainment & Sports > Toys > Toys & Games',
      'Toys & Games': 'Arts, Entertainment & Sports > Toys > Toys & Games',
      'Automotive': 'Auto, Parts & Tires > Car Accessories > Electronics > Car Electronics',
      'General': 'Shopping > Other',
      'Other': 'Shopping > Other',
    };
    return categoryMap[categoryName] || 'Shopping > Other';
  }

  private escapeXml(text: string): string {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
      .replace(/\n/g, ' ')
      .replace(/\r/g, ' ')
      .replace(/\t/g, ' ');
  }

  async generateSitemap(): Promise<string> {
    const baseUrl = this.getBaseUrl();
    
    const products = await this.prisma.product.findMany({
      where: { isPublished: true },
      select: { slug: true, updatedAt: true },
    });

    const categories = await this.prisma.category.findMany({
      select: { slug: true, updatedAt: true },
    });

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;

    categories.forEach((category) => {
      sitemap += `
  <url>
    <loc>${baseUrl}/category/${category.slug}</loc>
    <lastmod>${category.updatedAt.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    });

    products.forEach((product) => {
      sitemap += `
  <url>
    <loc>${baseUrl}/product/${product.slug}</loc>
    <lastmod>${product.updatedAt.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    });

    const staticPages = [
      { url: '/cookies', priority: '0.5' },
      { url: '/contact', priority: '0.5' },
      { url: '/terms', priority: '0.3' },
      { url: '/privacy', priority: '0.3' },
    ];

    staticPages.forEach((page) => {
      sitemap += `
  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
    });

    sitemap += '\n</urlset>';
    return sitemap;
  }

async generateRobotsTxt(): Promise<string> {
  const baseUrl = this.getBaseUrl();
  
  // ALLOW product paths, block only private/admin paths
  return `User-agent: Googlebot
Allow: /product/
Allow: /category/
Allow: /

User-agent: Googlebot-Image
Allow: /

User-agent: *
Disallow: /api/
Disallow: /admin/
Disallow: /cart/
Disallow: /checkout/

Sitemap: ${baseUrl}/seo/sitemap.xml`;
}

  async getPageMeta(type: 'product' | 'category' | 'home' | 'other', slug?: string) {
    const baseUrl = this.getBaseUrl();
    
    switch (type) {
      case 'product':
        if (!slug) throw new NotFoundException('Product slug is required.');
        const product = await this.prisma.product.findUnique({
          where: { slug },
          select: { title: true, metaDescription: true, images: true, tags: true, category: { select: { name: true } } },
        });

        if (!product) throw new NotFoundException(`Product with slug "${slug}" not found.`);
        
        const description = (product.metaDescription || product.title).substring(0, 160);
        
        return {
          title: `${product.title} | Jottosop`,
          description,
          keywords: [product.title, product.category.name, ...product.tags].join(', '),
          ogTitle: product.title,
          ogDescription: description,
          ogImage: product.images[0] || `${baseUrl}/og-default.png`,
          ogUrl: `${baseUrl}/product/${slug}`,
          canonical: `${baseUrl}/product/${slug}`,
        };
      
      case 'category':
        if (!slug) throw new NotFoundException('Category slug is required.');
        const category = await this.prisma.category.findUnique({
          where: { slug },
          select: { name: true } // Assuming no specific image on category model
        });

        if (!category) throw new NotFoundException(`Category with slug "${slug}" not found.`);
        
        return {
          title: `Shop ${category.name} Online | Jottosop`,
          description: `Explore a wide range of ${category.name} at the best prices on Jottosop. Fast delivery and great deals.`,
          keywords: `${category.name}, buy ${category.name}, ${category.name} online`,
          ogTitle: `Shop for ${category.name}`,
          ogDescription: `Discover our collection of ${category.name}.`,
          ogImage: `${baseUrl}/og-default.png`, // Use a default OG image
          ogUrl: `${baseUrl}/category/${slug}`,
          canonical: `${baseUrl}/category/${slug}`,
        };
        
      case 'home':
      default:
        return {
          title: 'Jottosop - Your One-Stop E-commerce Destination',
          description: 'Shop for the latest in electronics, fashion, and more. Jottosop offers great deals and fast shipping.',
          keywords: 'online shopping, e-commerce, deals, electronics, fashion',
          ogTitle: 'Jottosop - Online Shopping Made Easy',
          ogDescription: 'Discover amazing products and deals on Jottosop.',
          ogImage: `${baseUrl}/og-home.png`,
          ogUrl: baseUrl,
          canonical: baseUrl,
        };
    }
  }

  // --- Product Details API ---
  async getProductDetails(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug, isPublished: true, deletedAt: null },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        business: {
          select: { id: true, name: true, slug: true, logoUrl: true, isVerified: true },
        },
        variants: {
          where: { isDefault: true },
          select: { price: true, stock: true, status: true, id: true },
          take: 1,
        },
        reviews: {
          select: { id: true, rating: true, comment: true, createdAt: true, customerUser: { select: { name: true } } },
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { reviews: true, variants: true } },
      },
    });

    if (!product) throw new NotFoundException(`Product with slug "${slug}" not found`);

    const variant = product.variants[0];
    const price = variant ? Number(variant.price) : 0;
    const stock = variant?.stock ?? 0;
    const status = variant?.status ?? 'OUT_OF_STOCK';

    return {
      id: product.id,
      title: product.title,
      slug: product.slug,
      description: product.description,
      images: product.images,
      brand: product.brand,
      price,
      originalPrice: price,
      discount: 0,
      stock,
      status,
      isPublished: product.isPublished,
      category: {
        id: product.category.id,
        name: product.category.name,
        slug: product.category.slug,
      },
      business: {
        id: product.business.id,
        name: product.business.name,
        slug: product.business.slug,
        logoUrl: product.business.logoUrl,
        isVerified: product.business.isVerified,
      },
      reviews: {
        count: product._count.reviews,
        averageRating: 0, // Can be calculated from reviews
        recent: product.reviews,
      },
      tags: product.tags,
      metaTitle: product.metaTitle || product.title,
      metaDescription: product.metaDescription || product.title.substring(0, 160),
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  // --- Category Details API ---
  async getCategoryDetails(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug, isActive: true },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        children: {
          where: { isActive: true },
          select: { id: true, name: true, slug: true, imageUrl: true },
        },
        products: {
          where: { isPublished: true, deletedAt: null },
          take: 20,
          select: {
            id: true,
            title: true,
            slug: true,
            images: true,
            brand: true,
            category: { select: { id: true, name: true } },
            business: { select: { id: true, name: true, slug: true } },
            variants: {
              where: { isDefault: true },
              select: { price: true, stock: true },
              take: 1,
            },
            _count: { select: { reviews: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { products: true, children: true } },
      },
    });

    if (!category) throw new NotFoundException(`Category with slug "${slug}" not found`);

    const products = category.products.map((p) => {
      const variant = p.variants[0];
      return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        images: p.images,
        brand: p.brand,
        price: variant ? Number(variant.price) : 0,
        stock: variant?.stock ?? 0,
        category: p.category,
        business: p.business,
        reviewCount: p._count.reviews,
      };
    });

    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      imageUrl: category.imageUrl,
      metaTitle: category.metaTitle || category.name,
      metaDescription: category.metaDescription || category.name,
      parent: category.parent || null,
      subcategories: category.children,
      products,
      totalProducts: category._count.products,
      totalSubcategories: category._count.children,
    };
  }

  // --- Seller Store API ---
  async getSellerStore(slug: string) {
    const business = await this.prisma.business.findUnique({
      where: { slug, isActive: true },
      include: {
        owner: { select: { id: true, name: true } },
        products: {
          where: { isPublished: true, deletedAt: null },
          take: 20,
          select: {
            id: true,
            title: true,
            slug: true,
            images: true,
            brand: true,
            category: { select: { id: true, name: true } },
            variants: {
              where: { isDefault: true },
              select: { price: true, stock: true },
              take: 1,
            },
            _count: { select: { reviews: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { products: true } },
      },
    });

    if (!business) throw new NotFoundException(`Seller with slug "${slug}" not found`);

    const products = business.products.map((p) => {
      const variant = p.variants[0];
      return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        images: p.images,
        brand: p.brand,
        price: variant ? Number(variant.price) : 0,
        stock: variant?.stock ?? 0,
        category: p.category,
        reviewCount: p._count.reviews,
      };
    });

    const rating = Number(business.rating) || 0;

    return {
      id: business.id,
      name: business.name,
      slug: business.slug,
      description: business.description,
      logoUrl: business.logoUrl,
      bannerUrl: business.bannerUrl,
      category: business.category,
      rating,
      reviewCount: business.reviewCount,
      isVerified: business.isVerified,
      phone: business.phone,
      city: business.city,
      state: business.state,
      socialLinks: business.socialLinks as Record<string, string> | null,
      websiteUrl: business.websiteUrl,
      products,
      totalProducts: business._count.products,
    };
  }

  // --- Product Schema JSON (JSON-LD) ---
  async getProductSchemaJson(slug: string) {
    const product = await this.getProductDetails(slug);

    const schema: Prisma.JsonObject = {
      '@context': 'https://schema.org/',
      '@type': 'Product',
      name: product.title,
      description: product.description || '',
      image: product.images,
      offers: {
        '@type': 'Offer',
        url: `${this.getBaseUrl()}/product/${product.slug}`,
        price: product.price.toString(),
        priceCurrency: 'INR',
        availability:
          product.status === 'ACTIVE'
            ? 'https://schema.org/InStock'
            : product.status === 'INACTIVE'
              ? 'https://schema.org/OutOfStock'
              : 'https://schema.org/PreOrder',
      },
      brand: {
        '@type': 'Brand',
        name: product.brand || '',
      },
      aggregateRating: product.reviews.count > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue: product.reviews.averageRating.toString(),
            reviewCount: product.reviews.count,
          }
        : undefined,
      seller: {
        '@type': 'Organization',
        name: product.business.name,
      },
    };

    return schema;
  }

  // --- Category Schema JSON (JSON-LD) ---
  async getCategorySchemaJson(slug: string) {
    const category = await this.getCategoryDetails(slug);

    const schema: Prisma.JsonObject = {
      '@context': 'https://schema.org/',
      '@type': 'CollectionPage',
      name: category.name,
      description: category.metaDescription || '',
      url: `${this.getBaseUrl()}/category/${category.slug}`,
      itemListElement: category.products.map((product, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Product',
          name: product.title,
          image: product.images[0],
          url: `${this.getBaseUrl()}/product/${product.slug}`,
          offers: {
            '@type': 'Offer',
            price: product.price.toString(),
            priceCurrency: 'INR',
          },
        },
      })),
    };

    return schema;
  }

  // --- Seller Schema JSON (JSON-LD) ---
  async getSellerSchemaJson(slug: string) {
    const seller = await this.getSellerStore(slug);

    const schema: Prisma.JsonObject = {
      '@context': 'https://schema.org/',
      '@type': 'Organization',
      name: seller.name,
      description: seller.description || '',
      url: `${this.getBaseUrl()}/seller/${seller.slug}`,
      logo: seller.logoUrl || '',
      image: seller.bannerUrl || '',
      sameAs: seller.socialLinks || [],
      address: {
        '@type': 'PostalAddress',
        addressLocality: seller.city,
        addressRegion: seller.state,
      },
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: seller.phone,
        contactType: 'customer service',
      },
      aggregateRating: seller.reviewCount > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue: seller.rating.toString(),
            reviewCount: seller.reviewCount,
          }
        : undefined,
      makesOffer: {
        '@type': 'OfferCatalog',
        name: `${seller.name} Products`,
        itemListElement: seller.products.map((product) => ({
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Product',
            name: product.title,
            image: product.images[0],
            url: `${this.getBaseUrl()}/product/${product.slug}`,
            offers: {
              '@type': 'Offer',
              price: product.price.toString(),
              priceCurrency: 'INR',
            },
          },
        })),
      },
    };

    return schema;
  }

  // --- Search Results API ---
  async getSearchResults(query: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const searchQuery = `%${query}%`;

    const [products, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where: {
          isPublished: true,
          deletedAt: null,
          OR: [
            { title: { contains: searchQuery, mode: 'insensitive' } },
            { description: { contains: searchQuery, mode: 'insensitive' } },
            { brand: { contains: searchQuery, mode: 'insensitive' } },
            { tags: { has: query } },
          ],
        },
        select: {
          id: true,
          title: true,
          slug: true,
          images: true,
          brand: true,
          description: true,
          category: { select: { id: true, name: true, slug: true } },
          business: { select: { id: true, name: true, slug: true, logoUrl: true } },
          variants: {
            where: { isDefault: true },
            select: { price: true, stock: true },
            take: 1,
          },
          _count: { select: { reviews: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.product.count({
        where: {
          isPublished: true,
          deletedAt: null,
          OR: [
            { title: { contains: searchQuery, mode: 'insensitive' } },
            { description: { contains: searchQuery, mode: 'insensitive' } },
            { brand: { contains: searchQuery, mode: 'insensitive' } },
            { tags: { has: query } },
          ],
        },
      }),
    ]);

    const results = products.map((p) => {
      const variant = p.variants[0];
      return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        images: p.images,
        brand: p.brand,
        description: p.description,
        price: variant ? Number(variant.price) : 0,
        stock: variant?.stock ?? 0,
        category: p.category,
        business: p.business,
        reviewCount: p._count.reviews,
      };
    });

    return {
      query,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      results,
    };
  }

  // --- Product Reviews API ---
  async getProductReviews(productId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

  const [reviews, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where: { productId },
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          customerUser: { select: { name: true, picture: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.review.count({ where: { productId } }),
    ]);

    const averageRating = total > 0
      ? Number(
          (
            reviews.reduce((sum, r) => sum + r.rating, 0) / total
          ).toFixed(1)
        )
      : 0;

    return {
      productId,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      averageRating,
      ratingDistribution: {
        5: reviews.filter((r) => r.rating === 5).length,
        4: reviews.filter((r) => r.rating === 4).length,
        3: reviews.filter((r) => r.rating === 3).length,
        2: reviews.filter((r) => r.rating === 2).length,
        1: reviews.filter((r) => r.rating === 1).length,
      },
      reviews,
    };
  }
}