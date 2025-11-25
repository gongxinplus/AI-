import React, { useState } from 'react';
import Header from './components/Header';
import InputStep from './components/InputStep';
import PreviewStep from './components/PreviewStep';
import { ProposalFormData, AppStep } from './types';
import { generateProposalStream } from './services/geminiService';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.INPUT);
  const [formData, setFormData] = useState<ProposalFormData | null>(null);
  const [content, setContent] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (data: ProposalFormData) => {
    setFormData(data);
    setStep(AppStep.PREVIEW);
    setContent('');
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

  const handleRegenerate = () => {
    if (formData) {
      handleGenerate(formData);
    }
  };

  const handleBack = () => {
    // If streaming, we might want to cancel (not implemented for simplicity, just switching view)
    if (!isStreaming) {
      setStep(AppStep.INPUT);
    } else {
        if(window.confirm("Generation is in progress. Are you sure you want to go back? This will stop the view update.")) {
             setStep(AppStep.INPUT);
             setIsStreaming(false); 
        }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header />

      <main className="flex-1 flex flex-col">
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
            projectName={formData.projectName}
            isStreaming={isStreaming}
            onBack={handleBack}
            onRegenerate={handleRegenerate}
          />
        )}
      </main>
    </div>
  );
};

export default App;