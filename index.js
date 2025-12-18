/**
 * ⚡ KAHOOT HACK ELITE V6 - THE FINAL VERSION
 * Author: Boss & AI
 * Features: 6-Core Modules (Raid, Scan, Resolve, Injector, Ping, Logs)
 * Optimized for Render Cloud (512MB RAM)
 */

require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const cors = require('cors');
const Kahoot = require('kahoot.js-updated');
const Tesseract = require('tesseract.js');
const si = require('systeminformation');
const randomName = require('random-name');

// --- LOGGER ENGINE (MEMORY BUFFER) ---
// Capture les logs pour les afficher sur Discord sans accès au dashboard Render
const MAX_LOGS = 60;
const logBuffer = [];
function pushLog(type, args) {
    const timestamp = new Date().toLocaleTimeString('fr-FR');
    const msg = args.map(a => (a instanceof Error ? `${a.message}\n${a.stack}` : (typeof a === 'object' ? JSON.stringify(a) : a))).join(' ');
    logBuffer.push(`[${timestamp}] [${type}] ${msg}`);
    if (logBuffer.length > MAX_LOGS) logBuffer.shift();
    if(type === 'ERR ') console.error(`[${type}]`, ...args); else console.log(`[${type}]`, ...args);
}
console.log = (...args) => pushLog('INFO', args);
console.error = (...args) => pushLog('ERR ', args);

// --- ANTI-CRASH ---
process.on('uncaughtException', (e) => console.error("🔥 UNCAUGHT:", e));
process.on('unhandledRejection', (r) => console.error("🔥 REJECTION:", r));
process.setMaxListeners(Number.POSITIVE_INFINITY); // Nécessaire pour le flood massif

// --- SERVER SETUP ---
const PORT = process.env.PORT || 3000;
const app = express();
app.use(cors());
app.use(express.json());

const activeRaids = new Map();

// ==================================================================
// 1. HELPERS & UTILS
// ==================================================================

// Remplace les caractères latins par des homoglyphes pour contourner les filtres
function bypassName(name) {
    const map = {'a':'ᗩ','b':'ᗷ','c':'ᑕ','d':'ᗪ','e':'E','f':'ᖴ','g':'G','h':'ᕼ','i':'I','j':'ᒍ','k':'K','l':'ᒪ','m':'ᗰ','n':'ᑎ','o':'O','p':'ᑭ','q':'ᑫ','r':'ᖇ','s':'ᔕ','t':'T','u':'ᑌ','v':'ᐯ','w':'ᗯ','x':'᙭','y':'Y','z':'ᘔ'};
    return name.split('').map(c => map[c.toLowerCase()] || c).join('');
}

function generateName(base, i, random) {
    if (random) {
        const r = Math.random();
        if(r<0.33) return randomName.first();
        if(r<0.66) return randomName.first() + randomName.last();
        return `${randomName.first()}_${Math.floor(Math.random()*100)}`;
    }
    return `${base}${i}`;
}

// Ghost Resolver: Connecte un bot invisible pour voler l'UUID
async function resolvePin(pin) {
    return new Promise(r => {
        const k = new Kahoot();
        let ok = false;
        const cl = () => { if(k.socket) k.leave(); };
        // Timeout de sécurité
        const to = setTimeout(() => { if(!ok) { cl(); r(null); } }, 5000);
        
        k.on("Joined", () => { 
            ok=true; 
            clearTimeout(to); 
            r({uuid: k.quiz?.uuid, title: k.quiz?.name}); 
            cl(); 
        });
        
        k.on("Disconnect", () => { if(!ok) r(null); });
        k.join(pin, "x"+Math.floor(Math.random()*999)).catch(()=>r(null));
    });
}

// ==================================================================
// 2. DISCORD COMMANDS STRUCTURE (THE 6 OPTIONS)
// ==================================================================
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = [
    new SlashCommandBuilder().setName('kahoot').setDescription('Elite V6 Suite')
        // OPTION 1: RAID
        .addSubcommand(s => s.setName('raid').setDescription('🤖 Bot Flood Attack')
            .addStringOption(o => o.setName('pin').setRequired(true))
            .addIntegerOption(o => o.setName('count').setRequired(true))
            .addStringOption(o => o.setName('name').setDescription('Base Name').setRequired(false))
            .addBooleanOption(o => o.setName('antibot').setDescription('Bypass Filters').setRequired(false))
            .addBooleanOption(o => o.setName('manual').setDescription('Manual Control Buttons').setRequired(false)))
        // OPTION 2: SCAN (OCR)
        .addSubcommand(s => s.setName('scan').setDescription('📸 Scan Image for UUID').addAttachmentOption(o => o.setName('image').setRequired(true)))
        // OPTION 3: RESOLVE (PIN)
        .addSubcommand(s => s.setName('resolve').setDescription('🕵️ Solve PIN to UUID').addStringOption(o => o.setName('pin').setRequired(true)))
        // OPTION 4: INJECTOR
        .addSubcommand(s => s.setName('injector').setDescription('💉 Get Injection Payload'))
        // OPTION 5: PING
        .addSubcommand(s => s.setName('ping').setDescription('📡 System Latency & RAM'))
        // OPTION 6: LOGS
        .addSubcommand(s => s.setName('logs').setDescription('📜 View Server Logs'))
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
(async () => { try { await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands }); } catch(e){} })();

// ==================================================================
// 3. INTERACTION HANDLER
// ==================================================================
client.on('interactionCreate', async it => {
    // --- BUTTON HANDLERS ---
    if (it.isButton()) {
        // Logs Button (Refresh)
        if (it.customId === 'refresh_logs') {
            const logs = logBuffer.join('\n') || "No logs.";
            return it.update({ embeds: [new EmbedBuilder().setColor(0x333333).setTitle("📜 LIVE LOGS").setDescription(`\`\`\`bash\n${logs.slice(-1900)}\n\`\`\``)] });
        }
        // Raid Control Buttons (Manual Mode)
        if (it.customId.startsWith('raid_')) {
            const [_, act, rid] = it.customId.split('_');
            const r = activeRaids.get(rid);
            if (!r) return it.reply({content:"❌ Raid dead/finished.", ephemeral:true});
            
            const map = {tri:0, dia:1, cir:2, squ:3};
            if (map[act] !== undefined) {
                let count = 0;
                r.bots.forEach(b => {
                    if(b.socket) { b.answer(map[act]); count++; }
                });
                it.reply({content:`🔫 **FIRE:** ${count} bots answered.`, ephemeral:true});
            }
        }
        return;
    }

    if (!it.isChatInputCommand()) return;
    const { commandName, options } = it;

    if (commandName === 'kahoot') {
        const sub = options.getSubcommand();

        // 1. RAID
        if (sub === 'raid') {
            const pin = options.getString('pin');
            const count = Math.min(options.getInteger('count'), 80); // Max 80 pour Render
            const manual = options.getBoolean('manual');
            const antibot = options.getBoolean('antibot');
            const base = options.getString('name') || "Bot";
            const rid = Date.now().toString();

            const embed = new EmbedBuilder().setColor(0xff0000).setTitle("🚀 RAID ACTIVE")
                .setDescription(`**Target:** \`${pin}\`\n**Bots:** ${count}\n**Mode:** ${manual?'Manual Controller':'Auto-Random'}\n**Antibot:** ${antibot?'ON':'OFF'}`);
            
            const comps = [];
            if (manual) {
                // Boutons de contrôle manuel
                comps.push(new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`raid_tri_${rid}`).setLabel('▲').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId(`raid_dia_${rid}`).setLabel('◆').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId(`raid_cir_${rid}`).setLabel('●').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`raid_squ_${rid}`).setLabel('■').setStyle(ButtonStyle.Success)
                ));
            }

            await it.reply({ embeds: [embed], components: comps, ephemeral: true });
            
            const bots = [];
            activeRaids.set(rid, {bots});

            for(let i=0; i<count; i++) {
                setTimeout(() => {
                    const k = new Kahoot();
                    k.setMaxListeners(Infinity);
                    let name = generateName(base, i, antibot);
                    if(antibot) name = bypassName(name);
                    
                    k.join(pin, name).catch(e => {
                        // Retry avec nom random si duplicate
                        if(e.description === "Duplicate name") k.join(pin, generateName(base, i, true));
                    });

                    // 2FA Brute Force
                    k.on("Joined", i => {
                        if(i.twoFactorAuth) {
                            const t = setInterval(() => k.answerTwoFactorAuth([0,1,2,3].sort(()=>Math.random()-0.5)), 800);
                            k.on("TwoFactorCorrect", ()=>clearInterval(t));
                        }
                    });

                    // Auto Answer (si pas en manuel)
                    k.on("QuestionReady", q => {
                        if(!manual) setTimeout(() => {
                            if(q.type==='quiz') k.answer(Math.floor(Math.random()*(q.numberOfAnswers||4)));
                            else if(q.type==='true_false') k.answer(Math.floor(Math.random()*2));
                        }, Math.random()*2000+500);
                    });

                    bots.push(k);
                }, i*150); // Stagger joins
            }
        }

        // 2. SCAN (OCR)
        if (sub === 'scan') {
            await it.deferReply();
            try {
                const img = options.getAttachment('image');
                if(!img.contentType.startsWith('image/')) return it.editReply("❌ Image only.");
                
                // Fix critique pour Render : forcer le cache dans /tmp
                const w = await Tesseract.createWorker('eng', 1, { cachePath: '/tmp' });
                const r = await w.recognize(img.url);
                await w.terminate(); // Libération immédiate RAM
                
                const uuid = r.data.text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
                if(uuid) it.editReply({embeds:[new EmbedBuilder().setColor(0x10b981).setTitle("✅ UUID FOUND").setDescription(`\`${uuid[0]}\`\nUse /kahoot injector to hack.`)]});
                else it.editReply("❌ No UUID found in image.");
            } catch(e) { it.editReply(`❌ OCR Error: ${e.message}`); }
        }

        // 3. RESOLVE (PIN)
        if (sub === 'resolve') {
            await it.deferReply({ephemeral:true});
            const res = await resolvePin(options.getString('pin'));
            if(res) it.editReply({embeds:[new EmbedBuilder().setColor(0x10b981).setTitle(`🔓 ${res.title}`).setDescription(`**UUID:** \`${res.uuid}\``)]});
            else it.editReply("❌ Failed to resolve. Quiz locked or patched.");
        }

        // 4. INJECTOR
        if (sub === 'injector') {
            const url = `${process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`}/payload.js`;
            const code = `var s=document.createElement('script');s.src='${url}';document.body.appendChild(s);`;
            const embed = new EmbedBuilder().setColor(0x8b5cf6).setTitle("💉 INJECTION PAYLOAD")
                .setDescription("Copiez ceci dans la Console (F12) ou créez un favori.")
                .addFields({ name: 'Code', value: `\`\`\`js\n${code}\n\`\`\`` });
            it.reply({ embeds: [embed], ephemeral: true });
        }

        // 5. PING
        if (sub === 'ping') {
            const mem = await si.mem();
            const embed = new EmbedBuilder().setColor(0x3b82f6).setTitle("📡 SYSTEM STATUS")
                .addFields(
                    {name: 'API Latency', value: `${Date.now()-it.createdTimestamp}ms`, inline:true},
                    {name: 'WS Ping', value: `${client.ws.ping}ms`, inline:true},
                    {name: 'RAM (Active)', value: `${(mem.active/1024/1024).toFixed(0)}MB / 512MB`, inline:true}
                );
            it.reply({embeds:[embed]});
        }

        // 6. LOGS
        if (sub === 'logs') {
            const logs = logBuffer.join('\n') || "Logs empty.";
            const embed = new EmbedBuilder().setColor(0x333333).setTitle("📜 SERVER LOGS")
                .setDescription(`\`\`\`bash\n${logs.slice(-1900)}\n\`\`\``);
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('refresh_logs').setLabel('Refresh').setStyle(ButtonStyle.Secondary));
            it.reply({embeds:[embed], components:[row], ephemeral:true});
        }
    }
});

// ==================================================================
// 4. API & HOSTING
// ==================================================================

// Proxy API Kahoot (bypass CORS)
app.get('/api/raw/:uuid', async (req, res) => {
    try {
        const r = await axios.get(`https://play.kahoot.it/rest/kahoots/${req.params.uuid}`);
        res.json(r.data.questions.map(q => ({
            q: q.question?.replace(/<[^>]*>/g,'')||"Media",
            a: q.choices.find(c=>c.correct)?.answer.replace(/<[^>]*>/g,'')||"??"
        })));
    } catch { res.json({error:1}); }
});

// Script Injector V6 (Interface Client)
app.get('/payload.js', (req, res) => {
    const h = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
    res.type('.js').send(`(function(){if(window.E)return;window.E=1;const d=document.createElement('div');d.innerHTML='<div style="position:fixed;bottom:10px;right:10px;z-index:99999;background:#000;color:#0f0;padding:12px;border:1px solid #0f0;font-family:monospace;border-radius:6px;box-shadow:0 0 10px #0f0"><b>ELITE V6</b><br><input id="i" placeholder="UUID" style="background:#222;border:1px solid #0f0;color:#fff;width:150px"><button id="b" style="background:#0f0;color:#000;border:none;cursor:pointer;margin-left:5px">GO</button><div id="r" style="margin-top:8px;font-weight:bold;font-size:14px">IDLE</div></div>';document.body.appendChild(d);const u=s=>d.querySelector(s);let dt=[],x=0;u('#b').onclick=async()=>{try{u('#r').innerText="LOADING...";const v=u('#i').value.match(/[0-9a-f-]{36}/);if(!v)throw 0;const r=await fetch('${h}/api/raw/'+v[0]);dt=await r.json();u('#r').innerText="READY";up();}catch{u('#r').innerText="ERROR";}};const up=()=>{if(dt[x])u('#r').innerText=dt[x].a;};setInterval(()=>{const c=document.querySelector('[data-functional-selector="question-index-counter"]');if(c){const n=parseInt(c.innerText)-1;if(n!=x){x=n;up()}}},800)})()`);
});

app.listen(PORT, () => console.log(`🌍 ELITE V6 ONLINE PORT ${PORT}`));
client.login(process.env.DISCORD_TOKEN);
