"use client";
import { useState } from 'react';
import { MenuItem, ModifierGroup, ModifierOption } from '@/lib/types';

interface Props {
  item: MenuItem;
  modifiersObj: { [key: string]: ModifierGroup };
  onClose: () => void;
  onConfirm: (item: MenuItem, selectedOptions: ModifierOption[]) => void;
}

export default function ModifierModal({ item, modifiersObj, onClose, onConfirm }: Props) {
  const [selectedOptions, setSelectedOptions] = useState<ModifierOption[]>([]);

  // 옵션 선택 로직
  const toggleOption = (option: ModifierOption, groupName: string) => {
    const lowerItemName = item.name.toLowerCase();
    const lowerGroupName = groupName.toLowerCase();
    
    // 🥤 밀크쉐이크 로직 (단일 선택)
    const isMilkshake = lowerItemName.includes('milkshake');
    const isSingleSelectGroup = isMilkshake && (lowerGroupName.includes('size') || lowerGroupName.includes('flavor'));

    if (isSingleSelectGroup) {
      setSelectedOptions(prev => {
        const currentGroupOptions = modifiersObj[groupName]?.options.map(o => o.name) || [];
        const others = prev.filter(o => !currentGroupOptions.includes(o.name));
        return [...others, option];
      });
    } else {
      // ✅ 일반 로직 (다중 선택/토글)
      setSelectedOptions(prev => {
        const exists = prev.find(o => o.name === option.name);
        return exists ? prev.filter(o => o.name !== option.name) : [...prev, option];
      });
    }
  };

  // 장바구니 담기 전 유효성 검사
  const handleAddToCart = () => {
    const itemName = item.name.toLowerCase();

    if (itemName.includes('milkshake')) {
      let hasSize = false;
      let hasFlavor = false;

      item.modifierGroups.forEach(groupName => {
        const group = modifiersObj[groupName];
        if (!group) return;

        const lowerGroupName = groupName.toLowerCase();
        const isSelectedInGroup = group.options.some(opt => 
          selectedOptions.some(selected => selected.name === opt.name)
        );

        if (lowerGroupName.includes('size') && isSelectedInGroup) hasSize = true;
        if (lowerGroupName.includes('flavor') && isSelectedInGroup) hasFlavor = true;
      });

      if (!hasSize) return alert("⚠️ Please select a Size.");
      if (!hasFlavor) return alert("⚠️ Please select a Flavor.");
    }

    onConfirm(item, selectedOptions);
  };

  const currentTotal = item.price + selectedOptions.reduce((sum, opt) => sum + opt.price, 0);

  return (
    // ✨ [다크모드] 외부 배경
    <div 
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* ✨ [다크모드] 내부 모달 (Dark Gray) */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-gray-900 rounded-3xl w-[80%] h-auto max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-gray-700"
      >

        {/* 헤더 */}
        <div className="p-5 border-b border-gray-700 bg-gray-800 flex justify-between items-center shrink-0">
          <div className="flex-1 pr-4">
            <h2 className="text-2xl font-black text-white leading-tight">{item.name}</h2>
            <p className="text-gray-400 text-base mt-1 font-medium">Select options</p>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-2xl text-blue-400 font-black">${currentTotal.toFixed(2)}</span>
            
            <button 
              onClick={onClose}
              className="bg-gray-700 p-2 rounded-full hover:bg-gray-600 transition-colors shadow-sm text-gray-300 hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 옵션 스크롤 영역 */}
        {/* ✨ [다크모드] 배경 bg-gray-900 */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-gray-900">
          {item.modifierGroups.length === 0 && (
            <p className="text-center text-gray-500 py-10 text-xl">No options available.</p>
          )}

          {item.modifierGroups.map((groupName, idx) => {
            const group = modifiersObj[groupName];
            if (!group || !group.options || group.options.length === 0) return null;

            const sortedOptions = [...group.options].sort((a: any, b: any) => {
              return (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0);
            });

            return (
              <div key={`${groupName}-${idx}`}>
                {/* ✨ 그룹 이름 폰트 축소 (text-xl) 및 흰색 */}
                <h3 className="text-xl font-bold mb-4 text-gray-200 border-l-4 border-blue-500 pl-3 uppercase tracking-wide">
                  {groupName}
                </h3>
                
                {/* ✨ 3열 그리드 */}
                <div className="grid grid-cols-3 gap-4">
                  {sortedOptions.map((option, optIdx) => {
                    const isSelected = selectedOptions.some(o => o.name === option.name);
                    return (
                      <div
                        key={`${option.name}-${optIdx}`}
                        onClick={() => toggleOption(option, groupName)}
                        // ✨ [다크모드] 버튼 스타일 (선택됨: Blue / 안됨: Gray-800)
                        // ✨ 패딩 축소 (p-4)
                        className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all active:scale-95
                          ${isSelected
                            ? 'bg-blue-900/40 border-blue-500 ring-1 ring-blue-500'
                            : 'bg-gray-800 border-gray-700 hover:bg-gray-750 hover:border-gray-500'
                          }`}
                      >
                        {/* 체크박스 */}
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 shrink-0
                          ${isSelected ? 'bg-blue-500 border-blue-500' : 'bg-transparent border-gray-500'}`}
                        >
                          {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                        </div>
                        
                        <div className="flex flex-col">
                          {/* ✨ 옵션 이름 폰트 축소 (text-lg) */}
                          <span className={`text-lg font-bold leading-tight ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                            {option.name}
                          </span>
                          {option.price > 0 && (
                            <span className="text-base text-blue-400 font-bold mt-1">+${option.price.toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* 하단 버튼 */}
        <div className="p-5 border-t border-gray-700 bg-gray-800 flex gap-4 shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.3)]">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-700 text-gray-300 text-xl font-bold rounded-xl h-16 hover:bg-gray-600 transition-colors border border-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleAddToCart}
            className="flex-[2] bg-blue-600 text-white text-xl font-bold rounded-xl h-16 hover:bg-blue-500 shadow-lg shadow-blue-900/50 transition-colors flex items-center justify-center gap-3"
          >
            Add to Order <span className="text-blue-200 text-lg font-semibold">| ${currentTotal.toFixed(2)}</span>
          </button>
        </div>

      </div>
    </div>
  );
}