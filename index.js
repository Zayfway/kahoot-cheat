/**
 * ⚡ KAHOOT HACK ELITE V4 - FINAL STABLE
 * Author: Boss & AI
 * Features: Ghost Resolver, Safe OCR (/tmp fix), Live Logs, Anti-Crash
 */

require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const cors = require('cors');
const Kahoot = require('kahoot.js-updated');
const Tesseract = require('tesseract.js');
const si = require('systeminformation');
const path = require('path');

// --- SYSTÈME DE LOGS EN MÉMOIRE (Circular Buffer) ---
const MAX_LOGS = 60;
const logBuffer = [];

function pushLog(type, args) {
    const timestamp = new Date().toLocaleTimeString('fr-FR');
    // Conversion propre des objets/erreurs en string
    const message = args.map(a => {
        if (a instanceof Error) return `${a.message}\n${a.stack}`;
        if (typeof a === 'object') return JSON.stringify(a);
        return a;
    }).join(' ');
    
    const entry = `[${timestamp}] [${type}] ${message}`;
    logBuffer.push(entry);
    if (logBuffer.length > MAX_LOGS) logBuffer.shift();
    
    // Affichage réel console pour Render Dashboard
    if(type === 'ERR ') console.error(`[${type}]`, ...args);
    else console.log(`[${type}]`, ...args);
}

// Override console
console.log = (...args) => pushLog('INFO', args);
console.error = (...args) => pushLog('ERR ', args);

// --- ANTI-CRASH SYSTEM (GLOBAL HANDLERS) ---
process.on('uncaughtException', (err) => {
    console.error("🔥 CRITICAL UNCAUGHT ERROR:", err);
    // On ne quitte PAS le processus, on le garde en vie
});
process.on('unhandledRejection', (reason, promise) => {
    console.error("🔥 UNHANDLED PROMISE:", reason);
});

// --- CONFIGURATION ---
const PORT = process.env.PORT || 3000;
const app = express();
app.use(cors());
app.use(express.json());

// --- ETAT GLOBAL ---
const activeRaids = new Map();

// ==================================================================
// 1. MOTEUR "GHOST RESOLVER" (WS Optimized)
// ==================================================================
async function resolvePinToUUID(pin) {
    return new Promise((resolve) => {
        const client = new Kahoot();
        let resolved = false;

        const cleanup = () => { if (client.socket) client.leave(); };
        const to = setTimeout(() => { if (!resolved) { cleanup(); resolve(null); } }, 6000);

        client.on("Joined", () => {
            resolved = true;
            clearTimeout(to);
            const data = {
                uuid: client.quiz ? client.quiz.uuid : null,
                title: client.quiz ? client.quiz.name : "Inconnu",
                type: client.quiz ? client.quiz.type : "quiz"
            };
            console.log(`🕵️ [GHOST] Extraction PIN ${pin} -> UUID: ${data.uuid}`);
            cleanup();
            resolve(data.uuid ? data : null);
        });

        client.on("Disconnect", (r) => { if (!resolved && r !== "Quiz Locked") console.log(`⚠️ [GHOST] Deco: ${r}`); });
        client.join(pin, "x_" + Math.floor(Math.random()*999)).catch(() => resolve(null));
    });
}

// ==================================================================
// 2. DISCORD BOT & OCR
// ==================================================================
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = [
    new SlashCommandBuilder().setName('kahoot').setDescription('Elite V4 Tools')
        .addSubcommand(s => s.setName('scan').setDescription('OCR Image -> UUID').addAttachmentOption(o => o.setName('image').setDescription('Lobby Screen').setRequired(true)))
        .addSubcommand(s => s.setName('resolve').setDescription('PIN -> UUID').addStringOption(o => o.setName('pin').setRequired(true)))
        .addSubcommand(s => s.setName('raid').setDescription('Bot Flood').addStringOption(o => o.setName('pin').setRequired(true)).addStringOption(o => o.setName('name').setRequired(true)).addIntegerOption(o => o.setName('count').setRequired(true)))
        .addSubcommand(s => s.setName('ping').setDescription('Status & Logs'))
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
(async () => { try { await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands }); } catch(e){} })();

client.on('interactionCreate', async it => {
    if (it.isButton() && it.customId === 'refresh_logs') {
        const mem = await si.mem();
        const logsStr = logBuffer.join('\n') || "Logs vides.";
        const safeLogs = logsStr.length > 1900 ? "..." + logsStr.slice(-1900) : logsStr;
        
        const embed = new EmbedBuilder().setColor(0x10b981).setTitle("📡 SERVER LOGS")
            .setDescription(`\`\`\`bash\n${safeLogs}\n\`\`\``)
            .setFooter({ text: `RAM: ${(mem.active/1024/1024).toFixed(0)}MB / 512MB` });
        return await it.update({ embeds: [embed] });
    }

    if (!it.isChatInputCommand()) return;
    const { commandName, options } = it;

    if (commandName === 'kahoot') {
        const sub = options.getSubcommand();

        if (sub === 'ping') {
            const start = Date.now();
            await it.reply({ content: '...', fetchReply: true });
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('refresh_logs').setLabel('Afficher Logs').setStyle(ButtonStyle.Danger).setEmoji('📜'));
            const embed = new EmbedBuilder().setColor(0x3b82f6).setTitle("⚡ ELITE V4 STATUS")
                .addFields(
                    { name: 'WS Latency', value: `\`${client.ws.ping}ms\``, inline: true },
                    { name: 'RAM Usage', value: `\`${Math.round(process.memoryUsage().heapUsed/1024/1024)}MB\``, inline: true }
                );
            await it.editReply({ content: '', embeds: [embed], components: [row] });
        }

        if (sub === 'resolve') {
            await it.deferReply({ ephemeral: true });
            const result = await resolvePinToUUID(options.getString('pin'));
            if (result && result.uuid) {
                const url = `${process.env.RENDER_EXTERNAL_URL}/payload.js`;
                const embed = new EmbedBuilder().setColor(0x10b981).setTitle(`🔓 ${result.title}`)
                    .setDescription(`**UUID:** \`${result.uuid}\``).addFields({ name: 'Injector', value: `[Lien Script](${url})` });
                it.editReply({ embeds: [embed] });
            } else it.editReply("❌ Echec extraction.");
        }

        if (sub === 'scan') {
            await it.deferReply();
            const img = options.getAttachment('image');
            if (!img.contentType.startsWith('image/')) return it.editReply("❌ Image requise.");

            try {
                console.log("👁️ [OCR] Init Worker...");
                
                // --- FIX CRITIQUE RENDER ---
                // On force le cache dans /tmp car / est en lecture seule sur certains conteneurs
                // et on désactive le logging verbeux pour gagner de la RAM
                const worker = await Tesseract.createWorker('eng', 1, {
                    cachePath: '/tmp',
                    logger: m => { if(m.status === 'recognizing text' && m.progress % 0.2 === 0) console.log(`[OCR] ${Math.round(m.progress*100)}%`); }
                });
                
                const ret = await worker.recognize(img.url);
                const text = ret.data.text;
                await worker.terminate(); // Libération immédiate RAM

                const uuidMatch = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
                const pinMatch = text.match(/\b\d{6,7}\b/);

                const embed = new EmbedBuilder().setTitle("👁️ SCAN RESULT").setColor(0x8b5cf6);
                if (uuidMatch) embed.addFields({ name: '✅ UUID', value: `\`${uuidMatch[0]}\`` });
                else if (pinMatch) embed.addFields({ name: '⚠️ PIN', value: `\`${pinMatch[0]}\`` });
                else embed.setDescription("❌ Rien trouvé. Essayez de rogner l'image.");
                
                it.editReply({ embeds: [embed] });
            } catch (e) {
                console.error("OCR ERROR:", e);
                it.editReply(`❌ Erreur OCR (Voir logs /ping): ${e.message}`);
            }
        }

        if (sub === 'raid') {
            const count = Math.min(options.getInteger('count'), 80);
            it.reply({ content: `🚀 RAID: ${count} bots sur ${options.getString('pin')}`, ephemeral: true });
            for(let i=0; i<count; i++) {
                setTimeout(() => {
                    const b = new Kahoot();
                    b.join(options.getString('pin'), `${options.getString('name')}${i}`).catch(()=>{});
                    b.on("Joined", () => { if(Math.random()>0.5) b.answer(Math.floor(Math.random()*4)); });
                }, i * 150);
            }
        }
    }
});

// ==================================================================
// 3. API & INJECTOR V3 (Optimized)
// ==================================================================
app.get('/api/raw/:uuid', async (req, res) => {
    try {
        const r = await axios.get(`https://play.kahoot.it/rest/kahoots/${req.params.uuid}`);
        const d = r.data.questions.map(q => ({
            q: q.question ? q.question.replace(/<[^>]*>/g,'') : "Media",
            a: q.choices.find(c=>c.correct)?.answer.replace(/<[^>]*>/g,'') || "??",
        }));
        res.json(d);
    } catch(e) { res.status(500).json({error: "Erreur API"}); }
});

app.get('/payload.js', (req, res) => {
    const host = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
    res.type('.js').send(`
    (function(){
        if(window.ELITE_V4) return; window.ELITE_V4=true;
        const ui=document.createElement('div');
        ui.innerHTML=\`<div style="position:fixed;bottom:10px;right:10px;width:250px;background:#000;border:1px solid #0f0;color:#0f0;padding:10px;font-family:monospace;z-index:999999;border-radius:5px;">
        <b>ELITE V4</b> <span id="st">IDLE</span><br>
        <input id="inp" placeholder="UUID" style="background:#222;border:none;color:#fff;width:100%;margin:5px 0;">
        <button id="btn" style="width:100%;cursor:pointer;background:#0f0;color:#000;border:none;">LOAD</button>
        <div id="ans" style="margin-top:10px;font-size:14px;color:#fff;"></div>
        </div>\`;
        document.body.appendChild(ui);
        
        let d=[],i=0;
        const u=ui.querySelector.bind(ui);
        
        u('#btn').onclick=async()=>{
            u('#st').innerText="LOADING...";
            try{
                let v=u('#inp').value.match(/[0-9a-f-]{36}/);
                if(!v) throw new Error("UUID Invalide");
                const r=await fetch('${host}/api/raw/'+v[0]);
                d=await r.json();
                u('#st').innerText="READY ("+d.length+")";
                render();
                setInterval(()=>{
                    const c=document.querySelector('[data-functional-selector="question-index-counter"]');
                    if(c){const n=parseInt(c.innerText)-1;if(!isNaN(n)&&n!=i){i=n;render();}}
                },800);
            }catch(e){u('#st').innerText="ERR";alert(e.message);}
        };
        
        const render=()=>{
            if(!d[i])return;
            u('#ans').innerHTML=\`Q\${i+1}: \${d[i].q.substring(0,20)}...<br><b style="font-size:16px;color:#0f0">\${d[i].a}</b>\`;
            document.querySelectorAll('[data-functional-selector^="answer-card"]').forEach(c=>{
                c.style.opacity=c.innerText.includes(d[i].a.substring(0,5))?"1":"0.2";
            });
        };
    })();`);
});

app.listen(PORT, () => {
    console.log(`🌍 CORE ONLINE ON ${PORT}`);
    // Check Modules
    try { require('tesseract.js'); console.log("✅ MODULE: Tesseract OK"); } catch(e) { console.error("❌ MISSING: Tesseract"); }
    try { require('kahoot.js-updated'); console.log("✅ MODULE: Kahoot OK"); } catch(e) { console.error("❌ MISSING: Kahoot"); }
});

client.login(process.env.DISCORD_TOKEN);
