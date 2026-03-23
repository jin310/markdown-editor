
import React, { useRef } from 'react';
import { 
  Bold, 
  Italic, 
  List, 
  Image as ImageIcon, 
  Code,
  Heading1,
  Heading2,
  Table,
  Sigma
} from 'lucide-react';

interface ToolbarProps {
  onImageUpload: (file: File) => void;
  onAction: (type: string) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ onImageUpload, onAction }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tools = [
    { icon: Heading1, action: 'h1', desc: '一级标题' },
    { icon: Heading2, action: 'h2', desc: '二级标题' },
    { icon: Bold, action: 'bold', desc: '加粗' },
    { icon: Italic, action: 'italic', desc: '斜体' },
    { icon: List, action: 'list', desc: '无序列表' },
    { icon: Code, action: 'code', desc: '代码块' },
    { icon: Sigma, action: 'math', desc: '公式块' },
    { icon: ImageIcon, action: 'image', desc: '插入图片' },
    { icon: Table, action: 'table', desc: '表格' },
  ];

  const handleToolClick = (e: React.MouseEvent, action: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (action === 'image') {
      fileInputRef.current?.click();
    } else {
      onAction(action);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageUpload(file);
      e.target.value = '';
    }
  };

  return (
    <>
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handleFileChange}
      />
      <div className="flex items-center gap-1 px-4 py-2 bg-white border border-slate-100 rounded-2xl shadow-[0_10px_50px_rgba(0,0,0,0.08)] transition-all">
        {tools.map((tool, i) => (
          <button 
            key={i}
            onMouseDown={(e) => handleToolClick(e, tool.action)}
            className="group relative flex items-center justify-center w-10 h-10 hover:bg-slate-50 active:bg-slate-100 rounded-xl transition-colors"
          >
            <div className="text-slate-600 group-hover:text-slate-900 transition-colors">
              <tool.icon size={19} strokeWidth={1.8} />
            </div>
          </button>
        ))}
      </div>
    </>
  );
};
