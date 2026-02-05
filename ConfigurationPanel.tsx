import React from 'react';
import { TagConfig } from '../types';
import { Settings, LayoutGrid, Rows, Type, ScanBarcode, Hash, ChevronRight } from 'lucide-react';

interface ConfigurationPanelProps {
  config: TagConfig;
  setConfig: React.Dispatch<React.SetStateAction<TagConfig>>;
  disabled: boolean;
}

const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({ config, setConfig, disabled }) => {
  const handleChange = (key: keyof TagConfig, value: number) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Sidebar Header */}
      <div className="p-6 border-b border-slate-100">
        <h2 className="text-xl font-bold text-slate-800">Controles</h2>
        <p className="text-sm text-slate-500 mt-1">Configurações de Layout</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        
        {/* Layout Controls - Block Style */}
        <div className="space-y-4">
           <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
             <LayoutGrid className="w-4 h-4 text-[#3b6db3]" />
             Estrutura da Página
           </h3>
           
           <div className="space-y-3">
             {/* Control Block */}
             <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 hover:border-blue-200 transition-colors">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">
                    Colunas por Linha
                </label>
                <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Qtd:</span>
                    <input
                        type="number"
                        min="1"
                        max="10"
                        value={config.columnsPerRow}
                        onChange={(e) => handleChange('columnsPerRow', parseInt(e.target.value) || 1)}
                        disabled={disabled}
                        className="w-20 text-right font-bold text-slate-700 bg-transparent border-b border-slate-300 focus:border-[#3b6db3] focus:outline-none py-1"
                    />
                </div>
             </div>

             <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 hover:border-blue-200 transition-colors">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">
                    Linhas por Página
                </label>
                <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Qtd:</span>
                    <input
                        type="number"
                        min="1"
                        max="20"
                        value={config.rowsPerPage}
                        onChange={(e) => handleChange('rowsPerPage', parseInt(e.target.value) || 1)}
                        disabled={disabled}
                        className="w-20 text-right font-bold text-slate-700 bg-transparent border-b border-slate-300 focus:border-[#3b6db3] focus:outline-none py-1"
                    />
                </div>
             </div>
           </div>
        </div>

        {/* Typography Controls - Block Style */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Type className="w-4 h-4 text-[#3b6db3]" />
            Aparência
          </h3>
          
          <div className="space-y-3">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-slate-600">Tamanho Título</label>
                    <span className="text-xs bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-500">{config.fontSizeTitle}pt</span>
                </div>
                <input
                    type="range"
                    min="6"
                    max="14"
                    step="0.5"
                    value={config.fontSizeTitle}
                    onChange={(e) => handleChange('fontSizeTitle', parseFloat(e.target.value))}
                    disabled={disabled}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#3b6db3]"
                />
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-slate-600">Escala Código</label>
                    <span className="text-xs bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-500">{config.barcodeScale}%</span>
                </div>
                <input
                    type="range"
                    min="50"
                    max="150"
                    step="5"
                    value={config.barcodeScale}
                    onChange={(e) => handleChange('barcodeScale', parseInt(e.target.value))}
                    disabled={disabled}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#3b6db3]"
                />
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-slate-600">Fonte Patrimônio</label>
                    <span className="text-xs bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-500">{config.fontSizeCode}pt</span>
                </div>
                <input
                    type="range"
                    min="6"
                    max="18"
                    step="0.5"
                    value={config.fontSizeCode}
                    onChange={(e) => handleChange('fontSizeCode', parseFloat(e.target.value))}
                    disabled={disabled}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#3b6db3]"
                />
            </div>
          </div>
        </div>

      </div>

      {/* Info Block at Bottom */}
      <div className="p-6 border-t border-slate-100 bg-slate-50">
        <div className="flex items-center justify-between text-slate-700">
            <span className="text-sm font-medium">Etiquetas p/ Pág:</span>
            <span className="text-lg font-bold text-[#3b6db3]">
                {config.columnsPerRow * config.rowsPerPage}
            </span>
        </div>
      </div>
    </div>
  );
};

export default ConfigurationPanel;