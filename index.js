// ==================================================================
// ⚡ 1. SYSTEME D'AUTO-INSTALLATION & GESTION MÉMOIRE
// ==================================================================
const { execSync } = require('child_process');
const fs = require('fs');

console.log("🌌 [REALM X] Initialisation de l'unité Elite...");

const packages = ['discord.js', 'axios', 'express', 'dotenv', 'tesseract.js', 'puppeteer']; 

// Installation automatique si manquant
packages.forEach(pkg => {
    try { require.resolve(pkg); } catch (e) {
        console.log(`📦 Installation du module : ${pkg}...`);
        execSync(`npm install ${pkg} --no-audit --no-fund`, { stdio: 'inherit' });
    }
});

require('dotenv').config();
const { 
    Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, 
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Partials 
} = require('discord.js');
const axios = require('axios');
const express = require('express');
const crypto = require('crypto');
const Tesseract = require('tesseract.js');
const puppeteer = require('puppeteer');

const app = express();
const port = process.env.PORT || 3000;
const scriptsCache = new Map(); // Stockage des scripts générés
const quizDataState = new Map(); // Stockage pour la pagination Discord

// Mapping des réponses Kahoot (STI2D Logic)
const KAHOOT_SHAPES = [
    { name: "Triangle", color: "🟥", emoji: "🔺", pos: "Haut Gauche" },
    { name: "Losange", color: "🟦", emoji: "🔷", pos: "Haut Droite" },
    { name: "Cercle", color: "🟨", emoji: "🟡", pos: "Bas Gauche" },
    { name: "Carré", color: "🟩", emoji: "🟩", pos: "Bas Droite" }
];

// ==================================================================
// ⚡ 2. GESTIONNAIRE DE BOTS (PUPPETEER OPTIMISÉ RAM)
// ==================================================================
async function launchPuppeteerBots(pin, name, count) {
    console.log(`🤖 Lancement de ${count} bots sur le PIN ${pin}...`);
    
    // On limite le nombre de bots pour éviter le crash "Out of Memory"
    const safeCount = Math.min(count, 15); 
    
    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage', // Indispensable pour les petits serveurs
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process', // Réduit la RAM utilisée
            '--disable-gpu'
        ]
    });

    for (let i = 0; i < safeCount; i++) {
        const page = await browser.newPage();
        try {
            // Bloquer les images pour économiser 80% de RAM
            await page.setRequestInterception(true);
            page.on('request', (req) => {
                if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) req.abort();
                else req.continue();
            });

            await page.goto('https://kahoot.it/', { waitUntil: 'networkidle0', timeout: 30000 });
            
            // Entrer le PIN
            await page.waitForSelector('input[name="gameId"]');
            await page.type('input[name="gameId"]', pin.toString());
            await page.keyboard.press('Enter');

            // Attendre la page du pseudo
            await page.waitForSelector('input[name="nickname"]', { timeout: 10000 });
            await page.type('input[name="nickname"]', `${name}_${i + 1}`);
            await page.keyboard.press('Enter');

            console.log(`✅ Bot ${i+1} connecté avec succès.`);
            // On laisse l'onglet ouvert, mais on ne fait plus rien dessus
        } catch (err) {
            console.error(`❌ Bot ${i+1} échec: ${err.message}`);
            await page.close();
        }
    }
    // On garde le browser actif 10 minutes puis on coupe
    setTimeout(() => browser.close(), 600000);
}

// ==================================================================
// ⚡ 3. INTERFACE WEB & PAYLOAD (THEME VIOLET PRO)
// ==================================================================
app.get('/copy/:id', (req, res) => {
    const entry = scriptsCache.get(req.params.id);
    if (!entry) return res.status(404).send("SESSION_EXPIRE");
    const loader = `eval(decodeURIComponent(escape(window.atob('${Buffer.from(generateClientPayload(entry.data)).toString('base64')}'))))`;
    
    res.send(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Realm X // Terminal</title>
            <style>
                body { background: #020617; color: #f8fafc; font-family: 'Inter', sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                .card { background: rgba(30, 41, 59, 0.7); border: 1px solid #334155; padding: 40px; border-radius: 24px; text-align: center; backdrop-filter: blur(20px); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); max-width: 450px; width: 90%; }
                h1 { color: #a78bfa; font-size: 24px; margin-bottom: 8px; font-weight: 800; letter-spacing: -0.5px; }
                p { color: #94a3b8; margin-bottom: 32px; font-size: 14px; line-height: 1.6; }
                .btn { background: linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%); color: white; border: none; padding: 16px; border-radius: 12px; font-weight: 700; width: 100%; cursor: pointer; transition: 0.2s; font-size: 15px; }
                .btn:active { transform: scale(0.97); }
                .footer { margin-top: 24px; font-size: 11px; color: #475569; text-transform: uppercase; letter-spacing: 1px; }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>UNITÉ D'INJECTION</h1>
                <p>Le script pour <b>${entry.title}</b> est prêt.<br>Cliquez sur le bouton pour le copier dans votre presse-papier.</p>
                <button class="btn" onclick="copy(this)">COPIER LE PAYLOAD</button>
                <div class="footer">Realm X Elite // SIN Section</div>
            </div>
            <textarea id="code" style="display:none">${loader}</textarea>
            <script>
                function copy(btn) {
                    const c = document.getElementById('code');
                    c.style.display = 'block'; c.select(); document.execCommand('copy'); c.style.display = 'none';
                    btn.innerText = "COPIÉ !"; btn.style.background = "#10b981";
                    setTimeout(() => { btn.innerText = "COPIER LE PAYLOAD"; btn.style.background = "linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)"; }, 2000);
                }
            </script>
        </body>
        </html>
    `);
});

function generateClientPayload(quizData) {
    const json = JSON.stringify(quizData);
    return `
    (function() {
        // Mock Amplitude & Sentry pour éviter les erreurs Kahoot
        window.Amplitude = { init:()=>{} , identify:()=>{} , logEvent:()=>{} };
        window.Sentry = { init:()=>{} };

        const _db = ${json};
        const _st = { auto: false, delay: 500 };

        const host = document.createElement('div');
        host.id = 'rx-' + Date.now();
        Object.assign(host.style, {position:'fixed', top:0, left:0, zIndex:2147483647});
        const root = host.attachShadow({mode:'open'});
        document.body.appendChild(host);

        const style = document.createElement('style');
        style.textContent = \`
            .ui { pointer-events: auto; position: fixed; top: 20px; right: 20px; width: 260px; background: rgba(15, 23, 42, 0.95); border: 1px solid #334155; border-radius: 16px; color: #fff; padding: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); backdrop-filter: blur(10px); font-family: system-ui; }
            .head { font-size: 12px; font-weight: 900; color: #a78bfa; margin-bottom: 15px; border-bottom: 1px solid #1e293b; padding-bottom: 8px; }
            .row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-size: 11px; }
            .btn { background: #1e293b; border: 1px solid #334155; color: #94a3b8; padding: 6px 10px; border-radius: 6px; cursor: pointer; transition: 0.2s; font-weight: bold; }
            .btn.on { background: #7c3aed; color: #fff; border-color: #a78bfa; }
            input { background: #020617; border: 1px solid #334155; color: #10b981; width: 60px; padding: 4px; border-radius: 4px; outline: none; text-align: center; }
        \`;
        root.appendChild(style);

        const panel = document.createElement('div');
        panel.className = 'ui';
        panel.innerHTML = \`
            <div class="head">REALM X // ELITE SIN</div>
            <div class="row"><span>AUTO-RÉPONSE</span><button class="btn" id="bA">OFF</button></div>
            <div class="row"><span>DÉLAI (MS)</span><input type="number" id="iD" value="500"></div>
            <div class="row" style="color:#64748b; font-size:9px;">SYSTÈME OPÉRATIONNEL</div>
        \`;
        root.appendChild(panel);

        root.querySelector('#bA').onclick = function() {
            _st.auto = !_st.auto;
            this.innerText = _st.auto ? "ON" : "OFF";
            this.classList.toggle('on');
        };
        root.querySelector('#iD').onchange = (e) => _st.delay = parseInt(e.target.value);

        setInterval(() => {
            if(!_st.auto) return;
            const text = document.body.innerText.toLowerCase();
            const q = _db.find(x => text.includes(x.q));
            if(q) {
                document.querySelectorAll('button, [data-functional-selector="answer"]').forEach(b => {
                    const bt = b.innerText.toLowerCase().trim();
                    if(bt && (bt === q.a || bt.includes(q.a))) {
                        if(b.dataset.rx) return;
                        b.dataset.rx = "1";
                        b.style.border = "4px solid #a78bfa";
                        setTimeout(() => b.click(), _st.delay);
                    }
                });
            }
        }, 500);
    })();
    `;
}

// ==================================================================
// ⚡ 4. DISCORD BOT (EMBEDS PRO & PAGINATION)
// ==================================================================
const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
    partials: [Partials.Message, Partials.Channel]
});

const commands = [
    new SlashCommandBuilder().setName('kahoot').setDescription('Menu Principal Realm X')
        .addSubcommand(s => s.setName('inject').setDescription('Injection via UUID').addStringOption(o=>o.setName('uuid').setDescription('UUID du quiz').setRequired(true)))
        .addSubcommand(s => s.setName('scan').setDescription('Analyse OCR boostée').addAttachmentOption(o=>o.setName('image').setDescription('Capture d\'écran').setRequired(true)))
        .addSubcommand(s => s.setName('bots').setDescription('Bot Joiner (Puppeteer)')
            .addStringOption(o=>o.setName('pin').setDescription('PIN du jeu').setRequired(true))
            .addStringOption(o=>o.setName('name').setDescription('Pseudo de base').setRequired(true))
            .addIntegerOption(o=>o.setName('nombre').setDescription('Nombre de bots (max 15)')))
        .addSubcommand(s => s.setName('ping').setDescription('Vérifier la santé du système'))
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
(async () => { try { await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands }); } catch(e){} })();

// Fonction pour créer l'embed de question (Pagination)
function createQuestionEmbed(quizId, index) {
    const data = quizDataState.get(quizId);
    if (!data || !data.questions[index]) return null;

    const q = data.questions[index];
    const total = data.questions.length;
    
    // On cherche l'index de la réponse correcte
    const correctIdx = q.choices.findIndex(c => c.correct);
    const shape = KAHOOT_SHAPES[correctIdx] || { emoji: "❓", color: "⚪", pos: "Inconnue" };

    return new EmbedBuilder()
        .setColor(0x7c3aed)
        .setTitle(`📖 ${data.title} (${index + 1}/${total})`)
        .setDescription(`**Question :**\n\`\`\`${q.question.replace(/<[^>]*>/g,'')}\`\`\``)
        .addFields(
            { name: "✅ RÉPONSE", value: `\`\`\`${q.choices[correctIdx].answer}\`\`\``, inline: false },
            { name: "📍 POSITION", value: `${shape.emoji} **${shape.pos}**`, inline: true },
            { name: "🎨 SYMBOLE", value: `${shape.color} **${shape.name}**`, inline: true }
        )
        .setFooter({ text: `Realm X Elite // UUID: ${quizId}` });
}

async function processQuiz(uuid, interaction) {
    try {
        const res = await axios.get(`https://play.kahoot.it/rest/kahoots/${uuid}`);
        const quizData = res.data;
        
        // Stockage pour la navigation
        quizDataState.set(uuid, quizData);

        const sid = crypto.randomUUID();
        scriptsCache.set(sid, { 
            data: quizData.questions.map(q => ({
                q: q.question ? q.question.replace(/<[^>]*>/g,'').toLowerCase().substring(0,50).trim() : "img",
                a: q.choices ? q.choices.find(c => c.correct).answer.replace(/<[^>]*>/g,'').trim().toLowerCase() : ""
            })), 
            title: quizData.title 
        });

        const terminalUrl = `${process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`}/copy/${sid}`;

        const embed = createQuestionEmbed(uuid, 0);
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`prev_${uuid}_0`).setLabel('◀️').setStyle(ButtonStyle.Secondary).setDisabled(true),
            new ButtonBuilder().setCustomId(`next_${uuid}_0`).setLabel('▶️').setStyle(ButtonStyle.Secondary).setDisabled(quizData.questions.length <= 1),
            new ButtonBuilder().setLabel('ACCÉDER AU TERMINAL').setStyle(ButtonStyle.Link).setURL(terminalUrl)
        );

        await interaction.editReply({ embeds: [embed], components: [row] });
    } catch(e) {
        await interaction.editReply("❌ **ERREUR CRITIQUE** : Quiz introuvable ou privé.");
    }
}

client.on('interactionCreate', async interaction => {
    // Gestion des Boutons de Pagination
    if (interaction.isButton()) {
        const [action, uuid, currentIndex] = interaction.customId.split('_');
        if (!uuid) return;

        let nextIndex = parseInt(currentIndex);
        if (action === 'next') nextIndex++;
        if (action === 'prev') nextIndex--;

        const data = quizDataState.get(uuid);
        if (!data) return interaction.reply({ content: "Session expirée.", ephemeral: true });

        const newEmbed = createQuestionEmbed(uuid, nextIndex);
        const newRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`prev_${uuid}_${nextIndex}`).setLabel('◀️').setStyle(ButtonStyle.Secondary).setDisabled(nextIndex === 0),
            new ButtonBuilder().setCustomId(`next_${uuid}_${nextIndex}`).setLabel('▶️').setStyle(ButtonStyle.Secondary).setDisabled(nextIndex >= data.questions.length - 1),
            new ButtonBuilder().setLabel('TERMINAL').setStyle(ButtonStyle.Link).setURL(interaction.message.components[0].components[2].url)
        );

        return await interaction.update({ embeds: [newEmbed], components: [newRow] });
    }

    if (!interaction.isChatInputCommand()) return;
    const sub = interaction.options.getSubcommand();

    if (sub === 'ping') {
        const embed = new EmbedBuilder().setColor(0x3b82f6).setTitle("📡 ÉTAT DU SYSTÈME")
            .addFields(
                { name: "LATENCE BOT", value: `\`${Math.round(client.ws.ping)}ms\``, inline: true },
                { name: "MÉMOIRE", value: `\`${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB / 512MB\``, inline: true },
                { name: "NOYAU", value: "🟢 OPÉRATIONNEL", inline: true }
            );
        return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'inject') {
        await interaction.deferReply({ ephemeral: true });
        await processQuiz(interaction.options.getString('uuid'), interaction);
    }

    if (sub === 'bots') {
        const pin = interaction.options.getString('pin');
        const name = interaction.options.getString('name');
        const count = interaction.options.getInteger('nombre') || 5;
        
        await interaction.reply({ content: `🚀 **Démarrage des unités...**\nCible: \`${pin}\` | Pseudo: \`${name}\` | Quantité: \`${count}\``, ephemeral: true });
        launchPuppeteerBots(pin, name, count);
    }

    if (sub === 'scan') {
        await interaction.deferReply({ ephemeral: true });
        const att = interaction.options.getAttachment('image');
        const worker = await Tesseract.createWorker('eng');
        try {
            const { data: { text } } = await worker.recognize(att.url);
            await worker.terminate();
            const match = text.match(/[0-9a-f-]{36}/i);
            if (match) await processQuiz(match[0], interaction);
            else await interaction.editReply("❌ Aucun UUID détecté sur l'image.");
        } catch(e) { await interaction.editReply("❌ Échec de l'analyse visuelle."); }
    }
});

app.listen(port, () => console.log(`🌍 SERVER ACTIF : ${port}`));
client.login(process.env.DISCORD_TOKEN);

