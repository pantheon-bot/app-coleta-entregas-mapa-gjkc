# Cliente-Coletor Platform

A real-time ride-sharing platform connecting Clients (Clientes) with Collectors (Coletores), built with Next.js 16, TiDB Cloud, and Leaflet maps.

## Overview

This platform enables:
- **Clientes (Clients)**: Request pickup and delivery services from available collectors
- **Coletores (Collectors)**: Receive, accept/decline requests, and perform two-phase trips (pickup + delivery)

## Tech Stack

- **Next.js 16** with App Router and React Server Components
- **TiDB Cloud Serverless** (MySQL-compatible database)
- **Kysely** - Type-safe SQL query builder
- **Leaflet** - Interactive maps with real-time location tracking
- **shadcn/ui** - UI components
- **Tailwind CSS** - Styling

## Prerequisites

- Node.js 18+
- TiDB Cloud account with a Serverless cluster
- Modern web browser with geolocation support

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
DATABASE_URL=mysql://[user]:[password]@[host]/[database]
```

Get your `DATABASE_URL` from the TiDB Cloud dashboard.

**Important**: Never commit `.env.local` to version control.

### 3. Run Database Migrations

Create the database tables:

```bash
npm run migrate
```

This will create:
- `users` - Stores both Clientes and Coletores
- `sessions` - Session management
- `rides` - Ride requests and their lifecycle

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Testing the Application

### Test Flow Overview

To test the complete flow, you'll need to simulate both a Cliente and a Coletor. The easiest way is to use two different browsers or browser profiles.

### Step 1: Create a Coletor (Collector)

1. Open [http://localhost:3000](http://localhost:3000)
2. You'll be redirected to the login page
3. Enter a phone number (e.g., `+55 11 98888-8888`)
4. Optionally enter a name (e.g., "João Coletor")
5. Click the **"Coletor"** button to select the collector role
6. Click **"Entrar"**
7. Allow geolocation access when prompted
8. You should see the Coletor dashboard with:
   - "Aguardando solicitações..." message
   - A map showing your current location
   - You're now visible to clients!

**Keep this browser window open.**

### Step 2: Create a Cliente (Client)

1. Open a **second browser** or **incognito/private window**
2. Go to [http://localhost:3000](http://localhost:3000)
3. Enter a different phone number (e.g., `+55 11 99999-9999`)
4. Optionally enter a name (e.g., "Maria Cliente")
5. Click the **"Cliente"** button to select the client role
6. Click **"Entrar"**
7. Allow geolocation access when prompted
8. You should see the Cliente dashboard with:
   - A list of available collectors (including the one you just created)
   - An input for destination address
   - A map showing your location and available collectors

### Step 3: Request a Ride (Cliente)

1. In the **Cliente window**:
   - Click on the collector you created earlier (should show as a button with 🚗)
   - Enter a destination address (e.g., "Av. Paulista, 1000")
   - Click **"Solicitar Corrida"**
2. You should see:
   - The form is replaced with "Corrida Atual" card
   - Status shows "⏳ Aguardando aceitação"

### Step 4: Accept the Ride (Coletor)

1. Switch to the **Coletor window**
2. You should see/hear:
   - A notification sound (🔔)
   - "Solicitações Pendentes" card appears
   - Client information and destination
3. Click **"✅ Aceitar"**
4. The ride status changes to "✅ Aceito - Indo para cliente"

### Step 5: Navigate Through Ride Phases (Coletor)

In the **Coletor window**, you'll see phase action buttons:

1. **Phase 1 - Going to Client:**
   - Status: "✅ Aceito - Indo para cliente"
   - Click **"📍 Cheguei no Local"** when ready

2. **Phase 2 - At Client Location:**
   - Status: "📍 No local do cliente"
   - Click **"🚗 Iniciar Entrega"**

3. **Phase 3 - Delivering:**
   - Status: "🚗 A caminho do destino"
   - Click **"✅ Viagem Concluída"**

4. **Completed:**
   - The ride disappears from active rides
   - Coletor is ready for new requests

### Step 6: Monitor in Real-Time (Cliente)

1. Switch to the **Cliente window** throughout the process
2. The status updates automatically (polls every 3 seconds):
   - "✅ Aceito - Coletor a caminho"
   - "📍 Coletor chegou"
   - "🚗 Em rota para destino"
   - "✅ Concluída"
3. The map shows the collector's location updating in real-time

### Step 7: Test Multiple Scenarios

**Reject a Ride:**
1. Create a new ride request (Cliente)
2. In Coletor window, click **"❌ Recusar"**
3. The ride disappears from pending

**Multiple Collectors:**
1. Open a third browser/profile
2. Create another Coletor with a different phone number
3. Both collectors should appear on the Cliente's map

**Location Updates:**
1. The app uses browser geolocation
2. If you move (or simulate movement), locations update automatically
3. Updates happen every 5 seconds for Coletores

## Features Implemented

### ✅ Authentication
- Phone-based login with role selection (CLIENTE or COLETOR)
- Session management with HTTP-only cookies
- Placeholder for WhatsApp verification (simulated in this MVP)

### ✅ Real-time Location
- Browser Geolocation API for position detection
- Automatic location updates to server
- Live location tracking on map

### ✅ Cliente Flow
- View available collectors on map
- Select collector and enter destination
- Request ride
- Monitor ride status with polling
- Real-time status updates (every 3 seconds)

### ✅ Coletor Flow
- Receive ride requests with sound notification
- Accept or decline requests
- Navigate through ride phases:
  1. **ACCEPTED** → Going to client
  2. **AT_CLIENT** → Arrived at client location
  3. **DELIVERING** → Delivering to destination
  4. **COMPLETED** → Trip completed
- Location updates every 5 seconds

### ✅ Interactive Maps
- Leaflet-based mapping
- Custom markers for clients, collectors, and destinations
- Auto-centering and zoom
- Real-time position updates

### ✅ Ride State Machine
- `PENDING` - Awaiting collector decision
- `ACCEPTED` - Collector accepted, Phase 1
- `AT_CLIENT` - Arrived at client
- `DELIVERING` - Phase 2, en route to destination
- `COMPLETED` - Trip finished
- `REJECTED` - Collector declined
- `CANCELLED` - Trip cancelled

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with phone and role
- `POST /api/auth/logout` - Logout and clear session
- `GET /api/auth/me` - Get current user

### Rides
- `GET /api/rides` - List rides for current user
- `POST /api/rides` - Create new ride request (Cliente only)
- `PATCH /api/rides/[id]` - Update ride status (actions: accept, reject, arrive_at_client, start_delivery, complete, cancel)

### Users & Location
- `GET /api/collectors` - Get available collectors
- `POST /api/location` - Update user location

## Database Schema

### `users`
- Stores both Clientes and Coletores
- Tracks current location and availability
- Role-based access control

### `sessions`
- Simple session management
- 30-day expiration

### `rides`
- Complete ride lifecycle tracking
- Origin and destination coordinates
- Timestamps for each phase
- Foreign keys to client and collector

## Project Structure

```
src/
├── app/
│   ├── api/           # API routes
│   │   ├── auth/      # Authentication endpoints
│   │   ├── rides/     # Ride management
│   │   ├── collectors/# Collector listing
│   │   └── location/  # Location updates
│   ├── cliente/       # Cliente dashboard
│   ├── coletor/       # Coletor dashboard
│   ├── login/         # Login page
│   └── page.tsx       # Root page (redirect logic)
├── components/
│   ├── ui/            # shadcn/ui components
│   └── map.tsx        # Leaflet map wrapper
└── lib/
    ├── auth.ts        # Authentication utilities
    ├── db/            # Database layer
    │   ├── db.ts      # Kysely instance
    │   ├── schema.d.ts# TypeScript types
    │   └── index.ts   # Exports
    └── utils.ts       # Utility functions
```

## Known Limitations (MVP)

This is a minimal viable product. The following features are **not yet implemented**:

- ❌ Real WhatsApp verification (placeholder only)
- ❌ WebSocket for true real-time updates (using polling instead)
- ❌ Turn-by-turn navigation
- ❌ Geocoding for destination addresses (coordinates not resolved)
- ❌ Distance/time estimates
- ❌ Payment processing
- ❌ Rating system
- ❌ Ride history
- ❌ Push notifications
- ❌ Admin dashboard

## Troubleshooting

**Build fails with "DATABASE_URL is not defined"**
- Ensure `.env.local` exists with valid `DATABASE_URL`
- Restart dev server: `npm run dev`

**"Geolocation not available"**
- Use HTTPS in production (required for geolocation)
- In development, allow geolocation in browser settings
- Chrome/Edge: Use `http://localhost:3000` (not IP address)

**No collectors showing up**
- Ensure at least one user is logged in as COLETOR
- Check that geolocation is enabled
- Verify collector's location is being updated (check browser console)

**Database connection errors**
- Verify `DATABASE_URL` format: `mysql://user:password@host/database`
- Ensure TiDB cluster is running
- Check TLS 1.2+ support

**Map not loading**
- Check browser console for errors
- Ensure internet connection (Leaflet loads tiles from OpenStreetMap)
- Verify no ad blockers interfering with tile requests

## Next Steps for Production

1. **WhatsApp Integration**: Implement real WhatsApp verification API
2. **WebSocket Server**: Replace polling with WebSocket for real-time updates
3. **Geocoding**: Integrate Google Maps or Mapbox Geocoding API
4. **Navigation**: Add turn-by-turn directions
5. **Security**: Rate limiting, input validation, SQL injection protection
6. **Testing**: Add unit tests, integration tests, E2E tests
7. **Monitoring**: Error tracking, performance monitoring
8. **Deployment**: Configure for production environment

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [TiDB Cloud](https://docs.pingcap.com/tidbcloud/)
- [Kysely](https://kysely.dev/)
- [Leaflet](https://leafletjs.com/)
- [shadcn/ui](https://ui.shadcn.com/)
