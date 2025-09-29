# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

TrashAI is a conversational todo list application built with Next.js 15, TypeScript, and Tailwind CSS. It uses Google's Gemini AI to enable natural language interactions with todo lists, allowing users to create, complete, and delete tasks through conversational commands.

## Common Development Commands

### Development Server
```bash
npm run dev
# Starts development server at http://localhost:3000
```

### Building and Production
```bash
npm run build           # Build for production
npm run start           # Start production server
npm run vercel-build    # Special build command for Vercel deployment (includes Prisma generation)
```

### Code Quality
```bash
npm run lint            # Run ESLint
```

### Database Operations
```bash
npx prisma generate     # Generate Prisma client
npx prisma db push      # Push schema changes to database
npx prisma migrate dev  # Create and apply migrations in development
npx prisma studio       # Open Prisma Studio for database inspection
```

## Code Architecture

### High-Level Architecture

This is a **conversational AI-powered todo list application** with real-time collaboration features:

1. **AI Integration Layer**: Uses Google Gemini AI with function calling to interpret natural language commands and execute todo list operations
2. **Real-time Collaboration**: Pusher channels provide live updates across multiple users and sessions
3. **Database Layer**: PostgreSQL with Prisma ORM handling complex relationships between users, todo lists, tasks, subtasks, and collaborative features
4. **Authentication**: NextAuth.js provides session management and user authentication

### Key Components Structure

#### Frontend Architecture (App Router)
- **Root Layout** (`app/layout.tsx`): Global providers and theming
- **Authentication Pages** (`app/(auth)/`): Sign-in and sign-up flows
- **Dashboard Pages** (`app/(dashboard)/`): Main application interface
- **API Routes** (`app/api/`): Server-side functionality and AI integration

#### Core AI System
- **AI Command Handler** (`app/api/ai/command/route.ts`): Central AI processing endpoint that translates natural language into database operations using Google Gemini function calling
- **Function Declarations**: Structured AI functions for `createTask`, `createSubTask`, `completeTask`, `deleteTask`
- **Real-time Broadcasting**: Pusher integration for live updates across collaborative sessions

#### Data Architecture
The application uses a hierarchical todo structure:
```
User → TodoList → Task → SubTask
                   ↓
               Comment (can be on Task or SubTask)
```

Key relationships:
- **Collaborative Features**: `TodoListCollaborator` model with `PENDING`/`ACCEPTED` status
- **Direct Messaging**: User-to-user messaging within todo list context
- **Hierarchical Tasks**: Tasks can have multiple subtasks with ordering
- **Comments System**: Comments can be attached to both tasks and subtasks

#### Real-time Features
- **Pusher Channels**: Private channels per todo list (`private-list-${listId}`)
- **Event Types**: `item-added`, `item-updated`, `item-deleted`, `list-reordered`
- **Socket ID Handling**: Prevents echo events to the triggering client

### Important File Locations

#### Core Libraries (`app/lib/`)
- `prisma.ts`: Database client configuration
- `authoptions.ts`: NextAuth configuration
- `pusher.ts`: Pusher client setup

#### Actions (`app/actions/`)
- Server actions for invitations and collaboration management
- Todo list operations and data fetching

#### Components Organization
- `app/components/main/`: Core application interface (Sidebar, MainContent, TextArea)
- `app/components/TasksPage/`: Todo list display and interaction components
- `app/components/Providers/`: Context providers including notifications

### Environment Variables Required

```bash
DATABASE_URL=              # PostgreSQL connection string
NEXTAUTH_SECRET=          # NextAuth secret
GOOGLE_API_KEY=           # Google Gemini AI API key
PUSHER_APP_ID=           # Pusher application ID
PUSHER_KEY=              # Pusher key
PUSHER_SECRET=           # Pusher secret
PUSHER_CLUSTER=          # Pusher cluster
NEXT_PUBLIC_PUSHER_KEY=  # Public Pusher key for client
NEXT_PUBLIC_PUSHER_CLUSTER= # Public Pusher cluster for client
```

### Key Development Patterns

#### AI Function Calling
The application uses Google Gemini's function calling feature to translate natural language into structured operations. When adding new AI capabilities, define functions in the AI route handler following the existing pattern.

#### Real-time Updates
All database mutations should trigger Pusher events to maintain real-time synchronization. Use the established event naming convention and include socket IDs to prevent echo.

#### Database Queries
Use Prisma's type-safe queries and include proper indexing for performance. The schema includes strategic indexes on foreign keys and frequently queried fields.

#### Authentication Flow
All protected routes should check session state via `getServerSession(authOptions)`. Client-side components use `useSession()` from NextAuth.

#### Collaborative Features
When implementing new collaborative features, consider the `TodoListCollaborator` model and handle invitation states properly (PENDING/ACCEPTED).