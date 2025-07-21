# StudyLoopAI

AI-Powered Personalised Study Platform

## Overview

StudyLoopAI is a modern web application that leverages artificial intelligence to create personalized study experiences. it provides intelligent content generation, adaptive learning, and comprehensive course management.

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Database**: Supabase PostgreSQL with Drizzle ORM
- **Authentication**: Supabase Auth
- **AI Integration**: NextJS AI SDK, Mistral OCR, OpenAI GPT & xAI Grok models, Langchain.
- **Styling**: Tailwind CSS v4 with Shadcn UI
- **Background Jobs**: Trigger.dev
- **Caching/Ratelimit**: Upstash
- **Deployment**: Vercel
- **Package Manager**: Bun

## Project Structure

```text
studyloopai/
├── docs/                           # Project documentation
├── drizzle/                        # Database schema and migrations
│   ├── meta/                       # Migration metadata
│   └── policies/                   # RLS policy files
├── public/                         # Static assets
├── scripts/                        # Build and utility scripts
└── src/
    ├── app/                        # Next.js App Router
    │   ├── (blog)/                 # Blog routes
    │   ├── (dashboard)/            # Protected dashboard routes
    │   │   └── dashboard/
    │   │       ├── account/        # User account management
    │   │       ├── adaptive-learning/ # AI learning modules
    │   │       ├── ask-ai/         # AI chat interface
    │   │       ├── chat/           # Chat functionality
    │   │       ├── course-materials/ # Material management
    │   │       ├── course-planner/ # Course planning tools
    │   │       ├── courses/        # Course management
    │   │       ├── feedback/       # User feedback
    │   │       └── settings/       # Application settings
    │   ├── (home)/                 # Public home pages
    │   ├── (legal)/                # Legal pages
    │   ├── (onboarding)/           # User onboarding flow
    │   ├── api/                    # API routes
    │   └── auth/                   # Authentication pages
    ├── components/                 # React components
    │   ├── auth/                   # Authentication components
    │   ├── billing/                # Billing and payment
    │   ├── course/                 # Course-related components
    │   ├── cuecards/               # Flashcard system
    │   ├── dashboard/              # Dashboard components
    │   ├── generation/             # AI content generation
    │   ├── home-sections/          # Landing page sections
    │   ├── icons/                  # Icon components
    │   ├── multiple-choice/        # MCQ components
    │   ├── notes/                  # Note-taking components
    │   ├── onboarding/             # Onboarding components
    │   ├── open-questions/         # Open-ended questions
    │   ├── providers/              # Context providers
    │   ├── session/                # Learning session components
    │   └── ui/                     # Shadcn UI components
    ├── db/                         # Database configuration
    ├── hooks/                      # Custom React hooks
    ├── lib/                        # Core utilities (reorganized)
    │   ├── actions/                # Server actions
    │   ├── ai/                     # AI integration
    │   │   ├── generation/         # Content generation
    │   │   └── services/           # AI service providers
    │   ├── auth/                   # Authentication utilities
    │   ├── cache/                  # Caching layer
    │   ├── config/                 # Configuration management
    │   ├── data/                   # Data access layer
    │   ├── database/               # Database utilities
    │   ├── processing/             # Data processing
    │   ├── services/               # External services
    │   ├── storage/                # File storage
    │   ├── supabase/               # Supabase client setup
    │   ├── utils/                  # General utilities
    │   ├── validation/             # Schema validation
    │   └── vector/                 # Vector operations
    ├── stores/                     # Zustand state stores
    │   ├── cuecard-session/        # Flashcard session state
    │   ├── mcq-session/            # MCQ session state
    │   ├── open-question-session/  # Open question state
    │   └── session-manager/        # Session coordination
    ├── trigger/                    # Background job definitions
    └── types/                      # TypeScript type definitions
```

### Key Improvements in Lib Folder Organization

- **Domain-Driven Structure**: Files organized by functional domain (auth, ai, database)
- **Clear Separation**: Actions, utilities, and services are properly separated
- **Consistent Naming**: Standardized directory names and patterns
- **Better Discoverability**: Related files are co-located for easier navigation
- **Reduced Redundancy**: Eliminated duplicate folders and consolidated utilities

## Quick Start

1. **Install dependencies**:

   ```bash
   bun install
   ```

2. **Set up environment**:

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

3. **Run database migrations**:

   ```bash
   bun run db:migrate
   ```

4. **Start development server**:

   ```bash
   bun dev
   ```

## Common Commands

- `bun dev` - Start development server
- `bun run build` - Build for production
- `bun run check` - Run linting and formatting
- `bun test` - Run tests
- `bun run db:migrate` - Apply database migrations
- `bun run db:studio` - Open database studio

## Features

- **Intelligent Content Generation**: AI-powered summaries, flashcards, and quizzes
- **Adaptive Learning**: Personalized study paths based on performance
- **Course Management**: Organized content with weekly structure
- **Document Processing**: Upload PDFs and generate study materials
- **Progress Tracking**: Monitor learning progress and performance
- **Vector Search**: Semantic search through course materials

### Key Improvements

- **Logical Grouping**: Related functionality grouped by domain (auth, config, AI)
- **Consistent Structure**: All categories use directories for better organization
- **Eliminated Redundancy**: Single `utils/` and `validation/` directories
- **Clear Boundaries**: Better separation of concerns
- **Developer Experience**: Intuitive file locations and shorter import paths

## Development

This project follows modern Next.js best practices with:

- Server Components and Server Actions
- TypeScript with strict typing
- Comprehensive error handling
- Row Level Security (RLS) with Supabase
- Responsive design with mobile-first approach
