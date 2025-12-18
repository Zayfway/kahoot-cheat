/**
 * ⚡ KAHOOT HACK ELITE - EDITION SIN PRO (V2 SOCKET)
 * Projet STI2D - Optimisé pour Render (512MB RAM)
 * Optimisation : Remplacement de Puppeteer par WebSockets (Commit ref: 13b1009)
 */

require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const express = require('express');
const crypto = require('crypto');
const Kahoot = require('kahoot.js-updated'); // Le moteur rapide

const app = express();
const port = process.env.PORT || 3000;

// --- SYSTÈME DE LOGS INTERNE ---
const logsBuffer = [];
function addLog(source, message) {
    const timestamp = new Date().toLocaleTimeString('fr-FR');
    const logLine = `[${timestamp}] [${source}] ${message}`;
    console.log(logLine);
    logsBuffer.push(logLine);
    // Garde seulement les 50 derniers logs pour économiser la RAM
    if (logsBuffer.length > 50) logsBuffer.shift();
}

// --- CONSTANTES ---
const scriptsCache = new Map();
const quizDataState = new Map();
const SHAPES = [
    { name: "Triangle", color: "🟥", emoji: "🔺", pos: "Haut Gauche" },
    { name: "Losange", color: "🟦", emoji: "🔷", pos: "Haut Droite" },
    { name: "Cercle", color: "🟨", emoji: "🟡", pos: "Bas Gauche" },
    { name: "Carré", color: "🟩", emoji: "🟩", pos: "Bas Droite" }
];

// --- ANTI-SLEEP RENDER ---
const SERVICE_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`;
setInterval(async () => {
    try { await axios.get(SERVICE_URL); } catch(e) {}
}, 120000);

// ==================================================================
// 1. NOUVEAU MOTEUR BOT JOINER (WEBSOCKET - SUPER FAST)
// ==================================================================
async function startSocketBots(pin, baseName, count) {
    addLog('BOT-MASTER', `🚀 Lancement de ${count} bots sur le PIN ${pin}...`);
    
    let joined = 0;
    
    for (let i = 0; i < count; i++) {
        const botName = `${baseName}_${i + 1}`;
        const kBot = new Kahoot();

        // Gestion des événements du bot
        kBot.on("Joined", () => {
            joined++;
            if (joined % 5 === 0 || joined === count) { // Log tous les 5 bots pour pas spammer
                addLog('BOT-NET', `✅ ${joined}/${count} bots connectés.`);
            }
        });

        kBot.on("Disconnect", (reason) => {
            addLog('BOT-NET', `❌ Bot ${botName} déconnecté: ${reason}`);
        });

        kBot.on("QuestionStart", (question) => {
            // Optionnel : Répondre au hasard pour simuler de la vie
            // const answer = Math.floor(Math.random() * question.numberOfChoices);
            // question.answer(answer);
        });

        // Tente de rejoindre
        try {
            // Délai de 50ms entre chaque join pour éviter le rate-limit IP de Kahoot
            await new Promise(r => setTimeout(r, 50)); 
            kBot.join(pin, botName).catch(err => {
                addLog('ERROR', `Echec connexion ${botName}: ${JSON.stringify(err)}`);
            });
        } catch (e) {
            addLog('ERROR', `Crash bot ${i}: ${e.message}`);
        }
    }
}

async function solvePin(pin) {
    addLog('RESOLVER', `Tentative de résolution du PIN ${pin}`);
    return new Promise((resolve) => {
        const client = new Kahoot();
        const timeout = setTimeout(() => { client.leave(); resolve(null); }, 5000);
        client.on("Joined", () => {
            const uuid = client.quiz ? client.quiz.uuid : null;
            addLog('RESOLVER', uuid ? `UUID trouvé: ${uuid}` : 'UUID introuvable');
            client.leave();
            clearTimeout(timeout);
            resolve(uuid);
        });
        client.join(pin, "s_" + Math.floor(Math.random()*100)).catch(() => resolve(null));
    });
}

// ==================================================================
// 2. SERVEUR EXPRESS (Payload & Status)
// ==================================================================
app.get('/', (req, res) => res.send(`
    <body style="background:#000;color:#0f0;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;">
        <div><h1>KAHOOT HACK ELITE V2</h1><p>SOCKET ENGINE: ONLINE</p><p>RAM OPTIMIZED</p></div>
    </body>
`));

app.get('/copy/:id', (req, res) => {
    const entry = scriptsCache.get(req.params.id);
    if (!entry) return res.status(404).send("EXPIRED");
    const payload = generatePayload(entry.data);
    const loader = `eval(decodeURIComponent(escape(window.atob('${Buffer.from(payload).toString('base64')}'))))`;
    res.send(`<textarea style="width:100%;height:100%">${loader}</textarea>`);
});

function generatePayload(quizData) {
    // Version minifiée du script client injecteur
    const json = JSON.stringify(quizData);
    return `(function(){window.kdat=${json};console.log('KAHOOT ELITE INJECTED');alert('HACK LOADED: '+window.kdat.length+' Questions');})();`; 
    // Note: Pour la version complète UI, remettre le code du payload précédent ici.
    // J'ai mis une version courte pour la lisibilité du fichier.
}

// ==================================================================
// 3. DISCORD BOT
// ==================================================================
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = [
    new SlashCommandBuilder().setName('kahoot').setDescription('Elite Menu')
        .addSubcommand(s => s.setName('inject').setDescription('Récupérer les réponses via UUID').addStringOption(o=>o.setName('uuid').setRequired(true)))
        .addSubcommand(s => s.setName('solve').setDescription('Récupérer UUID via PIN').addStringOption(o=>o.setName('pin').setRequired(true)))
        .addSubcommand(s => s.setName('bots').setDescription('Lancer les bots (Fast Socket)').addStringOption(o=>o.setName('pin').setRequired(true)).addStringOption(o=>o.setName('name').setRequired(true)).addIntegerOption(o=>o.setName('nombre').setRequired(false)))
        .addSubcommand(s => s.setName('logs').setDescription('Voir les logs du serveur (Render)')),
    new SlashCommandBuilder().setName('ping').setDescription('Vérifier latence')
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
(async () => { try { await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands }); } catch(e){} })();

async function handleSendQuiz(uuid, interaction) {
    try {
        const res = await axios.get(`https://play.kahoot.it/rest/kahoots/${uuid}`);
        const data = res.data;
        quizDataState.set(uuid, data);
        
        // Simplification des données pour le script client
        const simpleData = data.questions.map(q => ({
            q: q.question ? q.question.replace(/<[^>]*>/g,'') : "Question Image/Audio",
            a: q.choices ? q.choices.find(c => c.correct).answer : "???"
        }));
        
        const sid = crypto.randomUUID();
        scriptsCache.set(sid, { data: simpleData, title: data.title });

        const embed = new EmbedBuilder().setColor(0x3b82f6)
            .setTitle(`🔓 ${data.title}`)
            .setDescription(`Questions: ${data.questions.length}\nUUID: \`${uuid}\`\n\n[🔗 CLIQUER POUR LE SCRIPT](${SERVICE_URL}/copy/${sid})`)
            .setFooter({ text: "Kahoot Elite V2" });
            
        interaction.editReply({ embeds: [embed] });
        addLog('CMD', `Hack généré pour ${uuid}`);
    } catch (e) {
        interaction.editReply("❌ Erreur : UUID invalide ou Kahoot privé.");
        addLog('ERROR', `Fail fetch UUID ${uuid}`);
    }
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options } = interaction;

    if (commandName === 'ping') {
        const ram = Math.round(process.memoryUsage().rss / 1024 / 1024);
        return interaction.reply(`🏓 Pong! Latence: ${client.ws.ping}ms | RAM: ${ram}MB (Render Limit: 512MB)`);
    }

    if (commandName === 'kahoot') {
        const sub = options.getSubcommand();

        if (sub === 'logs') {
            const logContent = logsBuffer.length > 0 ? logsBuffer.join('\n') : "Aucun log récent.";
            // Envoi dans un bloc de code pour la lisibilité
            return interaction.reply({ content: `**📋 DERNIERS LOGS RENDER :**\n\`\`\`log\n${logContent}\n\`\`\``, ephemeral: true });
        }

        // Pour les autres commandes qui prennent du temps
        await interaction.deferReply({ ephemeral: true });

        if (sub === 'solve') {
            const uuid = await solvePin(options.getString('pin'));
            if (uuid) handleSendQuiz(uuid, interaction);
            else interaction.editReply("❌ PIN introuvable ou session protégée.");
        }

        if (sub === 'inject') {
            handleSendQuiz(options.getString('uuid'), interaction);
        }

        if (sub === 'bots') {
            const pin = options.getString('pin');
            const name = options.getString('name');
            const count = options.getInteger('nombre') || 10;
            
            // Sécurité : Max 50 bots pour éviter ban IP Render
            const safeCount = Math.min(count, 50); 
            
            interaction.editReply(`🚀 **Lancement de ${safeCount} bots (Socket Mode)** sur \`${pin}\`...\nRegarde \`/kahoot logs\` pour le suivi.`);
            startSocketBots(pin, name, safeCount);
        }
    }
});

app.listen(port, () => addLog('SYSTEM', `Serveur démarré sur le port ${port}`));
client.login(process.env.DISCORD_TOKEN);

