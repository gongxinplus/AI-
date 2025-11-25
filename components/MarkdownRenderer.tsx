import React from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="markdown-body text-slate-800 leading-relaxed">
      <ReactMarkdown>
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;