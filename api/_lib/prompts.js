/**
 * 발달장애인을 위한 쉬운 말 변환 프롬프트
 *
 * 이 프롬프트는 복잡한 문장, 비유, 관용구 등을
 * 발달장애인이 이해하기 쉬운 단순한 문장으로 변환합니다.
 */


export const EASY_TEXT_SYSTEM_PROMPT = `당신은 발달장애인이 이해하기 쉬운 언어로 글을 바꿔주는 전문가입니다.

다음 규칙을 반드시 따라주세요:

1. 문장 구조
   - 한 문장에 하나의 내용만 담기
   - 문장을 짧게 나누기 (20자 이내 권장)
   - 주어-목적어-서술어 순서로 명확하게

2. 단어 선택
   - 어려운 한자어 대신 쉬운 우리말 사용
   - 추상적인 단어보다 구체적인 단어 사용
   - 전문 용어는 일상 용어로 바꾸기

3. 비유/관용구 처리
   - 비유적 표현은 직접적인 의미로 풀어서 설명
   - 관용구는 실제 의미를 괄호로 덧붙이기
   - "~처럼", "~같이" 등의 비유는 실제 설명으로 대체

4. 말투
   - 친근하고 따뜻한 말투 사용
   - 존댓말 사용
   - 격려하는 톤 유지

5. 형식 (매우 중요!)
   - 반드시 평서문으로 작성 (의문문 금지)
   - O/X로 답할 수 있는 형태 유지
   - 반드시 긍정형 문장으로 작성
   - "O(네)"를 선택하면 아이가 해당 능력이 있다는 긍정적 의미가 되어야 함
   - 부정어 사용 금지: "못", "않", "없", "안", "아니" 등 절대 사용하지 않기
   - 이모지는 사용하지 않기

예시:
- 좋은 예: "우리 아이는 혼자 걸어요" (O=걸을 수 있음)
- 나쁜 예: "우리 아이는 걷지 못해요" (O=못 걸음 - 부정적)
- 나쁜 예: "우리 아이가 걸을 수 있나요?" (의문문 - 금지)`;

export const EASY_TEXT_USER_PROMPT = `다음 질문을 발달장애인이 이해하기 쉬운 말로 바꿔주세요.
질문의 의미와 정답은 변하지 않아야 합니다.

원본 질문:
{original_text}

쉬운 말로 바꾼 질문:`;

/**
 * GPT에 보낼 프롬프트를 생성합니다.
 * @param {string} originalText - 원본 질문 텍스트
 * @returns {Array} OpenAI 메시지 배열
 */
export function buildMessages(originalText) {
  return [
    { role: 'system', content: EASY_TEXT_SYSTEM_PROMPT },
    { role: 'user', content: EASY_TEXT_USER_PROMPT.replace('{original_text}', originalText) }
  ];
}

export const PROMPT_VERSION = 'v2';

/**
 * 변환된 텍스트의 유효성을 검사합니다.
 * @param {string} text - 검사할 텍스트
 * @returns {{ isValid: boolean, errors: string[] }} 유효성 검사 결과
 */
export function validateEasyText(text) {
  const errors = [];

  // 부정어 패턴 체크
  const negativePatterns = [
    /못\s*해/, /못\s*하/, /못\s*합니다/,
    /않아/, /않습니다/, /않았/,
    /없어/, /없습니다/, /없었/,
    /안\s*해/, /안\s*하/, /안\s*합니다/,
    /아니에요/, /아닙니다/,
    /모르/, /모릅니다/,
    /못해요/, /못합니다/,
    /없나요/, /않나요/, /못하나요/
  ];

  for (const pattern of negativePatterns) {
    if (pattern.test(text)) {
      errors.push(`부정어 포함: "${text.match(pattern)?.[0]}"`);
      break;
    }
  }

  // 의문문 체크 (물음표로 끝나는지)
  if (text.trim().endsWith('?')) {
    errors.push('의문문 형식 (물음표로 끝남)');
  }

  // 의문형 어미 체크
  const questionPatterns = [
    /할까요\??$/, /할 수 있나요\??$/, /하나요\??$/,
    /인가요\??$/, /인지요\??$/, /일까요\??$/,
    /있나요\??$/, /없나요\??$/, /됐나요\??$/
  ];

  for (const pattern of questionPatterns) {
    if (pattern.test(text.trim())) {
      errors.push('의문형 어미 사용');
      break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 재생성 요청을 위한 프롬프트를 생성합니다.
 * @param {string} originalText - 원본 텍스트
 * @param {string} invalidText - 유효하지 않은 변환 텍스트
 * @param {string[]} errors - 발생한 오류 목록
 * @returns {Array} OpenAI 메시지 배열
 */
export function buildRetryMessages(originalText, invalidText, errors) {
  return [
    { role: 'system', content: EASY_TEXT_SYSTEM_PROMPT },
    { role: 'user', content: EASY_TEXT_USER_PROMPT.replace('{original_text}', originalText) },
    { role: 'assistant', content: invalidText },
    {
      role: 'user',
      content: `위 변환 결과에 문제가 있습니다:
${errors.map(e => `- ${e}`).join('\n')}

다시 변환해주세요. 반드시:
1. 평서문으로 작성 (물음표 금지)
2. 긍정형 문장으로 작성 (부정어 금지)
3. "O(네)"를 선택하면 긍정적인 의미가 되도록

쉬운 말로 바꾼 질문:`
    }
  ];
}
