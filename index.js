/**
 * ⚡ KAHOOT HACK ELITE - EDITION SIN PRO (V2.2 FINAL)
 * Projet STI2D - Optimisé pour Render (512MB RAM)
 * Fix: Logs sécurisés & Descriptions obligatoires Discord v14
 */

require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const express = require('express');
const crypto = require('crypto');
const Kahoot = require('kahoot.js-updated');

const app = express();
const port = process.env.PORT || 3000;

// ==================================================================
// 0. SYSTÈME DE LOGS SÉCURISÉ (ANTI-CRASH)
// ==================================================================
const logsBuffer = [];

// On n'écrase PAS console.log, on utilise une fonction dédiée
function safeLog(source, message) {
    const timestamp = new Date().toLocaleTimeString('fr-FR');
    // Si le message est un objet (erreur), on le stringify
    const textMsg = (typeof message === 'object') ? JSON.stringify(message, null, 2) : message;
    const logLine = `[${timestamp}] [${source}] ${textMsg}`;

    // 1. Stockage mémoire pour Discord (Max 50 lignes)
    logsBuffer.push(logLine);
    if (logsBuffer.length > 50) logsBuffer.shift();

    // 2. Écriture directe dans le flux système (évite les boucles infinies)
    process.stdout.write(logLine + '\n'); 
}

// ==================================================================
// 1. CONFIGURATION & ANTI-SLEEP
// ==================================================================
const scriptsCache = new Map();
const SERVICE_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`;

// Ping toutes les 2 minutes pour garder Render éveillé
setInterval(async () => {
    try { await axios.get(SERVICE_URL); } catch(e) {}
}, 120000);

// ==================================================================
// 2. MOTEUR BOT (SOCKET FAST)
// ==================================================================
async function startSocketBots(pin, baseName, count) {
    safeLog('BOT-MASTER', `🚀 Lancement de ${count} bots sur le PIN ${pin}...`);
    
    let joined = 0;
    
    for (let i = 0; i < count; i++) {
        const botName = `${baseName}_${i + 1}`;
        const kBot = new Kahoot();

        kBot.on("Joined", () => {
            joined++;
            if (joined % 5 === 0 || joined === count) {
                safeLog('BOT-NET', `✅ ${joined}/${count} bots connectés.`);
            }
        });

        kBot.on("Disconnect", (reason) => {
            if(reason !== "Quiz Locked" && reason !== "Brrr! The quiz has ended.") {
                safeLog('BOT-NET', `❌ Bot ${botName} déconnecté: ${reason}`);
            }
        });

        // Délai de sécurité (50ms) pour éviter le ban IP
        try {
            await new Promise(r => setTimeout(r, 50));
            kBot.join(pin, botName).catch(() => {});
        } catch (e) {}
    }
}

async function solvePin(pin) {
    safeLog('RESOLVER', `Scan du PIN ${pin}...`);
    return new Promise((resolve) => {
        const client = new Kahoot();
        // Timeout de 5 secondes max
        const timeout = setTimeout(() => { client.leave(); resolve(null); }, 5000);
        
        client.on("Joined", () => {
            const uuid = client.quiz ? client.quiz.uuid : null;
            safeLog('RESOLVER', uuid ? `Succès UUID: ${uuid}` : 'Echec UUID');
            client.leave();
            clearTimeout(timeout);
            resolve(uuid);
        });

        client.join(pin, "scan_" + Math.floor(Math.random()*100)).catch(() => resolve(null));
    });
}

// ==================================================================
// 3. SERVEUR WEB (PAYLOAD)
// ==================================================================
app.get('/', (req, res) => res.send('KAHOOT ELITE V2.2 ONLINE'));

app.get('/copy/:id', (req, res) => {
    const entry = scriptsCache.get(req.params.id);
    if (!entry) return res.status(404).send("EXPIRED");
    const json = JSON.stringify(entry.data);
    // Injection JS
    const payload = `(function(){window.kdat=${json};console.log('INJECTED');alert('HACK LOADED: '+window.kdat.length+' Q');})();`;
    const loader = `eval(decodeURIComponent(escape(window.atob('${Buffer.from(payload).toString('base64')}'))))`;
    res.send(loader);
});

// ==================================================================
// 4. DISCORD BOT (COMMANDES CORRIGÉES)
// ==================================================================
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// CORRECTION MAJEURE ICI : Ajout de .setDescription() PARTOUT
const commands = [
    new SlashCommandBuilder().setName('kahoot').setDescription('Elite Menu')
        .addSubcommand(s => s.setName('solve').setDescription('Récupérer UUID via PIN')
            .addStringOption(o=>o.setName('pin').setDescription('Le PIN du jeu').setRequired(true)))
        
        .addSubcommand(s => s.setName('bots').setDescription('Lancer les bots')
            .addStringOption(o=>o.setName('pin').setDescription('PIN du jeu').setRequired(true))
            .addStringOption(o=>o.setName('name').setDescription('Nom des bots').setRequired(true))
            .addIntegerOption(o=>o.setName('nombre').setDescription('Nombre de bots (max 50)').setRequired(false)))
        
        .addSubcommand(s => s.setName('logs').setDescription('Voir les logs Render')),
    
    new SlashCommandBuilder().setName('ping').setDescription('Voir la latence')
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => { 
    try { 
        safeLog('SYSTEM', 'Mise à jour des commandes Discord...');
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
        safeLog('SYSTEM', 'Commandes chargées avec succès !');
    } catch(e) {
        safeLog('ERROR', `Erreur commandes: ${e.message}`);
    } 
})();

async function handleSendQuiz(uuid, interaction) {
    try {
        const res = await axios.get(`https://play.kahoot.it/rest/kahoots/${uuid}`);
        const data = res.data;
        const simpleData = data.questions.map(q => ({
            q: q.question ? q.question.replace(/<[^>]*>/g,'') : "Image",
            a: q.choices ? q.choices.find(c => c.correct).answer : "?"
        }));
        
        const sid = crypto.randomUUID();
        scriptsCache.set(sid, { data: simpleData });
        
        const embed = new EmbedBuilder().setColor(0x3b82f6)
            .setTitle(`🔓 ${data.title}`)
            .setDescription(`**UUID:** \`${uuid}\`\n[🔗 SCRIPT](${SERVICE_URL}/copy/${sid})`);
        
        interaction.editReply({ embeds: [embed] });
        safeLog('CMD', `Hack généré pour ${uuid}`);
    } catch (e) {
        interaction.editReply("❌ Erreur UUID ou Quiz privé.");
    }
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName, options } = interaction;

    if (commandName === 'ping') return interaction.reply(`RAM: ${Math.round(process.memoryUsage().rss/1024/1024)}MB`);

    if (commandName === 'kahoot') {
        const sub = options.getSubcommand();

        if (sub === 'logs') {
            const content = logsBuffer.length > 0 ? logsBuffer.join('\n') : "Logs vides.";
            return interaction.reply({ content: `\`\`\`log\n${content}\n\`\`\``, ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        if (sub === 'solve') {
            const uuid = await solvePin(options.getString('pin'));
            if (uuid) handleSendQuiz(uuid, interaction);
            else interaction.editReply("❌ PIN invalide.");
        }

        if (sub === 'bots') {
            const pin = options.getString('pin');
            const count = Math.min(options.getInteger('nombre') || 10, 50);
            interaction.editReply(`🚀 Envoi de ${count} bots sur ${pin}...`);
            startSocketBots(pin, options.getString('name'), count);
        }
    }
});

app.listen(port, () => safeLog('SYSTEM', `Serveur démarré Port ${port}`));
client.login(process.env.DISCORD_TOKEN);


