/// ==================================================================
// ⚡ 1. INITIALISATION & ANTI-SLEEP (OPTIMISATION RENDER)
// ==================================================================
const { execSync } = require('child_process');
const fs = require('fs');

const pkgs = ['discord.js', 'axios', 'express', 'dotenv', 'tesseract.js', 'puppeteer']; 
pkgs.forEach(p => { try { require.resolve(p); } catch(e) { execSync(`npm install ${p} --no-audit --no-fund`); }});

require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Partials } = require('discord.js');
const axios = require('axios');
const express = require('express');
const crypto = require('crypto');
const Tesseract = require('tesseract.js');
const puppeteer = require('puppeteer');

const app = express();
const port = process.env.PORT || 3000;
const scriptsCache = new Map();
const quizDataState = new Map();

// --- SYSTÈME ANTI-SOMMEIL H24 ---
const SERVICE_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`;
setInterval(async () => {
    try { 
        await axios.get(SERVICE_URL); 
        console.log("📡 [KEEP-ALIVE] Ping envoyé pour maintenir le service actif.");
    } catch(e) { console.log("⚠️ [KEEP-ALIVE] Échec du ping (Serveur hors ligne ?)"); }
}, 300000); // Toutes les 5 minutes

// ==================================================================
// ⚡ 2. LOGIQUE BOT JOINER & RESOLVER PIN
// ==================================================================
async function startBotJoiner(pin, baseName, count) {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--single-process']
    });

    for (let i = 0; i < Math.min(count, 12); i++) {
        const page = await browser.newPage();
        try {
            await page.setRequestInterception(true);
            page.on('request', r => ['image', 'font', 'media'].includes(r.resourceType()) ? r.abort() : r.continue());

            await page.goto('https://kahoot.it/', { waitUntil: 'networkidle0' });
            await page.type('input[name="gameId"]', pin.toString());
            await page.keyboard.press('Enter');

            await page.waitForSelector('input[name="nickname"]', { timeout: 8000 });
            await page.type('input[name="nickname"]', `${baseName}_${i + 1}`);
            await page.keyboard.press('Enter');

            await page.waitForFunction(() => window.location.pathname.includes('/instructions'), { timeout: 5000 });
            console.log(`🤖 Bot ${i + 1} a rejoint.`);
        } catch (e) { 
            console.log(`❌ Bot ${i + 1} échec.`);
            await page.close();
        }
    }
    setTimeout(() => browser.close(), 600000);
}

// Récupérer l'UUID du quiz via le PIN
async function getUuidFromPin(pin) {
    try {
        const response = await axios.get(`https://kahoot.it/reserve/session/${pin}/?${Date.now()}`);
        // Le header 'x-kahoot-id' contient parfois l'UUID directement
        // Sinon, il faut "peek" via une connection socket (non implémenté ici pour stabilité RAM)
        // Alternative : Utilisation d'un moteur de recherche pour retrouver le quiz public par titre si possible
        return response.headers['x-kahoot-quizid'] || null;
    } catch (e) {
        return null;
    }
}

// ==================================================================
// ⚡ 3. DESIGN RENDER & GÉNÉRATEUR PAYLOAD
// ==================================================================
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8"><title>KAHOOT HACK // STATUS</title>
        <style>
            body { background: #020617; color: #fff; font-family: 'Inter', sans-serif; height: 100vh; display: flex; align-items: center; justify-content: center; margin: 0; }
            .box { border: 2px solid #3b82f6; background: rgba(30, 58, 138, 0.1); padding: 50px; border-radius: 30px; text-align: center; box-shadow: 0 0 50px #3b82f633; backdrop-filter: blur(10px); }
            h1 { font-size: 3rem; background: linear-gradient(90deg, #8b5cf6, #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0; font-weight: 900; }
            .status { margin-top: 20px; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; gap: 10px; font-weight: 600; color: #60a5fa; }
            .dot { width: 12px; height: 12px; background: #10b981; border-radius: 50%; box-shadow: 0 0 10px #10b981; animation: pulse 1.5s infinite; }
            @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.2); } }
            p { color: #475569; font-size: 0.8rem; margin-top: 30px; letter-spacing: 1px; }
        </style>
    </head>
    <body>
        <div class="box">
            <h1>KAHOOT HACK</h1>
            <div class="status"><div class="dot"></div> UNITÉ ACTIVE</div>
            <p>RENDER CLOUD // ANTI-SLEEP ACTIF</p>
        </div>
    </body>
    </html>
    `);
});

app.get('/copy/:id', (req, res) => {
    const entry = scriptsCache.get(req.params.id);
    if (!entry) return res.status(404).send("SESSION EXPIRED");
    const loader = `eval(decodeURIComponent(escape(window.atob('${Buffer.from(generatePayload(entry.data)).toString('base64')}'))))`;
    res.send(`
        <body style="background:#020617;color:#fff;padding:50px;text-align:center;font-family:sans-serif;">
            <h2 style="color:#8b5cf6">TERMINAL D'INJECTION</h2>
            <p style="color:#64748b">Cliquez pour copier le script du quiz : <b>\${entry.title}</b></p>
            <button onclick="copy()" id="b" style="padding:15px 30px;background:#8b5cf6;color:#fff;border:none;border-radius:12px;cursor:pointer;font-weight:bold;font-size:16px;">COPIER LE SCRIPT</button>
            <script>
                function copy(){
                    const t=document.createElement('textarea');
                    t.value=\`${loader}\`;
                    document.body.appendChild(t); t.select(); document.execCommand('copy'); document.body.removeChild(t);
                    document.getElementById('b').innerText="SCRIPT COPIÉ !";
                    document.getElementById('b').style.background="#10b981";
                }
            </script>
        </body>`);
});

function generatePayload(quizData) {
    const json = JSON.stringify(quizData);
    return `
    (function() {
        // Fix Amplitude Error
        window.Amplitude = { init:()=>{}, identify:()=>{}, logEvent:()=>{} };
        window.Sentry = { init:()=>{} };

        const _db = ${json};
        const _st = { auto: false, dockOp: 0.8 };

        const rootWrap = document.createElement('div');
        rootWrap.id = 'kh-hack-' + Date.now();
        Object.assign(rootWrap.style, { position:'fixed', top:0, left:0, zIndex:2147483647, pointerEvents:'none' });
        const root = rootWrap.attachShadow({mode:'open'});
        document.body.appendChild(rootWrap);

        const style = document.createElement('style');
        style.textContent = \`
            .ui { pointer-events: auto; position: fixed; top: 20px; right: 20px; width: 280px; background: rgba(10, 10, 25, 0.98); border: 2px solid #3b82f6; border-radius: 20px; color: #fff; padding: 20px; backdrop-filter: blur(10px); box-shadow: 0 10px 40px rgba(0,0,0,0.8); transition: 0.3s; font-family: sans-serif; }
            .ui.hide { transform: translateX(400px); opacity: 0; }
            .header { border-bottom: 1px solid #1e293b; padding-bottom: 10px; margin-bottom: 15px; cursor: move; display: flex; justify-content: space-between; align-items: center; }
            .header h1 { font-size: 13px; margin: 0; color: #3b82f6; letter-spacing: 1px; }
            .row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-size: 11px; font-weight: bold; }
            .btn { background: #1e293b; border: 1px solid #334155; color: #fff; padding: 6px 10px; border-radius: 8px; cursor: pointer; transition: 0.2s; font-size: 10px; }
            .btn.active { background: #2563eb; border-color: #60a5fa; }
            input[type=range] { width: 80px; accent-color: #3b82f6; cursor: pointer; }
            .dock { pointer-events: auto; position: fixed; bottom: 20px; left: 20px; width: 42px; height: 42px; background: #3b82f6; border-radius: 12px; display: none; flex-direction: row; align-items: center; justify-content: center; gap: 4px; border: 2px solid rgba(255,255,255,0.2); cursor: pointer; box-shadow: 0 5px 15px rgba(0,0,0,0.3); transition: 0.2s; }
            .dock span { width: 3px; height: 20px; background: #fff; border-radius: 2px; }
            .dock.show { display: flex; }
            .btn-dest { color: #ef4444; border-color: #ef444455; width: 100%; margin-top: 10px; }
        \`;
        root.appendChild(style);

        const ui = document.createElement('div');
        ui.className = 'ui';
        ui.innerHTML = \`
            <div class="header" id="drag"><h1>KAHOOT HACK ELITE</h1><button class="btn" id="minBtn">MINIMIZE</button></div>
            <div class="row"><span>AUTO-RÉPONSE</span><button class="btn" id="autoBtn">OFF</button></div>
            <div class="row"><span>OPACITÉ RAPPEL</span><input type="range" id="opRange" min="5" max="100" value="80"></div>
            <button class="btn btn-dest" id="destBtn">DESTROY SCRIPT</button>
        \`;
        root.appendChild(ui);

        const dock = document.createElement('div');
        dock.className = 'dock';
        dock.innerHTML = '<span></span><span></span><span></span>';
        root.appendChild(dock);

        const forceClick = (el) => {
            const evts = ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click'];
            evts.forEach(n => el.dispatchEvent(new PointerEvent(n, { bubbles:true, cancelable:true, view:window, isPrimary:true })));
        };

        root.querySelector('#autoBtn').onclick = function() { _st.auto = !_st.auto; this.innerText = _st.auto ? "ON" : "OFF"; this.classList.toggle('active'); };
        root.querySelector('#minBtn').onclick = () => { ui.classList.add('hide'); dock.classList.add('show'); };
        dock.onclick = () => { ui.classList.remove('hide'); dock.classList.remove('show'); };
        root.querySelector('#opRange').oninput = (e) => { _st.dockOp = e.target.value / 100; dock.style.opacity = _st.dockOp; };
        root.querySelector('#destBtn').onclick = () => { if(confirm("Détruire toute trace ?")) rootWrap.remove(); };

        setInterval(() => {
            if(!_st.auto) return;
            const bt = document.body.innerText.toLowerCase();
            const q = _db.find(x => bt.includes(x.q));
            if(q) {
                document.querySelectorAll('button, [role="button"], [data-functional-selector="answer"]').forEach(b => {
                    if(b.dataset.rx) return;
                    const txt = b.innerText.toLowerCase().trim();
                    const isTF = (q.a === 'true' && (txt === 'vrai' || txt === 'true')) || (q.a === 'false' && (txt === 'faux' || txt === 'false'));
                    if(txt && (txt === q.a || txt.includes(q.a) || isTF)) {
                        b.dataset.rx = "1";
                        b.style.border = "4px solid #3b82f6";
                        setTimeout(() => forceClick(b), 500);
                    }
                });
            }
        }, 600);
    })();
    `;
}

// ==================================================================
// ⚡ 4. DISCORD BOT & COMMANDES
// ==================================================================
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const commands = [
    new SlashCommandBuilder().setName('kahoot').setDescription('Kahoot Hack Pro Elite')
        .addSubcommand(s => s.setName('inject').setDescription('Injection via UUID').addStringOption(o=>o.setName('uuid').setDescription('UUID du quiz').setRequired(true)))
        .addSubcommand(s => s.setName('solve').setDescription('Résoudre via PIN').addStringOption(o=>o.setName('pin').setDescription('PIN du jeu').setRequired(true)))
        .addSubcommand(s => s.setName('bots').setDescription('Lancer des bots')
            .addStringOption(o=>o.setName('pin').setDescription('PIN').setRequired(true))
            .addStringOption(o=>o.setName('name').setDescription('Pseudo').setRequired(true))
            .addIntegerOption(o=>o.setName('nombre').setDescription('Quantité')))
        .addSubcommand(s => s.setName('ping').setDescription('État du bot'))
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
(async () => { try { await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands }); } catch(e){} })();

async function processQuiz(uuid, it, isInteraction = true) {
    try {
        const res = await axios.get(`https://play.kahoot.it/rest/kahoots/${uuid}`);
        const sid = crypto.randomUUID();
        scriptsCache.set(sid, { 
            data: res.data.questions.map(q => ({
                q: q.question ? q.question.replace(/<[^>]*>/g,'').toLowerCase().substring(0,50) : "img",
                a: q.choices ? q.choices.find(c => c.correct).answer.replace(/<[^>]*>/g,'').toLowerCase().trim() : ""
            })),
            title: res.data.title 
        });
        const url = `${SERVICE_URL}/copy/${sid}`;
        const msg = { content: `✅ **Quiz trouvé :** \`${res.data.title}\`\n[ACCÉDER AU TERMINAL D'INJECTION](${url})` };
        isInteraction ? await it.editReply(msg) : await it.reply(msg);
    } catch(e) { isInteraction ? await it.editReply("❌ Quiz introuvable.") : await it.reply("❌ Quiz introuvable."); }
}

client.on('interactionCreate', async it => {
    if (!it.isChatInputCommand()) return;
    const sub = it.options.getSubcommand();

    if (sub === 'ping') {
        const embed = new EmbedBuilder().setColor(0x3b82f6).setTitle("📡 ÉTAT DU SYSTÈME")
            .addFields({ name: "RÉSEAU", value: `\`${client.ws.ping}ms\``, inline: true }, { name: "STATUT", value: "🟢 OPÉRATIONNEL", inline: true });
        it.reply({ embeds: [embed] });
    }

    if (sub === 'inject') {
        await it.deferReply({ ephemeral: true });
        await processQuiz(it.options.getString('uuid'), it);
    }

    if (sub === 'solve') {
        await it.deferReply({ ephemeral: true });
        const pin = it.options.getString('pin');
        const uuid = await getUuidFromPin(pin);
        if (uuid) await processQuiz(uuid, it);
        else await it.editReply("❌ Impossible de trouver l'identifiant du quiz via ce PIN. Le quiz est peut-être privé ou protégé.");
    }

    if (sub === 'bots') {
        const pin = it.options.getString('pin');
        const name = it.options.getString('name');
        const count = it.options.getInteger('nombre') || 5;
        it.reply({ content: `🤖 Tentative d'injection de ${count} bots sur ${pin}...`, ephemeral: true });
        startBotJoiner(pin, name, count);
    }
});

app.listen(port, () => console.log(`🌍 SERVER ACTIVE SUR PORT : ${port}`));
client.login(process.env.DISCORD_TOKEN);

