# Complete API Endpoints Documentation

**Base URL:** `http://localhost:3000/api`

---

## Table of Contents

1. [Auth](#auth)
2. [Users](#users)
3. [Products](#products)
4. [Cart](#cart)
5. [Orders](#orders)
6. [Payment](#payment)
7. [Categories](#categories)
8. [Attributes](#attributes)
9. [Banner](#banner)
10. [Wishlist](#wishlist)
11. [Coupons](#coupons)
12. [Business](#business)
13. [Seller Dashboard](#seller-dashboard)
14. [Seller Quotations](#seller-quotations)
15. [Seller Proforma Invoices](#seller-proforma-invoices)
16. [Seller Payment In](#seller-payment-in)
17. [Seller Payment Out](#seller-payment-out)
18. [Seller Parties](#seller-parties)
19. [Seller Purchases](#seller-purchases)
20. [Seller Sales Return](#seller-sales-return)
21. [Seller Expenses](#seller-expenses)
22. [Seller Reports](#seller-reports)
23. [Admin](#admin)
24. [Customer Addresses](#customer-addresses)
25. [Customer Support Tickets](#customer-support-tickets)
26. [Notifications](#notifications)
27. [Homepage](#homepage)
28. [Homepage Admin](#homepage-admin)
29. [Customization Assets](#customization-assets)
30. [Product Search](#product-search)
31. [SEO](#seo)

---

## Auth

### Register User
**Endpoint:** `POST /auth/register`  
**Authentication:** None  
**Description:** Register a new customer user

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "name": "John Doe",
  "userType": "user"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "type": "user",
  "createdAt": "2026-03-17T00:00:00Z",
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token"
}
```

---

### Login User
**Endpoint:** `POST /auth/login`  
**Authentication:** None  
**Description:** Login and get access token

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token"
}
```

---

### Google Login
**Endpoint:** `POST /auth/google-login`  
**Authentication:** None  
**Description:** Login using Google OAuth token

**Request Body:**
```json
{
  "token": "google_id_token"
}
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token"
}
```

---

### Introspect Token
**Endpoint:** `GET /auth/introspect`  
**Authentication:** Bearer Token (JWT)  
**Description:** Validate token and get fresh user details

**Response:** `200 OK`
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "new_jwt_token"
}
```

---

### Refresh Token
**Endpoint:** `POST /auth/refresh`  
**Authentication:** None  
**Description:** Renew access token using refresh token

**Request Body:**
```json
{
  "refreshToken": "refresh_token"
}
```

**Response:** `200 OK`
```json
{
  "accessToken": "new_jwt_token",
  "refreshToken": "new_refresh_token"
}
```

---

### Forgot Password
**Endpoint:** `POST /auth/forgot-password`  
**Authentication:** None  
**Rate Limit:** 3 per minute  
**Description:** Request password reset email

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:** `200 OK`
```json
{
  "message": "Reset email sent",
  "resetTokenExpiry": "2026-03-17T01:00:00Z"
}
```

---

### Reset Password
**Endpoint:** `POST /auth/reset-password`  
**Authentication:** None  
**Description:** Reset password using reset token

**Request Body:**
```json
{
  "resetToken": "token",
  "newPassword": "NewSecurePassword123"
}
```

**Response:** `200 OK`
```json
{
  "message": "Password reset successfully"
}
```

---

## Users

### Register User (Users Controller)
**Endpoint:** `POST /users/register`  
**Authentication:** None  
**Status Code:** `201 Created`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "createdAt": "2026-03-17T00:00:00Z"
}
```

---

### Login User (Users Controller)
**Endpoint:** `POST /users/login`  
**Authentication:** None

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "accessToken": "jwt_token"
}
```

---

### Get User Profile
**Endpoint:** `GET /users/profile`  
**Authentication:** Bearer Token (JWT)

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "picture": "url",
  "phoneNumber": "+1234567890",
  "createdAt": "2026-03-17T00:00:00Z"
}
```

---

## Products

### Add Product
**Endpoint:** `POST /products/add/:businessId`  
**Authentication:** Bearer Token (JWT)  
**Content-Type:** `multipart/form-data`

**Request Body (FormData):**
```
businessId: UUID
name: string
description: string
sku: string
category: string
price: number
quantity: number
images: File[] (optional)
variants: JSON array
productImageUrls: JSON array of URLs
variantImages_variantIndex: File[]
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "name": "Product Name",
  "slug": "product-name",
  "description": "Description",
  "sku": "SKU123",
  "price": 999.99,
  "quantity": 100,
  "businessId": "uuid",
  "images": ["url1", "url2"],
  "variants": [
    {
      "id": "uuid",
      "name": "Red",
      "price": 1099.99,
      "quantity": 50
    }
  ]
}
```

---

### Get Products (with Pagination)
**Endpoint:** `GET /products?page=1&limit=10`  
**Authentication:** None

**Query Parameters:**
- `page`: int (default: 1)
- `limit`: int (default: 10)

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Product Name",
      "slug": "product-name",
      "price": 999.99,
      "images": ["url"],
      "businessId": "uuid"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 10
}
```

---

## Cart

### Add Item to Cart
**Endpoint:** `POST /cart/add-item`  
**Authentication:** Bearer Token (JWT)  
**Content-Type:** `multipart/form-data`

**Request Body (FormData):**
```
productId: UUID (required)
variantId: UUID (optional)
quantity: number (default: 1)
customizationDetails: JSON string (optional)
customizationImages: File[] (optional)
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "cartId": "uuid",
  "productId": "uuid",
  "variantId": "uuid",
  "quantity": 2,
  "price": 999.99,
  "customizationDetails": {},
  "createdAt": "2026-03-17T00:00:00Z"
}
```

---

### Get Cart Items
**Endpoint:** `GET /cart`  
**Authentication:** Bearer Token (JWT)

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "items": [
    {
      "id": "uuid",
      "productId": "uuid",
      "productName": "Product Name",
      "quantity": 2,
      "price": 999.99,
      "total": 1999.98,
      "images": ["url"]
    }
  ],
  "subtotal": 1999.98,
  "tax": 299.99,
  "total": 2299.97
}
```

---

### Update Cart Item
**Endpoint:** `PATCH /cart/:id`  
**Authentication:** Bearer Token (JWT)

**Request Body:**
```json
{
  "quantity": 3,
  "customizationDetails": {}
}
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "quantity": 3,
  "price": 999.99,
  "total": 2999.97
}
```

---

### Delete Cart Item
**Endpoint:** `DELETE /cart/:id`  
**Authentication:** Bearer Token (JWT)

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "message": "Item removed from cart"
}
```

---

## Orders

### Place Cash on Delivery Order
**Endpoint:** `POST /orders/place-order/cod`  
**Authentication:** Bearer Token (JWT)

**Request Body:**
```json
{
  "addressId": "uuid",
  "items": [
    {
      "cartItemId": "uuid",
      "productId": "uuid",
      "variantId": "uuid",
      "quantity": 2
    }
  ],
  "couponCode": "SUMMER20" (optional),
  "notes": "Please deliver after 5 PM" (optional)
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "orderNumber": "ORD-2026-0001",
  "status": "PENDING",
  "paymentMethod": "COD",
  "items": [
    {
      "productId": "uuid",
      "productName": "Product Name",
      "quantity": 2,
      "price": 999.99,
      "total": 1999.98
    }
  ],
  "subtotal": 1999.98,
  "discount": 200.00,
  "tax": 299.99,
  "total": 2099.97,
  "createdAt": "2026-03-17T00:00:00Z"
}
```

---

### Get Order Success Details
**Endpoint:** `GET /orders/success?orderId=uuid`  
**Authentication:** Bearer Token (JWT)

**Query Parameters:**
- `orderId`: UUID (required)

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "orderNumber": "ORD-2026-0001",
  "status": "CONFIRMED",
  "items": [
    {
      "id": "uuid",
      "productName": "Product Name",
      "quantity": 2,
      "price": 999.99
    }
  ],
  "shipping": {
    "address": "123 Main St, City",
    "estimatedDelivery": "2026-03-20",
    "trackingNumber": "TRACK123"
  },
  "total": 2099.97
}
```

---

### Get All User Orders
**Endpoint:** `GET /orders/my-orders`  
**Authentication:** Bearer Token (JWT)

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "orderNumber": "ORD-2026-0001",
      "status": "DELIVERED",
      "total": 2099.97,
      "createdAt": "2026-03-17T00:00:00Z"
    }
  ],
  "total": 10,
  "page": 1
}
```

---

### Get Single Order
**Endpoint:** `GET /orders/my-orders/:id`  
**Authentication:** Bearer Token (JWT)

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "orderNumber": "ORD-2026-0001",
  "status": "DELIVERED",
  "items": [...],
  "total": 2099.97,
  "tracking": {
    "number": "TRACK123",
    "status": "DELIVERED",
    "estimatedDelivery": "2026-03-20"
  }
}
```

---

### Cancel Order
**Endpoint:** `POST /orders/:orderId/cancel`  
**Authentication:** Bearer Token (JWT)

**Request Body:**
```json
{
  "reason": "Changed my mind",
  "comments": "Do not need this item"
}
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "status": "CANCELLED",
  "message": "Order cancelled successfully",
  "refund": {
    "amount": 2099.97,
    "status": "INITIATED",
    "estimatedDate": "2026-03-22"
  }
}
```

---

## Payment

### Initiate Online Order
**Endpoint:** `POST /payment/initiate`  
**Authentication:** Bearer Token (JWT)

**Request Body:**
```json
{
  "addressId": "uuid",
  "items": [
    {
      "cartItemId": "uuid",
      "quantity": 2
    }
  ],
  "couponCode": "SUMMER20" (optional),
  "notes": "Special instructions" (optional)
}
```

**Response:** `201 Created`
```json
{
  "razorpayOrderId": "order_XXXXX",
  "orderId": "uuid",
  "amount": 209997,
  "currency": "INR",
  "customer": {
    "name": "John Doe",
    "email": "user@example.com",
    "phone": "+1234567890"
  },
  "notes": {
    "orderNote": "Special instructions"
  }
}
```

---

### Verify Razorpay Payment
**Endpoint:** `POST /payment/verify`  
**Authentication:** None

**Request Body:**
```json
{
  "razorpayOrderId": "order_XXXXX",
  "razorpayPaymentId": "pay_XXXXX",
  "razorpaySignature": "signature_XXXXX"
}
```

**Response:** `201 Created`
```json
{
  "orderId": "uuid",
  "status": "PAID",
  "paymentId": "pay_XXXXX",
  "amount": 209997,
  "message": "Payment verified successfully"
}
```

---

## Categories

### Create Category
**Endpoint:** `POST /categories`  
**Authentication:** Bearer Token (JWT)

**Request Body:**
```json
{
  "name": "Electronics",
  "slug": "electronics",
  "parentId": null (optional),
  "gstRate": 18,
  "description": "Electronic items"
}
```

**Response:** `201 Created`
```json
{
  "id": 1,
  "name": "Electronics",
  "slug": "electronics",
  "parentId": null,
  "gstRate": 18,
  "level": 0,
  "createdAt": "2026-03-17T00:00:00Z"
}
```

---

### Get Top-Level Categories
**Endpoint:** `GET /categories/top-level`  
**Authentication:** None

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "name": "Electronics",
    "slug": "electronics",
    "gstRate": 18
  },
  {
    "id": 2,
    "name": "Fashion",
    "slug": "fashion",
    "gstRate": 5
  }
]
```

---

### Get Category Children
**Endpoint:** `GET /categories/children?parentId=1`  
**Authentication:** None

**Query Parameters:**
- `parentId`: int (required)

**Response:** `200 OK`
```json
[
  {
    "id": 3,
    "name": "Mobile Phones",
    "slug": "mobile-phones",
    "parentId": 1,
    "gstRate": 18
  }
]
```

---

### Search Categories
**Endpoint:** `GET /categories/search?q=electronics`  
**Authentication:** None

**Query Parameters:**
- `q`: string (required)

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "name": "Electronics",
    "path": "Electronics"
  },
  {
    "id": 3,
    "name": "Mobile Phones",
    "path": "Electronics > Mobile Phones"
  }
]
```

---

### Get Category Tree
**Endpoint:** `GET /categories/tree`  
**Authentication:** None

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "name": "Electronics",
    "slug": "electronics",
    "gstRate": 18,
    "children": [
      {
        "id": 3,
        "name": "Mobile Phones",
        "slug": "mobile-phones",
        "gstRate": 18,
        "children": []
      }
    ]
  }
]
```

---

### Add Attributes Batch
**Endpoint:** `POST /categories/attributes/batch`  
**Authentication:** Bearer Token (JWT)

**Request Body:**
```json
{
  "categoryId": 5,
  "attributes": [
    {
      "name": "Color",
      "options": ["Red", "Blue", "Green"]
    },
    {
      "name": "Size",
      "options": ["S", "M", "L", "XL"]
    }
  ]
}
```

**Response:** `201 Created`
```json
{
  "categoryId": 5,
  "attributes": [
    {
      "id": 1,
      "name": "Color",
      "options": [
        { "id": 1, "value": "Red" },
        { "id": 2, "value": "Blue" }
      ]
    }
  ]
}
```

---

### Get Category Attributes
**Endpoint:** `GET /categories/:categoryId/attributes`  
**Authentication:** None

**Response:** `200 OK`
```json
{
  "categoryId": 5,
  "attributes": [
    {
      "id": 1,
      "name": "Color",
      "options": [
        { "id": 1, "value": "Red" },
        { "id": 2, "value": "Blue" }
      ]
    }
  ]
}
```

---

### Delete Category
**Endpoint:** `DELETE /categories/:id`  
**Authentication:** Bearer Token (JWT)

**Response:** `200 OK`
```json
{
  "id": 1,
  "message": "Category deleted successfully"
}
```

---

## Attributes

### Get Attribute Options
**Endpoint:** `GET /attributes/:attributeId/options`  
**Authentication:** None

**Response:** `200 OK`
```json
{
  "id": 1,
  "name": "Color",
  "options": [
    { "id": 1, "value": "Red" },
    { "id": 2, "value": "Blue" },
    { "id": 3, "value": "Green" }
  ]
}
```

---

## Banner

### Get Active Banners
**Endpoint:** `GET /banners`  
**Authentication:** None

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "title": "Summer Sale",
    "image": "url",
    "linkType": "product",
    "linkValue": "product-id",
    "position": 1,
    "isActive": true,
    "startDate": "2026-03-17",
    "endDate": "2026-04-17"
  }
]
```

---

## Wishlist

### Add to Wishlist
**Endpoint:** `POST /wishlist`  
**Authentication:** Bearer Token (JWT)

**Request Body:**
```json
{
  "productId": "uuid"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "productId": "uuid",
  "productName": "Product Name",
  "price": 999.99,
  "createdAt": "2026-03-17T00:00:00Z"
}
```

---

### Get Wishlist
**Endpoint:** `GET /wishlist`  
**Authentication:** Bearer Token (JWT)

**Response:** `200 OK`
```json
{
  "items": [
    {
      "id": "uuid",
      "productId": "uuid",
      "productName": "Product Name",
      "price": 999.99,
      "images": ["url"]
    }
  ],
  "total": 5
}
```

---

### Remove from Wishlist
**Endpoint:** `DELETE /wishlist/:wishlistItemId`  
**Authentication:** Bearer Token (JWT)

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "message": "Item removed from wishlist"
}
```

---

## Coupons

### Public: Validate Coupon
**Endpoint:** `POST /coupons/validate`  
**Authentication:** None

**Request Body:**
```json
{
  "code": "SUMMER20",
  "cart": {
    "subtotal": 5000,
    "items": [
      {
        "productId": "uuid",
        "categoryId": 1
      }
    ]
  }
}
```

**Response:** `200 OK`
```json
{
  "code": "SUMMER20",
  "isValid": true,
  "discountType": "percentage",
  "discountValue": 20,
  "maxDiscount": 1000,
  "discountAmount": 1000,
  "message": "Coupon applied successfully"
}
```

---

### Admin: Create Discount
**Endpoint:** `POST /admin/coupons/discounts`  
**Authentication:** Bearer Token (JWT) + Admin Role

**Request Body:**
```json
{
  "name": "Summer Discount",
  "type": "percentage",
  "value": 20,
  "maxDiscount": 1000,
  "minCartValue": 500
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "name": "Summer Discount",
  "type": "percentage",
  "value": 20
}
```

---

### Admin: Create Coupon
**Endpoint:** `POST /admin/coupons`  
**Authentication:** Bearer Token (JWT) + Admin Role

**Request Body:**
```json
{
  "code": "SUMMER20",
  "discountId": "uuid",
  "expiryDate": "2026-04-17",
  "maxUses": 100,
  "isActive": true
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "code": "SUMMER20",
  "discountId": "uuid",
  "expiryDate": "2026-04-17",
  "isActive": true
}
```

---

## Business

### Create Business
**Endpoint:** `POST /business`  
**Authentication:** Bearer Token (JWT)

**Request Body:**
```json
{
  "companyName": "Acme Corp",
  "slug": "acme-corp",
  "businessType": "B2B",
  "industry": "Electronics",
  "phone": "+1234567890",
  "website": "https://acmecorp.com",
  "address": "123 Business St",
  "city": "New York",
  "state": "NY",
  "postalCode": "10001",
  "country": "US"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "companyName": "Acme Corp",
  "slug": "acme-corp",
  "ownerId": "uuid",
  "isActive": true,
  "createdAt": "2026-03-17T00:00:00Z"
}
```

---

### Get My Businesses
**Endpoint:** `GET /business/mine`  
**Authentication:** Bearer Token (JWT)

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "companyName": "Acme Corp",
    "slug": "acme-corp",
    "isActive": true,
    "createdAt": "2026-03-17T00:00:00Z"
  }
]
```

---

### Get Business Settings
**Endpoint:** `GET /business/settingpage/:id`  
**Authentication:** Bearer Token (JWT)

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "companyName": "Acme Corp",
  "phone": "+1234567890",
  "address": "123 Business St",
  "gstNumber": "GST123",
  "panNumber": "PAN123",
  "bankAccountNo": "123456789",
  "bankIfscCode": "IFSC0001",
  "upiId": "acmecorp@upi"
}
```

---

### Update Business
**Endpoint:** `PATCH /business/:id`  
**Authentication:** Bearer Token (JWT)  
**Content-Type:** `multipart/form-data`

**Request Body (FormData):**
```
companyName: string
phone: string (always string, never numeric)
address: string
gstNumber: string (always string)
panNumber: string (always string)
logo: File (image)
banner: File (image)
signature: File (image)
socialLinks: JSON string
invoiceConfig: JSON string
businessConfig: JSON string
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "companyName": "Acme Corp",
  "phone": "+1234567890",
  "logo": "url",
  "banner": "url",
  "signature": "url"
}
```

---

## Seller Dashboard

### Get Business Orders
**Endpoint:** `GET /seller/:businessId/orders`  
**Authentication:** Bearer Token (JWT)

**Query Parameters:**
- `page`: int (default: 1)
- `limit`: int (default: 10)
- `status`: string (optional)
- `search`: string (optional)

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "orderNumber": "ORD-2026-0001",
      "status": "PENDING",
      "customerName": "John Doe",
      "total": 2099.97,
      "createdAt": "2026-03-17T00:00:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "stats": {
    "pending": 10,
    "processing": 5,
    "shipped": 20,
    "delivered": 65
  }
}
```

---

### Get Single Business Order
**Endpoint:** `GET /seller/:businessId/orders/:orderId`  
**Authentication:** Bearer Token (JWT)

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "orderNumber": "ORD-2026-0001",
  "status": "PENDING",
  "customer": {
    "name": "John Doe",
    "email": "user@example.com",
    "phone": "+1234567890"
  },
  "items": [
    {
      "productName": "Product Name",
      "quantity": 2,
      "price": 999.99,
      "total": 1999.98
    }
  ],
  "shipping": {
    "address": "123 Main St, City",
    "city": "New York",
    "state": "NY",
    "postalCode": "10001"
  },
  "total": 2099.97
}
```

---

### Update Order Status
**Endpoint:** `PATCH /seller/:businessId/orders/:orderId`  
**Authentication:** Bearer Token (JWT)

**Request Body:**
```json
{
  "status": "SHIPPED",
  "trackingNumber": "TRACK123",
  "notes": "Order shipped via Fedex"
}
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "status": "SHIPPED",
  "trackingNumber": "TRACK123",
  "updatedAt": "2026-03-17T10:00:00Z"
}
```

---

### Generate Shipping Label PDF
**Endpoint:** `GET /seller/:businessId/orders/:orderId/shipping-label?design=a6`  
**Authentication:** Bearer Token (JWT)

**Query Parameters:**
- `design`: string ('a6' | 'pos', default: 'a6')

**Response:** `200 OK`  
Returns PDF file

---

## Seller Quotations

### Create Quotation
**Endpoint:** `POST /seller/:businessId/quotations`  
**Authentication:** Bearer Token (JWT)

**Request Body:**
```json
{
  "customerId": "uuid",
  "items": [
    {
      "productId": "uuid",
      "quantity": 5,
      "price": 100
    }
  ],
  "notes": "Special terms apply",
  "validUntil": "2026-04-17"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "quotationNo": "QT-2026-0001",
  "status": "PENDING",
  "customerId": "uuid",
  "items": [
    {
      "id": "uuid",
      "productId": "uuid",
      "quantity": 5,
      "price": 100,
      "total": 500
    }
  ],
  "subtotal": 500,
  "tax": 75,
  "total": 575,
  "createdAt": "2026-03-17T00:00:00Z"
}
```

---

### Get Quotations
**Endpoint:** `GET /seller/:businessId/quotations?page=1&limit=10&status=PENDING`  
**Authentication:** Bearer Token (JWT)

**Query Parameters:**
- `page`: int (default: 1)
- `limit`: int (default: 10)
- `status`: string (optional)

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "quotationNo": "QT-2026-0001",
      "status": "PENDING",
      "customerId": "uuid",
      "total": 575,
      "createdAt": "2026-03-17T00:00:00Z"
    }
  ],
  "total": 50,
  "page": 1
}
```

---

### Get Single Quotation
**Endpoint:** `GET /seller/:businessId/quotations/:id`  
**Authentication:** Bearer Token (JWT)

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "quotationNo": "QT-2026-0001",
  "status": "PENDING",
  "items": [...],
  "total": 575,
  "notes": "Special terms apply"
}
```

---

### Download Quotation PDF
**Endpoint:** `GET /seller/:businessId/quotations/:id/pdf`  
**Authentication:** Bearer Token (JWT)

**Response:** `200 OK`  
Returns PDF file

---

### Update Quotation
**Endpoint:** `PATCH /seller/:businessId/quotations/:id`  
**Authentication:** Bearer Token (JWT)

**Request Body:**
```json
{
  "notes": "Updated terms",
  "items": [
    {
      "id": "uuid",
      "quantity": 6,
      "price": 100
    }
  ]
}
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "quotationNo": "QT-2026-0001",
  "status": "PENDING",
  "items": [...],
  "total": 600
}
```

---

## Seller Proforma Invoices

### Create Proforma Invoice
**Endpoint:** `POST /seller/:businessId/proforma-invoices`  
**Authentication:** Bearer Token (JWT)

**Request Body:**
```json
{
  "customerId": "uuid",
  "items": [
    {
      "productId": "uuid",
      "quantity": 10,
      "price": 50
    }
  ],
  "notes": "Payment terms: Net 30"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "proformaNo": "PI-2026-0001",
  "status": "DRAFT",
  "customerId": "uuid",
  "items": [...],
  "total": 575
}
```

---

### List Proforma Invoices
**Endpoint:** `GET /seller/:businessId/proforma-invoices`  
**Authentication:** Bearer Token (JWT)

**Query Parameters:**
- `page`: int (default: 1)
- `limit`: int (default: 10)

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "proformaNo": "PI-2026-0001",
      "status": "DRAFT",
      "total": 575
    }
  ],
  "total": 20
}
```

---

### Get Proforma Invoice
**Endpoint:** `GET /seller/:businessId/proforma-invoices/:id`  
**Authentication:** Bearer Token (JWT)

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "proformaNo": "PI-2026-0001",
  "status": "DRAFT",
  "items": [...],
  "total": 575
}
```

---

### Update Proforma Invoice
**Endpoint:** `PATCH /seller/:businessId/proforma-invoices/:id`  
**Authentication:** Bearer Token (JWT)

**Request Body:**
```json
{
  "notes": "Updated terms",
  "items": [...]
}
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "proformaNo": "PI-2026-0001",
  "status": "DRAFT"
}
```

---

### Cancel Proforma Invoice
**Endpoint:** `DELETE /seller/:businessId/proforma-invoices/:id`  
**Authentication:** Bearer Token (JWT)

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "message": "Proforma invoice cancelled"
}
```

---

### Convert Proforma Invoice to Sale
**Endpoint:** `POST /seller/:businessId/proforma-invoices/:id/convert`  
**Authentication:** Bearer Token (JWT)

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "saleId": "uuid",
  "saleNo": "INV-2026-0001",
  "message": "Converted to tax invoice successfully"
}
```

---

## Seller Payment In

### Record Payment In
**Endpoint:** `POST /seller/:businessId/payments/in`  
**Authentication:** Bearer Token (JWT)

**Request Body:**
```json
{
  "customerId": "uuid",
  "amount": 5000,
  "paymentMethod": "BANK_TRANSFER",
  "referenceNo": "REF123",
  "notes": "Payment for INV-2026-0001"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "customerId": "uuid",
  "amount": 5000,
  "paymentMethod": "BANK_TRANSFER",
  "status": "RECORDED",
  "createdAt": "2026-03-17T00:00:00Z"
}
```

---

### Get Payment History
**Endpoint:** `GET /seller/:businessId/payments/in`  
**Authentication:** Bearer Token (JWT)

**Query Parameters:**
- `page`: int
- `limit`: int

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "customerId": "uuid",
      "customerName": "John Doe",
      "amount": 5000,
      "paymentMethod": "BANK_TRANSFER",
      "createdAt": "2026-03-17T00:00:00Z"
    }
  ],
  "total": 50
}
```

---

### Get Single Payment
**Endpoint:** `GET /seller/:businessId/payments/in/:id`  
**Authentication:** Bearer Token (JWT)

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "customer": {
    "id": "uuid",
    "name": "John Doe"
  },
  "amount": 5000,
  "paymentMethod": "BANK_TRANSFER",
  "notes": "Payment for INV-2026-0001"
}
```

---

### Update Payment
**Endpoint:** `PATCH /seller/:businessId/payments/in/:id`  
**Authentication:** Bearer Token (JWT)

**Request Body:**
```json
{
  "notes": "Updated notes",
  "paymentDate": "2026-03-17"
}
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "notes": "Updated notes"
}
```

---

### Delete Payment
**Endpoint:** `DELETE /seller/:businessId/payments/in/:id`  
**Authentication:** Bearer Token (JWT)

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "message": "Payment deleted"
}
```

---

### Get Pending Customers
**Endpoint:** `GET /seller/:businessId/payments/in/pending-customers`  
**Authentication:** Bearer Token (JWT)

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "name": "John Doe",
    "totalOutstanding": 15000,
    "invoices": [
      {
        "id": "uuid",
        "invoiceNo": "INV-2026-0001",
        "amount": 5000,
        "paidAmount": 0,
        "balance": 5000
      }
    ]
  }
]
```

---

## Seller Payment Out

### Record Payment Out
**Endpoint:** `POST /seller/:businessId/payments/out`  
**Authentication:** Bearer Token (JWT)

**Request Body:**
```json
{
  "supplierId": "uuid",
  "amount": 10000,
  "paymentMethod": "CHECK",
  "referenceNo": "CHK123",
  "notes": "Payment for PO-2026-0001"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "supplierId": "uuid",
  "amount": 10000,
  "paymentMethod": "CHECK",
  "status": "RECORDED"
}
```

---

### Get Payment Out History
**Endpoint:** `GET /seller/:businessId/payments/out`  
**Authentication:** Bearer Token (JWT)

**Query Parameters:**
- `page`: int
- `limit`: int

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "supplierId": "uuid",
      "supplierName": "Supplier ABC",
      "amount": 10000,
      "paymentMethod": "CHECK"
    }
  ],
  "total": 30
}
```

---

### Get Pending Suppliers
**Endpoint:** `GET /seller/:businessId/payments/out/pending-suppliers`  
**Authentication:** Bearer Token (JWT)

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "name": "Supplier ABC",
    "totalOutstanding": 50000,
    "purchases": [
      {
        "id": "uuid",
        "poNo": "PO-2026-0001",
        "amount": 25000,
        "paidAmount": 10000,
        "balance": 15000
      }
    ]
  }
]
```

---

### Delete Payment Out
**Endpoint:** `DELETE /seller/:businessId/payments/out/:id`  
**Authentication:** Bearer Token (JWT)

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "message": "Payment deleted"
}
```

---

## Seller Parties

### Create Party
**Endpoint:** `POST /seller/:businessId/parties`  
**Authentication:** Bearer Token (JWT)

**Request Body:**
```json
{
  "name": "ABC Traders",
  "type": "CUSTOMER",
  "email": "contact@abctraders.com",
  "phone": "+1234567890",
  "address": "123 Business St",
  "city": "New York",
  "state": "NY",
  "postalCode": "10001",
  "gstNumber": "GST123",
  "panNumber": "PAN123",
  "bankAccountNo": "123456789",
  "bankIfscCode": "IFSC0001",
  "notes": "Important customer"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "name": "ABC Traders",
  "type": "CUSTOMER",
  "email": "contact@abctraders.com",
  "phone": "+1234567890",
  "balance": 0
}
```

---

### Get All Parties
**Endpoint:** `GET /seller/:businessId/parties`  
**Authentication:** Bearer Token (JWT)

**Query Parameters:**
- `page`: int
- `limit`: int
- `type`: string (CUSTOMER|SUPPLIER)
- `search`: string

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "ABC Traders",
      "type": "CUSTOMER",
      "email": "contact@abctraders.com",
      "balance": 5000,
      "lastTransaction": "2026-03-15"
    }
  ],
  "total": 100
}
```

---

### Get Single Party
**Endpoint:** `GET /seller/:businessId/parties/:id`  
**Authentication:** Bearer Token (JWT)

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "name": "ABC Traders",
  "type": "CUSTOMER",
  "email": "contact@abctraders.com",
  "phone": "+1234567890",
  "address": "123 Business St",
  "balance": 5000,
  "transactions": [...]
}
```

---

### Update Party
**Endpoint:** `PATCH /seller/:businessId/parties/:id`  
**Authentication:** Bearer Token (JWT)

**Request Body:**
```json
{
  "name": "ABC Traders Ltd",
  "phone": "+1987654321",
  "notes": "VIP customer"
}
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "name": "ABC Traders Ltd",
  "phone": "+1987654321"
}
```

---

### Delete Party
**Endpoint:** `DELETE /seller/:businessId/parties/:id`  
**Authentication:** Bearer Token (JWT)

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "message": "Party deleted"
}
```

---

## Seller Purchases

### Get Purchases
**Endpoint:** `GET /seller/:businessId/purchases`  
**Authentication:** Bearer Token (JWT)

**Query Parameters:**
- `page`: int
- `limit`: int
- `status`: string
- `search`: string

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "poNo": "PO-2026-0001",
      "supplierId": "uuid",
      "supplierName": "Supplier ABC",
      "status": "PENDING",
      "total": 50000,
      "createdAt": "2026-03-17"
    }
  ],
  "total": 50
}
```

---

### Create Purchase
**Endpoint:** `POST /seller/:businessId/purchases`  
**Authentication:** Bearer Token (JWT)

**Request Body:**
```json
{
  "supplierId": "uuid",
  "items": [
    {
      "productId": "uuid",
      "quantity": 100,
      "unitPrice": 500
    }
  ],
  "dueDate": "2026-04-17",
  "notes": "Rush order"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "poNo": "PO-2026-0001",
  "supplierId": "uuid",
  "items": [...],
  "total": 50000,
  "status": "PENDING"
}
```

---

## Seller Sales Return

### Create Sales Return
**Endpoint:** `POST /seller/:businessId/sales-return`  
**Authentication:** Bearer Token (JWT)

**Request Body:**
```json
{
  "invoiceId": "uuid",
  "items": [
    {
      "productId": "uuid",
      "quantity": 2,
      "reason": "Defective"
    }
  ],
  "notes": "Customer complaint"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "creditNoteNo": "CN-2026-0001",
  "status": "APPROVED",
  "invoiceId": "uuid",
  "items": [...],
  "creditAmount": 2000,
  "createdAt": "2026-03-17"
}
```

---

### Get Sales Returns
**Endpoint:** `GET /seller/:businessId/sales-return`  
**Authentication:** Bearer Token (JWT)

**Query Parameters:**
- `page`: int
- `limit`: int

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "creditNoteNo": "CN-2026-0001",
      "status": "APPROVED",
      "creditAmount": 2000
    }
  ],
  "total": 10
}
```

---

### Get Single Sales Return
**Endpoint:** `GET /seller/:businessId/sales-return/:id`  
**Authentication:** Bearer Token (JWT)

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "creditNoteNo": "CN-2026-0001",
  "status": "APPROVED",
  "items": [...],
  "creditAmount": 2000
}
```

---

### Cancel Sales Return
**Endpoint:** `DELETE /seller/:businessId/sales-return/:id`  
**Authentication:** Bearer Token (JWT)

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "message": "Credit note cancelled"
}
```

---

## Seller Expenses

### Create Expense
**Endpoint:** `POST /seller/:businessId/expenses`  
**Authentication:** Bearer Token (JWT)

**Request Body:**
```json
{
  "vendor": "Acme Supplies",
  "category": "OFFICE_SUPPLIES",
  "amount": 5000,
  "currency": "INR",
  "date": "2026-03-17",
  "notes": "Monthly supplies"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "vendor": "Acme Supplies",
  "category": "OFFICE_SUPPLIES",
  "amount": 5000,
  "status": "RECORDED",
  "createdAt": "2026-03-17"
}
```

---

### Get All Expenses
**Endpoint:** `GET /seller/:businessId/expenses`  
**Authentication:** Bearer Token (JWT)

**Query Parameters:**
- `page`: int
- `limit`: int
- `category`: string
- `startDate`: date
- `endDate`: date

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "vendor": "Acme Supplies",
      "category": "OFFICE_SUPPLIES",
      "amount": 5000,
      "date": "2026-03-17"
    }
  ],
  "total": 100,
  "totalAmount": 500000
}
```

---

### Get Single Expense
**Endpoint:** `GET /seller/:businessId/expenses/:id`  
**Authentication:** Bearer Token (JWT)

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "vendor": "Acme Supplies",
  "category": "OFFICE_SUPPLIES",
  "amount": 5000,
  "notes": "Monthly supplies"
}
```

---

### Update Expense
**Endpoint:** `PATCH /seller/:businessId/expenses/:id`  
**Authentication:** Bearer Token (JWT)

**Request Body:**
```json
{
  "vendor": "Acme Supplies Ltd",
  "notes": "Updated notes"
}
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "vendor": "Acme Supplies Ltd"
}
```

---

### Delete Expense
**Endpoint:** `DELETE /seller/:businessId/expenses/:id`  
**Authentication:** Bearer Token (JWT)

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "message": "Expense deleted"
}
```

---

## Seller Reports

### Get Balance Sheet
**Endpoint:** `GET /seller/:businessId/reports/balance-sheet`  
**Authentication:** Bearer Token (JWT)

**Response:** `200 OK`
```json
{
  "businessId": "uuid",
  "generatedAt": "2026-03-17T00:00:00Z",
  "assets": {
    "current": {
      "cash": 50000,
      "accountsReceivable": 30000,
      "inventory": 100000,
      "total": 180000
    },
    "fixed": {
      "equipment": 200000,
      "furniture": 50000,
      "total": 250000
    },
    "totalAssets": 430000
  },
  "liabilities": {
    "current": {
      "accountsPayable": 40000,
      "loans": 50000,
      "total": 90000
    },
    "totalLiabilities": 90000
  },
  "equity": {
    "capital": 200000,
    "retained": 140000,
    "total": 340000
  }
}
```

---

### Add Fixed Asset
**Endpoint:** `POST /seller/:businessId/reports/fixed-assets`  
**Authentication:** Bearer Token (JWT)

**Request Body:**
```json
{
  "name": "Dell Laptop",
  "category": "EQUIPMENT",
  "purchasePrice": 80000,
  "purchaseDate": "2026-01-15",
  "useful_life": 5,
  "salvageValue": 10000
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "name": "Dell Laptop",
  "category": "EQUIPMENT",
  "bookValue": 80000
}
```

---

### Add Loan
**Endpoint:** `POST /seller/:businessId/reports/loans`  
**Authentication:** Bearer Token (JWT)

**Request Body:**
```json
{
  "name": "Bank Loan",
  "amount": 500000,
  "interestRate": 10,
  "term": 60,
  "issueDate": "2026-01-01"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "name": "Bank Loan",
  "amount": 500000,
  "balance": 500000
}
```

---

## Admin

### Get Dashboard Stats
**Endpoint:** `GET /admin/dashboard-stats`  
**Authentication:** Bearer Token (JWT) + Admin Role

**Response:** `200 OK`
```json
{
  "totalUsers": 1000,
  "totalSellers": 50,
  "totalOrders": 5000,
  "totalRevenue": 5000000,
  "activeProducts": 2000,
  "recentOrders": [
    {
      "id": "uuid",
      "orderNumber": "ORD-2026-0001",
      "status": "PENDING",
      "total": 2099.97,
      "createdAt": "2026-03-17T00:00:00Z"
    }
  ]
}
```

---

### Create Platform Fee
**Endpoint:** `POST /admin/platform-fee`  
**Authentication:** Bearer Token (JWT) + Admin Role

**Request Body:**
```json
{
  "feeType": "PLATFORM_COMMISSION",
  "name": "Base Commission",
  "description": "Standard platform commission",
  "calculationType": "PERCENTAGE",
  "rate": 5,
  "appliesToSeller": true,
  "appliesToCustomer": false,
  "isActive": true
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "feeType": "PLATFORM_COMMISSION",
  "name": "Base Commission",
  "calculationType": "PERCENTAGE",
  "rate": 5,
  "isActive": true
}
```

---

### Update Platform Fee
**Endpoint:** `PATCH /admin/platform-fee/:id`  
**Authentication:** Bearer Token (JWT) + Admin Role

**Request Body:**
```json
{
  "rate": 6,
  "isActive": true
}
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "feeType": "PLATFORM_COMMISSION",
  "rate": 6
}
```

---

### Get Featured Products
**Endpoint:** `GET /admin/featured-products`  
**Authentication:** Bearer Token (JWT) + Admin Role

**Response:** `200 OK`
```json
{
  "categories": [
    {
      "categoryId": 1,
      "categoryName": "Electronics",
      "categorySlug": "electronics",
      "products": [
        {
          "id": "uuid",
          "title": "Samsung Galaxy S21",
          "slug": "samsung-galaxy-s21",
          "price": 50000,
          "images": ["url"],
          "businessOwner": "Acme Electronics"
        }
      ]
    }
  ]
}
```

---

## Customer Addresses

### Get All Addresses
**Endpoint:** `GET /user/addresses`  
**Authentication:** Bearer Token (JWT)

**Response:** `200 OK`
```json
{
  "addresses": [
    {
      "id": "uuid",
      "label": "Home",
      "address": "123 Main St",
      "city": "New York",
      "state": "NY",
      "postalCode": "10001",
      "country": "US",
      "phone": "+1234567890",
      "isDefault": true,
      "createdAt": "2026-03-17T00:00:00Z"
    }
  ],
  "total": 3
}
```

---

### Add Address
**Endpoint:** `POST /user/addresses`  
**Authentication:** Bearer Token (JWT)

**Request Body:**
```json
{
  "label": "Office",
  "address": "456 Business Ave",
  "city": "New York",
  "state": "NY",
  "postalCode": "10002",
  "country": "US",
  "phone": "+1234567890",
  "isDefault": false
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "label": "Office",
  "address": "456 Business Ave",
  "city": "New York",
  "state": "NY"
}
```

---

### Update Address
**Endpoint:** `PATCH /user/addresses/:addressId`  
**Authentication:** Bearer Token (JWT)

**Request Body:**
```json
{
  "label": "Office",
  "address": "789 Corporate Blvd",
  "isDefault": true
}
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "label": "Office",
  "address": "789 Corporate Blvd",
  "isDefault": true
}
```

---

### Delete Address
**Endpoint:** `DELETE /user/addresses/:addressId`  
**Authentication:** Bearer Token (JWT)

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "message": "Address deleted"
}
```

---

## Customer Support Tickets

### Create Support Ticket
**Endpoint:** `POST /customer/tickets`  
**Authentication:** Bearer Token (JWT)

**Request Body:**
```json
{
  "subject": "Product quality issue",
  "description": "Received damaged product",
  "orderId": "uuid" (optional),
  "priority": "HIGH"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "ticketNo": "TK-2026-0001",
  "subject": "Product quality issue",
  "status": "OPEN",
  "priority": "HIGH",
  "createdAt": "2026-03-17T00:00:00Z"
}
```

---

### Get My Tickets
**Endpoint:** `GET /customer/tickets`  
**Authentication:** Bearer Token (JWT)

**Query Parameters:**
- `status`: string (OPEN|IN_PROGRESS|RESOLVED|CLOSED)

**Response:** `200 OK`
```json
{
  "tickets": [
    {
      "id": "uuid",
      "ticketNo": "TK-2026-0001",
      "subject": "Product quality issue",
      "status": "OPEN",
      "priority": "HIGH",
      "lastUpdated": "2026-03-17"
    }
  ],
  "total": 5
}
```

---

### Get Ticket Details
**Endpoint:** `GET /customer/tickets/:id`  
**Authentication:** Bearer Token (JWT)

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "ticketNo": "TK-2026-0001",
  "subject": "Product quality issue",
  "description": "Received damaged product",
  "status": "OPEN",
  "priority": "HIGH",
  "messages": [
    {
      "id": "uuid",
      "sender": "John Doe",
      "senderType": "CUSTOMER",
      "message": "Product arrived damaged",
      "createdAt": "2026-03-17T10:00:00Z"
    },
    {
      "id": "uuid",
      "sender": "Support Team",
      "senderType": "ADMIN",
      "message": "We will help you with a replacement",
      "createdAt": "2026-03-17T11:00:00Z"
    }
  ]
}
```

---

### Reply to Ticket
**Endpoint:** `POST /customer/tickets/:id/reply`  
**Authentication:** Bearer Token (JWT)

**Request Body:**
```json
{
  "message": "Thank you for the update"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "ticketId": "uuid",
  "sender": "John Doe",
  "senderType": "CUSTOMER",
  "message": "Thank you for the update",
  "createdAt": "2026-03-17T12:00:00Z"
}
```

---

### Update Ticket Status
**Endpoint:** `PATCH /customer/tickets/:id/status`  
**Authentication:** Bearer Token (JWT)

**Request Body:**
```json
{
  "status": "RESOLVED"
}
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "ticketNo": "TK-2026-0001",
  "status": "RESOLVED"
}
```

---

### Get Tickets by Order
**Endpoint:** `GET /customer/tickets/order/:orderId`  
**Authentication:** Bearer Token (JWT)

**Response:** `200 OK`
```json
{
  "orderId": "uuid",
  "tickets": [
    {
      "id": "uuid",
      "ticketNo": "TK-2026-0001",
      "subject": "Product quality issue",
      "status": "OPEN"
    }
  ]
}
```

---

## Notifications

### Get Customer Notifications
**Endpoint:** `GET /notifications/customer`  
**Authentication:** Bearer Token (JWT)

**Query Parameters:**
- `page`: int (default: 1)
- `limit`: int (default: 10)

**Response:** `200 OK`
```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "ORDER_STATUS",
      "title": "Order Shipped",
      "message": "Your order ORD-2026-0001 has been shipped",
      "read": false,
      "createdAt": "2026-03-17T12:00:00Z"
    }
  ],
  "total": 25,
  "unread": 5
}
```

---

### Get Seller Notifications
**Endpoint:** `GET /notifications/seller`  
**Authentication:** Bearer Token (JWT)

**Query Parameters:**
- `page`: int (default: 1)
- `limit`: int (default: 10)

**Response:** `200 OK`
```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "NEW_ORDER",
      "title": "New Order Received",
      "message": "Order ORD-2026-0001 from John Doe",
      "read": false,
      "createdAt": "2026-03-17T12:00:00Z"
    }
  ],
  "total": 50,
  "unread": 10
}
```

---

## Homepage

### Get Homepage Layout
**Endpoint:** `GET /homepage`  
**Authentication:** None

**Response:** `200 OK`
```json
{
  "sections": [
    {
      "id": 1,
      "title": "Featured Products",
      "subtitle": "Best selling items",
      "layout": "grid",
      "items": [
        {
          "id": "uuid",
          "title": "Samsung Galaxy S21",
          "image": "url",
          "linkType": "product",
          "linkValue": "uuid"
        }
      ]
    },
    {
      "id": 2,
      "title": "Categories",
      "layout": "carousel",
      "items": [...]
    }
  ]
}
```

---

## Homepage Admin

### Get All Sections
**Endpoint:** `GET /admin/homepage/sections`  
**Authentication:** Bearer Token (JWT) + Admin Role

**Response:** `200 OK`
```json
{
  "sections": [
    {
      "id": 1,
      "title": "Featured Products",
      "layout": "grid",
      "isActive": true,
      "items": [...]
    }
  ]
}
```

---

### Create Section
**Endpoint:** `POST /admin/homepage/sections`  
**Authentication:** Bearer Token (JWT) + Admin Role

**Request Body:**
```json
{
  "title": "New Section",
  "layout": "grid",
  "isActive": true,
  "position": 1
}
```

**Response:** `201 Created`
```json
{
  "id": 3,
  "title": "New Section",
  "layout": "grid",
  "isActive": true
}
```

---

### Add Item to Section
**Endpoint:** `POST /admin/homepage/sections/:sectionId/items`  
**Authentication:** Bearer Token (JWT) + Admin Role  
**Content-Type:** `multipart/form-data`

**Request Body (FormData):**
```
title: string
subtitle: string
linkType: string
linkValue: string  
styleConfig: JSON string
image: File
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "sectionId": 1,
  "title": "Product Title",
  "image": "url"
}
```

---

### Update Item
**Endpoint:** `PATCH /admin/homepage/items/:id`  
**Authentication:** Bearer Token (JWT) + Admin Role  
**Content-Type:** `multipart/form-data`

**Request Body (FormData):**
```
title: string (optional)
subtitle: string (optional)
image: File (optional)
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "title": "Updated Title"
}
```

---

### Update Section Status
**Endpoint:** `PATCH /admin/homepage/sections/:id/status`  
**Authentication:** Bearer Token (JWT) + Admin Role

**Request Body:**
```json
{
  "isActive": false
}
```

**Response:** `200 OK`
```json
{
  "id": 1,
  "isActive": false
}
```

---

### Delete Section
**Endpoint:** `DELETE /admin/homepage/sections/:id`  
**Authentication:** Bearer Token (JWT) + Admin Role

**Response:** `200 OK`
```json
{
  "id": 1,
  "message": "Section deleted"
}
```

---

## Customization Assets

### Admin: Create Categories
**Endpoint:** `POST /admin/predefined-assets/categories`  
**Authentication:** Bearer Token (JWT) + Admin Role

**Request Body:**
```json
{
  "categories": [
    {
      "name": "Text",
      "description": "Text customization options"
    },
    {
      "name": "Graphics",
      "description": "Graphic design options"
    }
  ]
}
```

**Response:** `201 Created`
```json
{
  "created": 2,
  "categories": [
    {
      "id": "uuid",
      "name": "Text"
    }
  ]
}
```

---

### Admin: Get Categories
**Endpoint:** `GET /admin/predefined-assets/categories`  
**Authentication:** Bearer Token (JWT) + Admin Role

**Response:** `200 OK`
```json
{
  "categories": [
    {
      "id": "uuid",
      "name": "Text",
      "description": "Text customization options"
    }
  ]
}
```

---

### User: Get Categories
**Endpoint:** `GET /user/predefined-assets/categories`  
**Authentication:** None

**Response:** `200 OK`
```json
{
  "categories": [
    {
      "id": "uuid",
      "name": "Text"
    }
  ]
}
```

---

### Admin: Create Subcategories
**Endpoint:** `POST /admin/predefined-assets/subcategories`  
**Authentication:** Bearer Token (JWT) + Admin Role

**Request Body:**
```json
{
  "categoryId": "uuid",
  "subcategories": [
    {
      "name": "Font Names",
      "description": "Choose your preferred font"
    }
  ]
}
```

**Response:** `201 Created`
```json
{
  "created": 1,
  "categoryId": "uuid",
  "subcategories": [...]
}
```

---

### Get Subcategories
**Endpoint:** `GET /admin/predefined-assets/categories/:categoryId/subcategories`  
**Authentication:** Bearer Token (JWT) + Admin Role

**Response:** `200 OK`
```json
{
  "categoryId": "uuid",
  "subcategories": [
    {
      "id": "uuid",
      "name": "Font Names"
    }
  ]
}
```

---

### Add Images to Subcategory
**Endpoint:** `POST /admin/predefined-assets/subcategory-images`  
**Authentication:** Bearer Token (JWT) + Admin Role  
**Content-Type:** `multipart/form-data`

**Request Body (FormData):**
```
subCategoryId: UUID
imageFiles: File[]
imageUrls: JSON array of URLs (optional)
```

**Response:** `201 Created`
```json
{
  "subCategoryId": "uuid",
  "imagesAdded": 3,
  "images": [...]
}
```

---

### Get Images
**Endpoint:** `GET /user/predefined-assets/subcategories/:subCategoryId/images`  
**Authentication:** None

**Response:** `200 OK`
```json
{
  "subCategoryId": "uuid",
  "images": [
    {
      "id": "uuid",
      "url": "url"
    }
  ]
}
```

---

## Product Search

### Search Products
**Endpoint:** `GET /products/search`  
**Authentication:** None

**Query Parameters:**
- `q`: string (search query)
- `categoryId`: int (optional)
- `productId`: UUID (optional)

**Response:** `200 OK`
```json
{
  "results": [
    {
      "id": "uuid",
      "name": "Samsung Galaxy S21",
      "slug": "samsung-galaxy-s21",
      "price": 50000,
      "images": ["url"],
      "variants": [
        {
          "id": "uuid",
          "name": "128GB Black",
          "price": 50000
        }
      ]
    }
  ],
  "total": 5
}
```

---

## SEO

### Get Sitemap
**Endpoint:** `GET /seo/sitemap.xml`  
**Authentication:** None  
**Content-Type:** `application/xml`

**Response:** `200 OK`
Returns XML sitemap file

---

### Get Robots.txt
**Endpoint:** `GET /seo/robots.txt`  
**Authentication:** None  
**Content-Type:** `text/plain`

**Response:** `200 OK`
```
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api

Sitemap: https://example.com/seo/sitemap.xml
```

---

### Get Meta Tags
**Endpoint:** `GET /seo/meta?type=product&slug=product-slug`  
**Authentication:** None

**Query Parameters:**
- `type`: string ('product' | 'category' | 'home' | 'other')
- `slug`: string (optional)

**Response:** `200 OK`
```json
{
  "title": "Samsung Galaxy S21 - Best Price",
  "description": "Buy Samsung Galaxy S21 at the best price online",
  "keywords": ["samsung", "galaxy", "s21", "phone"],
  "ogImage": "url",
  "ogType": "product",
  "canonicalUrl": "https://example.com/products/samsung-galaxy-s21"
}
```

---

## Common Response Codes

| Code | Status | Description |
|------|--------|-------------|
| 200 | OK | Successful request |
| 201 | Created | Resource created successfully |
| 204 | No Content | Request successful, no content |
| 400 | Bad Request | Invalid parameters or request body |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | User lacks permission for this resource |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists or conflict |
| 422 | Unprocessable Entity | Validation failed |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |

---

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

---

## Pagination

Most list endpoints support pagination with the following parameters:

```
GET /endpoint?page=1&limit=10
```

**Response Format:**
```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "limit": 10,
  "totalPages": 10
}
```

---

## Error Response Format

```json
{
  "statusCode": 400,
  "message": "Bad Request",
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

---

**Last Updated:** March 17, 2026
