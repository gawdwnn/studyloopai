# StudyLoopAI

AI-powered adaptive learning platform that transforms course materials into personalized study experience.

## Features

- **Secure Authentication & Onboarding**  
  Supabase Auth with guided onboarding, multi-step signup enforcement, and strict RLS-backed session management.
- **Agentic RAG Chat**  
  Conversational assistant grounded in course materials with live citations for every response.
- **Document Processing Pipeline**  
  Upload → Ingestor → Processor → Content Generator → Storage. Strategy-based extraction with automatic format detection: PDF parsing (unpdf), OCR for scanned PDFs (Mistral OCR with intelligent caching), Office documents (DOCX/Excel/PowerPoint via officeparser), and text files. Includes validation, metadata extraction, structure preservation, smart chunking, cleaning, normalization, and real-time progress tracking.
- **Adaptive Learning Engine**  
  Spaced Repetition System + knowledge graph-powered personalization, performance-based difficulty adjustments, and real-time progress analytics.
- **Content Generation**  
  Vercel AI SDK orchestrates OpenAI GPT-4 and xAI Grok to create summaries, quizzes, cuecards, Golden Notes, concept maps, all via reusable templates and batch processing.
- **Vector Search & Retrieval**  
  pgvector (1536-dim embeddings), HNSW indexing, configurable similarity thresholds, and contextual retrieval tuned for adaptive learning.
- **Detailed Learning Analytics**  
  Tracks study sessions, exposes knowledge gaps, and transforms insights into actionable recommendations.
- **Subscription & Quota Management**  
  Polar.sh billing, plan enforcement, and quota tracking baked into user experience.
- **Real-time Asynchronous Processing**  
  Trigger.dev background jobs with retries, error recovery, and live status updates for document ingest + AI generation.
- **Multi-Tier Caching**  
  Redis caching speeds up expensive operations: OCR results cached for 7 days, embeddings for 24 hours, content chunks for 1 hour. API responses and database queries cached with shorter TTLs for optimal performance.
- **Rate Limiting**  
  Protects system resources with operation-specific limits: authentication (5 requests per 5 minutes), API calls (100 per hour), AI operations (20 per hour with burst capacity), course creation (10 per hour). Enforced per user and IP address.
- **Security & Performance**  
  RLS policies ensure strict tenant isolation and data security. Resilient error boundaries provide graceful degradation and system stability.

## Technology Stack

**Frontend**: Next.js 15 • React 19 • React Server Components • Tailwind CSS v4 • Shadcn UI • Radix UI
**Backend**: PostgreSQL • pgvector • Drizzle ORM • Supabase (Auth, Database, Storage, VectorDB, RLS)
**AI & ML**: Vercel AI SDK • OpenAI (GPT-4, Embeddings) • Anthropic Claude • xAI Grok • Mistral (OCR, Text)
**Document Processing**: unpdf • officeparser • Firecrawl
**Infrastructure**: Vercel • Upstash (Redis, Rate-limit) • Polar.sh • PostHog • Trigger.dev
**State Management**: Zustand • TanStack Query • Server Actions • Supabase Realtime
**Forms & Validation**: React Hook Form • Zod
**Email**: Resend • React Email
**DevTools**: Bun • Biome.js • TypeScript • Drizzle Studio

## Quick Start

```bash
# 1. Install dependencies
bun install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local with your API keys and database URLs

# 3. Setup database
bun run db:migrate
bun run supabase:manager  # Apply RLS policies

# 4. Start development
bun dev
```

## Development

### Essential Commands

```bash
bun dev                 # Development server with Turbopack
bun run check          # Format, lint, organize imports (pre-commit)
bun run build          # Production build
```

### Database Management

```bash
bun run db:generate    # Generate migration from schema changes
bun run db:migrate     # Apply pending migrations  
bun run db:studio      # Open Drizzle Studio
```

### Supabase Operations

```bash
bun run supabase:manager                        # Interactive manager
bun scripts/supabase-manager.ts switch --env dev   # Switch environment
bun scripts/supabase-manager.ts policies --check   # Check RLS policies
```

### Background Jobs

```bash
bun run trigger:dev    # Start Trigger.dev development
bun run trigger:deploy # Deploy jobs to production
```

## Project Structure

```bash
src/
├── app/
│   ├── (auth)/
│   ├── (dashboard)/
│   ├── (onboarding)/
│   ├── api/
│   │   ├── ai/
│   │   ├── webhooks/polar/
│   │   └── health/
│   └── globals.css
├── components/
├── lib/
│   ├── actions/
│   ├── ai/
│   ├── analytics/
│   ├── auth/
│   ├── cache/
│   ├── config/
│   ├── database/
│   ├── polar/
│   ├── rate-limit/
│   ├── services/
│   ├── supabase/
│   ├── utils/
│   └── vector/
├── stores/
├── trigger/
├── types/
├── contexts/
└── hooks/

drizzle/
├── schema.ts
├── policies/
└── migrations/

scripts/
├── supabase-manager.ts
├── create-polar-products.ts
```

---
