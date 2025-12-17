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
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;700&display=swap');
            body { 
                background-color: #050505; 
                color: white; 
                font-family: 'Outfit', sans-serif; 
                height: 100vh; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                margin: 0; 
                overflow: hidden;
                background-image: radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.1), transparent 60%);
            }
            .container { text-align: center; position: relative; z-index: 10; }
            .status-dot { 
                height: 20px; width: 20px; 
                background-color: #00ff41; 
                border-radius: 50%; 
                display: inline-block; 
                box-shadow: 0 0 20px #00ff41; 
                animation: pulse 2s infinite; 
                margin-bottom: 20px;
            }
            h1 { 
                font-size: 3.5rem; margin: 0; 
                background: linear-gradient(to right, #fff, #8b5cf6); 
                -webkit-background-clip: text; 
                -webkit-text-fill-color: transparent; 
                font-weight: 700;
            }
            p { color: #888; font-size: 1.2rem; margin-top: 10px; letter-spacing: 1px; }
            
            .orb {
                position: absolute; width: 400px; height: 400px;
                background: #8b5cf6; border-radius: 50%;
                filter: blur(120px); opacity: 0.1; z-index: 0;
                animation: float 10s infinite ease-in-out;
            }
            
            @keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.8); } 100% { opacity: 1; transform: scale(1); } }
            @keyframes float { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(0, -20px); } }
        </style>
    </head>
    <body>
        <div class="orb"></div>
        <div class="container">
            <div class="status-dot"></div>
            <h1>SYSTEM ONLINE</h1>
            <p>BOT DISCORD & INJECTEUR ACTIFS</p>
        </div>
    </body>
    </html>
    `);
});

// 2. PAGE DE COPIE (DESIGN VIOLET "COSMIC")
app.get('/copy/:id', (req, res) => {
    const entry = scriptsCache.get(req.params.id);
    if (!entry) return res.send(`<h1 style="color:red;background:#000;height:100vh;display:flex;align-items:center;justify-content:center;font-family:sans-serif;">LIEN EXPIRÉ</h1>`);

    const rawCode = generateClientPayload(entry.data);
    const b64Code = Buffer.from(rawCode).toString('base64');
    const loader = `eval(decodeURIComponent(escape(window.atob('${b64Code}'))))`;

    res.send(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Kahoot Tool</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;600;800&display=swap');
                :root { --primary: #8b5cf6; --bg: #030014; }
                body {
                    background-color: var(--bg);
                    background-image: radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.15) 0%, transparent 50%);
                    color: white; font-family: 'Outfit', sans-serif;
                    height: 100vh; margin: 0; display: flex; flex-direction: column;
                    align-items: center; justify-content: center; overflow: hidden;
                }
                .card {
                    background: rgba(30, 27, 75, 0.4); backdrop-filter: blur(20px); border: 1px solid rgba(139, 92, 246, 0.2); padding: 40px; border-radius: 24px; width: 90%; max-width: 480px; text-align: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
                }
                h1 { margin: 0 0 10px 0; background: linear-gradient(to right, #fff, #c4b5fd); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                .btn { background: #8b5cf6; color: white; border: none; padding: 18px 32px; border-radius: 14px; font-weight: 700; cursor: pointer; width: 100%; transition: 0.2s; box-shadow: 0 8px 20px rgba(139, 92, 246, 0.25); text-transform: uppercase; }
                .btn:hover { transform: translateY(-2px); background: #7c3aed; }
                textarea { position: absolute; opacity: 0; }
                .status { margin-top: 20px; color: #94a3b8; font-size: 13px; }
            </style>
        </head>
        <body>
            <div class="card">
                <div style="background:rgba(139,92,246,0.15);color:#c4b5fd;padding:6px 16px;border-radius:99px;font-size:12px;font-weight:600;display:inline-block;margin-bottom:20px;">SECURE INJECTOR V10</div>
                <h1>${entry.title}</h1>
                <p style="color:#94a3b8;margin-bottom:30px">Script prêt. Copiez-le ci-dessous.</p>
                <textarea id="code">${loader}</textarea>
                <button class="btn" onclick="cp()">COPIER LE SCRIPT</button>
                <div id="st" class="status">En attente...</div>
            </div>
            <script>
                function cp() {
                    document.getElementById('code').select();
                    try {
                        document.execCommand('copy');
                        const b = document.querySelector('.btn');
                        b.style.background = '#10b981'; b.innerText = "SUCCÈS !";
                        document.getElementById('st').innerText = "✅ Colle le code dans la console (F12)";
                        setTimeout(() => { b.style.background = '#8b5cf6'; b.innerText = "COPIER LE SCRIPT"; }, 3000);
                    } catch(e) { document.getElementById('st').innerText = "Erreur copie manuelle"; }
                }
            </script>
        </body>
        </html>
    `);
});

app.listen(port, () => console.log(`🌍 Serveur actif : ${port}`));

// --- GENERATEUR GUI (STYLE CHEATNETWORK + PLANÈTE) ---
function generateClientPayload(quizData) {
    const json = JSON.stringify(quizData);
    
    // SVG Planète
    const svg = `<svg version="1.1" viewBox="0 0 205.229 205.229" style="width:100%;height:100%;filter:drop-shadow(0 0 5px rgba(139,92,246,0.5))"><path d="M102.618,205.229c-56.585,0-102.616-46.031-102.616-102.616C0.002,46.031,46.033,0,102.618,0C159.2,0,205.227,46.031,205.227,102.613C205.227,159.198,159.2,205.229,102.618,205.229z M102.618,8.618c-51.829,0-94.002,42.166-94.002,93.995s42.17,93.995,94.002,93.995c51.825,0,93.988-42.162,93.988-93.995C196.606,50.784,154.444,8.618,102.618,8.618z" style="fill:#8b5cf6"/><rect height="8.618" style="fill:#fff" width="193.734" x="5.746" y="98.304"/><path d="M104.941,62.111c-48.644,0-84.94-10.704-87.199-11.388l2.494-8.253c0.816,0.247,82.657,24.336,164.38-0.004l2.452,8.26C158.405,59.266,130.021,62.111,104.941,62.111z" style="fill:#a78bfa"/><path d="M20.416,160.572l-2.459-8.26c84.271-25.081,165.898-1.027,169.333,0l-2.494,8.256C183.976,160.318,102.142,136.24,20.416,160.572z" style="fill:#a78bfa"/></svg>`;
    
    return `
    (function() {
        const _db = ${json};
        const _st = { 
            dMin: 500,  // Délai min
            dMax: 1000, // Délai max
            o: 1,       // Opacité Planète (défaut 100%)
            a: false,   // Auto-Select
            n: true,    // Notifications
            i: false    // Incognito
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
            
            /* --- STYLE CHEATNETWORK --- */
            .cheatnetwork-content {
                position: fixed; top: 20px; right: 20px; width: 340px;
                background: rgba(33, 33, 33, 0.95);
                color: #fff; padding: 15px; border-radius: 8px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.6);
                font-size: 14px;
                transition: opacity 0.3s, transform 0.3s;
                border: 1px solid #444;
            }
            .cheatnetwork-content.minimized { opacity: 0; pointer-events: none; transform: scale(0.8); }

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
                padding: 4px; border-radius: 4px; width: 80px; text-align: center;
            }

            .time-group { display: flex; align-items: center; gap: 8px; margin-bottom: 15px; font-size: 12px; color: #bbb; }
            b { color: #888; font-weight: normal; }

            p { font-size: 11px; color: #666; margin-top: 15px; text-align: center; }
            a { color: #8b5cf6; text-decoration: none; }

            /* BOUTON MINIMIZE */
            .min-btn {
                position: absolute; top: 5px; right: 5px;
                width: 15px; height: 15px; background: transparent;
                color: #888; text-align: center; line-height: 12px;
                cursor: pointer; font-size: 10px; font-weight: bold;
            }
            .min-btn:hover { color: #fff; }

            /* --- PLANETE (MODE MINIMISÉ) --- */
            .planet-dock {
                position: fixed; bottom: 20px; left: 20px; /* EN BAS A GAUCHE */
                width: 50px; height: 50px; /* PLUS PETITE */
                cursor: pointer; z-index: 999999;
                transition: 0.4s;
                opacity: 0; transform: translateY(60px) rotate(90deg); /* VERTICAL/ROTATION */
                filter: drop-shadow(0 0 10px rgba(139,92,246,0.4));
            }
            .planet-dock.visible { opacity: 1; transform: translateY(0) rotate(0deg); }
            .planet-dock:hover { transform: scale(1.1); }
            
            /* NOTIFS */
            .toasts { position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); pointer-events: none; display: flex; flex-direction: column; gap: 8px; }
            .t { background: rgba(33,33,33,0.95); color: #fff; padding: 8px 16px; border-radius: 4px; font-size: 12px; border: 1px solid #555; box-shadow: 0 5px 15px rgba(0,0,0,0.5); }
        \`;
        s.appendChild(style);

        const w = document.createElement('div');
        // HTML EXACT DEMANDÉ (Avec modification délai simple)
        w.innerHTML = \`
            <div class="cheatnetwork-content" id="gui">
                <div class="min-btn" id="btnMin" title="Minimize">_</div>

                <div class="cheatnetwork-align">
                    <h2>Auto select:</h2>
                    <input type="button" value="Disabled" id="btnAuto">
                </div>
                
                <h3>Randomize time between</h3>
                <div class="time-group">
                    <input type="number" value="500" id="start" placeholder="500">&nbsp;ms
                    <b>and</b>
                    <input type="number" value="1500" id="end" placeholder="1500">&nbsp;ms
                </div>

                <div class="cheatnetwork-align">
                    <h2>Minimized menu opacity:</h2>
                    <input type="number" value="100" id="opacity" placeholder="100" max="100" min="5">&nbsp;%
                </div>

                <div class="cheatnetwork-align">
                    <h2>Incognito:</h2>
                    <input type="button" value="Disabled" id="btnIncog">
                </div>

                <div class="cheatnetwork-align">
                    <h2>Hide notifications:</h2>
                    <input type="button" value="Disabled" id="btnNotif">
                </div>

                <div class="cheatnetwork-align">
                    <h2>Destruct script:</h2>
                    <input type="button" value="Destruct" id="btnDestruct">
                </div>
                
                <p>(Kahoot Utility v2.0)</p>
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
            planet.style.opacity = _st.o;
        };
        
        planet.onclick = () => {
            gui.classList.remove('minimized');
            planet.classList.remove('visible');
        };

        $('#btnAuto').onclick = function() {
            _st.a = !_st.a;
            this.value = _st.a ? "Enabled" : "Disabled";
            this.className = _st.a ? "enabled" : "";
            if(_st.a) notif("Auto-Select Enabled");
        };

        // Randomize Time Inputs
        $('#start').oninput = (e) => _st.dMin = parseInt(e.target.value) || 0;
        $('#end').oninput = (e) => _st.dMax = parseInt(e.target.value) || 0;

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
            if(_st.i) notif("Incognito Active");
        };

        $('#btnNotif').onclick = function() {
            _st.n = !_st.n;
            this.value = !_st.n ? "Enabled" : "Disabled";
            this.className = !_st.n ? "enabled" : "";
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
                            notif("Found!");
                            
                            if(_st.a) {
                                // Délai randomisé comme demandé dans le GUI
                                const delay = Math.floor(Math.random() * (_st.dMax - _st.dMin + 1) + _st.dMin);
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

// --- BOT DISCORD (Commandes /kahoot (inject) et /kahoot (ping)) ---
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

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'kahoot') {
        
        // Commande /kahoot ping
        if (interaction.options.getSubcommand() === 'ping') {
            const latency = Date.now() - interaction.createdTimestamp;
            return interaction.reply({
                content: `🏓 **Pong!**\n📶 Latence: \`${latency}ms\`\n🤖 API: \`${Math.round(client.ws.ping)}ms\`\n🟢 Statut: **EN LIGNE**`,
                ephemeral: true
            });
        }

        // Commande /kahoot inject
        if (interaction.options.getSubcommand() === 'inject') {
            const uuid = interaction.options.getString('uuid');
            await interaction.deferReply({ ephemeral: true });

            try {
                const res = await axios.get(`https://play.kahoot.it/rest/kahoots/${uuid}`);
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
                
                let currentIndex = 0;
                const generateEmbed = (idx) => {
                    const q = qs[idx];
                    let answerText = "";
                    let colorHex = '#8b5cf6';
                    let imgUrl = 'https://www.classeetgrimaces.fr/wp-content/uploads/2020/07/Kahoot-Tablette-1024x415.png'; 

                    if (q.type === 'quiz' || q.type === 'multiple_select_quiz') {
                        const shapes = ['🔺 Triangle (Rouge)', '🔷 Losange (Bleu)', '🟡 Rond (Jaune)', '🟩 Carré (Vert)'];
                        if (q.i >= 0 && q.i < shapes.length) answerText = `**${shapes[q.i]}**\n*${q.a}*`;
                        if (q.i === 0) colorHex = '#ff3355'; if (q.i === 1) colorHex = '#45a3e5';
                        if (q.i === 2) colorHex = '#ffc00a'; if (q.i === 3) colorHex = '#66bf39';
                    } else if (q.type === 'true_false') {
                        imgUrl = 'https://www.mieuxenseigner.eu/boutique/imagecache/sellers/77769/1614699742_472e49d1760b2b2a6a15c435427c7dba-800x800.jpeg'; 
                        if (q.a === 'true' || q.a === 'vrai') { answerText = "🔷 **VRAI** (Bleu)"; colorHex = '#45a3e5'; } 
                        else { answerText = "🔺 **FAUX** (Rouge)"; colorHex = '#ff3355'; }
                    } else { answerText = `**Réponse :** ${q.a}`; }

                    return new EmbedBuilder()
                        .setTitle(`Q${idx + 1}/${qs.length}`)
                        .setDescription(`**${q.q}**\n\n${answerText}`)
                        .setColor(colorHex)
                        .setImage(imgUrl)
                        .setFooter({ text: "Utilise les boutons pour naviguer" });
                };

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('prev').setLabel('◀️').setStyle(ButtonStyle.Secondary).setDisabled(true),
                    new ButtonBuilder().setCustomId('next').setLabel('▶️').setStyle(ButtonStyle.Secondary).setDisabled(qs.length <= 1),
                    new ButtonBuilder().setLabel('TERMINAL').setStyle(ButtonStyle.Link).setURL(url)
                );

                const msg = await interaction.editReply({ embeds: [generateEmbed(0)], components: [row] });
                const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 600000 });

                collector.on('collect', async i => {
                    if (i.user.id !== interaction.user.id) return i.reply({content:'Pas touche !', ephemeral:true});
                    if (i.customId === 'prev') currentIndex--;
                    if (i.customId === 'next') currentIndex++;
                    if(currentIndex < 0) currentIndex = 0;
                    if(currentIndex >= qs.length) currentIndex = qs.length - 1;
                    row.components[0].setDisabled(currentIndex === 0);
                    row.components[1].setDisabled(currentIndex === qs.length - 1);
                    await i.update({ embeds: [generateEmbed(currentIndex)], components: [row] });
                });

            } catch(e) { interaction.editReply("❌ UUID Invalide ou Quiz privé."); }
        }
    }
});

// OCR
client.on('messageCreate', async message => {
    if (message.author.bot || message.attachments.size === 0) return;
    const attachment = message.attachments.first();
    if (attachment.contentType && attachment.contentType.startsWith('image/')) {
        const replyMsg = await message.reply("🔍 Analyse...");
        try {
            const { data: { text } } = await Tesseract.recognize(attachment.url, 'eng');
            const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
            const match = text.match(uuidRegex);
            if (match) await replyMsg.edit(`✅ **UUID:** \`${match[0]}\``);
            else { await replyMsg.edit("❌ Aucun UUID trouvé."); setTimeout(()=>replyMsg.delete().catch(()=>{}), 5000); }
        } catch (err) { await replyMsg.edit("❌ Erreur OCR."); }
    }
});

client.login(process.env.DISCORD_TOKEN);
