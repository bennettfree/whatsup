import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { getEvents } from './api/events.js';
import { getPlaces } from './api/places.js';
import { aiSearch } from './api/ai-search.js';

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
      aiSearch: '/api/ai-search'
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

app.post('/api/ai-search', (req, res) => {
  console.log('📍 POST /api/ai-search called');
  return aiSearch(req, res);
});

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Backend is running',
    endpoints: ['/api/places', '/api/events', '/api/ai-search']
  });
});

// 404 handler
app.use((req, res) => {
  console.log('❌ 404:', req.method, req.path);
  res.status(404).json({ error: 'Endpoint not found', path: req.path });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`\n🚀 API server listening on port ${PORT}`);
  console.log(`📍 Google Places API: ${process.env.GOOGLE_PLACES_API_KEY ? 'Configured ✓' : '❌ Missing'}`);
  console.log(`🎫 Ticketmaster API: ${process.env.TICKETMASTER_API_KEY ? 'Configured ✓' : '❌ Missing'}`);
  console.log(`🤖 OpenAI API: ${process.env.OPENAI_API_KEY ? 'Configured ✓' : '❌ Missing'}`);
  console.log(`\n📡 Endpoints:`);
  console.log(`   GET  http://localhost:${PORT}/api/health`);
  console.log(`   GET  http://localhost:${PORT}/api/places`);
  console.log(`   GET  http://localhost:${PORT}/api/events`);
  console.log(`   POST http://localhost:${PORT}/api/ai-search\n`);
});


