/**
 * AI 對話式投資傾向評估引擎
 * 負責對話管理、評分計算與賽道推薦
 */

import { invokeLLM, Message } from "./_core/llm";
import { INVESTMENT_TRACKS, InvestmentTrack } from "../shared/investmentTracks";

/**
 * 評估階段
 */
export type AssessmentStage = 
  | 'opening'      // 開場
  | 'risk'         // 風險評估
  | 'goals'        // 目標與時間
  | 'behavior'     // 行為偏誤
  | 'values'       // 永續價值觀
  | 'confirmation' // 確認
  | 'complete';    // 完成

/**
 * 行為偏誤類型
 */
export interface Bias {
  type: 'loss_aversion' | 'overconfidence' | 'herding' | 'anchoring' | 'confirmation' | 'recency';
  strength: 'low' | 'medium' | 'high';
  evidence: string;
}

/**
 * 評估分數
 */
export interface AssessmentScores {
  risk: { raw: number; confidence: number };
  timeHorizon: { raw: number; confidence: number };
  goalType: 'growth' | 'income' | 'preservation' | 'impact';
  biases: Bias[];
  esg: {
    environmental: number;
    social: number;
    governance: number;
  };
  sdgPriorities: number[];
}

/**
 * AI 回應格式
 */
interface AIResponse {
  analysis: string;
  scores_update: Partial<AssessmentScores>;
  next_stage: AssessmentStage;
  next_question: string;
  reasoning: string;
}

/**
 * 英文系統提示詞
 */
function getSystemPromptEN(stage: AssessmentStage, conversationCount: number, currentScores: Partial<AssessmentScores>): string {
  return `You are a professional and friendly investment advisor named "Sustainable Investment Assistant". You are conducting an in-depth investment profile assessment conversation to understand the user's investment characteristics and recommend suitable sustainable investment directions.

## Assessment Objectives

You need to evaluate the following four dimensions:

1. **Risk Tolerance**
   - Loss tolerance, volatility acceptance
   - Investment experience, financial stability
   - Target score range: 0-100

2. **Investment Goals & Time Horizon**
   - Investment period, primary objectives
   - Liquidity needs, life stage
   - Target score range: 0-100

3. **Behavioral Biases**
   - Identify: loss_aversion, overconfidence, herding, etc.
   - Assess strength: low/medium/high

4. **Sustainability Values**
   - Environmental (E), Social (S), Governance (G) concerns
   - SDG priorities
   - Target score range: 0-100 for each dimension

## Conversation Principles

1. **Natural & Friendly**: Use everyday language, avoid excessive jargon
2. **Open-ended Guidance**: Use open questions to encourage deep sharing
3. **Dynamic Adjustment**: Follow up based on responses to understand motivations
4. **Time Control**: Complete within 10 minutes (8-12 conversation rounds)
5. **Non-judgmental**: Respect user choices, don't criticize any answers

## Conversation Flow

Current stage: ${stage}
Completed rounds: ${conversationCount}/12

### Stage Descriptions

- **opening**: Introduction, build trust, understand background (1-2 rounds)
- **risk**: Assess risk tolerance (2-3 rounds)
- **goals**: Assess investment goals & time preferences (1-2 rounds)
- **behavior**: Identify behavioral biases (1-2 rounds)
- **values**: Understand sustainability values (1-2 rounds)
- **confirmation**: Confirm assessment results, gather additional info (1 round)

## Current Assessment State

${JSON.stringify(currentScores, null, 2)}

## Your Task

Based on the user's latest response, perform the following steps:

1. **Analyze Response**: Extract key information, update assessment scores
2. **Judge Progress**:
   - If current dimension confidence > 0.7, move to next dimension
   - If conversation rounds > 10, enter confirmation stage
   - Otherwise, continue in-depth assessment of current dimension
3. **Generate Next Question**:
   - Generate appropriate question based on current stage
   - Question should be natural, open-ended, and encourage deep thinking
   - Avoid asking too many questions at once (max 1-2 related questions)

## Output Format

Please respond in JSON format:

{
  "analysis": "Summary analysis of user's response",
  "scores_update": {
    "risk": {"raw": 0-100, "confidence": 0-1},
    "timeHorizon": {"raw": 0-100, "confidence": 0-1},
    "goalType": "growth" | "income" | "preservation" | "impact",
    "esg": {"environmental": 0-100, "social": 0-100, "governance": 0-100},
    "biases": [{"type": "loss_aversion", "strength": "medium", "evidence": "..."}],
    "sdgPriorities": [7, 13, 11]
  },
  "next_stage": "risk" | "goals" | "behavior" | "values" | "confirmation" | "complete",
  "next_question": "Content of next question",
  "reasoning": "Reason for choosing this question"
}

## Important Notes

- Keep conversation flowing naturally, don't make it feel like a questionnaire
- Provide positive feedback appropriately to make users feel understood
- If user's answer is vague, ask follow-up questions for clarification rather than skipping
- In confirmation stage, briefly summarize findings and let user confirm or add information
- Score updates should be cumulative, based on entire conversation history
`;
}

/**
 * 中文系統提示詞
 */
function getSystemPrompt(stage: AssessmentStage, conversationCount: number, currentScores: Partial<AssessmentScores>, language: 'zh' | 'en' = 'zh'): string {
  if (language === 'en') {
    return getSystemPromptEN(stage, conversationCount, currentScores);
  }
  
  return `你是一位專業且友善的投資顧問，名字叫 "永續投資助手"。你正在進行一場深入的投資傾向評估對話，目的是了解用戶的投資特性，並推薦適合的永續投資方向。

## 評估目標

你需要評估以下四個維度：

1. **風險承受度 (Risk Tolerance)**
   - 損失容忍度、波動性接受度
   - 投資經驗、財務穩定性
   - 目標分數範圍：0-100

2. **投資目標與時間偏好 (Investment Goals & Time Horizon)**
   - 投資期限、主要目標
   - 流動性需求、人生階段
   - 目標分數範圍：0-100

3. **行為偏誤 (Behavioral Biases)**
   - 識別：損失厭惡(loss_aversion)、過度自信(overconfidence)、從眾效應(herding)等
   - 評估強度：low/medium/high

4. **永續價值觀 (Sustainability Values)**
   - 環境 (E)、社會 (S)、治理 (G) 關注度
   - SDG 優先順序
   - 目標分數範圍：每個維度 0-100

## 對話原則

1. **自然友善**：使用日常語言，避免過多專業術語
2. **開放引導**：使用開放式問題，鼓勵用戶深入分享
3. **動態調整**：根據回答追問，深入了解動機與情境
4. **時間控制**：整個對話在 10 分鐘內完成（8-12 輪對話）
5. **不帶評判**：尊重用戶的選擇，不批評任何回答

## 對話流程

當前階段：${stage}
已完成輪數：${conversationCount}/12

### 階段說明

- **opening**: 開場，建立信任，了解基本背景（1-2 輪）
- **risk**: 評估風險承受度（2-3 輪）
- **goals**: 評估投資目標與時間偏好（1-2 輪）
- **behavior**: 識別行為偏誤（1-2 輪）
- **values**: 了解永續價值觀（1-2 輪）
- **confirmation**: 確認評估結果，補充資訊（1 輪）

## 當前評估狀態

${JSON.stringify(currentScores, null, 2)}

## 你的任務

根據用戶的最新回答，執行以下步驟：

1. **分析回答**：提取關鍵資訊，更新評估分數
2. **判斷進度**：
   - 如果當前維度信心度 > 0.7，進入下一維度
   - 如果對話輪數 > 10，進入確認階段
   - 否則，繼續當前維度的深入評估
3. **生成下一個問題**：
   - 根據當前階段生成合適的問題
   - 問題應該自然、開放、引導深入思考
   - 避免一次問太多問題（最多 1-2 個相關問題）

## 輸出格式

請以 JSON 格式回應：

{
  "analysis": "對用戶回答的分析摘要",
  "scores_update": {
    "risk": {"raw": 0-100, "confidence": 0-1},
    "timeHorizon": {"raw": 0-100, "confidence": 0-1},
    "goalType": "growth" | "income" | "preservation" | "impact",
    "esg": {"environmental": 0-100, "social": 0-100, "governance": 0-100},
    "biases": [{"type": "loss_aversion", "strength": "medium", "evidence": "..."}],
    "sdgPriorities": [7, 13, 11]
  },
  "next_stage": "risk" | "goals" | "behavior" | "values" | "confirmation" | "complete",
  "next_question": "下一個問題的內容",
  "reasoning": "為什麼選擇這個問題的理由"
}

## 注意事項

- 保持對話流暢，不要讓用戶感覺在填問卷
- 適時給予正向回饋，讓用戶感到被理解
- 如果用戶回答模糊，用追問澄清，而非直接跳過
- 在確認階段，簡要總結評估發現，讓用戶確認或補充
- 分數更新應該是累積性的，基於所有對話歷史
- 信心度(confidence)應該隨著資訊增加而提高`;
}

/**
 * 處理對話並生成下一個問題
 */
export async function processConversation(
  userMessage: string,
  conversationHistory: Message[],
  currentStage: AssessmentStage,
  conversationCount: number,
  currentScores: Partial<AssessmentScores>,
  language: 'zh' | 'en' = 'zh'
): Promise<AIResponse> {
  const systemPrompt = getSystemPrompt(currentStage, conversationCount, currentScores, language);
  
  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: userMessage }
  ];

  try {
    const response = await invokeLLM({
      messages,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'assessment_response',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              analysis: { type: 'string' },
              scores_update: {
                type: 'object',
                properties: {
                  risk: {
                    type: 'object',
                    properties: {
                      raw: { type: 'number' },
                      confidence: { type: 'number' }
                    },
                    required: []
                  },
                  timeHorizon: {
                    type: 'object',
                    properties: {
                      raw: { type: 'number' },
                      confidence: { type: 'number' }
                    },
                    required: []
                  },
                  goalType: {
                    type: 'string',
                    enum: ['growth', 'income', 'preservation', 'impact']
                  },
                  esg: {
                    type: 'object',
                    properties: {
                      environmental: { type: 'number' },
                      social: { type: 'number' },
                      governance: { type: 'number' }
                    },
                    required: []
                  },
                  biases: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        type: {
                          type: 'string',
                          enum: ['loss_aversion', 'overconfidence', 'herding', 'anchoring', 'confirmation', 'recency']
                        },
                        strength: {
                          type: 'string',
                          enum: ['low', 'medium', 'high']
                        },
                        evidence: { type: 'string' }
                      },
                      required: ['type', 'strength', 'evidence'],
                      additionalProperties: false
                    }
                  },
                  sdgPriorities: {
                    type: 'array',
                    items: { type: 'number' }
                  }
                },
                required: [],
                additionalProperties: false
              },
              next_stage: {
                type: 'string',
                enum: ['opening', 'risk', 'goals', 'behavior', 'values', 'confirmation', 'complete']
              },
              next_question: { type: 'string' },
              reasoning: { type: 'string' }
            },
            required: ['analysis', 'scores_update', 'next_stage', 'next_question', 'reasoning'],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from LLM');
    }

    const contentText = typeof content === 'string' ? content : JSON.stringify(content);
    return JSON.parse(contentText) as AIResponse;
  } catch (error) {
    console.error('Error in processConversation:', error);
    throw error;
  }
}

/**
 * 合併分數更新
 */
export function mergeScores(
  current: Partial<AssessmentScores>,
  update: Partial<AssessmentScores>
): AssessmentScores {
  return {
    risk: update.risk || current.risk || { raw: 50, confidence: 0 },
    timeHorizon: update.timeHorizon || current.timeHorizon || { raw: 50, confidence: 0 },
    goalType: update.goalType || current.goalType || 'growth',
    biases: update.biases || current.biases || [],
    esg: {
      environmental: update.esg?.environmental ?? current.esg?.environmental ?? 50,
      social: update.esg?.social ?? current.esg?.social ?? 50,
      governance: update.esg?.governance ?? current.esg?.governance ?? 50
    },
    sdgPriorities: update.sdgPriorities || current.sdgPriorities || []
  };
}

/**
 * 計算賽道推薦
 */
export function recommendTracks(scores: AssessmentScores): Array<{
  track: InvestmentTrack;
  matchScore: number;
  reason: string;
}> {
  const trackScores = INVESTMENT_TRACKS.map(track => {
    let score = 0;

    // 1. 風險匹配度 (30%)
    const riskMatch = 100 - Math.abs(track.riskLevel - scores.risk.raw);
    score += riskMatch * 0.30;

    // 2. 時間匹配度 (20%)
    const timeMatch = 100 - Math.abs(track.timeHorizon - scores.timeHorizon.raw);
    score += timeMatch * 0.20;

    // 3. ESG 價值觀匹配度 (30%)
    const esgMatch = calculateESGAlignment(scores.esg, track.esgProfile);
    score += esgMatch * 0.30;

    // 4. SDG 優先順序匹配度 (20%)
    const sdgMatch = calculateSDGOverlap(scores.sdgPriorities, track.sdgs);
    score += sdgMatch * 0.20;

    // 生成推薦理由
    const reason = generateRecommendationReason(scores, track, {
      riskMatch,
      timeMatch,
      esgMatch,
      sdgMatch
    });

    return {
      track,
      matchScore: Math.round(score),
      reason
    };
  });

  // 回傳前 3 名
  return trackScores
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 3);
}

/**
 * 計算 ESG 匹配度
 */
function calculateESGAlignment(
  userESG: { environmental: number; social: number; governance: number },
  trackESG: { E: number; S: number; G: number }
): number {
  // 計算用戶 ESG 權重
  const total = userESG.environmental + userESG.social + userESG.governance;
  const weights = total > 0 ? {
    E: userESG.environmental / total,
    S: userESG.social / total,
    G: userESG.governance / total
  } : { E: 0.33, S: 0.33, G: 0.34 };

  // 計算加權相似度
  const similarity = 
    weights.E * (userESG.environmental * trackESG.E) / 100 +
    weights.S * (userESG.social * trackESG.S) / 100 +
    weights.G * (userESG.governance * trackESG.G) / 100;

  return similarity;
}

/**
 * 計算 SDG 重疊度
 */
function calculateSDGOverlap(userSDGs: number[], trackSDGs: number[]): number {
  if (userSDGs.length === 0) return 50; // 中性分數

  const overlap = userSDGs.filter(sdg => trackSDGs.includes(sdg)).length;
  const maxPossible = Math.min(userSDGs.length, trackSDGs.length);

  if (maxPossible === 0) return 0;

  return (overlap / maxPossible) * 100;
}

/**
 * 生成推薦理由
 */
function generateRecommendationReason(
  scores: AssessmentScores,
  track: InvestmentTrack,
  matches: { riskMatch: number; timeMatch: number; esgMatch: number; sdgMatch: number }
): string {
  const reasons: string[] = [];

  // 風險匹配
  if (matches.riskMatch > 80) {
    const riskType = scores.risk.raw > 75 ? '積極' : scores.risk.raw > 50 ? '平衡' : scores.risk.raw > 25 ? '穩健' : '保守';
    reasons.push(`符合你的${riskType}型風險偏好`);
  }

  // 時間匹配
  if (matches.timeMatch > 80) {
    const timeType = scores.timeHorizon.raw > 67 ? '長期' : scores.timeHorizon.raw > 34 ? '中期' : '短期';
    reasons.push(`適合${timeType}投資規劃`);
  }

  // ESG 匹配
  const dominantESG = scores.esg.environmental > Math.max(scores.esg.social, scores.esg.governance) ? 'E' :
                      scores.esg.social > scores.esg.governance ? 'S' : 'G';
  const trackDominantESG = track.esgProfile.E > Math.max(track.esgProfile.S, track.esgProfile.G) ? 'E' :
                           track.esgProfile.S > track.esgProfile.G ? 'S' : 'G';
  
  if (dominantESG === trackDominantESG) {
    const esgName = dominantESG === 'E' ? '環境' : dominantESG === 'S' ? '社會' : '治理';
    reasons.push(`與你重視的${esgName}議題高度契合`);
  }

  // SDG 匹配
  if (matches.sdgMatch > 60 && scores.sdgPriorities.length > 0) {
    const commonSDGs = scores.sdgPriorities.filter(sdg => track.sdgs.includes(sdg));
    if (commonSDGs.length > 0) {
      reasons.push(`直接貢獻你關注的永續發展目標`);
    }
  }

  return reasons.slice(0, 2).join('，') || '具有良好的投資潛力';
}

/**
 * 生成開場問題
 */
export function getOpeningQuestion(language: 'zh' | 'en' = 'zh'): string {
  if (language === 'en') {
    return 'Hello! I\'m the Sustainable Investment Assistant, and I\'m delighted to help you explore suitable investment directions. Before we begin, I\'d like to understand your background. Do you have any previous investment experience? Could you briefly share your investment history?';
  }
  return '你好！我是永續投資助手，很高興能協助你探索適合的投資方向。在開始之前，我想先了解一下，你過去有投資經驗嗎？可以簡單分享一下你的投資背景嗎？';
}

