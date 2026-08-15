const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const http = require('http');

// שרת אינטרנט מינימלי כדי ש-Render ידע שהאפליקציה פעילה ולא יכשיל את הפריסה
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('WhatsApp Bot is running 24/7!');
}).listen(PORT, () => {
    console.log(`Web server listening on port ${PORT}`);
});

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
});

const SOURCE_GROUP_NAME = 'פינויים מכמש';
const TARGET_GROUP_ALL = 'רפואה בה"ד/בסא"ר- עדכונים';
const TARGET_GROUP_SICKNESS = 'פינויי חטיבה- פיקוד ובטיחות';

const REQUIRED_KEYWORDS = [
    'פורמט פינוי',
    'חבלה/מחלה',
    'שם החניך',
    'פירוט הסיבה',
    'מקום הפינוי'
];

let startTime = Math.floor(Date.now() / 1000);

client.on('qr', qr => {
    console.log('================= סרוק את קוד ה-QR =================');
    qrcode.generate(qr, { small: true });
    console.log('====================================================');
});

client.on('ready', () => {
    startTime = Math.floor(Date.now() / 1000);
    console.log('>>> הבוט מחובר בהצלחה ומאזין להודעות חדשות בזמן אמת! <<<');
});

client.on('message', async msg => {
    try {
        if (msg.timestamp < startTime) return;

        const chat = await msg.getChat();
        if (!chat.isGroup || chat.name !== SOURCE_GROUP_NAME) return;

        const text = msg.body || '';
        const isFormatValid = REQUIRED_KEYWORDS.every(keyword => text.includes(keyword));
        if (!isFormatValid) return;

        const chats = await client.getChats();

        // 1. שליחה מלאה לקבוצת רפואה
        const medGroup = chats.find(c => c.isGroup && c.name === TARGET_GROUP_ALL);
        if (medGroup) {
            await client.sendMessage(medGroup.id._serialized, text);
            console.log(`[V] הועבר בהצלחה ל: ${TARGET_GROUP_ALL}`);
        } else {
            console.error(`[X] לא נמצאה הקבוצה: ${TARGET_GROUP_ALL}`);
        }

        // 2. אם מדובר במחלה - מחיקת פירוט הסיבה ושליחה לקבוצת פיקוד
        const isSickness = /חבלה\/מחלה\s*:\s*מחלה/i.test(text);
        if (isSickness) {
            const modifiedText = text.replace(/פירוט הסיבה:[^\n]*\n?/i, 'פירוט הסיבה:\n');
            const cmdGroup = chats.find(c => c.isGroup && c.name === TARGET_GROUP_SICKNESS);
            if (cmdGroup) {
                await client.sendMessage(cmdGroup.id._serialized, modifiedText);
                console.log(`[V] הועבר ללא פירוט ל: ${TARGET_GROUP_SICKNESS}`);
            } else {
                console.error(`[X] לא נמצאה הקבוצה: ${TARGET_GROUP_SICKNESS}`);
            }
        }
    } catch (err) {
        console.error('שגיאה בעיבוד ההודעה:', err);
    }
});

client.initialize();
