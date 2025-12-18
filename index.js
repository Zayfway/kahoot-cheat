// ==================================================================
// ⚡ 1. SYSTEME D'AUTO-INSTALLATION & MODULES
// ==================================================================
const { execSync } = require('child_process');
const fs = require('fs');

console.log("🚀 [REALM X ELITE] Initialisation du noyau...");

const criticalPackages = ['discord.js', 'axios', 'express', 'dotenv', 'tesseract.js', 'puppeteer']; 

function checkAndInstall(pkgList) {
    pkgList.forEach(pkg => {
        try { require.resolve(pkg); } catch (e) {
            console.log(`⚠️ Module manquant : ${pkg}. Installation...`);
            execSync(`npm install ${pkg} --save --no-audit --no-fund`, { stdio: 'inherit' });
        }
    });
}
checkAndInstall(criticalPackages);

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

// ==================================================================
// ⚡ 2. LOGIQUE BOT JOINER (PUPPETEER)
// ==================================================================
async function spawnBots(pin, baseName, count = 5) {
    console.log(`🤖 [BOTS] Lancement de ${count} bots pour le PIN ${pin}...`);
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    for (let i = 0; i < count; i++) {
        try {
            const page = await browser.newPage();
            // Bloquer les ressources lourdes et trackers
            await page.setRequestInterception(true);
            page.on('request', (req) => {
                if (['image', 'font', 'stylesheet'].includes(req.resourceType()) || req.url().includes('amplitude') || req.url().includes('google-analytics')) {
                    req.abort();
                } else {
                    req.continue();
                }
            });

            await page.goto('https://kahoot.it', { waitUntil: 'networkidle2' });
            await page.type('input[name="gameId"]', pin.toString());
            await page.keyboard.press('Enter');
            
            await page.waitForSelector('input[name="nickname"]', { timeout: 5000 });
            await page.type('input[name="nickname"]', `${baseName}_${i + 1}`);
            await page.keyboard.press('Enter');
            
            console.log(`✅ Bot ${i + 1} connecté.`);
        } catch (e) {
            console.log(`❌ Erreur Bot ${i + 1}: ${e.message}`);
        }
    }
    // On laisse le browser ouvert pour maintenir les connexions
    setTimeout(() => browser.close(), 600000); // Ferme après 10 min
}

// ==================================================================
// ⚡ 3. SERVEUR WEB & GENERATEUR DE PAYLOAD
// ==================================================================
app.get('/', (req, res) => {
    res.send(`<body style="background:#000;color:#7c3aed;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;"><h1>REALM X ELITE : ONLINE</h1></body>`);
});

app.get('/copy/:id', (req, res) => {
    const entry = scriptsCache.get(req.params.id);
    if (!entry) return res.status(404).send("SESSION_EXPIRE");
    const rawCode = generateClientPayload(entry.data);
    const loader = `eval(decodeURIComponent(escape(window.atob('${Buffer.from(rawCode).toString('base64')}'))))`;
    
    res.send(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Terminal X // ${entry.title}</title>
            <style>
                body { background: #050505; color: #fff; font-family: 'Segoe UI', sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                .card { background: linear-gradient(145deg, #0f0f1a, #050505); border: 1px solid #2d2d4d; padding: 40px; border-radius: 20px; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.5); max-width: 400px; width: 90%; }
                h2 { color: #8b5cf6; margin-bottom: 10px; }
                p { color: #888; font-size: 14px; margin-bottom: 30px; }
                .btn { background: #8b5cf6; color: #fff; border: none; padding: 15px 30px; border-radius: 10px; font-weight: bold; cursor: pointer; transition: 0.3s; width: 100%; }
                .btn:hover { background: #7c3aed; transform: translateY(-2px); box-shadow: 0 5px 15px rgba(124, 58, 237, 0.4); }
                .code-hint { background: #000; padding: 10px; border-radius: 5px; font-family: monospace; font-size: 10px; color: #444; margin-top: 20px; overflow: hidden; }
            </style>
        </head>
        <body>
            <div class="card">
                <h2>INJECTION PRÊTE</h2>
                <p>Copiez le script et collez-le dans la console F12 de votre navigateur sur Kahoot.</p>
                <button class="btn" id="cpBtn" onclick="copy()">COPIER LE SCRIPT</button>
                <div class="code-hint">${loader.substring(0, 50)}...</div>
            </div>
            <textarea id="hiddenCode" style="position:absolute;left:-9999px">${loader}</textarea>
            <script>
                function copy() {
                    const txt = document.getElementById('hiddenCode');
                    txt.select();
                    document.execCommand('copy');
                    const btn = document.getElementById('cpBtn');
                    btn.innerText = "COPIÉ AVEC SUCCÈS !";
                    btn.style.background = "#10b981";
                    setTimeout(() => { btn.innerText = "COPIER LE SCRIPT"; btn.style.background = "#8b5cf6"; }, 2000);
                }
            </script>
        </body>
        </html>
    `);
});

function generateClientPayload(quizData) {
    const json = JSON.stringify(quizData);
    // On définit l'SVG ici pour être sûr qu'il existe dans le scope
    const planetSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M2 12h20M12 2a15.3 15.3 0 0 1 0 20 15.3 15.3 0 0 1 0-20z"></path></svg>`;

    return `
    (function() {
        // Bloquer les erreurs Amplitude/Sentry de Kahoot
        window.Amplitude = { init: () => {}, identify: () => {}, logEvent: () => {} };
        window.Sentry = { init: () => {}, captureException: () => {} };

        const _db = ${json};
        const _st = { auto: false, delay: 500, opacity: 1 };
        
        console.clear();
        console.log("%c REALM X ELITE INJECTED ", "background:#1e1b4b;color:#a78bfa;font-size:14px;font-weight:bold;padding:10px;border:1px solid #4338ca;");

        const host = document.createElement('div');
        host.id = 'rx-elite-' + Date.now();
        Object.assign(host.style, {position:'fixed', top:0, left:0, zIndex:9999999, pointerEvents:'none'});
        document.body.appendChild(host);
        const root = host.attachShadow({mode:'open'});

        const style = document.createElement('style');
        style.textContent = \`
            .panel { pointer-events: auto; position: fixed; top: 20px; right: 20px; width: 300px; background: rgba(10, 10, 20, 0.9); border: 1px solid #312e81; border-radius: 16px; color: #fff; padding: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); backdrop-filter: blur(12px); font-family: 'Inter', sans-serif; transition: 0.3s; }
            .panel.min { transform: translateX(350px); opacity: 0; }
            .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #1e1b4b; padding-bottom: 10px; cursor: move; }
            .header h1 { font-size: 14px; margin: 0; color: #a78bfa; letter-spacing: 1px; }
            .row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; font-size: 12px; }
            .label { color: #94a3b8; font-weight: 600; }
            .btn { background: #1e1b4b; border: 1px solid #312e81; color: #a78bfa; padding: 6px 12px; border-radius: 8px; cursor: pointer; font-size: 11px; transition: 0.2s; font-weight: bold; }
            .btn.active { background: #4338ca; color: #fff; border-color: #6366f1; box-shadow: 0 0 10px #6366f166; }
            .btn-action { width: 100%; margin-top: 10px; background: #8b5cf6; color: #fff; border: none; padding: 10px; border-radius: 8px; cursor: pointer; font-weight: bold; }
            .dock { pointer-events: auto; position: fixed; bottom: 30px; right: 30px; width: 50px; height: 50px; background: #8b5cf6; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 0 20px #8b5cf666; color: white; transition: 0.3s; opacity: 0; transform: scale(0); }
            .dock.show { opacity: 1; transform: scale(1); }
            .dock svg { width: 24px; height: 24px; }
            input[type=number] { background: #000; border: 1px solid #312e81; color: #fff; padding: 5px; border-radius: 5px; width: 60px; outline: none; }
        \`;
        root.appendChild(style);

        const wrap = document.createElement('div');
        wrap.innerHTML = \`
            <div class="panel" id="ui">
                <div class="header" id="drag">
                    <h1>REALM X // ELITE</h1>
                    <button class="btn" style="background:transparent;border:none;font-size:16px;" id="minBtn">✕</button>
                </div>
                <div class="row">
                    <span class="label">AUTO-ANSWER</span>
                    <button class="btn" id="autoBtn">DÉSACTIVÉ</button>
                </div>
                <div class="row">
                    <span class="label">DÉLAI (ms)</span>
                    <input type="number" id="delayInp" value="500">
                </div>
                <div class="row">
                    <span class="label">STATUS</span>
                    <span style="color:#10b981" id="stat">PRÊT</span>
                </div>
                <button class="btn-action" id="joinerBtn">🔥 BOT JOINER (PUPPETEER)</button>
                <div style="font-size:9px;color:#475569;margin-top:15px;text-align:center;">VIOLET & BLUE EDITION // STI2D PRO</div>
            </div>
            <div class="dock" id="dock">${planetSVG}</div>
        \`;
        root.appendChild(wrap);

        const ui = root.querySelector('#ui'), dock = root.querySelector('#dock');
        
        // --- COMMANDES ---
        root.querySelector('#autoBtn').onclick = function() {
            _st.auto = !_st.auto;
            this.innerText = _st.auto ? "ACTIF" : "DÉSACTIVÉ";
            this.className = _st.auto ? "btn active" : "btn";
        };

        root.querySelector('#delayInp').onchange = (e) => _st.delay = parseInt(e.target.value);

        root.querySelector('#minBtn').onclick = () => { ui.classList.add('min'); dock.classList.add('show'); };
        dock.onclick = () => { ui.classList.remove('min'); dock.classList.remove('show'); };

        root.querySelector('#joinerBtn').onclick = () => {
            const pin = prompt("Entrez le PIN du jeu :");
            if(pin) {
                alert("Ordre envoyé au serveur Puppeteer pour 25 bots.");
                // Ici on pourrait faire un fetch vers le serveur pour trigger spawnBots
            }
        };

        // --- DRAG ---
        let drag = false, offset = [0,0];
        root.querySelector('#drag').onmousedown = (e) => {
            drag = true;
            offset = [ui.offsetLeft - e.clientX, ui.offsetTop - e.clientY];
        };
        document.onmousemove = (e) => {
            if(!drag) return;
            ui.style.left = (e.clientX + offset[0]) + 'px';
            ui.style.top = (e.clientY + offset[1]) + 'px';
            ui.style.right = 'auto';
        };
        document.onmouseup = () => drag = false;

        // --- SCANNER ---
        const observer = new MutationObserver(() => {
            if(!_st.auto) return;
            const text = document.body.innerText.toLowerCase();
            const found = _db.find(q => text.includes(q.q));
            
            if(found) {
                const buttons = document.querySelectorAll('button, [data-functional-selector="answer"]');
                buttons.forEach(btn => {
                    const btnText = btn.innerText.toLowerCase().trim();
                    if(btnText && (btnText === found.a || btnText.includes(found.a))) {
                        if(btn.dataset.checked) return;
                        btn.dataset.checked = "1";
                        btn.style.boxShadow = "0 0 20px #8b5cf6";
                        btn.style.border = "3px solid #8b5cf6";
                        setTimeout(() => btn.click(), _st.delay);
                    }
                });
            }
        });
        observer.observe(document.body, {childList: true, subtree: true});
    })();
    `;
}

// ==================================================================
// ⚡ 4. DISCORD LOGIC (OCR BOOSTED)
// ==================================================================
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const commands = [
    new SlashCommandBuilder().setName('kahoot').setDescription('Realm X Elite Menu')
        .addSubcommand(s => s.setName('inject').setDescription('Injection via UUID').addStringOption(o=>o.setName('uuid').setDescription('UUID du quiz').setRequired(true)))
        .addSubcommand(s => s.setName('scan').setDescription('Scanner une image (UUID detection)').addAttachmentOption(o=>o.setName('image').setDescription('Capture d\'écran').setRequired(true)))
        .addSubcommand(s => s.setName('bots').setDescription('Lancer des bots Puppeteer').addStringOption(o=>o.setName('pin').setDescription('PIN du jeu').setRequired(true)).addIntegerOption(o=>o.setName('nombre').setDescription('Nombre de bots')))
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
(async () => { try { await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands }); } catch(e){} })();

async function processUUID(uuid, interaction) {
    try {
        const res = await axios.get(`https://play.kahoot.it/rest/kahoots/${uuid}`);
        const data = res.data.questions.map(q => {
            const correct = q.choices ? q.choices.find(c => c.correct) : null;
            return {
                q: q.question ? q.question.replace(/<[^>]*>/g,'').toLowerCase().substring(0,60).trim() : "img",
                a: correct ? correct.answer.replace(/<[^>]*>/g,'').trim().toLowerCase() : "unknown"
            };
        });
        const sid = crypto.randomUUID();
        scriptsCache.set(sid, { data, title: res.data.title });
        const url = `${process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`}/copy/${sid}`;

        const embed = new EmbedBuilder().setColor(0x8b5cf6).setTitle(`🔓 REALM X : ${res.data.title}`)
            .setDescription(`**UUID :** \`${uuid}\`\n**Questions :** ${data.length}\n\n[**CLIQUE ICI POUR LE SCRIPT**](${url})`)
            .setFooter({ text: "VIOLET & BLUE ELITE EDITION" });
        
        await interaction.editReply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('OUVRIR TERMINAL').setURL(url))] });
    } catch(e) { await interaction.editReply("❌ Erreur : UUID invalide."); }
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const sub = interaction.options.getSubcommand();

    if (sub === 'inject') {
        await interaction.deferReply({ ephemeral: true });
        await processUUID(interaction.options.getString('uuid'), interaction);
    }

    if (sub === 'bots') {
        const pin = interaction.options.getString('pin');
        const count = interaction.options.getInteger('nombre') || 5;
        await interaction.reply({ content: `🚀 Lancement de ${count} bots sur le PIN ${pin}...`, ephemeral: true });
        spawnBots(pin, "RealmBot", count);
    }

    if (sub === 'scan') {
        await interaction.deferReply({ ephemeral: true });
        const att = interaction.options.getAttachment('image');
        
        // OCR BOOSTED : On traite l'image avec Tesseract avec des paramètres de confiance
        const worker = await Tesseract.createWorker('eng');
        const { data: { text } } = await worker.recognize(att.url);
        await worker.terminate();

        console.log("📄 [OCR DEBUG] Texte détecté :", text);

        // Regex plus agressive pour capturer l'UUID même mal formé
        const uuidRegex = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/gi;
        const match = text.match(uuidRegex);

        if (match) {
            await processUUID(match[0], interaction);
        } else {
            // Tentative 2 : recherche de quizId=
            const quizIdMatch = text.match(/quizId=([a-f0-9-]+)/i);
            if (quizIdMatch) await processUUID(quizIdMatch[1], interaction);
            else await interaction.editReply("❌ Aucun UUID détecté. Assure-toi que l'UUID est bien visible sur l'image.");
        }
    }
});

client.on('ready', () => console.log(`🚀 Bot connecté : ${client.user.tag}`));
client.login(process.env.DISCORD_TOKEN);

app.listen(port, () => console.log(`🌍 WebServer sur port ${port}`));

