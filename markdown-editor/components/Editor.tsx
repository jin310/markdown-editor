
import React, { useState, useEffect, useMemo, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Block } from './Block';
import { ContextMenu } from './ContextMenu';

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  projectHandle: FileSystemDirectoryHandle | null;
  isAllSelected?: boolean;
  theme?: 'default' | 'zhihu' | 'wechat';
  isSmartPaste?: boolean;
}

export interface EditorRef {
  focusLast: () => void;
  clearActive: () => void;
  applyAction: (action: string) => void;
  handlePasteImage: (file: File) => void;
}

interface BlockItem {
  id: string;
  content: string;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

const splitMarkdownIntoBlocks = (text: string): string[] => {
  if (!text) return [''];
  const lines = text.split('\n');
  const blocks: string[] = [];
  let currentBlock: string[] = [];
  let inCodeFence = false;
  let inMathFence = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('```')) inCodeFence = !inCodeFence;
    else if (trimmedLine.startsWith('$$')) inMathFence = !inMathFence;
    const isInFence = inCodeFence || inMathFence;

    if (!isInFence && trimmedLine === '' && currentBlock.length > 0) {
      blocks.push(currentBlock.join('\n'));
      currentBlock = [];
    } else {
      currentBlock.push(line);
    }
  }
  if (currentBlock.length > 0) blocks.push(currentBlock.join('\n'));
  return blocks.length > 0 ? blocks : [''];
};

export const Editor = forwardRef<EditorRef, EditorProps>(({ 
  content, 
  onChange, 
  projectHandle, 
  isAllSelected = false, 
  theme = 'default',
  isSmartPaste = true
}, ref) => {
  const [internalBlocks, setInternalBlocks] = useState<BlockItem[]>([]);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number, y: number } | null>(null);

  useEffect(() => {
    const rawBlocks = splitMarkdownIntoBlocks(content);
    if (rawBlocks.length !== internalBlocks.length) {
      setInternalBlocks(rawBlocks.map((c, i) => ({ id: internalBlocks[i]?.id || generateId(), content: c })));
    } else {
      const updated = internalBlocks.map((b, i) => ({ ...b, content: rawBlocks[i] }));
      if (JSON.stringify(updated) !== JSON.stringify(internalBlocks)) {
        setInternalBlocks(updated);
      }
    }
  }, [content]);

  const syncToParent = (blocks: BlockItem[]) => {
    const newContent = blocks.map(b => b.content).join('\n\n');
    onChange(newContent);
  };

  const handleBlockChange = (idx: number, newVal: string) => {
    const newBlocks = [...internalBlocks];
    newBlocks[idx] = { ...newBlocks[idx], content: newVal };
    setInternalBlocks(newBlocks);
    syncToParent(newBlocks);
  };

  const handlePasteImage = async (idx: number, file: File) => {
    const processImage = (imageMarkdown: string) => {
      const newBlocks = [...internalBlocks];
      newBlocks[idx] = { ...newBlocks[idx], content: imageMarkdown };
      newBlocks.splice(idx + 1, 0, { id: generateId(), content: '' });
      setInternalBlocks(newBlocks);
      syncToParent(newBlocks);
      setActiveIdx(idx + 1);
    };

    if (!projectHandle) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (dataUrl.length > 2 * 1024 * 1024) {
          alert("图片太大，建议打开本地工作区（Workspace）以支持大图片存储。");
        }
        processImage(`![Pasted Image](${dataUrl})`);
      };
      reader.readAsDataURL(file);
      return;
    }

    try {
      const assetsHandle = await projectHandle.getDirectoryHandle('assets', { create: true });
      const ext = file.name.split('.').pop() || 'png';
      const filename = `img_${Date.now()}.${ext}`;
      const fileHandle = await assetsHandle.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(file);
      await writable.close();
      processImage(`![Image](assets/${filename})`);
    } catch (error) {
      console.error("Save image failed:", error);
      const reader = new FileReader();
      reader.onload = (e) => processImage(`![Pasted Image](${e.target?.result})`);
      reader.readAsDataURL(file);
    }
  };

  const handleContextAction = (action: string) => {
    const idx = activeIdx === null ? internalBlocks.length - 1 : activeIdx;
    if (idx < 0) return;
    
    const newBlocks = [...internalBlocks];
    const currentBlock = newBlocks[idx];
    const cleanPrefix = (str: string) => str.replace(/^(#+\s+|> \s*|[\-\*]\s*|\d+\.\s*)/, '');

    switch (action) {
      case 'delete':
        if (newBlocks.length > 1) {
          newBlocks.splice(idx, 1);
          setInternalBlocks(newBlocks);
          syncToParent(newBlocks);
          setActiveIdx(idx > 0 ? idx - 1 : 0);
        } else {
          handleBlockChange(idx, '');
        }
        break;
      case 'insertAbove':
        newBlocks.splice(idx, 0, { id: generateId(), content: '' });
        setInternalBlocks(newBlocks);
        syncToParent(newBlocks);
        setActiveIdx(idx);
        break;
      case 'insertBelow':
        newBlocks.splice(idx + 1, 0, { id: generateId(), content: '' });
        setInternalBlocks(newBlocks);
        syncToParent(newBlocks);
        setActiveIdx(idx + 1);
        break;
      case 'copy':
        navigator.clipboard.writeText(currentBlock.content);
        break;
      case 'h1': handleBlockChange(idx, '# ' + cleanPrefix(currentBlock.content)); break;
      case 'h2': handleBlockChange(idx, '## ' + cleanPrefix(currentBlock.content)); break;
      case 'h3': handleBlockChange(idx, '### ' + cleanPrefix(currentBlock.content)); break;
      case 'bold': {
        const text = currentBlock.content.trim() || '加粗文字';
        const newVal = text.startsWith('**') && text.endsWith('**') 
          ? text.slice(2, -2) 
          : `**${text}**`;
        handleBlockChange(idx, newVal);
        break;
      }
      case 'italic': {
        const text = currentBlock.content.trim() || '斜体文字';
        const newVal = text.startsWith('*') && text.endsWith('*') 
          ? text.slice(1, -1) 
          : `*${text}*`;
        handleBlockChange(idx, newVal);
        break;
      }
      case 'quote': handleBlockChange(idx, '> ' + cleanPrefix(currentBlock.content)); break;
      case 'list': 
      case 'bullet': handleBlockChange(idx, '- ' + cleanPrefix(currentBlock.content)); break;
      case 'number': handleBlockChange(idx, '1. ' + cleanPrefix(currentBlock.content)); break;
      case 'code': handleBlockChange(idx, '```javascript\n// 在此输入代码\n\n```'); break;
      case 'math': handleBlockChange(idx, '$$\n\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}\n$$'); break;
      case 'code': handleBlockChange(idx, '```javascript\n// 在此输入代码\n\n```'); break;
      case 'math': handleBlockChange(idx, '$$\n\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}\n$$'); break;
      case 'table': handleBlockChange(idx, '| 标题 1 | 标题 2 | 标题 3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |'); break;
      case 'hr': handleBlockChange(idx, '---'); break;
    }
    setActiveIdx(idx);
  };

  useImperativeHandle(ref, () => ({
    focusLast: () => {
      if (internalBlocks.length > 0) setActiveIdx(internalBlocks.length - 1);
    },
    clearActive: () => {
      setActiveIdx(null);
    },
    applyAction: (action) => handleContextAction(action),
    handlePasteImage: (file) => {
      const idx = activeIdx === null ? internalBlocks.length - 1 : activeIdx;
      handlePasteImage(idx >= 0 ? idx : 0, file);
    }
  }));

  return (
    <div className="w-full min-h-full">
      <div className="flex flex-col">
        {internalBlocks.map((block, i) => (
          <Block 
            key={block.id}
            content={block.content}
            isActive={activeIdx === i}
            isGlobalSelected={isAllSelected}
            projectHandle={projectHandle}
            onFocus={() => setActiveIdx(i)}
            onChange={(val) => handleBlockChange(i, val)}
            onPasteImage={(file) => handlePasteImage(i, file)}
            theme={theme}
            isSmartPaste={isSmartPaste}
            onContextMenu={(e) => {
              e.preventDefault();
              setActiveIdx(i);
              setMenuPos({ x: e.clientX, y: e.clientY });
            }}
            onKeyDown={(e) => {
              const isInsideFence = block.content.trim().startsWith('```') || block.content.trim().startsWith('$$');
              if (e.key === 'Enter' && !e.shiftKey && !isInsideFence) {
                e.preventDefault();
                const newBlocks = [...internalBlocks];
                newBlocks.splice(i + 1, 0, { id: generateId(), content: '' });
                setInternalBlocks(newBlocks);
                syncToParent(newBlocks);
                setActiveIdx(i + 1);
              } else if (e.key === 'Backspace' && block.content === '' && internalBlocks.length > 1) {
                e.preventDefault();
                const newBlocks = [...internalBlocks];
                newBlocks.splice(i, 1);
                setInternalBlocks(newBlocks);
                syncToParent(newBlocks);
                setActiveIdx(i > 0 ? i - 1 : 0);
              }
            }}
          />
        ))}
      </div>
      {menuPos && <ContextMenu x={menuPos.x} y={menuPos.y} onClose={() => setMenuPos(null)} onAction={handleContextAction} />}
    </div>
  );
});
