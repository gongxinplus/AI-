
import { GoogleGenAI } from "@google/genai";
import { ProposalFormData } from "../types";

export const generateProposalStream = async (
  formData: ProposalFormData,
  onChunk: (text: string) => void
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

  const promptText = `
    角色设定：你是一位拥有20年经验的资深售前技术总监（Technical Director），精通中国市场的招投标规范，擅长撰写中标率极高的技术方案。
    
    任务：请根据以下输入信息（包含文本描述和可能的参考图片），为客户撰写一份结构严谨、内容详实的技术投标方案（Technical Proposal）。
    
    ### 输入信息
    - **项目名称**: ${formData.projectName}
    - **项目类型**: ${projectTypeMap[formData.projectType] || '通用IT项目'}
    - **项目背景/现状**: ${formData.background || '需根据需求推断行业背景'}
    - **核心需求/招标范围**: ${formData.requirements} ${formData.images.length > 0 ? '(请结合附带的参考图片/架构图进行分析)' : ''}
    - **关键技术栈**: ${formData.keywords || '根据行业标准推荐最主流的技术栈'}
    - **遵循标准/合规要求**: ${formData.standards || '符合国家相关法律法规及行业标准'}
    - **方案语调**: ${toneMap[formData.tone]}

    ### 撰写原则
    1. **格式要求**: 全程使用 Markdown 格式。
    2. **结构清晰**: 必须使用 H1 (#), H2 (##), H3 (###) 划分章节。
    3. **内容专业**: 
       - 遇到技术点时，要详细描述（如涉及到架构，描述其高可用性、扩展性）。
       - 必须包含针对中国市场重视的“安全保障”、“信创/国产化适配”（如果适用）或“售后服务承诺”。
       - 如果提供了图片（如架构图、流程图、需求列表），请务必分析图片内容并将其转化为具体的方案文字。
       - 如果输入信息中缺少具体技术细节，请基于最佳实践进行合理推断和补充。
    4. **语言风格**: 使用中文商务技术文风，避免翻译腔。

    ### 推荐输出结构（请根据项目类型适当调整）
    1. # 1. 总体概述 (Executive Summary)
       - 项目建设目标
       - 核心价值主张
    2. # 2. 项目背景与需求分析
       - 现状痛点分析
       - 业务需求理解（结合图片内容分析）
    3. # 3. 总体设计方案 (Solution Architecture)
       - 总体架构设计 (逻辑架构/技术架构)
       - 关键技术路线说明
    4. # 4. 详细功能/实施方案
       - 针对核心需求的具体响应
       - 难点攻克方案
    5. # 5. 项目管理与实施计划
       - 进度计划表
       - 交付物清单
    6. # 6. 质量保障与安全体系
       - 测试策略
       - 安全合规设计 (强调${formData.standards ? formData.standards : '合规性'})
    7. # 7. 售后服务与培训体系
       - 服务SLA承诺
       - 培训计划

    请直接开始撰写方案内容，不要包含“好的，我来为您撰写...”等对话开场白。
  `;

  // Construct parts: Text Prompt + Images
  const parts: any[] = [{ text: promptText }];

  formData.images.forEach((base64String) => {
    // Extract mime type and data from base64 string
    // Format: "data:image/png;base64,iVBORw0KGgo..."
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

  try {
    const response = await ai.models.generateContentStream({
      model: formData.model || 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: parts }],
      config: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
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
