const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const net = require('net');
const { JsonDB, Config } = require('node-json-db');

const app = express();
const PORT = 4000;

// 📁 설정 파일 경로 (절대 경로로 지정하여 오류 방지)
const dbPath = path.join(__dirname, "config.json");
const db = new JsonDB(new Config(dbPath, true, true, '/'));

// 🚀 DB 초기화 (안전 모드)
async function initDB() {
    // 1. 파일이 아예 없으면 -> Node.js가 직접 완벽한 파일을 만듭니다 (에러 원천 차단)
    if (!fs.existsSync(dbPath)) {
        console.log("🆕 설정 파일이 없어 새로 생성합니다. (Safe Mode)");
        
        const initialData = {
            settings: {
                printers: {
                    kitchen1_ip: "192.168.50.3",
                    kitchen2_ip: "192.168.50.19",
                    receipt_ip: "192.168.50.201"
                },
                design: {
                    title: "THE COLLEGIATE GRILL",
                    footer: "Thank You!",
                    show_date: true
                },
                abbreviations: {
                    'slaw': 'S',
                    'onion': 'O',
                    'mayo': 'Mayo',
                    'ketchup': 'K',
                    'mustard': 'M',
                    'lettuce': 'L',
                    'tomato': 'T',
                    'pickles': 'P',
                    'every': 'EVERY',
                    'everything': 'EVERY',
                    'no bun': 'NO BUN',
                    'texas toast': 'Texas',
                    'bbq sauce': 'BBQ',
                    'make a meal - 1/2 onionring+d': 'Meal-1/2 O-Ring',
                    'onion ring+soft drink': 'Meal-1/2 O-Ring',
                    'make a meal-1/2ff+d': 'Meal-1/2 FF',
                    '1/2frenchfries+softdrink': 'Meal-1/2 FF',
                    'extra slaw': 'X-Slaw',
                    'extra lettuce': 'X-L',
                    'extra tomato': 'X-T',
                    'extra pickles': 'X-P',
                    'add bacon': 'Add BAC',
                    'add chili': 'Add Chili',
                    'add grilled onions': 'Add G-Onion',
                    'add cheese': 'Add Chese',
                    'extra cheese': 'Extra Chese',
                    'extra patty': 'X-Patty',
                    'italian': 'Italian',
                    'ranch': 'Ranch',
                    'wheat': 'Wheat',
                    'white': 'White',
                    'malt': 'Malt',
                    'to go': 'TO GO',
                    'dine in': 'HERE'
                }
            }
        };

        // 강제 저장 (UTF-8)
        fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 4), 'utf-8');
    }

    // 2. 이제 파일을 읽습니다.
    try {
        await db.getData("/settings");
        console.log("💾 설정을 정상적으로 불러왔습니다.");
    } catch (error) {
        console.error("🔥 DB 로딩 실패 (파일이 깨졌을 수 있음):", error);
    }
}
initDB();

app.use(cors());
app.use(express.json());

// 🛡️ 보안 헤더
app.use((req, res, next) => {
    res.setHeader("Content-Security-Policy", "default-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src *;");
    next();
});

// 📂 Admin 페이지 제공
app.use(express.static('public'));
app.get('/admin', (req, res) => {
    const adminPath = path.join(__dirname, 'public', 'index.html');
    if (fs.existsSync(adminPath)) {
        res.sendFile(adminPath);
    } else {
        res.send("<h1>Admin Page</h1><p>public/index.html 파일을 찾을 수 없습니다.</p>");
    }
});

// ==========================================
// ⚙️ API 라우트
// ==========================================
app.get('/api/settings', async (req, res) => {
    try {
        const data = await db.getData("/settings");
        res.json(data);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/settings', async (req, res) => {
    try {
        await db.push("/settings", req.body);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==========================================
// 🖨️ 프린터 제어 함수들
// ==========================================

async function getAbbreviatedMod(name) {
    if (!name) return '';
    try {
        const settings = await db.getData("/settings");
        const dict = settings.abbreviations || {};
        let modName = name.trim();
        const lowerName = modName.toLowerCase();
        
        if (dict[lowerName]) return dict[lowerName];
        
        let prefix = "";
        if (lowerName.startsWith("no ")) { prefix = "NO "; modName = modName.substring(3).trim(); }
        else if (lowerName.startsWith("add ")) { prefix = "ADD "; modName = modName.substring(4).trim(); }
        
        return prefix + modName.charAt(0).toUpperCase() + modName.slice(1);
    } catch (e) {
        return name;
    }
}

function formatCloverDate(dateObj) {
    const day = dateObj.getDate().toString().padStart(2, '0');
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${day}-${monthNames[dateObj.getMonth()]}-${dateObj.getFullYear()}`;
}

function sendToNetworkPrinter(ip, bufferString, label) {
    return new Promise((resolve) => {
        if (!ip || ip === "0.0.0.0") { 
            console.log(`⚠️ [${label}] IP 미설정`);
            resolve(); return; 
        }
        
        console.log(`⏳ [${label}] 전송 시도 -> ${ip}:9100`);
        const client = new net.Socket();
        client.setTimeout(4000);
        
        // Binary로 변환하여 전송
        const dataBuffer = Buffer.from(bufferString, 'binary');

        client.connect(9100, ip, () => {
            client.write(dataBuffer);
            client.end();
        });

        client.on('close', () => { console.log(`✅ [${label}] 출력 완료`); resolve(); });
        client.on('error', (err) => { 
            console.error(`❌ [${label}] 실패: ${err.message}`); 
            client.destroy(); 
            resolve(); 
        });
        client.on('timeout', () => { 
            console.error(`❌ [${label}] 타임아웃`); 
            client.destroy(); 
            resolve(); 
        });
    });
}

function openCashDrawer(ip, port = 9100) {
    return new Promise((resolve) => {
        if (!ip) return resolve(false); 
        const client = new net.Socket();
        client.setTimeout(3000);
        client.connect(port, ip, () => {
            const openCommand = Buffer.from([0x1B, 0x70, 0x00, 0x19, 0x78]);
            client.write(openCommand, () => {
                client.end();
                resolve(true);
            });
        });
        client.on('error', () => { client.destroy(); resolve(false); });
        client.on('timeout', () => { client.destroy(); resolve(false); });
    });
}

async function generateKitchenBuffer(items, tableNumber, title) {
    const settings = await db.getData("/settings");
    const INIT = '\x1b\x40'; const RED = '\x1b\x34'; const BLACK = '\x1b\x35';
    const ALIGN_CENTER = '\x1b\x1d\x61\x01'; const ALIGN_LEFT = '\x1b\x1d\x61\x00'; const ALIGN_RIGHT = '\x1b\x1d\x61\x02';
    const CUT = '\x1b\x64\x02'; const BIG_FONT = '\x1b\x57\x01\x1b\x68\x01';

    const now = new Date();
    const dateStr = formatCloverDate(now);
    const timeStr = now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' }).replace(' PM', 'P').replace(' AM', 'A');
    const displayOrderNum = (tableNumber && tableNumber !== 'To Go') ? tableNumber : "00";
    const typeText = (tableNumber && tableNumber !== 'To Go') ? "Dine In" : "To Go";

    let buffer = INIT + ALIGN_CENTER + BLACK + BIG_FONT + `${title}\n` + `ORDER: ${displayOrderNum}\n` + RED + `${typeText}\n` + ALIGN_LEFT + BLACK + `${dateStr} ${timeStr}\nServer: Kiosk\n----------------\n`;

    for (const item of items) {
        const qty = item.quantity || 1;
        const name = item.pos_name || item.name;
        const displayName = qty > 1 ? `${qty} ${name}` : name;
        buffer += ALIGN_LEFT + BLACK + displayName + "\n";
        
        let modifiers = item.selectedModifiers || item.options || item.modifiers || [];
        if (modifiers.length > 0) {
            buffer += ALIGN_RIGHT + RED;
            for (const mod of modifiers) {
                let originalName = (typeof mod === 'string') ? mod : (mod.name || mod.label);
                buffer += `${await getAbbreviatedMod(originalName)}\n`;
            }
            buffer += ALIGN_LEFT + BLACK;
        }
    }
    buffer += "----------------\n" + `ID: ${displayOrderNum}\n` + "\n\n\n" + CUT;
    return buffer;
}

async function generateReceiptBuffer(data) {
    const settings = await db.getData("/settings");
    const { items, tableNumber, subtotal, tax, tipAmount, totalAmount, date, orderType } = data;
    const displayOrderNum = (tableNumber && tableNumber !== 'To Go') ? tableNumber : "To Go";
    const displayType = (orderType === 'dine_in') ? "Dine In" : "To Go";

    const ESC = '\x1b'; const ALIGN_CENTER = '\x1b\x61\x01'; const ALIGN_LEFT = '\x1b\x61\x00'; const ALIGN_RIGHT = '\x1b\x61\x02'; 
    const BOLD_ON = '\x1b\x45\x01'; const BOLD_OFF = '\x1b\x45\x00'; 
    const DOUBLE_HEIGHT = '\x1b\x21\x10'; const NORMAL = '\x1b\x21\x00'; 
    const CUT = '\x1d\x56\x42\x00';

    let buffer = ESC + '@' + ALIGN_CENTER + BOLD_ON + `${settings.design.title}\n` + BOLD_OFF + NORMAL + "Customer Receipt\n" + DOUBLE_HEIGHT + `[ ${displayType} ]\n` + NORMAL + `Date: ${date}\n--------------------------------\n` + ALIGN_LEFT + DOUBLE_HEIGHT + BOLD_ON + (displayOrderNum === "To Go" ? "Order Type: To Go\n" : `Order #: ${displayOrderNum}\n`) + NORMAL + BOLD_OFF + "--------------------------------\n";

    items.forEach(item => {
        const qty = item.quantity || 1;
        const price = (item.totalPrice || 0).toFixed(2);
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

    buffer += "--------------------------------\n" + ALIGN_RIGHT + `Subtotal: $${(subtotal || 0).toFixed(2)}\n` + `Tax: $${(tax || 0).toFixed(2)}\n`;
    if (tipAmount > 0) buffer += BOLD_ON + `Tip: $${tipAmount.toFixed(2)}\n` + BOLD_OFF;
    buffer += "--------------------------------\n" + DOUBLE_HEIGHT + BOLD_ON + `TOTAL: $${(totalAmount || 0).toFixed(2)}\n` + NORMAL + BOLD_OFF + ALIGN_CENTER + `\n\n${settings.design.footer}\n\n\n\n\n` + CUT;
    return buffer;
}

// ==========================================
// 🚀 라우트
// ==========================================
app.post('/api/test-printer', async (req, res) => {
    const { ip } = req.body; 
    if (!ip) return res.status(400).json({ success: false, message: "IP Required" });
    try {
        const INIT = '\x1b\x40';
        const TEXT = 'Connection OK!\nTest Print Successful.\n\n\n';
        const CUT = '\x1d\x56\x42\x00';
        await sendToNetworkPrinter(ip, INIT + TEXT + CUT, "TEST-PRINT");
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.post('/api/printer/open-drawer', async (req, res) => {
    const { printerIp } = req.body; 
    if (!printerIp) return res.status(400).json({ success: false, message: 'Printer IP Required' });
    try {
        await openCashDrawer(printerIp);
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

app.post('/print', async (req, res) => {
    try {
        const settings = await db.getData("/settings");
        const { items, totalAmount, tableNumber } = req.body;
        console.log(`🖨️ [주문 접수] Table: ${tableNumber}`);

        const milkshakeItems = [], kitchenItems = [];
        if (items) {
            items.forEach(item => {
                const fullName = (item.name + " " + (item.pos_name || "")).toLowerCase();
                if (fullName.includes('milkshake') || fullName.includes('shake')) milkshakeItems.push(item);
                else kitchenItems.push(item);
            });
        }

        const promises = [];
        if (kitchenItems.length > 0) promises.push(sendToNetworkPrinter(settings.printers.kitchen1_ip, await generateKitchenBuffer(kitchenItems, tableNumber, "KITCHEN"), "Kitchen 1"));
        if (milkshakeItems.length > 0) promises.push(sendToNetworkPrinter(settings.printers.kitchen2_ip, await generateKitchenBuffer(milkshakeItems, tableNumber, "MILKSHAKE"), "Kitchen 2"));
        if (totalAmount > 0) promises.push(sendToNetworkPrinter(settings.printers.receipt_ip, await generateReceiptBuffer(req.body), "Receipt"));

        await Promise.all(promises);
        res.json({ success: true });
    } catch (e) {
        console.error("Print Error:", e);
        res.status(500).json({ error: e.message });
    }
});

app.listen(PORT, () => console.log(`🚀 Printer Server Running on Port ${PORT}`));

