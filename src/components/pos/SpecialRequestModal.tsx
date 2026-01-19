"use client";
import { useState } from 'react';

interface Props {
  initialNote: string;
  onClose: () => void;
  onConfirm: (note: string) => void;
}

export default function SpecialRequestModal({ initialNote, onClose, onConfirm }: Props) {
  const [note, setNote] = useState(initialNote || "");

  return (
    <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center backdrop-blur-sm">
      <div className="bg-white w-[600px] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* 헤더 */}
        <div className="bg-gray-800 text-white p-5 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Special Instruction</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white text-4xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* 내용 (입력창만 크게 배치) */}
        <div className="p-6 flex-1">
          <label className="block text-gray-500 font-bold mb-2 text-lg">
            Enter request for Kitchen:
          </label>
          
          <textarea
            className="w-full h-64 p-5 text-2xl border-2 border-gray-300 rounded-2xl focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none resize-none font-bold text-gray-800 placeholder-gray-300 leading-relaxed"
            placeholder="Type here..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            // ✨ autoFocus: 모달이 열리면 자동으로 키보드가 올라옵니다.
            autoFocus 
          />
        </div>

        {/* 하단 버튼 */}
        <div className="p-5 border-t border-gray-100 bg-gray-50 flex gap-4">
          <button 
            onClick={onClose} 
            className="flex-1 py-5 bg-white border-2 border-gray-300 rounded-xl text-xl font-bold text-gray-600 hover:bg-gray-100 active:scale-95 transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={() => onConfirm(note)} 
            className="flex-1 py-5 bg-blue-600 text-white rounded-xl text-xl font-bold hover:bg-blue-700 shadow-md active:scale-95 transition-all"
          >
            Save Note
          </button>
        </div>
      </div>
    </div>
  );
}