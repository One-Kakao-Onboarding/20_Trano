/**
 * GET /api/hospitals/nearby?lat=...&lng=...
 * 카카오 로컬 API를 사용하여 주변 소아과 정보를 가져옵니다.
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

  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ success: false, error: 'lat and lng are required' });
  }

  const KAKAO_API_KEY = process.env.KAKAO_REST_API_KEY;

  if (!KAKAO_API_KEY) {
    return res.status(500).json({ success: false, error: 'Kakao API key not configured' });
  }

  try {
    // 카카오 로컬 API - 키워드로 장소 검색
    const response = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?query=소아과&x=${lng}&y=${lat}&radius=5000&sort=distance`,
      {
        headers: {
          'Authorization': `KakaoAK ${KAKAO_API_KEY}`
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Kakao API error');
    }

    // 상위 3개만 반환
    const hospitals = data.documents.slice(0, 3).map(place => ({
      name: place.place_name,
      address: place.road_address_name || place.address_name,
      phone: place.phone || '전화번호 없음',
      distance: place.distance,
      url: place.place_url
    }));

    return res.status(200).json({
      success: true,
      hospitals
    });

  } catch (error) {
    console.error('Hospital search error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
