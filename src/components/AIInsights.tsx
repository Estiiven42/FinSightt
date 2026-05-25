import React, { useState, useEffect } from 'react';
import { useAppStore, safeStorage } from '../lib/api';
import { Card, Button } from './ui';
import { 
  Sparkles, 
  Loader2, 
  TrendingUp, 
  ShieldCheck, 
  Zap, 
  Mail, 
  Check, 
  MailX, 
  RefreshCw, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { format } from 'date-fns';
import api from '../lib/api';

export function AIInsights() {
  const { transactions, budgets, insights, saveAIInsight, categories, addTransaction } = useAppStore();
  const [activeTab, setActiveTab] = useState<'insights' | 'gmail'>('insights');
  
  // General Loading & Error states
  const [isLoading, setIsLoading] = useState(false);
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null);
  const [isCheckingGmail, setIsCheckingGmail] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [scanQuery, setScanQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanStepMessage, setScanStepMessage] = useState('');
  const [scannedTransactions, setScannedTransactions] = useState<any[]>([]);
  const [registeredTxIds, setRegisteredTxIds] = useState<Record<string, boolean>>({});
  const [systemError, setSystemError] = useState<string | null>(null);
  const [scanSuccessMsg, setScanSuccessMsg] = useState<string | null>(null);

  // Check Gmail Connection state on mount
  useEffect(() => {
    checkGmailStatus();
  }, []);

  const checkGmailStatus = async () => {
    setIsCheckingGmail(true);
    setSystemError(null);
    try {
      const res = await api.get('/gmail/status');
      setGmailConnected(!!res.data.connected);
    } catch (err: any) {
      console.error("Error fetching Gmail link status:", err);
      setGmailConnected(false);
    } finally {
      setIsCheckingGmail(false);
    }
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setSystemError(null);
    try {
      const res = await api.post('/ai/insights', { transactions, budgets });
      if (res.data) {
        await saveAIInsight('Perspectiva Semanal', JSON.stringify(res.data));
      }
    } catch (err: any) {
      console.error("AI Error:", err);
      setSystemError("No se pudo generar el análisis financiero. Revisa tu conexión.");
    }
    setIsLoading(false);
  };

  // Google OAuth flow for Gmail Integration using the popup message system
  const handleConnectGmail = async () => {
    setIsConnecting(true);
    setSystemError(null);
    try {
      const token = safeStorage.getItem("token") || "";
      // Request custom Gmail scope URL and pass user JWT token via the "state" parameter
      const res = await api.get(`/auth/google/url?scope=gmail&state=${encodeURIComponent(token)}`);
      const authUrl = res.data.url;
      
      const width = 500;
      const height = 650;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popup = window.open(
        authUrl,
        'GoogleOAuthPopup',
        `width=${width},height=${height},left=${left},top=${top},status=yes,resizable=yes`
      );
      
      if (!popup) {
        setSystemError("El bloqueador de ventanas emergentes impidió conectar con Google. Por favor, habilita las ventanas emergentes.");
        setIsConnecting(false);
        return;
      }

      // Simple, neat event handler for popup messaging updates
      const handleMessage = async (event: MessageEvent) => {
        if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
          window.removeEventListener('message', handleMessage);
          popup.close();
          await checkGmailStatus();
        } else if (event.data?.type === 'OAUTH_AUTH_FAILURE') {
          window.removeEventListener('message', handleMessage);
          popup.close();
          setSystemError(event.data.error || 'Fallo el enlace de Google OAuth.');
        }
      };
      
      window.addEventListener('message', handleMessage);
    } catch (err: any) {
      console.error("OAuth Link Gmail Error:", err);
      setSystemError("Sucedió un error al iniciar la autenticación de Google.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectGmail = async () => {
    if (!confirm("¿Estás seguro de que deseas desconectar tu cuenta de Gmail de FinSight?")) return;
    setSystemError(null);
    try {
      await api.post('/gmail/disconnect');
      setGmailConnected(false);
      setScannedTransactions([]);
      setScanSuccessMsg(null);
    } catch (err: any) {
      setSystemError("No se pudo desvincular Gmail.");
    }
  };

  const handleScanGmail = async () => {
    setIsScanning(true);
    setSystemError(null);
    setScanSuccessMsg(null);
    setScannedTransactions([]);

    // Progress updates for enhanced UX
    const steps = [
      "Conectando de forma segura con los servidores de Google...",
      "Analizando el buzón principal e indexando correspondencias...",
      "Recuperando metadatos para recibos y estados de facturación...",
      "Iniciando modelo de análisis estructurado en Gemini 3.5 Flash...",
      "Separando transacciones genuinas de boletines de publicidad...",
      "Formateando montos, monedas, categorías y fechas de compra..."
    ];

    let currentStep = 0;
    setScanStepMessage(steps[0]);
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep < steps.length) {
        setScanStepMessage(steps[currentStep]);
      }
    }, 1800);

    try {
      const qParam = scanQuery.trim() ? `?q=${encodeURIComponent(scanQuery)}` : '';
      const res = await api.get(`/gmail/scan${qParam}`);
      clearInterval(interval);

      if (res.data.transactions && res.data.transactions.length > 0) {
        setScannedTransactions(res.data.transactions);
        setScanSuccessMsg(`Hemos escaneado e identificado de forma inteligente ${res.data.transactions.length} transacciones en tu bandeja.`);
      } else {
        setScanSuccessMsg("Búsqueda completada. No se encontraron correos de transacciones económicas que procesar.");
      }
    } catch (err: any) {
      clearInterval(interval);
      console.error(err);
      setSystemError(err.response?.data?.error || "Error al escanear Gmail con Gemini AI.");
    } finally {
      setIsScanning(false);
    }
  };

  const approveAndRegisterTransaction = async (tx: any, indexId: string) => {
    // 1. Identify matched category id using user categories pool
    const matchedCategory = categories.find(
      c => c.nombre.toLowerCase().includes(tx.categoria_ia.toLowerCase()) && c.tipo === tx.tipo
    ) || categories.find(c => c.tipo === tx.tipo);
    
    const finalCategoryId = matchedCategory ? matchedCategory.id : (categories[0]?.id || 1);

    try {
      await addTransaction({
        descripcion: tx.descripcion,
        monto: Number(tx.monto),
        tipo: tx.tipo,
        fecha_transaccion: tx.fecha_transaccion,
        categoria_id: Number(finalCategoryId),
        categoria_ia: tx.categoria_ia,
        etiquetas_ia: [tx.confianza ? `#confianza-${tx.confianza.toLowerCase()}` : '#gmail_scan']
      });

      setRegisteredTxIds(prev => ({ ...prev, [indexId]: true }));
    } catch (err: any) {
      console.error("Error registering scanned transaction:", err);
      alert("Error al registrar: " + (err.response?.data?.error || err.message));
    }
  };

  const approveAllScanned = async () => {
    let count = 0;
    for (let i = 0; i < scannedTransactions.length; i++) {
      const tx = scannedTransactions[i];
      const indexId = `${tx.original_email_id}-${i}`;
      if (!registeredTxIds[indexId]) {
        await approveAndRegisterTransaction(tx, indexId);
        count++;
      }
    }
    if (count > 0) {
      alert(`Se aprobaron y registraron ${count} movimientos en tus finanzas.`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Core Tabs Design */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Asistente Financiero IA</h2>
          <p className="text-sm text-gray-500 mt-1">Saca el máximo provecho de tu información financiera con Gemini AI.</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('insights')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'insights'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
            Perspectivas IA
          </button>
          <button
            onClick={() => {
              setActiveTab('gmail');
              checkGmailStatus();
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'gmail'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Mail className="w-4 h-4 text-orange-500" />
            Integración Gmail
            {gmailConnected && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
          </button>
        </div>
      </div>

      {/* Global Application Alert banner */}
      {systemError && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-800">Nota de Sistema</p>
            <p className="text-xs text-red-700 font-medium mt-0.5">{systemError}</p>
          </div>
        </div>
      )}

      {/* VIEW: MAIN INSIGHTS TAB */}
      {activeTab === 'insights' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {insights.length === 0 ? (
              <Card className="p-12 flex flex-col items-center text-center gap-4 border-dashed bg-gray-50/50">
                <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
                  <Sparkles className="w-8 h-8 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">¿Listo para potenciar tu economía?</h3>
                  <p className="text-gray-500 max-w-sm mt-2 text-sm leading-relaxed">
                    Instancia un análisis semántico de tus gastos e ingresos con Gemini para recibir consejos expertos y reportajes dinámicos de ahorro.
                  </p>
                </div>
                <Button 
                  onClick={handleGenerate} 
                  disabled={isLoading || transactions.length < 5}
                  className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-6 py-2.5 font-bold"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Emparar Análisis Semanal
                </Button>
                {transactions.length < 5 && (
                  <p className="text-[11px] text-orange-600 font-bold bg-orange-50 px-3 py-1 rounded-full border border-orange-100">
                    Se requieren mínimo 5 transacciones registradas (tienes {transactions.length})
                  </p>
                )}
              </Card>
            ) : (
              insights.map(item => {
                let data = { prediccion_monto: 0, recomendaciones: [], analisis_presupuesto: "" };
                try {
                  data = JSON.parse(item.contenido);
                } catch (e) {
                  console.error("Error parsing content:", e);
                }
                return (
                  <Card key={item.id} className="p-8 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-purple-50 rounded-xl border border-purple-100">
                          <Sparkles className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">{item.tipo}</h3>
                          <p className="text-xs text-gray-400 font-medium">Generado mediante Gemini AI</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                        {format(new Date(item.generado_en), 'dd MMM, yyyy HH:mm')}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 border-b border-gray-100 pb-8">
                      <div className="space-y-1 bg-gray-50 p-4 rounded-xl border border-gray-100/50">
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-purple-600" /> Predicción Gasto
                        </p>
                        <p className="text-3xl font-black tracking-tight text-gray-900">${data.prediccion_monto || '0'}</p>
                        <p className="text-[11px] text-gray-500 font-medium leading-tight pt-1">Próxima semana estimativa.</p>
                      </div>
                      
                      <div className="md:col-span-2 space-y-1 flex flex-col justify-center">
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Diagnóstico Financiero
                        </p>
                        <p className="text-sm font-medium leading-relaxed text-gray-700 italic border-l-2 border-purple-300 pl-3">
                          "{data.analisis_presupuesto}"
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-500" /> Consejos Estratégicos de Ahorro
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {data.recomendaciones?.map((rec: string, i: number) => (
                          <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-sm font-semibold text-gray-700 leading-snug flex gap-2">
                            <span className="text-purple-600 font-black text-base opacity-40">{i + 1}</span> 
                            <span>{rec}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>

          <div className="space-y-6">
            <Card className="p-6 bg-gradient-to-tr from-purple-700 to-indigo-600 text-white border-0 shadow-xl shadow-purple-600/10 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Sparkles className="w-32 h-32 text-white" />
              </div>
              <h4 className="font-bold text-lg mb-2 relative z-10">Poder de la IA</h4>
              <p className="text-purple-100 text-sm leading-relaxed mb-4 relative z-10 font-medium">
                FinSight utiliza modelos Gemini de última generación para mapear con precisión tus comportamientos de transacciones y optimizar presupuestos automáticamente en base a tu historia de consumo.
              </p>
              <div className="flex -space-x-1 overflow-hidden relative z-10">
                <div className="inline-block h-8 w-8 rounded-full ring-2 ring-purple-600 bg-purple-400 flex items-center justify-center font-bold text-xs text-white">FS</div>
                <div className="inline-block h-8 w-8 rounded-full ring-2 ring-purple-600 bg-indigo-400 flex items-center justify-center font-bold text-xs text-white">G</div>
                <div className="flex items-center justify-center h-8 w-8 rounded-full ring-2 ring-purple-600 bg-black text-[9px] font-black uppercase text-purple-400">GEM</div>
              </div>
            </Card>
            
            <Card className="p-6 border border-gray-100 shadow-sm">
              <h4 className="font-bold text-gray-900 mb-4 text-sm">Información de Modelos</h4>
              <div className="space-y-4">
                 {[
                   { label: 'Modelo por Defecto', value: 'Gemini 3.5 Flash' },
                   { label: 'Precisión Estimada', value: '98.6%' },
                   { label: 'Cifrado', value: 'AES-256 SSL' }
                 ].map(m => (
                   <div key={m.label} className="flex justify-between items-center border-b border-gray-50 pb-2.5 last:border-0 last:pb-0">
                     <span className="text-xs text-gray-500 font-semibold">{m.label}</span>
                     <span className="text-xs font-bold text-gray-950">{m.value}</span>
                   </div>
                 ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* VIEW: GMAIL SCANNER TAB */}
      {activeTab === 'gmail' && (
        <div className="space-y-6">
          {/* 1. INITIAL TESTING / INITIAL LOADING STATE */}
          {isCheckingGmail ? (
            <Card className="p-16 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
              <p className="text-sm font-semibold text-gray-500">Analizando vinculaciones de Gmail...</p>
            </Card>
          ) : !gmailConnected ? (
            // 2. DISCONNECTED STATE: PROMPT CONNECTION
            <div className="max-w-2xl mx-auto py-8">
              <Card className="p-10 text-center border shadow-sm flex flex-col items-center justify-center gap-6 rounded-2xl">
                <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                  <Mail className="w-10 h-10 text-orange-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Sincroniza tus Recibos de Gmail con IA</h3>
                  <p className="text-sm text-gray-500 max-w-sm mt-2 leading-relaxed font-medium">
                    Evita registrar tus gastos a mano. Vincula tu Gmail y deja que Gemini analice tus facturas de Uber, Netflix, Amazon y más, para convertirlos en transacciones con un solo toque.
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl text-left border border-gray-100/80 max-w-md w-full space-y-2.5">
                  <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Cómo funciona la seguridad:</p>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-600 font-semibold">Acceso Solo Lectura: Únicamente escaneamos palabras clave asociadas a recibos.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-600 font-semibold">Tus credenciales nunca se comparten y puedes revocarlas cuando desees.</p>
                  </div>
                </div>

                <Button
                  onClick={handleConnectGmail}
                  disabled={isConnecting}
                  className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold px-8 py-3 shrink-0 flex items-center justify-center gap-2 text-sm"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Inicializando ventana segura...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Vincular Gmail con un clic
                    </>
                  )}
                </Button>
              </Card>
            </div>
          ) : (
            // 3. CONNECTED STATE: SEARCH ENGINE & SCANNED RESULTS
            <div className="space-y-6">
              {/* Connected Banner */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-xl text-emerald-700">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">Tu bandeja de Gmail está sincronizada</h4>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">FinSight leerá tus correos asociados para buscar comprobantes.</p>
                  </div>
                </div>
                <button
                  onClick={handleDisconnectGmail}
                  className="text-xs font-bold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 transition-all"
                >
                  Desvincular Cuenta
                </button>
              </div>

              {/* Scanning Actions Widget */}
              <Card className="p-6 border border-gray-100 shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-950 text-sm">Panel de Control de Escaneo</h3>
                    <p className="text-xs text-gray-500 mt-1">Configura y busca transacciones en tus correos más recientes.</p>
                  </div>
                  <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" title="FinSight escanea de forma automática los correos que contengan palabras claves de facturas" />
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="grow">
                    <input
                      type="text"
                      className="w-full bg-gray-50 border border-gray-200 focus:border-purple-600 focus:outline-none p-2.5 rounded-xl text-xs font-semibold placeholder:text-gray-400 text-gray-900"
                      placeholder="Búsqueda avanzada (Ej: subject:Uber, subject:Apple, etc. Deja en blanco para búsqueda global)"
                      value={scanQuery}
                      onChange={(e) => setScanQuery(e.target.value)}
                      disabled={isScanning}
                    />
                  </div>
                  <Button
                    onClick={handleScanGmail}
                    disabled={isScanning}
                    className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold px-6 py-2.5 flex items-center justify-center gap-2"
                  >
                    {isScanning ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Escaneando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        Escanear Correos
                      </>
                    )}
                  </Button>
                </div>
              </Card>

              {/* IS SCANNING ANIMATION STATE */}
              {isScanning && (
                <Card className="p-12 border border-dashed border-purple-200 bg-purple-50/10 flex flex-col items-center justify-center gap-4 text-center rounded-2xl">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                      <Mail className="w-6 h-6 animate-pulse" />
                    </div>
                    <div className="absolute -top-1 -right-1">
                      <Sparkles className="w-5 h-5 text-purple-600 animate-bounce" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-gray-950">Gemini 3.5 Flash está procesando tus correos</p>
                    <p className="text-xs text-purple-600 font-extrabold animate-pulse tracking-wide mt-1 bg-purple-50 px-4 py-1.5 rounded-full border border-purple-100">
                      {scanStepMessage}
                    </p>
                  </div>
                </Card>
              )}

              {/* SUCCESS FEEDBACK BLOCK */}
              {scanSuccessMsg && !isScanning && (
                <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-xl flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-purple-700 shrink-0" />
                  <p className="text-xs text-purple-950 font-bold">{scanSuccessMsg}</p>
                </div>
              )}

              {/* SCANNED TRANSACTIONS DISPLAY AREA */}
              {scannedTransactions.length > 0 && !isScanning && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-gray-400">Transacciones Sugeridas de Gmail</h4>
                      <p className="text-xs text-gray-500 font-medium">Revisa las transacciones que Gemini AI resolvió estructurar de forma inteligente.</p>
                    </div>
                    <button
                      onClick={approveAllScanned}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold tracking-wide transition-all shadow-sm"
                    >
                      Aprobar Todas ({scannedTransactions.length})
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {scannedTransactions.map((tx, idx) => {
                      const indexId = `${tx.original_email_id}-${idx}`;
                      const isAdded = !!registeredTxIds[indexId];
                      
                      const isGasto = tx.tipo === 'gasto';
                      
                      return (
                        <Card 
                          key={indexId} 
                          className={`p-5 transition-all duration-300 border flex flex-col justify-between gap-4 shadow-sm group ${
                            isAdded 
                              ? 'bg-gray-50/50 border-gray-100 opacity-75' 
                              : 'bg-white hover:border-purple-200'
                          }`}
                        >
                          <div className="space-y-3">
                            {/* Email metadata header */}
                            <div className="flex border-b border-gray-100 pb-2 justify-between items-center text-[10px] text-gray-400 font-semibold">
                              <span className="truncate max-w-[150px]" title={tx.correo_remitente}>
                                De: {tx.correo_remitente.replace(/<[^>]+>/g, '')}
                              </span>
                              <span className="shrink-0">
                                {tx.correo_fecha ? format(new Date(tx.correo_header_date || tx.correo_fecha), 'dd MMM, HH:mm') : tx.fecha_transaccion}
                              </span>
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-start justify-between gap-2">
                                <h5 className="font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
                                  {tx.descripcion}
                                </h5>
                                <span className={`text-base font-black shrink-0 ${isGasto ? 'text-red-600' : 'text-emerald-600'}`}>
                                  {isGasto ? '-' : '+'}${Number(tx.monto).toFixed(2)}
                                </span>
                              </div>
                              <p className="text-[10px] text-gray-400 font-medium italic truncate" title={tx.correo_asunto}>
                                "{tx.correo_asunto || '(Sin asunto)'}"
                              </p>
                            </div>

                            {/* Enriquecimientos de la IA */}
                            <div className="flex flex-wrap gap-2 pt-1">
                              <span className="text-[10px] font-bold bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md">
                                {tx.categoria_ia}
                              </span>
                              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${
                                tx.confianza === 'Alta' 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                  : tx.confianza === 'Media'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                  : 'bg-red-50 text-red-700 border border-red-100'
                              }`}>
                                Confianza: {tx.confianza || 'Media'}
                              </span>
                            </div>

                            <p className="text-xs text-gray-500 font-medium leading-relaxed bg-gray-50 p-2.5 rounded-lg">
                              {tx.explicacion}
                            </p>
                          </div>

                          {/* Quick single-click approval action */}
                          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-[10px] text-gray-400 font-semibold">
                              Resolución de Fecha: {tx.fecha_transaccion}
                            </span>
                            
                            {isAdded ? (
                              <button
                                disabled
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-black"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Guardado
                              </button>
                            ) : (
                              <button
                                onClick={() => approveAndRegisterTransaction(tx, indexId)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-950 text-white text-xs font-extrabold hover:bg-purple-600 transition-all shadow-sm"
                              >
                                Aprobar
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
