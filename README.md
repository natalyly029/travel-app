# Travel App 🗺️

A collaborative trip planning and group expense splitting application.

## Stack

- **Frontend**: Next.js 14 + React 18 (TypeScript)
- **Backend**: Next.js API Routes + Supabase
- **Database**: PostgreSQL (Supabase)
- **Hosting**: Vercel (planned)
- **Design**: Custom UI system with 5 aesthetic directions

## Project Structure

```
travel-app/
├── src/
│   ├── lib/
│   │   ├── supabase.ts       # Supabase client configuration
│   │   └── ...
│   ├── pages/
│   │   ├── api/              # API endpoints
│   │   ├── index.tsx         # Home page
│   │   └── ...
│   ├── types/
│   │   └── index.ts          # TypeScript types
│   └── components/           # React components
├── supabase/
│   └── migrations/           # Database migrations
├── public/
├── .env.local               # Environment variables (local only)
├── next.config.js
├── tsconfig.json
└── package.json
```

## Quick Start

### 1. Setup Environment

```bash
# Copy example env file
cp .env.example .env.local

# Fill in Supabase credentials
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

```bash
# Apply migrations to Supabase
# (Will be automated via CLI)
```

### 4. Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Database Schema

### Core Tables

- **trips**: Trip metadata (title, dates, template, sharing)
- **members**: Trip participants (name, role, email)
- **days**: Trip days (generated from start/end dates)
- **events**: Schedule items (sightseeing, food, accommodation, etc.)
- **payments**: Expense records (who paid what)
- **payment_allocations**: Payment coverage (who each expense covers)

See `supabase/migrations/001_init_schema.sql` for full schema.

## UI Design System

Choose an aesthetic direction for the app:

1. **Postcard/Editorial** - Vintage magazine, romantic
2. **Brutalist** - Raw, experimental, high-contrast
3. **Soft/Organic** - Friendly, rounded, playful
4. **Minimalist** - Zen, refined, Japanese-inspired
5. **Maximalist** - Colorful, energetic, geometric

See `skills/travel-app-ui/references/aesthetic-directions.md` for details.

## Features (Planned)

### Phase 1: Core
- [ ] Trip creation (title, dates, template selection)
- [ ] Schedule editor (day-by-day events)
- [ ] Member management (add, remove, roles)
- [ ] Link sharing (generate shareable URL)

### Phase 2: Expenses
- [ ] Payment tracking (record who paid)
- [ ] Expense allocation (specify who each cost covers)
- [ ] Automatic settlement calculation
- [ ] Currency conversion (JPY, USD, GBP, EUR)

### Phase 3: Polish
- [ ] PDF export with template designs
- [ ] Real-time collaboration (WebSockets)
- [ ] Dark mode support
- [ ] Notifications (Discord, email)

## Development Commands

```bash
npm run dev       # Start dev server
npm run build     # Build for production
npm run start     # Start production server
npm run lint      # Run ESLint
```

## Environment Variables

Required:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase public key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-side)

## Contributing

This project uses TypeScript strict mode and ESLint for quality.

## License

ISC
