"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.razorpayProvider = exports.RAZORPAY_INSTANCE = void 0;
const config_1 = require("@nestjs/config");
const Razorpay = require('razorpay');
exports.RAZORPAY_INSTANCE = 'RAZORPAY_INSTANCE';
exports.razorpayProvider = {
    provide: exports.RAZORPAY_INSTANCE,
    useFactory: (configService) => {
        return new Razorpay({
            key_id: configService.get('RAZORPAY_KEY_ID'),
            key_secret: configService.get('RAZORPAY_KEY_SECRET'),
        });
    },
    inject: [config_1.ConfigService],
};
//# sourceMappingURL=razorpay.provider.js.map