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

  const toggleOption = (option: ModifierOption, groupName: string) => {
    const lowerItemName = item.name.toLowerCase();
    const lowerGroupName = groupName.toLowerCase();
    
    const isMilkshake = lowerItemName.includes('milkshake');
    const isSingleSelectGroup = isMilkshake && (lowerGroupName.includes('size') || lowerGroupName.includes('flavor'));

    if (isSingleSelectGroup) {
      setSelectedOptions(prev => {
        const currentGroupOptions = modifiersObj[groupName]?.options.map(o => o.name) || [];
        const others = prev.filter(o => !currentGroupOptions.includes(o.name));
        return [...others, option];
      });
    } else {
      setSelectedOptions(prev => {
        const exists = prev.find(o => o.name === option.name);
        return exists ? prev.filter(o => o.name !== option.name) : [...prev, option];
      });
    }
  };

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
    <div 
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* ✨ 모달 너비 w-[85%]로 조금 더 넓게 */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-gray-900 rounded-3xl w-[85%] h-auto max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-gray-700"
      >

        {/* 헤더 */}
        <div className="p-6 border-b border-gray-700 bg-gray-800 flex justify-between items-center shrink-0">
          <div className="flex-1 pr-4">
            {/* ✨ 아이템 이름 text-3xl */}
            <h2 className="text-3xl font-black text-white leading-tight">{item.name}</h2>
            <p className="text-gray-400 text-lg mt-1 font-medium">Select options</p>
          </div>
          
          <div className="flex items-center gap-5">
            {/* ✨ 가격 text-3xl */}
            <span className="text-3xl text-blue-400 font-black">${currentTotal.toFixed(2)}</span>
            
            <button 
              onClick={onClose}
              className="bg-gray-700 p-3 rounded-full hover:bg-gray-600 transition-colors shadow-sm text-gray-300 hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 옵션 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-gray-900">
          {item.modifierGroups.length === 0 && (
            <p className="text-center text-gray-500 py-10 text-2xl">No options available.</p>
          )}

          {item.modifierGroups.map((groupName, idx) => {
            const group = modifiersObj[groupName];
            if (!group || !group.options || group.options.length === 0) return null;

            const sortedOptions = [...group.options].sort((a: any, b: any) => {
              return (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0);
            });

            return (
              <div key={`${groupName}-${idx}`}>
                {/* ✨ 그룹 제목 text-2xl */}
                <h3 className="text-2xl font-bold mb-5 text-gray-200 border-l-4 border-blue-500 pl-4 uppercase tracking-wide">
                  {groupName}
                </h3>
                
                <div className="grid grid-cols-3 gap-5">
                  {sortedOptions.map((option, optIdx) => {
                    const isSelected = selectedOptions.some(o => o.name === option.name);
                    return (
                      <div
                        key={`${option.name}-${optIdx}`}
                        onClick={() => toggleOption(option, groupName)}
                        // ✨ 패딩 p-5 (확대)
                        className={`flex items-center p-5 border rounded-2xl cursor-pointer transition-all active:scale-95
                          ${isSelected
                            ? 'bg-blue-900/40 border-blue-500 ring-1 ring-blue-500'
                            : 'bg-gray-800 border-gray-700 hover:bg-gray-750 hover:border-gray-500'
                          }`}
                      >
                        {/* ✨ 체크박스 크기 w-7 h-7 (확대) */}
                        <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center mr-4 shrink-0
                          ${isSelected ? 'bg-blue-500 border-blue-500' : 'bg-transparent border-gray-500'}`}
                        >
                          {isSelected && <div className="w-3 h-3 bg-white rounded-full" />}
                        </div>
                        
                        <div className="flex flex-col">
                          {/* ✨ 옵션 이름 text-xl (확대) */}
                          <span className={`text-xl font-bold leading-tight ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                            {option.name}
                          </span>
                          {option.price > 0 && (
                            <span className="text-lg text-blue-400 font-bold mt-1">+${option.price.toFixed(2)}</span>
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
        <div className="p-6 border-t border-gray-700 bg-gray-800 flex gap-5 shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.3)]">
          <button
            onClick={onClose}
            // ✨ 높이 h-20 (확대), 폰트 text-2xl
            className="flex-1 bg-gray-700 text-gray-300 text-2xl font-bold rounded-2xl h-20 hover:bg-gray-600 transition-colors border border-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleAddToCart}
            // ✨ 높이 h-20 (확대), 폰트 text-2xl
            className="flex-[2] bg-blue-600 text-white text-2xl font-bold rounded-2xl h-20 hover:bg-blue-500 shadow-lg shadow-blue-900/50 transition-colors flex items-center justify-center gap-3"
          >
            Add to Order <span className="text-blue-200 text-xl font-semibold">| ${currentTotal.toFixed(2)}</span>
          </button>
        </div>

      </div>
    </div>
  );
}