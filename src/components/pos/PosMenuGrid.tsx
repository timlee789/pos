'use client';

import { MenuItem, Category } from '@/lib/types';

interface PosMenuGridProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
  filteredItems: MenuItem[];
  onItemClick: (item: MenuItem) => void;
}

export default function PosMenuGrid({
  categories,
  selectedCategory,
  onSelectCategory,
  filteredItems,
  onItemClick
}: PosMenuGridProps) {

  const safeItems = filteredItems || [];

  return (
    // ✨ [다크모드] 전체 배경 bg-black
    <section className="flex-1 flex flex-row bg-black h-full overflow-hidden">
      
      {/* 1. 카테고리 (세로 탭) - 왼쪽 Sidebar */}
      {/* ✨ [다크모드] 배경 bg-gray-900, 테두리 border-gray-800 */}
      <div className="w-72 bg-gray-900 border-r border-gray-800 flex flex-col gap-3 p-3 overflow-y-auto shrink-0 shadow-2xl z-10">
        
        {/* 카테고리 리스트 */}
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              // ✨ [디자인 변경] 
              // 선택됨: 파란색 (bg-blue-600)
              // 선택안됨: 어두운 회색 (bg-gray-800) + 글씨 회색
              className={`shrink-0 w-full min-h-[6rem] px-4 rounded-2xl text-2xl font-bold transition-all shadow-md border-2 whitespace-normal leading-tight flex items-center justify-center text-center
                ${isSelected 
                  ? 'bg-blue-600 text-white border-blue-500 shadow-blue-900/50 scale-105 z-10 ring-2 ring-blue-400' 
                  : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700 hover:text-white hover:border-gray-500'
                }`}
            >
              {cat.name}
            </button>
          );
        })}

        <div className="border-t border-gray-700 my-2"></div>

        {/* ✨ [위치 변경] ALL 버튼을 맨 아래로 이동 */}
        <button
          onClick={() => onSelectCategory('All')}
          className={`shrink-0 w-full min-h-[5rem] rounded-2xl text-3xl font-black transition-all shadow-md border-2
            ${selectedCategory === 'All' 
              ? 'bg-blue-600 text-white border-blue-500 scale-105 shadow-blue-900/50 z-20' 
              : 'bg-gray-800 text-gray-500 border-gray-700 hover:bg-gray-700 hover:text-white'
            }`}
        >
          ALL
        </button>
        
        {/* 하단 여백 확보 (스크롤 시 가려짐 방지) */}
        <div className="h-10"></div>
      </div>

      {/* 2. 메뉴 아이템 그리드 */}
      {/* ✨ [다크모드] 배경 bg-black */}
      <div className="flex-1 overflow-y-auto p-5 bg-black">
        {safeItems.length === 0 ? (
           <div className="h-full flex items-center justify-center text-gray-600">
             <p className="text-3xl font-bold">No items in this category.</p>
           </div>
        ) : (
          <div className="grid grid-cols-3 gap-5 pb-20">
            {safeItems.map((item) => (
              <button 
                key={item.id}
                onClick={() => item.is_available && onItemClick(item)}
                // ✨ [다크모드] 카드 배경 bg-gray-900, 테두리 border-gray-800
                className={`relative h-64 flex flex-col justify-between p-6 rounded-3xl shadow-lg transition-all border-2 text-left group
                  ${item.is_available 
                    ? 'bg-gray-900 border-gray-800 hover:border-blue-500 hover:bg-gray-800 hover:shadow-blue-900/20 active:scale-95' 
                    : 'bg-gray-900/50 border-gray-800 opacity-40 cursor-not-allowed grayscale'}`}
              >
                {/* 상단: 이름 및 설명 */}
                <div className="w-full">
                  {/* ✨ [다크모드] 이름 흰색 text-white */}
                  <h3 className="font-black text-3xl text-white leading-none mb-3 line-clamp-2 group-hover:text-blue-400">
                    {/* ✨ [수정됨] 무조건 Admin 이름(name)만 표시 */}
                    {item.name}
                  </h3>
                  
                  {/* ✨ [다크모드] 설명 회색 text-gray-400 */}
                  {item.description && (
                    <p className="text-xl text-gray-400 font-medium leading-snug line-clamp-2">
                      {item.description}
                    </p>
                  )}
                </div>

                {/* 하단: 가격 */}
                <div className="w-full flex justify-end items-end mt-2">
                  {!item.is_available ? (
                    <span className="text-red-500 font-black text-2xl rotate-[-5deg] border-2 border-red-500 px-2 rounded-lg">SOLD OUT</span>
                  ) : (
                    // ✨ [다크모드] 가격 파란색 강조
                    <span className="font-black text-3xl text-gray-400 bg-gray-800 px-3 py-1 rounded-xl border border-gray-700">
                      ${item.price.toFixed(2)}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}