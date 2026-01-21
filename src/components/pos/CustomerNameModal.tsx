'use client';

import { useState } from 'react';

interface Props {
  onClose: () => void;
  onConfirm: (name: string) => void;
}

export default function CustomerNameModal({ onClose, onConfirm }: Props) {
  const [name, setName] = useState('');

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name.trim()) return alert("Please enter a name.");
    onConfirm(name.trim());
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-2xl w-full max-w-lg border border-gray-700 shadow-2xl overflow-hidden">
        
        {/* 헤더 */}
        <div className="bg-gray-800 p-6 border-b border-gray-700">
          <h2 className="text-3xl font-black text-white">📞 Phone Order</h2>
          <p className="text-gray-400 mt-1">Enter Customer Name for To Go</p>
        </div>

        {/* 입력 폼 */}
        <form onSubmit={handleSubmit} className="p-8">
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. John Doe"
            className="w-full bg-gray-950 text-white text-3xl font-bold p-5 rounded-xl border-2 border-gray-600 focus:border-blue-500 focus:outline-none placeholder-gray-600 mb-8"
          />

          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-700 hover:bg-gray-600 text-gray-200 text-xl font-bold py-5 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-purple-600 hover:bg-purple-500 text-white text-xl font-bold py-5 rounded-xl shadow-lg shadow-purple-900/30 transition-colors"
            >
              Confirm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}