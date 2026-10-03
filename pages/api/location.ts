import type { NextApiRequest, NextApiResponse } from 'next';
import { parseZipLocation } from '@/lib/location/zip-location';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({error:'Use a ZIP code lookup.'}); }
  const zip = req.query.zip;
  if (typeof zip !== 'string' || !/^\d{5}$/.test(zip)) return res.status(400).json({error:'Enter a five-digit U.S. ZIP code.'});
  try {
    const response = await fetch(`https://api.zippopotam.us/us/${zip}`, {signal: AbortSignal.timeout(8000)});
    if (response.status === 404) return res.status(404).json({error:'We couldn’t find that ZIP code. Check the numbers and try again.'});
    if (!response.ok) throw new Error('lookup failed');
    const locations = parseZipLocation(await response.json());
    if (!locations.length) throw new Error('invalid response');
    return res.status(200).json({locations});
  } catch { return res.status(503).json({error:'Location search is unavailable right now. Try again or use the browser location button.'}); }
}
