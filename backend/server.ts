import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { getEvents } from './api/events';
import { getPlaces } from './api/places';
import { aiSearch } from './api/ai-search';
import { searchHandler } from './api/search';
import { getPlacePhoto } from './api/place-photo';
import os from 'os';

const app = express();

app.use(cors());
app.use(express.json());

// Root route for debugging
app.get('/', (req, res) => {
  res.json({ 
    message: 'WhatsUp API Server',
    status: 'running',
    endpoints: {
      health: '/api/health',
      places: '/api/places',
      events: '/api/events',
      aiSearch: '/api/ai-search',
      search: '/api/search'
    }
  });
});

// Debug: Log what was imported
console.log('Imported functions:', {
  getEvents: typeof getEvents,
  getPlaces: typeof getPlaces,
  aiSearch: typeof aiSearch
});

// Register routes
app.get('/api/events', (req, res) => {
  console.log('📍 GET /api/events called');
  return getEvents(req, res);
});

app.get('/api/places', (req, res) => {
  console.log('📍 GET /api/places called');
  return getPlaces(req, res);
});

app.get('/api/place-photo', (req, res) => {
  return getPlacePhoto(req, res);
});

app.post('/api/ai-search', (req, res) => {
  console.log('📍 POST /api/ai-search called');
  return aiSearch(req, res);
});

app.post('/api/search', async (req, res) => {
  console.log('📍 POST /api/search called');
  return searchHandler(req, res);
});

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Backend is running',
    endpoints: ['/api/places', '/api/place-photo', '/api/events', '/api/ai-search', '/api/search']
  });
});

// 404 handler
app.use((req, res) => {
  console.log('❌ 404:', req.method, req.path);
  res.status(404).json({ error: 'Endpoint not found', path: req.path });
});

const PORT = process.env.PORT || 4000;

// Bind to all interfaces so other devices on the LAN can reach the API.
const HOST = process.env.HOST || '0.0.0.0';

app.listen(Number(PORT), HOST, () => {
  console.log(`\n🚀 API server listening on port ${PORT}`);
  console.log(`📍 Google Places API: ${process.env.GOOGLE_PLACES_API_KEY ? 'Configured ✓' : '❌ Missing'}`);
  console.log(`🎫 Ticketmaster API: ${process.env.TICKETMASTER_API_KEY ? 'Configured ✓' : '❌ Missing'}`);
  console.log(`🤖 OpenAI API: ${process.env.OPENAI_API_KEY ? 'Configured ✓' : '❌ Missing'}`);
  console.log(`\n📡 Endpoints:`);
  console.log(`   GET  http://localhost:${PORT}/api/health`);
  console.log(`   GET  http://localhost:${PORT}/api/places`);
  console.log(`   GET  http://localhost:${PORT}/api/events`);
  console.log(`   POST http://localhost:${PORT}/api/ai-search`);

  // Helpful for phone testing: print LAN IPs.
  try {
    const ifaces = os.networkInterfaces();
    const ips: string[] = [];
    for (const name of Object.keys(ifaces)) {
      for (const addr of ifaces[name] ?? []) {
        if (addr.family === 'IPv4' && !addr.internal) ips.push(addr.address);
      }
    }
    if (ips.length) {
      console.log(`\n📱 Try from your phone (same Wi‑Fi):`);
      for (const ip of ips) console.log(`   GET  http://${ip}:${PORT}/api/health`);
    }
  } catch {}

  console.log('');
});


