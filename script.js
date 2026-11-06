(() => {
    'use strict';

    if (typeof Matter === 'undefined') {
        document.getElementById('battle-status').textContent = 'PHYSICS ENGINE UNAVAILABLE';
        document.getElementById('start-button').disabled = true;
        return;
    }
    const { Engine, Render, Bodies, Composite, Events, Body } = Matter;
    const WORLD_SIZE = 900;
    const CENTER = WORLD_SIZE / 2;
    const ARENA_RADIUS = 370;
    const BALL_RADIUS = 15;
    const BASE_FRAME_MS = 1000 / 60;
    const MIN_FLAG_SPEED = 4.5;
    const MAX_FLAG_SPEED = 10;
    const ROUND_BREAK_MS = 12000;
    const countryCodes = (
        'AD AE AF AG AL AM AO AR AT AU AZ BA BB BD BE BF BG BH BI BJ BN BO BR BS BT BW BY BZ ' +
        'CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET ' +
        'FI FJ FM FR GA GB GD GE GH GM GN GQ GR GT GW GY HN HR HT HU ID IE IL IN IQ IR IS ' +
        'IT JM JO JP KE KG KH KI KM KN KP KR KW KZ LA LB LC LI LK LR LS LT LU LV LY MA MC ' +
        'MD ME MG MH MK ML MM MN MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NR NZ OM PA ' +
        'PE PG PH PK PL PT PW PY QA RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ' +
        'ST SV SY SZ TD TG TH TJ TL TM TN TO TR TT TV TZ UA UG US UY UZ VA VC VE VN VU WS ' +
        'YE ZA ZM ZW PS'
    ).split(' ');

    function countryNameFor(code) {
        const overrides = { PS: 'Palestine', VA: 'Vatican City' };
        if (overrides[code]) return overrides[code];
        if (typeof Intl.DisplayNames === 'function') {
            const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
            const name = displayNames.of(code);
            if (name && name !== code && name !== 'Unknown Region') return name;
        }
        return code;
    }

    const initialRoster = countryCodes
        .map((code) => ({ name: countryNameFor(code), code }))
        .sort((a, b) => a.name.localeCompare(b.name));

    const engine = Engine.create();
    engine.gravity.y = 0;
    engine.positionIterations = 8;
    engine.velocityIterations = 6;

    const render = Render.create({
        element: document.getElementById('game-container'),
        engine,
        options: {
            width: WORLD_SIZE,
            height: WORLD_SIZE,
            pixelRatio: 1,
            wireframes: false,
            background: '#0b1016',
            hasBounds: false
        }
    });

    const survivorList = document.getElementById('survivor-list');
    const aliveCount = document.getElementById('alive-count');
    const battleStatus = document.getElementById('battle-status');
    const liveStatus = document.querySelector('.live-status');
    const streamModeToggle = document.getElementById('stream-mode-toggle');
    const streamModeExit = document.getElementById('stream-mode-exit');
    const streamRound = document.getElementById('stream-round');
    const streamAliveCount = document.getElementById('stream-alive-count');
    const streamEliminationKicker = document.getElementById('stream-elimination-kicker');
    const streamEliminationName = document.getElementById('stream-elimination-name');
    const streamEliminatedCount = document.getElementById('stream-eliminated-count');
    const streamTotalCount = document.getElementById('stream-total-count');
    const streamProgress = document.getElementById('stream-progress');
    const streamEliminatedFlags = document.getElementById('stream-eliminated-flags');
    const startButton = document.getElementById('start-button');
    const startButtonLabel = document.getElementById('start-button-label');
    const resetButton = document.getElementById('reset-button');
    const autoToggle = document.getElementById('auto-toggle');
    const autoToggleLabel = document.getElementById('auto-toggle-label');
    const voiceToggle = document.getElementById('voice-toggle');
    const voiceToggleLabel = document.getElementById('voice-toggle-label');
    const effectsToggle = document.getElementById('effects-toggle');
    const effectsToggleLabel = document.getElementById('effects-toggle-label');
    const roundNumberElement = document.getElementById('round-number');
    const centerMessage = document.getElementById('center-message');
    const outPopup = document.getElementById('out-popup');
    const winnerPopup = document.getElementById('winner-popup');
    const winnerName = document.getElementById('winner-name');
    const winnerSurvival = document.getElementById('winner-survival');
    const winnerHits = document.getElementById('winner-hits');
    const winnerRound = document.getElementById('winner-round');
    const confettiLayer = document.getElementById('confetti-layer');
    const suspenseBadge = document.getElementById('suspense-badge');
    const suspenseLabel = document.getElementById('suspense-label');
    const countrySearch = document.getElementById('country-search');
    const killFeedList = document.getElementById('kill-feed-list');
    const addFlagForm = document.getElementById('add-flag-form');
    const countryCodeInput = document.getElementById('country-code');
    const formMessage = document.getElementById('form-message');
    const youtubeChatForm = document.getElementById('youtube-chat-form');
    const youtubeClientIdInput = document.getElementById('youtube-client-id');
    const youtubeVideoIdInput = document.getElementById('youtube-video-id');
    const youtubeConnectButton = document.getElementById('youtube-connect');
    const youtubeDisconnectButton = document.getElementById('youtube-disconnect');
    const youtubeChatStatus = document.getElementById('youtube-chat-status');

    const flagImages = new Map();
    let roster = initialRoster.map((country) => ({ ...country }));
    let alive = new Map();
    let eliminatedThisRound = [];
    let powerUps = new Map();
    let eliminationQueue = [];
    let queuedEliminations = new Set();
    let announcementInProgress = false;
    let gameStarted = false;
    let gameFinished = false;
    let autoRounds = true;
    let voiceEnabled = true;
    let effectsEnabled = true;
    let roundNumber = 0;
    let nextRoundTimer;
    let powerUpTimer;
    let lastFrameTime = 0;
    let roundStartedAt = 0;
    let trackedCountryCode = null;
    let arenaZoom = 1;
    let roundSpinnerSpeed = 0.044;
    let spinnerDirection = 1;
    let spinnerModeTimer = 0;
    let audioContext;
    let heartbeatTimer;
    let battleGeneration = 0;
    let activeAnnouncementFinish = null;
    let youtubeTokenClient = null;
    let youtubeAccessToken = null;
    let youtubeLiveChatId = null;
    let youtubePageToken = null;
    let youtubePollTimer = null;
    let youtubeConnectionGeneration = 0;
    let youtubePollInterval = 5000;
    let googleOAuthLoadPromise = null;
    const chatUserCooldowns = new Map();
    let blade;
    let crossBlade;
    let previousWinnerCode = null;
    const speechAvailable = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

    if (!speechAvailable) {
        voiceEnabled = false;
        voiceToggle.disabled = true;
        voiceToggleLabel.textContent = 'VOICE UNAVAILABLE';
        voiceToggle.classList.remove('is-active');
        voiceToggle.setAttribute('aria-pressed', 'false');
    }

    function flagUrl(code, size = 'w80') {
        const flagCode = code === 'UK' ? 'gb' : code.toLowerCase();
        return `https://flagcdn.com/${size}/${flagCode}.png`;
    }

    function loadFlag(code) {
        if (flagImages.has(code)) return flagImages.get(code);
        const image = new Image();
        image.src = flagUrl(code);
        flagImages.set(code, image);
        return image;
    }

    function createArena() {
        const wallBodies = [];
        const sides = 72;
        for (let i = 0; i < sides; i += 1) {
            const angle = (i / sides) * Math.PI * 2;
            const x = CENTER + ARENA_RADIUS * Math.cos(angle);
            const y = CENTER + ARENA_RADIUS * Math.sin(angle);
            wallBodies.push(Bodies.rectangle(x, y, 40, 22, {
                isStatic: true,
                angle: angle + Math.PI / 2,
                label: 'arena-wall',
                restitution: 0.96,
                friction: 0,
                render: { fillStyle: '#38434a', strokeStyle: '#74e7f2', lineWidth: 1 }
            }));
        }
        Composite.add(engine.world, wallBodies);

        const bladeStyle = {
            isStatic: true,
            label: 'killer',
            restitution: 0.4,
            render: { visible: false }
        };
        blade = Bodies.rectangle(CENTER, CENTER, 286, 42, bladeStyle);
        crossBlade = Bodies.rectangle(CENTER, CENTER, 286, 42, {
            ...bladeStyle,
            angle: Math.PI / 2
        });
        Composite.add(engine.world, [blade, crossBlade]);

        Events.on(engine, 'beforeUpdate', (event) => {
            if (!gameStarted || gameFinished) return;
            spinnerModeTimer += event.delta;
            if (spinnerModeTimer >= 12000) {
                spinnerModeTimer = 0;
                spinnerDirection *= -1;
                roundSpinnerSpeed = 0.039 + Math.random() * 0.013;
                battleStatus.textContent = spinnerDirection > 0 ? 'SPINNER SURGE!' : 'SPINNER REVERSED!';
            }
            const speedBurst = spinnerModeTimer > 7500 && spinnerModeTimer < 9500 ? 1.8 : 1;
            const rotationStep = roundSpinnerSpeed * (event.delta / BASE_FRAME_MS) * spinnerDirection * speedBurst;
            Body.setAngle(blade, blade.angle + rotationStep);
            Body.setAngle(crossBlade, crossBlade.angle + rotationStep);
            for (const body of alive.values()) {
                const driftPhase = engine.timing.timestamp / 1100 + body.id * 0.73;
                Body.applyForce(body, body.position, {
                    x: Math.cos(driftPhase) * 0.000004,
                    y: Math.sin(driftPhase) * 0.00001
                });
                if (body.speedBoostUntil > engine.timing.timestamp) {
                    Body.setVelocity(body, {
                        x: body.velocity.x * 1.002,
                        y: body.velocity.y * 1.002
                    });
                }
                const speed = body.speed;
                if (speed > MAX_FLAG_SPEED) {
                    Body.setVelocity(body, {
                        x: body.velocity.x * MAX_FLAG_SPEED / speed,
                        y: body.velocity.y * MAX_FLAG_SPEED / speed
                    });
                } else if (speed < MIN_FLAG_SPEED) {
                    const angle = speed > 0.01
                        ? Math.atan2(body.velocity.y, body.velocity.x)
                        : driftPhase;
                    Body.setVelocity(body, {
                        x: Math.cos(angle) * MIN_FLAG_SPEED,
                        y: Math.sin(angle) * MIN_FLAG_SPEED
                    });
                }
            }
            for (const powerUp of powerUps.values()) {
                if (powerUp.type !== 'well') continue;
                for (const body of alive.values()) {
                    const dx = CENTER - body.position.x;
                    const dy = CENTER - body.position.y;
                    const distance = Math.max(50, Math.hypot(dx, dy));
                    Body.applyForce(body, body.position, {
                        x: (dx / distance) * 0.000012,
                        y: (dy / distance) * 0.000012
                    });
                }
            }
        });
    }

    function chooseSpawnPosition() {
        const placed = [...alive.values()];
        const safeRadius = ARENA_RADIUS - BALL_RADIUS - 30;
        for (let attempt = 0; attempt < 160; attempt += 1) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.sqrt(Math.random()) * safeRadius;
            const position = {
                x: CENTER + Math.cos(angle) * distance,
                y: CENTER + Math.sin(angle) * distance
            };
            const isClear = placed.every((body) =>
                Math.hypot(body.position.x - position.x, body.position.y - position.y) > BALL_RADIUS * 2.15
            );
            if (isClear) return position;
        }

        const index = placed.length;
        const angle = index * 2.399963229728653;
        const distance = Math.sqrt((index + 0.5) / Math.max(roster.length, 1)) * safeRadius;
        return {
            x: CENTER + Math.cos(angle) * distance,
            y: CENTER + Math.sin(angle) * distance
        };
    }

    function createFlag(country) {
        const position = chooseSpawnPosition();
        const body = Bodies.circle(position.x, position.y, BALL_RADIUS, {
            label: 'flag',
            restitution: 0.92 + Math.random() * 0.12,
            friction: 0.001,
            frictionAir: 0.0003,
            density: 0.00055 + Math.random() * 0.0003,
            countryCode: country.code,
            countryName: country.name,
            hitsTaken: 0,
            render: {
                fillStyle: '#d8e1eb',
                strokeStyle: 'rgba(255,255,255,0.8)',
                lineWidth: 2
            }
        });
        alive.set(country.code, body);
        Composite.add(engine.world, body);
        if (roundNumber > 0 && !gameFinished) {
            if (country.code === previousWinnerCode) {
                Body.setPosition(body, { x: CENTER, y: CENTER });
            }
            setFlagSpeed(body, 5.5 + Math.random() * 3);
        }
    }

    function setFlagSpeed(body, speed) {
        const angle = Math.random() * Math.PI * 2;
        Body.setVelocity(body, {
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed
        });
    }

    function toggleTrackedCountry(code) {
        trackedCountryCode = trackedCountryCode === code ? null : code;
        updateLeaderboard();
    }

    function spawnPowerUp() {
        if (!gameStarted || powerUps.size >= 2) return;
        const types = ['shield', 'well', 'boost'];
        const type = types[Math.floor(Math.random() * types.length)];
        const colors = { shield: '#55d9ff', well: '#bc83ff', boost: '#c9ff57' };
        const symbols = { shield: 'S', well: 'W', boost: 'B' };
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * (ARENA_RADIUS * 0.55);
        const body = Bodies.circle(
            CENTER + Math.cos(angle) * distance,
            CENTER + Math.sin(angle) * distance,
            type === 'well' ? 22 : 17,
            {
                isStatic: true,
                isSensor: true,
                label: 'powerup',
                powerType: type,
                render: {
                    fillStyle: `${colors[type]}30`,
                    strokeStyle: colors[type],
                    lineWidth: 3
                }
            }
        );
        powerUps.set(body.id, { body, type, color: colors[type], symbol: symbols[type] });
        Composite.add(engine.world, body);
        window.setTimeout(() => removePowerUp(body.id), 10500);
    }

    function removePowerUp(id) {
        const powerUp = powerUps.get(id);
        if (!powerUp) return;
        Composite.remove(engine.world, powerUp.body);
        powerUps.delete(id);
    }

    function applyPowerUp(powerUpBody, flagBody) {
        const powerUp = powerUps.get(powerUpBody.id);
        if (!powerUp || !alive.has(flagBody.countryCode)) return;
        const country = roster.find((entry) => entry.code === flagBody.countryCode);
        if (powerUp.type === 'well') return;

        if (powerUp.type === 'shield') {
            flagBody.shieldCharges = 1;
            flagBody.shieldUntil = engine.timing.timestamp + 15000;
        } else {
            flagBody.speedBoostUntil = engine.timing.timestamp + 5000;
            Body.setVelocity(flagBody, {
                x: flagBody.velocity.x * 1.8 + (Math.random() - 0.5) * 2,
                y: flagBody.velocity.y * 1.8 + (Math.random() - 0.5) * 2
            });
        }

        removePowerUp(powerUpBody.id);
        if (country) addKillFeed(`${country.name} collected ${powerUp.type === 'shield' ? 'a shield' : 'a speed boost'}`, 'power');
        playTone(powerUp.type === 'shield' ? 740 : 520, 0.18, 'sine', 0.035);
    }

    function addKillFeed(text, kind = 'elimination') {
        const item = document.createElement('li');
        item.className = `kill-feed-item is-${kind}`;
        item.textContent = text;
        killFeedList.prepend(item);
        while (killFeedList.children.length > 5) killFeedList.lastElementChild.remove();
    }

    function ensureAudio() {
        if (!effectsEnabled || audioContext) return;
        const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextConstructor) return;
        audioContext = new AudioContextConstructor();
        if (audioContext.state === 'suspended') audioContext.resume();
    }

    function playTone(frequency, duration = 0.08, wave = 'sine', volume = 0.025) {
        if (!effectsEnabled || !audioContext || audioContext.state !== 'running') return;
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = wave;
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        gain.gain.setValueAtTime(volume, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration);
    }

    function setSuspenseMode(count) {
        const isFinalTen = count <= 10 && count > 5;
        const isFinalFive = count <= 5 && count > 1;
        const isSuspense = isFinalTen || isFinalFive;
        suspenseBadge.hidden = !isSuspense;
        if (isSuspense) suspenseLabel.textContent = isFinalFive ? 'FINAL 5' : 'FINAL 10';
        document.getElementById('arena-shell').classList.toggle('is-suspense', isSuspense);
        if (isSuspense && !heartbeatTimer) {
            heartbeatTimer = window.setInterval(() => {
                playTone(72, 0.12, 'sine', 0.055);
                window.setTimeout(() => playTone(58, 0.16, 'sine', 0.04), 145);
            }, isFinalFive ? 700 : 950);
        } else if (!isSuspense && heartbeatTimer) {
            window.clearInterval(heartbeatTimer);
            heartbeatTimer = null;
        }
    }

    function updateCamera() {
        const targetZoom = alive.size <= 5 && alive.size > 1 ? 1.65 : alive.size <= 10 && alive.size > 5 ? 1.3 : 1;
        arenaZoom += (targetZoom - arenaZoom) * 0.035;
        if (Math.abs(targetZoom - arenaZoom) < 0.005) arenaZoom = targetZoom;
        render.options.hasBounds = true;
        const halfSize = WORLD_SIZE / (2 * arenaZoom);
        render.bounds.min.x = CENTER - halfSize;
        render.bounds.min.y = CENTER - halfSize;
        render.bounds.max.x = CENTER + halfSize;
        render.bounds.max.y = CENTER + halfSize;
    }

    function formatDuration(milliseconds) {
        const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${String(seconds).padStart(2, '0')}`;
    }

    function celebrateWinner() {
        confettiLayer.replaceChildren();
        const colors = ['#c9ff57', '#39d6e7', '#ff527e', '#f4f7ff', '#ffd166'];
        for (let i = 0; i < 48; i += 1) {
            const piece = document.createElement('span');
            piece.className = 'confetti-piece';
            piece.style.setProperty('--x', `${Math.random() * 100}%`);
            piece.style.setProperty('--delay', `${Math.random() * 1.2}s`);
            piece.style.setProperty('--duration', `${2.2 + Math.random() * 2}s`);
            piece.style.setProperty('--color', colors[i % colors.length]);
            confettiLayer.append(piece);
        }
    }

    function updateLeaderboard() {
        const scrollTop = survivorList.scrollTop;
        const searchTerm = countrySearch.value.trim().toLocaleLowerCase();
        survivorList.replaceChildren();
        for (const country of roster) {
            if (!alive.has(country.code)) continue;
            if (searchTerm && !`${country.name} ${country.code}`.toLocaleLowerCase().includes(searchTerm)) continue;
            const row = document.createElement('li');
            row.className = `survivor-row${trackedCountryCode === country.code ? ' is-tracked' : ''}`;
            row.tabIndex = 0;
            row.setAttribute('role', 'button');
            row.setAttribute('aria-pressed', String(trackedCountryCode === country.code));
            row.setAttribute('aria-label', `Track ${country.name} in arena`);
            row.addEventListener('click', () => toggleTrackedCountry(country.code));
            row.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    toggleTrackedCountry(country.code);
                }
            });

            const flag = document.createElement('img');
            flag.className = 'survivor-flag';
            flag.src = flagUrl(country.code, 'w40');
            flag.alt = '';
            flag.loading = 'lazy';

            const name = document.createElement('span');
            name.className = 'survivor-name';
            name.textContent = country.name;

            const code = document.createElement('span');
            code.className = 'survivor-code';
            code.textContent = country.code;

            row.append(flag, name, code);
            survivorList.append(row);
        }
        if (survivorList.children.length === 0) {
            const empty = document.createElement('li');
            empty.className = 'empty-search';
            empty.textContent = searchTerm ? 'No matching flags.' : 'No countries left.';
            survivorList.append(empty);
        }
        survivorList.scrollTop = scrollTop;
        aliveCount.textContent = String(alive.size);
        streamAliveCount.textContent = String(alive.size);
        streamTotalCount.textContent = String(roster.length);
        setSuspenseMode(alive.size);
    }

    function renderStreamEliminations() {
        const total = eliminatedThisRound.length;
        streamEliminatedCount.textContent = String(total);
        streamTotalCount.textContent = String(roster.length);
        streamRound.textContent = String(roundNumber).padStart(2, '0');
        streamProgress.style.width = `${roster.length ? (total / roster.length) * 100 : 0}%`;
        streamEliminatedFlags.replaceChildren();
        const eliminated = eliminatedThisRound.slice(-50);
        const eliminatedCodes = new Set(eliminated.map((country) => country.code));
        const alivePreview = roster
            .filter((country) => alive.has(country.code) && !eliminatedCodes.has(country.code))
            .slice(0, Math.max(0, 50 - eliminated.length));
        const visibleFlags = [
            ...eliminated.map((country) => ({ country, isEliminated: true })),
            ...alivePreview.map((country) => ({ country, isEliminated: false }))
        ];
        for (const entry of visibleFlags) {
            const { country, isEliminated } = entry;
            const item = document.createElement('li');
            item.className = isEliminated ? 'is-eliminated' : 'is-alive';
            item.title = country.name;
            const flag = document.createElement('img');
            flag.src = flagUrl(country.code, 'w40');
            flag.alt = country.name;
            flag.loading = 'lazy';
            item.append(flag);
            streamEliminatedFlags.append(item);
        }
    }

    function setStreamMode(enabled) {
        document.querySelector('.app').classList.toggle('is-stream-mode', enabled);
        document.body.classList.toggle('stream-view-active', enabled);
        streamModeToggle.setAttribute('aria-pressed', String(enabled));
        streamModeToggle.textContent = enabled ? 'EXIT STREAM VIEW' : '9:16 STREAM VIEW';
        if (enabled) renderStreamEliminations();
    }

    function setFormMessage(message, type = '') {
        formMessage.textContent = message;
        formMessage.className = `form-message${type ? ` is-${type}` : ''}`;
    }

    function setYouTubeChatStatus(message, type = '') {
        youtubeChatStatus.textContent = message;
        youtubeChatStatus.className = `chat-status${type ? ` is-${type}` : ''}`;
    }

    function ensureGoogleOAuth() {
        if (window.google?.accounts?.oauth2) return Promise.resolve();
        if (googleOAuthLoadPromise) return googleOAuthLoadPromise;
        googleOAuthLoadPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.onload = () => {
                if (window.google?.accounts?.oauth2) resolve();
                else reject(new Error('Google sign-in did not initialize.'));
            };
            script.onerror = () => reject(new Error('Could not load Google sign-in.'));
            document.head.append(script);
        }).finally(() => {
            googleOAuthLoadPromise = null;
        });
        return googleOAuthLoadPromise;
    }

    function saveYouTubeSettings() {
        try {
            localStorage.setItem('flagsArena.youtubeChat', JSON.stringify({
                clientId: youtubeClientIdInput.value.trim(),
                videoId: youtubeVideoIdInput.value.trim()
            }));
        } catch (error) {
            setYouTubeChatStatus(`Could not save settings: ${error.message}`, 'error');
        }
    }

    function loadYouTubeSettings() {
        try {
            const settings = JSON.parse(localStorage.getItem('flagsArena.youtubeChat') || '{}');
            youtubeClientIdInput.value = settings.clientId || '';
            youtubeVideoIdInput.value = settings.videoId || '';
        } catch (error) {
            setYouTubeChatStatus(`Could not load saved settings: ${error.message}`, 'error');
        }
    }

    function extractYouTubeVideoId(value) {
        const input = value.trim();
        if (/^[\w-]{11}$/.test(input)) return input;
        try {
            const url = new URL(input);
            const hostname = url.hostname.toLowerCase();
            let videoId = null;
            if (hostname === 'youtu.be') {
                videoId = url.pathname.slice(1).split('/')[0];
            } else if (hostname === 'youtube.com' || hostname.endsWith('.youtube.com')) {
                if (url.searchParams.has('v')) videoId = url.searchParams.get('v');
                const match = url.pathname.match(/^\/(?:live|shorts|embed)\/([\w-]{11})/);
                if (match) videoId = match[1];
            }
            return videoId && /^[\w-]{11}$/.test(videoId) ? videoId : null;
        } catch {
            return null;
        }
    }

    async function youtubeApiRequest(resource, params, token) {
        const url = new URL(`https://www.googleapis.com/youtube/v3/${resource}`);
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) url.searchParams.set(key, value);
        });
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) {
            const message = data.error?.message || `YouTube API request failed (${response.status})`;
            throw new Error(message);
        }
        return data;
    }

    function disconnectYouTubeChat(status = 'Disconnected', type = '') {
        youtubeConnectionGeneration += 1;
        window.clearTimeout(youtubePollTimer);
        youtubePollTimer = null;
        youtubeAccessToken = null;
        youtubeLiveChatId = null;
        youtubePageToken = null;
        youtubeConnectButton.disabled = false;
        youtubeDisconnectButton.disabled = true;
        setYouTubeChatStatus(status, type);
    }

    function handleYouTubeCommand(message) {
        const command = message.snippet?.textMessageDetails?.messageText?.trim()
            .match(/^!(spawn|boost|shield)\s+([a-z]{2})$/i);
        if (!command) return;

        const action = command[1].toLowerCase();
        const code = command[2].toUpperCase() === 'UK' ? 'GB' : command[2].toUpperCase();
        const author = message.authorDetails?.channelId || message.authorDetails?.displayName || 'viewer';
        const now = Date.now();
        const previousCommandAt = chatUserCooldowns.get(author) || 0;
        if (now - previousCommandAt < 5000) return;
        chatUserCooldowns.set(author, now);
        if (chatUserCooldowns.size > 500) {
            for (const [user, timestamp] of chatUserCooldowns) {
                if (now - timestamp > 60000) chatUserCooldowns.delete(user);
            }
        }

        if (!countryCodes.includes(code)) {
            addKillFeed(`Chat: ${code} is not a supported country code`, 'chat');
            return;
        }

        const country = roster.find((entry) => entry.code === code) || { name: countryNameFor(code), code };
        const flag = alive.get(code);
        if (action === 'spawn') {
            if (flag) {
                addKillFeed(`${country.name} is already in the arena`, 'chat');
                return;
            }
            if (!roster.some((entry) => entry.code === code)) roster.push(country);
            if (!gameFinished) {
                createFlag(country);
                updateLeaderboard();
                renderStreamEliminations();
                addKillFeed(`${country.name} joined from YouTube chat`, 'chat');
            } else {
                addKillFeed(`${country.name} queued for the next round`, 'chat');
            }
            return;
        }

        if (!flag) {
            addKillFeed(`${country.name} must be alive for !${action}`, 'chat');
            return;
        }
        if (action === 'shield') {
            flag.shieldCharges = 1;
            flag.shieldUntil = engine.timing.timestamp + 15000;
        } else {
            flag.speedBoostUntil = engine.timing.timestamp + 5000;
            Body.setVelocity(flag, {
                x: flag.velocity.x * 1.8 + (Math.random() - 0.5) * 2,
                y: flag.velocity.y * 1.8 + (Math.random() - 0.5) * 2
            });
        }
        const displayName = (message.authorDetails?.displayName || 'viewer').slice(0, 24);
        addKillFeed(`${country.name} received ${action} from ${displayName}`, 'chat');
        playTone(action === 'shield' ? 740 : 520, 0.18, 'sine', 0.035);
    }

    async function pollYouTubeChat(generation) {
        if (generation !== youtubeConnectionGeneration || !youtubeAccessToken || !youtubeLiveChatId) return;
        try {
            const result = await youtubeApiRequest('liveChat/messages', {
                liveChatId: youtubeLiveChatId,
                part: 'snippet,authorDetails',
                maxResults: 200,
                pageToken: youtubePageToken
            }, youtubeAccessToken);
            youtubePageToken = result.nextPageToken || youtubePageToken;
            youtubePollInterval = Math.max(Number(result.pollingIntervalMillis) || 5000, 1000);
            (result.items || []).forEach(handleYouTubeCommand);
            setYouTubeChatStatus('Connected · listening for commands', 'connected');
            youtubePollTimer = window.setTimeout(() => pollYouTubeChat(generation), youtubePollInterval);
        } catch (error) {
            if (generation !== youtubeConnectionGeneration) return;
            disconnectYouTubeChat(`YouTube chat error: ${error.message}`, 'error');
        }
    }

    async function startYouTubeChat(videoId, token) {
        const generation = youtubeConnectionGeneration;
        const video = await youtubeApiRequest('videos', {
            part: 'liveStreamingDetails',
            id: videoId
        }, token);
        const liveChatId = video.items?.[0]?.liveStreamingDetails?.activeLiveChatId;
        if (!liveChatId) throw new Error('No active live chat found for that video.');
        if (generation !== youtubeConnectionGeneration) return;
        youtubeAccessToken = token;
        youtubeLiveChatId = liveChatId;
        youtubePageToken = null;
        youtubePollInterval = 5000;
        setYouTubeChatStatus('Connected · listening for commands', 'connected');
        youtubeDisconnectButton.disabled = false;
        await pollYouTubeChat(generation);
    }

    youtubeChatForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const clientId = youtubeClientIdInput.value.trim();
        const videoId = extractYouTubeVideoId(youtubeVideoIdInput.value);
        if (!clientId) {
            setYouTubeChatStatus('Enter your Google OAuth client ID.', 'error');
            youtubeClientIdInput.focus();
            return;
        }
        if (!videoId) {
            setYouTubeChatStatus('Enter a valid YouTube live video URL or ID.', 'error');
            youtubeVideoIdInput.focus();
            return;
        }

        disconnectYouTubeChat('Requesting YouTube access…');
        saveYouTubeSettings();
        youtubeConnectButton.disabled = true;
        const generation = youtubeConnectionGeneration;
        try {
            await ensureGoogleOAuth();
            if (generation !== youtubeConnectionGeneration) return;
            youtubeTokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: 'https://www.googleapis.com/auth/youtube.readonly',
                callback: async (response) => {
                    if (generation !== youtubeConnectionGeneration) return;
                    if (response.error) {
                        disconnectYouTubeChat(`Google authorization failed: ${response.error}`, 'error');
                        return;
                    }
                    try {
                        await startYouTubeChat(videoId, response.access_token);
                    } catch (error) {
                        if (generation === youtubeConnectionGeneration) {
                            disconnectYouTubeChat(`Could not connect: ${error.message}`, 'error');
                        }
                    }
                },
                error_callback: (error) => {
                    if (generation === youtubeConnectionGeneration) {
                        disconnectYouTubeChat(`Google authorization failed: ${error.message || error.type}`, 'error');
                    }
                }
            });
            youtubeTokenClient.requestAccessToken({ prompt: '' });
        } catch (error) {
            disconnectYouTubeChat(`Could not start Google sign-in: ${error.message}`, 'error');
        }
    });

    youtubeDisconnectButton.addEventListener('click', () => disconnectYouTubeChat());

    function announce(text, onComplete = () => {}) {
        const generation = battleGeneration;
        let completed = false;
        let fallbackTimer;
        const utterance = speechAvailable && voiceEnabled ? new SpeechSynthesisUtterance(text) : null;
        const complete = () => {
            if (completed) return;
            completed = true;
            window.clearTimeout(fallbackTimer);
            if (activeAnnouncementFinish === complete) activeAnnouncementFinish = null;
            if (generation === battleGeneration) onComplete();
        };

        activeAnnouncementFinish = complete;
        if (!utterance) {
            fallbackTimer = window.setTimeout(complete, 1100);
            return;
        }

        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        utterance.pitch = 0.96;
        utterance.onend = complete;
        utterance.onerror = complete;
        fallbackTimer = window.setTimeout(complete, Math.max(7000, Math.min(15000, text.length * 180)));
        window.speechSynthesis.speak(utterance);
    }

    function showOutPopup(country) {
        outPopup.classList.remove('is-visible');
        outPopup.textContent = `${country.name} OUT!`;
        void outPopup.offsetWidth;
        outPopup.classList.add('is-visible');
    }

    function finishBattle() {
        gameStarted = false;
        gameFinished = true;
        liveStatus.classList.remove('is-running');
        window.clearInterval(powerUpTimer);
        if (alive.size === 1) {
            eliminationQueue = [];
            queuedEliminations.clear();
            const winner = roster.find((country) => alive.has(country.code));
            const winnerBody = alive.get(winner.code);
            previousWinnerCode = winner.code;
            streamEliminationKicker.textContent = 'LAST FLAG STANDING';
            streamEliminationName.textContent = winner.name.toUpperCase();
            document.getElementById('stream-out-label').textContent = 'WINS!';
            battleStatus.textContent = `ANNOUNCING ${winner.name.toUpperCase()}`;
            winnerName.textContent = winner.name;
            winnerSurvival.textContent = formatDuration(performance.now() - roundStartedAt);
            winnerHits.textContent = String(winnerBody.hitsTaken || 0);
            winnerRound.textContent = String(roundNumber).padStart(2, '0');
            winnerPopup.hidden = false;
            celebrateWinner();
            startButtonLabel.textContent = 'START NEXT ROUND';
            playTone(520, 0.22, 'triangle', 0.04);
            window.setTimeout(() => playTone(660, 0.28, 'triangle', 0.04), 130);
            window.setTimeout(() => playTone(790, 0.4, 'triangle', 0.045), 290);
            announcementInProgress = true;
            announce(`${winner.name} wins the battle!`, () => {
                announcementInProgress = false;
                addKillFeed(`${winner.name} wins round ${roundNumber}!`, 'winner');
                if (autoRounds) {
                    battleStatus.textContent = 'NEXT ROUND IN 12 SECONDS';
                    scheduleNextRound();
                } else {
                    battleStatus.textContent = 'BATTLE COMPLETE';
                }
            });
        } else {
            battleStatus.textContent = 'NO FLAGS LEFT';
            startButtonLabel.textContent = 'START NEXT ROUND';
        }
        startButton.disabled = false;
    }

    function processEliminationQueue() {
        if (!gameStarted || gameFinished || announcementInProgress) return;
        while (eliminationQueue.length > 0 && alive.size > 1) {
            const body = eliminationQueue.shift();
            queuedEliminations.delete(body.id);
            const country = roster.find((entry) => entry.code === body.countryCode);
            if (!country || !alive.has(country.code)) continue;

            if (body.shieldCharges > 0 && body.shieldUntil > engine.timing.timestamp) {
                body.shieldCharges -= 1;
                queuedEliminations.delete(body.id);
                announcementInProgress = true;
                battleStatus.textContent = `${country.name.toUpperCase()} SHIELD BLOCKED THE HIT`;
                addKillFeed(`${country.name}'s shield blocked the spinner`, 'power');
                playTone(680, 0.3, 'triangle', 0.05);
                announce(`${country.name}'s shield blocked the spinner!`, () => {
                    announcementInProgress = false;
                    if (gameStarted) {
                        processEliminationQueue();
                    }
                });
                return;
            }
            body.shieldCharges = 0;

            announcementInProgress = true;
            const rank = alive.size;
            alive.delete(country.code);
            if (trackedCountryCode === country.code) trackedCountryCode = null;
            Composite.remove(engine.world, body);
            eliminatedThisRound.push(country);
            streamEliminationKicker.textContent = `ELIMINATED · RANK #${rank}`;
            streamEliminationName.textContent = country.name.toUpperCase();
            document.getElementById('stream-out-label').textContent = 'OUT!';
            renderStreamEliminations();
            updateLeaderboard();
            showOutPopup(country);
            battleStatus.textContent = `ELIMINATED: ${country.name.toUpperCase()}`;
            addKillFeed(`${country.name} eliminated by spinner · RANK #${rank}`);
            announce(`${country.name} eliminated!`, () => {
                announcementInProgress = false;
                outPopup.classList.remove('is-visible');
                if (!gameStarted) return;
                processEliminationQueue();
            });
            return;
        }
        if (alive.size === 1) finishBattle();
    }

    Events.on(engine, 'collisionStart', (event) => {
        if (!gameStarted || gameFinished) return;
        for (const pair of event.pairs) {
            const { bodyA, bodyB } = pair;
            if (bodyA.label === 'flag' && bodyB.label === 'flag') {
                bodyA.hitsTaken = (bodyA.hitsTaken || 0) + 1;
                bodyB.hitsTaken = (bodyB.hitsTaken || 0) + 1;
                continue;
            }

            const powerUpBody = bodyA.label === 'powerup' ? bodyA : bodyB.label === 'powerup' ? bodyB : null;
            const powerUpFlag = bodyA.label === 'flag' ? bodyA : bodyB.label === 'flag' ? bodyB : null;
            if (powerUpBody && powerUpFlag) {
                applyPowerUp(powerUpBody, powerUpFlag);
                continue;
            }

            const flag = bodyA.label === 'killer' ? bodyB : bodyB.label === 'killer' ? bodyA : null;
            if (flag?.label === 'flag' && !queuedEliminations.has(flag.id)) {
                flag.hitsTaken = (flag.hitsTaken || 0) + 1;
                queuedEliminations.add(flag.id);
                eliminationQueue.push(flag);
            }
        }
    });

    Events.on(render, 'afterRender', () => {
        const context = render.context;
        const now = engine.timing.timestamp;
        const drawSpinnerArm = (angle) => {
            context.save();
            context.translate(CENTER, CENTER);
            context.rotate(angle);
            context.shadowColor = '#ff8b38';
            context.shadowBlur = 15;
            const armGradient = context.createLinearGradient(0, -20, 0, 20);
            armGradient.addColorStop(0, '#f5fbff');
            armGradient.addColorStop(0.18, '#72869a');
            armGradient.addColorStop(0.42, '#273747');
            armGradient.addColorStop(0.68, '#536a7c');
            armGradient.addColorStop(1, '#e1edf3');
            context.fillStyle = armGradient;
            context.strokeStyle = '#f5fbff';
            context.lineWidth = 1.2;
            context.beginPath();
            context.moveTo(-143, -11);
            for (let x = -143; x < 143; x += 12) {
                context.lineTo(x + 6, -20);
                context.lineTo(Math.min(x + 12, 143), -11);
            }
            context.lineTo(143, 11);
            for (let x = 143; x > -143; x -= 12) {
                context.lineTo(x - 6, 20);
                context.lineTo(Math.max(x - 12, -143), 11);
            }
            context.closePath();
            context.fill();
            context.stroke();
            context.shadowBlur = 0;

            const centerGradient = context.createLinearGradient(0, -5, 0, 5);
            centerGradient.addColorStop(0, '#f4c777');
            centerGradient.addColorStop(0.45, '#845323');
            centerGradient.addColorStop(1, '#2b2119');
            context.fillStyle = centerGradient;
            context.fillRect(-127, -5, 254, 10);
            context.fillStyle = 'rgba(255,238,188,0.78)';
            for (let x = -116; x <= 116; x += 18) {
                context.beginPath();
                context.moveTo(x - 4, -4);
                context.lineTo(x + 2, 0);
                context.lineTo(x - 4, 4);
                context.strokeStyle = 'rgba(42,31,20,0.88)';
                context.lineWidth = 2;
                context.stroke();
            }

            context.fillStyle = '#fff8df';
            for (const end of [-1, 1]) {
                context.beginPath();
                context.arc(end * 130, 0, 3.2, 0, Math.PI * 2);
                context.fill();
            }
            context.restore();
        };
        drawSpinnerArm(blade.angle);
        drawSpinnerArm(blade.angle + Math.PI / 2);

        context.save();
        context.translate(CENTER, CENTER);
        context.shadowColor = '#e2a84d';
        context.shadowBlur = 22;
        const hubGradient = context.createRadialGradient(-5, -6, 2, 0, 0, 25);
        hubGradient.addColorStop(0, '#fff9e8');
        hubGradient.addColorStop(0.2, '#c9d6dc');
        hubGradient.addColorStop(0.52, '#536777');
        hubGradient.addColorStop(0.82, '#27333e');
        hubGradient.addColorStop(1, '#d7a455');
        context.beginPath();
        context.arc(0, 0, 25, 0, Math.PI * 2);
        context.fillStyle = hubGradient;
        context.fill();
        context.shadowBlur = 0;
        context.beginPath();
        context.arc(0, 0, 12, 0, Math.PI * 2);
        context.fillStyle = '#fff1f5';
        context.fill();
        context.beginPath();
        context.arc(0, 0, 5, 0, Math.PI * 2);
        context.fillStyle = '#ff4775';
        context.fill();
        context.fillStyle = '#fff4d7';
        for (let index = 0; index < 8; index += 1) {
            const angle = (index / 8) * Math.PI * 2;
            context.beginPath();
            context.arc(Math.cos(angle) * 18, Math.sin(angle) * 18, 1.8, 0, Math.PI * 2);
            context.fill();
        }
        context.restore();

        for (const powerUp of powerUps.values()) {
            const { body, type, color, symbol } = powerUp;
            const pulse = 1 + Math.sin(now / 170) * 0.11;
            context.save();
            context.translate(body.position.x, body.position.y);
            context.scale(pulse, pulse);
            context.beginPath();
            context.arc(0, 0, type === 'well' ? 23 : 18, 0, Math.PI * 2);
            context.strokeStyle = color;
            context.lineWidth = 2;
            context.shadowColor = color;
            context.shadowBlur = 16;
            context.stroke();
            context.shadowBlur = 0;
            context.fillStyle = '#f6f8ff';
            context.font = 'bold 14px Arial';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(symbol, 0, 1);
            context.restore();
        }

        for (const [code, body] of alive) {
            const image = loadFlag(code);

            context.save();
            context.translate(body.position.x, body.position.y);
            context.rotate(body.angle);
            context.beginPath();
            context.arc(0, 0, BALL_RADIUS - 1, 0, Math.PI * 2);
            context.clip();
            if (image.complete && image.naturalWidth > 0) {
                context.drawImage(image, -BALL_RADIUS, -BALL_RADIUS, BALL_RADIUS * 2, BALL_RADIUS * 2);
            } else {
                context.fillStyle = '#d8e1eb';
                context.fill();
            }
            context.beginPath();
            context.arc(0, 0, BALL_RADIUS - 1, 0, Math.PI * 2);
            context.strokeStyle = trackedCountryCode === code ? '#c9ff57' : 'rgba(255,255,255,0.88)';
            context.lineWidth = trackedCountryCode === code ? 3 : 1.8;
            context.stroke();
            context.beginPath();
            context.ellipse(-4, -7, 5, 2, -0.5, 0, Math.PI * 2);
            context.fillStyle = 'rgba(255,255,255,0.3)';
            context.fill();
            context.restore();

            if (body.shieldCharges > 0 && body.shieldUntil > now) {
                context.save();
                context.beginPath();
                context.arc(body.position.x, body.position.y, BALL_RADIUS + 5, 0, Math.PI * 2);
                context.strokeStyle = 'rgba(85, 217, 255, 0.95)';
                context.lineWidth = 3;
                context.shadowColor = '#55d9ff';
                context.shadowBlur = 13;
                context.stroke();
                context.restore();
            }

            if (trackedCountryCode === code) {
                const markerY = body.position.y - BALL_RADIUS - 12 + Math.sin(now / 120) * 3;
                context.save();
                context.beginPath();
                context.moveTo(body.position.x, markerY + 9);
                context.lineTo(body.position.x - 6, markerY);
                context.lineTo(body.position.x + 6, markerY);
                context.closePath();
                context.fillStyle = '#c9ff57';
                context.shadowColor = '#c9ff57';
                context.shadowBlur = 12;
                context.fill();
                context.restore();
            }
        }
    });

    function animationFrame(timestamp) {
        if (gameStarted && !gameFinished) {
            const delta = lastFrameTime ? Math.min(timestamp - lastFrameTime, 1000 / 30) : 1000 / 60;
            Engine.update(engine, delta);
            if (!announcementInProgress) processEliminationQueue();
        }
        updateCamera();
        lastFrameTime = timestamp;
        window.requestAnimationFrame(animationFrame);
    }

    function shuffleRoster() {
        for (let i = roster.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [roster[i], roster[j]] = [roster[j], roster[i]];
        }
    }

    function beginRound() {
        window.clearTimeout(nextRoundTimer);
        window.clearInterval(powerUpTimer);
        battleGeneration += 1;
        if (speechAvailable) window.speechSynthesis.cancel();
        activeAnnouncementFinish = null;
        announcementInProgress = false;
        gameStarted = false;
        gameFinished = false;
        outPopup.classList.remove('is-visible');
        winnerPopup.hidden = true;
        for (const body of alive.values()) Composite.remove(engine.world, body);
        for (const id of powerUps.keys()) removePowerUp(id);
        alive.clear();
        eliminationQueue = [];
        queuedEliminations.clear();
        eliminatedThisRound = [];
        Engine.clear(engine);
        Body.setAngle(blade, 0);
        Body.setAngle(crossBlade, Math.PI / 2);
        shuffleRoster();
        roundStartedAt = performance.now();
        roundSpinnerSpeed = 0.039 + Math.random() * 0.013;
        spinnerDirection = Math.random() < 0.5 ? -1 : 1;
        spinnerModeTimer = 0;
        arenaZoom = 1;
        render.options.hasBounds = false;
        render.bounds.min.x = 0;
        render.bounds.min.y = 0;
        render.bounds.max.x = WORLD_SIZE;
        render.bounds.max.y = WORLD_SIZE;
        killFeedList.replaceChildren();
        confettiLayer.replaceChildren();
        streamEliminationKicker.textContent = 'FLAGS BATTLE ARENA · ALL ELIMINATION';
        streamEliminationName.textContent = 'WHO WILL WIN?';
        document.getElementById('stream-out-label').textContent = 'LIVE';
        roster.forEach(createFlag);
        updateLeaderboard();
        renderStreamEliminations();
        setFormMessage('');

        roundNumber += 1;
        roundNumberElement.textContent = String(roundNumber).padStart(2, '0');
        streamRound.textContent = String(roundNumber).padStart(2, '0');
        gameStarted = true;
        centerMessage.classList.add('is-hidden');
        liveStatus.classList.add('is-running');
        battleStatus.textContent = `ROUND ${roundNumber} · ALL FLAGS IN`;
        startButtonLabel.textContent = 'PAUSE BATTLE';
        startButton.disabled = false;
        for (const body of alive.values()) {
            setFlagSpeed(body, 5.5 + Math.random() * 3);
        }
        announcementInProgress = true;
        announce(`Round ${roundNumber}. All flags are in the arena. Let the battle begin!`, () => {
            announcementInProgress = false;
            if (gameStarted) {
                battleStatus.textContent = `ROUND ${roundNumber} IN PROGRESS`;
                processEliminationQueue();
            }
        });
        powerUpTimer = window.setInterval(spawnPowerUp, 10500);
    }

    function scheduleNextRound() {
        window.clearTimeout(nextRoundTimer);
        if (!autoRounds || !gameFinished || announcementInProgress) return;
        nextRoundTimer = window.setTimeout(beginRound, ROUND_BREAK_MS);
    }

    function updateToggle(button, label, enabled, onText, offText) {
        button.classList.toggle('is-active', enabled);
        button.setAttribute('aria-pressed', String(enabled));
        label.textContent = enabled ? onText : offText;
    }

    startButton.addEventListener('click', () => {
        ensureAudio();
        if (gameFinished) {
            beginRound();
            return;
        }
        gameStarted = !gameStarted;
        centerMessage.classList.add('is-hidden');
        if (gameStarted) {
            liveStatus.classList.add('is-running');
            battleStatus.textContent = `ROUND ${roundNumber} IN PROGRESS`;
            startButtonLabel.textContent = 'PAUSE BATTLE';
            processEliminationQueue();
        } else {
            liveStatus.classList.remove('is-running');
            battleStatus.textContent = 'BATTLE PAUSED';
            startButtonLabel.textContent = 'RESUME BATTLE';
        }
    });

    resetButton.addEventListener('click', beginRound);

    streamModeToggle.addEventListener('click', () => {
        setStreamMode(!document.querySelector('.app').classList.contains('is-stream-mode'));
    });
    streamModeExit.addEventListener('click', () => setStreamMode(false));
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && document.querySelector('.app').classList.contains('is-stream-mode')) {
            setStreamMode(false);
        }
    });

    document.addEventListener('pointerdown', ensureAudio, { once: true });
    document.addEventListener('keydown', ensureAudio, { once: true });

    countrySearch.addEventListener('input', updateLeaderboard);
    survivorList.addEventListener('click', (event) => {
        if (event.target.closest('.survivor-row')) ensureAudio();
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
            event.preventDefault();
            countrySearch.focus();
        } else if (event.key === 'Escape' && document.activeElement === countrySearch) {
            countrySearch.value = '';
            updateLeaderboard();
            countrySearch.blur();
        }
    });

    autoToggle.addEventListener('click', () => {
        autoRounds = !autoRounds;
        updateToggle(autoToggle, autoToggleLabel, autoRounds, 'AUTO ROUNDS ON', 'AUTO ROUNDS OFF');
        if (autoRounds) {
            scheduleNextRound();
        } else {
            window.clearTimeout(nextRoundTimer);
            if (gameFinished) battleStatus.textContent = 'BATTLE COMPLETE';
        }
    });

    voiceToggle.addEventListener('click', () => {
        voiceEnabled = !voiceEnabled;
        updateToggle(voiceToggle, voiceToggleLabel, voiceEnabled, 'VOICE ON', 'VOICE OFF');
        if (!voiceEnabled && speechAvailable) {
            window.speechSynthesis.cancel();
            if (activeAnnouncementFinish) activeAnnouncementFinish();
        }
    });

    effectsToggle.addEventListener('click', () => {
        effectsEnabled = !effectsEnabled;
        updateToggle(effectsToggle, effectsToggleLabel, effectsEnabled, 'SFX ON', 'SFX OFF');
        if (effectsEnabled) {
            ensureAudio();
            playTone(620, 0.13, 'sine', 0.03);
        }
    });

    addFlagForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const enteredCode = countryCodeInput.value.trim().toUpperCase();
        const code = enteredCode === 'UK' ? 'GB' : enteredCode;
        if (!/^[A-Z]{2}$/.test(code) || !countryCodes.includes(code)) {
            setFormMessage('Enter a valid 2-letter country code for a country.', 'error');
            countryCodeInput.focus();
            return;
        }
        const existingCountry = roster.find((country) => country.code === code);
        if (existingCountry) {
            if (alive.has(code)) {
                setFormMessage(`${existingCountry.name} is already in this battle.`, 'error');
                countryCodeInput.focus();
                return;
            }
            if (gameFinished) {
                setFormMessage(`${existingCountry.name} will return next round.`, 'success');
            } else {
                createFlag(existingCountry);
                updateLeaderboard();
                renderStreamEliminations();
                setFormMessage(`${existingCountry.name} re-entered the battle!`, 'success');
            }
            countryCodeInput.value = '';
            return;
        }

        const country = { name: countryNameFor(code), code };
        roster.push(country);
        if (!gameFinished) createFlag(country);
        updateLeaderboard();
        renderStreamEliminations();
        setFormMessage(
            gameFinished
                ? `${country.name} will join the next round!`
                : `${country.name} joined the battle!`,
            'success'
        );
        countryCodeInput.value = '';
    });

    loadYouTubeSettings();
    createArena();
    roster.forEach(createFlag);
    updateLeaderboard();
    battleStatus.textContent = 'AUTO BATTLE STARTS IN 3 SECONDS';
    startButton.disabled = false;
    Render.run(render);
    window.requestAnimationFrame(animationFrame);
    nextRoundTimer = window.setTimeout(beginRound, 3000);
})();
