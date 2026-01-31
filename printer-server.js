const express = require('express');
const cors = require('cors');
const net = require('net');

const app = express();
const PORT = 4000; // 프린터 서버 포트

// ... (기존 설정 변수들: PRINTER_IP, CUSTOM_ABBREVIATIONS 등 그대로 유지) ...
// ... (이전에 드린 코드와 동일합니다) ...

// 핵심: 모든 IP에서 접속 허용 (192.168.50.106 포함)
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Printer Server Running on Port ${PORT}`));