import { supabase } from '../_lib/supabase.js';

/**
 * GET /api/questions
 * 모든 설문 질문을 순서대로 조회합니다.
 */
export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONS 요청 처리 (CORS preflight)
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
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .order('question_order', { ascending: true });

    if (error) {
      throw error;
    }

    // snake_case → camelCase 변환
    const questions = data.map((q) => ({
      id: q.id,
      questionOrder: q.question_order,
      originalText: q.original_text,
      easyText: q.easy_text,
      imageFilename: q.image_filename,
      correctAnswer: q.correct_answer,
      category: q.category
    }));

    return res.status(200).json({
      success: true,
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
