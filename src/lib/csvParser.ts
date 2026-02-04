// src/lib/csvParser.ts
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { Category, MenuItem, ModifierGroup } from './types';

// CSV 파싱 헬퍼
const parseCSV = async <T>(fileName: string): Promise<T[]> => {
    try {
        const filePath = path.join(process.cwd(), 'public/data', fileName);
        if (!fs.existsSync(filePath)) return [];

        const fileContent = fs.readFileSync(filePath, 'utf8');
        const { data } = Papa.parse(fileContent, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
        });
        return data as T[];
    } catch (error) {
        console.error(`Error loading ${fileName}:`, error);
        return [];
    }
};

// ✨ [리팩토링] 데이터 정제 로직
const processMenuItem = (itemData: any, categoryName: string): MenuItem => {
    const name = (itemData['Real Name'] || itemData['POS Name'] || '').trim();
    const posName = (itemData['POS Name '] || itemData['POS Name'] || itemData.POSName || '').trim();
    const lowerName = name.toLowerCase();

    // Modifier Groups 파싱
    let modGroups: string[] = [];
    const rawGroupStr = itemData['Modifier Groups'] || itemData.ModifierGroups;
    if (rawGroupStr && typeof rawGroupStr === 'string') {
        modGroups = rawGroupStr.split(',').map(s => s.trim()).filter(s => s.length > 0);
    }

    // 요일 스페셜 메뉴 확인
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const daySpecial = days.find(day => lowerName.includes(day.toLowerCase()));

    return {
        id: itemData['Clover ID'] || posName,
        name: name,
        posName: posName,
        price: itemData.Price || 0,
        category: categoryName,
        description: itemData.Description || undefined,
        modifierGroups: modGroups,
        image: '/placeholder.png',

        // ✨ [리팩토링] 하드코딩 로직을 데이터 로딩 시점에 처리
        is_special_bundle: categoryName.toLowerCase() === 'special',
        requires_flavor_and_size: lowerName.includes('milkshake'),
        day_of_week_special: daySpecial || undefined,

        // 기존 속성
        is_kiosk_visible: itemData.is_kiosk_visible !== 'FALSE',
        is_pos_visible: itemData.is_pos_visible !== 'FALSE',
        sort_order: itemData.sort_order,
    };
}

export const getKioskData = async () => {
    const [rawCategories, rawItems, rawModifiers] = await Promise.all([
        parseCSV<any>('Category.csv'),
        parseCSV<any>('Items.csv'),
        parseCSV<any>('Modifier.csv')
    ]);

    const modifiersMap = new Map<string, ModifierGroup>();
    rawModifiers.forEach((row: any) => {
        const groupName = (row['Modifier Group Name'] || row.GroupName || '').trim();
        const optionName = (row.Modifier || row.OptionName || '').trim();
        const price = row.Price || 0;
        if (!groupName || !optionName) return;
        if (!modifiersMap.has(groupName)) {
            modifiersMap.set(groupName, { name: groupName, options: [] });
        }
        modifiersMap.get(groupName)?.options.push({ name: optionName, price: price });
    });

    const itemsMap = new Map<string, any>();
    rawItems.forEach((row: any) => {
        const posNameKey = (row['POS Name '] || row['POS Name'] || row.POSName || '').trim();
        if (posNameKey) itemsMap.set(posNameKey, row);
    });

    const categories: Category[] = [];
    const allItems: MenuItem[] = [];
    const categoryNames = rawCategories.length > 0 ? Object.keys(rawCategories[0]) : [];

    categoryNames.forEach((catName) => {
        if (!catName) return;
        const categoryItems: MenuItem[] = [];
        rawCategories.forEach((row: any) => {
            const itemPosName = (row[catName] || '').trim();
            if (!itemPosName) return;
            const itemData = itemsMap.get(itemPosName);
            if (itemData) {
                const newItem = processMenuItem(itemData, catName);
                categoryItems.push(newItem);
                allItems.push(newItem);
            }
        });

        if (categoryItems.length > 0) {
            categories.push({ id: catName, name: catName, items: categoryItems });
        }
    });

    // modifiersMap을 객체로 변환 (기존 usePosLogic과 호환)
    const modifiersObj = Object.fromEntries(modifiersMap);

    return { categories, items: allItems, modifiersObj };
};