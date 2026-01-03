<div align="center">
  <img src=".github/jottosop-logo.png" alt="Jottosop Logo" width="150"/>
  <h1>Jottosop - Multi-Vendor E-Commerce & CRM Platform</h1>
  <p>
    A robust, scalable, and feature-rich backend for a multi-vendor e-commerce marketplace, built with NestJS, Fastify, Prisma, and PostgreSQL.
  </p>
  
  <p>
    <!-- Badges -->
    <a href="#"><img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript"/></a>
    <a href="#"><img src="https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white" alt="Node.js"/></a>
    <a href="#"><img src="https://img.shields.io/badge/NestJS-E0234E?logo=nestjs&logoColor=white" alt="NestJS"/></a>
    <a href="#"><img src="https://img.shields.io/badge/Fastify-000000?logo=fastify&logoColor=white" alt="Fastify"/></a>
    <a href="#"><img src="https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white" alt="Prisma"/></a>
    <a href="#"><img src="https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL"/></a>
    <a href="#"><img src="https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white" alt="Docker"/></a>
  </p>
</div>

---

## ✨ Project Overview

**Jottosop** is more than just an e-commerce backend; it's a complete ecosystem designed to empower sellers and delight customers. It provides a full suite of tools for a multi-vendor marketplace, including inventory management, order processing, dynamic marketing, and a seller-facing CRM. The architecture is built for scalability, security, and developer efficiency.

## 🚀 Core Features

-   **Multi-Vendor Architecture:** Onboard multiple sellers (`Business`), each with their own storefront, products, and staff.
-   **Advanced Product Catalog:** Hierarchical categories, product variants with custom attributes, and rich product details.
-   **Full E-Commerce Flow:** Shopping cart, robust order management, and secure payment gateway integration (Razorpay).
-   **Dynamic Marketing & CMS:**
    -   Powerful coupon and discount engine with flexible targeting.
    -   Fully dynamic homepage builder for creating custom layouts (sliders, grids, carousels) via an admin panel.
-   **Seller CRM & Management:**
    -   Subscription plans (`FREE`, `BASIC`, `PRO`) for sellers.
    -   Staff management with role-based access control (RBAC).
    -   Seller dashboard APIs for order management and sales analytics.
    -   Support ticketing system for seller-admin communication.
-   **Customer Engagement:**
    -   Wishlists, product reviews, and notifications.
    -   Customer wallet for handling refunds and credits.
-   **Technology:**
    -   **Framework:** [NestJS](https://nestjs.com/) for a modular and scalable architecture.
    -   **HTTP Server:** [Fastify](https://www.fastify.io/) for high-performance request handling.
    -   **ORM:** [Prisma](https://www.prisma.io/) for type-safe database access and migrations.
    -   **Database:** [PostgreSQL](https://www.postgresql.org/) for robust, relational data storage.
    -   **Authentication:** JWT-based authentication for both customers and sellers/admins.

## 🛠️ Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/en/) (v18 or later)
-   [NPM](https://www.npmjs.com/) or [Yarn](https://yarnpkg.com/)
-   [Docker](https://www.docker.com/products/docker-desktop/) and Docker Compose
-   A PostgreSQL database instance (or use the provided Docker setup).

### 1. Local Setup (with Docker)

This is the recommended way to run the project locally. It spins up both the application and a dedicated PostgreSQL database.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/jottosop.git
    cd jottosop
    ```

2.  **Create an environment file:**
    Copy the example environment file and fill in your secrets.
    ```bash
    cp .env.example .env
    ```
    *Inside `.env`, update `JWT_SECRET` and other keys. The `DATABASE_URL` is already configured for the Docker setup.*

3.  **Build and run the containers:**
    ```bash
    docker-compose up --build
    ```
    *This will start the NestJS app on `http://localhost:3000` and the PostgreSQL database on `http://localhost:5432`.*

4.  **Run database migrations and seed:**
    Open a **new terminal window** and run these commands to set up the database schema and create the initial admin user.
    ```bash
    # Apply all migrations
    docker-compose exec app npx prisma migrate deploy

    # Seed the database with initial data (admin user, permissions, etc.)
    docker-compose exec app npx prisma db seed
    ```

### 2. Manual Setup (without Docker)

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Set up your `.env` file:**
    Create a `.env` file and set your `DATABASE_URL` to point to your Supabase or local PostgreSQL instance. Fill in all other required secrets.

3.  **Run migrations:**
    ```bash
    npx prisma migrate deploy
    ```

4.  **Run the seed script:**
    ```bash
    npx prisma db seed
    ```

5.  **Start the development server:**
    ```bash
    npm run start:dev
    ```

## 🌐 API Documentation

Once the application is running, the full API documentation is available via Swagger UI at:
**[http://localhost:3000/api](http://localhost:3000/api)**

## 🔧 Key Scripts

-   `npm run start:dev`: Starts the app in watch mode.
-   `npm run build`: Compiles the TypeScript to JavaScript.
-   `npx prisma migrate dev --name <migration-name>`: Creates a new database migration.
-   `npx prisma studio`: Opens a web-based GUI to view and edit your database.

---
<div align="center">
  Made with ❤️ for Jottosop
</div>