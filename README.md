# StudyLoopAI

## Overview

StudyLoopAI transforms course materials into personalized adaptive learning experiences. Upload PDFs, slides, or notes, and our AI instantly generates summaries, cuecards, quizzes, and study plans that adapt to your performance and learning gaps.

## Key Features

- **Adaptive Learning**: AI-powered personalized study paths that evolve with your performance
- **Smart Content Generation**: Auto-generate summaries, cuecards, MCQs, and study notes
- **Semantic Search**: Vector-powered search through all your course materials
- **Learning Analytics**: Track progress, identify knowledge gaps, and optimize study time
- **Real-time Generation**: Background processing with live progress updates
- **Responsive Design**: Seamless experience across desktop, tablet, and mobile
- **Privacy-First**: Your data stays secure with comprehensive Row Level Security

## Tech Stack

- **Framework**: Next.js 15 with App Router & React Server Components
- **Database**: PostgreSQL with Drizzle ORM & pgvector for semantic search
- **Authentication**: Supabase Auth with Magic Links & Google OAuth
- **AI Integration**: Vercel AI SDK with OpenAI GPT & xAI Grok models
- **Vector Search**: pgvector with OpenAI embeddings (1536-dim)
- **Background Jobs**: Trigger.dev v4 for document processing workflows
- **Cache & Rate Limiting**: Upstash Redis for performance & API protection
- **Styling**: Tailwind CSS v4 with Shadcn UI components
- **State Management**: Zustand + TanStack Query
- **Code Quality**: Biome.js for linting, formatting & import organization
- **Deployment**: Vercel with optimized build pipeline
- **Package Manager**: Bun for fast dependency management

## Quick Start

1. **Clone and install dependencies**:

   ```bash
   git clone <repository-url>
   cd studyloopai
   bun install
   ```

2. **Set up environment variables**:

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

3. **Set up the database**:

   ```bash
   # Apply database migrations
   bun run db:migrate
   
   # Apply RLS policies (security)
   bun run supabase:manager
   ```

4. **Start development server**:

   ```bash
   bun dev
   ```

## Development Commands

### **Essential Workflow**

```bash
# Start development server (with Turbopack)
bun dev

# Format, lint, and organize imports (run before commits)
bun run check

# Build for production
bun run build
```

### **Database Operations**

```bash
# Generate new migration from schema changes
bun run db:generate

# Apply pending migrations
bun run db:migrate

# Open database studio for inspection
bun run db:studio

# Introspect existing database schema
bun run db:introspect
```

### **Supabase Environment Management**

```bash
# Interactive Supabase manager (unified interface)
bun run supabase:manager

# Quick policy status check
bun scripts/supabase-manager.ts policies --check

# Switch environments
bun scripts/supabase-manager.ts switch --env dev
bun scripts/supabase-manager.ts switch --env prod
```

### **Background Jobs (Trigger.dev)**

```bash
# Start background job development server
bun run trigger:dev

# Deploy jobs to production
bun run trigger:deploy
```

### **Code Quality**

```bash
# Fix everything (format + lint + organize imports)
bun run check

# Format code only
bun run format

# Fix linting issues only  
bun run lint:fix

# CI check (read-only, exits with error if issues found)
bun run check:ci
```

## Architecture Overview

### **Core Patterns**

- **Server-First Architecture**: React Server Components with selective client hydration
- **Database Security**: Comprehensive Row Level Security (RLS) policies for all 14+ tables
- **Background Processing**: Trigger.dev orchestrates PDF parsing, embedding generation, and content creation
- **Adaptive Learning Engine**: AI-driven personalization based on performance analytics and learning gaps
- **Vector Search**: pgvector with OpenAI embeddings for semantic content discovery

### **Key Systems**

- **Document Processing Pipeline**: Upload → Parse → Chunk → Embed → Generate → Store
- **Session Management**: Zustand stores manage adaptive learning sessions with real-time progress
- **Content Generation**: On-demand AI generation with template-based configuration
- **Analytics Engine**: Track learning patterns, identify knowledge gaps, optimize study paths

### **Security & Performance**

- **Row Level Security**: 34+ RLS policies ensure users only access their own data
- **Rate Limiting**: Upstash Redis protects against API abuse with intelligent quotas
- **Caching Layer**: Multi-level caching for database queries, AI responses, and static content
- **Error Boundaries**: Comprehensive error handling with graceful fallbacks

## Project Structure

```
src/
├── app/                    # Next.js App Router (route groups)
│   ├── (dashboard)/        # Protected dashboard routes
│   ├── (auth)/            # Authentication flow
│   └── api/               # API endpoints
├── components/             # React components by feature
├── lib/                   # Core utilities & services
│   ├── actions/           # Server Actions
│   ├── ai/               # AI integration & prompts
│   ├── services/         # Business logic layer
│   └── supabase/         # Database clients
├── stores/                # Zustand state management
├── trigger/               # Background job definitions
└── types/                 # TypeScript definitions

drizzle/
├── schema.ts              # Database schema
├── policies/              # RLS security policies
└── migrations/            # Database migrations
```

## Security & Performance Features

- **Row Level Security**: Multi-pattern RLS policies (ownership, course-based, material-based)
- **Rate Limiting**: Intelligent API protection with user-specific quotas
- **Vector Search**: pgvector with HNSW indexing for sub-second semantic search
- **Real-time Analytics**: Live progress tracking and performance insights
- **Background Jobs**: Resilient document processing with retry logic and progress updates

## Additional Resources

---

**Built for the modern web** • Next.js 15 • AISDK • React Server Components • TypeScript • Tailwind CSS v4 • Drizzle ORM • pgvector • Trigger.dev v4 • Upstash Redis • Polar.sh
