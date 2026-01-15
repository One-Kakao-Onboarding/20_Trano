import { supabase } from '../_lib/supabase.js';
import { openai } from '../_lib/openai.js';
import { buildMessages, buildRetryMessages, validateEasyText, PROMPT_VERSION } from '../_lib/prompts.js';

const MAX_RETRY_COUNT = 2;

/**
 * GPT API로 텍스트를 쉬운 말로 변환합니다.
 * 유효성 검사 실패 시 최대 MAX_RETRY_COUNT번 재시도합니다.
 * @param {string} originalText - 원본 텍스트
 * @returns {Promise<{text: string, validationPassed: boolean}>} 변환 결과
 */
async function convertToEasyText(originalText) {
  // 첫 번째 시도
  let completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: buildMessages(originalText),
    max_tokens: 300,
    temperature: 0.7
  });

  let easyText = completion.choices[0].message.content.trim();
  let validation = validateEasyText(easyText);

  // 유효성 검사 통과 시 바로 반환
  if (validation.isValid) {
    console.log(`✅ 유효성 검사 통과: "${easyText.substring(0, 30)}..."`);
    return { text: easyText, validationPassed: true };
  }

  // 재시도 로직
  for (let retry = 1; retry <= MAX_RETRY_COUNT; retry++) {
    console.log(`⚠️ 유효성 검사 실패 (시도 ${retry}/${MAX_RETRY_COUNT}): ${validation.errors.join(', ')}`);
    console.log(`   원본: "${easyText}"`);

    completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: buildRetryMessages(originalText, easyText, validation.errors),
      max_tokens: 300,
      temperature: 0.5 // 재시도 시 더 일관된 결과를 위해 낮춤
    });

    easyText = completion.choices[0].message.content.trim();
    validation = validateEasyText(easyText);

    if (validation.isValid) {
      console.log(`✅ 재시도 ${retry}회 후 유효성 검사 통과: "${easyText.substring(0, 30)}..."`);
      return { text: easyText, validationPassed: true };
    }
  }

  // 최대 재시도 후에도 실패하면 마지막 결과 반환 (경고와 함께)
  console.warn(`❌ 최대 재시도 후에도 유효성 검사 실패: ${validation.errors.join(', ')}`);
  console.warn(`   최종 텍스트: "${easyText}"`);
  return { text: easyText, validationPassed: false };
}

/**
 * GET /api/questions/easy
 * GPT로 변환된 쉬운 버전 질문을 조회합니다.
 * 캐시가 있으면 캐시에서 반환하고, 없으면 GPT로 변환 후 캐시에 저장합니다.
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
    const { age, category, limit } = req.query;
    const limitPerCategory = limit ? parseInt(limit, 10) : null;

    let questions = [];

    // limit 파라미터가 있으면 각 영역별로 N개씩 가져오기
    if (age && limitPerCategory && !category) {
      const categories = ['gross_motor', 'fine_motor', 'cognition', 'language', 'social'];

      for (const cat of categories) {
        const { data, error } = await supabase
          .from('questions')
          .select('*')
          .eq('target_age_months', parseInt(age, 10))
          .eq('category', cat)
          .limit(limitPerCategory);

        if (error) {
          console.warn(`Category ${cat} fetch warning:`, error);
          continue;
        }
        if (data) {
          questions.push(...data);
        }
      }
    } else {
      // 기존 로직: 일반 조회
      let query = supabase
        .from('questions')
        .select('*')
        .order('target_age_months', { ascending: true })
        .order('category', { ascending: true });

      if (age) {
        query = query.eq('target_age_months', parseInt(age, 10));
      }
      if (category) {
        query = query.eq('category', category);
      }

      const { data, error: questionsError } = await query;

      if (questionsError) {
        throw questionsError;
      }
      questions = data || [];
    }

    if (questions.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
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
        let validationPassed = true;
        if (!easyText) {
          fromCache = false;
          try {
            const result = await convertToEasyText(q.question_text);
            easyText = result.text;
            validationPassed = result.validationPassed;

            // 유효성 검사 통과한 경우에만 캐시에 저장
            if (validationPassed) {
              await supabase.from('easy_text_cache').upsert(
                {
                  question_id: q.id,
                  original_text: q.question_text,
                  easy_text: easyText,
                  gpt_model: 'gpt-4',
                  prompt_version: PROMPT_VERSION
                },
                { onConflict: 'question_id,prompt_version' }
              );
            }
          } catch (gptError) {
            console.error(`GPT conversion failed for question ${q.id}:`, gptError);
            // GPT 실패 시 원본 텍스트 사용
            easyText = q.question_text;
            validationPassed = false;
          }
        }

        return {
          id: q.id,
          category: q.category,
          questionText: q.question_text,
          easyText: easyText,
          targetAgeMonths: q.target_age_months,
          fromCache: fromCache,
          validationPassed: validationPassed
        };
      })
    );

    return res.status(200).json({
      success: true,
      count: results.length,
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
