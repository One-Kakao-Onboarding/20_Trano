import { supabase } from '../_lib/supabase.js';

/**
 * GET /api/questions
 * 설문 질문을 조회합니다.
 *
 * Query Parameters:
 *   - age: 대상 아이 개월수 (예: 12, 24, 36)
 *   - category: 발달 영역 (예: 언어, 인지, 사회성, 운동)
 */
export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const { age, category } = req.query;

    // 쿼리 빌드
    let query = supabase
      .from('questions')
      .select('*')
      .order('target_age_months', { ascending: true })
      .order('category', { ascending: true });

    // 필터 적용
    if (age) {
      query = query.eq('target_age_months', parseInt(age, 10));
    }
    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // snake_case → camelCase 변환
    const questions = data.map((q) => ({
      id: q.id,
      category: q.category,
      questionText: q.question_text,
      targetAgeMonths: q.target_age_months,
      createdAt: q.created_at
    }));

    return res.status(200).json({
      success: true,
      count: questions.length,
      data: questions
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
