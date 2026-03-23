
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Editor, EditorRef } from './components/Editor';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { geminiService } from './services/geminiService';
import { PanelLeft, Sparkles, Loader2, Save, Check, Layout, Send } from 'lucide-react';

// @ts-ignore
import html2pdf from 'html2pdf.js';

const STORAGE_KEY = 'novascribe_docs';
const MAX_HISTORY_SIZE = 50;

const App: React.FC = () => {
  const [docs, setDocs] = useState<any[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [{ 
      id: '1', 
      title: '快速入门', 
      content: '# 欢迎使用 NovaScribe\n\n这是一个类似于 Typora 的**所见即所得** Markdown 编辑器。\n\n- **点击**任意段落进行编辑\n- **回车**创建新段落\n- **AI 润色**一键美化内容\n\n试试在下方输入一些内容吧！', 
      lastModified: Date.now() 
    }];
  });
  
  const [activeId, setActiveId] = useState(docs[0]?.id || '1');
  const [activeFileHandle, setActiveFileHandle] = useState<any>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [projectHandle, setProjectHandle] = useState<any>(null);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [showCopyFeedback, setShowCopyFeedback] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string>('已复制全文到剪贴板');
  const [theme, setTheme] = useState<'default' | 'zhihu' | 'wechat'>('default');
  const [isSmartPaste, setIsSmartPaste] = useState(true);

  const historyRef = useRef<{ stack: string[], step: number }>({ stack: [], step: -1 });
  const saveTimeoutRef = useRef<any>(null);
  const editorRef = useRef<EditorRef>(null);

  const activeDoc = useMemo(() => docs.find(d => d.id === activeId) || docs[0], [docs, activeId]);

  useEffect(() => {
    if (activeDoc && historyRef.current.stack.length === 0) {
      historyRef.current = { stack: [activeDoc.content], step: 0 };
    }
  }, [activeId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
  }, [docs]);

  const pushToHistory = useCallback((content: string, immediate = false) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    const performSave = () => {
      const { stack, step } = historyRef.current;
      if (stack[step] === content) return;
      const newStack = stack.slice(0, step + 1);
      newStack.push(content);
      if (newStack.length > MAX_HISTORY_SIZE) newStack.shift();
      historyRef.current = { stack: newStack, step: newStack.length - 1 };
    };
    if (immediate) performSave();
    else saveTimeoutRef.current = setTimeout(performSave, 500);
  }, []);

  const handleUndo = useCallback(() => {
    const { stack, step } = historyRef.current;
    if (step > 0) {
      const prevStep = step - 1;
      const prevContent = stack[prevStep];
      historyRef.current.step = prevStep;
      setDocs(prev => prev.map(d => d.id === activeId ? { ...d, content: prevContent, lastModified: Date.now() } : d));
      setIsAllSelected(false);
    }
  }, [activeId]);

  const handleRedo = useCallback(() => {
    const { stack, step } = historyRef.current;
    if (step < stack.length - 1) {
      const nextStep = step + 1;
      const nextContent = stack[nextStep];
      historyRef.current.step = nextStep;
      setDocs(prev => prev.map(d => d.id === activeId ? { ...d, content: nextContent, lastModified: Date.now() } : d));
      setIsAllSelected(false);
    }
  }, [activeId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      if (isMod && e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo(); return; }
      if (isMod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); handleRedo(); return; }
      if (isMod && e.key === 's') { e.preventDefault(); handleSaveAs(); return; }
      if (isMod && e.key === 'a') {
        const activeElement = document.activeElement;
        const isInput = activeElement instanceof HTMLTextAreaElement || activeElement instanceof HTMLInputElement;
        if (!isInput || (isInput && (activeElement as any).selectionEnd - (activeElement as any).selectionStart === (activeElement as any).value.length)) {
          e.preventDefault(); setIsAllSelected(true);
        }
      }
      if (isAllSelected) {
        if (isMod && e.key === 'c') {
          e.preventDefault(); navigator.clipboard.writeText(activeDoc.content);
          setIsAllSelected(false); setCopyStatus('已复制全文到剪贴板'); setShowCopyFeedback(true);
          setTimeout(() => setShowCopyFeedback(false), 2000); return;
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault(); updateActiveContent('', true); setIsAllSelected(false); return;
        }
        if (e.key === 'Escape') { setIsAllSelected(false); return; }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDoc.content, isAllSelected, handleUndo, handleRedo]);

  const updateActiveContent = (newContent: string, immediateHistory = false) => {
    setDocs(prev => prev.map(d => d.id === activeId ? { ...d, content: newContent, lastModified: Date.now() } : d));
    pushToHistory(newContent, immediateHistory);
    if (activeFileHandle) {
      (async () => {
        try {
          const writable = await activeFileHandle.createWritable();
          await writable.write(newContent);
          await writable.close();
        } catch (e) {}
      })();
    }
  };

  const handleAiPolish = async () => {
    if (!activeDoc.content.trim()) return;
    setIsAiLoading(true);
    try {
      const polished = await geminiService.polishMarkdown(activeDoc.content);
      updateActiveContent(polished, true);
    } catch (err) {
      alert("AI 润色暂时不可用，请确认 API Key 是否正确配置。");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSaveAs = async () => {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: `${activeDoc.title || '未命名'}.md`,
        types: [{ description: 'Markdown 文件', accept: { 'text/markdown': ['.md'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(activeDoc.content);
      await writable.close();
      setCopyStatus('文件已保存');
      setShowCopyFeedback(true);
      setTimeout(() => setShowCopyFeedback(false), 2000);
    } catch (err: any) {}
  };

  const handleCopyToWechat = () => {
    const element = document.querySelector('.markdown-body-container');
    if (!element) return;
    const range = document.createRange();
    range.selectNode(element);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
    try {
      document.execCommand('copy');
      setCopyStatus('排版已就绪！请到公众号后台粘贴');
      setShowCopyFeedback(true);
      setTimeout(() => setShowCopyFeedback(false), 3000);
    } catch (err) {
      alert('复制失败，请手动全选复制');
    }
    window.getSelection()?.removeAllRanges();
  };

  const toggleTheme = () => {
    if (theme === 'default') setTheme('zhihu');
    else if (theme === 'zhihu') setTheme('wechat');
    else setTheme('default');
  };

  const createNewDoc = () => {
    const newDoc = { id: Date.now().toString(), title: '未命名文档', content: '', lastModified: Date.now() };
    setDocs([newDoc, ...docs]);
    setActiveId(newDoc.id);
    setActiveFileHandle(null);
    setIsAllSelected(false);
    historyRef.current = { stack: [''], step: 0 };
  };

  const handleFileSelect = async (fileHandle: any) => {
    try {
      const file = await fileHandle.getFile();
      const text = await file.text();
      const existing = docs.find(d => d.id === fileHandle.name);
      if (existing) {
        setActiveId(existing.id);
        setDocs(prev => prev.map(d => d.id === existing.id ? { ...d, content: text } : d));
      } else {
        const newDoc = { id: fileHandle.name, title: fileHandle.name, content: text, lastModified: Date.now() };
        setDocs([newDoc, ...docs]);
        setActiveId(newDoc.id);
      }
      setActiveFileHandle(fileHandle);
      setIsAllSelected(false);
      historyRef.current = { stack: [text], step: 0 };
    } catch (e) {}
  };

  const handleGlobalClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    setIsAllSelected(false);
    if (!target.closest('.markdown-block') && !target.closest('aside') && !target.closest('header') && !target.closest('.toolbar-container')) {
      editorRef.current?.clearActive();
    }
  };

  return (
    <div className={`flex h-screen w-full bg-white text-slate-900 overflow-hidden font-sans ${theme === 'zhihu' ? 'theme-zhihu' : ''} ${theme === 'wechat' ? 'theme-wechat' : ''}`}>
      <Sidebar 
        isOpen={isSidebarOpen}
        documents={docs}
        activeId={activeId}
        activeContent={activeDoc.content}
        projectHandle={projectHandle}
        onSelect={(id: string) => {
          setActiveId(id);
          setActiveFileHandle(null);
          setIsAllSelected(false);
          const doc = docs.find(d => d.id === id);
          historyRef.current = { stack: [doc?.content || ''], step: 0 };
        }}
        onFileSelect={handleFileSelect}
        onToggle={() => setSidebarOpen(!isSidebarOpen)}
        onCreate={createNewDoc}
        onOpenWorkspace={async () => {
          try { const handle = await (window as any).showDirectoryPicker(); setProjectHandle(handle); } catch (e) {}
        }}
        onCloseWorkspace={() => { setProjectHandle(null); setActiveFileHandle(null); }}
        onDelete={(id: string) => {
          if (docs.length > 1) {
            const filtered = docs.filter(d => d.id !== id);
            setDocs(filtered);
            if (activeId === id) setActiveId(filtered[0].id);
          }
        }}
      />

      <main className="flex-1 flex flex-col min-w-0 bg-[#fdfdfd] relative group">
        <header className="h-14 flex items-center justify-between px-6 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            {!isSidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
                <PanelLeft size={18} />
              </button>
            )}
            <div className="flex flex-col">
              <input 
                value={activeDoc.title}
                onChange={(e) => setDocs(prev => prev.map(d => d.id === activeId ? { ...d, title: e.target.value } : d))}
                className="bg-transparent border-none outline-none font-bold text-sm text-slate-700 w-32 md:w-48 focus:ring-2 focus:ring-indigo-500/20 rounded px-1 transition-all"
              />
              <span className="text-[10px] text-slate-400 px-1 truncate">
                {activeFileHandle ? `工作区: ${activeFileHandle.name}` : '本地草稿'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 md:gap-2">
            <button 
              onClick={toggleTheme}
              className="flex items-center gap-2 px-3 py-1.5 border rounded-full text-xs font-semibold transition-all bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <Layout size={14} />
              <span className="hidden md:inline">{theme === 'default' ? '经典排版' : theme === 'zhihu' ? '知乎排版' : '微信排版'}</span>
            </button>
            
            <button 
              onClick={handleSaveAs}
              title="保存为 .md 文件 (Ctrl+S)"
              className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 text-slate-600 rounded-full text-xs font-semibold hover:bg-slate-50 active:scale-95 transition-all"
            >
              <Save size={14} />
              <span className="hidden sm:inline">保存</span>
            </button>
            
            <button 
              onClick={handleCopyToWechat}
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-full text-xs font-semibold hover:bg-emerald-100 transition-all active:scale-95"
            >
              <Send size={14} />
              <span className="hidden sm:inline">复制到公众号</span>
            </button>
            
            <button 
              onClick={handleAiPolish}
              disabled={isAiLoading}
              className="flex items-center gap-2 px-3 md:px-4 py-1.5 bg-indigo-600 text-white rounded-full text-xs font-semibold hover:bg-indigo-700 shadow-lg shadow-indigo-200 disabled:opacity-50"
            >
              {isAiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              <span className="hidden sm:inline">AI 润色</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#fdfdfd] cursor-text pb-32" onClick={handleGlobalClick}>
          <div className="max-w-3xl mx-auto py-8 px-8 md:px-0 markdown-body-container min-h-full">
            <Editor 
              ref={editorRef}
              content={activeDoc.content} 
              onChange={updateActiveContent}
              projectHandle={projectHandle}
              isAllSelected={isAllSelected}
              theme={theme}
              isSmartPaste={isSmartPaste}
            />
          </div>
        </div>

        {showCopyFeedback && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-4 duration-300 z-50">
            <Check size={14} className="text-emerald-400" />
            {copyStatus}
          </div>
        )}

        {isAllSelected && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-4 py-2 rounded-full shadow-xl flex items-center gap-2 text-xs font-bold animate-pulse z-50">
            已选中全文，按 Delete / Backspace 删除，按 Ctrl + C 复制
          </div>
        )}

        <div className="toolbar-container absolute bottom-8 left-1/2 -translate-x-1/2">
          <Toolbar onAction={(action) => editorRef.current?.applyAction(action)} onImageUpload={(file) => editorRef.current?.handlePasteImage(file)} />
        </div>

        <footer className="h-8 px-6 border-t border-slate-100 flex items-center justify-between text-[10px] font-medium text-slate-400 bg-white">
          <div className="flex items-center gap-4">
            <span>字数: {activeDoc.content.length}</span>
            <span>行数: {activeDoc.content.split('\n').filter(l => l.trim() !== '').length}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${activeFileHandle ? 'bg-indigo-500' : 'bg-emerald-500'}`}></div>
            状态: {activeFileHandle ? '工作区同步中' : '自动保存至本地'}
          </div>
        </footer>
      </main>
    </div>
  );
};

export default App;
