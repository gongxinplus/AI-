import React from 'react';
import { Icons } from './Icon';

const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Icons.FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">智标 AI</h1>
              <p className="text-xs text-slate-500 font-medium">技术方案生成专家</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-4 text-sm text-slate-600">
            <span className="flex items-center gap-1"><Icons.CheckCircle className="w-4 h-4 text-green-500"/> 企业级安全</span>
            <span className="flex items-center gap-1"><Icons.Cpu className="w-4 h-4 text-blue-500"/> Google Gemini 驱动</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;