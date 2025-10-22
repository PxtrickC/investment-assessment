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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-6xl animate-spin">⚙️</div>
          <p className="text-gray-600 text-lg">{t('assessment.complete.subtitle')}</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <Card className="p-8 max-w-md text-center space-y-4 shadow-xl">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-xl font-semibold">{t('result.error.title')}</h2>
          <p className="text-gray-600">{t('result.error.message')}</p>
          <Button onClick={() => setLocation('/')}>{t('result.button.home')}</Button>
        </Card>
      </div>
    );
  }

  const { investorProfile, scores, recommendedTracks, sdgAlignment } = result;
  const sdgArray = Array.isArray(sdgAlignment) ? sdgAlignment : [];
  const sdgNames = SDG_NAMES;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/90 backdrop-blur-md shadow-sm sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {t('result.title')}
            </h1>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <Button variant="outline" onClick={() => setLocation('/')} className="hover:bg-blue-50">
                {t('nav.retake')}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8 max-w-6xl space-y-8 pb-16">
        {/* Investor Profile - Hero Section */}
        <Card className="overflow-hidden border-0 shadow-2xl">
          <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-8 md:p-12 text-white relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
            <div className="relative z-10">
              <div className="flex items-start gap-4 mb-6">
                <div className="text-6xl">🎯</div>
                <div className="flex-1">
                  <h2 className="text-3xl md:text-4xl font-bold mb-3">{investorProfile.type}</h2>
                  <p className="text-blue-100 text-lg leading-relaxed">{investorProfile.summary}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Scores Section */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Risk & Time Horizon */}
          <Card className="p-6 space-y-6 shadow-lg hover:shadow-xl transition-shadow border-0">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-2xl">
                📊
              </div>
              <h3 className="text-xl font-bold text-gray-800">{t('result.scores.risk.title')}</h3>
            </div>
            
            <div className="space-y-5">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-600">{t('result.scores.risk.tolerance')}</span>
                  <span className="text-lg font-bold text-blue-600">{Math.round(scores.risk?.raw || 0)}</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${Math.round(scores.risk?.raw || 0)}%` }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-600">{t('result.scores.risk.horizon')}</span>
                  <span className="text-lg font-bold text-green-600">{Math.round(scores.timeHorizon?.raw || 0)}</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${Math.round(scores.timeHorizon?.raw || 0)}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* ESG Scores */}
          <Card className="p-6 space-y-6 shadow-lg hover:shadow-xl transition-shadow border-0">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-2xl">
                🌱
              </div>
              <h3 className="text-xl font-bold text-gray-800">{t('result.scores.esg.title')}</h3>
            </div>
            
            <div className="space-y-5">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🌍</span>
                    <span className="text-sm font-medium text-gray-600">{t('result.scores.esg.environmental')}</span>
                  </div>
                  <span className="text-lg font-bold text-green-600">{Math.round(scores.esg?.environmental || 0)}</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${Math.round(scores.esg?.environmental || 0)}%` }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🤝</span>
                    <span className="text-sm font-medium text-gray-600">{t('result.scores.esg.social')}</span>
                  </div>
                  <span className="text-lg font-bold text-orange-600">{Math.round(scores.esg?.social || 0)}</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-orange-500 to-amber-600 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${Math.round(scores.esg?.social || 0)}%` }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">⚖️</span>
                    <span className="text-sm font-medium text-gray-600">{t('result.scores.esg.governance')}</span>
                  </div>
                  <span className="text-lg font-bold text-purple-600">{Math.round(scores.esg?.governance || 0)}</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-violet-600 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${Math.round(scores.esg?.governance || 0)}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Recommended Tracks */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-2xl">
              🎯
            </div>
            <h3 className="text-2xl font-bold text-gray-800">{t('result.tracks.title')}</h3>
          </div>
          
          <div className="grid gap-6">
            {recommendedTracks.map((track: any, idx: number) => (
              <Card 
                key={idx} 
                className="p-6 hover:shadow-xl transition-all duration-300 border-0 shadow-lg hover:-translate-y-1"
              >
                <div className="flex flex-col md:flex-row md:items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                      <span className="text-4xl font-bold text-white">#{idx + 1}</span>
                    </div>
                  </div>
                  
                  <div className="flex-1 space-y-3">
                    <div>
                      <h4 className="text-2xl font-bold text-gray-800 mb-1">
                        {language === 'zh' ? track.trackName : track.trackNameEn}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {language === 'zh' ? track.trackNameEn : track.trackName}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full">
                        <span className="text-sm font-semibold">{t('result.tracks.match')}: {Math.round(track.matchScore)}%</span>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 leading-relaxed">{track.reason}</p>
                    
                    <div className="flex flex-wrap gap-2">
                      {track.sdgs.map((sdg: number) => (
                        <div 
                          key={sdg} 
                          className="px-3 py-1 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-full text-xs font-medium text-green-700"
                        >
                          SDG {sdg}: {sdgNames[sdg]?.name || `SDG ${sdg}`}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* SDG Alignment */}
        {sdgArray.length > 0 && (
        <Card className="p-8 space-y-6 shadow-lg border-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-2xl">
              🌍
            </div>
            <h3 className="text-2xl font-bold text-gray-800">{t('result.sdg.title')}</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {sdgArray.map((sdg: any) => (
              <div 
                key={sdg.sdg} 
                className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl hover:shadow-md transition-all hover:scale-105"
              >
                <div className="text-3xl font-bold text-green-600 mb-2">#{sdg.sdg}</div>
                <div className="text-sm font-medium text-gray-700 leading-tight">
                  {sdgNames[sdg.sdg]?.name || `SDG ${sdg.sdg}`}
                </div>
              </div>
            ))}
          </div>
        </Card>
        )}

        {/* Behavioral Biases */}
        {scores.biases && scores.biases.length > 0 && (
          <Card className="p-8 space-y-6 shadow-lg border-0">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center text-2xl">
                🧠
              </div>
              <h3 className="text-2xl font-bold text-gray-800">{t('result.biases.title')}</h3>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              {scores.biases.map((bias: any, idx: number) => (
                <div 
                  key={idx} 
                  className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-800">
                      {t(`result.biases.${bias.type}`)}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      bias.strength === 'high' ? 'bg-red-100 text-red-700' :
                      bias.strength === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {t(`result.biases.strength.${bias.strength}`)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{bias.evidence}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* CTA */}
        <div className="text-center pt-8">
          <Button 
            onClick={() => setLocation('/')} 
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all"
          >
            {t('nav.retake')}
          </Button>
        </div>
      </main>
    </div>
  );
}

