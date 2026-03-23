
import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Plus, ChevronLeft, ChevronDown, ChevronRight, X, File as LucideFile, Folder, FolderOpen, List } from 'lucide-react';

const SKIP = new Set(['node_modules', '.git', 'dist', 'venv', 'target', '.DS_Store']);

export const Sidebar: React.FC<any> = ({ 
  isOpen, 
  documents, 
  activeId, 
  activeContent, 
  projectHandle, 
  onOpenWorkspace, 
  onCloseWorkspace, 
  onSelect, 
  onFileSelect, 
  onCreate, 
  onToggle 
}) => {
  const [tab, setTab] = useState<'files' | 'outline'>('files');

  return (
    <aside className={`${isOpen ? 'w-64' : 'w-0 opacity-0'} h-full bg-[#fdfdfd] border-r border-slate-100 flex flex-col transition-all duration-300 overflow-hidden z-20`}>
      <div className="p-5 flex items-center justify-between">
        <div className="flex items-center gap-2 font-black text-slate-900 tracking-tighter text-lg uppercase">NovaScribe</div>
        <button onClick={onToggle} className="p-1 hover:bg-slate-100 rounded text-slate-400"><ChevronLeft size={16} /></button>
      </div>

      <div className="px-4 mb-4">
        <div className="flex p-1 bg-slate-100 rounded-xl">
          <button 
            onClick={() => setTab('files')}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-bold rounded-lg transition-all ${tab === 'files' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Folder size={14} /> 文件
          </button>
          <button 
            onClick={() => setTab('outline')}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-bold rounded-lg transition-all ${tab === 'outline' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <List size={14} /> 大纲
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 space-y-6 custom-scrollbar pb-10">
        {tab === 'files' ? (
          <>
            <div className="space-y-2">
              <button onClick={onCreate} className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-colors shadow-lg shadow-slate-200">
                <Plus size={14} className="inline mr-2" />新建草稿
              </button>
              {!projectHandle ? (
                <button onClick={onOpenWorkspace} className="w-full py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:border-slate-400 transition-colors">
                  打开工作区
                </button>
              ) : (
                <button onClick={onCloseWorkspace} className="w-full py-2 bg-red-50 text-red-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-100 flex items-center justify-center gap-1">
                  <X size={12} /> 关闭工作区
                </button>
              )}
            </div>

            {projectHandle && (
              <div>
                <div className="px-2 mb-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">当前工作区</div>
                <div className="bg-slate-50/50 rounded-xl p-1">
                  <FileTree handle={projectHandle} onSelect={onFileSelect} activeId={activeId} />
                </div>
              </div>
            )}

            <div>
              <div className="px-2 mb-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">最近草稿</div>
              {documents.map((d: any) => (
                <div 
                  key={d.id} 
                  onClick={() => onSelect(d.id)} 
                  className={`px-3 py-2 rounded-xl cursor-pointer text-xs font-bold truncate mb-1 transition-all flex items-center gap-2 ${activeId === d.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <FileText size={14} className={`opacity-60 ${activeId === d.id ? 'text-white' : 'text-indigo-400'}`}/>
                  {d.title}
                </div>
              ))}
            </div>
          </>
        ) : (
          <OutlineView content={activeContent} />
        )}
      </div>
    </aside>
  );
};

const OutlineView: React.FC<{ content: string }> = ({ content }) => {
  const headings = useMemo(() => {
    const lines = content.split('\n');
    const result: { level: number; text: string; id: number }[] = [];
    let inCodeBlock = false;

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('```')) inCodeBlock = !inCodeBlock;
      if (inCodeBlock) return;

      const match = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (match) {
        result.push({
          level: match[1].length,
          text: match[2],
          id: index
        });
      }
    });
    return result;
  }, [content]);

  const scrollToHeading = (index: number) => {
    const blocks = document.querySelectorAll('.markdown-block');
    // 注意：编辑器是基于块的，大纲的 index 可能不完全对应 block 的 index
    // 但我们的 splitMarkdownIntoBlocks 是基于空行的
    // 这里的简易实现是查找包含该文字的块
    const headingText = headings.find(h => h.id === index)?.text;
    if (headingText) {
      const targetBlock = Array.from(blocks).find(b => b.textContent?.includes(headingText));
      targetBlock?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  if (headings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3 opacity-60">
        <List size={24} />
        <span className="text-[11px] font-medium">暂无标题大纲</span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="px-2 mb-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">文档大纲</div>
      {headings.map((h, i) => (
        <div 
          key={i}
          onClick={() => scrollToHeading(h.id)}
          className="group flex items-center gap-2 px-3 py-1.5 cursor-pointer rounded-lg hover:bg-slate-50 transition-all"
          style={{ paddingLeft: `${(h.level - 1) * 12 + 12}px` }}
        >
          <span className={`text-[11px] font-medium truncate ${h.level === 1 ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>
            {h.text}
          </span>
        </div>
      ))}
    </div>
  );
};

const FileTree: React.FC<any> = ({ handle, onSelect, activeId, depth = 0 }) => {
  const [entries, setEntries] = useState<any[]>([]);
  const [isExpanded, setIsExpanded] = useState(depth === 0);

  useEffect(() => {
    (async () => {
      if (!isExpanded && depth > 0) return;
      const res = [];
      try {
        for await (const entry of handle.values()) { 
          if (!entry.name.startsWith('.') && !SKIP.has(entry.name)) {
            res.push(entry); 
          }
        }
        setEntries(res.sort((a, b) => {
          if (a.kind === b.kind) return a.name.localeCompare(b.name);
          return a.kind === 'directory' ? -1 : 1;
        }));
      } catch (e) {
        console.error("读取目录出错:", e);
      }
    })();
  }, [handle, isExpanded, depth]);

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const isDirectory = handle.kind === 'directory';

  if (depth > 0 && isDirectory) {
    return (
      <div className="w-full">
        <div 
          onClick={toggleExpand}
          className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer hover:bg-slate-100 rounded-lg text-[11px] font-semibold text-slate-600 transition-colors"
          style={{ paddingLeft: `${depth * 12}px` }}
        >
          {isExpanded ? <ChevronDown size={12} className="opacity-40" /> : <ChevronRight size={12} className="opacity-40" />}
          {isExpanded ? <FolderOpen size={14} className="text-amber-400" /> : <Folder size={14} className="text-amber-400" />}
          <span className="truncate">{handle.name}</span>
        </div>
        {isExpanded && (
          <div className="mt-0.5">
            {entries.map(e => (
              <FileTree 
                key={e.name} 
                handle={e} 
                onSelect={onSelect} 
                activeId={activeId} 
                depth={depth + 1} 
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (isDirectory) {
    return (
      <div className="space-y-0.5">
        {entries.map(e => (
          <FileTree 
            key={e.name} 
            handle={e} 
            onSelect={onSelect} 
            activeId={activeId} 
            depth={depth + 1} 
          />
        ))}
      </div>
    );
  }

  const isSelected = activeId === handle.name;
  const isMarkdown = handle.name.toLowerCase().endsWith('.md');

  return (
    <div 
      onClick={() => isMarkdown && onSelect(handle)} 
      className={`group flex items-center gap-2 px-3 py-1.5 cursor-pointer text-[11px] font-medium truncate rounded-lg transition-colors mb-0.5 ${isSelected ? 'bg-indigo-100 text-indigo-700 font-bold' : isMarkdown ? 'hover:bg-slate-100 text-slate-500' : 'opacity-40 grayscale cursor-not-allowed'}`}
      style={{ paddingLeft: `${depth * 12}px` }}
      title={isMarkdown ? handle.name : '仅支持 .md 文件'}
    >
      <LucideFile size={12} className={`shrink-0 ${isSelected ? 'text-indigo-600' : 'text-slate-400 opacity-60'}`}/>
      <span className="truncate">{handle.name}</span>
    </div>
  );
};
