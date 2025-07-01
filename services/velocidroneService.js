// services/velocidroneService.js
import fetch from 'node-fetch';

export async function fetchTrackFromAPI(trackId, simVersion, raceMode) {
  const postData = new URLSearchParams({
    track_id: trackId,
    sim_version: simVersion || '1.16',
    offset: 0,
    count: 200,
    race_mode: raceMode || 6,
    protected_track_value: 1
  }).toString();

  const response = await fetch('https://velocidrone.co.uk/api/leaderboard', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.VELOCIDRONE_API_TOKEN}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `post_data=${encodeURIComponent(postData)}`
  });

  if (!response.ok) throw new Error(`API Error: ${response.status}`);
  return await response.json();
}