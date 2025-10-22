import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useLocation, useParams } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { SDG_NAMES } from "../../../shared/investmentTracks";

export default function Result() {
  const params = useParams<{ sessionId: string }>();
  const [, setLocation] = useLocation();
  const { t, language } = useLanguage();
  const sessionId = params.sessionId;

  const { data: result, isLoading, error } = trpc.assessment.getResult.useQuery(
    { sessionId: sessionId || '' },
    { enabled: !!sessionId }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-4xl animate-spin">⚙️</div>
          <p className="text-gray-600">{t('assessment.complete.subtitle')}</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 max-w-md text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-xl font-semibold">{t('result.error.title')}</h2>
          <p className="text-gray-600">{t('result.error.message')}</p>
          <Button onClick={() => setLocation('/')}>{t('result.button.home')}</Button>
        </Card>
      </div>
    );
  }

  const { investorProfile, scores, recommendedTracks, sdgAlignment } = result;

  // SDG 名稱對照
  const sdgNames = SDG_NAMES;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-blue-900">{t('result.title')}</h1>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <Button variant="outline" onClick={() => setLocation('/')}>
                {t('nav.retake')}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8 max-w-5xl space-y-8">
        {/* Investor Profile */}
        <Card className="p-8 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="text-4xl">👤</div>
              <div>
                <h2 className="text-2xl font-bold">{investorProfile.type}</h2>
                <p className="text-blue-100">{investorProfile.summary}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Scores Overview */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6 space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <span>📊</span>
              <span>{t('result.scores.risk.title')}</span>
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>{t('result.scores.risk.tolerance')}</span>
                  <span className="font-semibold">{Math.round(scores.risk?.raw || 0)}/100</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 rounded-full transition-all"
                    style={{ width: `${Math.round(scores.risk?.raw || 0)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>{t('result.scores.risk.horizon')}</span>
                  <span className="font-semibold">{Math.round(scores.timeHorizon?.raw || 0)}/100</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-600 rounded-full transition-all"
                    style={{ width: `${Math.round(scores.timeHorizon?.raw || 0)}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <span>🌍</span>
              <span>{t('result.scores.esg.title')}</span>
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>{t('result.scores.esg.environmental')}</span>
                  <span className="font-semibold">{Math.round(scores.esg?.environmental || 0)}/100</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-600 rounded-full transition-all"
                    style={{ width: `${Math.round(scores.esg?.environmental || 0)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>{t('result.scores.esg.social')}</span>
                  <span className="font-semibold">{Math.round(scores.esg?.social || 0)}/100</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-orange-600 rounded-full transition-all"
                    style={{ width: `${Math.round(scores.esg?.social || 0)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>{t('result.scores.esg.governance')}</span>
                  <span className="font-semibold">{Math.round(scores.esg?.governance || 0)}/100</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-600 rounded-full transition-all"
                    style={{ width: `${Math.round(scores.esg?.governance || 0)}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Recommended Tracks */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">{t('result.tracks.title')}</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {recommendedTracks.map((track: any) => (
              <Card key={track.trackId} className="p-6 space-y-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="text-sm text-gray-600">#{track.rank}</div>
                    <h3 className="text-xl font-bold">{language === 'zh' ? track.trackName : track.trackNameEn}</h3>
                    <p className="text-sm text-gray-600">{language === 'zh' ? track.trackNameEn : track.trackName}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">{Math.round(track.matchScore)}%</div>
                    <div className="text-xs text-gray-600">{t('result.tracks.match')}</div>
                  </div>
                </div>
                
                <p className="text-sm text-gray-700">{track.description}</p>
                
                <div className="space-y-2">
                  <div className="text-sm font-semibold">{t('result.tracks.reason')}</div>
                  <p className="text-sm text-gray-600">{track.reason}</p>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-semibold">{t('result.tracks.sdg')}</div>
                  <div className="flex flex-wrap gap-2">
                    {track.sdgs.map((sdgId: number) => (
                      <div
                        key={sdgId}
                        className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs flex items-center gap-1"
                      >
                        <span>{sdgNames[sdgId]?.icon}</span>
                        <span>SDG {sdgId}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-semibold">{t('result.tracks.examples')}</div>
                  <div className="flex flex-wrap gap-2">
                    {track.examples.slice(0, 3).map((example: string, idx: number) => (
                      <div key={idx} className="px-2 py-1 bg-gray-100 rounded text-xs">
                        {example}
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* SDG Alignment */}
        {sdgAlignment.primarySDGs.length > 0 && (
          <Card className="p-6 space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <span>🎯</span>
              <span>{t('result.sdg.title')}</span>
            </h3>
            <p className="text-sm text-gray-600">{sdgAlignment.explanation}</p>
            <div className="flex flex-wrap gap-3">
              {sdgAlignment.primarySDGs.map((sdgId: number) => (
                <div
                  key={sdgId}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg"
                >
                  <span className="text-2xl">{sdgNames[sdgId]?.icon}</span>
                  <div>
                    <div className="font-semibold text-sm">SDG {sdgId}</div>
                    <div className="text-xs text-gray-600">{language === 'zh' ? sdgNames[sdgId]?.name : sdgNames[sdgId]?.nameEn}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-center gap-4 pt-8">
          <Button variant="outline" onClick={() => setLocation('/')}>
            {t('result.button.home')}
          </Button>
          <Button onClick={() => setLocation('/assessment')}>
            {t('result.button.retake')}
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-16 py-8 text-center text-sm text-gray-600">
        <div className="container">
          <p>{t('home.footer')}</p>
        </div>
      </footer>
    </div>
  );
}

