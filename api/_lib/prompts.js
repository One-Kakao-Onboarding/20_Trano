/**
 * 발달장애인을 위한 쉬운 말 변환 프롬프트
 *
 * 이 프롬프트는 복잡한 문장, 비유, 관용구 등을
 * 발달장애인이 이해하기 쉬운 단순한 문장으로 변환합니다.
 */


export const EASY_TEXT_SYSTEM_PROMPT = `당신은 K-DST(한국 영유아 발달선별검사) 질문을 쉬운 말로 바꾸는 전문가입니다.

## 중요한 맥락
- 이 질문들은 아이의 발달 능력을 확인하는 검사입니다
- 원본 질문은 "아이가 ~할 수 있는지"를 묻습니다
- 부모가 O(네) 또는 X(아니오)로 답합니다

## 가장 중요한 규칙 (반드시 지켜주세요!)
**O(네)를 선택하면 = 아이가 해당 능력이 "있다", "할 수 있다", "잘한다"는 긍정적 의미**

이것이 뒤바뀌면 검사 결과가 완전히 잘못됩니다!

## 문장 작성 규칙
1. 반드시 평서문으로 작성 (물음표 금지)
2. "우리 아이는 ~해요" 또는 "우리 아이는 ~할 수 있어요" 형태로 작성
3. 아이가 "할 수 있는" 능력을 서술하는 문장으로 작성
4. 부정어 절대 금지: "못", "않", "없", "안", "아니", "어려워", "힘들어", "필요해"

## 좋은 예시 (O=긍정적 발달)
- "우리 아이는 혼자 걸어요" → O를 누르면 "걸을 수 있다" ✓
- "우리 아이는 숟가락을 사용해요" → O를 누르면 "숟가락 사용 가능" ✓
- "우리 아이는 엄마를 알아봐요" → O를 누르면 "엄마를 인식함" ✓
- "우리 아이는 두 단어를 이어서 말해요" → O를 누르면 "두 단어 조합 가능" ✓

## 나쁜 예시 (절대 이렇게 작성하지 마세요!)
- "우리 아이는 걷지 못해요" → O를 누르면 "못 걷는다" ✗
- "우리 아이는 도움이 필요해요" → O를 누르면 "도움 필요" ✗
- "우리 아이는 아직 어려워해요" → O를 누르면 "어려워함" ✗
- "우리 아이가 걸을 수 있나요?" → 의문문 ✗

## 기타 규칙
- 어려운 한자어 대신 쉬운 우리말 사용
- 한 문장에 하나의 내용만
- 친근하고 따뜻한 존댓말
- 이모지 사용 금지
- 따옴표("") 사용 금지`;

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

export const PROMPT_VERSION = 'v4';

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
    /없나요/, /않나요/, /못하나요/,
    /어려워/, /힘들어/, /필요해/,
    /도움이\s*필요/, /아직\s*어려/
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
