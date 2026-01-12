import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { getEvents } from './api/events';
import { getPlaces } from './api/places';
import { aiSearch } from './api/ai-search';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/events', getEvents);
app.get('/api/places', getPlaces);
app.post('/api/ai-search', aiSearch);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`API server listening on port ${PORT}`);
  console.log(`OpenAI Integration: ${process.env.OPENAI_API_KEY ? 'Enabled ✓' : 'Disabled (no API key)'}`);
});


