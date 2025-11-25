import React, { useRef, useState, useEffect } from 'react';
import { Icons } from './Icon';
import MarkdownRenderer from './MarkdownRenderer';

interface PreviewStepProps {
  content: string;
  projectName: string;
  isStreaming: boolean;
  onBack: () => void;
  onRegenerate: () => void;
}

const PreviewStep: React.FC<PreviewStepProps> = ({ 
  content, 
  projectName, 
  isStreaming, 
  onBack,
  onRegenerate 
}) => {
  const [copySuccess, setCopySuccess] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom while streaming
  useEffect(() => {
    if (isStreaming && scrollRef.current) {
        // Only scroll if user is near the bottom to avoid annoyance
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        if (scrollHeight - scrollTop - clientHeight < 200) {
            scrollRef.current.scrollTo({ top: scrollHeight, behavior: 'smooth' });
        }
    }
  }, [content, isStreaming]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([content], {type: 'text/markdown'});
    element.href = URL.createObjectURL(file);
    element.download = `${projectName.replace(/\s+/g, '_')}_技术方案.md`;
    document.body.appendChild(element); 
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-100">
      {/* Toolbar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0 shadow-sm z-10">
        <div>
          <button 
            onClick={onBack}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-800 text-sm font-medium mb-1 transition-colors"
          >
            <Icons.Back className="w-4 h-4" /> 返回修改
          </button>
          <h2 className="text-xl font-bold text-slate-800 truncate max-w-md" title={projectName}>{projectName || '未命名方案'}</h2>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap sm:flex-nowrap">
          {!isStreaming && (
            <button
              onClick={onRegenerate}
              className="flex items-center justify-center gap-2 px-4 py-2 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium w-full sm:w-auto"
            >
              <Icons.Refresh className="w-4 h-4" />
              重新生成
            </button>
          )}
          
          <button
            onClick={handleDownload}
            disabled={!content}
            className="flex items-center justify-center gap-2 px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium w-full sm:w-auto"
          >
            <Icons.Download className="w-4 h-4" />
            下载文档
          </button>

          <button
            onClick={handleCopy}
            disabled={!content}
            className={`flex items-center justify-center gap-2 px-4 py-2 text-white rounded-lg transition-all text-sm font-medium w-full sm:w-auto min-w-[100px] ${
              copySuccess ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {copySuccess ? (
              <>
                <Icons.CheckCircle className="w-4 h-4" />
                已复制
              </>
            ) : (
              <>
                <Icons.Copy className="w-4 h-4" />
                复制内容
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row max-w-5xl mx-auto w-full p-4 gap-4">
        
        {/* Document Preview */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Markdown 预览</span>
            {isStreaming && (
              <span className="flex items-center gap-2 text-xs text-blue-600 font-medium animate-pulse">
                <Icons.Loader className="w-3 h-3 animate-spin" />
                AI 正在撰写中...
              </span>
            )}
          </div>
          
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-8 sm:p-12 bg-white"
          >
            {content ? (
               <MarkdownRenderer content={content} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <Icons.Loader className="w-8 h-8 animate-spin mb-4 text-blue-500" />
                <p>正在初始化 AI 引擎...</p>
              </div>
            )}
            {/* Invisible div to help with auto-scroll padding */}
            <div className="h-20" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviewStep;