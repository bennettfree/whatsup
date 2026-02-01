import type { Request, Response } from 'express';
import axios from 'axios';

/**
 * GET /api/place-photo
 *
 * Proxies Google Place Photos (New) by:
 * 1) Calling Places Photos (New) with skipHttpRedirect=true
 * 2) Redirecting the client to the returned `photoUri` (googleusercontent)
 *
 * This keeps the Google API key server-side (not exposed in client bundle).
 */
export async function getPlacePhoto(req: Request, res: Response) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey || apiKey === 'your_key_here' || apiKey.length < 10) {
    return res.status(503).json({ error: 'Google Places API key not configured' });
  }

  const nameRaw = typeof req.query.name === 'string' ? req.query.name : '';
  // Expected: places/PLACE_ID/photos/PHOTO_RESOURCE (optionally with /media already appended)
  const name = nameRaw.trim();
  if (!/^places\/[^/]+\/photos\/[^/]+(?:\/media)?$/.test(name)) {
    return res.status(400).json({ error: 'Invalid photo name' });
  }

  const maxWidthPx = Number(req.query.maxWidthPx ?? 800);
  const maxHeightPx = Number(req.query.maxHeightPx ?? 800);
  const width = Number.isFinite(maxWidthPx) ? Math.max(1, Math.min(4800, Math.round(maxWidthPx))) : 800;
  const height = Number.isFinite(maxHeightPx) ? Math.max(1, Math.min(4800, Math.round(maxHeightPx))) : 800;

  try {
    const mediaName = name.endsWith('/media') ? name : `${name}/media`;
    const url = `https://places.googleapis.com/v1/${encodeURI(mediaName)}`;

    const { data } = await axios.get<{ photoUri?: string }>(url, {
      params: {
        maxWidthPx: width,
        maxHeightPx: height,
        skipHttpRedirect: true,
      },
      headers: {
        // Places API (New) uses this header for API key auth.
        'X-Goog-Api-Key': apiKey,
        // We only need the short-lived photoUri.
        'X-Goog-FieldMask': 'photoUri',
      },
      timeout: 8000,
    });

    const photoUri = typeof data?.photoUri === 'string' ? data.photoUri : '';
    if (!photoUri) {
      return res.status(404).json({ error: 'Photo not available' });
    }

    // Ensure scheme for `//lh3.googleusercontent.com/...`
    const redirectTo = photoUri.startsWith('//') ? `https:${photoUri}` : photoUri;
    return res.redirect(302, redirectTo);
  } catch (err: any) {
    // Don't leak key or internal errors; return a safe 404/502 style response.
    const status = err?.response?.status;
    if (status === 404 || status === 400) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    return res.status(502).json({ error: 'Photo proxy failed' });
  }
}

