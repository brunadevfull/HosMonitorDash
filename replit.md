# Server Monitoring Dashboard

## Overview

This is a full-stack server monitoring dashboard built with React and Express.js. The application allows users to monitor multiple servers, track system metrics (CPU, memory, disk usage), manage SSH connections, and receive alerts about server issues. It features a clean, modern interface using shadcn/ui components and provides real-time updates through WebSocket connections.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite for development and building
- **Routing**: wouter for client-side routing with pages for Dashboard, Servers, Metrics, Alerts, SSH Manager, and Settings
- **UI Components**: shadcn/ui component library with Radix UI primitives for accessibility
- **Styling**: Tailwind CSS with CSS variables for theming support
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Forms**: React Hook Form with Zod validation for type-safe form handling
- **Real-time Updates**: WebSocket integration for live server metrics and alerts

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Design**: RESTful API endpoints for CRUD operations on servers, metrics, alerts, and SSH sessions
- **Storage**: PostgreSQL database persistence using Drizzle ORM with automatic seeding
- **WebSocket Server**: Real-time communication for live updates to connected clients
- **Development Server**: Vite middleware integration for hot module replacement during development

### Data Storage Solutions
- **Database**: PostgreSQL database with full persistence (migrated from in-memory storage)
- **ORM**: Drizzle ORM with type-safe queries and automatic schema synchronization
- **Database Provider**: Neon Database (serverless PostgreSQL) via `@neondatabase/serverless`
- **Schema**: Complete database schema with servers, metrics, alerts, and SSH sessions tables
- **Auto-seeding**: Automatic database initialization with Portuguese sample data on first startup
- **Migrations**: Drizzle Kit handles schema synchronization with `npm run db:push`

### Authentication and Authorization
- **Current State**: No authentication implemented (development setup)
- **Session Management**: Connect-pg-simple dependency suggests planned PostgreSQL session storage
- **Security**: Ready for implementation with existing session management dependencies

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL database service
- **Drizzle ORM**: Type-safe database toolkit with PostgreSQL dialect
- **Connection Pooling**: Built-in support through Neon's serverless driver

### UI and Component Libraries
- **Radix UI**: Comprehensive set of accessible UI primitives
- **shadcn/ui**: Pre-built components using Radix UI and Tailwind CSS
- **Lucide React**: Icon library for consistent iconography
- **Embla Carousel**: Carousel component for UI interactions

### Development and Build Tools
- **Vite**: Fast development server and build tool
- **TypeScript**: Type safety across the entire application
- **Tailwind CSS**: Utility-first CSS framework
- **PostCSS**: CSS processing with autoprefixer

### Form and Validation Libraries
- **React Hook Form**: Performant form library with minimal re-renders
- **Zod**: TypeScript-first schema validation
- **@hookform/resolvers**: Integration between React Hook Form and Zod

### Utility Libraries
- **date-fns**: Modern JavaScript date utility library
- **clsx/class-variance-authority**: Conditional className utilities
- **nanoid**: URL-safe unique string ID generator

### WebSocket and Real-time Features
- **ws**: WebSocket library for real-time server communication
- **Custom WebSocket integration**: Built-in real-time updates for metrics and alerts