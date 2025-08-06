# StudyLoopAI

AI-powered adaptive learning platform that transforms course materials into personalized study experience.

## Features

- **Adaptive Learning Engine**: AI-driven personalized study paths based on performance analytics
- **Content Generation**: Auto-generate summaries, flashcards, quizzes, and study notes from PDFs
- **Vector Search**: Semantic search across all course materials using pgvector embeddings  
- **Real-time Processing**: Background document processing with live progress updates
- **Learning Analytics**: Progress tracking, knowledge gap identification, and study optimization
- **Security-First**: Comprehensive Row Level Security policies protecting user data

## Technology Stack

**Frontend**: Next.js 15 • React Server Components • Tailwind CSS v4 • Shadcn UI • Framer Motion  
**Backend**: PostgreSQL • Drizzle ORM • Supabase Auth • Row Level Security  
**AI/ML**: Vercel AI SDK • OpenAI GPT-4 • xAI Grok • pgvector embeddings (1536-dim)  
**Processing**: Trigger.dev v4 • PDF-parse • Text chunking • Semantic embedding  
**Infrastructure**: Vercel • Upstash Redis • Polar.sh payments • PostHog analytics  
**State**: Zustand • TanStack Query • Server Actions • Real-time subscriptions  
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

## System Architecture

### Document Processing Pipeline

```
Upload → Ingestor → Processor → Content Generator → Storage
```

**1. Document Ingestor**

- Multi-format support (PDF, DOCX, TXT, images)
- File validation and security scanning
- Metadata extraction and indexing

**2. Document Processor**  

- PDF parsing with structure preservation
- Intelligent text chunking with overlap
- Content cleaning and normalization
- Progress tracking with real-time updates

**3. Content Generator**

- **Vercel AI SDK** orchestrates multi-model AI generation
- **OpenAI GPT-4** for summaries, quizzes, and explanations
- **xAI Grok** for alternative perspectives and advanced reasoning
- **Template system** for consistent content structure
- **Batch processing** for efficient resource utilization

**4. Vector Storage & Search**

- **pgvector** with 1536-dimensional OpenAI embeddings
- **HNSW indexing** for sub-second semantic search
- **Similarity scoring** with configurable thresholds
- **Contextual retrieval** for adaptive learning

### Learning Engine Architecture

- **Adaptive Algorithms**: Performance-based content difficulty adjustment
- **Knowledge Graph**: Concept relationships and learning dependencies  
- **Progress Analytics**: Real-time learning pattern analysis
- **Personalization**: Individual learning style adaptation

### Security & Performance

- **Row Level Security**: 34+ RLS policies for multi-tenant data isolation
- **Rate Limiting**: Upstash Redis with user-specific quotas and burst handling
- **Multi-level Caching**: Database queries, AI responses, embeddings, static assets
- **Background Jobs**: Trigger.dev with retry logic, error recovery, and scaling
- **Error Boundaries**: Comprehensive error handling with graceful degradation

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

**Modern AI-powered learning platform** built with Next.js 15, React Server Components, pgvector, OpenAI, and Trigger.dev.
