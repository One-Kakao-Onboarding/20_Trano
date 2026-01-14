import { supabase } from '../_lib/supabase.js';
import { openai } from '../_lib/openai.js';
import { buildMessages, PROMPT_VERSION } from '../_lib/prompts.js';

/**
 * GPT API로 텍스트를 쉬운 말로 변환합니다.
 * @param {string} originalText - 원본 텍스트
 * @returns {Promise<string>} 변환된 쉬운 텍스트
 */
async function convertToEasyText(originalText) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: buildMessages(originalText),
    max_tokens: 300,
    temperature: 0.7
  });

  return completion.choices[0].message.content.trim();
}

/**
 * GET /api/questions/easy
 * GPT로 변환된 쉬운 버전 질문을 조회합니다.
 * 캐시가 있으면 캐시에서 반환하고, 없으면 GPT로 변환 후 캐시에 저장합니다.
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
    // 1. 모든 질문 조회
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .order('question_order', { ascending: true });

    if (questionsError) {
      throw questionsError;
    }

    // 2. 캐시된 쉬운 텍스트 조회
    const questionIds = questions.map((q) => q.id);
    const { data: cachedTexts, error: cacheError } = await supabase
      .from('easy_text_cache')
      .select('question_id, easy_text')
      .in('question_id', questionIds)
      .eq('prompt_version', PROMPT_VERSION);

    if (cacheError) {
      console.warn('Cache fetch warning:', cacheError);
    }

    // 캐시 맵 생성
    const cacheMap = new Map(
      (cachedTexts || []).map((c) => [c.question_id, c.easy_text])
    );

    // 3. 각 질문에 대해 캐시 확인 또는 GPT 변환
    const results = await Promise.all(
      questions.map(async (q) => {
        let easyText = cacheMap.get(q.id);
        let fromCache = true;

        // 캐시에 없으면 GPT로 변환
        if (!easyText) {
          fromCache = false;
          try {
            easyText = await convertToEasyText(q.original_text);

            // 캐시에 저장 (실패해도 계속 진행)
            await supabase.from('easy_text_cache').upsert(
              {
                question_id: q.id,
                original_text: q.original_text,
                easy_text: easyText,
                gpt_model: 'gpt-4',
                prompt_version: PROMPT_VERSION
              },
              { onConflict: 'question_id,prompt_version' }
            );
          } catch (gptError) {
            console.error(`GPT conversion failed for question ${q.id}:`, gptError);
            // GPT 실패 시 원본 텍스트 사용
            easyText = q.original_text;
          }
        }

        return {
          id: q.id,
          questionOrder: q.question_order,
          originalText: q.original_text,
          easyText: easyText,
          imageFilename: q.image_filename,
          correctAnswer: q.correct_answer,
          category: q.category,
          fromCache: fromCache
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
