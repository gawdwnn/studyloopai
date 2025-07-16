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
- **Package Manager**: Bun

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

## Development

This project follows modern Next.js best practices with:
- Server Components and Server Actions
- TypeScript with strict typing
- Comprehensive error handling
- Row Level Security (RLS) with Supabase
- Responsive design with mobile-first approach
