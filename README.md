# Lyric Atelier API

API backend cho Lyric Atelier - AI-powered lyric generation platform với hệ thống quản lý credits đầy đủ.

## Tính năng chính

- ✅ **Authentication & Authorization**: JWT-based authentication với 2 roles (User & Admin)
- ✅ **Credits Management System**:
  - FIFO credit deduction
  - Double-entry bookkeeping ledger
  - Credit expiration tracking
  - Transaction history
  - Admin credit adjustment
- ✅ **Google GenAI Integration**: Generate content với tự động trừ credits
- ✅ **Response Standardization**: Unified response format cho tất cả endpoints
- ✅ **Error Handling**: Common error codes và messages
- ✅ **Swagger Documentation**: Interactive API docs tại `/api/docs`
- ✅ **PostgreSQL Database**: Với TypeORM và migrations
- ✅ **Docker Support**: Docker Compose cho development environment

## Tech Stack

- NestJS 10.x + TypeScript
- PostgreSQL 16 + TypeORM
- JWT Authentication (Passport)
- Google Generative AI
- Swagger/OpenAPI
- Docker & Docker Compose
- Schedule (Cron Jobs)

## Installation

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

**Update these values in `.env`:**
- `JWT_SECRET`: Your secure JWT secret
- `GOOGLE_GENAI_API_KEY`: Your Google AI Studio API key
- `DB_PASSWORD`: Database password (if changed)

### 3. Start Docker containers

```bash
docker-compose up -d
```

This starts PostgreSQL at `localhost:5432` and pgAdmin at `localhost:5050`.

### 4. Run the application

```bash
# Development with watch mode
npm run start:dev

# Production
npm run build
npm run start:prod
```

Server runs at: `http://localhost:3000`

Swagger docs: `http://localhost:3000/api/docs`

## Quick Start Guide

### 1. Create admin user (first time)

You need to manually create an admin user in the database or via seed script.

### 2. Create credit packages (Admin)

```bash
curl -X POST http://localhost:3000/api/v1/credits/packages \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Starter",
    "credits": 100,
    "price": 9.99,
    "validityDays": 90,
    "description": "Perfect for getting started"
  }'
```

### 3. Register & test as user

```bash
# Register
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"Test123!","fullName":"Test User"}'

# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"Test123!"}'

# Get packages
curl http://localhost:3000/api/v1/credits/packages

# Purchase credits
curl -X POST http://localhost:3000/api/v1/credits/purchase \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"packageId":"PACKAGE_UUID"}'

# Generate content
curl -X POST http://localhost:3000/api/v1/genai/generate \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Write a haiku about coding","maxTokens":100}'
```

## API Endpoints

### Authentication (`/api/v1/auth`)
- `POST /register` - Register new user
- `POST /login` - Login user
- `GET /me` - Get current user profile

### Credits (`/api/v1/credits`)

**Package Management (Admin)**
- `POST /packages` - Create package
- `GET /packages` - List packages (public)
- `PATCH /packages/:id` - Update package
- `DELETE /packages/:id` - Delete package

**User Operations**
- `POST /purchase` - Purchase credits
- `GET /balance` - Get balance
- `GET /ledger` - Ledger history
- `GET /transactions` - Transaction history

**Admin Operations**
- `POST /admin/adjust` - Adjust credits

### GenAI (`/api/v1/genai`)
- `POST /generate` - Generate content (deducts credits)
- `GET /cost-estimate` - Estimate cost

## Response Format

**Success:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation completed successfully",
  "data": { ... },
  "timestamp": "2026-01-14T12:00:00.000Z",
  "path": "/api/v1/credits/balance"
}
```

**Error:**
```json
{
  "success": false,
  "statusCode": 400,
  "errorCode": "INSUFFICIENT_CREDITS",
  "message": "You don't have enough credits",
  "timestamp": "2026-01-14T12:00:00.000Z",
  "path": "/api/v1/genai/generate"
}
```

## Credits System

### How it works

1. **Purchase**: User mua credits package → Credits được thêm vào ledger với expiration date
2. **Usage**: Khi generate content → Credits được trừ theo FIFO (oldest first)
3. **Expiration**: Cron job chạy daily → Expire credits hết hạn
4. **Ledger**: Mọi thay đổi được ghi vào double-entry ledger

### Transaction Types
- `PURCHASE` - Mua credits
- `USAGE` - Sử dụng (GenAI)
- `EXPIRATION` - Hết hạn
- `ADMIN_ADJUSTMENT` - Admin điều chỉnh

## Database Schema

**Users** → email, password (bcrypt), role, isActive

**UserCreditSummary** → totalCredits, usedCredits, availableCredits, expiredCredits

**CreditPackage** → name, credits, price, validityDays

**CreditLedger** (Double-Entry) → debit, credit, balance, type, expiresAt

**CreditTransaction** → Purchase history

## Security Features

- ✅ Bcrypt password hashing (10 rounds)
- ✅ JWT authentication with expiration
- ✅ Global auth guard (except @Public endpoints)
- ✅ Role-based access control (User/Admin)
- ✅ Input validation (class-validator)
- ✅ SQL injection prevention (TypeORM)
- ✅ CORS enabled

## Cron Jobs

**Credit Expiration** - Runs daily at midnight (00:00)
- Expires credits past their expiration date
- Updates credit summaries
- Creates EXPIRATION ledger entries

## Development

### Generate migration

```bash
npm run typeorm migration:generate src/database/migrations/MigrationName
```

### Run migrations

```bash
npm run typeorm migration:run
```

## Project Structure

```
src/
├── main.ts
├── app.module.ts
├── config/              # Configuration & validation
├── common/              # Shared resources
│   ├── decorators/      # @Public, @Roles, @CurrentUser
│   ├── guards/          # JwtAuthGuard, RolesGuard
│   ├── interceptors/    # ResponseInterceptor
│   ├── filters/         # HttpExceptionFilter
│   ├── enums/           # ErrorCode, Role, TransactionType
│   └── interfaces/
├── modules/
│   ├── auth/            # JWT authentication
│   ├── users/           # User management
│   ├── credits/         # Credits system (FIFO, Ledger)
│   └── genai/           # Google GenAI integration
└── database/
    └── migrations/
```

## License

MIT
