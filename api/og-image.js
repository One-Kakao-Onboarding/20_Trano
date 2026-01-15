/**
 * GET /api/og-image?url=...
 * 외부 URL에서 OG(Open Graph) 이미지를 가져옵니다.
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ success: false, error: 'URL is required' });
  }

  try {
    // URL fetch
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
      },
      redirect: 'follow'
    });

    const html = await response.text();

    // OG 이미지 추출
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);

    if (ogImageMatch && ogImageMatch[1]) {
      return res.status(200).json({
        success: true,
        ogImage: ogImageMatch[1]
      });
    }

    // OG 이미지가 없으면 일반 이미지 찾기
    const imgMatch = html.match(/<img[^>]*src=["']([^"']+)["']/i);

    return res.status(200).json({
      success: true,
      ogImage: imgMatch ? imgMatch[1] : null
    });

  } catch (error) {
    console.error('OG Image fetch error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
