// src/components/kiosk/KioskHeader.tsx
import { Category } from '@/lib/types';

interface KioskHeaderProps {
  categories: Category[];
  activeTab: string;
  onTabChange: (name: string) => void;
}

export default function KioskHeader({ categories, activeTab, onTabChange }: KioskHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200 shrink-0 z-30">
      <div className="pt-8 px-6 pb-2 text-center relative">
        <h1 className="text-4xl font-black text-gray-900 tracking-tight leading-tight">
          The Collegiate Grill
        </h1>
        <p className="text-gray-400 font-bold tracking-widest text-sm uppercase mt-1">Since 1947</p>
        
        {/* 기존에 있던 Start Over 버튼 삭제됨 */}
      </div>

      <div className="flex overflow-x-auto px-4 py-4 gap-3 scrollbar-hide items-center">
        {categories.map((cat, index) => {
          const displayName = cat.name === "Plates & Salads" ? "Salads" : cat.name;
          return (
            <button
              key={cat.id || index}
              onClick={() => onTabChange(cat.name)}
              className={`flex-shrink-0 px-6 h-18 rounded-full text-2xl font-extrabold transition-all shadow-sm border-[3px] whitespace-nowrap
                ${activeTab === cat.name 
                  ? 'bg-red-600 text-white border-red-600 shadow-md' 
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
            >
              {displayName}
            </button>
          );
        })}
      </div>
    </div>
  );
}