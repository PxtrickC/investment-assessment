import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Assessment router
  assessment: router({
    // 開始新的評估會話
    start: publicProcedure
      .input(z.object({
        language: z.enum(['zh', 'en']).optional().default('zh')
      }).optional())
      .mutation(async ({ ctx, input }) => {
      const { createAssessmentSession } = await import('./assessmentDb');
      const { getOpeningQuestion } = await import('./assessmentEngine');
      
      const session = await createAssessmentSession(ctx.user?.id);
      const language = input?.language || 'zh';
      const openingQuestion = getOpeningQuestion(language);
      
      return {
        sessionId: session.id,
        question: openingQuestion,
        stage: 'opening',
        progress: 0
      };
    }),

    // 發送訊息並取得回應
    chat: publicProcedure
      .input(z.object({
        sessionId: z.string(),
        message: z.string(),
        language: z.enum(['zh', 'en']).optional().default('zh')
      }))
      .mutation(async ({ input }) => {
        const { 
          getAssessmentSession, 
          updateAssessmentSession,
          parseConversationHistory,
          parseScores 
        } = await import('./assessmentDb');
        const { processConversation, mergeScores } = await import('./assessmentEngine');
        
        const session = await getAssessmentSession(input.sessionId);
        if (!session) {
          throw new Error('Session not found');
        }

        const conversationHistory = parseConversationHistory(session);
        const currentScores = parseScores(session);
        
        // 處理對話
        const aiResponse = await processConversation(
          input.message,
          conversationHistory,
          session.stage as any,
          session.conversationCount,
          currentScores,
          input.language
        );

        // 更新對話歷史
        const updatedHistory = [
          ...conversationHistory,
          { role: 'user' as const, content: input.message },
          { role: 'assistant' as const, content: aiResponse.next_question }
        ];

        // 合併分數
        const updatedScores = mergeScores(currentScores, aiResponse.scores_update);

        // 更新會話
        await updateAssessmentSession(input.sessionId, {
          stage: aiResponse.next_stage,
          conversationCount: session.conversationCount + 1,
          conversationHistory: updatedHistory,
          scores: updatedScores,
          completedAt: aiResponse.next_stage === 'complete' ? new Date() : undefined
        });

        // 計算進度
        const stageProgress: Record<string, number> = {
          opening: 10,
          risk: 30,
          goals: 50,
          behavior: 70,
          values: 90,
          confirmation: 95,
          complete: 100
        };

        return {
          reply: aiResponse.next_question,
          stage: aiResponse.next_stage,
          progress: stageProgress[aiResponse.next_stage] || 0,
          isComplete: aiResponse.next_stage === 'complete'
        };
      }),

    // 取得評估結果
    getResult: publicProcedure
      .input(z.object({
        sessionId: z.string()
      }))
      .query(async ({ input }) => {
        const { getAssessmentSession, parseScores, parseResult } = await import('./assessmentDb');
        const { recommendTracks } = await import('./assessmentEngine');
        
        const session = await getAssessmentSession(input.sessionId);
        if (!session) {
          throw new Error('Session not found');
        }

        let result = parseResult(session);
        
        // 如果還沒生成結果，現在生成
        if (!result) {
          const scores = parseScores(session) as any;
          const recommendations = recommendTracks(scores);
          
          // 判斷投資人類型
          const riskScore = scores.risk?.raw || 50;
          const investorType = 
            riskScore > 75 ? '積極型投資人' :
            riskScore > 50 ? '平衡型投資人' :
            riskScore > 25 ? '穩健型投資人' : '保守型投資人';

          result = {
            investorProfile: {
              type: investorType,
              summary: `你是一位${investorType}，具有${scores.timeHorizon?.raw > 67 ? '長期' : scores.timeHorizon?.raw > 34 ? '中期' : '短期'}投資視野。`,
              strengths: [],
              watchPoints: []
            },
            scores,
            recommendedTracks: recommendations.map((r, idx) => ({
              rank: idx + 1,
              trackId: r.track.id,
              trackName: r.track.name,
              trackNameEn: r.track.nameEn,
              description: r.track.description,
              matchScore: r.matchScore,
              reason: r.reason,
              sdgs: r.track.sdgs,
              examples: r.track.examples
            })),
            behavioralInsights: {
              mainBiases: scores.biases?.map((b: any) => b.type) || [],
              suggestions: []
            },
            sdgAlignment: {
              primarySDGs: scores.sdgPriorities || [],
              explanation: '這些永續發展目標與你的價值觀高度契合'
            }
          };

          // 儲存結果
          const { updateAssessmentSession } = await import('./assessmentDb');
          await updateAssessmentSession(input.sessionId, { result });
        }

        return result;
      })
  }),
});

export type AppRouter = typeof appRouter;
