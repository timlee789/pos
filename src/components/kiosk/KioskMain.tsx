'use client';

import { Category, MenuItem } from '@/lib/types';
import ItemCard from './ItemCard'; // 같은 폴더(kiosk)에 있으므로 ./ 사용

interface KioskMainProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
  filteredItems: MenuItem[];
  onItemClick: (item: MenuItem) => void;
}

export default function KioskMain({
  categories,
  selectedCategory,
  onSelectCategory,
  filteredItems,
  onItemClick
}: KioskMainProps) {

  return (
    <div className="flex h-full bg-black">
      
      {/* 1. 왼쪽 사이드바 (카테고리) */}
      <aside className="w-24 md:w-32 lg:w-40 bg-gray-900 border-r border-gray-800 flex flex-col items-center py-6 gap-4 overflow-y-auto z-20 shrink-0">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`w-20 h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 rounded-2xl flex flex-col items-center justify-center p-2 transition-all duration-200 border-2
                ${isSelected 
                  ? 'bg-red-600 border-red-500 shadow-lg shadow-red-900/50 scale-105 z-10' 
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
            >
              <span className="text-xs md:text-sm lg:text-base font-bold text-center leading-tight break-words w-full">
                {cat.name}
              </span>
            </button>
          );
        })}

        <div className="w-16 h-1 bg-gray-700 rounded-full my-2 opacity-50"></div>

        {/* ALL 버튼 */}
        <button
          onClick={() => onSelectCategory('All')}
          className={`w-20 h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 rounded-2xl flex flex-col items-center justify-center p-2 transition-all border-2
            ${selectedCategory === 'All'
              ? 'bg-red-600 border-red-500 shadow-lg text-white scale-105'
              : 'bg-gray-800 border-gray-700 text-gray-500 hover:bg-gray-700'
            }`}
        >
          <span className="font-black text-sm md:text-base">ALL</span>
        </button>

        {/* 하단 여백 */}
        <div className="h-20 shrink-0"></div>
      </aside>

      {/* 2. 메인 영역 (메뉴 그리드) */}
      <main className="flex-1 h-full overflow-y-auto p-4 md:p-6 lg:p-8 bg-black relative">
        
        {/* 카테고리 제목 (배경 장식) */}
        <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none select-none">
          <h2 className="text-9xl font-black text-white tracking-tighter uppercase">
            {categories.find(c => c.id === selectedCategory)?.name || 'MENU'}
          </h2>
        </div>

        {/* 아이템 그리드 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 pb-40">
          {filteredItems.map((item) => (
            <ItemCard 
              key={item.id} 
              item={item} 
              onClick={() => onItemClick(item)} 
            />
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="flex h-full items-center justify-center flex-col text-gray-500">
            <p className="text-2xl font-bold">No items available.</p>
          </div>
        )}
      </main>
    </div>
  );
}