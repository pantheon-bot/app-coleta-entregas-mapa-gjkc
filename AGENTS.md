# AGENTS.md

Extra context and instructions for AI coding agents working in this repository.

## Project Overview

Next.js 16 template using TiDB Cloud Serverless (MySQL-compatible) with Kysely as a type-safe SQL query builder and mysql2 as the underlying driver. The app uses the App Router with React Server Components by default, styled with Tailwind CSS and shadcn/ui components.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env.local` at the repository root:
   ```bash
   DATABASE_URL=mysql://[user]:[password]@[host]/[database]
   ```
   Get the connection string from TiDB Cloud dashboard. The app will crash on startup without this variable.

3. Start development server:
   ```bash
   npm run dev
   ```
   Opens on http://localhost:3000 with hot reload enabled.

## Development Commands

- `npm run dev` - Start Next.js development server on localhost:3000
- `npm run build` - Build production bundle (fails if DATABASE_URL is missing)
- `npm start` - Serve production bundle locally
- `npm run lint` - Run ESLint with Next.js config (always run before commits)

## File Organization

```
src/
├── app/              # Next.js App Router
│   ├── layout.tsx    # Root layout with fonts and global styles
│   ├── page.tsx      # Homepage (default: Server Component)
│   └── globals.css   # Tailwind CSS + CSS variables
└── lib/              # Utilities and shared logic
    ├── db/           # Database layer
    │   ├── index.ts  # Re-exports db instance and DB type
    │   ├── db.ts     # Kysely instance with MysqlDialect (using mysql2)
    │   └── schema.d.ts # DB type definition (regenerate when schema changes)
    └── utils.ts      # cn() utility for Tailwind class merging

public/               # Static assets (images, fonts)
```

## Database Workflow

### Database connection

The project uses `mysql2` driver with Kysely's `MysqlDialect` to connect to TiDB Cloud Serverless. The connection is configured in `src/lib/db/db.ts` with TLS 1.2+ required for secure connections.

Connection configuration:
```typescript
import { createPool } from 'mysql2';
import { Kysely, MysqlDialect } from 'kysely';

const db = new Kysely({
  dialect: new MysqlDialect({
    pool: createPool({
      uri: process.env.DATABASE_URL!,
      ssl: {
        minVersion: 'TLSv1.2',
      }
    })
  }),
});
```

### Importing the database

Always import from `src/lib/db/index.ts`:
```typescript
import db, { type DB } from '@/lib/db';
```

### Writing queries

Use Kysely query builder (never raw SQL):
```typescript
// Example: Select all users
const users = await db.selectFrom('users').selectAll().execute();

// Example: Insert with returning
const newUser = await db
  .insertInto('users')
  .values({ name: 'Alice', email: 'alice@example.com' })
  .returningAll()
  .executeTakeFirst();
```

### Schema changes

When you modify the TiDB schema:
1. Make changes in TiDB Cloud dashboard or via migration tool
2. **Regenerate** `src/lib/db/schema.d.ts` to reflect the new schema
3. Update the `DB` interface with new table definitions
4. Commit the updated `schema.d.ts` so other developers get type safety

Example schema definition:
```typescript
export interface DB {
  users: {
    id: Generated<number>;
    name: string;
    email: string;
    created_at: Generated<Timestamp>;
  };
}
```

## Code Style

### TypeScript
- Use 2-space indentation (not tabs)
- Prefer `const` over `let`
- Use descriptive filenames: `user-profile.tsx`, `auth-utils.ts`
- Enable all TypeScript strict checks (already configured)

### React Components
- **Default to Server Components** - no `"use client"` directive needed
- Only add `"use client"` when you need hooks (useState, useEffect, useRef, etc.) or browser APIs
- Use named exports for utilities: `export function getUserById() {}`
- Keep components in `src/app` for routes, `src/components` for reusable UI

### Tailwind CSS
- Write classes inline (no separate CSS modules)
- Order: layout utilities first, then variants
  ```tsx
  // Good
  <div className="flex items-center gap-4 hover:bg-gray-100 dark:bg-gray-900">

  // Bad
  <div className="dark:bg-gray-900 gap-4 hover:bg-gray-100 flex items-center">
  ```
- Use `cn()` utility from `@/lib/utils` to merge conditional classes:
  ```tsx
  import { cn } from '@/lib/utils';

  <div className={cn("base-class", condition && "conditional-class")} />
  ```

### shadcn/ui Components

Install new components with:
```bash
npx shadcn@latest add button
```

Components install to `src/components/ui/`. Import with alias:
```tsx
import { Button } from '@/components/ui/button';
```

Configuration in `components.json`:
- Style: new-york
- Base color: zinc
- Icons: lucide-react

## Testing

No test runner is configured yet. Before pushing code:

1. Run linter: `npm run lint`
2. Manual smoke test: `npm run dev` and check affected pages
3. Build test: `npm run build` (catches type errors and build issues)

When adding tests (Vitest, Jest, Playwright):
- Place test files alongside source as `*.test.ts` or `*.test.tsx`
- Or create `src/__tests__/` directory
- Mock database with `type DB` from `src/lib/db`:
  ```typescript
  import { type DB } from '@/lib/db';

  const mockDb: Kysely<DB> = // ... create mock
  ```


## Pull Request Checklist

When creating PRs, include:

1. **Motivation**: Why is this change needed?
2. **Changes**: What was modified (schema, API routes, components)?
3. **Environment**: New env vars or config changes required?
4. **Database**: Schema changes? Link to migration or update instructions
5. **Screenshots**: For any UI changes (especially `src/app/page.tsx`)
6. **Testing**: How to verify (e.g., `npm run build && npm start`)

Link related TiDB Cloud issues if applicable.

## Security

- **Never commit credentials** - `.env.local` is gitignored for a reason
- Store secrets in `.env.local`: `DATABASE_URL`, API keys, etc.
- Check `.gitignore` before adding new config files
- The app crashes on startup without `DATABASE_URL` - this is intentional to prevent deploying without credentials

## Common Tasks

### Adding a new database table

1. Create table in TiDB Cloud
2. Update `src/lib/db/schema.d.ts`:
   ```typescript
   export interface DB {
     users: { /* existing */ };
     posts: {  // New table
       id: Generated<number>;
       title: string;
       content: string;
       user_id: number;
       created_at: Generated<Timestamp>;
     };
   }
   ```
3. Import and use with full type safety:
   ```typescript
   const posts = await db.selectFrom('posts').selectAll().execute();
   ```

### Adding a new page

1. Create `src/app/your-page/page.tsx`:
   ```tsx
   export default function YourPage() {
     return <div>Content</div>;
   }
   ```
2. Accessible at http://localhost:3000/your-page
3. Add `layout.tsx` in same directory if needed for nested layouts

### Adding an API route

1. Create `src/app/api/your-endpoint/route.ts`:
   ```typescript
   import { NextResponse } from 'next/server';
   import db from '@/lib/db';

   export async function GET() {
     const data = await db.selectFrom('users').selectAll().execute();
     return NextResponse.json(data);
   }
   ```
2. Accessible at http://localhost:3000/api/your-endpoint

### Using client-side state

Add `"use client"` directive when you need React hooks:
```tsx
"use client";

import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

## Path Aliases

Configured in `tsconfig.json`:
- `@/*` → `./src/*`

Examples:
```typescript
import db from '@/lib/db';              // src/lib/db/index.ts
import { cn } from '@/lib/utils';       // src/lib/utils.ts
import { Button } from '@/components/ui/button';  // src/components/ui/button.tsx
```

## Troubleshooting

**Build fails with "DATABASE_URL is not defined"**
- Add `DATABASE_URL=mysql://...` to `.env.local`
- Restart dev server: `npm run dev`

**TypeScript errors on database queries**
- Regenerate `src/lib/db/schema.d.ts` to match your schema
- Run `npm run build` to check all type errors

**Tailwind classes not applying**
- Check `src/app/globals.css` is imported in `layout.tsx`
- Verify class names are correct (Tailwind v4 syntax)

**shadcn component not found**
- Run `npx shadcn@latest add <component>`
- Check `components.json` aliases match your import paths
