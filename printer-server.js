const express = require('express');
const cors = require('cors');
const net = require('net');

const app = express();
const PORT = 4000;

// ==========================================
// ⚠️ [설정] 프린터 IP
// ==========================================
const KITCHEN_PRINTER_IP   = '192.168.50.3';   // 🍔 주방
const MILKSHAKE_PRINTER_IP = '192.168.50.19';  // 🥤 쉐이크
const RECEIPT_PRINTER_IP   = '192.168.50.201'; // 🧾 영수증

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// ==========================================
// 🟢 [주방 약어 사전]
// ==========================================
const CUSTOM_ABBREVIATIONS = {
    'slaw': 'S', 'onion': 'O', 'mayo': 'M', 'ketchup': 'K', 'mustard': 'MUS',
    'lettuce': 'L', 'tomato': 'T', 'pickles': 'P', 'every': 'EVERY',
    'everything': 'EVERY', 'no bun': 'NO BUN', 'texas toast': 'Texas',
    'bbq sauce': 'BBQ',
    'make a meal - 1/2 onionring+d': 'Meal-1/2 O-Ring',
    'onion ring+soft drink': 'Meal-1/2 O-Ring',
    'make a meal-1/2ff+d': 'Meal-1/2 FF',
    '1/2frenchfries+softdrink': 'Meal-1/2 FF',
    'extra slaw': 'X-Slaw', 'extra lettuce': 'X-L', 'extra tomato': 'X-T',
    'extra pickles': 'X-P', 'add bacon': 'Add BAC', 'add chili': 'Add Chili',
    'add grilled onions': 'Add G-Onion', 'add cheese': 'Add Chese',
    'extra cheese': 'Extra Chese', 'extra patty': 'X-Patty',
    'italian': 'Italian', 'ranch': 'Ranch', 'wheat': 'Wheat',
    'white': 'White', 'malt': 'Malt', 'to go': 'TO GO', 'dine in': 'Dine In'
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
        console.log(`⏳ [${label}] IP 연결 시도 -> ${ip}:9100`);
        const client = new net.Socket();
        client.setTimeout(3000); 
        
        client.connect(9100, ip, () => {
            console.log(`⚡ [${label}] 연결 성공! 데이터 전송 중...`);
            client.write(Buffer.from(buffer));
            client.end();
        });
        
        client.on('close', () => { console.log(`✅ [${label}] 전송 완료 & 연결 종료`); resolve(); });
        client.on('error', (err) => { console.error(`⚠️ [${label}] 연결 실패(에러): ${err.message}`); client.destroy(); resolve(); });
        client.on('timeout', () => { console.error(`⚠️ [${label}] 타임아웃(응답없음)`); client.destroy(); resolve(); });
    });
}

function generateKitchenBuffer(items, tableNumber, orderId, title, useAbbreviations, employeeName) {
    const INIT = '\x1b\x40'; const RED = '\x1b\x34'; const BLACK = '\x1b\x35'; 
    const ALIGN_CENTER = '\x1b\x1d\x61\x01'; const ALIGN_LEFT = '\x1b\x1d\x61\x00';
    const ALIGN_RIGHT = '\x1b\x1d\x61\x02'; const CUT = '\x1b\x64\x02'; 
    const BIG_FONT = '\x1b\x57\x01\x1b\x68\x01'; 

    const now = new Date();
    const dateStr = formatCloverDate(now);
    const timeStr = now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' }).replace(' PM', 'P').replace(' AM', 'A');
    const displayOrderNum = (tableNumber && tableNumber !== 'To Go') ? tableNumber : "00";
    const typeText = (tableNumber && tableNumber !== 'To Go') ? "Dine In" : "To Go";
    const serverName = employeeName || "Kiosk";

    let buffer = INIT + ALIGN_CENTER + BLACK + BIG_FONT; 
    buffer += `${title}\nORDER: ${displayOrderNum}\n` + RED + `${typeText}\n`;
    buffer += ALIGN_LEFT + BLACK + `${dateStr} ${timeStr}\nServer: ${serverName}\n----------------\n`; 

    items.forEach((item, index) => {
        const name = item.posName || item.pos_name || item.name || 'Unknown';
        const qty = item.quantity || 1;
        const displayName = qty > 1 ? `${qty} ${name}` : name;
        buffer += ALIGN_LEFT + BLACK + displayName + "\n";
        if (item.notes) buffer += RED + `  * ${item.notes} *\n` + BLACK;
        
        let modifiers = item.selectedModifiers || item.options || item.modifiers || [];
        if (modifiers.length > 0) {
            buffer += ALIGN_RIGHT + RED; 
            modifiers.forEach(mod => {
                let originalName = (typeof mod === 'string') ? mod : (mod.name || mod.label || "Option");
                let modText = useAbbreviations ? getAbbreviatedMod(originalName) : originalName;
                buffer += `${modText}\n`; 
            });
            buffer += ALIGN_LEFT + BLACK; 
        }
        if (index < items.length - 1) buffer += "----------------\n";
    });
    buffer += "----------------\nID: " + displayOrderNum + "\n\n\n" + CUT;
    return buffer;
}

function generateReceiptBuffer(data) {
    const { items, tableNumber, subtotal, tax, tipAmount, totalAmount, date, orderType, employeeName, paymentMethod } = data;
    const displayOrderNum = (tableNumber && tableNumber !== 'To Go') ? tableNumber : "To Go";
    const displayType = (orderType === 'dine_in') ? "Dine In" : "To Go";
    const serverName = employeeName || "Kiosk"; 

    const ESC = '\x1b'; const ALIGN_CENTER = '\x1b\x61\x01'; const ALIGN_LEFT = '\x1b\x61\x00';
    const ALIGN_RIGHT = '\x1b\x61\x02'; const BOLD_ON = '\x1b\x45\x01'; const BOLD_OFF = '\x1b\x45\x00';
    const DOUBLE_HEIGHT = '\x1b\x21\x10'; const NORMAL = '\x1b\x21\x00'; const CUT = '\x1d\x56\x42\x00'; 

    let buffer = ESC + '@' + ALIGN_CENTER + BOLD_ON + "COLLEGIATE GRILL\n" + BOLD_OFF + NORMAL;
    buffer += "Customer Receipt\n" + DOUBLE_HEIGHT + `[ ${displayType} ]\n` + NORMAL; 
    buffer += `Date: ${date}\nServer: ${serverName}\n--------------------------------\n`;
    buffer += ALIGN_LEFT + DOUBLE_HEIGHT + BOLD_ON;
    buffer += (displayOrderNum === "To Go") ? "Order Type: To Go\n" : `Order #: ${displayOrderNum}\n`;
    buffer += NORMAL + BOLD_OFF + "--------------------------------\n";

    items.forEach(item => {
        const qty = item.quantity || 1;
        const price = (item.totalPrice || 0).toFixed(2);
        const name = item.posName || item.pos_name || item.name || 'Unknown';
        
        buffer += BOLD_ON + `${qty} ${name}` + BOLD_OFF + "\n";
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
    buffer += `Subtotal: $${(subtotal || 0).toFixed(2)}\nTax: $${(tax || 0).toFixed(2)}\n`;
    if (tipAmount > 0) buffer += BOLD_ON + `Tip: $${tipAmount.toFixed(2)}\n` + BOLD_OFF;
    buffer += "--------------------------------\n";
    buffer += DOUBLE_HEIGHT + BOLD_ON + `TOTAL: $${(totalAmount || 0).toFixed(2)}\n` + NORMAL + BOLD_OFF;
    if (paymentMethod) buffer += ALIGN_LEFT + NORMAL + `Payment: ${paymentMethod}\n` + ALIGN_CENTER;
    buffer += ALIGN_CENTER + "\n\nThank You!\n\n\n\n\n" + CUT;
    return buffer;
}

app.post('/print', async (req, res) => {
    try {
        console.log("------------------------------------------------");
        console.log(`📩 [인쇄 요청] 주문번호: ${req.body.tableNumber || 'Unknown'}`); 
        
        const { 
            items, tableNumber, totalAmount, orderType, employeeName, paymentMethod,
            printKitchen, printReceipt
        } = req.body;

        const milkshakeItems = [];
        const kitchenItems = [];

        if (items) {
            items.forEach(item => {
                const nameToCheck = (item.posName || item.pos_name || item.name || "").toLowerCase();
                if (nameToCheck.includes('milkshake') || nameToCheck.includes('shake')) {
                    milkshakeItems.push(item);
                } else {
                    kitchenItems.push(item);
                }
            });
        }

        const printPromises = [];

        if (printKitchen) {
            if (kitchenItems.length > 0) {
                console.log("🍔 주방 프린터로 전송 중...");
                const buffer = generateKitchenBuffer(kitchenItems, tableNumber, null, "KITCHEN", true, employeeName);
                printPromises.push(sendToNetworkPrinter(KITCHEN_PRINTER_IP, buffer, "Kitchen"));
            }
            if (milkshakeItems.length > 0) {
                console.log("🥤 쉐이크 프린터로 전송 중...");
                const buffer = generateKitchenBuffer(milkshakeItems, tableNumber, null, "MILKSHAKE", true, employeeName);
                printPromises.push(sendToNetworkPrinter(MILKSHAKE_PRINTER_IP, buffer, "Shake"));
            }
        }

        if (printReceipt && totalAmount !== undefined) {
            console.log("🧾 영수증 프린터로 전송 중...");
            const receiptBuffer = generateReceiptBuffer(req.body);
            printPromises.push(sendToNetworkPrinter(RECEIPT_PRINTER_IP, receiptBuffer, "Receipt"));
        }

        await Promise.all(printPromises);
        console.log("✅ 모든 인쇄 작업 완료");
        console.log("------------------------------------------------");
        res.json({ success: true, message: 'Processed successfully' });

    } catch (e) {
        console.error("❌ Print Server Error:", e.message);
        res.json({ success: true, message: 'Error handled', error: e.message });
    }
});

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Printer Server Running on Port ${PORT}`));