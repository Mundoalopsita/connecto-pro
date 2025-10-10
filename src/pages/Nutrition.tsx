import { Layout } from "@/components/Layout";
import { GymCard } from "@/components/GymCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Camera, Upload, Utensils, Target, Zap, Plus, Clock, TrendingUp, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const todayMeals = [
  {
    id: 1,
    name: "Café da Manhã",
    time: "08:30",
    foods: ["Ovos mexidos (2 unidades)", "Pão integral (2 fatias)", "Abacate (1/2 unidade)"],
    calories: 420,
    protein: 28,
    carbs: 35,
    fat: 22,
    image: "🍳"
  },
  {
    id: 2,
    name: "Lanche da Manhã",
    time: "10:45",
    foods: ["Iogurte grego natural", "Granola (30g)", "Morango (100g)"],
    calories: 280,
    protein: 18,
    carbs: 32,
    fat: 8,
    image: "🥛"
  },
  {
    id: 3,
    name: "Almoço",
    time: "13:00",
    foods: ["Frango grelhado (150g)", "Arroz integral (100g)", "Brócolis refogado", "Salada verde"],
    calories: 520,
    protein: 45,
    carbs: 48,
    fat: 12,
    image: "🍽️"
  }
];

const nutritionGoals = {
  calories: { current: 1220, target: 2200, unit: "kcal" },
  protein: { current: 91, target: 120, unit: "g" },
  carbs: { current: 115, target: 220, unit: "g" },
  fat: { current: 42, target: 60, unit: "g" }
};

const Nutrition = () => {
  const [selectedMeal, setSelectedMeal] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [savedMeals, setSavedMeals] = useState<any[]>([]);
  const [isLoadingMeals, setIsLoadingMeals] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  // Carregar refeições salvas
  const loadTodayMeals = async () => {
    setIsLoadingMeals(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      
      if (!session?.session?.user) {
        console.log("Usuário não autenticado");
        setSavedMeals([]);
        return;
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', session.session.user.id)
        .gte('timestamp', today.toISOString())
        .order('timestamp', { ascending: false });
      
      if (error) {
        console.error("Erro ao carregar refeições:", error);
      } else {
        setSavedMeals(data || []);
        console.log("Refeições carregadas:", data?.length);
      }
    } catch (error) {
      console.error("Erro ao buscar refeições:", error);
    } finally {
      setIsLoadingMeals(false);
    }
  };
  
  useEffect(() => {
    loadTodayMeals();
  }, []);

  const startCamera = async () => {
    try {
      // Verificar se a API de mídia está disponível
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast({
          title: "Câmera não disponível",
          description: "Seu navegador não suporta acesso à câmera. Tente fazer upload de uma foto.",
          variant: "destructive",
        });
        return;
      }

      // Tentar acessar a câmera com configurações otimizadas
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Usar câmera traseira em dispositivos móveis
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      
      setShowCamera(true);
      
      // Aguardar o videoRef estar disponível
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(err => {
            console.error("Erro ao iniciar vídeo:", err);
            toast({
              title: "Erro",
              description: "Não foi possível iniciar a visualização da câmera.",
              variant: "destructive",
            });
          });
        }
      }, 100);
      
    } catch (error) {
      console.error("Erro ao acessar câmera:", error);
      
      let errorMessage = "Não foi possível acessar a câmera.";
      
      if (error instanceof DOMException) {
        switch (error.name) {
          case "NotAllowedError":
            errorMessage = "Permissão de câmera negada. Verifique as configurações do navegador.";
            break;
          case "NotFoundError":
            errorMessage = "Nenhuma câmera encontrada no dispositivo.";
            break;
          case "NotReadableError":
            errorMessage = "Câmera já está em uso por outro aplicativo.";
            break;
          case "OverconstrainedError":
            errorMessage = "Configurações de câmera não suportadas. Tente fazer upload de uma foto.";
            break;
          default:
            errorMessage = `Erro ao acessar câmera: ${error.message}`;
        }
      }
      
      toast({
        title: "Erro na Câmera",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      const imageDataUrl = canvas.toDataURL('image/jpeg');
      setCapturedImage(imageDataUrl);
      stopCamera();
      analyzeImage(imageDataUrl);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
    setShowCamera(false);
  };

  const selectFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageDataUrl = e.target?.result as string;
        setCapturedImage(imageDataUrl);
        analyzeImage(imageDataUrl);
      };
      reader.readAsDataURL(file);
    } else {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo de imagem válido.",
        variant: "destructive",
      });
    }
  };

  const analyzeImage = async (imageData: string) => {
    setIsAnalyzing(true);
    try {
      console.log("Enviando imagem para análise...");
      
      // Chamar a edge function de análise de alimentos
      const { data: functionData, error: functionError } = await supabase.functions.invoke('analyze-food', {
        body: { imageData }
      });

      if (functionError) {
        console.error("Erro na edge function:", functionError);
        throw new Error(functionError.message || "Erro ao analisar imagem");
      }

      if (!functionData || !functionData.success) {
        throw new Error(functionData?.error || "Resposta inválida da análise");
      }

      console.log("Análise concluída:", functionData);

      // Formatar resultados para exibição
      const foodsList = functionData.foods
        .map((food: any) => {
          const confidence = food.confidence === "alta" ? "✓" : 
                           food.confidence === "média" ? "~" : "?";
          return `${confidence} ${food.name} (${food.portion || food.portionGrams + 'g'})`;
        })
        .join("\n");

      // Salvar refeição no banco de dados
      const mealName = `Refeição: ${functionData.foods.map((f: any) => f.name).slice(0, 3).join(", ")}${functionData.foods.length > 3 ? '...' : ''}`;
      
      const { data: session } = await supabase.auth.getSession();
      
      if (session?.session?.user) {
        const { error: saveError } = await supabase
          .from('meals')
          .insert({
            user_id: session.session.user.id,
            name: mealName,
            foods: functionData.foods,
            total_calories: functionData.totals.calories,
            total_protein: functionData.totals.protein,
            total_carbs: functionData.totals.carbs,
            total_fat: functionData.totals.fat,
            is_estimated: functionData.isEstimated || false,
            notes: functionData.notes || null
          });
        
        if (saveError) {
          console.error("Erro ao salvar refeição:", saveError);
          toast({
            title: "Análise OK, mas erro ao salvar",
            description: "A análise foi feita mas não foi possível salvar no histórico.",
            variant: "destructive",
          });
        } else {
          console.log("✅ Refeição salva no histórico");
          // Recarregar lista de refeições
          loadTodayMeals();
        }
      }

      toast({
        title: "Análise Concluída! 🎉",
        description: `Alimentos identificados:\n${foodsList}\n\n✨ Total: ${Math.round(functionData.totals.calories)} kcal\nProteínas: ${functionData.totals.protein}g | Carbs: ${functionData.totals.carbs}g | Gorduras: ${functionData.totals.fat}g${functionData.isEstimated ? '\n⚠️ Valores estimados' : ''}`,
      });
      
    } catch (error) {
      console.error("Erro ao analisar imagem:", error);
      
      let errorMessage = "Não foi possível analisar a imagem. Tente novamente.";
      
      if (error instanceof Error) {
        if (error.message.includes("Limite de requisições")) {
          errorMessage = "Muitas requisições. Aguarde alguns segundos e tente novamente.";
        } else if (error.message.includes("configuração")) {
          errorMessage = "Serviço de análise temporariamente indisponível.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Erro na Análise",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setCapturedImage(null);
    setSelectedFile(null);
    setIsAnalyzing(false);
  };

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const getRemainingCalories = () => {
    return nutritionGoals.calories.target - nutritionGoals.calories.current;
  };

  return (
    <Layout>
      <div className="p-4 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Nutrição Inteligente</h1>
            <p className="text-muted-foreground">Análise por IA com 90% de precisão</p>
          </div>
          <div className="flex gap-2">
            <Button variant="nutrition" onClick={startCamera}>
              <Camera className="w-4 h-4" />
              Foto da Refeição
            </Button>
            <Button variant="nutrition-outline" onClick={selectFile}>
              <Upload className="w-4 h-4" />
              Upload
            </Button>
          </div>
        </div>

        {/* AI Analysis Card */}
        <GymCard
          variant="nutrition"
          title="Análise por IA"
          description="Tire uma foto da sua refeição para análise instantânea"
          className="text-center"
        >
          <div className="space-y-6">
            <div className="border-2 border-dashed border-secondary/30 rounded-lg p-12 hover:border-secondary/50 transition-colors cursor-pointer">
              <Camera className="w-16 h-16 text-secondary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Analisar Refeição</h3>
              <p className="text-muted-foreground mb-4">
                Nossa IA identifica alimentos, porções e calcula nutrientes automaticamente
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button variant="nutrition" onClick={startCamera}>
                  <Camera className="w-4 h-4" />
                  Tirar Foto
                </Button>
                <Button variant="nutrition-outline" onClick={selectFile}>
                  <Upload className="w-4 h-4" />
                  Escolher Arquivo
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-secondary">90%+</div>
                <div className="text-sm text-muted-foreground">Precisão IA</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-secondary">2s</div>
                <div className="text-sm text-muted-foreground">Análise</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-secondary">15K+</div>
                <div className="text-sm text-muted-foreground">Alimentos</div>
              </div>
            </div>
          </div>
        </GymCard>

        {/* Daily Progress */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Nutrition Summary */}
          <GymCard
            variant="nutrition"
            title="Resumo Diário"
            description={`${getRemainingCalories()} kcal restantes`}
            className="lg:col-span-2"
          >
            <div className="space-y-6">
              {/* Calories Progress */}
              <div className="text-center">
                <div className="text-4xl font-bold text-secondary mb-2">
                  {nutritionGoals.calories.current}
                </div>
                <div className="text-muted-foreground">
                  de {nutritionGoals.calories.target} kcal
                </div>
                <Progress 
                  value={getProgressPercentage(nutritionGoals.calories.current, nutritionGoals.calories.target)} 
                  className="mt-4 h-3"
                />
              </div>

              {/* Macros Grid */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-gradient-nutrition-subtle">
                  <div className="text-xl font-bold text-secondary">
                    {nutritionGoals.protein.current}g
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">Proteínas</div>
                  <Progress 
                    value={getProgressPercentage(nutritionGoals.protein.current, nutritionGoals.protein.target)} 
                    className="h-1"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    Meta: {nutritionGoals.protein.target}g
                  </div>
                </div>

                <div className="text-center p-4 rounded-lg bg-gradient-nutrition-subtle">
                  <div className="text-xl font-bold text-secondary">
                    {nutritionGoals.carbs.current}g
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">Carboidratos</div>
                  <Progress 
                    value={getProgressPercentage(nutritionGoals.carbs.current, nutritionGoals.carbs.target)} 
                    className="h-1"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    Meta: {nutritionGoals.carbs.target}g
                  </div>
                </div>

                <div className="text-center p-4 rounded-lg bg-gradient-nutrition-subtle">
                  <div className="text-xl font-bold text-secondary">
                    {nutritionGoals.fat.current}g
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">Gorduras</div>
                  <Progress 
                    value={getProgressPercentage(nutritionGoals.fat.current, nutritionGoals.fat.target)} 
                    className="h-1"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    Meta: {nutritionGoals.fat.target}g
                  </div>
                </div>
              </div>
            </div>
          </GymCard>

          {/* Quick Actions */}
          <GymCard
            title="Ações Rápidas"
            description="Adicione refeições rapidamente"
          >
            <div className="space-y-3">
              <Button variant="nutrition" className="w-full">
                <Plus className="w-4 h-4" />
                Próxima Refeição
              </Button>
              <Button variant="outline" className="w-full">
                <Utensils className="w-4 h-4" />
                Receitas Sugeridas
              </Button>
              <Button variant="outline" className="w-full">
                <Target className="w-4 h-4" />
                Ajustar Metas
              </Button>
              <Button variant="outline" className="w-full">
                <TrendingUp className="w-4 h-4" />
                Relatório Semanal
              </Button>
            </div>
          </GymCard>
        </div>

        {/* Today's Meals */}
        <GymCard
          title="Refeições de Hoje"
          description="Histórico das suas refeições analisadas"
        >
          {isLoadingMeals ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando refeições...
            </div>
          ) : savedMeals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Utensils className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma refeição registrada hoje</p>
              <p className="text-sm mt-1">Tire uma foto para começar!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {savedMeals.map((meal) => {
                const mealTime = new Date(meal.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const foodsArray = Array.isArray(meal.foods) ? meal.foods : [];
                
                return (
                  <div
                    key={meal.id}
                    className="p-4 rounded-lg glass-card border border-border/50 hover:border-secondary/30 transition-colors cursor-pointer"
                    onClick={() => setSelectedMeal(selectedMeal === meal.id ? null : meal.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">🍽️</div>
                        <div>
                          <h3 className="font-semibold">{meal.name}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {mealTime}
                            {meal.is_estimated && (
                              <Badge variant="secondary" className="text-xs">Estimado</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-secondary">{Math.round(meal.total_calories)} kcal</div>
                        <div className="text-sm text-muted-foreground">
                          P: {meal.total_protein}g • C: {meal.total_carbs}g • G: {meal.total_fat}g
                        </div>
                      </div>
                    </div>

                    {selectedMeal === meal.id && (
                      <div className="mt-4 pt-4 border-t border-border/50">
                        <h4 className="font-medium mb-2">Alimentos identificados:</h4>
                        <ul className="space-y-1">
                          {foodsArray.map((food: any, index: number) => (
                            <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                              <div className="w-1 h-1 bg-secondary rounded-full" />
                              {food.name} ({food.portionGrams || food.portion}g) - {food.calories} kcal
                              {food.isEstimated && <span className="text-xs opacity-70">(estimado)</span>}
                            </li>
                          ))}
                        </ul>
                        {meal.notes && (
                          <div className="mt-2 text-xs text-muted-foreground italic">
                            {meal.notes}
                          </div>
                        )}
                        <div className="flex gap-2 mt-4">
                          <Button variant="nutrition-outline" size="sm">
                            Editar
                          </Button>
                          <Button variant="outline" size="sm">
                            Duplicar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </GymCard>

        {/* Meal Suggestions */}
        <GymCard
          title="Sugestões Personalizadas"
          description="Baseado nos seus objetivos e preferências"
        >
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-gradient-nutrition-subtle">
              <div className="text-lg mb-2">🥗</div>
              <h3 className="font-semibold mb-1">Salada Proteica</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Perfeita para atingir sua meta de proteína
              </p>
              <div className="text-sm">
                <span className="font-medium">380 kcal</span> • 
                <span className="text-secondary"> 35g proteína</span>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-gradient-nutrition-subtle">
              <div className="text-lg mb-2">🍓</div>
              <h3 className="font-semibold mb-1">Smoothie Pós-Treino</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Ideal para recuperação muscular
              </p>
              <div className="text-sm">
                <span className="font-medium">320 kcal</span> • 
                <span className="text-secondary"> 28g proteína</span>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-gradient-nutrition-subtle">
              <div className="text-lg mb-2">🐟</div>
              <h3 className="font-semibold mb-1">Salmão Grelhado</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Rico em ômega-3 e proteínas
              </p>
              <div className="text-sm">
                <span className="font-medium">420 kcal</span> • 
                <span className="text-secondary"> 38g proteína</span>
              </div>
            </div>
          </div>
        </GymCard>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Hidden canvas for image capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Camera Modal */}
        {showCamera && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="relative bg-background rounded-lg p-4 max-w-md w-full mx-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={stopCamera}
                className="absolute top-2 right-2 z-10"
              >
                <X className="w-4 h-4" />
              </Button>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-center">Capturar Refeição</h3>
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full rounded-lg"
                  />
                </div>
                <div className="flex gap-2 justify-center">
                  <Button variant="nutrition" onClick={capturePhoto}>
                    <Camera className="w-4 h-4" />
                    Capturar
                  </Button>
                  <Button variant="outline" onClick={stopCamera}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Image Analysis Modal */}
        {(capturedImage || isAnalyzing) && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="relative bg-background rounded-lg p-4 max-w-md w-full mx-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={resetAnalysis}
                className="absolute top-2 right-2 z-10"
                disabled={isAnalyzing}
              >
                <X className="w-4 h-4" />
              </Button>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-center">
                  {isAnalyzing ? "Analisando..." : "Análise Concluída"}
                </h3>
                {capturedImage && (
                  <div className="relative">
                    <img
                      src={capturedImage}
                      alt="Refeição capturada"
                      className="w-full rounded-lg"
                    />
                    {isAnalyzing && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                        <div className="text-white text-center">
                          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2" />
                          <p className="text-sm">Analisando nutrientes...</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {!isAnalyzing && (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-4">
                      Refeição analisada com sucesso! Os nutrientes foram calculados.
                    </p>
                    <Button variant="nutrition" onClick={resetAnalysis}>
                      Analisar Nova Refeição
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Nutrition;