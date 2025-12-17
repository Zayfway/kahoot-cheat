// ==================================================================
// ⚡ 1. SYSTÈME D'AUTO-INSTALLATION (JS UNIQUEMENT)
// ==================================================================
const { execSync } = require('child_process');

console.log("🔄 [JS] Démarrage du système...");

const requiredPackages = ['discord.js', 'axios', 'express', 'dotenv', 'tesseract.js'];
let needInstall = false;

requiredPackages.forEach(pkg => {
    try { require.resolve(pkg); } catch (e) {
        console.log(`❌ [MANQUANT] Module JS : ${pkg}`);
        needInstall = true;
    }
});

if (needInstall) {
    console.log("🚀 [INSTALLATION JS]...");
    try { execSync(`npm install ${requiredPackages.join(' ')} --save --no-audit --no-fund`, { stdio: 'inherit' }); } 
    catch (error) { console.error("Erreur install JS.", error); }
}

// ==================================================================
// ⚡ 2. SERVEUR NODE.JS & LOGIQUE BOT
// ==================================================================
require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, Partials } = require('discord.js');
const axios = require('axios');
const express = require('express');
const crypto = require('crypto');
const Tesseract = require('tesseract.js'); 

const app = express();
const port = process.env.PORT || 3000;
const scriptsCache = new Map();

// --- SERVEUR WEB ---

// 1. PAGE D'ACCUEIL STYLÉE (STATUS PAGE)
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>K-BOT Status</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap');
            body { 
                background-color: #0a0a0a; 
                color: #00ff00; 
                font-family: 'Courier Prime', monospace; 
                height: 100vh; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                margin: 0; 
                overflow: hidden;
            }
            .container { text-align: center; border: 1px solid #00ff00; padding: 40px; box-shadow: 0 0 20px rgba(0, 255, 0, 0.2); background: rgba(0,0,0,0.8); }
            h1 { font-size: 2rem; margin: 0; text-shadow: 0 0 10px #00ff00; }
            p { color: #ccffcc; font-size: 1rem; margin-top: 10px; }
            .blink { animation: blink 1s infinite; }
            @keyframes blink { 50% { opacity: 0; } }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>SYSTEM ONLINE <span class="blink">_</span></h1>
            <p>OPERATIONAL IN REALM X</p>
        </div>
    </body>
    </html>
    `);
});

// 2. PAGE DE COPIE (DESIGN STYLE "IMAGE" / HACKER)
app.get('/copy/:id', (req, res) => {
    const entry = scriptsCache.get(req.params.id);
    if (!entry) return res.send(`<h1 style="color:red;background:#000;height:100vh;display:flex;align-items:center;justify-content:center;font-family:monospace;">SESSION EXPIRED</h1>`);

    const rawCode = generateClientPayload(entry.data);
    const b64Code = Buffer.from(rawCode).toString('base64');
    const loader = `eval(decodeURIComponent(escape(window.atob('${b64Code}'))))`;

    res.send(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Injector // ${entry.title}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;700&display=swap');
                body {
                    background-color: #111;
                    color: #ddd;
                    font-family: 'Roboto Mono', monospace;
                    height: 100vh; margin: 0; display: flex; flex-direction: column;
                    align-items: center; justify-content: center;
                }
                .terminal-window {
                    background: #1e1e1e;
                    width: 80%; max-width: 700px;
                    border-radius: 6px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                    border: 1px solid #333;
                    overflow: hidden;
                }
                .terminal-header {
                    background: #2d2d2d; padding: 10px 15px;
                    display: flex; gap: 8px; align-items: center;
                    border-bottom: 1px solid #333;
                }
                .dot { width: 12px; height: 12px; border-radius: 50%; }
                .red { background: #ff5f56; } .yellow { background: #ffbd2e; } .green { background: #27c93f; }
                .title { margin-left: 10px; font-size: 12px; color: #888; }
                
                .terminal-body { padding: 20px; text-align: left; }
                h2 { color: #fff; margin-top: 0; font-size: 18px; }
                .code-block {
                    background: #000; color: #00ff00;
                    padding: 15px; border-radius: 4px;
                    border: 1px solid #333;
                    margin: 15px 0;
                    font-size: 12px;
                    overflow-x: auto;
                    white-space: nowrap;
                    position: relative;
                }
                
                .btn {
                    background: #27c93f; color: #000;
                    border: none; padding: 12px 24px;
                    border-radius: 4px; font-weight: bold;
                    cursor: pointer; font-family: inherit;
                    display: block; width: 100%; margin-top: 20px;
                    transition: 0.2s;
                }
                .btn:hover { background: #22b037; }
                textarea { position: absolute; opacity: 0; pointer-events: none; }
                .info { color: #666; font-size: 11px; margin-top: 10px; }
            </style>
        </head>
        <body>
            <div class="terminal-window">
                <div class="terminal-header">
                    <div class="dot red"></div><div class="dot yellow"></div><div class="dot green"></div>
                    <span class="title">root@injector:~/kahoot/${entry.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}</span>
                </div>
                <div class="terminal-body">
                    <h2>Target: ${entry.title}</h2>
                    <div style="color:#aaa; font-size:13px; margin-bottom:10px;">Payload generated. Inject via Console (F12).</div>
                    
                    <div class="code-block" id="displayCode">${loader.substring(0, 50)}... [HIDDEN_PAYLOAD_V10]</div>
                    <textarea id="code">${loader}</textarea>
                    
                    <button class="btn" onclick="cp()">COPY PAYLOAD</button>
                    <div class="info" id="st">Ready to inject.</div>
                </div>
            </div>
            <script>
                function cp() {
                    const t = document.getElementById('code');
                    t.select();
                    try {
                        document.execCommand('copy');
                        const b = document.querySelector('.btn');
                        b.style.background = '#fff'; b.innerText = "COPIED!";
                        document.getElementById('st').innerText = "Paste into Developer Console (F12) > Console tab";
                        setTimeout(() => { b.style.background = '#27c93f'; b.innerText = "COPY PAYLOAD"; }, 2000);
                    } catch(e) { alert("Copy failed"); }
                }
            </script>
        </body>
        </html>
    `);
});

app.listen(port, () => console.log(`🌍 Serveur actif : ${port}`));

// --- GENERATEUR GUI (MODIFIÉ: PRÉCISION MS, OPACITÉ, PLANÈTE) ---
function generateClientPayload(quizData) {
    const json = JSON.stringify(quizData);
    
    // SVG Planète
    const svg = `<svg version="1.1" viewBox="0 0 205.229 205.229" style="width:100%;height:100%;filter:drop-shadow(0 0 5px rgba(139,92,246,0.5))"><path d="M102.618,205.229c-56.585,0-102.616-46.031-102.616-102.616C0.002,46.031,46.033,0,102.618,0C159.2,0,205.227,46.031,205.227,102.613C205.227,159.198,159.2,205.229,102.618,205.229z M102.618,8.618c-51.829,0-94.002,42.166-94.002,93.995s42.17,93.995,94.002,93.995c51.825,0,93.988-42.162,93.988-93.995C196.606,50.784,154.444,8.618,102.618,8.618z" style="fill:#8b5cf6"/><rect height="8.618" style="fill:#fff" width="193.734" x="5.746" y="98.304"/><path d="M104.941,62.111c-48.644,0-84.94-10.704-87.199-11.388l2.494-8.253c0.816,0.247,82.657,24.336,164.38-0.004l2.452,8.26C158.405,59.266,130.021,62.111,104.941,62.111z" style="fill:#a78bfa"/><path d="M20.416,160.572l-2.459-8.26c84.271-25.081,165.898-1.027,169.333,0l-2.494,8.256C183.976,160.318,102.142,136.24,20.416,160.572z" style="fill:#a78bfa"/></svg>`;
    
    return `
    (function() {
        const _db = ${json};
        const _st = { 
            fixed: false, // Mode Fixe vs Random
            fixVal: 500,  // Valeur fixe
            dMin: 500,    // Délai min
            dMax: 1000,   // Délai max
            o: 1,         // Opacité Planète
            a: false,     // Auto-Select
            n: true,      // Notifications
            i: false      // Incognito
        };
        console.clear(); 

        const h = document.createElement('div');
        h.id = 'r-'+Math.random().toString(36).substr(2,9);
        Object.assign(h.style, {position:'fixed',top:0,left:0,zIndex:2147483647});
        document.body.appendChild(h);
        const s = h.attachShadow({mode:'closed'});

        const style = document.createElement('style');
        style.textContent = \`
            @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
            * { box-sizing: border-box; font-family: 'Roboto', sans-serif; }
            
            .cheatnetwork-content {
                position: fixed; top: 20px; right: 20px; width: 340px;
                background: rgba(33, 33, 33, 0.98);
                color: #fff; padding: 15px; border-radius: 8px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.6);
                font-size: 14px;
                transition: opacity 0.3s, transform 0.3s;
                border: 1px solid #444;
                opacity: 1; pointer-events: auto;
            }
            .cheatnetwork-content.minimized { 
                opacity: 0; pointer-events: none; transform: scale(0.9); display: none; 
            }

            .cheatnetwork-align {
                display: flex; justify-content: space-between; align-items: center;
                margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #444;
            }

            h2 { margin: 0; font-size: 14px; font-weight: 700; color: #eee; }
            h3 { margin: 0 0 8px 0; font-size: 12px; color: #aaa; text-transform: uppercase; }

            input[type="button"] {
                background: #ff4444; color: white; border: none; padding: 6px 12px;
                border-radius: 4px; cursor: pointer; font-weight: bold; transition: 0.2s;
                font-size: 12px; min-width: 80px;
            }
            input[type="button"].enabled { background: #00c853; }
            
            #btnDestruct { background: #b71c1c; color: #ff8a80; }
            #btnDestruct:hover { background: #d32f2f; }

            input[type="number"] {
                background: #222; border: 1px solid #555; color: white;
                padding: 4px; border-radius: 4px; width: 70px; text-align: center;
            }
            
            input[type="checkbox"] { transform: scale(1.2); cursor: pointer; }

            .time-group { display: flex; align-items: center; gap: 8px; margin-bottom: 15px; font-size: 12px; color: #bbb; }
            .hidden { display: none !important; }

            p { font-size: 11px; color: #666; margin-top: 15px; text-align: center; }
            a { color: #8b5cf6; text-decoration: none; }

            .min-btn {
                position: absolute; top: 5px; right: 5px;
                width: 15px; height: 15px; background: transparent;
                color: #888; text-align: center; line-height: 12px;
                cursor: pointer; font-size: 10px; font-weight: bold;
            }
            .min-btn:hover { color: #fff; }

            /* --- PLANETE (MODIFIÉ: BAS GAUCHE HORIZONTAL) --- */
            .planet-dock {
                position: fixed; bottom: 20px; left: 20px; 
                width: 50px; height: 50px; 
                cursor: pointer; z-index: 999999;
                transition: 0.4s;
                opacity: 0; 
                transform: translateX(-100px); /* Cache vers la gauche */
                filter: drop-shadow(0 0 10px rgba(139,92,246,0.4));
            }
            .planet-dock.visible { opacity: 1; transform: translateX(0); }
            .planet-dock:hover { transform: scale(1.1); }
            
            .toasts { position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); pointer-events: none; display: flex; flex-direction: column; gap: 8px; }
            .t { background: rgba(33,33,33,0.95); color: #fff; padding: 8px 16px; border-radius: 4px; font-size: 12px; border: 1px solid #555; box-shadow: 0 5px 15px rgba(0,0,0,0.5); }
        \`;
        s.appendChild(style);

        const w = document.createElement('div');
        w.innerHTML = \`
            <div class="cheatnetwork-content" id="gui">
                <div class="min-btn" id="btnMin" title="Minimize">_</div>

                <div class="cheatnetwork-align">
                    <h2>Auto select:</h2>
                    <input type="button" value="Disabled" id="btnAuto">
                </div>
                
                <h3>Answer Delay (ms)</h3>
                <div class="cheatnetwork-align" style="border:none; padding-bottom:5px; margin-bottom:5px;">
                    <span>Use Exact Time:</span>
                    <input type="checkbox" id="chkFixed">
                </div>
                
                <div class="time-group" id="grpRange">
                    <input type="number" value="500" id="start"> <b>to</b>
                    <input type="number" value="1500" id="end"> ms
                </div>
                <div class="time-group hidden" id="grpFixed">
                    <b>Exact:</b> <input type="number" value="500" id="exact"> ms
                </div>

                <div class="cheatnetwork-align">
                    <h2>Planet Opacity:</h2>
                    <input type="number" value="100" id="opacity" placeholder="100" max="100" min="5">&nbsp;%
                </div>

                <div class="cheatnetwork-align">
                    <h2>Incognito:</h2>
                    <input type="button" value="Disabled" id="btnIncog">
                </div>

                <div class="cheatnetwork-align">
                    <h2>Destruct:</h2>
                    <input type="button" value="Destruct" id="btnDestruct">
                </div>
                
                <p>Bot Active | Realm X</p>
            </div>

            <div class="planet-dock" id="planet">
                ${svg}
            </div>
            
            <div class="toasts" id="ts"></div>
        \`;
        s.appendChild(w);

        const $ = (x) => s.querySelector(x);
        const gui = $('#gui');
        const planet = $('#planet');

        // GESTION DELAI FIXE/RANGE
        const chkFixed = $('#chkFixed');
        const grpRange = $('#grpRange');
        const grpFixed = $('#grpFixed');

        chkFixed.onchange = () => {
            _st.fixed = chkFixed.checked;
            if(_st.fixed) {
                grpRange.classList.add('hidden');
                grpFixed.classList.remove('hidden');
            } else {
                grpRange.classList.remove('hidden');
                grpFixed.classList.add('hidden');
            }
        };

        $('#exact').oninput = (e) => _st.fixVal = parseInt(e.target.value) || 0;
        $('#start').oninput = (e) => _st.dMin = parseInt(e.target.value) || 0;
        $('#end').oninput = (e) => _st.dMax = parseInt(e.target.value) || 0;

        function notif(m) {
            if(!_st.n) return;
            const t = document.createElement('div'); t.className='t'; t.innerText=m;
            $('#ts').appendChild(t);
            setTimeout(()=>t.remove(), 2500);
        }

        // --- EVENTS ---
        
        $('#btnMin').onclick = () => {
            gui.classList.add('minimized');
            planet.classList.add('visible');
            planet.style.opacity = _st.o; // Applique l'opacité au bouton planete
        };
        
        planet.onclick = () => {
            gui.classList.remove('minimized');
            planet.classList.remove('visible');
        };

        $('#btnAuto').onclick = function() {
            _st.a = !_st.a;
            this.value = _st.a ? "Enabled" : "Disabled";
            this.className = _st.a ? "enabled" : "";
            if(_st.a) notif("Auto-Bot Activated");
        };

        $('#opacity').oninput = (e) => {
            let val = parseInt(e.target.value);
            if(val < 5) val = 5; if(val > 100) val = 100;
            _st.o = val / 100;
            planet.style.opacity = _st.o; 
        };

        $('#btnIncog').onclick = function() {
            _st.i = !_st.i;
            this.value = _st.i ? "Enabled" : "Disabled";
            this.className = _st.i ? "enabled" : "";
            document.title = _st.i ? "Google Docs" : "Kahoot!";
            if(_st.i) notif("Incognito Mode");
        };

        $('#btnDestruct').onclick = () => {
            if(confirm("Destroy Script?")) h.remove();
        };

        let down=false, off=[0,0];
        gui.addEventListener('mousedown', e => { 
            if(e.target.tagName === 'INPUT' || e.target.tagName === 'A') return;
            down=true; off=[gui.offsetLeft-e.clientX, gui.offsetTop-e.clientY]; 
        });
        document.addEventListener('mouseup', () => down=false);
        document.addEventListener('mousemove', e => { 
            if(down) { gui.style.left=(e.clientX+off[0])+'px'; gui.style.top=(e.clientY+off[1])+'px'; } 
        });

        // --- CORE LOGIC ---
        const obs = new MutationObserver(() => {
            const txt = document.body.innerText.toLowerCase();
            const q = _db.find(x => txt.includes(x.q));
            if(q) {
                document.querySelectorAll('[data-functional-selector="answer"], button, span, div[role="button"]').forEach(el => {
                    const elText = el.innerText ? el.innerText.toLowerCase().trim() : "";
                    const targetText = q.a.trim();

                    if(elText && (elText === targetText || elText.includes(targetText) || targetText.includes(elText))) {
                        
                        if(el.dataset.k) return;
                        el.dataset.k="1";
                        
                        let b = el.closest('button') || el.closest('[role="button"]') || el.parentElement;
                        
                        if(b) {
                            b.style.transition = "all 0.2s";
                            b.style.border = "4px solid #00ff00";
                            b.style.boxShadow = "0 0 20px #00ff00";
                            b.style.transform = "scale(1.02)";
                            b.style.zIndex = "9999";
                            notif("Target Identified");
                            
                            if(_st.a) {
                                let delay = 0;
                                if(_st.fixed) {
                                    delay = _st.fixVal;
                                } else {
                                    delay = Math.floor(Math.random() * (_st.dMax - _st.dMin + 1) + _st.dMin);
                                }
                                setTimeout(() => { b.click(); }, delay);
                            }
                        }
                    }
                });
            }
        });
        obs.observe(document.body, {childList:true, subtree:true});
    })();
    `;
}

// --- BOT DISCORD (Commandes /kahoot et écouteurs) ---
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent], partials: [Partials.Channel] });

const commands = [
    new SlashCommandBuilder()
        .setName('kahoot')
        .setDescription('Outils Kahoot')
        .addSubcommand(sub => 
            sub.setName('inject')
               .setDescription('Générer le script d\'injection')
               .addStringOption(o => o.setName('uuid').setDescription('UUID du quiz').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('ping')
               .setDescription('Vérifier le statut et la latence')
        )
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try { await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands }); } 
    catch (e) { console.error('Erreur Commandes', e); }
})();

// Fonction Helper pour Injecter
async function handleInjection(uuid, interactionOrMessage) {
    const isInteraction = !!interactionOrMessage.reply;
    const reply = (content) => isInteraction ? interactionOrMessage.editReply(content) : interactionOrMessage.reply(content);

    try {
        const res = await axios.get(`https://play.kahoot.it/rest/kahoots/${uuid}`);
        if(res.data.error) throw new Error("Private/Error");

        const qs = res.data.questions.map(q => {
            const cleanQ = q.question ? q.question.replace(/<[^>]*>?/gm,'').toLowerCase().substring(0,100) : "img";
            const correctChoice = q.choices ? q.choices.find(c => c.correct) : null;
            const correctIndex = q.choices ? q.choices.indexOf(correctChoice) : -1;
            let cleanA = "img"; 
            if (correctChoice) cleanA = correctChoice.answer ? correctChoice.answer.replace(/<[^>]*>?/gm,'').trim().toLowerCase() : "img";
            return { q: cleanQ, a: cleanA, i: correctIndex, type: q.type };
        });

        const id = crypto.randomUUID();
        scriptsCache.set(id, {data:qs, title:res.data.title});
        const host = process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`;
        const url = `${host}/copy/${id}`;
        
        // Création de l'Embed de réponse
        const embed = new EmbedBuilder()
            .setTitle(`🔓 INJECTION REUSSIE: ${res.data.title}`)
            .setDescription(`**UUID:** \`${uuid}\`\n**Questions:** ${qs.length}\n\n[>> CLIQUER ICI POUR LE SCRIPT <<](${url})`)
            .setColor('#00ff00')
            .setFooter({ text: "Realm X Infiltration" });
            
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('OUVRIR LE TERMINAL').setStyle(ButtonStyle.Link).setURL(url)
        );

        await reply({ content:null, embeds: [embed], components: [row] });

    } catch(e) {
        await reply(`❌ **ERREUR:** UUID Invalide, Quiz Privé, ou Bloqué par Kahoot.\nVérifiez que l'UUID est correct: \`${uuid}\``);
    }
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'kahoot') {
        
        if (interaction.options.getSubcommand() === 'ping') {
            const latency = Date.now() - interaction.createdTimestamp;
            return interaction.reply({
                content: `🏓 **Pong!**\n📶 Latence: \`${latency}ms\`\n🤖 API: \`${Math.round(client.ws.ping)}ms\`\n🟢 Statut: **EN LIGNE (REALM X)**`,
                ephemeral: true
            });
        }

        if (interaction.options.getSubcommand() === 'inject') {
            const uuid = interaction.options.getString('uuid');
            await interaction.deferReply({ ephemeral: true });
            await handleInjection(uuid, interaction);
        }
    }
});

// ÉCOUTEUR DE MESSAGE (OCR + UUID TEXTE)
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    // 1. Détection UUID Brut dans le texte
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const textMatch = message.content.match(uuidRegex);
    
    if (textMatch) {
        const uuid = textMatch[0];
        const msg = await message.reply(`🕵️ **UUID Détecté:** \`${uuid}\`\nTentative d'extraction...`);
        // Simuler un objet "interaction-like" pour réutiliser la fonction
        await handleInjection(uuid, { 
            reply: (c) => msg.reply(c), 
            editReply: (c) => msg.edit(c) 
        });
        return;
    }

    // 2. OCR sur Image
    if (message.attachments.size > 0) {
        const attachment = message.attachments.first();
        if (attachment.contentType && attachment.contentType.startsWith('image/')) {
            const replyMsg = await message.reply("🔍 Analyse visuelle en cours...");
            try {
                const { data: { text } } = await Tesseract.recognize(attachment.url, 'eng');
                const match = text.match(uuidRegex);
                if (match) {
                    await replyMsg.edit(`✅ **UUID Trouvé:** \`${match[0]}\`\nLancement de l'injection...`);
                    await handleInjection(match[0], { 
                        reply: (c) => message.reply(c), 
                        editReply: (c) => replyMsg.edit(c) 
                    });
                }
                else { 
                    await replyMsg.edit("❌ Aucun UUID lisible dans l'image."); 
                    setTimeout(()=>replyMsg.delete().catch(()=>{}), 5000); 
                }
            } catch (err) { await replyMsg.edit("❌ Erreur OCR Critique."); }
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
