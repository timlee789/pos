const express = require('express');
const cors = require('cors');
const net = require('net');

const app = express();
const PORT = 4000;

// ==========================================
// ⚠️ [설정] 프린터 IP 설정
// ==========================================
const KITCHEN_PRINTER_IP   = '192.168.50.3';   // 🍔 주방
const MILKSHAKE_PRINTER_IP = '192.168.50.19';  // 🥤 쉐이크
const RECEIPT_PRINTER_IP   = '192.168.50.20';  // 🧾 영수증

// CORS 및 JSON 설정
app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json());

// ==========================================
// 🟢 [주방 약어 사전]
// ==========================================
const CUSTOM_ABBREVIATIONS = {
    // [ADD ON]
    'Slaw': 'S',      
    'Onion': 'O',      
    'Mayo': 'M',
    'Ketchup': 'K',
    'Mustard': 'MUS',
    'Lettuce': 'L',
    'Tomato': 'T',
    'Pickles': 'P',
    'EVERY': 'EVERY',
    'EVERYTHING': 'EVERY',
    'NO BUN': 'NO BUN',
    'Texas Toast': 'Texas',
    'BBQ Sauce': 'BBQ' ,

    // [MAKE A MEAL]
    'Make a Meal - 1/2 OnionRing+D': 'Meal-1/2 O-Ring',
    'Onion Ring+Soft Drink': 'Meal-1/2 O-Ring',
    'Make a Meal-1/2FF+D': 'Meal-1/2 FF',
    '1/2FrenchFries+SoftDrink': 'Meal-1/2 FF',
   
    // [EXTRA]
    'Extra Slaw': 'X-Slaw',
    'Extra Lettuce': 'X-L',
    'Extra Tomato': 'X-T',
    'Extra Pickles': 'X-P',
    'Add Bacon': 'Add BAC',
    'Add Chili': 'Add Chili',
    'Add Grilled Onions': 'Add G-Onion',
    'Add Cheese': 'Add Chese',
    'Extra Cheese': 'Extra Chese',
    'extra patty': 'X-Patty',

    // [SALAD DRESSING]
    'Italian': 'Italian',
    'Ranch': 'Ranch',
   
    // [BREAD TYPE]
    'Wheat': 'Wheat',
    'White': 'White',
    'malt': 'Malt',
   
    // [To Go / Dine In 관련]
    'to go': 'TO GO',
    'dine in': 'HERE'
};

function getAbbreviatedMod(name) {
    if (!name) return '';
    let modName = name.trim();
    const lowerName = modName.toLowerCase();
    if (CUSTOM_ABBREVIATIONS[lowerName]) return CUSTOM_ABBREVIATIONS[lowerName];
    let prefix = "";
    if (lowerName.startsWith("no ")) { prefix = "NO "; modName = modName.substring(3).trim(); }
    else if (lowerName.startsWith("add ")) { prefix = "ADD "; modName = modName.substring(4).trim(); }
    return prefix + modName.charAt(0).toUpperCase() + modName.slice(1);
}

function formatCloverDate(dateObj) {
    const day = dateObj.getDate().toString().padStart(2, '0');
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[dateObj.getMonth()];
    const year = dateObj.getFullYear();
    return `${day}-${month}-${year}`;
}

// ==========================================
// 🖨️ [네트워크 프린터 전송 함수]
// ==========================================
function sendToNetworkPrinter(ip, buffer, label) {
    return new Promise((resolve) => {
        console.log(`⏳ [${label}] Sending to -> ${ip}:9100`);
        const client = new net.Socket();
        client.setTimeout(5000);
        
        client.connect(9100, ip, () => {
            client.write(Buffer.from(buffer));
            client.end();
        });

        client.on('close', () => { 
            console.log(`✅ [${label}] Completed`); 
            resolve(); 
        });
        
        client.on('error', (err) => { 
            console.error(`❌ [${label}] Error (${ip}): ${err.message}`); 
            client.destroy(); 
            resolve();
        });
        
        client.on('timeout', () => { 
            console.error(`❌ [${label}] Timeout (${ip})`); 
            client.destroy(); 
            resolve(); 
        });
    });
}

// 🎨 [주방/쉐이크 디자인]
function generateKitchenBuffer(items, tableNumber, orderId, title, useAbbreviations, employeeName) {
    const INIT = '\x1b\x40';
    const RED = '\x1b\x34'; 
    const BLACK = '\x1b\x35'; 
    const ALIGN_CENTER = '\x1b\x1d\x61\x01';
    const ALIGN_LEFT = '\x1b\x1d\x61\x00';
    const ALIGN_RIGHT = '\x1b\x1d\x61\x02'; 
    const CUT = '\x1b\x64\x02'; 
    const BIG_FONT = '\x1b\x57\x01\x1b\x68\x01'; 

    const now = new Date();
    const dateStr = formatCloverDate(now);
    const timeStr = now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' }).replace(' PM', 'P').replace(' AM', 'A');
    const displayOrderNum = (tableNumber && tableNumber !== 'To Go') ? tableNumber : "00";
    const typeText = (tableNumber && tableNumber !== 'To Go') ? "Dine In" : "To Go";
    const serverName = employeeName || "Kiosk";

    let buffer = INIT; 
    buffer += ALIGN_CENTER + BLACK + BIG_FONT; 
    buffer += `${title}\n`; 
    buffer += `ORDER: ${displayOrderNum}\n`; 
    buffer += RED + `${typeText}\n`;         
    buffer += ALIGN_LEFT + BLACK; 
    buffer += `${dateStr} ${timeStr}\n`;
    buffer += `Server: ${serverName}\n`;
    buffer += "----------------\n"; 

    items.forEach((item, index) => {
        // ✨ [수정 2] POS Name 우선 적용 (pos_name -> posName -> name 순서)
        const name = item.pos_name || item.posName || item.name;
        
        const qty = item.quantity || 1;
        const displayName = qty > 1 ? `${qty} ${name}` : name;

        buffer += ALIGN_LEFT + BLACK + displayName + "\n";
        
        if (item.notes) {
            buffer += RED + `  * ${item.notes} *\n` + BLACK;
        }
        
        let modifiers = item.selectedModifiers || item.options || item.modifiers || [];

        if (modifiers.length > 0) {
            buffer += ALIGN_RIGHT + RED; 
            modifiers.forEach(mod => {
                let originalName = (typeof mod === 'string') ? mod : (mod.name || mod.label || "Option");
                let modText = originalName;
                if (useAbbreviations === true) {
                    modText = getAbbreviatedMod(originalName);
                }
                buffer += `${modText}\n`; 
            });
            buffer += ALIGN_LEFT + BLACK; 
        }
        if (index < items.length - 1) buffer += "----------------\n";
    });

    buffer += "----------------\n";
    buffer += `ID: ${displayOrderNum}\n`;
    buffer += "\n\n\n" + CUT;
    return buffer;
}

// 🎨 [영수증 디자인]
function generateReceiptBuffer(data) {
    const { items, tableNumber, subtotal, tax, tipAmount, totalAmount, date, orderType, employeeName, paymentMethod } = data;
    const displayOrderNum = (tableNumber && tableNumber !== 'To Go') ? tableNumber : "To Go";
    const displayType = (orderType === 'dine_in') ? "Dine In" : "To Go";
    const serverName = employeeName || "Kiosk";

    const ESC = '\x1b';
    const ALIGN_CENTER = '\x1b\x61\x01';
    const ALIGN_LEFT = '\x1b\x61\x00';
    const ALIGN_RIGHT = '\x1b\x61\x02';
    const BOLD_ON = '\x1b\x45\x01';
    const BOLD_OFF = '\x1b\x45\x00';
    const DOUBLE_HEIGHT = '\x1b\x21\x10';
    const NORMAL = '\x1b\x21\x00';
    const CUT = '\x1d\x56\x42\x00'; 

    let buffer = ESC + '@';
    buffer += ALIGN_CENTER + BOLD_ON + "COLLEGIATE GRILL\n" + BOLD_OFF + NORMAL;
    buffer += "Customer Receipt\n";
    buffer += DOUBLE_HEIGHT + `[ ${displayType} ]\n` + NORMAL; 
    buffer += `Date: ${date}\n`;
    buffer += `Server: ${serverName}\n`;
    buffer += "--------------------------------\n";
    buffer += ALIGN_LEFT + DOUBLE_HEIGHT + BOLD_ON;
    buffer += (displayOrderNum === "To Go") ? "Order Type: To Go\n" : `Order #: ${displayOrderNum}\n`;
    buffer += NORMAL + BOLD_OFF;
    buffer += "--------------------------------\n";

    items.forEach(item => {
        const qty = item.quantity || 1;
        const price = (item.totalPrice || 0).toFixed(2);
        // 영수증은 긴 이름(item.name)이 나와도 상관없으면 그대로, 짧은 거 원하시면 item.pos_name || item.name
        buffer += BOLD_ON + `${qty} ${item.name}` + BOLD_OFF + "\n";
        
        let modifiers = item.selectedModifiers || item.options || item.modifiers || [];
        if (modifiers.length > 0) {
            modifiers.forEach(mod => {
                 let modName = (typeof mod === 'string') ? mod : (mod.name || mod.label);
                 buffer += `   + ${modName} ($${(mod.price || 0).toFixed(2)})\n`;
            });
        }
        buffer += ALIGN_RIGHT + `$${price}\n` + ALIGN_LEFT;
    });

    buffer += "--------------------------------\n" + ALIGN_RIGHT;
    buffer += `Subtotal: $${(subtotal || 0).toFixed(2)}\n`;
    buffer += `Tax: $${(tax || 0).toFixed(2)}\n`;
    if (tipAmount > 0) buffer += BOLD_ON + `Tip: $${tipAmount.toFixed(2)}\n` + BOLD_OFF;
    buffer += "--------------------------------\n";
    buffer += DOUBLE_HEIGHT + BOLD_ON + `TOTAL: $${(totalAmount || 0).toFixed(2)}\n` + NORMAL + BOLD_OFF;
    
    if (paymentMethod) {
        buffer += ALIGN_LEFT + NORMAL + `Payment: ${paymentMethod}\n` + ALIGN_CENTER;
    }

    buffer += ALIGN_CENTER + "\n\nThank You!\n\n\n\n\n" + CUT;
    return buffer;
}

// 🚀 메인 라우트
app.post('/print', async (req, res) => {
    // ✨ [수정 1] printKitchenOnly, printReceiptOnly 플래그 받기
    const { 
        items, tableNumber, totalAmount, orderType, employeeName, paymentMethod,
        printKitchenOnly, printReceiptOnly 
    } = req.body;

    console.log(`🖨️ [Request] Type: ${orderType}, Table: ${tableNumber}, Flags: { K: ${printKitchenOnly}, R: ${printReceiptOnly} }`);

    const milkshakeItems = [];
    const kitchenItems = [];

    if (items) {
        items.forEach(item => {
            // Shake 구분을 위한 로직
            const fullName = (item.name + " " + (item.pos_name || "")).toLowerCase();
            if (fullName.includes('milkshake') || fullName.includes('shake')) {
                milkshakeItems.push(item);
            } else {
                kitchenItems.push(item);
            }
        });
    }

    const printPromises = [];

    // ========================================================
    // 1. 주방 / 쉐이크 프린터 (printReceiptOnly가 아닐 때만 실행)
    // ========================================================
    if (!printReceiptOnly) { 
        if (kitchenItems.length > 0) {
            const buffer = generateKitchenBuffer(kitchenItems, tableNumber, null, "KITCHEN", true, employeeName);
            printPromises.push(sendToNetworkPrinter(KITCHEN_PRINTER_IP, buffer, "Kitchen"));
        }
        if (milkshakeItems.length > 0) {
            const buffer = generateKitchenBuffer(milkshakeItems, tableNumber, null, "MILKSHAKE", true, employeeName);
            printPromises.push(sendToNetworkPrinter(MILKSHAKE_PRINTER_IP, buffer, "Shake"));
        }
    }

    // ========================================================
    // 2. 영수증 프린터 (printKitchenOnly가 아닐 때만 실행)
    // ========================================================
    if (!printKitchenOnly) {
        if (totalAmount !== undefined && totalAmount > 0) {
            const receiptBuffer = generateReceiptBuffer(req.body);
            printPromises.push(sendToNetworkPrinter(RECEIPT_PRINTER_IP, receiptBuffer, "Receipt"));
        }
    }

    try {
        await Promise.all(printPromises);
        res.json({ success: true });
    } catch (e) {
        console.error("Print Error:", e);
        res.status(500).json({ error: e.message });
    }
});

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Printer Server Running on Port ${PORT}`));