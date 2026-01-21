"use client";
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface MenuItem {
  id: string;
  name: string;
  // ✨ [추가] POS 전용 이름 필드
  pos_name?: string | null; 
  price: number;
  description: string | null;
  is_available: boolean;
  category_id: string;
  image_url: string | null;
  sort_order: number;
  restaurant_id?: string;
  is_kiosk_visible?: boolean;
  is_pos_visible?: boolean;
}

export default function AdminMenuPage() {
  const [supabase] = useState(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ));

  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
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
      pos_name: '', // 초기값 빈 문자열
      price: 0,
      description: '', 
      is_available: true,
      sort_order: maxOrder + 1,
      is_kiosk_visible: true,
      is_pos_visible: true
    });

    if (error) alert("Error adding item: " + error.message);
    else fetchItems(selectedCatId);
  };

  const startEditing = (item: MenuItem) => {
    setEditingId(item.id);
    setEditForm({ 
        ...item,
        description: item.description || '',
        pos_name: item.pos_name || '', // null이면 빈값으로
        is_kiosk_visible: item.is_kiosk_visible ?? true,
        is_pos_visible: item.is_pos_visible ?? true
    }); 
  };

  const saveItem = async () => {
    if (!editForm.name) return alert("Name is required");

    const { data, error } = await supabase
      .from('items')
      .update({
        name: editForm.name,
        // ✨ [저장] POS Name 저장
        pos_name: editForm.pos_name, 
        description: editForm.description, 
        price: typeof editForm.price === 'string' ? parseFloat(editForm.price) : editForm.price,
        is_available: editForm.is_available,
        category_id: editForm.category_id,
        is_kiosk_visible: editForm.is_kiosk_visible,
        is_pos_visible: editForm.is_pos_visible
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
      <div className="w-64 bg-white border-r flex flex-col">
        <div className="p-5 border-b bg-gray-100">
          <h2 className="text-lg font-bold text-gray-800">Filter by Category</h2>
        </div>
        <ul className="overflow-y-auto flex-1 p-2 space-y-1">
          {categories.map(cat => (
            <li 
              key={cat.id}
              onClick={() => { setSelectedCatId(cat.id); setEditingId(null); }}
              className={`p-3 cursor-pointer rounded-lg font-medium transition-all flex justify-between
                ${selectedCatId === cat.id ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <span>{cat.name}</span>
              {selectedCatId === cat.id && <span>👉</span>}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex-1 p-8 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Menu Items</h1>
            <p className="text-gray-500 text-sm">
              Current Category: <span className="font-bold text-blue-600">{categories.find(c => c.id === selectedCatId)?.name}</span>
            </p>
          </div>
          <button onClick={handleAddNewItem} className="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 font-bold shadow-sm flex items-center gap-2">
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
              const displayData = isEditing ? (editForm as MenuItem) : item;

              return (
                <div key={item.id} className={`bg-white p-5 rounded-2xl shadow-sm border transition-all 
                  ${isEditing ? 'ring-2 ring-blue-500 border-transparent shadow-xl z-10 scale-[1.02]' : 'border-gray-200'}`}>
                  
                  {!isEditing && (
                    <div className="flex justify-between mb-2">
                        <button onClick={() => handleMoveItem(index, 'prev')} disabled={index === 0} className="text-gray-400 hover:text-blue-600 disabled:opacity-20 text-lg font-bold px-2">◀</button>
                        <span className="text-xs text-gray-300 pt-1">Order: {item.sort_order}</span>
                        <button onClick={() => handleMoveItem(index, 'next')} disabled={index === items.length - 1} className="text-gray-400 hover:text-blue-600 disabled:opacity-20 text-lg font-bold px-2">▶</button>
                    </div>
                  )}

                  <div className="aspect-square bg-gray-100 rounded-xl relative overflow-hidden group mb-4 flex items-center justify-center">
                      {displayData.image_url ? (
                        <img src={displayData.image_url} alt={displayData.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      ) : ( <span className="text-gray-400 text-sm font-bold">No Image</span> )}
                      <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white font-bold text-sm z-20">
                        Change Photo
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(item.id, e.target.files[0])} />
                      </label>
                  </div>

                  <div className="space-y-3">
                    {isEditing && (
                      <div className="bg-yellow-50 p-2 rounded border border-yellow-200">
                        <label className="text-xs text-gray-500 font-bold uppercase block mb-1">Move Category</label>
                        <select
                          value={editForm.category_id}
                          onChange={(e) => setEditForm(prev => ({ ...prev, category_id: e.target.value }))}
                          className="w-full p-1 bg-white border border-gray-300 rounded text-sm font-bold text-gray-800"
                        >
                          {categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="text-xs text-gray-400 font-bold uppercase">Item Name</label>
                      <input 
                        type="text" 
                        disabled={!isEditing}
                        value={displayData.name || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                        className={`w-full text-lg font-bold bg-transparent outline-none border-b-2 py-1 ${isEditing ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-800'}`}
                      />
                    </div>

                    {/* ✨ [추가] POS Name 입력칸 */}
                    <div>
                        <label className="text-xs text-blue-500 font-bold uppercase">POS Name (Short)</label>
                        {isEditing ? (
                            <input 
                                type="text"
                                value={editForm.pos_name || ''} 
                                onChange={(e) => setEditForm(prev => ({ ...prev, pos_name: e.target.value }))}
                                placeholder="(Optional) Name for POS only"
                                className="w-full text-sm font-medium bg-blue-50 border-b-2 border-blue-200 focus:border-blue-500 outline-none py-1 px-1 rounded-t"
                            />
                        ) : (
                            <p className="text-sm text-gray-600 min-h-[1.2rem] font-medium">
                                {displayData.pos_name ? <span className="text-blue-600">🖥️ {displayData.pos_name}</span> : <span className="text-gray-300 text-xs">Same as Name</span>}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="text-xs text-gray-400 font-bold uppercase">Description</label>
                        {isEditing ? (
                            <textarea
                                value={editForm.description || ''} 
                                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                                rows={2}
                                className="w-full text-sm bg-gray-50 border border-gray-300 rounded p-2 mt-1 resize-none focus:outline-none focus:border-blue-500"
                                placeholder="Enter item description..."
                            />
                        ) : (
                            <p className="text-sm text-gray-500 mt-1 line-clamp-2 min-h-[1.5rem]">
                                {displayData.description || <span className="text-gray-300 italic">No description</span>}
                            </p>
                        )}
                    </div>
                    
                    <div className="flex justify-between gap-4">
                       <div className="flex-1">
                          <label className="text-xs text-gray-400 font-bold uppercase">Price ($)</label>
                          <input 
                              type="number" step="0.01" disabled={!isEditing}
                              value={displayData.price}
                              onChange={(e) => setEditForm((prev: any) => ({ ...prev, price: e.target.value }))}
                              className={`w-full text-lg font-bold bg-transparent outline-none border-b-2 py-1 ${isEditing ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-800'}`}
                            />
                       </div>
                       <div className="flex items-end pb-2">
                          <button 
                            disabled={!isEditing}
                            onClick={() => setEditForm(prev => ({ ...prev, is_available: !prev.is_available }))}
                            className={`text-xs font-bold px-3 py-1 rounded-full transition-colors ${displayData.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                          >
                            {displayData.is_available ? 'IN STOCK' : 'SOLD OUT'}
                          </button>
                       </div>
                    </div>

                    {isEditing && (
                        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-100">
                            <label className="flex items-center space-x-2 cursor-pointer bg-gray-50 p-2 rounded hover:bg-gray-100">
                                <input 
                                    type="checkbox" 
                                    checked={editForm.is_kiosk_visible ?? true}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, is_kiosk_visible: e.target.checked }))}
                                    className="w-4 h-4 text-blue-600 rounded"
                                />
                                <span className="text-xs font-bold text-gray-600">Show on Kiosk</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer bg-gray-50 p-2 rounded hover:bg-gray-100">
                                <input 
                                    type="checkbox" 
                                    checked={editForm.is_pos_visible ?? true}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, is_pos_visible: e.target.checked }))}
                                    className="w-4 h-4 text-green-600 rounded"
                                />
                                <span className="text-xs font-bold text-gray-600">Show on POS</span>
                            </label>
                        </div>
                    )}
                    
                    {!isEditing && (
                        <div className="flex gap-2 mt-1">
                            {!displayData.is_kiosk_visible && <span className="text-[10px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded border border-gray-300">Hidden on Kiosk</span>}
                            {!displayData.is_pos_visible && <span className="text-[10px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded border border-gray-300">Hidden on POS</span>}
                        </div>
                    )}

                  </div>

                  <div className="mt-4 pt-4 border-t flex justify-between items-center">
                    {isEditing ? (
                      <>
                        <button onClick={() => handleDeleteItem(item.id)} className="text-red-500 text-sm font-bold hover:underline px-2">Delete</button>
                        <div className="flex gap-2">
                          <button onClick={() => setEditingId(null)} className="px-3 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg text-sm">Cancel</button>
                          <button onClick={saveItem} className="px-5 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md text-sm">Save</button>
                        </div>
                      </>
                    ) : (
                      <button onClick={() => startEditing(item)} className="w-full py-2 bg-gray-50 text-gray-600 font-bold rounded-lg hover:bg-gray-100 border border-gray-200 text-sm">Edit Item</button>
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