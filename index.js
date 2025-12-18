/**
 * ⚡ KAHOOT HACK ELITE - EDITION SIN PRO (V3.1 LIVE DASHBOARD)
 * Projet STI2D - Optimisé pour Render (512MB RAM)
 * Features : iOS Fix, Socket Bots, Real-time Discord Updates
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
// 0. SYSTÈME DE LOGS & CONFIG
// ==================================================================
const logsBuffer = [];
const scriptsCache = new Map();
const SERVICE_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`;

function safeLog(source, message) {
    const timestamp = new Date().toLocaleTimeString('fr-FR');
    const textMsg = (typeof message === 'object') ? JSON.stringify(message) : message;
    const logLine = `[${timestamp}] [${source}] ${textMsg}`;
    logsBuffer.push(logLine);
    if (logsBuffer.length > 50) logsBuffer.shift();
    process.stdout.write(logLine + '\n'); 
}

// Anti-Sleep Render
setInterval(async () => {
    try { await axios.get(SERVICE_URL); } catch(e) {}
}, 120000);

// ==================================================================
// 1. MOTEUR D'INJECTION (INTERFACE CYBER + iOS FIX)
// ==================================================================
function generatePayload(quizData) {
    const json = JSON.stringify(quizData);
    return `
    (function() {
        console.log("⚡ KAHOOT ELITE INJECTED");
        window.kdata = ${json};
        
        // --- MOTEUR DE CLIC iOS (FORCE TOUCH) ---
        function forceTouch(elem) {
            const opts = { bubbles: true, cancelable: true, view: window, buttons: 1, pointerType: 'touch' };
            elem.dispatchEvent(new PointerEvent('pointerdown', opts));
            elem.dispatchEvent(new MouseEvent('mousedown', opts));
            elem.dispatchEvent(new PointerEvent('pointerup', opts));
            elem.dispatchEvent(new MouseEvent('mouseup', opts));
            elem.click();
        }

        // --- INTERFACE GRAPHIQUE ---
        const host = document.createElement('div');
        host.attachShadow({mode:'open'});
        document.body.appendChild(host);
        const root = host.shadowRoot;

        const style = document.createElement('style');
        style.textContent = \`
            :host { font-family: 'Segoe UI', Roboto, sans-serif; z-index: 99999; position: fixed; top: 0; left: 0; }
            .panel { position: fixed; top: 20px; right: 20px; width: 260px; background: rgba(10, 12, 25, 0.95); border: 1px solid #6366f1; border-radius: 16px; padding: 16px; color: #fff; box-shadow: 0 0 20px rgba(99, 102, 241, 0.3); backdrop-filter: blur(10px); transition: 0.3s; }
            .panel.hide { transform: translateX(350px); opacity: 0; }
            .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #333; padding-bottom: 8px; }
            h1 { font-size: 14px; margin: 0; color: #818cf8; font-weight: 800; letter-spacing: 1px; }
            .btn { background: #1e293b; border: 1px solid #475569; color: #fff; padding: 4px 10px; border-radius: 6px; font-size: 11px; cursor: pointer; transition: 0.2s; }
            .btn.on { background: #22c55e; border-color: #22c55e; color: #000; font-weight: bold; }
            .row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-size: 12px; }
            .dock { position: fixed; bottom: 20px; left: 20px; width: 40px; height: 40px; background: #6366f1; border-radius: 12px; display: none; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 0 15px #6366f1; }
            .dock.show { display: flex; }
            .bar { width: 4px; height: 20px; background: #fff; margin: 0 2px; border-radius: 2px; }
        \`;
        root.appendChild(style);

        root.innerHTML += \`
            <div class="panel" id="ui">
                <div class="header"><h1>⚡ ELITE SIN</h1><button class="btn" id="min">_</button></div>
                <div class="row"><span>AUTO-ANSWER (iOS)</span><button class="btn" id="tgl">OFF</button></div>
                <div class="row"><span>QUESTIONS</span><span style="color:#818cf8">\${window.kdata.length} CHARGÉES</span></div>
                <button class="btn" style="width:100%; color:#f87171; border-color:#ef4444;" id="kill">DÉTRUIRE LE MENU</button>
            </div>
            <div class="dock" id="d"><div class="bar"></div><div class="bar"></div></div>
        \`;

        let auto = false;
        const ui = root.getElementById('ui'), dock = root.getElementById('d'), tgl = root.getElementById('tgl');
        root.getElementById('min').onclick = () => { ui.classList.add('hide'); dock.classList.add('show'); };
        dock.onclick = () => { ui.classList.remove('hide'); dock.classList.remove('show'); };
        root.getElementById('kill').onclick = () => host.remove();
        tgl.onclick = () => { auto = !auto; tgl.innerText = auto ? "ON" : "OFF"; tgl.className = auto ? "btn on" : "btn"; };

        setInterval(() => {
            if (!auto) return;
            const quizBody = document.body.innerText.toLowerCase(); 
            const match = window.kdata.find(k => quizBody.includes(k.q.substring(0, 20)));
            if (match) {
                Array.from(document.querySelectorAll('[data-functional-selector^="answer"], button')).forEach(btn => {
                    const txt = btn.innerText.toLowerCase().trim();
                    const isTrue = (match.a === 'true' && (txt === 'vrai' || txt === 'true'));
                    const isFalse = (match.a === 'false' && (txt === 'faux' || txt === 'false'));
                    if (txt === match.a || isTrue || isFalse) {
                        btn.style.border = "4px solid #00ff00";
                        setTimeout(() => forceTouch(btn), 300);
                    }
                });
            }
        }, 800);
    })();
    `;
}

// ==================================================================
// 2. MOTEUR BOTS AVEC FEEDBACK LIVE DISCORD
// ==================================================================
function createProgressBar(current, total, size = 15) {
    const progress = Math.min(Math.round((current / total) * size), size);
    return '█'.repeat(progress) + '░'.repeat(size - progress);
}

async function startSocketBots(pin, baseName, count, interaction) {
    let joined = 0;
    let errors = [];
    
    // Embed Initial
    const embed = new EmbedBuilder()
        .setColor(0xFFA500) // Orange (En cours)
        .setTitle(`🚀 Attaque en cours : ${pin}`)
        .setDescription(`**Cible :** ${count} Bots\n**Préfixe :** \`${baseName}\``)
        .addFields(
            { name: 'Progression', value: `\`${createProgressBar(0, count)}\` 0/${count}`, inline: false },
            { name: 'Status', value: '🕒 Initialisation...', inline: false }
        )
        .setFooter({ text: "Kahoot Elite V3.1" });

    // On stocke le message pour l'éditer plus tard
    await interaction.editReply({ embeds: [embed] });

    for (let i = 0; i < count; i++) {
        const botName = `${baseName}_${i+1}`;
        const kBot = new Kahoot();

        // 1. Événement JOINED (Succès)
        kBot.on("Joined", async () => {
            joined++;
            safeLog('NET', `✅ ${botName} connecté.`);
            
            // Mise à jour Discord tous les 5 bots ou à la fin (pour éviter rate-limit)
            if (joined % 5 === 0 || joined === count) {
                const percent = Math.round((joined / count) * 100);
                const statusField = errors.length > 0 
                    ? `⚠️ **Erreurs récentes:**\n${errors.slice(-3).join('\n')}` 
                    : '✅ Connexions stables';

                embed.setFields(
                    { name: 'Progression', value: `\`${createProgressBar(joined, count)}\` ${joined}/${count} (${percent}%)`, inline: false },
                    { name: 'Status', value: statusField, inline: false }
                );
                
                // Si fini
                if (joined === count) {
                    embed.setColor(0x00FF00).setTitle(`✅ Attaque Terminée : ${pin}`);
                    safeLog('MASTER', 'Attaque terminée avec succès.');
                }
                
                await interaction.editReply({ embeds: [embed] }).catch(() => {});
            }
        });

        // 2. Événement DISCONNECT / ERROR (Echec)
        kBot.on("Disconnect", (reason) => {
            if (reason !== "Quiz Locked" && reason !== "Brrr! The quiz has ended.") {
                const err = `❌ ${botName}: ${reason}`;
                errors.push(err);
                safeLog('NET', err);
            }
        });

        // Anti-ban delay (60ms)
        try {
            await new Promise(r => setTimeout(r, 60)); 
            kBot.join(pin, botName).catch(err => {
                errors.push(`❌ ${botName}: Echec Join`);
            });
        } catch (e) {}
    }
}

async function solvePin(pin) {
    safeLog('SOLVER', `Scan PIN ${pin}...`);
    return new Promise((resolve) => {
        const c = new Kahoot();
        const t = setTimeout(() => { c.leave(); resolve(null); }, 6000);
        c.on("Joined", () => {
            const u = c.quiz ? c.quiz.uuid : null;
            safeLog('SOLVER', u ? `UUID: ${u}` : 'Fail');
            c.leave(); clearTimeout(t); resolve(u);
        });
        c.join(pin, "s_"+Math.floor(Math.random()*99)).catch(()=>resolve(null));
    });
}

// ==================================================================
// 3. SERVER & ROUTES
// ==================================================================
app.get('/', (req, res) => res.send('KAHOOT ELITE V3.1 (DASHBOARD ONLINE)'));

app.get('/copy/:id', (req, res) => {
    const entry = scriptsCache.get(req.params.id);
    if (!entry) return res.status(404).send("EXPIRED");
    
    const payload = generatePayload(entry.data);
    const b64 = Buffer.from(payload).toString('base64');
    const loader = `eval(decodeURIComponent(escape(window.atob('${b64}'))))`;
    res.send(loader);
});

// ==================================================================
// 4. DISCORD COMMANDS
// ==================================================================
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = [
    new SlashCommandBuilder().setName('kahoot').setDescription('Elite V3.1 Menu')
        .addSubcommand(s => s.setName('solve').setDescription('Réponses via PIN')
            .addStringOption(o=>o.setName('pin').setDescription('PIN du jeu').setRequired(true)))
        .addSubcommand(s => s.setName('bots').setDescription('Lancer Bots (Dashboard Live)')
            .addStringOption(o=>o.setName('pin').setDescription('PIN').setRequired(true))
            .addStringOption(o=>o.setName('name').setDescription('Nom').setRequired(true))
            .addIntegerOption(o=>o.setName('count').setDescription('Quantité (Max 50)').setRequired(false)))
        .addSubcommand(s => s.setName('logs').setDescription('Logs Serveur')),
    new SlashCommandBuilder().setName('ping').setDescription('Latence')
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
(async () => { try { await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands }); } catch(e){} })();

async function handleQuiz(uuid, interaction) {
    try {
        const res = await axios.get(`https://play.kahoot.it/rest/kahoots/${uuid}`);
        const data = res.data;
        const simple = data.questions.map(q => ({
            q: q.question ? q.question.replace(/<[^>]*>/g,'').toLowerCase() : "img",
            a: q.choices ? q.choices.find(c => c.correct).answer.replace(/<[^>]*>/g,'').toLowerCase() : "?"
        }));
        
        const sid = crypto.randomUUID();
        scriptsCache.set(sid, { data: simple });
        
        const embed = new EmbedBuilder().setColor(0x6366f1)
            .setTitle(`🔓 ${data.title}`)
            .setDescription(`**UUID:** \`${uuid}\`\n[🔗 SCRIPT iOS/PC](${SERVICE_URL}/copy/${sid})`);
        
        interaction.editReply({ embeds: [embed] });
    } catch (e) {
        interaction.editReply("❌ Erreur UUID.");
    }
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName, options } = interaction;

    if (commandName === 'ping') return interaction.reply(`Ping: ${client.ws.ping}ms`);

    if (commandName === 'kahoot') {
        const sub = options.getSubcommand();
        
        // Logs
        if (sub === 'logs') {
            const content = logsBuffer.length > 0 ? logsBuffer.join('\n') : "Rien à signaler.";
            return interaction.reply({ content: `\`\`\`log\n${content}\n\`\`\``, flags: 64 });
        }

        // Defer (Invisible pour les autres)
        await interaction.deferReply({ flags: 64 });

        if (sub === 'solve') {
            const uuid = await solvePin(options.getString('pin'));
            if (uuid) handleQuiz(uuid, interaction);
            else interaction.editReply("❌ PIN invalide.");
        }

        if (sub === 'bots') {
            const pin = options.getString('pin');
            const count = Math.min(options.getInteger('count') || 10, 50);
            
            // On passe 'interaction' à la fonction pour le live update
            startSocketBots(pin, options.getString('name'), count, interaction);
        }
    }
});

app.listen(port, () => safeLog('SYS', `Online Port ${port}`));
client.login(process.env.DISCORD_TOKEN);


