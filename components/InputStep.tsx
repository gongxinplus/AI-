
import React, { useState, useRef } from 'react';
import { ProposalFormData } from '../types';
import { Icons } from './Icon';

interface InputStepProps {
  onSubmit: (data: ProposalFormData) => void;
  isSubmitting: boolean;
}

const InputStep: React.FC<InputStepProps> = ({ onSubmit, isSubmitting }) => {
  const [formData, setFormData] = useState<ProposalFormData>({
    projectName: '',
    projectType: 'software',
    background: '',
    requirements: '',
    keywords: '',
    standards: '',
    tone: 'professional',
    model: 'gemini-2.5-flash',
    images: []
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, base64]
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach(handleImageUpload);
    }
    // Reset input so same file can be selected again if needed
    e.target.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    let hasImage = false;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        hasImage = true;
        const blob = items[i].getAsFile();
        if (blob) handleImageUpload(blob);
      }
    }
    // We don't prevent default if it's text, so text paste still works
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.projectName && (formData.requirements || formData.images.length > 0)) {
      onSubmit(formData);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-slate-900 mb-4">开始编写技术方案</h2>
        <p className="text-lg text-slate-600">请输入项目关键信息，AI 将为您构建专业的投标方案框架。</p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-8 py-4 border-b border-slate-200 flex items-center gap-2">
           <Icons.PenTool className="w-5 h-5 text-blue-600" />
           <span className="font-semibold text-slate-700">项目参数配置</span>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          
          {/* Project Name - Full Width */}
          <div className="space-y-2">
            <label htmlFor="projectName" className="block text-sm font-semibold text-slate-700">
              项目名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="projectName"
              name="projectName"
              required
              placeholder="例如：智慧城市交通指挥调度系统建设工程"
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
              value={formData.projectName}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Project Type */}
            <div className="space-y-2">
              <label htmlFor="projectType" className="block text-sm font-semibold text-slate-700">
                项目类型
              </label>
              <div className="relative">
                <select
                  id="projectType"
                  name="projectType"
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none appearance-none bg-white"
                  value={formData.projectType}
                  onChange={handleChange}
                  disabled={isSubmitting}
                >
                  <option value="software">软件开发与定制</option>
                  <option value="integration">系统集成与部署</option>
                  <option value="data">大数据与人工智能</option>
                  <option value="consulting">IT咨询与规划</option>
                  <option value="migration">云迁移与运维</option>
                </select>
                 <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                  <Icons.Briefcase className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* AI Model Selection */}
            <div className="space-y-2">
              <label htmlFor="model" className="block text-sm font-semibold text-slate-700">
                AI 模型版本
              </label>
              <div className="relative">
                <select
                  id="model"
                  name="model"
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none appearance-none bg-white"
                  value={formData.model}
                  onChange={handleChange}
                  disabled={isSubmitting}
                >
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash (快速/平衡)</option>
                  <option value="gemini-3-pro-preview">Gemini 3.0 Pro (深度推理/复杂任务)</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                  <Icons.Cpu className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          {/* Project Background */}
          <div className="space-y-2">
            <label htmlFor="background" className="block text-sm font-semibold text-slate-700">
              项目背景 / 现状问题 (可选)
            </label>
            <textarea
              id="background"
              name="background"
              rows={3}
              placeholder="简述客户当前的痛点或建设背景。例如：目前系统老旧，数据孤岛严重，无法支撑高并发访问..."
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none resize-y"
              value={formData.background}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </div>

          {/* Requirements with Image Support */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label htmlFor="requirements" className="block text-sm font-semibold text-slate-700">
                核心需求 / 招标范围 <span className="text-red-500">*</span>
              </label>
              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full font-medium">
                支持直接粘贴截图
              </span>
            </div>
            
            <div className="border border-slate-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all bg-white overflow-hidden">
              <textarea
                id="requirements"
                name="requirements"
                required={formData.images.length === 0} // Only required if no images
                rows={6}
                onPaste={handlePaste}
                placeholder="在此输入文字，或直接 Ctrl+V 粘贴需求文档截图、架构草图、旧系统界面等..."
                className="w-full px-4 py-3 border-none focus:ring-0 resize-y outline-none block"
                value={formData.requirements}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              
              {/* Image Preview Area */}
              {(formData.images.length > 0) && (
                <div className="px-4 pb-4 flex flex-wrap gap-3">
                  {formData.images.map((img, idx) => (
                    <div key={idx} className="relative group w-20 h-20 border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                      <img src={img} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Icons.X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Toolbar */}
              <div className="bg-slate-50 px-3 py-2 border-t border-slate-200 flex items-center">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="image/*" 
                  multiple 
                  className="hidden" 
                  onChange={handleFileSelect}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 transition-colors px-2 py-1 rounded hover:bg-slate-200"
                >
                  <Icons.Image className="w-4 h-4" />
                  添加图片附件
                </button>
                <span className="text-xs text-slate-400 ml-2">支持 JPG, PNG, WEBP</span>
              </div>
            </div>
          </div>

          {/* Keywords & Standards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2">
              <label htmlFor="keywords" className="block text-sm font-semibold text-slate-700">
                关键技术栈 / 关键词
              </label>
              <input
                type="text"
                id="keywords"
                name="keywords"
                placeholder="例如：Spring Boot, Vue3, 华为云, Docker"
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                value={formData.keywords}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="standards" className="block text-sm font-semibold text-slate-700">
                遵循标准 / 合规要求
              </label>
              <input
                type="text"
                id="standards"
                name="standards"
                placeholder="例如：等保三级, ISO27001, 适配信创环境"
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                value={formData.standards}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Tone */}
          <div className="space-y-2">
            <label htmlFor="tone" className="block text-sm font-semibold text-slate-700">
              方案语调与风格
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
               {[
                 { id: 'professional', label: '稳健专业', desc: '标准商务风格' },
                 { id: 'technical', label: '深度技术', desc: '强调架构细节' },
                 { id: 'persuasive', label: '销售导向', desc: '强调价值与优势' },
                 { id: 'concise', label: '精炼务实', desc: '直击核心方案' },
               ].map((t) => (
                 <label 
                  key={t.id}
                  className={`relative flex flex-col items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    formData.tone === t.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-slate-200 hover:border-slate-300'
                  }`}
                 >
                   <input 
                    type="radio" 
                    name="tone" 
                    value={t.id} 
                    checked={formData.tone === t.id}
                    onChange={handleChange}
                    className="sr-only"
                   />
                   <span className={`text-sm font-bold ${formData.tone === t.id ? 'text-blue-700' : 'text-slate-700'}`}>{t.label}</span>
                   <span className="text-xs text-slate-500 mt-1">{t.desc}</span>
                 </label>
               ))}
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl text-white font-semibold text-lg transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 ${
                isSubmitting 
                  ? 'bg-blue-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.99]'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Icons.Loader className="animate-spin h-5 w-5" />
                  正在撰写方案...
                </>
              ) : (
                <>
                  <Icons.Cpu className="h-5 w-5" />
                  立即生成技术方案
                </>
              )}
            </button>
            <p className="text-center text-xs text-slate-400 mt-4">
              AI生成内容仅供参考，请根据实际情况进行审核与修改。
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InputStep;
