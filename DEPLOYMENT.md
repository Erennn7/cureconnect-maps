# Deployment Guide for CureConnect Maps

## Environment Variables Setup

This project requires environment variables for both the client and server components.

### Client Environment Variables (client/.env)
```
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### Server Environment Variables (server/.env)
```
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
PORT=3001
IPINFO_TOKEN=your_ipinfo_token_here (optional)
```

## Vercel Deployment

### Step 1: Environment Variables in Vercel Dashboard
When deploying to Vercel, add these environment variables in your project settings:

1. **GOOGLE_MAPS_API_KEY** - For server-side API calls
2. **VITE_GOOGLE_MAPS_API_KEY** - For client-side Google Maps integration

### Step 2: Deployment Configuration
The project is configured with:
- `vercel.json` for monorepo deployment
- Separate builds for client (static) and server (serverless functions)
- CORS configured for `https://cureconnect-maps.vercel.app`

### Step 3: Project Structure
```
hospital-finder-app/
├── client/           # React frontend
│   ├── .env         # Client environment variables
│   └── package.json
├── server/          # Express backend
│   ├── .env         # Server environment variables
│   └── server.js
├── vercel.json      # Vercel deployment config
└── package.json     # Root build scripts
```

### Step 4: URLs After Deployment
- Frontend: `https://cureconnect-maps.vercel.app/`
- API: `https://cureconnect-maps.vercel.app/api/*`

## Local Development

1. Create `.env` files in both `client/` and `server/` directories
2. Add your Google Maps API key to both files
3. Run `npm run dev` from the root directory 