# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Install dependencies
npm install

# Run development server (uses Vercel Dev)
npm run dev

# Build TypeScript to JavaScript
npm run build

# Start production server (runs compiled code)
npm run start
```

Note: This project does not currently have linting or test configurations.

## Architecture Overview

This is a passwordless authentication system for Circle communities, deployed on Vercel serverless functions. The system validates Circle community membership and issues JWT tokens for MCP (Model Context Protocol) clients.

### Authentication Flow

1. **Email Validation** (`/api/validate.ts`): Validates email against Circle API, generates 6-digit code, stores in Redis with 10-minute TTL, sends via email
2. **Code Verification** (`/api/verify.ts`): Verifies code, tracks attempts (max 3), generates JWT token on success
3. **Token Usage**: Frontend displays JWT for use in MCP clients (7-day expiration)

### Key Components

**API Endpoints** (`/api/`):
- `validate.ts` - Email validation and code generation
- `verify.ts` - Code verification and token generation  
- `health.ts` - Health check endpoint

**Library Modules** (`/lib/`):
- `circle.ts` - Circle Headless Auth API integration
- `storage.ts` - Redis/Vercel KV for temporary code storage
- `email.ts` - Resend email service integration
- `tokens.ts` - JWT generation and verification
- `config.ts` - Centralized configuration

**Frontend** (`/public/`):
- Single-page application with 3-step flow
- Auto-advancing code input fields

### Environment Variables

Required for deployment:
- `CIRCLE_API_TOKEN` - Circle API authentication token
- `CIRCLE_COMMUNITY_URL` - Circle community URL
- `RESEND_API_KEY` - Resend API key for email
- `JWT_SECRET` - Secret for JWT signing
- `REDIS_URL` - Redis connection URL (auto-configured on Vercel KV)

### Security Considerations

- Rate limiting: Max 3 validation attempts per hour per email
- Code expiration: 10-minute TTL
- Attempt limiting: Max 3 verification attempts per code
- Email normalization to prevent duplicates
- JWT tokens include audience and issuer validation

### Deployment

This project is designed for Vercel deployment. The `vercel.json` configures:
- 10-second function timeout for API routes
- URL rewrites for API and public routes

When making changes:
1. Ensure TypeScript compiles without errors (`npm run build`)
2. Test locally with `npm run dev`
3. Verify Redis connection is available
4. Check all required environment variables are set