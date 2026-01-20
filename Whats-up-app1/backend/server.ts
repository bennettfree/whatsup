import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { getEvents } from './api/events';
import { getPlaces } from './api/places';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/events', getEvents);
app.get('/api/places', getPlaces);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`API server listening on port ${PORT}`);
});


