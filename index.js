// ==================================================================
// ⚡ 1. SYSTEME D'AUTO-INSTALLATION (ROBUSTE)
// ==================================================================
const { execSync } = require('child_process');
const fs = require('fs');

console.log("🔄 [SYSTEM] Démarrage du Protocole Realm X (Version Mobile & Pro)...");

const criticalPackages = ['discord.js', 'axios', 'express', 'dotenv', 'tesseract.js']; 

function checkAndInstall(pkgList) {
    pkgList.forEach(pkg => {
        try {
            require.resolve(pkg);
        } catch (e) {
            console.log(`⚠️ [MANQUANT] Module : ${pkg}`);
            try {
                console.log(`🚀 [INSTALLATION] Téléchargement de ${pkg}...`);
                execSync(`npm install ${pkg} --save --no-audit --no-fund`, { stdio: 'inherit' });
            } catch (err) {
                console.error(`❌ [ERREUR] Échec critique pour ${pkg}.`);
            }
        }
    });
}

// Installation rapide des paquets
checkAndInstall(criticalPackages);

// ==================================================================
// ⚡ 2. SERVEUR & LOGIQUE BOT (REALM X)
// ==================================================================
require('dotenv').config();
const { 
    Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, 
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Partials 
} = require('discord.js');
const axios = require('axios');
const express = require('express');
const crypto = require('crypto');
const Tesseract = require('tesseract.js');

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
            .status-box { border: 1px solid #333; padding: 2rem; background: #0a0a0a; box-shadow: 0 0 30px rgba(0,255,0,0.1); text-align: center; border-radius: 8px; }
            .indicator { display: inline-block; width: 10px; height: 10px; background: #0f0; border-radius: 50%; margin-right: 10px; box-shadow: 0 0 10px #0f0; animation: pulse 2s infinite; }
            @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
        </style>
    </head>
    <body>
        <div class="status-box">
            <h1><span class="indicator"></span>REALM X ONLINE</h1>
            <p>S-X UNIT ACTIVE // PORT: ${port}</p>
        </div>
    </body>
    </html>
    `);
});

app.get('/copy/:id', (req, res) => {
    const entry = scriptsCache.get(req.params.id);
    if (!entry) return res.status(404).send("SESSION_EXPIRE - Relancez la commande sur Discord");
    const rawCode = generateClientPayload(entry.data);
    const loader = `eval(decodeURIComponent(escape(window.atob('${Buffer.from(rawCode).toString('base64')}'))))`;
    res.send(`
        <!DOCTYPE html>
        <html lang="fr">
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Terminal // ${entry.title}</title>
        <style>@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');body{background:#111;color:#ccc;font-family:'JetBrains Mono',monospace;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;overflow:hidden}.window{width:90%;max-width:800px;background:#1a1a1a;border:1px solid #333;padding:25px;box-shadow:0 10px 50px #000;border-radius:12px}.code-area{background:#000;padding:15px;color:#0f0;font-size:11px;margin:20px 0;word-break:break-all;border:1px solid #222;max-height:100px;overflow:hidden;border-radius:6px}button{background:#8b5cf6;color:#fff;border:none;padding:15px 25px;font-weight:bold;cursor:pointer;transition:0.2s;width:100%;border-radius:8px;font-size:16px}button:active{transform:scale(0.98);background:#7c3aed}</style>
        </head>
        <body><div class="window"><h2>REALM X // PAYLOAD</h2><p style="font-size:13px; color:#888;">Quiz : <b>${entry.title}</b><br>Collez ce code dans la console (F12) ou via un inspecteur mobile.</p><div class="code-area">${loader.substring(0, 120)}...</div><textarea id="c" style="position:absolute;opacity:0">${loader}</textarea><button onclick="cp()" id="b">COPIER LE SCRIPT</button></div>
        <script>function cp(){const t=document.getElementById('c');t.select();t.setSelectionRange(0, 99999);try{document.execCommand('copy');document.getElementById('b').innerText="COPIÉ !";document.getElementById('b').style.background="#059669";}catch(e){alert("Erreur de copie");}setTimeout(()=> {document.getElementById('b').innerText="COPIER LE SCRIPT";document.getElementById('b').style.background="#8b5cf6";}, 2000);}</script></body></html>
    `);
});

app.listen(port, () => console.log(`🌍 SERVER X ACTIF SUR PORT : ${port}`));

// --- GENERATEUR GUI (OPTIMISÉ MOBILE & PRECISION) ---
function generateClientPayload(quizData) {
    const json = JSON.stringify(quizData);
    const planetSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" style="width:100%;height:100%;"><circle cx="12" cy="12" r="10"></circle><path d="M2 12h20M12 2a15.3 15.3 0 0 1 0 20 15.3 15.3 0 0 1 0-20z"></path></svg>`;
    
    return `
    (function() {
        const _db = ${json};
        const _st = { fixed: false, fixVal: 50, dMin: 300, dMax: 800, o: 1, a: false, mobile: true };
        
        console.log("%c REALM X : INJECTED ", "background:#8b5cf6;color:#fff;padding:5px;border-radius:4px;");

        const host = document.createElement('div');
        host.id = 'rx-' + Date.now();
        Object.assign(host.style, {position:'fixed', top:0, left:0, zIndex:2147483647, pointerEvents:'none'});
        document.body.appendChild(host);
        const root = host.attachShadow({mode:'open'});

        const style = document.createElement('style');
        style.textContent = \`
            * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; user-select: none; }
            .panel { pointer-events: auto; position: fixed; top: 20px; right: 20px; width: 280px; background: rgba(15, 15, 15, 0.95); border: 1px solid #333; border-radius: 16px; color: #fff; padding: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.7); transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s; backdrop-filter: blur(10px); }
            .hidden { opacity: 0; pointer-events: none; transform: scale(0.8) translateY(-20px); }
            .row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; font-size: 11px; font-weight: bold; color: #888; text-transform: uppercase; }
            .row span { color: #ddd; }
            input[type="number"] { background: #000; border: 1px solid #444; color: #0f0; padding: 8px; width: 70px; border-radius: 8px; text-align: center; outline: none; }
            .btn { background: #222; border: 1px solid #444; color: #aaa; padding: 8px 12px; border-radius: 8px; cursor: pointer; font-size: 10px; font-weight: 800; transition: 0.2s; }
            .btn.active { background: #8b5cf6; color: #fff; border-color: #a78bfa; box-shadow: 0 0 15px rgba(139,92,246,0.3); }
            .dock { pointer-events: auto; position: fixed; bottom: 30px; right: 30px; width: 55px; height: 55px; background: #111; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; border: 2px solid #333; opacity: 0; transform: scale(0.5); transition: 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); padding: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
            .dock.visible { opacity: 1; transform: scale(1); }
            .head { margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #222; cursor: move; touch-action: none; text-align: center; }
            .head h1 { margin: 0; font-size: 14px; color: #8b5cf6; font-weight: 900; }
        \`;
        root.appendChild(style);

        const wrap = document.createElement('div');
        wrap.innerHTML = \`
            <div class="panel" id="ui">
                <div class="head" id="drag"><h1>REALM X UNIT</h1></div>
                <div class="row"><span>AUTO-RÉPONSE</span><button class="btn" id="bA">OFF</button></div>
                <div class="row"><span>TYPE DÉLAI</span><button class="btn" id="bMo">ALÉATOIRE</button></div>
                <div id="cfgR">
                    <div class="row"><span>Min (ms)</span><input type="number" id="iMin" value="300"></div>
                    <div class="row"><span>Max (ms)</span><input type="number" id="iMax" value="800"></div>
                </div>
                <div id="cfgE" style="display:none;">
                    <div class="row"><span style="color:#8b5cf6">PRÉCIS (ms)</span><input type="number" id="iEx" value="50"></div>
                </div>
                <button class="btn" style="width:100%; color:#ff4d4d; border-color:#ff4d4d44; margin-top:10px;" id="bX">DÉCONNEXION</button>
            </div>
            <div class="dock" id="dk">\${planetSVG}</div>
        \`;
        root.appendChild(wrap);

        const ui = root.querySelector('#ui'), dk = root.querySelector('#dk');

        root.querySelector('#bA').onclick = function(){ 
            _st.a = !_st.a; 
            this.innerText = _st.a ? "ON" : "OFF"; 
            this.className = _st.a ? "btn active" : "btn"; 
        };
        root.querySelector('#bMo').onclick = function(){ 
            _st.fixed = !_st.fixed; 
            this.innerText = _st.fixed ? "PRÉCIS" : "ALÉATOIRE"; 
            root.querySelector('#cfgR').style.display = _st.fixed ? "none" : "block";
            root.querySelector('#cfgE').style.display = _st.fixed ? "block" : "none";
        };
        root.querySelector('#bX').onclick = () => { if(confirm("Quitter Realm X ?")) host.remove(); };

        // --- GESTION DRAG (TOUCH & MOUSE) ---
        let dragging = false, offset = [0,0];
        const start = (e) => {
            const t = e.touches ? e.touches[0] : e;
            dragging = true;
            offset = [ui.offsetLeft - t.clientX, ui.offsetTop - t.clientY];
        };
        const move = (e) => {
            if(!dragging) return;
            const t = e.touches ? e.touches[0] : e;
            ui.style.left = (t.clientX + offset[0]) + 'px';
            ui.style.top = (t.clientY + offset[1]) + 'px';
            ui.style.right = 'auto';
        };
        root.querySelector('#drag').addEventListener('mousedown', start);
        root.querySelector('#drag').addEventListener('touchstart', start);
        window.addEventListener('mousemove', move);
        window.addEventListener('touchmove', (e) => { if(dragging) e.preventDefault(); move(e); }, {passive:false});
        window.addEventListener('mouseup', () => dragging = false);
        window.addEventListener('touchend', () => dragging = false);

        ui.ondblclick = () => { ui.classList.add('hidden'); dk.classList.add('visible'); };
        dk.onclick = () => { ui.classList.remove('hidden'); dk.classList.remove('visible'); };

        // --- CORE LOGIC (SCANNER) ---
        const scan = () => {
            if(!_st.a) return;
            const bodyText = document.body.innerText.toLowerCase();
            const found = _db.find(item => bodyText.includes(item.q));
            
            if(found) {
                const buttons = document.querySelectorAll('button, [role="button"], [data-functional-selector="answer"]');
                buttons.forEach(btn => {
                    if(btn.dataset.rxOk) return;
                    const btnText = btn.innerText.toLowerCase().trim();
                    if(btnText && (btnText === found.a || btnText.includes(found.a) || found.a.includes(btnText))) {
                        btn.dataset.rxOk = "1";
                        btn.style.boxShadow = "0 0 20px #8b5cf6";
                        btn.style.border = "3px solid #8b5cf6";
                        
                        const delay = _st.fixed ? (parseInt(root.querySelector('#iEx').value)||50) : Math.floor(Math.random()*(parseInt(root.querySelector('#iMax').value)-parseInt(root.querySelector('#iMin').value))+parseInt(root.querySelector('#iMin').value));
                        
                        setTimeout(() => {
                            // Simulation clic robuste Mobile/iOS
                            ['touchstart', 'touchend', 'mousedown', 'mouseup', 'click'].forEach(evt => {
                                btn.dispatchEvent(new Event(evt, { bubbles: true }));
                            });
                        }, delay);
                    }
                });
            }
        };

        const observer = new MutationObserver(scan);
        observer.observe(document.body, {childList: true, subtree: true});
    })();
    `;
}

// ==================================================================
// ⚡ 3. DISCORD CLIENT & COMMANDES
// ==================================================================
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Message, Partials.Channel]
});

const commands = [
    new SlashCommandBuilder().setName('kahoot').setDescription('Menu Principal Realm X')
        .addSubcommand(s => s.setName('inject').setDescription('Générer via UUID').addStringOption(o=>o.setName('uuid').setDescription('L\'UUID du quiz').setRequired(true)))
        .addSubcommand(s => s.setName('scan').setDescription('Analyser une image (URL ou Upload)').addAttachmentOption(o=>o.setName('image').setDescription('Capture d\'écran du quiz').setRequired(true)))
        .addSubcommand(s => s.setName('ping').setDescription('Vérifier l\'état du système'))
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
(async () => { 
    try { 
        console.log("🛠️ Enregistrement des commandes Slash...");
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands }); 
        console.log("✅ Commandes enregistrées.");
    } catch(e){ console.error("❌ Erreur REST:", e); } 
})();

async function processUUID(uuid, handler, isInteraction = true) {
    try {
        const cleanUUID = uuid.trim();
        const res = await axios.get(`https://play.kahoot.it/rest/kahoots/${cleanUUID}`);
        const data = res.data.questions.map(q => {
            const correct = q.choices ? q.choices.find(c => c.correct) : null;
            return {
                q: q.question ? q.question.replace(/<[^>]*>/g,'').toLowerCase().substring(0,60).trim() : "image_q",
                a: correct ? correct.answer.replace(/<[^>]*>/g,'').trim().toLowerCase() : "unknown"
            };
        });

        const sid = crypto.randomUUID();
        scriptsCache.set(sid, { data, title: res.data.title || "Quiz Kahoot" });
        const url = `${process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`}/copy/${sid}`;

        const embed = new EmbedBuilder().setColor(0x8b5cf6)
            .setTitle(`🔓 S-X UNIT : INJECTION PRÊTE`)
            .setDescription(`**CIBLE :** \`${res.data.title}\`\n**QUESTIONS :** ${data.length}\n\n[>> OUVRIR LE TERMINAL <<](${url})`)
            .setFooter({ text: "SYSTÈME REALM X // S-BOT 2.0" });
        
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('ACCÉDER AU TERMINAL').setURL(url)
        );

        if(isInteraction) await handler.editReply({ embeds: [embed], components: [row] });
        else await handler.reply({ embeds: [embed], components: [row] });

    } catch(e) {
        const errorMsg = "❌ **ERREUR** : UUID invalide ou quiz privé.";
        if(isInteraction) await handler.editReply(errorMsg);
        else await handler.reply(errorMsg);
    }
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const sub = interaction.options.getSubcommand();

    if (sub === 'ping') {
        const pingEmbed = new EmbedBuilder().setColor(0x00FF00).setTitle("📡 DIAGNOSTIC RÉSEAU")
            .addFields(
                { name: "BOT LATENCE", value: `\`${Math.round(client.ws.ping)}ms\``, inline: true },
                { name: "API STATUS", value: "🟢 OPÉRATIONNEL", inline: true }
            );
        return interaction.reply({ embeds: [pingEmbed] });
    }

    if (sub === 'inject') {
        await interaction.deferReply({ ephemeral: true });
        await processUUID(interaction.options.getString('uuid'), interaction);
    }

    if (sub === 'scan') {
        await interaction.deferReply({ ephemeral: true });
        const att = interaction.options.getAttachment('image');
        
        try {
            const { data: { text } } = await Tesseract.recognize(att.url, 'eng');
            const match = text.match(/[0-9a-f-]{36}/i);
            if (match) await processUUID(match[0], interaction);
            else await interaction.editReply("❌ Aucun UUID détecté sur l'image.");
        } catch(e) { 
            console.error(e);
            await interaction.editReply("❌ Échec de l'analyse OCR."); 
        }
    }
});

client.on('messageCreate', async msg => {
    if(msg.author.bot) return;
    const match = msg.content.match(/quizId=([0-9a-f-]{36})/i) || msg.content.match(/[0-9a-f-]{36}/i);
    if(match) {
        await processUUID(match[1] || match[0], msg, false);
    }
});

client.login(process.env.DISCORD_TOKEN);

