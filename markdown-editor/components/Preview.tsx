
import React, { forwardRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface PreviewProps {
  content: string;
}

export const Preview = forwardRef<HTMLDivElement, PreviewProps>(({ content }, ref) => {
  if (!content) {
    return (
      <div ref={ref} className="px-12 md:px-16 py-12 md:py-16 text-gray-300 italic min-h-[400px] flex items-center justify-center text-lg">
        Click to start your story...
      </div>
    );
  }

  return (
    <div 
      ref={ref}
      className="w-full px-12 md:px-16 py-12 md:py-16 markdown-body animate-in fade-in duration-300"
    >
      <div className="prose prose-slate prose-lg max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-headings:mb-6 prose-p:leading-[1.9] prose-p:text-[17px] prose-p:text-gray-700 prose-blockquote:border-l-4 prose-blockquote:border-indigo-400 prose-blockquote:bg-gray-50/50 prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:rounded-r-lg prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-indigo-600 prose-code:before:content-none prose-code:after:content-none prose-pre:bg-[#1a1b26] prose-pre:text-gray-100 prose-pre:p-6 prose-pre:rounded-xl prose-pre:shadow-sm prose-img:rounded-xl prose-a:text-indigo-600 prose-a:font-medium prose-a:no-underline hover:prose-a:underline">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
});
