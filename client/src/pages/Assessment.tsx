import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Assessment() {
  const [, setLocation] = useLocation();
  const { t, language } = useLanguage();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const startMutation = trpc.assessment.start.useMutation();
  const chatMutation = trpc.assessment.chat.useMutation();

  // 開始評估
  useEffect(() => {
    if (!sessionId) {
      startMutation.mutate({ language }, {
        onSuccess: (data) => {
          setSessionId(data.sessionId);
          setMessages([{ role: 'assistant', content: data.question }]);
          setProgress(data.progress);
          setStage(data.stage);
        }
      });
    }
  }, []);

  // 自動滾動到最新訊息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 發送訊息
  const handleSend = () => {
    if (!input.trim() || !sessionId || chatMutation.isPending) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    chatMutation.mutate(
      { sessionId, message: userMessage, language },
      {
        onSuccess: (data) => {
          setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
          setProgress(data.progress);
          setStage(data.stage);
          
          if (data.isComplete) {
            setIsComplete(true);
            // 3 秒後跳轉到結果頁面
            setTimeout(() => {
              setLocation(`/result/${sessionId}`);
            }, 3000);
          }
        },
        onError: (error) => {
          console.error('Chat error:', error);
          setMessages(prev => [
            ...prev, 
            { role: 'assistant', content: '抱歉，發生了一些錯誤，請稍後再試。' }
          ]);
        }
      }
    );
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const stageNames: Record<string, string> = {
    opening: t('assessment.stage.opening'),
    risk: t('assessment.stage.risk'),
    goals: t('assessment.stage.goals'),
    behavior: t('assessment.stage.behavior'),
    values: t('assessment.stage.values'),
    confirmation: t('assessment.stage.confirmation'),
    complete: t('assessment.stage.complete')
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => setLocation('/')}
              disabled={chatMutation.isPending}
            >
              ← {t('nav.back')}
            </Button>
            <h1 className="text-lg font-semibold">{t('assessment.title')}</h1>
            <LanguageSwitcher />
          </div>
          
          {/* Progress */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                {stageNames[stage] || '載入中...'}
              </span>
              <span className="text-gray-600">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="container py-6 max-w-3xl">
        <div className="space-y-4 mb-24">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <Card
                className={`max-w-[80%] p-4 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl flex-shrink-0">
                    {msg.role === 'assistant' ? '🤖' : '👤'}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm mb-1">
                      {msg.role === 'assistant' ? t('assessment.assistant') : t('assessment.you')}
                    </div>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              </Card>
            </div>
          ))}
          
          {chatMutation.isPending && (
            <div className="flex justify-start">
              <Card className="max-w-[80%] p-4 bg-white">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">🤖</div>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </Card>
            </div>
          )}
          
          {isComplete && (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🎉</div>
              <h3 className="text-xl font-semibold mb-2">{t('assessment.complete.title')}</h3>
              <p className="text-gray-600">{t('assessment.complete.subtitle')}</p>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input */}
      {!isComplete && (
        <div className="fixed bottom-0 left-0 right-0 border-t bg-white">
          <div className="container py-4 max-w-3xl">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t('assessment.input.placeholder')}
                disabled={chatMutation.isPending || !sessionId}
                className="flex-1"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || chatMutation.isPending || !sessionId}
              >
                {t('assessment.button.send')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

