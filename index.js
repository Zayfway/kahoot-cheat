// ==================================================================
// ⚡ 1. SYSTEME D'AUTO-INSTALLATION (ROBUSTE)
// ==================================================================
const { execSync } = require('child_process');
const fs = require('fs');

console.log("🔄 [SYSTEM] Initialisation du protocole...");

// Liste des modules critiques et optionnels
const criticalPackages = ['discord.js', 'axios', 'express', 'dotenv'];
const optionalPackages = ['tesseract.js']; 

function checkAndInstall(pkgList) {
    let installedAny = false;
    pkgList.forEach(pkg => {
        try {
            require.resolve(pkg);
        } catch (e) {
            console.log(`⚠️ [MANQUANT] Module : ${pkg}`);
            try {
                console.log(`🚀 [INSTALLATION] Téléchargement de ${pkg}...`);
                execSync(`npm install ${pkg} --save --no-audit --no-fund`, { stdio: 'inherit' });
                installedAny = true;
            } catch (err) {
                console.error(`❌ [ERREUR] Impossible d'installer ${pkg}. Le bot continuera sans lui.`);
            }
        }
    });
    return installedAny;
}

// Installation
checkAndInstall(criticalPackages);
const hasOCR = !checkAndInstall(optionalPackages); 

if (!hasOCR) console.log("⚠️ [INFO] Tesseract (OCR) pourrait ne pas être actif si l'installation a échoué.");

// ==================================================================
// ⚡ 2. SERVEUR & LOGIQUE BOT (REALM X)
// ==================================================================
require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Partials } = require('discord.js');
const axios = require('axios');
const express = require('express');
const crypto = require('crypto');

let Tesseract = null;
try { Tesseract = require('tesseract.js'); } catch(e) { console.log("⚠️ Module OCR non chargé."); }

const app = express();
const port = process.env.PORT || 3000;
const scriptsCache = new Map();

// --- SERVEUR WEB ---

app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>STATUS // REALM X</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');
            body { 
                background-color: #050505; color: #0f0; 
                font-family: 'JetBrains Mono', monospace; 
                height: 100vh; display: flex; flex-direction: column;
                align-items: center; justify-content: center; margin: 0; 
            }
            .status-box { 
                border: 1px solid #333; padding: 2rem; 
                background: #0a0a0a; box-shadow: 0 0 30px rgba(0,255,0,0.1); 
                text-align: center;
            }
            h1 { margin: 0 0 1rem 0; font-size: 1.5rem; letter-spacing: -1px; }
            .indicator { display: inline-block; width: 10px; height: 10px; background: #0f0; border-radius: 50%; margin-right: 10px; box-shadow: 0 0 10px #0f0; }
        </style>
    </head>
    <body>
        <div class="status-box">
            <h1><span class="indicator"></span>SYSTÈME OPÉRATIONNEL</h1>
            <p>COMMANDANT A // BOT PRÊT</p>
            <p style="color:#555; font-size: 0.8rem;">PORT: ${port}</p>
        </div>
    </body>
    </html>
    `);
});

app.get('/copy/:id', (req, res) => {
    const entry = scriptsCache.get(req.params.id);
    if (!entry) return res.status(404).send("SESSION_EXPIRED_OR_INVALID");

    const rawCode = generateClientPayload(entry.data);
    const b64Code = Buffer.from(rawCode).toString('base64');
    const loader = `eval(decodeURIComponent(escape(window.atob('${b64Code}'))))`;

    res.send(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <title>Injector // ${entry.title}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');
                body { background: #111; color: #ccc; font-family: 'JetBrains Mono', monospace; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                .window { width: 90%; max-width: 800px; background: #1a1a1a; border: 1px solid #333; border-radius: 4px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); overflow: hidden; }
                .header { background: #252525; padding: 10px 15px; border-bottom: 1px solid #333; display: flex; gap: 8px; font-size: 12px; color: #666; }
                .dot { width: 10px; height: 10px; border-radius: 50%; background: #444; }
                .content { padding: 30px; }
                .code-area { background: #000; border: 1px solid #333; padding: 15px; color: #0f0; font-size: 12px; border-radius: 4px; overflow-x: auto; margin: 20px 0; white-space: nowrap; position: relative; }
                button { background: #fff; color: #000; border: none; padding: 12px 25px; font-weight: bold; cursor: pointer; font-family: inherit; transition: 0.2s; }
                button:hover { background: #ccc; }
                textarea { position: absolute; opacity: 0; }
            </style>
        </head>
        <body>
            <div class="window">
                <div class="header">
                    <div class="dot" style="background:#ff5555"></div>
                    <div class="dot" style="background:#ffb86c"></div>
                    <div class="dot" style="background:#50fa7b"></div>
                    <span style="margin-left:auto">USER: A // TARGET: ${entry.title.substring(0,20)}...</span>
                </div>
                <div class="content">
                    <h2 style="color:#fff; margin:0">INJECTION PAYLOAD GENERATED</h2>
                    <p style="font-size:13px">Copiez le code ci-dessous et collez-le dans la console développeur (F12).</p>
                    
                    <div class="code-area">
                        ${loader.substring(0, 60)}... [ENCRYPTED_PAYLOAD]
                    </div>
                    <textarea id="hidden-code">${loader}</textarea>
                    
                    <button onclick="copyPayload()" id="btn">COPIER DANS LE PRESSE-PAPIER</button>
                    <p id="status" style="font-size:12px; margin-top:15px; color:#555">Prêt.</p>
                </div>
            </div>
            <script>
                function copyPayload() {
                    const t = document.getElementById('hidden-code');
                    t.select();
                    try {
                        document.execCommand('copy');
                        const b = document.getElementById('btn');
                        b.style.background = '#50fa7b'; b.innerText = "COPIE RÉUSSIE";
                        document.getElementById('status').innerText = "Collez maintenant dans la Console (F12) > Onglet Console > Entrée";
                    } catch(e) { alert("Erreur de copie"); }
                }
            </script>
        </body>
        </html>
    `);
});

app.listen(port, () => console.log(`🌍 SERVEUR EN LIGNE : ${port}`));

// --- GENERATEUR GUI OPTIMISÉ (PRECISION, STYLE & IOS SUPPORT) ---
function generateClientPayload(quizData) {
    const json = JSON.stringify(quizData);
    
    // SVG Planète (Violet/Néon)
    const planetSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:100%;height:100%;filter:drop-shadow(0 0 8px rgba(139,92,246,0.6))"><circle cx="12" cy="12" r="10"></circle><path d="M2 12h20"></path><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`;

    return `
    (function() {
        // --- CONFIGURATION INITIALE ---
        const _db = ${json};
        const _st = { 
            fixed: false, 
            fixVal: 50, 
            dMin: 500, 
            dMax: 1000, 
            o: 1, 
            a: false, 
            n: true,
            i: false,
            mobile: false // MODE IOS/MOBILE
        };
        console.clear();
        console.log("%c INJECTED // REALM X ", "background:#000;color:#0f0;font-size:14px;padding:5px;");

        // --- DOM ISOLATION ---
        const host = document.createElement('div');
        host.id = 'rx-' + Math.random().toString(36).slice(2);
        Object.assign(host.style, {position:'fixed', top:0, left:0, zIndex:9999999, pointerEvents:'none'});
        document.body.appendChild(host);
        const root = host.attachShadow({mode:'closed'});

        // --- STYLES CSS ---
        const style = document.createElement('style');
        style.textContent = \`
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
            * { box-sizing: border-box; font-family: 'Inter', sans-serif; user-select: none; }
            
            .panel {
                pointer-events: auto;
                position: fixed; top: 20px; right: 20px;
                width: 300px;
                background: rgba(10, 10, 10, 0.95);
                backdrop-filter: blur(10px);
                border: 1px solid #333;
                border-radius: 12px;
                color: #e0e0e0;
                padding: 16px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.8);
                transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s;
                opacity: 1;
            }
            .panel.hidden { opacity: 0; pointer-events: none; transform: scale(0.95) translateY(-10px); }

            .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #222; padding-bottom: 10px; }
            .header h1 { font-size: 14px; font-weight: 800; margin: 0; color: #fff; letter-spacing: 0.5px; }
            .min-btn { cursor: pointer; color: #666; font-size: 18px; line-height: 10px; transition: 0.2s; }
            .min-btn:hover { color: #fff; }

            .row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-size: 12px; color: #888; }
            .row-title { font-weight: 600; color: #ccc; }

            input[type="number"] {
                background: #111; border: 1px solid #333; color: #fff;
                padding: 6px 8px; border-radius: 6px; width: 60px;
                text-align: center; font-size: 12px; font-weight: 600;
                outline: none; transition: 0.2s;
            }
            input[type="number"]:focus { border-color: #8b5cf6; }

            .toggle-btn {
                background: #1a1a1a; border: 1px solid #333; color: #666;
                padding: 6px 12px; border-radius: 6px; cursor: pointer;
                font-size: 11px; font-weight: 700; transition: all 0.2s;
            }
            .toggle-btn.active { background: #059669; color: #fff; border-color: #059669; box-shadow: 0 0 10px rgba(5, 150, 105, 0.4); }
            .toggle-btn.red { background: #1a1a1a; color: #ef4444; border-color: #333; }
            .toggle-btn.red:hover { background: #7f1d1d; color: #fff; border-color: #ef4444; }

            input[type="range"] { width: 100px; accent-color: #8b5cf6; cursor: pointer; }

            .dock {
                pointer-events: auto;
                position: fixed; bottom: 20px; left: 20px;
                width: 48px; height: 48px;
                background: #111; border: 1px solid #333;
                border-radius: 50%; display: flex; align-items: center; justify-content: center;
                cursor: pointer; box-shadow: 0 0 20px rgba(139,92,246,0.2);
                transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                opacity: 0; transform: translateY(20px);
            }
            .dock.visible { opacity: 1; transform: translateY(0); }
            .dock:hover { transform: scale(1.1); box-shadow: 0 0 30px rgba(139,92,246,0.4); border-color: #8b5cf6; }
            .dock svg { width: 24px; height: 24px; }

            .toast-container { position: absolute; bottom: 40px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; gap: 8px; pointer-events: none; }
            .toast { background: rgba(0,0,0,0.8); border: 1px solid #333; color: #fff; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 500; opacity: 0; animation: fadeUp 0.3s forwards; }
            @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

            .drag-area { padding: 5px; cursor: move; touch-action: none; }
        \`;
        root.appendChild(style);

        // --- HTML GUI ---
        const wrapper = document.createElement('div');
        wrapper.innerHTML = \`
            <div class="panel" id="ui">
                <div class="header drag-area">
                    <h1>REALM X // CONTROL</h1>
                    <div class="min-btn" id="btnMin">_</div>
                </div>

                <div class="row">
                    <span class="row-title">AUTO-ANSWER</span>
                    <button class="toggle-btn" id="btnAuto">DISABLED</button>
                </div>
                
                <div class="row">
                    <span class="row-title">TOUCH / IOS</span>
                    <button class="toggle-btn" id="btnMobile" title="Force Touch Events for iPhone">DISABLED</button>
                </div>

                <div class="row" style="margin-top:15px; border-top:1px solid #222; padding-top:15px;">
                    <span class="row-title">DELAY MODE</span>
                    <button class="toggle-btn" id="btnMode">RANDOM</button>
                </div>

                <!-- MODE RANDOM -->
                <div id="cfgRandom">
                    <div class="row">
                        <span>Min (ms)</span>
                        <input type="number" id="inpMin" value="500">
                    </div>
                    <div class="row">
                        <span>Max (ms)</span>
                        <input type="number" id="inpMax" value="1000">
                    </div>
                </div>

                <!-- MODE EXACT -->
                <div id="cfgExact" style="display:none;">
                    <div class="row">
                        <span style="color:#8b5cf6; font-weight:bold;">PRECISE (ms)</span>
                        <input type="number" id="inpExact" value="50" style="border-color:#8b5cf6; color:#8b5cf6;">
                    </div>
                </div>

                <div class="row" style="margin-top:15px; border-top:1px solid #222; padding-top:15px;">
                    <span class="row-title">PLANET OPACITY</span>
                    <input type="range" id="rngOp" min="10" max="100" value="100">
                </div>

                <div class="row" style="justify-content:center; margin-top:20px;">
                    <button class="toggle-btn red" id="btnExit">UNLOAD SCRIPT</button>
                </div>
            </div>

            <div class="dock" id="dock">
                ${planetSVG}
            </div>

            <div class="toast-container" id="toasts"></div>
        \`;
        root.appendChild(wrapper);

        const $ = (s) => root.querySelector(s);
        const ui = $('#ui');
        const dock = $('#dock');
        
        function updateState() {
            if(_st.fixed) {
                $('#btnMode').innerText = "PRECISE";
                $('#btnMode').style.borderColor = "#8b5cf6";
                $('#btnMode').style.color = "#8b5cf6";
                $('#cfgRandom').style.display = 'none';
                $('#cfgExact').style.display = 'block';
            } else {
                $('#btnMode').innerText = "RANDOM";
                $('#btnMode').style.borderColor = "#333";
                $('#btnMode').style.color = "#666";
                $('#cfgRandom').style.display = 'block';
                $('#cfgExact').style.display = 'none';
            }
        }

        // --- LISTENERS ---
        $('#btnAuto').onclick = function() {
            _st.a = !_st.a;
            this.className = _st.a ? "toggle-btn active" : "toggle-btn";
            this.innerText = _st.a ? "ACTIVE" : "DISABLED";
            notif(_st.a ? "Auto-Bot Activé" : "En attente");
        };
        
        // BOUTON MOBILE / IOS
        $('#btnMobile').onclick = function() {
            _st.mobile = !_st.mobile;
            this.className = _st.mobile ? "toggle-btn active" : "toggle-btn";
            this.innerText = _st.mobile ? "ACTIVE" : "DISABLED";
            notif(_st.mobile ? "Mode Touch: ON" : "Mode Touch: OFF");
        };

        $('#btnMode').onclick = () => { _st.fixed = !_st.fixed; updateState(); };
        
        $('#inpMin').onchange = (e) => _st.dMin = parseInt(e.target.value);
        $('#inpMax').onchange = (e) => _st.dMax = parseInt(e.target.value);
        $('#inpExact').oninput = (e) => _st.fixVal = parseInt(e.target.value);

        $('#btnMin').onclick = () => {
            ui.classList.add('hidden');
            dock.classList.add('visible');
            dock.style.opacity = _st.o;
        };
        dock.onclick = () => {
            ui.classList.remove('hidden');
            dock.classList.remove('visible');
        };

        $('#rngOp').oninput = (e) => {
            _st.o = e.target.value / 100;
            dock.style.opacity = _st.o;
        };

        $('#btnExit').onclick = () => { if(confirm('Déconnecter du Royaume X ?')) host.remove(); };

        // --- DRAGGABLE (SOURIS + TOUCH/IPHONE) ---
        let isDown = false, offset = [0,0];
        const dragArea = $('.drag-area');
        
        // MOUSE
        dragArea.onmousedown = (e) => {
            isDown = true;
            offset = [ui.offsetLeft - e.clientX, ui.offsetTop - e.clientY];
        };
        document.addEventListener('mouseup', () => isDown = false);
        document.addEventListener('mousemove', (e) => {
            if(isDown) {
                ui.style.left = (e.clientX + offset[0]) + 'px';
                ui.style.top = (e.clientY + offset[1]) + 'px';
            }
        });
        
        // TOUCH (IOS)
        dragArea.addEventListener('touchstart', (e) => {
            isDown = true;
            const touch = e.touches[0];
            offset = [ui.offsetLeft - touch.clientX, ui.offsetTop - touch.clientY];
        }, {passive: false});
        
        document.addEventListener('touchend', () => isDown = false);
        document.addEventListener('touchmove', (e) => {
            if(isDown) {
                e.preventDefault(); // Empêche le scroll pendant le drag
                const touch = e.touches[0];
                ui.style.left = (touch.clientX + offset[0]) + 'px';
                ui.style.top = (touch.clientY + offset[1]) + 'px';
            }
        }, {passive: false});

        function notif(msg) {
            const t = document.createElement('div');
            t.className = 'toast'; t.innerText = msg;
            $('#toasts').appendChild(t);
            setTimeout(() => t.remove(), 2000);
        }

        // --- GAME LOOP ---
        const observer = new MutationObserver(() => {
            const textContent = document.body.innerText.toLowerCase();
            const question = _db.find(item => textContent.includes(item.q));

            if (question) {
                const buttons = Array.from(document.querySelectorAll('[data-functional-selector="answer"], button'));
                
                buttons.forEach(btn => {
                    if(btn.dataset.rxLocked) return;
                    
                    const btnText = btn.innerText.toLowerCase();
                    if(btnText && (btnText.includes(question.a) || question.a.includes(btnText))) {
                        
                        btn.dataset.rxLocked = "true";
                        
                        // Highlight
                        btn.style.border = "2px solid #0f0";
                        btn.style.boxShadow = "0 0 15px rgba(0,255,0,0.5)";
                        
                        // Auto-Click (Logic)
                        if(_st.a) {
                            const delay = _st.fixed ? _st.fixVal : Math.floor(Math.random() * (_st.dMax - _st.dMin) + _st.dMin);
                            setTimeout(() => {
                                if(_st.mobile) {
                                    // SIMULATION TOUCH POUR IOS
                                    const touchObj = new Touch({
                                        identifier: Date.now(),
                                        target: btn,
                                        clientX: btn.getBoundingClientRect().left,
                                        clientY: btn.getBoundingClientRect().top
                                    });
                                    const evtStart = new TouchEvent('touchstart', { touches: [touchObj], view: window, bubbles: true, cancelable: true });
                                    const evtEnd = new TouchEvent('touchend', { touches: [touchObj], view: window, bubbles: true, cancelable: true });
                                    
                                    btn.dispatchEvent(evtStart);
                                    btn.dispatchEvent(evtEnd);
                                    btn.click(); // Fallback click
                                } else {
                                    btn.click();
                                }
                                notif("Réponse Envoyée");
                            }, delay);
                        }
                    }
                });
            }
        });
        observer.observe(document.body, {childList: true, subtree: true});

    })();
    `;
}

// ==================================================================
// ⚡ 3. DISCORD CLIENT COMMANDS
// ==================================================================
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const commands = [
    new SlashCommandBuilder().setName('kahoot').setDescription('Interface Principale')
        .addSubcommand(s => s.setName('inject').setDescription('Générer Payload').addStringOption(o=>o.setName('uuid').setDescription('UUID du Quiz').setRequired(true)))
        .addSubcommand(s => s.setName('ping').setDescription('Diagnostic Système'))
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try { await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands }); } catch(e){}
})();

client.on('ready', () => {
    console.log(`🤖 ${client.user.tag} EN LIGNE`);
    client.user.setActivity("Realm X // Surveillance");
});

// INTERACTION HANDLER
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'kahoot') {
        const sub = interaction.options.getSubcommand();

        // 1. COMMANDE PING (PRO STYLE)
        if (sub === 'ping') {
            const lat = Date.now() - interaction.createdTimestamp;
            const api = Math.round(client.ws.ping);
            
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle("📡 DIAGNOSTIC SYSTÈME")
                .addFields(
                    { name: "LATENCE", value: `\`${lat}ms\``, inline: true },
                    { name: "API HEARTBEAT", value: `\`${api}ms\``, inline: true },
                    { name: "STATUT", value: "✅ OPÉRATIONNEL", inline: true },
                    { name: "MODULE OCR", value: Tesseract ? "🟢 ACTIF" : "🔴 DÉSACTIVÉ", inline: true }
                )
                .setFooter({ text: "ROYAUME X // COMMANDANT A" })
                .setTimestamp();
            
            return interaction.reply({ embeds: [embed] });
        }

        // 2. COMMANDE INJECT
        if (sub === 'inject') {
            const uuid = interaction.options.getString('uuid');
            await interaction.deferReply({ ephemeral: true });
            await processUUID(uuid, interaction);
        }
    }
});

client.on('messageCreate', async msg => {
    if(msg.author.bot) return;

    // Détection UUID Standard
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    
    // Détection URL spécifique (quizId=...)
    const urlRegex = /quizId=([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
    
    // Check Texte Direct
    const txtMatch = msg.content.match(uuidRegex);
    if(txtMatch) {
        const r = await msg.reply("⚙️ **TRAITEMENT UUID...**");
        await processUUID(txtMatch[0], { 
            reply: (d) => msg.reply(d), 
            editReply: (d) => r.edit(d) 
        });
        return;
    }

    // Détection Image (OCR)
    if(msg.attachments.size > 0 && Tesseract) {
        const att = msg.attachments.first();
        if(att.contentType.startsWith('image/')) {
            const r = await msg.reply("👁️ **ANALYSE VISUELLE EN COURS...**");
            try {
                const { data: { text } } = await Tesseract.recognize(att.url, 'eng');
                
                // Priorité: Recherche du paramètre URL "quizId="
                const urlMatch = text.match(urlRegex);
                if (urlMatch) {
                    // urlMatch[1] contient l'UUID capturé après "quizId="
                    await r.edit("✅ **UUID EXTRAIT VIA URL (IMAGE).**");
                    await processUUID(urlMatch[1], { reply: (d) => msg.reply(d), editReply: (d) => r.edit(d) });
                    return;
                }

                // Fallback: Recherche UUID brut n'importe où
                const rawMatch = text.match(uuidRegex);
                if(rawMatch) {
                    await r.edit("✅ **UUID EXTRAIT (BRUT).**");
                    await processUUID(rawMatch[0], { reply: (d) => msg.reply(d), editReply: (d) => r.edit(d) });
                } else {
                    await r.edit("❌ **AUCUNE DONNÉE VALIDE DÉTECTÉE.**");
                    setTimeout(() => r.delete(), 4000);
                }
            } catch(e) { await r.edit("❌ **ERREUR D'ANALYSE.**"); }
        }
    }
});

async function processUUID(uuid, handler) {
    const reply = (d) => handler.reply ? handler.reply(d) : handler.editReply(d);
    
    try {
        // Fetch Kahoot Data
        const res = await axios.get(`https://play.kahoot.it/rest/kahoots/${uuid}`);
        if(res.data.error) throw new Error("Private");

        // Parsing
        const data = res.data.questions.map(q => {
            const cor = q.choices ? q.choices.find(c => c.correct) : null;
            return {
                q: q.question ? q.question.replace(/<[^>]*>/g,'').toLowerCase().substring(0,80) : "img",
                a: cor ? cor.answer.replace(/<[^>]*>/g,'').trim().toLowerCase() : "unknown"
            };
        });

        // Cache & Link
        const sid = crypto.randomUUID();
        scriptsCache.set(sid, { data: data, title: res.data.title });
        
        const host = process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`;
        const url = `${host}/copy/${sid}`;

        const embed = new EmbedBuilder()
            .setColor(0x8b5cf6)
            .setTitle(`🔓 ACCÈS ACCORDÉ : ${res.data.title}`)
            .setDescription(`**CIBLE ID :** \`${uuid}\`\n**POINTS DE DONNÉES :** ${data.length}\n\n[>> OUVRIR TERMINAL <<](${url})`)
            .setImage('https://media.discordapp.net/attachments/1079058102717050962/1119642637204557925/standard_2.gif')
            .setFooter({ text: "ROYAUME X // UNITÉ D'INFILTRATION" });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('LANCER TERMINAL').setURL(url)
        );

        await handler.editReply({ content: null, embeds: [embed], components: [row] });

    } catch(e) {
        await handler.editReply({ content: `❌ **ACCÈS REFUSÉ.**\nLa cible \`${uuid}\` est probablement PRIVÉE ou INVALIDE.` });
    }
}

client.login(process.env.DISCORD_TOKEN);
