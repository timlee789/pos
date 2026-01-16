"use client";
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

// ✨ [추가] 타입 안정성을 위해 인터페이스 정의 (선택사항이지만 권장)
interface MenuItem {
  id: string;
  name: string;
  price: number;
  description: string | null; // DB에서 null일 수 있음
  is_available: boolean;
  category_id: string;
  image_url: string | null;
  sort_order: number;
  restaurant_id?: string;
}

export default function AdminMenuPage() {
  const [supabase] = useState(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ));

  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  
  // items 상태 관리
  const [items, setItems] = useState<MenuItem[]>([]);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  // ✨ editForm 초기화 시 description 필드 고려
  const [editForm, setEditForm] = useState<Partial<MenuItem>>({}); 

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCatId) fetchItems(selectedCatId);
  }, [selectedCatId]);

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('sort_order');
    if (data && data.length > 0) {
      setCategories(data);
      if (!selectedCatId) setSelectedCatId(data[0].id);
    }
  };

  const fetchItems = async (catId: string) => {
    // ✨ [확인] select('*')는 description 컬럼이 있다면 자동으로 가져옵니다.
    const { data } = await supabase
      .from('items')
      .select('*')
      .eq('category_id', catId)
      .order('sort_order', { ascending: true });
    
    if (data) setItems(data);
  };

  const handleAddNewItem = async () => {
    if (!selectedCatId) return;
    const name = prompt("Enter new Item Name:");
    if (!name) return;

    const maxOrder = items.length > 0 ? Math.max(...items.map(i => i.sort_order || 0)) : 0;

    const { error } = await supabase.from('items').insert({
      restaurant_id: categories[0].restaurant_id, 
      category_id: selectedCatId,
      name: name,
      price: 0,
      description: '', // 새 아이템은 빈 설명으로 시작
      is_available: true,
      sort_order: maxOrder + 1
    });

    if (error) alert("Error adding item: " + error.message);
    else fetchItems(selectedCatId);
  };

  // ✨ [핵심 수정] 수정 모드 시작 시 null 값 방지 처리
  const startEditing = (item: MenuItem) => {
    setEditingId(item.id);
    setEditForm({ 
        ...item,
        // DB에 null로 저장되어 있어도 에디터에서는 빈 문자열로 보여야 함
        description: item.description || '' 
    }); 
  };

  const saveItem = async () => {
    if (!editForm.name) return alert("Name is required");

    const { data, error } = await supabase
      .from('items')
      .update({
        name: editForm.name,
        // ✨ 여기서 입력된 설명값을 저장
        description: editForm.description, 
        price: typeof editForm.price === 'string' ? parseFloat(editForm.price) : editForm.price,
        is_available: editForm.is_available,
        category_id: editForm.category_id
      })
      .eq('id', editingId)
      .select(); 

    if (error) {
      alert("Error saving: " + error.message);
    } else {
      if (data && data.length > 0) {
        setEditingId(null);
        fetchItems(selectedCatId!);
      } else {
        alert("Update failed. Check permissions.");
      }
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Delete this item?")) return;
    await supabase.from('items').delete().eq('id', itemId);
    fetchItems(selectedCatId!);
  };

  const handleImageUpload = async (itemId: string, file: File) => {
    if (!confirm("Upload image?")) return;
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `items/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('menu-images')
      .upload(filePath, file);

    if (uploadError) return alert("Upload Failed: " + uploadError.message);

    const { data: urlData } = supabase.storage.from('menu-images').getPublicUrl(filePath);

    await supabase.from('items').update({ image_url: urlData.publicUrl }).eq('id', itemId);
    alert("Image uploaded!");
    fetchItems(selectedCatId!);
  };

  const handleMoveItem = async (index: number, direction: 'prev' | 'next') => {
    if (direction === 'prev' && index === 0) return;
    if (direction === 'next' && index === items.length - 1) return;

    const targetIndex = direction === 'prev' ? index - 1 : index + 1;
    
    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;
    
    setItems(newItems); 

    const updates = newItems.map((item, idx) => ({
        id: item.id,
        sort_order: idx + 1 
    }));

    try {
        const updatePromises = updates.map(u => 
            supabase.from('items').update({ sort_order: u.sort_order }).eq('id', u.id)
        );
        await Promise.all(updatePromises);
    } catch (error) {
        console.error("Reorder failed", error);
        alert("Failed to save order.");
        fetchItems(selectedCatId!); 
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      
      {/* 카테고리 사이드바 */}
      <div className="w-64 bg-white border-r flex flex-col">
        <div className="p-5 border-b bg-gray-100">
          <h2 className="text-lg font-bold text-gray-800">Filter by Category</h2>
        </div>
        <ul className="overflow-y-auto flex-1 p-2 space-y-1">
          {categories.map(cat => (
            <li 
              key={cat.id}
              onClick={() => {
                setSelectedCatId(cat.id);
                setEditingId(null);
              }}
              className={`p-3 cursor-pointer rounded-lg font-medium transition-all flex justify-between
                ${selectedCatId === cat.id 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <span>{cat.name}</span>
              {selectedCatId === cat.id && <span>👉</span>}
            </li>
          ))}
        </ul>
      </div>

      {/* 아이템 관리 영역 */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Menu Items</h1>
            <p className="text-gray-500 text-sm">
              Current Category: <span className="font-bold text-blue-600">{categories.find(c => c.id === selectedCatId)?.name}</span>
            </p>
          </div>
          <button 
            onClick={handleAddNewItem}
            className="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 font-bold shadow-sm flex items-center gap-2"
          >
            <span>+</span> New Item
          </button>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-400">No items in this category.</p>
            <button onClick={handleAddNewItem} className="text-blue-500 font-bold mt-2 hover:underline">Create one?</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {items.map((item, index) => {
              const isEditing = editingId === item.id;
              // 편집 중일 때는 editForm을, 아닐 때는 원본 item을 사용
              const displayData = isEditing ? (editForm as MenuItem) : item;

              return (
                <div key={item.id} className={`bg-white p-5 rounded-2xl shadow-sm border transition-all 
                  ${isEditing ? 'ring-2 ring-blue-500 border-transparent shadow-xl z-10 scale-[1.02]' : 'border-gray-200'}`}>
                  
                  {/* 순서 변경 버튼 (편집 중 아닐 때만) */}
                  {!isEditing && (
                    <div className="flex justify-between mb-2">
                        <button 
                          onClick={() => handleMoveItem(index, 'prev')}
                          disabled={index === 0}
                          className="text-gray-400 hover:text-blue-600 disabled:opacity-20 text-lg font-bold px-2"
                        >
                          ◀
                        </button>
                        <span className="text-xs text-gray-300 pt-1">Order: {item.sort_order}</span>
                        <button 
                          onClick={() => handleMoveItem(index, 'next')}
                          disabled={index === items.length - 1}
                          className="text-gray-400 hover:text-blue-600 disabled:opacity-20 text-lg font-bold px-2"
                        >
                          ▶
                        </button>
                    </div>
                  )}

                  {/* 이미지 영역 */}
                  <div className="aspect-square bg-gray-100 rounded-xl relative overflow-hidden group mb-4 flex items-center justify-center">
                      {displayData.image_url ? (
                        <img 
                          src={displayData.image_url} 
                          alt={displayData.name} 
                          className="w-full h-full object-cover" 
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <span className="text-gray-400 text-sm font-bold">No Image</span>
                      )}
                      
                      <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white font-bold text-sm z-20">
                        Change Photo
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(item.id, e.target.files[0])} />
                      </label>
                  </div>

                  {/* 입력 폼 영역 */}
                  <div className="space-y-3">
                    
                    {/* 카테고리 이동 (편집 중에만 보임) */}
                    {isEditing && (
                      <div className="bg-yellow-50 p-2 rounded border border-yellow-200">
                        <label className="text-xs text-gray-500 font-bold uppercase block mb-1">Move Category</label>
                        <select
                          value={editForm.category_id}
                          onChange={(e) => setEditForm(prev => ({ ...prev, category_id: e.target.value }))}
                          className="w-full p-1 bg-white border border-gray-300 rounded text-sm font-bold text-gray-800"
                        >
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* 이름 입력 */}
                    <div>
                      <label className="text-xs text-gray-400 font-bold uppercase">Item Name</label>
                      <input 
                        type="text" 
                        disabled={!isEditing}
                        value={displayData.name || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                        className={`w-full text-lg font-bold bg-transparent outline-none border-b-2 py-1
                          ${isEditing ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-800'}`}
                      />
                    </div>

                    {/* ✨ Description 입력/표시 영역 (수정됨) */}
                    <div>
                        <label className="text-xs text-gray-400 font-bold uppercase">Description</label>
                        {isEditing ? (
                            <textarea
                                // ✨ [중요] null 값일 경우 빈 문자열로 처리하여 에러 방지
                                value={editForm.description || ''} 
                                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                                rows={2}
                                className="w-full text-sm bg-gray-50 border border-gray-300 rounded p-2 mt-1 resize-none focus:outline-none focus:border-blue-500"
                                placeholder="Enter item description..."
                            />
                        ) : (
                            // 보기 모드일 때
                            <p className="text-sm text-gray-500 mt-1 line-clamp-2 min-h-[1.5rem]">
                                {displayData.description ? displayData.description : <span className="text-gray-300 italic">No description</span>}
                            </p>
                        )}
                    </div>
                    
                    {/* 가격 및 품절 버튼 */}
                    <div className="flex justify-between gap-4">
                       <div className="flex-1">
                          <label className="text-xs text-gray-400 font-bold uppercase">Price ($)</label>
                          <input 
                              type="number" 
                              step="0.01"
                              disabled={!isEditing}
                              value={displayData.price}
                              // ✨ [수정] prev 뒤에 : any 를 붙여서 타입 오류를 해결합니다.
                              onChange={(e) => setEditForm((prev: any) => ({ ...prev, price: e.target.value }))}
                              className={`w-full text-lg font-bold bg-transparent outline-none border-b-2 py-1
                                ${isEditing ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-800'}`}
                            />
                       </div>
                       <div className="flex items-end pb-2">
                          <button 
                            disabled={!isEditing}
                            onClick={() => setEditForm(prev => ({ ...prev, is_available: !prev.is_available }))}
                            className={`text-xs font-bold px-3 py-1 rounded-full transition-colors
                              ${displayData.is_available 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-red-100 text-red-700'}`}
                          >
                            {displayData.is_available ? 'IN STOCK' : 'SOLD OUT'}
                          </button>
                       </div>
                    </div>
                  </div>

                  {/* 하단 버튼 영역 */}
                  <div className="mt-6 pt-4 border-t flex justify-between items-center">
                    {isEditing ? (
                      <>
                        <button 
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-red-500 text-sm font-bold hover:underline px-2"
                        >
                          Delete
                        </button>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setEditingId(null)}
                            className="px-3 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg text-sm"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={saveItem}
                            className="px-5 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md text-sm"
                          >
                            Save
                          </button>
                        </div>
                      </>
                    ) : (
                      <button 
                        onClick={() => startEditing(item)}
                        className="w-full py-2 bg-gray-50 text-gray-600 font-bold rounded-lg hover:bg-gray-100 border border-gray-200 text-sm"
                      >
                        Edit Item
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}