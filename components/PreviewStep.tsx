
import React, { useRef, useState, useEffect } from 'react';
import { Icons } from './Icon';
import MarkdownRenderer from './MarkdownRenderer';
import { ProposalFormData, GeneratedSection, SubHeader, ProposalVersion } from '../types';
import { expandSectionStream } from '../services/geminiService';

interface PreviewStepProps {
  content: string;
  formData: ProposalFormData;
  isStreaming: boolean;
  history: ProposalVersion[];
  onBack: () => void;
  onRegenerate: () => void;
  onRewrite: (instructions: string) => void;
  onUpdateContent: (newContent: string) => void;
  onRestoreVersion: (version: ProposalVersion) => void;
}

const EXPECTED_TOTAL_SECTIONS = 7; // Based on the system prompt structure

const PreviewStep: React.FC<PreviewStepProps> = ({ 
  content, 
  formData, 
  isStreaming,
  history,
  onBack,
  onRegenerate,
  onRewrite,
  onUpdateContent,
  onRestoreVersion
}) => {
  const [sections, setSections] = useState<GeneratedSection[]>([]);
  const [activeSectionIndex, setActiveSectionIndex] = useState<number>(0);
  const [isExpanding, setIsExpanding] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  
  // Section Expand Modal State
  const [showExpandModal, setShowExpandModal] = useState(false);
  const [expandRequirements, setExpandRequirements] = useState('');

  // Global Rewrite Modal State
  const [showRewriteModal, setShowRewriteModal] = useState(false);
  const [rewriteRequirements, setRewriteRequirements] = useState('');
  
  // History Dropdown State
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);

  // Target SubHeader for scrolling
  const [targetSubHeader, setTargetSubHeader] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Ref to hold the latest sections for async callbacks (avoids stale closures)
  const sectionsRef = useRef<GeneratedSection[]>([]);

  // Robust Markdown Parsing Logic with De-duplication
  useEffect(() => {
    if (!content) {
        setSections([]);
        sectionsRef.current = [];
        return;
    }

    const lines = content.split('\n');
    const parsedSections: GeneratedSection[] = [];
    let currentSection: GeneratedSection | null = null;
    let introBuffer: string[] = [];
    
    // Track seen titles to prevent duplicates (AI Loops)
    const seenTitles = new Set<string>();
    let skipCurrentBlock = false;

    // State machine parser
    lines.forEach((line) => {
        // Strict H1 matching: Start of line, #, then space, then title
        const h1Match = line.match(/^\s*#\s+(.+)$/);
        // Strict H2 matching
        const h2Match = line.match(/^\s*##\s+(.+)$/);

        if (h1Match) {
            const rawTitle = h1Match[1].replace(/[*_]/g, '').trim();
            
            // --- DUPLICATE DETECTION ---
            // If we have seen this title before, assume AI is looping/hallucinating.
            // We set skipCurrentBlock to true to ignore this header AND its following content.
            if (seenTitles.has(rawTitle)) {
                skipCurrentBlock = true;
                
                // If we were building a valid section, commit it before skipping
                if (currentSection) {
                    parsedSections.push(currentSection);
                    currentSection = null;
                }
                return; 
            }
            
            // Valid new section found
            skipCurrentBlock = false;
            seenTitles.add(rawTitle);

            // 1. Commit the previous section if it exists
            if (currentSection) {
                parsedSections.push(currentSection);
            } else if (introBuffer.length > 0 && introBuffer.some(l => l.trim())) {
                // If we had content before the first H1, it's the Intro
                parsedSections.push({
                    id: 'intro',
                    title: '项目概览',
                    content: introBuffer.join('\n') + '\n',
                    rawBody: introBuffer.join('\n') + '\n',
                    subHeaders: []
                });
            }

            // 2. Start tracking the new section
            currentSection = {
                id: `sec-${parsedSections.length + 1}`,
                title: rawTitle, 
                content: line + '\n', 
                rawBody: '',
                subHeaders: []
            };
            
            // 3. Clear intro buffer
            introBuffer = []; 

        } else {
            // -- Content Line --
            if (skipCurrentBlock) {
                // Ignore lines belonging to a duplicate section
                return;
            }

            if (currentSection) {
                currentSection.content += line + '\n';
                currentSection.rawBody += line + '\n';
                
                // Track H2s within this section
                if (h2Match) {
                   currentSection.subHeaders.push({
                     id: `sub-${currentSection.id}-${currentSection.subHeaders.length}`,
                     title: h2Match[1].replace(/[*_]/g, '').trim()
                   });
                }
            } else {
                introBuffer.push(line);
            }
        }
    });

    // Commit the final open section (if not skipping)
    if (currentSection && !skipCurrentBlock) {
        parsedSections.push(currentSection);
    } else if (parsedSections.length === 0 && introBuffer.length > 0 && !skipCurrentBlock) {
         // Case: Only text, no headers found yet
         parsedSections.push({
            id: 'intro',
            title: '项目概览',
            content: introBuffer.join('\n'),
            rawBody: introBuffer.join('\n'),
            subHeaders: []
         });
    }

    setSections(parsedSections);
    sectionsRef.current = parsedSections; // Keep ref in sync
    
    // Auto-scroll logic if streaming the LAST section
    if (isStreaming && scrollRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        // Only auto-scroll if user is already near bottom (within 200px)
        if (scrollHeight - scrollTop - clientHeight < 200) {
             requestAnimationFrame(() => {
                 if (scrollRef.current) {
                    scrollRef.current.scrollTo({ top: scrollHeight, behavior: 'smooth' });
                 }
             });
        }
    }
    
    // Auto-switch to latest section during streaming
    // We only switch if the user was essentially looking at the end
    if (isStreaming && parsedSections.length > 0) {
         if (activeSectionIndex >= parsedSections.length - 2) {
             setActiveSectionIndex(parsedSections.length - 1);
         }
    }

  }, [content, isStreaming]);

  // --- Scroll to SubHeader Effect ---
  useEffect(() => {
    if (targetSubHeader && !isStreaming && scrollRef.current) {
        // Allow DOM to update first
        setTimeout(() => {
            // Find all H2 elements in the container
            const h2Elements = scrollRef.current?.querySelectorAll('h2');
            if (h2Elements) {
                for (let i = 0; i < h2Elements.length; i++) {
                    // Check if text content roughly matches
                    if (h2Elements[i].textContent?.includes(targetSubHeader)) {
                        h2Elements[i].scrollIntoView({ behavior: 'smooth', block: 'start' });
                        break;
                    }
                }
            }
            setTargetSubHeader(null); // Reset
        }, 300);
    }
  }, [activeSectionIndex, targetSubHeader, isStreaming]);


  // --- Handlers for Section Expand ---
  const handleOpenExpandModal = () => {
    setExpandRequirements(""); 
    setShowExpandModal(true);
  };

  const handleInsertDiagram = async () => {
      await handleExpandSection("请在本章内容中，根据上下文逻辑，使用 Mermaid.js 语法绘制一个清晰的架构图或流程图。请直接输出 ```mermaid ... ``` 代码块。不要使用 ASCII。");
  };

  const handleConfirmExpand = async () => {
    setShowExpandModal(false);
    await handleExpandSection(expandRequirements);
  };

  const handleExpandSection = async (requirements: string) => {
    const currentSectionSnapshot = sections[activeSectionIndex];
    if (!currentSectionSnapshot || isExpanding) return;

    const targetIndex = activeSectionIndex;
    const targetTitle = currentSectionSnapshot.title;

    setIsExpanding(true);
    let newSectionContentAccumulator = "";

    try {
      await expandSectionStream(
        formData,
        targetTitle,
        currentSectionSnapshot.content,
        requirements,
        (chunk) => {
          newSectionContentAccumulator += chunk;
          
          const currentSections = sectionsRef.current;
          // Safety check: ensure we still have sections
          if (currentSections.length <= targetIndex) return;

          // Reconstruct the FULL content string by replacing only the target section
          // We use the REFS for other sections to ensure we don't lose them
          const updatedFullContent = currentSections.map((s, i) => 
            i === targetIndex ? newSectionContentAccumulator : s.content
          ).join(''); 
          
          onUpdateContent(updatedFullContent);
        }
      );
    } catch (e) {
      console.error(e);
      alert("操作失败，请重试");
    } finally {
      setIsExpanding(false);
    }
  };

  // --- Handlers for Global Rewrite ---
  const handleOpenRewriteModal = () => {
    setRewriteRequirements("");
    setShowRewriteModal(true);
  };

  const handleConfirmRewrite = () => {
    setShowRewriteModal(false);
    onRewrite(rewriteRequirements);
  };

  // Word Export Helper
  const handleExportWord = () => {
      const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML To Doc</title></head><body>";
      const footer = "</body></html>";
      
      const htmlContent = sections.map(sec => `<h1>${sec.title}</h1>\n${sec.rawBody.replace(/\n/g, '<br/>')}`).join('<br/><hr/><br/>');
      const sourceHTML = header + htmlContent + footer;
      
      const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
      const fileDownload = document.createElement("a");
      document.body.appendChild(fileDownload);
      fileDownload.href = source;
      fileDownload.download = `${formData.projectName.replace(/\s+/g, '_')}_方案.doc`;
      fileDownload.click();
      document.body.removeChild(fileDownload);
  }

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([content], {type: 'text/markdown'});
    element.href = URL.createObjectURL(file);
    element.download = `${formData.projectName.replace(/\s+/g, '_')}_技术方案.md`;
    document.body.appendChild(element); 
    element.click();
    document.body.removeChild(element);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleRestoreClick = (v: ProposalVersion) => {
    if (window.confirm(`确定要恢复到版本 "${v.label}" 吗？当前未保存的修改将丢失。`)) {
      onRestoreVersion(v);
      setShowHistoryDropdown(false);
    }
  };

  const getDisplayTitle = (title: string) => {
    return title.replace(/^[\d一二三四五六七八九十]+[.、\s]\s*/, '').trim();
  };

  const progressPercentage = Math.min((sections.length / EXPECTED_TOTAL_SECTIONS) * 100, 100);
  const displayProgress = !isStreaming && sections.length > 0 ? 100 : progressPercentage;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-100 relative">
      {/* Top Toolbar */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-3 overflow-hidden">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
            title="返回配置"
          >
            <Icons.Back className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
            <h2 className="text-lg font-bold text-slate-800 truncate max-w-[200px] sm:max-w-md" title={formData.projectName}>
              {formData.projectName}
            </h2>
            {isStreaming && (
              <span className="text-xs text-blue-600 animate-pulse md:hidden">
                正在生成第 {sections.length} 章...
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
           {isStreaming ? (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm border border-blue-100">
                <Icons.Loader className="w-4 h-4 animate-spin" />
                <span className="font-medium">正在撰写: 第 {sections.length} 章 / 共 ~{EXPECTED_TOTAL_SECTIONS} 章</span>
              </div>
           ) : (
            <>
              {!isExpanding && (
                 <>
                   {/* History Dropdown */}
                   <div className="relative">
                      <button
                        onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
                        className={`flex items-center gap-2 px-3 py-1.5 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors ${showHistoryDropdown ? 'bg-slate-100 ring-2 ring-blue-100' : ''}`}
                        title="历史版本"
                      >
                        <Icons.History className="w-4 h-4" />
                        <span className="hidden sm:inline">历史 ({history.length})</span>
                      </button>
                      
                      {showHistoryDropdown && (
                        <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-50 animate-[fadeIn_0.1s_ease-out]">
                          <div className="px-3 py-2 border-b border-slate-100 text-xs font-semibold text-slate-500 bg-slate-50">
                            版本记录 (点击恢复)
                          </div>
                          {history.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-slate-400 text-center">暂无历史版本</div>
                          ) : (
                            <div className="max-h-[300px] overflow-y-auto">
                              {history.map((ver) => (
                                <button
                                  key={ver.id}
                                  onClick={() => handleRestoreClick(ver)}
                                  className="w-full text-left px-3 py-2.5 hover:bg-blue-50 transition-colors flex flex-col gap-0.5 border-b border-slate-50 last:border-0"
                                >
                                  <span className="text-sm font-medium text-slate-700 truncate">{ver.label}</span>
                                  <span className="text-xs text-slate-400">
                                    {new Date(ver.timestamp).toLocaleTimeString()} - {Math.round(ver.content.length / 1000)}k 字
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                          <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 text-center">
                            重写前自动保存
                          </div>
                        </div>
                      )}
                      
                      {/* Overlay to close dropdown */}
                      {showHistoryDropdown && (
                        <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowHistoryDropdown(false)} />
                      )}
                   </div>

                   <button
                    onClick={handleOpenRewriteModal}
                    className="flex items-center gap-2 px-3 py-1.5 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 text-sm font-medium transition-colors"
                  >
                    <Icons.Refresh className="w-4 h-4" />
                    <span className="hidden sm:inline">全文重写</span>
                  </button>
                  <button
                    onClick={handleExportWord}
                    className="flex items-center gap-2 px-3 py-1.5 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-blue-50 text-sm font-medium transition-colors"
                  >
                    <Icons.FileText className="w-4 h-4" />
                    <span className="hidden sm:inline">导出 Word</span>
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-3 py-1.5 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors"
                  >
                    <Icons.Download className="w-4 h-4" />
                    <span className="hidden sm:inline">导出 MD</span>
                  </button>
                 </>
              )}
               <button
                onClick={handleCopy}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-colors ${copySuccess ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {copySuccess ? <Icons.CheckCircle className="w-4 h-4"/> : <Icons.Copy className="w-4 h-4"/>}
                <span className="hidden sm:inline">{copySuccess ? '已复制' : '复制全文'}</span>
              </button>
            </>
           )}
        </div>
      </div>

      {/* Main Area with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar: Table of Contents */}
        <div className="w-72 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col hidden md:flex">
          <div className="p-4 border-b border-slate-100 space-y-3">
            <div className="flex justify-between items-center">
               <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">方案目录</h3>
               <span className="text-xs font-medium text-slate-400">{Math.round(displayProgress)}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ease-out ${displayProgress === 100 ? 'bg-green-500' : 'bg-blue-600'}`}
                style={{ width: `${displayProgress}%` }}
              ></div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sections.map((section, idx) => {
              const isCurrentGenerating = isStreaming && idx === sections.length - 1;
              const isCompleted = !isStreaming || idx < sections.length - 1;
              const isActive = idx === activeSectionIndex;

              return (
                <div key={section.id} className="flex flex-col">
                  <button
                    onClick={() => {
                        setActiveSectionIndex(idx);
                        setTargetSubHeader(null);
                    }}
                    className={`w-full text-left px-3 py-3 rounded-lg text-sm transition-all duration-200 flex items-start gap-3 group border border-transparent ${
                      isActive 
                        ? 'bg-blue-50 border-blue-100 shadow-sm' 
                        : 'hover:bg-slate-50 hover:border-slate-100'
                    }`}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {isCurrentGenerating ? (
                        <Icons.Loader className="w-4 h-4 text-blue-500 animate-spin" />
                      ) : isCompleted ? (
                        <Icons.CheckCircle className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-green-500'}`} />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-slate-200" />
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                       <span className={`font-medium truncate ${isActive ? 'text-blue-800' : 'text-slate-700'}`}>
                          {getDisplayTitle(section.title)}
                       </span>
                    </div>
                  </button>

                  {/* Secondary Navigation */}
                  {isActive && section.subHeaders.length > 0 && (
                      <div className="ml-5 border-l border-slate-200 my-1 pl-2 space-y-0.5">
                          {section.subHeaders.map((sub) => (
                              <button
                                  key={sub.id}
                                  onClick={() => {
                                      setTargetSubHeader(sub.title);
                                      // If already active, the effect will trigger scrolling
                                  }}
                                  className="block w-full text-left text-xs text-slate-500 hover:text-blue-600 hover:bg-slate-50 py-1.5 px-2 rounded truncate transition-colors"
                              >
                                  {sub.title}
                              </button>
                          ))}
                      </div>
                  )}
                </div>
              );
            })}
            
            {sections.length === 0 && (
               <div className="p-8 text-center text-slate-400 text-sm flex flex-col items-center">
                 <Icons.Loader className="w-6 h-6 animate-spin mb-3 text-blue-400" />
                 <p>正在解析大纲结构...</p>
               </div>
            )}
          </div>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
           {/* Section Toolbar */}
           <div className="px-6 py-3 border-b border-slate-200 bg-white/80 backdrop-blur-md flex justify-between items-center sticky top-0 z-10 transition-all">
              <span className="text-sm text-slate-500 font-medium flex items-center gap-2 max-w-[50%]">
                 <span className="hidden sm:inline">当前预览:</span>
                 <span className="text-slate-900 font-bold bg-slate-200/50 px-2 py-0.5 rounded truncate">
                    {sections[activeSectionIndex]?.title ? getDisplayTitle(sections[activeSectionIndex].title) : '...'}
                 </span>
              </span>
              
              <div className="flex items-center gap-2">
                  <button
                    onClick={handleInsertDiagram}
                    disabled={isStreaming || isExpanding || !sections[activeSectionIndex]}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all shadow-sm ${
                       isStreaming || isExpanding
                       ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                       : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                    }`}
                  >
                    <Icons.Network className="w-4 h-4" />
                    <span className="hidden sm:inline">插入架构图</span>
                  </button>

                  <button
                    onClick={handleOpenExpandModal}
                    disabled={isStreaming || isExpanding || !sections[activeSectionIndex]}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all shadow-sm ${
                       isStreaming || isExpanding
                       ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                       : 'bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-200 hover:border-indigo-300'
                    }`}
                  >
                    {isExpanding ? <Icons.Loader className="w-4 h-4 animate-spin" /> : <Icons.Sparkles className="w-4 h-4" />}
                    {isExpanding ? '正在优化...' : 'AI 优化本章'}
                  </button>
              </div>
           </div>

           {/* Markdown Content */}
           <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 md:px-12 scroll-smooth">
              <div className="max-w-4xl mx-auto bg-white shadow-sm border border-slate-200 rounded-xl min-h-[600px] p-6 sm:p-10 md:p-14">
                 {sections[activeSectionIndex] ? (
                    <MarkdownRenderer content={sections[activeSectionIndex].content} />
                 ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-6">
                       {isStreaming ? (
                          <>
                            <div className="relative">
                               <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-20"></div>
                               <Icons.Cpu className="w-12 h-12 text-blue-500 relative z-10" />
                            </div>
                            <div className="text-center space-y-1">
                                <p className="text-lg font-medium text-slate-700">AI 正在奋笔疾书...</p>
                                <p className="text-sm">正在构建逻辑架构与内容细节</p>
                            </div>
                          </>
                       ) : (
                          <p>准备就绪</p>
                       )}
                    </div>
                 )}
              </div>
              <div className="h-20"></div>
           </div>
        </div>
      </div>

      {/* 1. Modal for Section Expansion */}
      {showExpandModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 animate-[fadeIn_0.2s_ease-out]">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                 <div className="bg-indigo-100 p-2 rounded-lg">
                    <Icons.MessageSquarePlus className="w-5 h-5 text-indigo-600" />
                 </div>
                 <div>
                    <h3 className="text-lg font-bold text-slate-900">AI 章节优化与扩写</h3>
                    <p className="text-xs text-slate-500">针对当前章节 "{sections[activeSectionIndex] ? getDisplayTitle(sections[activeSectionIndex].title) : ''}"</p>
                 </div>
              </div>
              <button onClick={() => setShowExpandModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <Icons.X className="w-5 h-5" />
              </button>
            </div>
            
            <textarea
               className="w-full border border-slate-300 rounded-lg p-4 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none mb-6 min-h-[120px] resize-none bg-slate-50"
               placeholder="例如：请增加一个实施进度甘特图描述..."
               value={expandRequirements}
               onChange={e => setExpandRequirements(e.target.value)}
               autoFocus
            />
            
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <button onClick={() => setShowExpandModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">取消</button>
              <button onClick={handleConfirmExpand} className="px-5 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg shadow-indigo-500/20">
                <Icons.Sparkles className="w-4 h-4" /> 开始优化
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal for Global Rewrite */}
      {showRewriteModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 animate-[fadeIn_0.2s_ease-out] border-t-4 border-orange-500">
             <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                 <div className="bg-orange-100 p-2 rounded-lg">
                    <Icons.Refresh className="w-5 h-5 text-orange-600" />
                 </div>
                 <div>
                    <h3 className="text-lg font-bold text-slate-900">全文重写 (Revision)</h3>
                 </div>
              </div>
              <button onClick={() => setShowRewriteModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <Icons.X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-2 font-semibold">请输入您的重写要求：</p>
            <p className="text-xs text-orange-500 mb-2">注意：重写前系统将自动保存当前版本。</p>
            <textarea
               className="w-full border border-slate-300 rounded-lg p-4 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none mb-6 min-h-[120px] resize-none bg-slate-50"
               placeholder="例如：精简篇幅，重点突出安全架构..."
               value={rewriteRequirements}
               onChange={e => setRewriteRequirements(e.target.value)}
               autoFocus
            />
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <button onClick={() => setShowRewriteModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">取消</button>
              <button onClick={handleConfirmRewrite} className="px-5 py-2 bg-orange-600 text-white hover:bg-orange-700 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg shadow-orange-500/20">
                <Icons.Refresh className="w-4 h-4" /> 确认重写
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreviewStep;
