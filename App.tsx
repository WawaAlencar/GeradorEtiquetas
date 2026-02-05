import React, { useState, useEffect } from 'react';
import ConfigurationPanel from './ConfigurationPanel';
import DropZone from './DropZone';
import { TagConfig, ProcessingState, AssetData, AppMode, ReportItem } from './types';
import { parsePdfFile, parseLocationReportPdf } from './pdf';
import { generateAndDownloadDoc } from './docGenerator';
import { AlertCircle, CheckCircle2, FileDown, Loader2, FileText, Tag, Table2, MousePointer2, ArrowRightLeft, Search, Lock, ArrowRight, ShieldCheck, LogOut } from 'lucide-react';
import * as XLSX from 'xlsx';

const App: React.FC = () => {
  // Estado de Autenticação
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState(false);

  // Estado da Aplicação
  const [mode, setMode] = useState<AppMode>('tags');

  // Configuração das Etiquetas
  const [config, setConfig] = useState<TagConfig>({
    columnsPerRow: 4,
    rowsPerPage: 9,
    fontSizeTitle: 8,
    fontSizeCode: 10,
    barcodeScale: 100
  });
  
  // Estado de Processamento
  const [file, setFile] = useState<File | null>(null);
  const [processingState, setProcessingState] = useState<ProcessingState>({ status: 'idle' });
  
  // Dados extraídos
  const [tagAssets, setTagAssets] = useState<AssetData[]>([]);
  const [reportItems, setReportItems] = useState<ReportItem[]>([]);
  
  // Dados para comparação (RMB)
  const [oldAssetsInput, setOldAssetsInput] = useState<string>("");
  const [parsedOldAssets, setParsedOldAssets] = useState<string[]>([]);

  // Extrai patrimônios do texto colado automaticamente
  useEffect(() => {
    if (mode === 'excel_report') {
        const matches = oldAssetsInput.match(/\b90\d{5}\b/g) || [];
        // Remove duplicatas do input manual
        const unique = Array.from(new Set(matches));
        setParsedOldAssets(unique);
    }
  }, [oldAssetsInput, mode]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === "3040") {
      setIsAuthenticated(true);
      setLoginError(false);
    } else {
      setLoginError(true);
      setPasswordInput("");
    }
  };

  const handleClear = () => {
    setFile(null);
    setTagAssets([]);
    setReportItems([]);
    setProcessingState({ status: 'idle' });
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPasswordInput("");
    setLoginError(false);
    handleClear();
    setOldAssetsInput("");
  };

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setProcessingState({ status: 'processing', message: 'Lendo arquivo PDF...' });
    
    try {
      if (mode === 'tags') {
          const data = await parsePdfFile(selectedFile);
          setTagAssets(data);
          setProcessingState({ status: 'success', message: `Sucesso! ${data.length} patrimônios encontrados.` });
      } else {
          // Modo Relatório Excel / Comparação
          const data = await parseLocationReportPdf(selectedFile);
          setReportItems(data);
          setProcessingState({ status: 'success', message: `PDF Processado! ${data.length} itens extraídos.` });
      }
    } catch (error: any) {
      setFile(null);
      setProcessingState({ status: 'error', message: error.message || 'Erro ao processar arquivo.' });
    }
  };

  const handleGenerateTags = async () => {
    if (tagAssets.length === 0) return;
    setProcessingState({ status: 'processing', message: 'Gerando documento Word...' });
    try {
      await generateAndDownloadDoc(tagAssets, config);
      setProcessingState({ status: 'success', message: 'Documento gerado! O download iniciará em breve.' });
    } catch (error: any) {
      setProcessingState({ status: 'error', message: 'Falha ao gerar documento: ' + error.message });
    }
  };

  const handleGenerateExcel = async () => {
      if (reportItems.length === 0) return;
      setProcessingState({ status: 'processing', message: 'Gerando planilha Excel...' });
      
      try {
        const wb = XLSX.utils.book_new();

        // LÓGICA DE COMPARAÇÃO
        // Se houver dados antigos colados, gera o relatório comparativo
        if (parsedOldAssets.length > 0) {
            const pdfPatrimonios = new Set(reportItems.map(i => i.patrimonio));
            
            // Achados: Estão na lista antiga, mas NÃO estão no PDF atual
            const achados = parsedOldAssets.filter(p => !pdfPatrimonios.has(p));
            
            // Atuais (Do PDF): Simplesmente a lista do PDF
            const atuais = reportItems.map(i => i.patrimonio);
            
            // Prepara colunas paralelas (array of arrays)
            const maxRows = Math.max(parsedOldAssets.length, atuais.length, achados.length);
            const dataRows = [];
            
            // Cabeçalho
            dataRows.push(["Patrimônios Antigos (Ref)", "Patrimônios Atuais (PDF)", "Patrimônios Achados (Diferença)"]);
            
            for (let i = 0; i < maxRows; i++) {
                dataRows.push([
                    parsedOldAssets[i] || "", // Coluna A
                    atuais[i] || "",          // Coluna B
                    achados[i] || ""          // Coluna C
                ]);
            }

            const wsCompare = XLSX.utils.aoa_to_sheet(dataRows);
            wsCompare['!cols'] = [{wch: 25}, {wch: 25}, {wch: 25}];
            XLSX.utils.book_append_sheet(wb, wsCompare, "Comparativo RMB");
        }

        // Gera também a aba com os detalhes completos do PDF (Comportamento original)
        const wsDetails = XLSX.utils.json_to_sheet(reportItems.map(item => ({
            "Patrimônio": item.patrimonio,
            "Item Material": item.itemMaterial,
            "Descrição": item.descricao,
            "Data Tombamento": item.dataTombamento,
            "Valor Histórico": item.valor,
            "UORG": item.uorg,
            "Destinação": item.destinacao
        })));

        // Ajusta largura das colunas
        wsDetails['!cols'] = [
            {wch: 12}, // Pat
            {wch: 10}, // Item
            {wch: 50}, // Desc
            {wch: 15}, // Data
            {wch: 15}, // Valor
            {wch: 10}, // UORG
            {wch: 30}  // Dest
        ];
        XLSX.utils.book_append_sheet(wb, wsDetails, "Detalhes PDF Atual");
        
        // Salva arquivo
        const fileName = parsedOldAssets.length > 0 ? "Relatorio_RMB_Comparativo.xlsx" : "Relatorio_Bens_Nao_Localizados.xlsx";
        XLSX.writeFile(wb, fileName);
        
        setProcessingState({ status: 'success', message: 'Excel gerado com sucesso!' });
      } catch (error: any) {
        setProcessingState({ status: 'error', message: 'Falha ao gerar Excel: ' + error.message });
      }
  };

  // --------------------------------------------------------------------------
  // TELA DE LOGIN / SPLASH
  // --------------------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-8 animate-[fade-in_0.6s_ease-out]">
          
          {/* Logo Animation Section */}
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-20"></div>
              <div className="w-20 h-20 bg-[#3b6db3] rounded-2xl flex items-center justify-center shadow-lg transform transition-transform hover:scale-105">
                <Tag className="w-10 h-10 text-white animate-bounce" style={{ animationDuration: '2s' }} />
              </div>
            </div>
            
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-bold text-slate-800">Gerador de Etiquetas - UPAT</h1>
              <p className="text-sm text-slate-500">Unidade de Patrimônio</p>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-2">
                <Lock className="w-3 h-3" /> Senha de Acesso
              </label>
              <div className="relative">
                <input 
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className={`w-full px-4 py-3 bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 transition-all text-slate-900 placeholder:text-slate-400 ${
                    loginError 
                    ? 'border-red-300 focus:ring-red-200 text-red-900' 
                    : 'border-slate-200 focus:ring-blue-100 focus:border-[#3b6db3]'
                  }`}
                  placeholder="••••"
                  autoFocus
                />
              </div>
              {loginError && (
                <p className="text-xs text-red-500 flex items-center gap-1 animate-pulse">
                  <AlertCircle className="w-3 h-3" /> Senha incorreta.
                </p>
              )}
            </div>

            <button 
              type="submit"
              className="w-full bg-[#3b6db3] hover:bg-[#2c5282] text-white font-bold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group"
            >
              Entrar
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          {/* Footer Clean */}
          <div className="text-center pt-4 border-t border-slate-100">
             <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
               <ShieldCheck className="w-3 h-3" /> Acesso restrito
             </p>
          </div>
        </div>
        
        {/* Institucional Bottom */}
        <div className="mt-8 opacity-50">
             <img 
               src="https://www.gov.br/ebserh/pt-br/hospitais-universitarios/regiao-nordeste/hupaa-ufal/Designsemnome4.png" 
               alt="Logos" 
               className="h-10 w-auto grayscale hover:grayscale-0 transition-all duration-500"
             />
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // APLICAÇÃO PRINCIPAL
  // --------------------------------------------------------------------------
  return (
    <div className="flex min-h-screen bg-white font-sans text-slate-900">
      
      {/* Sidebar Navigation & Config */}
      <aside className="w-80 shrink-0 border-r border-slate-200 hidden md:flex flex-col z-20 bg-white h-screen sticky top-0">
        
        {/* Navigation Section */}
        <div className="p-6 border-b border-slate-100">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <MousePointer2 className="w-5 h-5 text-[#3b6db3]" />
                Módulos
            </h2>
            <nav className="space-y-2">
                <button 
                    onClick={() => { setMode('tags'); handleClear(); }}
                    className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${mode === 'tags' ? 'bg-[#3b6db3] text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                    <Tag className="w-5 h-5" />
                    <span className="font-semibold">Gerador de Etiquetas</span>
                </button>
                <button 
                    onClick={() => { setMode('excel_report'); handleClear(); }}
                    className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${mode === 'excel_report' ? 'bg-[#3b6db3] text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                    <Table2 className="w-5 h-5" />
                    <span className="font-semibold">Bens Não Localizados</span>
                </button>
            </nav>

            <button 
                onClick={handleLogout}
                className="mt-6 w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 text-red-600 hover:bg-red-50 transition-colors border border-transparent hover:border-red-100"
            >
                <LogOut className="w-5 h-5" />
                <span className="font-semibold text-sm">Sair</span>
            </button>
        </div>

        {/* Configuration Panel (Only active in Tags mode) */}
        {mode === 'tags' ? (
            <ConfigurationPanel 
              config={config} 
              setConfig={setConfig} 
              disabled={processingState.status === 'processing'} 
            />
        ) : (
             <div className="p-6 space-y-4">
                <div className="text-slate-500 text-sm">
                    <p className="mb-2"><strong>Modo RMB:</strong></p>
                    <p className="mb-2">Cole os códigos antigos e envie o PDF novo para gerar o comparativo.</p>
                </div>
                
                {/* Contador Informativo */}
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-600">Antigos (Input):</span>
                        <span className="font-bold text-[#3b6db3]">{parsedOldAssets.length}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-600">Atuais (PDF):</span>
                        <span className="font-bold text-[#1D6F42]">{reportItems.length}</span>
                    </div>
                </div>
             </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Header Institucional */}
        <header className="bg-white shrink-0 px-8 pt-8 pb-4 flex flex-col items-center">
            
            {/* Logos */}
            <div className="mb-6 w-full flex justify-center">
                <img 
                  src="https://www.gov.br/ebserh/pt-br/hospitais-universitarios/regiao-nordeste/hupaa-ufal/Designsemnome4.png" 
                  alt="Logos Institucionais SUS UFAL EBSERH" 
                  className="h-auto max-h-32 w-auto max-w-4xl object-contain"
                />
            </div>

            {/* Títulos Dinâmicos */}
            <div className="text-center space-y-1">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                    {mode === 'tags' ? 'Gerador de Etiquetas de Patrimônio' : 'Relatório de Bens Não Localizados'}
                </h1>
                <p className="text-slate-500 font-medium text-lg">
                    Unidade de Patrimônio / Divisão de Administração e Finanças
                </p>
            </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50/30 p-8 flex flex-col items-center">
            
            <div className="w-full max-w-4xl space-y-6 mt-4">
                
                {/* Status Messages */}
                {processingState.status === 'error' && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-6 py-4 rounded shadow-sm flex items-center gap-4">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                    <div>
                        <p className="font-bold">Erro no Processamento</p>
                        <p className="text-sm">{processingState.message}</p>
                    </div>
                </div>
                )}

                {/* CONTAINER DUPLO PARA O MODO RELATÓRIO */}
                {mode === 'excel_report' && (
                    <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="bg-[#3b6db3] p-2 rounded-lg text-white">
                                <ArrowRightLeft className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Comparativo RMB</h3>
                                <p className="text-sm text-slate-500">
                                    Preencha os dados antigos e carregue o novo relatório.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* LADO ESQUERDO: Input de Texto */}
                            <div className="space-y-3">
                                <label className="block text-sm font-bold text-slate-700 flex items-center gap-2">
                                    1. Patrimônios Antigos (Ref)
                                    <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                        Cole aqui
                                    </span>
                                </label>
                                <textarea
                                    className="w-full h-40 p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3b6db3] focus:border-transparent text-sm font-mono text-slate-900 bg-white resize-none"
                                    placeholder="Cole a lista de patrimônios antigos aqui (Ex: 9018906, 9018909...)"
                                    value={oldAssetsInput}
                                    onChange={(e) => setOldAssetsInput(e.target.value)}
                                />
                                <p className="text-xs text-slate-500 text-right">
                                    {parsedOldAssets.length > 0 
                                        ? `${parsedOldAssets.length} códigos válidos identificados.` 
                                        : "Nenhum código 90xxxxx identificado."}
                                </p>
                            </div>

                            {/* LADO DIREITO: DropZone */}
                            <div className="space-y-3">
                                <label className="block text-sm font-bold text-slate-700 flex items-center gap-2">
                                    2. Relatório Atual (PDF)
                                    <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                        Upload
                                    </span>
                                </label>
                                <div className="h-40">
                                    <DropZone 
                                        onFileSelect={handleFileSelect} 
                                        selectedFile={file} 
                                        onClear={handleClear}
                                        isProcessing={processingState.status === 'processing'}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODO TAGS (Mantendo layout simples original) */}
                {mode === 'tags' && (
                    <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-[#3b6db3] p-2 rounded-lg text-white">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Carregar Dados</h3>
                                <p className="text-sm text-slate-500">
                                   Selecione o relatório contendo patrimônios (00090...)
                                </p>
                            </div>
                        </div>
                        <DropZone 
                            onFileSelect={handleFileSelect} 
                            selectedFile={file} 
                            onClear={handleClear}
                            isProcessing={processingState.status === 'processing'}
                        />
                    </div>
                )}

                {/* Painel de Resultados / Download */}
                {file && processingState.status !== 'error' && (
                    <div className="bg-[#f8fafc] border border-slate-200 rounded-xl p-8 shadow-sm animate-fade-in-up">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                            
                            {/* Summary Info */}
                            <div className="flex items-center gap-4">
                                <div className="bg-emerald-100 p-3 rounded-full">
                                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">
                                        {mode === 'tags' ? 'Arquivo Pronto' : 'Dados Processados'}
                                    </h3>
                                    <p className="text-slate-600 text-sm">
                                        {mode === 'tags' ? (
                                             tagAssets.length > 0 ? (
                                                <><span className="font-bold">{tagAssets.length}</span> etiquetas identificadas.</>
                                             ) : "Nenhuma etiqueta."
                                        ) : (
                                            <span className="flex flex-col">
                                                <span>PDF Atual: <strong>{reportItems.length}</strong> itens.</span>
                                                {parsedOldAssets.length > 0 && (
                                                    <span className="text-slate-500">Antigos (Ref): <strong>{parsedOldAssets.length}</strong> itens.</span>
                                                )}
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>

                            {/* Action Button */}
                            {mode === 'tags' ? (
                                <button
                                    onClick={handleGenerateTags}
                                    disabled={processingState.status === 'processing' || tagAssets.length === 0}
                                    className="px-6 py-3 bg-[#3b6db3] hover:bg-[#2c5282] text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {processingState.status === 'processing' ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Processando...
                                    </>
                                    ) : (
                                    <>
                                        <FileDown className="w-5 h-5" />
                                        Gerar Documento Word
                                    </>
                                    )}
                                </button>
                            ) : (
                                <button
                                    onClick={handleGenerateExcel}
                                    disabled={processingState.status === 'processing' || reportItems.length === 0}
                                    className="px-6 py-3 bg-[#1D6F42] hover:bg-[#155230] text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {processingState.status === 'processing' ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Gerando...
                                    </>
                                    ) : (
                                    <>
                                        <Table2 className="w-5 h-5" />
                                        {parsedOldAssets.length > 0 ? 'Baixar Excel Comparativo' : 'Baixar Relatório PDF em Excel'}
                                    </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
            
            {/* Footer Institucional Sutil */}
            <div className="mt-auto py-8 text-center">
                 <p className="text-xs text-slate-400">HUPAA-UFAL / EBSERH - Sistema de Gestão de Ativos</p>
            </div>
        </main>
      </div>
    </div>
  );
};

export default App;
