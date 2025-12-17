// ==================================================================
// ⚡ 1. SYSTEME D'AUTO-INSTALLATION (ROBUSTE)
// ==================================================================
const { execSync } = require('child_process');
const fs = require('fs');

console.log("🔄 [SYSTEM] Démarrage du Protocole Realm X (Version Mobile & Pro)...");

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
                console.error(`❌ [ERREUR] Échec critique pour ${pkg}.`);
            }
        }
    });
    return installedAny;
}

// Installation rapide des paquets critiques
checkAndInstall(criticalPackages);

// Installation asynchrone pour Tesseract (OCR)
if (!fs.existsSync('./node_modules/tesseract.js')) {
    console.log("ℹ️ [OCR] Installation de Tesseract en cours...");
    try { execSync(`npm install tesseract.js --save --no-audit --no-fund`, { stdio: 'inherit' }); } catch(e){}
}

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
            body { background-color: #050505; color: #0f0; font-family: 'JetBrains Mono', monospace; height: 100vh; display: flex; align-items: center; justify-content: center; margin: 0; }
            .status-box { border: 1px solid #333; padding: 2rem; background: #0a0a0a; box-shadow: 0 0 30px rgba(0,255,0,0.1); text-align: center; }
            .indicator { display: inline-block; width: 10px; height: 10px; background: #0f0; border-radius: 50%; margin-right: 10px; box-shadow: 0 0 10px #0f0; }
        </style>
    </head>
    <body>
        <div class="status-box">
            <h1><span class="indicator"></span>SYSTÈME OPÉRATIONNEL</h1>
            <p>COMMANDANT A // UNITÉ S-X PRÊTE</p>
            <p style="color:#444; font-size: 0.8rem;">PORT: ${port}</p>
        </div>
    </body>
    </html>
    `);
});

app.get('/copy/:id', (req, res) => {
    const entry = scriptsCache.get(req.params.id);
    if (!entry) return res.status(404).send("SESSION_EXPIRE");
    const rawCode = generateClientPayload(entry.data);
    const loader = `eval(decodeURIComponent(escape(window.atob('${Buffer.from(rawCode).toString('base64')}'))))`;
    res.send(`
        <!DOCTYPE html>
        <html lang="fr">
        <head><meta charset="UTF-8"><title>Terminal // ${entry.title}</title>
        <style>@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');body{background:#111;color:#ccc;font-family:'JetBrains Mono',monospace;display:flex;justify-content:center;align-items:center;height:100vh;margin:0}.window{width:90%;max-width:800px;background:#1a1a1a;border:1px solid #333;padding:30px;box-shadow:0 10px 50px #000}.code-area{background:#000;padding:15px;color:#0f0;font-size:11px;margin:20px 0;word-break:break-all;border:1px solid #222}button{background:#fff;color:#000;border:none;padding:12px 25px;font-weight:bold;cursor:pointer;transition:0.2s}button:hover{background:#ccc}</style>
        </head>
        <body><div class="window"><h2>PAYLOAD GÉNÉRÉ</h2><p>Collez le code suivant dans la console (F12) sur Kahoot.</p><div class="code-area">${loader.substring(0, 150)}...</div><textarea id="c" style="position:absolute;opacity:0">${loader}</textarea><button onclick="cp()" id="b">COPIER LE SCRIPT</button></div>
        <script>function cp(){const t=document.getElementById('c');t.select();document.execCommand('copy');document.getElementById('b').innerText="COPIÉ AVEC SUCCÈS";setTimeout(()=>document.getElementById('b').innerText="COPIER LE SCRIPT", 2000);}</script></body></html>
    `);
});

app.listen(port, () => console.log(`🌍 SERVER X ACTIF SUR PORT : ${port}`));

// --- GENERATEUR GUI (FRANCAIS, PRECISION MS & MOBILE) ---
function generateClientPayload(quizData) {
    const json = JSON.stringify(quizData);
    const planetSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" style="width:100%;height:100%;"><circle cx="12" cy="12" r="10"></circle><path d="M2 12h20M12 2a15.3 15.3 0 0 1 0 20 15.3 15.3 0 0 1 0-20z"></path></svg>`;
    
    return `
    (function() {
        const _db = ${json};
        const _st = { fixed: false, fixVal: 50, dMin: 500, dMax: 1000, o: 1, a: false, mobile: false };
        
        console.clear();
        console.log("%c REALM X // S-BOT INJECTED ", "background:#000;color:#8b5cf6;font-size:16px;padding:10px;border:1px solid #8b5cf6;");

        const host = document.createElement('div');
        host.id = 'rx-' + Date.now();
        Object.assign(host.style, {position:'fixed', top:0, left:0, zIndex:9999999, pointerEvents:'none'});
        document.body.appendChild(host);
        const root = host.attachShadow({mode:'closed'});

        const style = document.createElement('style');
        style.textContent = \`
            * { box-sizing: border-box; font-family: sans-serif; user-select: none; }
            .panel { pointer-events: auto; position: fixed; top: 20px; right: 20px; width: 280px; background: rgba(10, 10, 10, 0.98); border: 1px solid #333; border-radius: 12px; color: #fff; padding: 18px; box-shadow: 0 15px 50px rgba(0,0,0,0.8); transition: opacity 0.3s, transform 0.3s; }
            .hidden { opacity: 0; pointer-events: none; transform: scale(0.9); display: none; }
            .row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-size: 12px; font-weight: 600; color: #aaa; }
            .row span { color: #eee; }
            input[type="number"] { background: #1a1a1a; border: 1px solid #444; color: #0f0; padding: 6px; width: 80px; border-radius: 6px; text-align: center; outline: none; transition: 0.2s; }
            input[type="number"]:focus { border-color: #8b5cf6; }
            .btn { background: #222; border: 1px solid #444; color: #666; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: 800; transition: 0.2s; text-transform: uppercase; }
            .btn.active { background: #059669; color: #fff; border-color: #059669; box-shadow: 0 0 10px rgba(5,150,105,0.4); }
            .dock { pointer-events: auto; position: fixed; bottom: 20px; left: 20px; width: 50px; height: 50px; background: #111; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; border: 1px solid #333; opacity: 0; transform: translateY(20px); transition: 0.4s cubic-bezier(0.17, 0.67, 0.83, 0.67); }
            .dock.visible { opacity: 1; transform: translateY(0); }
            .dock:hover { border-color: #8b5cf6; transform: scale(1.1); }
            .head { margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #222; cursor: move; touch-action: none; }
            .head h1 { margin: 0; font-size: 13px; color: #8b5cf6; letter-spacing: 1px; }
            .notif { position: absolute; bottom: 40px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.9); color: #fff; padding: 6px 15px; border-radius: 20px; font-size: 11px; border: 1px solid #333; pointer-events: none; opacity: 0; transition: 0.3s; }
        \`;
        root.appendChild(style);

        const wrap = document.createElement('div');
        wrap.innerHTML = \`
            <div class="panel" id="ui">
                <div class="head" id="drag"><h1>REALM X // BOT</h1></div>
                <div class="row"><span>AUTO-RÉPONSE</span><button class="btn" id="bA">DÉSACTIVÉ</button></div>
                <div class="row"><span>MODE TACTILE (IOS)</span><button class="btn" id="bM">DÉSACTIVÉ</button></div>
                <div class="row"><span>TYPE DÉLAI</span><button class="btn" id="bMo">ALÉATOIRE</button></div>
                
                <div id="cfgR">
                    <div class="row"><span>Min (ms)</span><input type="number" id="iMin" value="500"></div>
                    <div class="row"><span>Max (ms)</span><input type="number" id="iMax" value="1000"></div>
                </div>
                
                <div id="cfgE" style="display:none;">
                    <div class="row"><span style="color:#0f0">TEMPS PRÉCIS (ms)</span><input type="number" id="iEx" value="50"></div>
                </div>
                
                <div class="row"><span>OPACITÉ PLANÈTE</span><input type="range" id="rO" min="10" max="100" value="100"></div>
                <button class="btn" style="width:100%; color:#ef4444; border-color:#ef444466; margin-top:10px;" id="bX">QUITTER</button>
                <div class="notif" id="ntf"></div>
            </div>
            <div class="dock" id="dk">\${planetSVG}</div>
        \`;
        root.appendChild(wrap);

        const $ = (s) => root.querySelector(s);
        const ui = $('#ui'), dk = $('#dk'), ntf = $('#ntf');

        const notify = (m) => { ntf.innerText=m; ntf.style.opacity=1; setTimeout(()=>ntf.style.opacity=0, 2000); };

        // --- COMMANDES GUI ---
        $('#bA').onclick = function(){ _st.a = !_st.a; this.innerText=_st.a?"ACTIF":"DÉSACTIVÉ"; this.className=_st.a?"btn active":"btn"; notify(_st.a?"Auto-Bot ON":"Auto-Bot OFF"); };
        $('#bM').onclick = function(){ _st.mobile = !_st.mobile; this.innerText=_st.mobile?"ACTIF":"DÉSACTIVÉ"; this.className=_st.mobile?"btn active":"btn"; notify(_st.mobile?"Tactile Mobile ON":"Tactile Mobile OFF"); };
        $('#bMo').onclick = function(){ 
            _st.fixed = !_st.fixed; 
            this.innerText=_st.fixed?"PRÉCIS":"ALÉATOIRE"; 
            $('#cfgR').style.display=_st.fixed?"none":"block";
            $('#cfgE').style.display=_st.fixed?"block":"none";
        };

        // --- PRÉCISION MS ---
        const syncMS = () => { _st.fixVal = parseInt($('#iEx').value) || 0; };
        $('#iEx').oninput = syncMS;
        $('#iEx').onkeyup = syncMS;
        $('#iMin').onchange = () => _st.dMin = parseInt($('#iMin').value) || 0;
        $('#iMax').onchange = () => _st.dMax = parseInt($('#iMax').value) || 0;
        
        $('#rO').oninput = (e) => { _st.o = e.target.value / 100; dk.style.opacity = _st.o; };
        $('#bX').onclick = () => { if(confirm("Supprimer le script ?")) host.remove(); };

        // --- DRAGGABLE (SOURIS + TACTILE IPHONE) ---
        let dragging = false, offset = [0,0];
        const dragHandle = $('#drag');
        
        const start = (clientX, clientY) => {
            dragging = true;
            offset = [ui.offsetLeft - clientX, ui.offsetTop - clientY];
        };
        const move = (clientX, clientY) => {
            if(!dragging) return;
            ui.style.left = (clientX + offset[0]) + 'px';
            ui.style.top = (clientY + offset[1]) + 'px';
        };
        const stop = () => { dragging = false; };

        dragHandle.onmousedown = (e) => start(e.clientX, e.clientY);
        document.addEventListener('mousemove', (e) => move(e.clientX, e.clientY));
        document.addEventListener('mouseup', stop);

        dragHandle.addEventListener('touchstart', (e) => start(e.touches[0].clientX, e.touches[0].clientY));
        document.addEventListener('touchmove', (e) => { if(dragging) e.preventDefault(); move(e.touches[0].clientX, e.touches[0].clientY); }, {passive:false});
        document.addEventListener('touchend', stop);

        // --- MINIMISATION ---
        ui.ondblclick = () => { ui.classList.add('hidden'); dk.classList.add('visible'); dk.style.opacity = _st.o; };
        dk.onclick = () => { ui.classList.remove('hidden'); dk.classList.remove('visible'); };

        // --- LOGIQUE CORE ---
        const observer = new MutationObserver(() => {
            const currentTxt = document.body.innerText.toLowerCase();
            const found = _db.find(q => currentTxt.includes(q.q));
            
            if (found) {
                document.querySelectorAll('[data-functional-selector="answer"], button, span').forEach(el => {
                    if(el.dataset.rx) return;
                    const elTxt = el.innerText.toLowerCase().trim();
                    if(elTxt && (elTxt === found.a || elTxt.includes(found.a) || found.a.includes(elTxt))) {
                        el.dataset.rx = "1";
                        el.style.border = "3px solid #8b5cf6";
                        el.style.boxShadow = "0 0 15px #8b5cf6";
                        
                        if(_st.a) {
                            const delay = _st.fixed ? _st.fixVal : Math.floor(Math.random()*(_st.dMax-_st.dMin)+_st.dMin);
                            setTimeout(() => {
                                if(_st.mobile) {
                                    const touch = new Touch({identifier: Date.now(), target: el, clientX: 0, clientY: 0});
                                    el.dispatchEvent(new TouchEvent('touchstart', {touches: [touch], bubbles: true}));
                                    el.dispatchEvent(new TouchEvent('touchend', {touches: [touch], bubbles: true}));
                                }
                                el.click();
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
// ⚡ 3. DISCORD CLIENT & COMMANDES
// ==================================================================
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const commands = [
    new SlashCommandBuilder().setName('kahoot').setDescription('Menu Principal Realm X')
        .addSubcommand(s => s.setName('inject').setDescription('Générer via UUID').addStringOption(o=>o.setName('uuid').setDescription('L\'UUID du quiz').setRequired(true)))
        .addSubcommand(s => s.setName('scan').setDescription('Analyser une image (URL quizId)').addAttachmentOption(o=>o.setName('image').setDescription('La capture d\'écran').setRequired(true)))
        .addSubcommand(s => s.setName('ping').setDescription('Vérifier l\'état du bot'))
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
(async () => { try { await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands }); } catch(e){} })();

// Gestionnaire de réponse sécurisé
async function smartReply(interaction, data) {
    try {
        if (interaction.deferred || interaction.replied) return await interaction.editReply(data);
        return await interaction.reply(data);
    } catch (e) { console.error("⚠️ Signal Discord déjà traité."); }
}

async function processUUID(uuid, handler) {
    try {
        const res = await axios.get(`https://play.kahoot.it/rest/kahoots/${uuid}`);
        const data = res.data.questions.map(q => {
            const correct = q.choices ? q.choices.find(c => c.correct) : null;
            return {
                q: q.question ? q.question.replace(/<[^>]*>/g,'').toLowerCase().substring(0,80) : "img",
                a: correct ? correct.answer.replace(/<[^>]*>/g,'').trim().toLowerCase() : "unknown"
            };
        });
        const sid = crypto.randomUUID();
        scriptsCache.set(sid, { data, title: res.data.title });
        const url = `${process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`}/copy/${sid}`;

        const embed = new EmbedBuilder().setColor(0x8b5cf6).setTitle(`🔓 INJECTION PRÊTE : ${res.data.title}`)
            .setDescription(`**CIBLE :** \`${uuid}\`\n**DONNÉES :** ${data.length} Questions\n\n[>> CLIQUER POUR LE SCRIPT <<](${url})`)
            .setFooter({ text: "ROYAUME X // UNITÉ S-BOT" });
        
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('ACCÉDER AU TERMINAL').setURL(url));

        await smartReply(handler, { content: null, embeds: [embed], components: [row] });
    } catch(e) { await smartReply(handler, { content: `❌ **ERREUR** : L'UUID \`${uuid}\` est invalide ou le quiz est privé.` }); }
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const sub = interaction.options.getSubcommand();

    if (sub === 'ping') {
        const embed = new EmbedBuilder().setColor(0x00FF00).setTitle("📡 DIAGNOSTIC SYSTÈME")
            .addFields(
                { name: "SIGNAL", value: `\`${Date.now()-interaction.createdTimestamp}ms\``, inline: true },
                { name: "BOT API", value: `\`${Math.round(client.ws.ping)}ms\``, inline: true },
                { name: "OCR", value: Tesseract ? "🟢 ACTIF" : "🔴 INACTIF", inline: true }
            );
        return smartReply(interaction, { embeds: [embed] });
    }

    if (sub === 'inject') {
        await interaction.deferReply({ ephemeral: true });
        await processUUID(interaction.options.getString('uuid'), interaction);
    }

    if (sub === 'scan') {
        await interaction.deferReply({ ephemeral: true });
        const att = interaction.options.getAttachment('image');
        if (!Tesseract) Tesseract = require('tesseract.js');
        try {
            const { data: { text } } = await Tesseract.recognize(att.url, 'eng');
            // Regex améliorée pour quizId=... ou UUID brut
            const match = text.match(/quizId=([0-9a-f-]{36})/i) || text.match(/[0-9a-f-]{36}/i);
            if (match) await processUUID(match[1] || match[0], interaction);
            else await interaction.editReply("❌ Aucun UUID détecté sur l'image.");
        } catch(e) { await interaction.editReply("❌ Erreur d'analyse visuelle."); }
    }
});

// Écouteur de messages (Auto-détection UUID ou lien)
client.on('messageCreate', async msg => {
    if(msg.author.bot) return;
    const match = msg.content.match(/quizId=([0-9a-f-]{36})/i) || msg.content.match(/[0-9a-f-]{36}/i);
    if(match) {
        const r = await msg.reply("⚙️ **SCAN AUTOMATIQUE...**");
        await processUUID(match[1] || match[0], { reply: (d) => msg.reply(d), editReply: (d) => r.edit(d) });
    }
});

client.login(process.env.DISCORD_TOKEN);
