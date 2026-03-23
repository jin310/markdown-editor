
import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import TurndownService from 'turndown';

interface BlockProps {
  content: string;
  isActive: boolean;
  isGlobalSelected?: boolean;
  projectHandle: FileSystemDirectoryHandle | null;
  theme?: 'default' | 'zhihu' | 'wechat';
  isSmartPaste?: boolean;
  onFocus: () => void;
  onChange: (newContent: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onPasteImage: (file: File) => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

const td = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  emDelimiter: '*'
});

td.addRule('math-capture', {
  filter: (node) => {
    const el = node as HTMLElement;
    const classes = el.classList;
    const tag = el.tagName.toLowerCase();
    return (
      classes.contains('katex') || 
      classes.contains('katex-display') ||
      classes.contains('ztext-math') ||
      classes.contains('mjx-container') ||
      classes.contains('MathJax') ||
      tag === 'math' ||
      (tag === 'img' && (!!el.getAttribute('data-formula') || !!el.getAttribute('alt')?.includes('\\')))
    );
  },
  replacement: (content, node) => {
    const el = node as HTMLElement;
    let tex = el.getAttribute('data-tex') || el.getAttribute('data-formula') || el.getAttribute('data-value');
    if (!tex) {
      const ann = el.querySelector('annotation[encoding="application/x-tex"]');
      if (ann) tex = ann.textContent || '';
    }
    if (!tex) return content;
    const cleanTex = tex.trim().replace(/^\$+|\$+$/g, '');
    const isBlock = el.classList.contains('katex-display') || el.tagName.toLowerCase() === 'div';
    return isBlock ? `\n\n$$\n${cleanTex}\n$$\n\n` : `$${cleanTex}$`;
  }
});

export const Block: React.FC<BlockProps> = React.memo(({ 
  content, 
  isActive, 
  isGlobalSelected = false,
  projectHandle, 
  theme = 'default',
  isSmartPaste = true,
  onFocus, 
  onChange, 
  onKeyDown, 
  onPasteImage, 
  onContextMenu 
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [resolvedImages, setResolvedImages] = useState<Record<string, string>>({});
  const blobUrlsRef = useRef<string[]>([]);

  const trimmedContent = content.trim();
  const isCodeBlock = useMemo(() => trimmedContent.startsWith('```'), [trimmedContent]);
  const isMathBlock = useMemo(() => trimmedContent.startsWith('$$'), [trimmedContent]);
  const imageMatch = useMemo(() => {
    const match = trimmedContent.match(/^!\[(.*?)\]\((.*?)\)$/);
    return match ? { alt: match[1], src: match[2] } : null;
  }, [trimmedContent]);

  useEffect(() => {
    let isMounted = true;
    const resolveImages = async () => {
      if (!projectHandle) return;
      const imgRegex = /!\[.*?\]\((?!http|https|data:|blob:)(.*?)\)/g;
      let match;
      const newResolved = { ...resolvedImages };
      let changed = false;
      while ((match = imgRegex.exec(content)) !== null) {
        const path = match[1];
        if (newResolved[path]) continue;
        try {
          const parts = path.split('/').filter(Boolean);
          let currentHandle: any = projectHandle;
          for (let i = 0; i < parts.length - 1; i++) {
            currentHandle = await currentHandle.getDirectoryHandle(parts[i]);
          }
          const fileHandle = await currentHandle.getFileHandle(parts[parts.length - 1]);
          const file = await fileHandle.getFile();
          const url = URL.createObjectURL(file);
          if (isMounted) { newResolved[path] = url; blobUrlsRef.current.push(url); changed = true; }
        } catch (e) {}
      }
      if (changed && isMounted) setResolvedImages(newResolved);
    };
    resolveImages();
    return () => { isMounted = false; };
  }, [content, projectHandle]);

  useEffect(() => {
    return () => blobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
  }, []);

  useEffect(() => {
    if (isActive && textareaRef.current) {
      textareaRef.current.focus();
      const val = textareaRef.current.value;
      textareaRef.current.setSelectionRange(val.length, val.length);
      adjustHeight();
    }
  }, [isActive]);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const dynamicClass = useMemo(() => {
    const c = trimmedContent;
    const isWechat = theme === 'wechat';
    const isZhihu = theme === 'zhihu';
    
    if (c.startsWith('# ')) {
      if (isWechat) return 'text-[18px] font-bold text-[#222] text-center my-6 relative after:content-[""] after:block after:w-10 after:h-0.5 after:bg-[#07c160] after:mx-auto after:mt-1';
      return isZhihu ? 'text-[20px] font-bold text-slate-900 mb-3' : 'text-2xl font-black mb-4 font-serif';
    }
    if (c.startsWith('## ')) {
      if (isWechat) return 'text-[16px] font-bold text-white bg-[#07c160] px-2.5 py-1 inline-block my-4 rounded shadow-[1px_1px_0_rgba(7,193,96,0.1)]';
      return isZhihu ? 'text-[17px] font-bold text-slate-900 mb-3' : 'text-xl font-bold mb-3 font-serif';
    }
    if (c.startsWith('### ')) {
      if (isWechat) return 'text-[15px] font-bold text-[#333] mb-3 border-l-4 border-[#07c160] pl-2.5 py-0.5 bg-[#f9f9f9]';
      return isZhihu ? 'text-[16px] font-bold text-slate-800 mb-2' : 'text-lg font-bold mb-2 font-serif';
    }
    
    if (c.startsWith('> ')) {
      if (isWechat) return 'bg-[#f7f7f7] px-3 py-2 text-[#555] my-2 rounded-lg border-l-0 relative before:content-["“"] before:absolute before:top-0 before:left-1 before:text-xl before:text-[#ddd] before:font-serif';
      return isZhihu ? 'border-l-[3px] border-slate-200 pl-2 italic text-slate-500 mb-2' : 'border-l-4 border-indigo-400 pl-3 py-1 italic mb-2 bg-slate-50/50 rounded-r-lg';
    }
    
    if (isCodeBlock) return 'mb-2 rounded-lg overflow-hidden';
    if (isMathBlock) {
      if (isWechat) return 'my-1 bg-white border border-[#eee] py-1 px-2 rounded-xl shadow-sm text-center';
      return 'text-center my-0.5 bg-slate-50/30 p-1 rounded-xl';
    }
    if (imageMatch) return 'flex justify-center mb-4';
    
    return isWechat
      ? 'text-[14px] text-[#3f3f3f] leading-[1.55] mb-1 text-justify tracking-[0.01em]'
      : isZhihu ? 'text-[14px] leading-[1.5] mb-1' : 'text-[14px] leading-[1.6] mb-1';
  }, [trimmedContent, imageMatch, isMathBlock, isCodeBlock, theme]);

  const renderContent = () => {
    if (imageMatch) {
      const src = resolvedImages[imageMatch.src] || imageMatch.src;
      return <img src={src} alt={imageMatch.alt} className="rounded-2xl shadow-xl max-w-full max-h-[70vh] object-contain pointer-events-auto" />;
    }

    return (
      <div className="prose prose-slate max-w-none prose-p:my-0 prose-pre:m-0 prose-pre:bg-transparent">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm, remarkMath]} 
          rehypePlugins={[rehypeKatex]}
          components={{
            img: ({ src, alt }) => {
              const resolvedSrc = resolvedImages[src || ''] || src;
              return <img src={resolvedSrc} alt={alt} className="max-h-[600px] object-contain pointer-events-auto mx-auto rounded-2xl" />;
            },
            pre: ({ children }) => <pre className="m-0 bg-transparent p-6">{children}</pre>,
            code: ({ className, children, ...props }) => {
              const isInline = !className;
              return isInline ? 
                <code className="bg-slate-100 px-1.5 py-0.5 rounded text-indigo-600 font-mono text-[0.85em]" {...props}>{children}</code> :
                <code className={className} {...props}>{children}</code>;
            }
          }}
        >
          {content || '\u00A0'}
        </ReactMarkdown>
      </div>
    );
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) { e.preventDefault(); onPasteImage(file); return; }
      }
    }
    if (isSmartPaste) {
      const html = e.clipboardData.getData('text/html');
      if (html) {
        e.preventDefault();
        try { const markdown = td.turndown(html); insertTextAtCursor(markdown); } 
        catch (err) { insertTextAtCursor(e.clipboardData.getData('text/plain')); }
        return;
      }
    }
  };

  const insertTextAtCursor = (text: string) => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const currentVal = textareaRef.current.value;
    const nextVal = currentVal.substring(0, start) + text + currentVal.substring(end);
    onChange(nextVal);
    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = start + text.length;
        textareaRef.current.setSelectionRange(newPos, newPos);
        adjustHeight();
      }
    }, 0);
  };

  const isSelectedStyle = isGlobalSelected ? 'bg-indigo-100/50 shadow-sm ring-1 ring-indigo-200' : (isActive ? 'bg-indigo-50/40 shadow-sm' : 'hover:bg-slate-50/60');

  return (
    <div 
      className={`markdown-block relative group px-10 py-1.5 -mx-10 rounded-3xl transition-all duration-300 min-h-[30px] ${isSelectedStyle} cursor-text`}
      onMouseDown={(e) => { if (e.button === 0) { e.stopPropagation(); if (!isActive) onFocus(); } }}
      onContextMenu={onContextMenu}
    >
      {isActive && !isGlobalSelected ? (
        <div className={`w-full relative z-10 animate-in fade-in duration-200 ${dynamicClass} ${isCodeBlock ? 'p-6' : ''}`}>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => { onChange(e.target.value); adjustHeight(); }}
            onKeyDown={onKeyDown}
            onPaste={handlePaste}
            rows={1}
            placeholder="输入内容..."
            spellCheck={false}
            className={`block w-full focus:ring-0 bg-transparent border-none outline-none resize-none overflow-hidden caret-indigo-500 selection:bg-indigo-500/30 pointer-events-auto ${isCodeBlock ? 'text-indigo-200 font-mono text-[15px]' : 'text-slate-800'}`}
          />
        </div>
      ) : (
        <div className={`markdown-body relative z-0 ${dynamicClass} ${imageMatch ? '' : 'pointer-events-none'}`}>
          {renderContent()}
        </div>
      )}
      {isActive && !isGlobalSelected && (
        <div className="absolute left-1.5 top-3 bottom-3 w-1.5 bg-indigo-500 rounded-full shadow-[0_0_15px_rgba(79,70,229,0.5)] animate-pulse z-20" />
      )}
    </div>
  );
}, (prev, next) => {
  return prev.isActive === next.isActive && prev.content === next.content && prev.projectHandle === next.projectHandle && prev.isGlobalSelected === next.isGlobalSelected && prev.theme === next.theme && prev.isSmartPaste === next.isSmartPaste;
});
