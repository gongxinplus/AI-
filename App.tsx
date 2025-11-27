
import React, { useState } from 'react';
import Header from './components/Header';
import InputStep from './components/InputStep';
import PreviewStep from './components/PreviewStep';
import { ProposalFormData, AppStep, ProposalVersion } from './types';
import { generateProposalStream } from './services/geminiService';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.INPUT);
  const [formData, setFormData] = useState<ProposalFormData | null>(null);
  const [content, setContent] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Version History State
  const [history, setHistory] = useState<ProposalVersion[]>([]);

  const saveCurrentToHistory = (label: string) => {
    if (!content) return;
    const newVersion: ProposalVersion = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      content: content,
      label: label
    };
    setHistory(prev => [newVersion, ...prev]);
  };

  const handleRestoreVersion = (version: ProposalVersion) => {
    if (isStreaming) return;
    
    // Save current before restoring old one? Optional, but good practice.
    // saveCurrentToHistory("Auto-save before restore"); 

    setContent(version.content);
  };

  const handleGenerate = async (data: ProposalFormData) => {
    setFormData(data);
    setStep(AppStep.PREVIEW);
    setContent(''); // Clean start
    setHistory([]); // Reset history for new project
    setIsStreaming(true);
    setError(null);

    try {
      await generateProposalStream(data, (chunk) => {
        setContent((prev) => prev + chunk);
      });
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while generating the proposal.");
    } finally {
      setIsStreaming(false);
    }
  };

  const handleRewrite = async (instructions: string) => {
    if (!formData) return;
    
    // 1. Auto-save current version before rewriting
    saveCurrentToHistory(instructions ? `重写: ${instructions.slice(0, 10)}...` : `版本 ${history.length + 1}`);

    // 2. Reset content for rewrite
    setContent('');
    setIsStreaming(true);
    setError(null);

    try {
      await generateProposalStream(formData, (chunk) => {
        setContent((prev) => prev + chunk);
      }, instructions);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while rewriting the proposal.");
    } finally {
      setIsStreaming(false);
    }
  };

  const handleBack = () => {
    // If streaming, we might want to cancel (not implemented for simplicity, just switching view)
    if (!isStreaming) {
      setStep(AppStep.INPUT);
    } else {
        if(window.confirm("生成正在进行中。确定要返回吗？这将停止当前的视图更新。")) {
             setStep(AppStep.INPUT);
             setIsStreaming(false); 
        }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header />

      <main className="flex-1 flex flex-col overflow-hidden">
        {error && (
            <div className="max-w-7xl mx-auto px-4 mt-4 w-full">
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{error}</span>
                    <button onClick={() => setError(null)} className="absolute top-0 bottom-0 right-0 px-4 py-3">
                        <span className="text-xl">&times;</span>
                    </button>
                </div>
            </div>
        )}

        {step === AppStep.INPUT && (
          <InputStep 
            onSubmit={handleGenerate} 
            isSubmitting={isStreaming && step === AppStep.INPUT} 
          />
        )}

        {step === AppStep.PREVIEW && formData && (
          <PreviewStep 
            content={content} 
            formData={formData}
            isStreaming={isStreaming}
            history={history}
            onBack={handleBack}
            onRegenerate={() => handleRewrite('')} // Basic regenerate without new instructions
            onRewrite={handleRewrite} // New prop for rewrite with instructions
            onUpdateContent={setContent}
            onRestoreVersion={handleRestoreVersion}
          />
        )}
      </main>
    </div>
  );
};

export default App;
