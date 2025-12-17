// ==================================================================
// ⚡ 1. SYSTÈME D'AUTO-INSTALLATION (JS UNIQUEMENT)
// ==================================================================
const { execSync } = require('child_process');

console.log("🔄 [JS] Démarrage du système...");

const requiredPackages = ['discord.js', 'axios', 'express', 'dotenv'];
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
// ⚡ 2. SERVEUR NODE.JS & LOGIQUE BOT (DESIGN COSMIC)
// ==================================================================
require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const axios = require('axios');
const express = require('express');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3000;
const scriptsCache = new Map();

// --- SERVEUR WEB ---
app.get('/', (req, res) => res.send('⚡ K-BOT SYSTEM ONLINE'));

// PAGE DE COPIE (DESIGN VIOLET "COSMIC" MAINTENU & CORRIGÉ)
app.get('/copy/:id', (req, res) => {
    const entry = scriptsCache.get(req.params.id);
    if (!entry) return res.send(`<h1 style="color:red;background:#000;height:100vh;display:flex;align-items:center;justify-content:center;font-family:sans-serif;">LIEN EXPIRÉ</h1>`);

    const rawCode = generateClientPayload(entry.data);
    const b64Code = Buffer.from(rawCode).toString('base64');
    
    // CORRECTION : Définition de la variable loader ICI
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
                <textarea id="code">${loader}</textarea> <!-- VARIABLE LOADER UTILISÉE ICI -->
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

// --- GENERATEUR GUI (PLANETE + SUPPORT VRAI/FAUX AMÉLIORÉ) ---
function generateClientPayload(quizData) {
    const json = JSON.stringify(quizData);
    
    // Le SVG de ta planète exacte
    const svg = `<svg version="1.1" viewBox="0 0 205.229 205.229" style="width:100%;height:100%;filter:drop-shadow(0 0 10px rgba(139,92,246,0.5))"><path d="M102.618,205.229c-56.585,0-102.616-46.031-102.616-102.616C0.002,46.031,46.033,0,102.618,0C159.2,0,205.227,46.031,205.227,102.613C205.227,159.198,159.2,205.229,102.618,205.229z M102.618,8.618c-51.829,0-94.002,42.166-94.002,93.995s42.17,93.995,94.002,93.995c51.825,0,93.988-42.162,93.988-93.995C196.606,50.784,154.444,8.618,102.618,8.618z" style="fill:#8b5cf6"/><rect height="8.618" style="fill:#fff" width="193.734" x="5.746" y="98.304"/><path d="M104.941,62.111c-48.644,0-84.94-10.704-87.199-11.388l2.494-8.253c0.816,0.247,82.657,24.336,164.38-0.004l2.452,8.26C158.405,59.266,130.021,62.111,104.941,62.111z" style="fill:#a78bfa"/><path d="M20.416,160.572l-2.459-8.26c84.271-25.081,165.898-1.027,169.333,0l-2.494,8.256C183.976,160.318,102.142,136.24,20.416,160.572z" style="fill:#a78bfa"/></svg>`;
    
    return `
    (function() {
        const _db = ${json};
        const _st = { d: 250, o: 1, a: false, n: true, i: false };
        console.clear(); console.log("%c 🪐 SYSTEM LOADED ", "background:#8b5cf6;color:#fff;padding:5px;border-radius:4px;");

        // Création du conteneur isolé (Shadow DOM)
        const h = document.createElement('div');
        h.id = 'r-'+Math.random().toString(36).substr(2,9);
        Object.assign(h.style, {position:'fixed',top:0,left:0,zIndex:2147483647});
        document.body.appendChild(h);
        const s = h.attachShadow({mode:'closed'});

        const style = document.createElement('style');
        style.textContent = \`
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap');
            * { box-sizing: border-box; font-family: 'Inter', sans-serif; }
            .gui { position: fixed; top: 50px; left: 50px; width: 280px; background: rgba(20,20,30,0.95); backdrop-filter: blur(15px); border: 1px solid rgba(139,92,246,0.3); border-radius: 20px; color: white; box-shadow: 0 20px 60px rgba(0,0,0,0.5); overflow: hidden; transition: 0.3s; display: flex; flex-direction: column; }
            .gui.h { opacity: 0; pointer-events: none; transform: scale(0.8); }
            .head { padding: 15px; background: linear-gradient(90deg, rgba(139,92,246,0.2), transparent); display: flex; justify-content: space-between; align-items: center; cursor: grab; border-bottom: 1px solid rgba(255,255,255,0.05); }
            .body { padding: 20px; display: flex; flex-direction: column; gap: 15px; }
            label { font-size: 10px; color: #a5b4fc; font-weight: 600; text-transform: uppercase; }
            input[type=range] { width: 100%; accent-color: #8b5cf6; height: 4px; cursor: pointer; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            button { padding: 10px; border: none; border-radius: 8px; background: #2e2e36; color: #e0e0e0; font-weight: 600; font-size: 10px; cursor: pointer; transition: 0.2s; }
            button:hover { background: #3f3f46; color: white; }
            button.a { background: #7c3aed; color: white; box-shadow: 0 4px 15px rgba(124,58,237,0.4); }
            .dock { position: fixed; bottom: 30px; left: 30px; width: 70px; height: 70px; cursor: pointer; z-index: 999999; transition: 0.4s; opacity: 0; transform: translateY(60px) rotate(180deg); filter: drop-shadow(0 0 15px rgba(139,92,246,0.4)); }
            .dock.v { opacity: 1; transform: translateY(0) rotate(0deg); }
            .dock:hover { transform: scale(1.15); }
            .toasts { position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); pointer-events: none; display: flex; flex-direction: column; gap: 8px; }
            .t { background: rgba(15,15,20,0.95); color: #fff; padding: 8px 16px; border-radius: 30px; font-size: 11px; border: 1px solid rgba(139,92,246,0.3); backdrop-filter: blur(8px); }
            .input-row { display: flex; align-items: center; gap: 10px; }
            .num-input { background: #27272a; border: 1px solid #3f3f46; color: #fff; width: 60px; padding: 6px; border-radius: 8px; text-align: center; font-weight: 600; font-size: 12px; }
            .num-input:focus { outline: none; border-color: #8b5cf6; }
        \`;
        s.appendChild(style);

        const w = document.createElement('div');
        w.innerHTML = \`
            <div class="gui" id="g">
                <div class="head" id="d">
                    <span style="font-weight:700;font-size:14px">🪐 Tools</span>
                    <div id="m" style="width:20px;height:20px;background:rgba(255,255,255,0.1);border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:10px">_</div>
                </div>
                <div class="body">
                    <div>
                        <label>Vitesse Auto (ms)</label>
                        <div class="input-row">
                            <input type="range" id="rd" min="0" max="3000" step="50" value="250">
                            <input type="number" id="nd" class="num-input" value="250">
                        </div>
                    </div>
                    <div><label>Opacité</label><input type="range" id="ro" min="0.1" max="1" step="0.1" value="1"></div>
                    <div class="grid">
                        <button id="ba">AUTO OFF</button>
                        <button id="bn" class="a">NOTIFS ON</button>
                    </div>
                    <div class="grid">
                        <button id="bi">INCOGNITO</button>
                        <button id="bk" style="color:#f87171;background:rgba(239,68,68,0.15)">DESTROY</button>
                    </div>
                </div>
                <div class="toasts" id="ts"></div>
            </div>
            <div class="dock" id="p">${svg}</div>
        \`;
        s.appendChild(w);

        const $ = (x) => s.querySelector(x);
        const g=$('#g'), p=$('#p');

        function notif(m) {
            if(!_st.n) return;
            const t = document.createElement('div'); t.className='t'; t.innerText=m;
            $('#ts').appendChild(t);
            setTimeout(()=>t.remove(), 2500);
        }

        $('#m').onclick = () => { g.classList.add('h'); p.classList.add('v'); };
        p.onclick = () => { g.classList.remove('h'); p.classList.remove('v'); };
        
        const sync = (v) => { _st.d = parseInt(v); $('#rd').value=v; $('#nd').value=v; };
        $('#rd').oninput = (e) => sync(e.target.value);
        $('#nd').oninput = (e) => sync(e.target.value);
        $('#ro').oninput = (e) => g.style.opacity = e.target.value;
        
        $('#ba').onclick = function() { _st.a=!_st.a; this.innerText=_st.a?"AUTO ON":"AUTO OFF"; this.classList.toggle('a'); notif("Auto-Answer: " + (_st.a?"ON":"OFF")); };
        $('#bn').onclick = function() { _st.n=!_st.n; this.classList.toggle('a'); };
        $('#bi').onclick = function() { _st.i=!_st.i; this.classList.toggle('a'); document.title=_st.i?"Docs":"Kahoot!"; notif("Incognito: " + (_st.i?"ON":"OFF")); };
        $('#bk').onclick = () => { if(confirm('Stop ?')) h.remove(); };

        let down=false, off=[0,0];
        $('#d').addEventListener('mousedown', e => { down=true; off=[g.offsetLeft-e.clientX, g.offsetTop-e.clientY]; });
        document.addEventListener('mouseup', () => down=false);
        document.addEventListener('mousemove', e => { if(down) { g.style.left=(e.clientX+off[0])+'px'; g.style.top=(e.clientY+off[1])+'px'; } });

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
                            b.style.border = "4px solid #8b5cf6";
                            b.style.boxShadow = "0 0 40px rgba(139,92,246,0.8), inset 0 0 20px #8b5cf6";
                            b.style.transform = "scale(1.02)";
                            b.style.zIndex = "9999";
                            notif("Réponse Trouvée !");
                            if(_st.a) { setTimeout(() => { b.click(); b.style.borderColor = "#fff"; }, _st.d); }
                        }
                    }
                });
            }
        });
        obs.observe(document.body, {childList:true, subtree:true});
    })();
    `;
}

// --- BOT DISCORD (PAGINATION ET IMAGES VRAI/FAUX) ---
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const commands = [new SlashCommandBuilder().setName('kahoot').setDescription('Hack Menu').addStringOption(o=>o.setName('uuid').setDescription('UUID du quiz').setRequired(true))].map(c=>c.toJSON());
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
(async()=>{try{await rest.put(Routes.applicationCommands(process.env.CLIENT_ID),{body:commands})}catch(e){}})();

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
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
            
            // Détection dynamique de l'URL pour Render / Replit / Local
            const host = process.env.RENDER_EXTERNAL_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : `http://localhost:${port}`);
            const url = `${host}/copy/${id}`;
            
            let currentIndex = 0;

            const generateEmbed = (idx) => {
                const q = qs[idx];
                const total = qs.length;
                let answerText = "";
                let colorHex = '#8b5cf6';
                let imgUrl = 'https://www.classeetgrimaces.fr/wp-content/uploads/2020/07/Kahoot-Tablette-1024x415.png'; // Image Quiz par défaut

                if (q.type === 'quiz' || q.type === 'multiple_select_quiz') {
                    const shapes = ['🔺 Triangle (Rouge)', '🔷 Losange (Bleu)', '🟡 Rond (Jaune)', '🟩 Carré (Vert)'];
                    if (q.i >= 0 && q.i < shapes.length) {
                        answerText = `**${shapes[q.i]}**\n*${q.a}*`;
                    }
                    if (q.i === 0) colorHex = '#ff3355';
                    if (q.i === 1) colorHex = '#45a3e5';
                    if (q.i === 2) colorHex = '#ffc00a';
                    if (q.i === 3) colorHex = '#66bf39';
                } 
                else if (q.type === 'true_false') {
                    imgUrl = 'https://www.mieuxenseigner.eu/boutique/imagecache/sellers/77769/1614699742_472e49d1760b2b2a6a15c435427c7dba-800x800.jpeg'; // Image Vrai/Faux
                    if (q.a === 'true' || q.a === 'vrai') {
                        answerText = "🔷 **VRAI** (Bleu)";
                        colorHex = '#45a3e5';
                    } else {
                        answerText = "🔺 **FAUX** (Rouge)";
                        colorHex = '#ff3355';
                    }
                } else {
                    answerText = `**Réponse :** ${q.a}`;
                }

                return new EmbedBuilder()
                    .setTitle(`Question ${idx + 1} / ${total}`)
                    .setDescription(`## ${q.q}\n\n${answerText}`)
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

        } catch(e) { 
            console.error(e);
            interaction.editReply("❌ UUID Invalide ou Quiz privé."); 
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
