'use client';

import { MenuItem, Category } from '@/lib/types';

interface PosMenuGridProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
  filteredItems: MenuItem[];
  onItemClick: (item: MenuItem) => void;
}

// ✨ 카테고리별 파스텔 색상 팔레트 (유지)
const CATEGORY_COLORS = [
  'bg-red-50 text-black-700 border-red-100 hover:bg-red-100',
  'bg-orange-50 text-black-700 border-orange-100 hover:bg-orange-100',
  'bg-amber-50 text-black-700 border-amber-100 hover:bg-amber-100',
  'bg-green-50 text-black-700 border-green-100 hover:bg-green-100',
  'bg-emerald-50 text-black-700 border-emerald-100 hover:bg-emerald-100',
  'bg-teal-50 text-black-700 border-teal-100 hover:bg-teal-100',
  'bg-cyan-50 text-black-700 border-cyan-100 hover:bg-cyan-100',
  'bg-blue-50 text-black-700 border-blue-100 hover:bg-blue-100',
  'bg-indigo-50 text-black-700 border-indigo-100 hover:bg-indigo-100',
  'bg-violet-50 text-black-700 border-violet-100 hover:bg-violet-100',
  'bg-purple-50 text-black-700 border-purple-100 hover:bg-purple-100',
  'bg-fuchsia-50 text-black-700 border-fuchsia-100 hover:bg-fuchsia-100',
  'bg-pink-50 text-black-700 border-pink-100 hover:bg-pink-100',
];

export default function PosMenuGrid({
  categories,
  selectedCategory,
  onSelectCategory,
  filteredItems,
  onItemClick
}: PosMenuGridProps) {

  // ✨ [안전장치] 데이터가 로딩 중이거나 없을 때 에러 방지
  const safeItems = filteredItems || [];

  return (
    <section className="flex-1 flex flex-row bg-gray-200 h-full overflow-hidden">
      
      {/* 1. 카테고리 (세로 탭) - 왼쪽 배치 (기존 코드 유지) */}
      <div className="w-56 bg-white border-r border-gray-300 flex flex-col gap-3 p-3 overflow-y-auto shrink-0 shadow-inner">
        {categories.map((cat, index) => {
          const colorClass = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
          const isSelected = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`w-full py-6 px-2 rounded-xl text-xl font-bold transition-all shadow-sm border-2 whitespace-normal leading-tight
                ${isSelected 
                  ? 'bg-slate-800 text-white border-slate-800 scale-105 shadow-md z-10' 
                  : `${colorClass} opacity-90 hover:opacity-100 hover:scale-[1.02]`
                }`}
            >
              {cat.name}
            </button>
          );
        })}

        <div className="border-t border-gray-200 my-2"></div>

        <button
          onClick={() => onSelectCategory('All')}
          className={`w-full py-6 px-2 rounded-xl text-xl font-bold transition-all shadow-sm border-2
            ${selectedCategory === 'All' 
              ? 'bg-slate-800 text-white border-slate-800 scale-105 shadow-md' 
              : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-white hover:border-gray-400'
            }`}
        >
          ALL
        </button>
      </div>

      {/* 2. 메뉴 아이템 그리드 (수정됨) */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-200">
        {safeItems.length === 0 ? (
           <div className="h-full flex items-center justify-center text-gray-500">
             <p className="text-2xl font-bold">No items available.</p>
           </div>
        ) : (
          <div className="grid grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
            {safeItems.map((item) => (
              <div 
                key={item.id}
                onClick={() => item.is_available && onItemClick(item)}
                className={`flex flex-col justify-between p-5 rounded-2xl shadow-sm cursor-pointer transition-all border-2 h-auto min-h-[160px]
                  ${item.is_available 
                    ? 'bg-white border-transparent hover:border-blue-500 hover:shadow-lg active:scale-95' 
                    : 'bg-gray-100 border-gray-300 opacity-60 cursor-not-allowed grayscale'}`}
              >
                {/* 상단: 이름 및 설명 */}
                <div className="flex-1">
                  {/* ✨ 이름 (name 우선) */}
                  <span className="block font-extrabold text-2xl text-gray-800 leading-tight mb-2 line-clamp-2">
                    {item.name}
                  </span>
                  
                  {/* ✨ 설명 (Description) 추가 */}
                  {item.description && (
                    <p className="text-sm text-gray-500 font-medium leading-snug line-clamp-3">
                      {item.description}
                    </p>
                  )}
                </div>

                {/* 하단: 가격 및 품절 표시 */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end items-end">
                  {!item.is_available ? (
                    <span className="text-red-500 font-black text-lg">SOLD OUT</span>
                  ) : (
                    <span className="font-black text-2xl text-gray-700">
                      ${item.price.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}