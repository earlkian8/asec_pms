export default async function handler(req, res) {
  const token = process.env.EXPO_TOKEN;
  const appId = process.env.EXPO_APP_ID;

  if (!token || !appId) {
    return res.status(500).json({ error: 'Missing server configuration' });
  }

  let response;
  try {
    response = await fetch(
      `https://api.expo.dev/v2/builds?appId=${appId}&platform=ANDROID&limit=1`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
  } catch {
    return res.status(502).json({ error: 'Failed to reach EAS API' });
  }

  if (!response.ok) {
    return res.status(502).json({ error: 'EAS API returned an error' });
  }

  const data = await response.json();
  const buildUrl = data?.data?.[0]?.artifacts?.buildUrl;

  if (!buildUrl) {
    return res.status(404).json({ error: 'No build found' });
  }

  return res.status(200).json({ url: buildUrl });
}
