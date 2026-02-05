import React from 'react';
import { Upload, FileText, Loader2, FolderOpen } from 'lucide-react';

interface DropZoneProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClear: () => void;
  isProcessing: boolean;
}

const DropZone: React.FC<DropZoneProps> = ({ onFileSelect, selectedFile, onClear, isProcessing }) => {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0 && !isProcessing) {
      validateAndSetFile(files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      onFileSelect(file);
    } else {
      alert("Por favor, envie um arquivo PDF válido.");
    }
  };

  if (selectedFile) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-gradient-to-r from-red-50 to-white border border-red-200 border-dashed rounded-lg p-3 flex items-center justify-between shadow-sm animate-fade-in gap-4 h-16">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center shadow-inner shrink-0">
            <FileText className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex flex-col justify-center overflow-hidden">
            <p className="text-sm font-bold text-gray-800 truncate max-w-[200px] md:max-w-xs">{selectedFile.name}</p>
            <p className="text-[10px] font-medium text-gray-500 uppercase">{(selectedFile.size / 1024).toFixed(1)} KB</p>
          </div>
        </div>
        
        <button 
          onClick={onClear}
          disabled={isProcessing}
          className="shrink-0 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50"
        >
          Remover
        </button>
      </div>
    );
  }

  return (
    <div 
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="w-full max-w-2xl mx-auto h-20"
    >
      <input 
        type="file" 
        id="fileInput" 
        accept=".pdf" 
        onChange={handleInputChange} 
        className="hidden" 
        disabled={isProcessing}
      />
      <label 
        htmlFor="fileInput" 
        className="cursor-pointer w-full h-full bg-white border-2 border-gray-300 border-dashed rounded-xl flex items-center justify-between px-6 hover:border-red-500 hover:bg-red-50/30 transition-all group shadow-sm hover:shadow-md"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gray-100 group-hover:bg-red-100 rounded-lg flex items-center justify-center transition-colors">
            {isProcessing ? (
               <Loader2 className="w-5 h-5 text-red-600 animate-spin" />
            ) : (
               <FolderOpen className="w-5 h-5 text-gray-400 group-hover:text-red-600 transition-colors" />
            )}
          </div>
          <div className="text-left">
            <h3 className="text-sm font-bold text-gray-700 group-hover:text-red-700 transition-colors">Carregar Relatório PDF</h3>
            <p className="text-xs text-gray-400">Clique ou arraste o arquivo PDF aqui</p>
          </div>
        </div>
        
        <div className="hidden sm:flex items-center gap-2">
            <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded border border-gray-200">
                .pdf
            </span>
            <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <Upload className="w-4 h-4" />
            </div>
        </div>
      </label>
    </div>
  );
};

export default DropZone;