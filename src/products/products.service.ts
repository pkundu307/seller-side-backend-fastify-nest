import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { isValidDate } from 'src/utils/helper';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: any) {
    const {
      title,
      description,
      price,
      images,
      categories,
      variants,
      itemType,
      itemCategory,
      itemCode,
      isMrpEnabled,
      isWholesaleEnabled,
      isSerializationEnabled,
      isBatchingEnabled,
      sellingPrice,
      sellingPriceType,
      purchasePrice = 0,
      purchasePriceType = 'fixed',
      mrp= 0,
      wholesalePrice=0,
      wholesalePriceType='fixed',
      wholesaleQuantity=0,
      discountPercent=0,
      discountAmount=0,
      hsnCode='zjnc',
      sacCode='ss',
      tax= "zxc",
      cess= '0',
      unit= 'pcs',
      isSecondUnitEnabled,
      secondUnit,
      conversionRate,
      openingStock,
      openingStockDate,
      closingStock,
      userId,
    } = data;
  
    const categoryConnections = categories.map((catName) => ({
      where: { name: catName },
      create: { name: catName },
    }));
  
    return this.prisma.product.create({
      data: {
        // id:1,
        title,
        description,
        price: Number(price),
        images,
        slug: title.toLowerCase().replace(/\s+/g, '-'),
        // businessId: userId||4567,
    
        // ✅ Item-related fields (make sure these are all required in your schema)
        itemType,
        itemCategory: data.itemCategory || 'Uncategorized',
        itemCode: data.itemCode || `ITEM-${Date.now()}`, // Generate a unique item code if not provided
        isMrpEnabled: isMrpEnabled === 'true' || isMrpEnabled === true,
        isWholesaleEnabled: isWholesaleEnabled === 'true' || isWholesaleEnabled === true,
        isSerializationEnabled: isSerializationEnabled === 'true' || isSerializationEnabled === true,
        isBatchingEnabled: isBatchingEnabled === 'true' || isBatchingEnabled === true,
        sellingPrice: data.sellingPrice ? Number(data.sellingPrice) : 0,
        sellingPriceType: data.sellingPriceType || 'fixed',
        purchasePrice: Number(purchasePrice),
        purchasePriceType: purchasePriceType || 'fixed',
        mrp: Number(mrp),
        wholesalePrice: Number(wholesalePrice),
        wholesalePriceType: wholesalePriceType || 'fixed',
        wholesaleQuantity: Number(wholesaleQuantity),
        discountPercent: Number(discountPercent),
        discountAmount: Number(discountAmount),
        hsnCode: hsnCode||'1',
        sacCode: sacCode || '1',
        tax: tax,
        cess: cess || 0, // Default to 0 if not provided
        unit: unit || 'pcs', // Default to 'pcs' if not provided
        isSecondUnitEnabled: isSecondUnitEnabled === 'true' || isSecondUnitEnabled === true,
        secondUnit: secondUnit || 'kg', // Default to 'kg' if not provided
        conversionRate: Number(conversionRate)|| 1, // Default to 1 if not provided
        openingStock: Number(openingStock)||0,
        openingStockDate: isValidDate(data.openingStockDate) ? new Date(data.openingStockDate) : new Date(), // or throw error
        closingStock: Number(closingStock)|| 0,
        isMinStockAlertEnabled: data.isMinStockAlertEnabled === 'true' || data.isMinStockAlertEnabled === true,
        minStockCount: Number(data.minStockCount) || 0,
        // ✅ Category handling
        categories: {
          connectOrCreate: categoryConnections,
        },
        business: {
          connect: { id: 1 }, // or data.userId
        },
    
        // ✅ Variant creation (optional)
        ...(variants && variants.length > 0 && {
          variants: {
            create: variants,
          },
        }),
      },
      include: {
        categories: true,
        variants: true,
      },
    });
    
    
  }
  
  async findAll() {
    return this.prisma.product.findMany({
      include: {
        categories: true,
        variants: true,
      },
    });
  }

}
