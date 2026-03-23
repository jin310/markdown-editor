
import React, { useEffect, useRef } from 'react';
import { 
  Copy, 
  Trash2, 
  Type, 
  Bold, 
  Italic, 
  Code, 
  ArrowUp,
  ArrowDown,
  Quote,
  List,
  ListOrdered,
  Minus,
  Table as TableIcon,
  Sigma,
  FileCode,
  Layers
} from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onAction: (action: string) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose, onAction }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const sections = [
    {
      title: 'Editing',
      items: [
        { label: 'Copy Block', icon: Copy, action: 'copy' },
        { label: 'Insert Above', icon: ArrowUp, action: 'insertAbove' },
        { label: 'Insert Below', icon: ArrowDown, action: 'insertBelow' },
      ]
    },
    {
      title: 'Paragraph',
      items: [
        { label: 'Heading 1', icon: Type, action: 'h1' },
        { label: 'Heading 2', icon: Type, action: 'h2' },
        { label: 'Heading 3', icon: Type, action: 'h3' },
        { label: 'Quote', icon: Quote, action: 'quote' },
        { label: 'Bullet List', icon: List, action: 'bullet' },
        { label: 'Numbered List', icon: ListOrdered, action: 'number' },
      ]
    },
    {
      title: 'Insert',
      items: [
        { label: 'Code Block', icon: FileCode, action: 'code' },
        { label: 'Math Block', icon: Sigma, action: 'math' },
        { label: 'Table', icon: TableIcon, action: 'table' },
        { label: 'Horizontal Line', icon: Minus, action: 'hr' },
      ]
    },
    {
      title: 'Danger',
      items: [
        { label: 'Delete Block', icon: Trash2, action: 'delete', color: 'text-red-500 hover:bg-red-50' },
      ]
    }
  ];

  // Adjust position if menu goes off screen
  const adjustedX = Math.min(x, window.innerWidth - 240);
  const adjustedY = Math.min(y, window.innerHeight - 400);

  return (
    <div 
      ref={menuRef}
      className="fixed z-[100] w-56 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-2xl py-2 animate-in fade-in zoom-in duration-100 overflow-hidden"
      style={{ left: adjustedX, top: adjustedY }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {sections.map((section, sIdx) => (
        <React.Fragment key={sIdx}>
          {sIdx > 0 && <div className="my-1 border-t border-gray-100" />}
          <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            {section.title}
          </div>
          {section.items.map((item, iIdx) => (
            <button
              key={iIdx}
              onClick={() => { onAction(item.action); onClose(); }}
              className={`w-full flex items-center gap-3 px-3 py-1.5 text-sm text-left transition-colors ${item.color || 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-700'}`}
            >
              <item.icon size={14} className="opacity-60" />
              <span className="flex-1 font-medium">{item.label}</span>
            </button>
          ))}
        </React.Fragment>
      ))}
    </div>
  );
};
