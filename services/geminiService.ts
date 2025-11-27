
import { GoogleGenAI } from "@google/genai";
import { ProposalFormData } from "../types";

export const generateProposalStream = async (
  formData: ProposalFormData,
  onChunk: (text: string) => void,
  rewriteInstructions?: string // New optional parameter
): Promise<void> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing in environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Map tone to specific Chinese instructions
  const toneMap: Record<string, string> = {
    professional: "稳健、专业、商务，适合大多数正式投标场合。",
    technical: "技术深度高，详细阐述架构原理、数据流向和算法细节，展现技术实力。",
    persuasive: "强调价值主张（Value Proposition）、优势对比和ROI，用词具有感染力。",
    concise: "精炼、务实，直击重点，避免冗余的废话，注重落地性。"
  };

  const projectTypeMap: Record<string, string> = {
    software: "软件开发/定制化平台",
    integration: "系统集成/硬件部署",
    data: "大数据分析/人工智能应用",
    consulting: "IT咨询/数字化转型规划",
    migration: "云迁移/运维服务"
  };

  const hasAttachments = formData.attachments && formData.attachments.length > 0;
  const hasTemplates = formData.templates && formData.templates.length > 0;

  // Logic for page count / verbosity
  let lengthInstruction = "";
  if (formData.pageCount) {
    if (formData.pageCount < 20) {
      lengthInstruction = `用户期望方案篇幅较短（约${formData.pageCount}页）。请保持语言精练，直击重点，避免冗长描述，主要展示核心逻辑和关键图表。`;
    } else if (formData.pageCount >= 50) {
      // Optimized for completeness: Warn AI to manage budget
      lengthInstruction = `用户期望方案篇幅较长（约${formData.pageCount}页）。这是一份详尽的深标方案。请在**确保完整生成所有7个章节**的前提下，详细展开每一个技术点。⚠️注意：请合理分配篇幅，不要在前几章耗尽所有长度，务必保证文档有完整的结尾（售后服务/培训）。`;
    } else {
      lengthInstruction = `用户期望方案篇幅适中（约${formData.pageCount}页）。请保持标准详略，核心章节详细，通用章节适度展开。`;
    }
  }

  let basePrompt = `
    角色设定：你是一位拥有20年经验的资深售前技术总监（Technical Director），精通中国市场的招投标规范，擅长撰写中标率极高的技术方案。
    
    任务：请根据以下输入信息，为客户撰写一份结构严谨、内容详实的技术投标方案（Technical Proposal）。
    
    ### 输入信息
    - **项目名称**: ${formData.projectName}
    - **项目类型**: ${projectTypeMap[formData.projectType] || '通用IT项目'}
    - **项目背景/现状**: ${formData.background || '需根据需求推断行业背景'}
    - **关键技术栈**: ${formData.keywords || '根据行业标准推荐最主流的技术栈'}
    - **遵循标准/合规要求**: ${formData.standards || '符合国家相关法律法规及行业标准'}
    - **方案语调**: ${toneMap[formData.tone]}
    - **篇幅要求**: ${lengthInstruction || '标准篇幅'}

    ### 核心需求 (Scope)
    ${formData.requirements} 
    ${formData.images.length > 0 ? '(请结合下方的参考图片/架构图进行分析)' : ''}
    ${hasAttachments ? '(请重点阅读并分析标记为【需求来源】的附件，确保方案完全响应标书要求)' : ''}

    ### 格式与模板要求 (Style Guide)
    ${hasTemplates ? '⚠️ **重要**：请严格参照标记为【模板规范】的附件。请模仿该模板的目录结构、标题层级、字体排版风格进行撰写。如果模板中包含特定的表格样式或段落结构，请在 Markdown 中尽量还原。' : '请遵循标准的商务技术标书 Markdown 格式。'}

    ### 撰写原则 (Strict Rules)
    1. **格式要求**: 全程使用 Markdown 格式。
    2. **结构清晰**: 
       - 必须使用 H1 (#) 作为主要章节标题。
       - **不要**在 # 和标题之间添加粗体符号。
       - **禁止重复**：严禁输出重复的章节或段落。一旦某个章节（如“项目背景”或“售后服务”）写完，绝对不要再次生成同名章节。
    3. **内容专业**: 
       - 遇到技术点时，要详细描述。
       - 必须包含针对中国市场重视的“安全保障”、“信创/国产化适配”或“售后服务承诺”。
    4. **语言风格**: 使用中文商务技术文风，避免翻译腔。
    5. **图表支持**: 
       - 涉及流程或架构时，使用 Mermaid 代码块 ( \`\`\`mermaid ) 进行绘制，展示专业度。

    ### 推荐输出结构（如果【模板规范】中有不同结构，请优先使用模板结构）
    # 1. 总体概述 (Executive Summary)
    # 2. 项目背景与需求分析
    # 3. 总体设计方案 (Solution Architecture)
    # 4. 详细功能/实施方案
    # 5. 项目管理与实施计划
    # 6. 质量保障与安全体系
    # 7. 售后服务与培训体系
    
    (注意：完成第7章后请立即结束生成，不要从头开始)
  `;

  // Inject Rewrite Instructions if present
  if (rewriteInstructions) {
    basePrompt += `
    \n
    ================================================================================
    ⚠️ **特别重写指令 (CRITICAL REWRITE INSTRUCTIONS)** ⚠️
    用户对上一版方案不满意，要求按照以下指示进行**全文重写**。请务必优先满足以下要求：
    
    "${rewriteInstructions}"
    
    注意：如果上述指令与原始输入有冲突，以本条重写指令为准。
    ================================================================================
    \n
    `;
  }

  basePrompt += `\n请直接开始撰写方案内容。`;

  // Construct parts: Text Prompt -> Req Docs -> Template Docs -> Images
  const parts: any[] = [{ text: basePrompt }];

  // 1. Requirement Documents (Source Material)
  if (formData.attachments && formData.attachments.length > 0) {
    parts.push({ text: "\n\n### 附件 A：【需求来源】招标文件/需求文档 (Source Material)\n请从以下文档中提取业务需求和技术指标：" });
    formData.attachments.forEach((doc) => {
       const matches = doc.data.match(/^data:(.+);base64,(.+)$/);
       if (matches && matches.length === 3) {
         parts.push({
           inlineData: {
             mimeType: doc.mimeType,
             data: matches[2]
           }
         });
       }
    });
  }

  // 2. Template Documents (Style Guide)
  if (formData.templates && formData.templates.length > 0) {
    parts.push({ text: "\n\n### 附件 B：【模板规范】格式模板/排版示例 (Style Template)\n请忽略此文档的具体业务内容，仅学习其目录结构、标题格式和排版风格：" });
    formData.templates.forEach((doc) => {
       const matches = doc.data.match(/^data:(.+);base64,(.+)$/);
       if (matches && matches.length === 3) {
         parts.push({
           inlineData: {
             mimeType: doc.mimeType,
             data: matches[2]
           }
         });
       }
    });
  }

  // 3. Images (Diagrams)
  if (formData.images && formData.images.length > 0) {
    parts.push({ text: "\n\n### 附件 C：参考图片/架构图" });
    formData.images.forEach((base64String) => {
      const matches = base64String.match(/^data:(.+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        parts.push({
          inlineData: {
            mimeType: matches[1],
            data: matches[2]
          }
        });
      }
    });
  }

  try {
    const response = await ai.models.generateContentStream({
      model: formData.model || 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: parts }],
      config: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192, // Explicitly set to support long content
      }
    });

    for await (const chunk of response) {
      if (chunk.text) {
        onChunk(chunk.text);
      }
    }
  } catch (error) {
    console.error("Error generating proposal:", error);
    throw error;
  }
};

export const expandSectionStream = async (
  formData: ProposalFormData,
  sectionTitle: string,
  sectionContent: string,
  requirements: string,
  onChunk: (text: string) => void
): Promise<void> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const promptText = `
    角色：资深技术方案专家。
    任务：请对标书中的以下章节进行**扩写、润色或修改**。

    ### 项目上下文
    - 项目名称: ${formData.projectName}
    - 关键技术: ${formData.keywords}
    
    ### 待修改章节
    **标题**: ${sectionTitle}
    **当前内容**:
    ${sectionContent}

    ### 用户特定指令 (CRITICAL)
    ${requirements ? `**用户要求**: ${requirements}` : "**默认要求**: 请深度扩充内容，增加至少50%篇幅，补充更多技术细节、流程描述、表格或要点，使其看起来更专业。"}

    ### 修改原则
    1. **保持结构**: 输出必须以 "${sectionTitle}" 开头（保持 Markdown H1 格式）。
    2. **响应指令**: 必须优先满足用户的特定指令（如要求加表格、改语气等）。
    3. **专业性**: 使用商务技术术语，消除口语化表达。
    4. **连贯性**: 确保上下文逻辑通顺。
    5. **图表**: 如需图表，请使用 Mermaid 语法。
    
    请直接输出修改后的完整章节 Markdown 内容。
  `;

  try {
    const response = await ai.models.generateContentStream({
      model: formData.model || 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: promptText }] }],
      config: { 
        temperature: 0.7,
        maxOutputTokens: 8192 // Ensure expanded sections don't get cut off
      }
    });

    for await (const chunk of response) {
      if (chunk.text) onChunk(chunk.text);
    }
  } catch (error) {
    console.error("Error expanding section:", error);
    throw error;
  }
};
