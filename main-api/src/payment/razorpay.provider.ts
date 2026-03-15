// src/payment/razorpay.provider.ts
import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// ✅ CommonJS import (IMPORTANT)
const Razorpay = require('razorpay');

export const RAZORPAY_INSTANCE = 'RAZORPAY_INSTANCE';

export const razorpayProvider: Provider = {
  provide: RAZORPAY_INSTANCE,
  useFactory: (configService: ConfigService) => {
    return new Razorpay({
      key_id: configService.get<string>('RAZORPAY_KEY_ID'),
      key_secret: configService.get<string>('RAZORPAY_KEY_SECRET'),
    });
  },
  inject: [ConfigService],
};
