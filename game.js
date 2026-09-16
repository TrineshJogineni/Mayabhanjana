/* ==========================================================
   1. CHOWKA BHARA STATE MACHINE (HEAD-TO-HEAD & BUG-FREE)
   ========================================================== */
const CHOWKA = {
    currentTurn: 'PLAYER', // 'PLAYER' | 'AI'
    phase: 'INIT',         // 'INIT' | 'IDLE' | 'ROLLING' | 'SELECTING' | 'MOVING' | 'AI_TURN' | 'GAME_OVER'
    playerKills: 0,
    aiKills: 0,
    satyaBala: 0,
    mayaTokens: 3,
    lastDice: [1, 1],
    lastSum: 2,
    isBonusRoll: false
};

// Centralized Atomic Phase Transition Engine
function setPhase(newPhase) {
    CHOWKA.phase = newPhase;
    const actionBtn = document.getElementById('btn-cast-pachikas');
    const hintText = document.getElementById('action-hint');

    if (newPhase === 'IDLE') {
        if (CHOWKA.currentTurn === 'PLAYER') {
            actionBtn.disabled = false;
            hintText.innerText = CHOWKA.isBonusRoll ? 'BONUS ROLL! Cast again' : 'Throw the 2 sacred sticks';
            if (CHOWKA.isBonusRoll) {
                actionBtn.style.boxShadow = '0 0 20px #f5c842';
            } else {
                actionBtn.style.boxShadow = 'none';
            }
        } else {
            actionBtn.disabled = true;
            hintText.innerText = 'Shakuni is casting...';
        }
    } else if (newPhase === 'SELECTING') {
        actionBtn.disabled = true;
        hintText.innerText = 'Click an Emerald Goti to move';
    } else {
        actionBtn.disabled = true;
    }
    updateHUD();
}

// 4 Pandava Gotis & 4 Kaurava Gotis
const PLAYER_PAWNS = [
    { id: 'p0', name: 'Emerald Goti I', owner: 'PLAYER', routeStep: 0, mesh: null, inGhar: false },
    { id: 'p1', name: 'Emerald Goti II', owner: 'PLAYER', routeStep: 0, mesh: null, inGhar: false },
    { id: 'p2', name: 'Emerald Goti III', owner: 'PLAYER', routeStep: 0, mesh: null, inGhar: false },
    { id: 'p3', name: 'Emerald Goti IV', owner: 'PLAYER', routeStep: 0, mesh: null, inGhar: false }
];

const AI_PAWNS = [
    { id: 'a0', name: 'Kaurava Goti I', owner: 'AI', routeStep: 0, mesh: null, inGhar: false },
    { id: 'a1', name: 'Kaurava Goti II', owner: 'AI', routeStep: 0, mesh: null, inGhar: false },
    { id: 'a2', name: 'Kaurava Goti III', owner: 'AI', routeStep: 0, mesh: null, inGhar: false },
    { id: 'a3', name: 'Kaurava Goti IV', owner: 'AI', routeStep: 0, mesh: null, inGhar: false }
];

/* ==========================================================
   2. 5x5 BOARD GEOMETRY & ANTI-MERGING MATHEMATICS
   ========================================================== */
const SAFE_CELLS = [
    { r: 4, c: 2 }, // South Gadi (Player Start)
    { r: 2, c: 4 }, // East Gadi
    { r: 0, c: 2 }, // North Gadi (Shakuni Start)
    { r: 2, c: 0 }, // West Gadi
    { r: 2, c: 2 }  // Central Ghar
];

function isSafeCell(r, c) {
    return SAFE_CELLS.some(g => g.r === r && g.c === c);
}

// 25-step Counter-Clockwise Outer Loop + Clockwise Inner Loop Route
const PLAYER_ROUTE = [
    { r: 4, c: 2 }, { r: 4, c: 3 }, { r: 4, c: 4 },
    { r: 3, c: 4 }, { r: 2, c: 4 }, { r: 1, c: 4 }, { r: 0, c: 4 },
    { r: 0, c: 3 }, { r: 0, c: 2 }, { r: 0, c: 1 }, { r: 0, c: 0 },
    { r: 1, c: 0 }, { r: 2, c: 0 }, { r: 3, c: 0 }, { r: 4, c: 0 },
    { r: 4, c: 1 },
    { r: 3, c: 2 }, { r: 3, c: 1 }, { r: 2, c: 1 }, { r: 1, c: 1 },
    { r: 1, c: 2 }, { r: 1, c: 3 }, { r: 2, c: 3 }, { r: 3, c: 3 },
    { r: 2, c: 2 } // Ghar
];

const AI_ROUTE = [
    { r: 0, c: 2 }, { r: 0, c: 1 }, { r: 0, c: 0 },
    { r: 1, c: 0 }, { r: 2, c: 0 }, { r: 3, c: 0 }, { r: 4, c: 0 },
    { r: 4, c: 1 }, { r: 4, c: 2 }, { r: 4, c: 3 }, { r: 4, c: 4 },
    { r: 3, c: 4 }, { r: 2, c: 4 }, { r: 1, c: 4 }, { r: 0, c: 4 },
    { r: 0, c: 3 },
    { r: 1, c: 2 }, { r: 1, c: 3 }, { r: 2, c: 3 }, { r: 3, c: 3 },
    { r: 3, c: 2 }, { r: 3, c: 1 }, { r: 2, c: 1 }, { r: 1, c: 1 },
    { r: 2, c: 2 } // Ghar
];

const BOARD_SIZE = 16;
const CELL_SIZE = BOARD_SIZE / 5;

function cellToWorld(r, c) {
    return new THREE.Vector3((c - 2) * CELL_SIZE, 0.22, (r - 2) * CELL_SIZE);
}

// Anti-Merging: Spaces pawns in neat offsets when occupying the same tile
function refreshAllPawnWorldPositions(animateHop = false) {
    const cellOccupants = {};

    [...PLAYER_PAWNS, ...AI_PAWNS].forEach(p => {
        if (p.inGhar) {
            const key = 'ghar';
            if (!cellOccupants[key]) cellOccupants[key] = [];
            cellOccupants[key].push(p);
            return;
        }
        const route = (p.owner === 'PLAYER') ? PLAYER_ROUTE : AI_ROUTE;
        const coord = route[p.routeStep];
        const key = `${coord.r}_${coord.c}`;
        if (!cellOccupants[key]) cellOccupants[key] = [];
        cellOccupants[key].push(p);
    });

    Object.keys(cellOccupants).forEach(key => {
        const list = cellOccupants[key];
        const count = list.length;

        list.forEach((pawn, idx) => {
            let basePos = (key === 'ghar') ? cellToWorld(2, 2) : cellToWorld(...key.split('_').map(Number));
            let offsetX = 0, offsetZ = 0;

            if (count === 2) {
                offsetX = (idx === 0 ? -0.7 : 0.7);
            } else if (count === 3) {
                const ang = (idx / 3) * Math.PI * 2;
                offsetX = Math.cos(ang) * 0.8;
                offsetZ = Math.sin(ang) * 0.8;
            } else if (count >= 4) {
                const ang = (idx / count) * Math.PI * 2;
                offsetX = Math.cos(ang) * 1.0;
                offsetZ = Math.sin(ang) * 1.0;
            }

            const finalTarget = new THREE.Vector3(basePos.x + offsetX, 0.22, basePos.z + offsetZ);

            if (animateHop && pawn.mesh) {
                hopPawnTo(pawn, finalTarget);
            } else if (pawn.mesh) {
                pawn.mesh.position.copy(finalTarget);
            }
        });
    });
}

/* ==========================================================
   3. THREE.JS SCENE, BOARD, & NOBLE SHAKUNI MODEL IN 3D
   ========================================================== */
const canvas = document.getElementById('webgl-canvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x060408);
scene.fog = new THREE.FogExp2(0x060408, 0.015);

const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 11.5, 17.5);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.maxPolarAngle = Math.PI / 2.05;
controls.minDistance = 8;
controls.maxDistance = 50;
controls.target.set(0, 0.6, 0);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffecd0, 0.85);
scene.add(ambientLight);

const mainSpot = new THREE.SpotLight(0xfff5e6, 2.0, 60, Math.PI / 3.2, 0.3);
mainSpot.position.set(0, 24, 8);
mainSpot.castShadow = true;
mainSpot.shadow.mapSize.width = 2048;
mainSpot.shadow.mapSize.height = 2048;
scene.add(mainSpot);

// Warm light illuminating Shakuni across the board
const shakuniBackLight = new THREE.PointLight(0xff7722, 1.6, 25);
shakuniBackLight.position.set(0, 4, -9);
scene.add(shakuniBackLight);

// HIGH-RES OBSIDIAN, GOLD & WALNUT BOARD TEXTURE
function createBlackGoldWalnutBoardTexture() {
    const cvs = document.createElement('canvas');
    cvs.width = 1200;
    cvs.height = 1200;
    const ctx = cvs.getContext('2d');

    ctx.fillStyle = '#1e110a'; // Walnut Trim
    ctx.fillRect(0, 0, 1200, 1200);

    ctx.strokeStyle = '#f5c842'; // Gold Inlay
    ctx.lineWidth = 16;
    ctx.strokeRect(30, 30, 1140, 1140);

    ctx.fillStyle = '#0a070c'; // Obsidian Body
    ctx.fillRect(45, 45, 1110, 1110);

    const cellSize = 1110 / 5;
    const startX = 45;
    const startY = 45;

    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
            const cx = startX + c * cellSize;
            const cy = startY + r * cellSize;
            const isSafe = isSafeCell(r, c);

            ctx.fillStyle = ((r + c) % 2 === 0) ? '#120d17' : '#1a1210';
            ctx.fillRect(cx, cy, cellSize, cellSize);

            ctx.strokeStyle = '#c99f32';
            ctx.lineWidth = 3;
            ctx.strokeRect(cx + 2, cy + 2, cellSize - 4, cellSize - 4);

            if (isSafe) {
                ctx.fillStyle = 'rgba(245, 200, 66, 0.12)';
                ctx.fillRect(cx + 4, cy + 4, cellSize - 8, cellSize - 8);

                ctx.strokeStyle = '#ffea85';
                ctx.lineWidth = 9;
                ctx.beginPath();
                ctx.moveTo(cx + 18, cy + 18);
                ctx.lineTo(cx + cellSize - 18, cy + cellSize - 18);
                ctx.moveTo(cx + cellSize - 18, cy + 18);
                ctx.lineTo(cx + 18, cy + cellSize - 18);
                ctx.stroke();

                ctx.strokeStyle = '#8a6214';
                ctx.lineWidth = 3;
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(cx + cellSize / 2, cy + cellSize / 2, 10, 0, Math.PI * 2);
                ctx.fillStyle = '#f5c842';
                ctx.fill();
            }

            if (r === 2 && c === 2) {
                ctx.strokeStyle = '#f5c842';
                ctx.lineWidth = 6;
                ctx.beginPath();
                ctx.arc(cx + cellSize / 2, cy + cellSize / 2, 60, 0, Math.PI * 2);
                ctx.stroke();

                ctx.fillStyle = '#80101b';
                ctx.beginPath();
                ctx.arc(cx + cellSize / 2, cy + cellSize / 2, 35, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    const tex = new THREE.CanvasTexture(cvs);
    tex.anisotropy = 8;
    return tex;
}

const tableTop = new THREE.Mesh(
    new THREE.CylinderGeometry(18, 19, 1.6, 64),
    new THREE.MeshStandardMaterial({ color: 0x140d08, roughness: 0.65, metalness: 0.2 })
);
tableTop.position.y = -0.85;
tableTop.receiveShadow = true;
scene.add(tableTop);

const chowkaBoard = new THREE.Mesh(
    new THREE.BoxGeometry(BOARD_SIZE, 0.25, BOARD_SIZE),
    new THREE.MeshStandardMaterial({ map: createBlackGoldWalnutBoardTexture(), roughness: 0.35, metalness: 0.3 })
);
chowkaBoard.receiveShadow = true;
scene.add(chowkaBoard);

/* ==========================================================
   4. NOBLE KING SHAKUNI (MATCHING IMAGE 2) IN 3D WORLD SPACE
   ========================================================== */
function createShakuniPortraitTexture() {
    const cvs = document.createElement('canvas');
    cvs.width = 600;
    cvs.height = 750;
    const ctx = cvs.getContext('2d');

    // Realistic rendering of King Shakuni directly inspired by the canonical artwork:
    // Dark regal background with halo
    const bg = ctx.createRadialGradient(300, 300, 50, 300, 300, 350);
    bg.addColorStop(0, 'rgba(212, 140, 48, 0.35)');
    bg.addColorStop(0.7, 'rgba(30, 15, 25, 0.8)');
    bg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 600, 750);

    const cx = 300, cy = 340;

    // Broad Ornate Robed Shoulders & Armor with gold filigree
    ctx.fillStyle = '#1c1524';
    ctx.beginPath();
    ctx.moveTo(cx - 190, 680);
    ctx.quadraticCurveTo(cx - 150, 440, cx - 80, 390);
    ctx.lineTo(cx + 80, 390);
    ctx.quadraticCurveTo(cx + 150, 440, cx + 190, 680);
    ctx.closePath();
    ctx.fill();

    // Saffron & Crimson Embroidered Royal Shawl/Sash
    ctx.fillStyle = '#d84315';
    ctx.beginPath();
    ctx.moveTo(cx - 50, 390);
    ctx.lineTo(cx - 120, 680);
    ctx.lineTo(cx - 40, 680);
    ctx.lineTo(cx + 20, 430);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#f5c842';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Layered Pearl & Heavy Gold Bead Necklaces
    for (let rad = 95; rad <= 145; rad += 25) {
        ctx.strokeStyle = '#f5c842';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(cx, cy + 85, rad, 0.2 * Math.PI, 0.8 * Math.PI);
        ctx.stroke();

        // Pearls
        ctx.strokeStyle = '#fffef0';
        ctx.lineWidth = 4;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.arc(cx, cy + 85, rad, 0.2 * Math.PI, 0.8 * Math.PI);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Weathered Noble Face & Skin
    const skin = ctx.createRadialGradient(cx, cy + 10, 10, cx, cy + 10, 70);
    skin.addColorStop(0, '#cca078');
    skin.addColorStop(0.7, '#9e6d48');
    skin.addColorStop(1, '#663f22');
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 15, 62, 75, 0, 0, Math.PI * 2);
    ctx.fill();

    // Majestic Grey & White Steaked Beard & Mustache
    ctx.fillStyle = '#ded9d2';
    ctx.beginPath();
    ctx.moveTo(cx - 55, cy + 20);
    ctx.quadraticCurveTo(cx - 65, cy + 85, cx - 25, cy + 125);
    ctx.lineTo(cx, cy + 135);
    ctx.lineTo(cx + 25, cy + 125);
    ctx.quadraticCurveTo(cx + 65, cy + 85, cx + 55, cy + 20);
    ctx.quadraticCurveTo(cx + 35, cy + 65, cx, cy + 70);
    ctx.quadraticCurveTo(cx - 35, cy + 65, cx - 55, cy + 20);
    ctx.fill();

    // Beard shading
    ctx.strokeStyle = '#8a857e';
    ctx.lineWidth = 2;
    for (let i = -20; i <= 20; i += 8) {
        ctx.beginPath();
        ctx.moveTo(cx + i, cy + 75);
        ctx.lineTo(cx + i * 1.2, cy + 120);
        ctx.stroke();
    }

    // Calculating Smirking Lips
    ctx.strokeStyle = '#4a121a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 18, cy + 50);
    ctx.quadraticCurveTo(cx, cy + 55, cx + 22, cy + 47);
    ctx.stroke();

    // Piercing Eyes & Wrinkles
    // Left Eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(cx - 24, cy + 8, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1c130d';
    ctx.beginPath();
    ctx.arc(cx - 22, cy + 8, 5, 0, Math.PI * 2);
    ctx.fill();

    // Right Eye (Cunning squint)
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(cx + 24, cy + 8, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1c130d';
    ctx.beginPath();
    ctx.arc(cx + 26, cy + 8, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Vermilion Tilak
    ctx.fillStyle = '#b71c1c';
    ctx.fillRect(cx - 3, cy - 20, 6, 22);
    ctx.beginPath();
    ctx.arc(cx, cy - 23, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#f5c842';
    ctx.fill();

    // Authentic Patterned Crimson Turban with Feather Plume (Kalgi)
    const turban = ctx.createRadialGradient(cx, cy - 70, 20, cx, cy - 60, 110);
    turban.addColorStop(0, '#b71c1c');
    turban.addColorStop(0.6, '#7f0000');
    turban.addColorStop(1, '#330005');
    ctx.fillStyle = turban;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 65, 80, 48, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f5c842';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Golden Medallion
    ctx.beginPath();
    ctx.arc(cx, cy - 62, 18, 0, Math.PI * 2);
    ctx.fillStyle = '#f5c842';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy - 62, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#00c853';
    ctx.fill();

    // Black Upright Feather Plume (Kalgi)
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy - 75);
    ctx.quadraticCurveTo(cx - 18, cy - 170, cx, cy - 190);
    ctx.quadraticCurveTo(cx + 18, cy - 170, cx + 10, cy - 75);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();

    return new THREE.CanvasTexture(cvs);
}

// Construct King Shakuni Seated in 3D Space (Opposite the Board)
const shakuniGroup = new THREE.Group();
shakuniGroup.position.set(0, 2.6, -9.8); // Sitting at the North end of the 3D table

// 3D Throne Bolster Cushion
const throneMat = new THREE.MeshStandardMaterial({ color: 0x5a1218, roughness: 0.5 });
const throneCushion = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.8, 1.2, 32), throneMat);
throneCushion.position.y = -1.2;
throneCushion.receiveShadow = true;
shakuniGroup.add(throneCushion);

// Detailed Illustrated Mesh of Shakuni
const shakuniPlaneGeo = new THREE.PlaneGeometry(6.4, 8.0);
const shakuniPlaneMat = new THREE.MeshStandardMaterial({
    map: createShakuniPortraitTexture(),
    transparent: true,
    roughness: 0.4,
    metalness: 0.1
});
const shakuniMesh = new THREE.Mesh(shakuniPlaneGeo, shakuniPlaneMat);
shakuniMesh.position.y = 1.6;
shakuniMesh.castShadow = true;
shakuniGroup.add(shakuniMesh);

// Shakuni's Articulated Casting Arm in 3D
const castingArmGroup = new THREE.Group();
castingArmGroup.position.set(1.4, 0.4, 0.6);
const armMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.18, 1.6),
    new THREE.MeshStandardMaterial({ color: 0xb07f59 })
);
armMesh.rotation.z = Math.PI / 3;
castingArmGroup.add(armMesh);

// Glowing Dice Aura in Hand
const palmAura = new THREE.PointLight(0xff2200, 0, 6);
palmAura.position.set(0.8, -0.6, 0.5);
castingArmGroup.add(palmAura);

shakuniGroup.add(castingArmGroup);
scene.add(shakuniGroup);

/* ==========================================================
   5. TWO OBLONG PACHIKAS (STICK DICE) IN 3D
   ========================================================== */
function createPachikaTexture(dots) {
    const cvs = document.createElement('canvas');
    cvs.width = 128;
    cvs.height = 512;
    const ctx = cvs.getContext('2d');

    ctx.fillStyle = '#fbf7ee';
    ctx.fillRect(0, 0, cvs.width, cvs.height);

    ctx.strokeStyle = '#c49a2a';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 120, 504);

    function drawRingedPip(y) {
        ctx.beginPath();
        ctx.arc(64, y, 18, 0, Math.PI * 2);
        ctx.fillStyle = '#80101b';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(64, y, 9, 0, Math.PI * 2);
        ctx.fillStyle = '#fbf7ee';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(64, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#80101b';
        ctx.fill();
    }

    if (dots === 1) drawRingedPip(256);
    if (dots === 2) { drawRingedPip(160); drawRingedPip(352); }
    if (dots === 3) { drawRingedPip(120); drawRingedPip(256); drawRingedPip(392); }
    if (dots === 4) { drawRingedPip(90); drawRingedPip(200); drawRingedPip(312); drawRingedPip(422); }

    return new THREE.CanvasTexture(cvs);
}

const pachikaMaterials = [
    new THREE.MeshStandardMaterial({ map: createPachikaTexture(1) }), // +X: 1
    new THREE.MeshStandardMaterial({ map: createPachikaTexture(4) }), // -X: 4
    new THREE.MeshStandardMaterial({ map: createPachikaTexture(2) }), // +Y: 2
    new THREE.MeshStandardMaterial({ map: createPachikaTexture(3) }), // -Y: 3
    new THREE.MeshStandardMaterial({ color: 0xd4cbb8 }),
    new THREE.MeshStandardMaterial({ color: 0xd4cbb8 })
];

const pachikas = [];
for (let i = 0; i < 2; i++) {
    const stick = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 2.7), pachikaMaterials);
    stick.castShadow = true;
    stick.position.set(-1.2 + i * 2.4, 0.35, 0);
    scene.add(stick);
    pachikas.push(stick);
}

/* ==========================================================
   6. JEWEL-LIKE INDIAN GOTI (PAWN) MODELS
   ========================================================== */
function buildOrnateGoti(colorHex, emissiveHex) {
    const group = new THREE.Group();

    const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.38, 0.52, 0.38, 24),
        new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.25, metalness: 0.4 })
    );
    base.position.y = 0.19;
    base.castShadow = true;

    const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.35, 0.85, 24),
        new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.25, metalness: 0.4 })
    );
    stem.position.y = 0.72;
    stem.castShadow = true;

    const goldWaist = new THREE.Mesh(
        new THREE.TorusGeometry(0.27, 0.08, 16, 24),
        new THREE.MeshStandardMaterial({ color: 0xf5c842, metalness: 0.85, roughness: 0.2 })
    );
    goldWaist.rotation.x = Math.PI / 2;
    goldWaist.position.y = 1.12;

    const jewelHead = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 24, 24),
        new THREE.MeshStandardMaterial({ color: colorHex, emissive: emissiveHex, emissiveIntensity: 0.35, roughness: 0.2 })
    );
    jewelHead.position.y = 1.42;
    jewelHead.castShadow = true;

    group.add(base, stem, goldWaist, jewelHead);
    return group;
}

PLAYER_PAWNS.forEach(p => {
    p.mesh = buildOrnateGoti(0x1b5e20, 0x052e0a); // Emerald
    p.mesh.userData = { pawnData: p };
    scene.add(p.mesh);
});

AI_PAWNS.forEach(p => {
    p.mesh = buildOrnateGoti(0x991b24, 0x42070c); // Crimson
    p.mesh.userData = { pawnData: p };
    scene.add(p.mesh);
});

refreshAllPawnWorldPositions(false);

/* ==========================================================
   7. CHRONICLE LOG & SHAKUNI'S STRATEGIC COMMENTARY
   ========================================================== */
const chronicleStream = document.getElementById('chronicle-stream');
const dialogueCloud = document.getElementById('shakuni-dialogue-cloud');
const dialogueText = document.getElementById('shakuni-dialogue-text');

function logChronicle(msg, cssColorClass = '') {
    const p = document.createElement('p');
    p.className = `log-entry ${cssColorClass}`;
    p.innerHTML = `> ${msg}`;
    chronicleStream.appendChild(p);
    chronicleStream.scrollTop = chronicleStream.scrollHeight;
}

function triggerShakuniVoice(dialogue, holdMs = 4200) {
    dialogueText.innerText = dialogue;
    dialogueCloud.classList.remove('hidden');
    setTimeout(() => dialogueCloud.classList.add('hidden'), holdMs);
}

// Dynamic Strategic Lessons Evaluator
function evaluatePlayerBlunderOrMastery(pawnMoved) {
    const cell = PLAYER_ROUTE[pawnMoved.routeStep];

    // 1. Blunder: Leaving a piece in open range of an enemy (1..4 steps away)
    if (!isSafeCell(cell.r, cell.c)) {
        const isVulnerable = AI_PAWNS.some(ai => {
            if (ai.inGhar) return false;
            const aiDist = (pawnMoved.routeStep - ai.routeStep + 25) % 25;
            return aiDist >= 1 && aiDist <= 4;
        });

        if (isVulnerable) {
            triggerShakuniVoice("You leave your flank exposed in the open, nephew! In dicing as in war, an unprotected piece is an invitation to slaughter.");
            return;
        }
    }

    // 2. Hesitation: Passing near the threshold without a kill
    if (pawnMoved.routeStep >= 14 && pawnMoved.routeStep <= 16 && CHOWKA.playerKills === 0) {
        triggerShakuniVoice("Racing towards the center with clean hands? The inner sanctuary admits only a conqueror. Loop the board until you find your courage!");
        return;
    }

    // 3. Turtling: Multiple pieces staying passive on South Gadi
    const campedAtHome = PLAYER_PAWNS.filter(p => p.routeStep === 0).length;
    if (campedAtHome >= 3) {
        triggerShakuniVoice("Cowering in the sanctuary of the 'X'? A king who never leaves his fort never wins an empire. Step into the fight!");
        return;
    }
}

/* ==========================================================
   8. FIERY ORANGE INTRO PARTICLES & TRANSITIONS
   ========================================================== */
const eCvs = document.getElementById('intro-embers-canvas');
const eCtx = eCvs.getContext('2d');
let sparks = [];

function resizeIntroCanvas() {
    eCvs.width = window.innerWidth;
    eCvs.height = window.innerHeight;
}
window.addEventListener('resize', resizeIntroCanvas);
resizeIntroCanvas();

for (let i = 0; i < 90; i++) {
    sparks.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 3 + 1.2,
        vy: Math.random() * 2 + 1,
        vx: (Math.random() - 0.5) * 1.4,
        op: Math.random() * 0.85 + 0.15
    });
}

function loopIntroEmbers() {
    if (CHOWKA.phase !== 'INIT') return;
    eCtx.clearRect(0, 0, eCvs.width, eCvs.height);

    sparks.forEach(s => {
        s.y -= s.vy;
        s.x += s.vx;
        if (s.y < 0) { s.y = eCvs.height + 10; s.x = Math.random() * eCvs.width; }

        eCtx.beginPath();
        eCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        eCtx.fillStyle = `rgba(255, ${Math.floor(s.op * 200 + 40)}, 0, ${s.op})`;
        eCtx.shadowBlur = 10;
        eCtx.shadowColor = '#ff5500';
        eCtx.fill();
    });
    requestAnimationFrame(loopIntroEmbers);
}
loopIntroEmbers();

function showRulesScreen() {
    document.getElementById('intro-screen').classList.remove('active');
    document.getElementById('rules-screen').classList.add('active');
}

function handleRulesScroll() {
    const box = document.getElementById('rules-scroll-area');
    if (box.scrollTop + box.clientHeight >= box.scrollHeight - 25) {
        const btn = document.getElementById('btn-accept-rules');
        btn.disabled = false;
        btn.innerText = 'I ACCEPT THE SACRED LAWS OF CHOWKA BHARA';
    }
}

function enterGameSession() {
    document.getElementById('rules-screen').classList.remove('active');
    document.getElementById('game-ui').classList.remove('hidden');
    setPhase('IDLE');

    logChronicle('The Sabhā sits in solemn stillness. You hold the first throw.', 'log-gold');
    triggerShakuniVoice('Cast the sacred Pachikas, nephew! Let us see if your righteousness can outrun destiny.');
    updateHUD();
}

/* ==========================================================
   9. AUTHENTIC PACHIKA PROBABILITIES & PHYSICS
   ========================================================== */
function generateChowkaThrow(isAI) {
    // Authentic Chowka Bhara shell probabilities: 1 (25%), 2 (37.5%), 3 (25%), 4 (6.25%), 8 (6.25%)
    const r = Math.random();
    let val;

    if (r < 0.25) val = 1;
    else if (r < 0.625) val = 2;
    else if (r < 0.875) val = 3;
    else if (r < 0.9375) val = 4; // Chowka
    else val = 8;                 // Ashta

    let d1, d2;
    if (val === 8) { d1 = 4; d2 = 4; }
    else if (val === 4) { d1 = 2; d2 = 2; }
    else if (val === 3) { d1 = 2; d2 = 1; }
    else if (val === 2) { d1 = 1; d2 = 1; }
    else { d1 = 1; d2 = 4; }

    return { sum: val, d1, d2 };
}

function animatePachikaPhysics(d1, d2, callback) {
    setPhase('ROLLING');
    const startTime = performance.now();
    const duration = 1000;

    function step(now) {
        const p = Math.min((now - startTime) / duration, 1);

        pachikas.forEach((stick, i) => {
            if (p < 1) {
                stick.position.y = 0.35 + Math.sin(p * Math.PI) * 2.6;
                stick.rotation.x += 0.32;
                stick.rotation.z += 0.26;
            } else {
                stick.position.y = 0.35;
                stick.rotation.set(0, 0, 0);

                const v = (i === 0 ? d1 : d2);
                if (v === 1) stick.rotation.z = -Math.PI / 2;
                else if (v === 4) stick.rotation.z = Math.PI / 2;
                else if (v === 2) stick.rotation.x = 0;
                else if (v === 3) stick.rotation.x = Math.PI;
            }
        });

        if (p < 1) requestAnimationFrame(step);
        else callback();
    }
    requestAnimationFrame(step);
}

function hopPawnTo(pawn, targetPos, onDone) {
    const start = pawn.mesh.position.clone();
    const startTime = performance.now();

    function hop(now) {
        const p = Math.min((now - startTime) / 450, 1);
        pawn.mesh.position.lerpVectors(start, targetPos, p);
        pawn.mesh.position.y = 0.22 + Math.sin(p * Math.PI) * 1.5;

        if (p < 1) requestAnimationFrame(hop);
        else {
            pawn.mesh.position.y = 0.22;
            if (onDone) onDone();
        }
    }
    requestAnimationFrame(hop);
}

/* ==========================================================
   10. INTERACTIVE PLAYER ACTIONS (GUARANTEED NO-FREEZE)
   ========================================================== */
function playerCastPachikas() {
    if (CHOWKA.phase !== 'IDLE' || CHOWKA.currentTurn !== 'PLAYER') return;

    const result = generateChowkaThrow(false);
    CHOWKA.lastDice = [result.d1, result.d2];
    CHOWKA.lastSum = result.sum;

    const isChowka = (result.sum === 4);
    const isAshta = (result.sum === 8);
    CHOWKA.isBonusRoll = (isChowka || isAshta);

    const titleText = isChowka ? '4 (CHOWKA! BONUS ROLL)' : isAshta ? '8 (ASHTA! BONUS ROLL)' : `${result.sum}`;
    document.getElementById('throw-result-text').innerText = titleText;
    logChronicle(`You cast the Pachikas: <strong>${titleText}</strong>`, 'log-gold');

    if (isChowka || isAshta) {
        triggerShakuniVoice("The Pachikas sing for you! Do not squander this divine momentum on a timid move.");
    }

    animatePachikaPhysics(result.d1, result.d2, () => {
        const viablePawns = PLAYER_PAWNS.filter(p => !p.inGhar && canPawnAdvance(p, CHOWKA.lastSum));

        if (viablePawns.length === 0) {
            logChronicle('No legal moves can be completed with this roll.');
            concludePlayerTurn();
            return;
        }

        setPhase('SELECTING');
        highlightPawnMeshes(PLAYER_PAWNS, true);
    });
}

function canPawnAdvance(pawn, steps) {
    const nextStep = pawn.routeStep + steps;
    if (nextStep > 24) return false;
    if (nextStep > 16 && CHOWKA.playerKills === 0) return false;
    return true;
}

// Raycasting for Gotis
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('pointerdown', (e) => {
    if (CHOWKA.phase !== 'SELECTING' || CHOWKA.currentTurn !== 'PLAYER') return;

    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(scene.children, true);
    if (intersects.length > 0) {
        let picked = null;
        let node = intersects[0].object;

        while (node && !picked) {
            if (node.userData && node.userData.pawnData) picked = node.userData.pawnData;
            node = node.parent;
        }

        if (picked && picked.owner === 'PLAYER' && !picked.inGhar && canPawnAdvance(picked, CHOWKA.lastSum)) {
            movePlayerGoti(picked);
        }
    }
});

function movePlayerGoti(pawn) {
    highlightPawnMeshes(PLAYER_PAWNS, false);
    setPhase('MOVING');

    pawn.routeStep += CHOWKA.lastSum;

    if (pawn.routeStep === 24) {
        pawn.inGhar = true;
        logChronicle(`<strong>${pawn.name}</strong> reached the sacred Central Ghar!`, 'log-green');
    } else {
        logChronicle(`<strong>${pawn.name}</strong> advances ${CHOWKA.lastSum} squares.`);
    }

    refreshAllPawnWorldPositions(true);

    setTimeout(() => {
        executeCombatCheck(pawn);
        evaluatePlayerBlunderOrMastery(pawn);
        concludePlayerTurn();
    }, 480);
}

function concludePlayerTurn() {
    checkVictoryState();
    if (CHOWKA.phase === 'GAME_OVER') return;

    if (CHOWKA.isBonusRoll) {
        logChronicle('Bonus roll granted! Cast the Pachikas again!', 'log-gold');
        setPhase('IDLE');
    } else {
        CHOWKA.currentTurn = 'AI';
        document.getElementById('turn-indicator').className = 'badge-ai';
        document.getElementById('turn-indicator').innerText = 'SHAKUNI TURN';
        setPhase('AI_TURN');
        setTimeout(executeNobleShakuniTurn, 850);
    }
}

/* ==========================================================
   11. BALANCED HEAD-TO-HEAD TACTICAL AI (KING SHAKUNI)
   ========================================================== */
function executeNobleShakuniTurn() {
    const result = generateChowkaThrow(true);
    const isChowka = (result.sum === 4);
    const isAshta = (result.sum === 8);
    const isBonus = (isChowka || isAshta);

    // Arm reach animation in 3D
    castingArmGroup.rotation.x = 0.5;
    palmAura.intensity = 2.0;

    setTimeout(() => {
        castingArmGroup.rotation.x = -0.2;
        palmAura.intensity = 0;

        const titleText = isChowka ? '4 (CHOWKA! BONUS ROLL)' : isAshta ? '8 (ASHTA! BONUS ROLL)' : `${result.sum}`;
        document.getElementById('throw-result-text').innerText = titleText;
        logChronicle(`Shakuni cast the Pachikas: <strong>${titleText}</strong>`, 'log-red');

        animatePachikaPhysics(result.d1, result.d2, () => {
            const viable = AI_PAWNS.filter(p => !p.inGhar && canPawnAdvance(p, result.sum));

            if (viable.length === 0) {
                logChronicle('Shakuni cannot advance any piece with this throw.');
                concludeAITurn(isBonus);
                return;
            }

            // Tactical Evaluation Heuristic:
            let bestPawn = viable[0];
            let bestScore = -999;

            viable.forEach(p => {
                let score = 0;
                const nextStep = p.routeStep + result.sum;
                const targetCell = AI_ROUTE[nextStep];

                // 1. Direct Hit / Capture Priority (+150)
                if (!isSafeCell(targetCell.r, targetCell.c)) {
                    const willCut = PLAYER_PAWNS.some(pl => {
                        if (pl.inGhar) return false;
                        const pc = PLAYER_ROUTE[pl.routeStep];
                        return pc.r === targetCell.r && pc.c === targetCell.c;
                    });
                    if (willCut) score += 150;
                }

                // 2. Entering Central Ghar (+200)
                if (nextStep === 24) score += 200;

                // 3. Landing on Safe Square Gadi (+60)
                if (isSafeCell(targetCell.r, targetCell.c)) score += 60;

                // 4. Entering Inner Lane (+80)
                if (nextStep > 16 && p.routeStep <= 16) score += 80;

                // Base progress
                score += nextStep;

                if (score > bestScore) {
                    bestScore = score;
                    bestPawn = p;
                }
            });

            bestPawn.routeStep += result.sum;
            if (bestPawn.routeStep === 24) {
                bestPawn.inGhar = true;
                logChronicle('Shakuni placed a Goti into the central Ghar!', 'log-red');
            }

            refreshAllPawnWorldPositions(true);

            setTimeout(() => {
                executeCombatCheck(bestPawn);
                concludeAITurn(isBonus);
            }, 480);
        });
    }, 600);
}

function concludeAITurn(isBonus) {
    castingArmGroup.rotation.x = 0;
    checkVictoryState();
    if (CHOWKA.phase === 'GAME_OVER') return;

    if (isBonus) {
        logChronicle('Shakuni earned a bonus roll!', 'log-red');
        triggerShakuniVoice("The bones answer only to their master! Another roll for Gandhara!");
        setTimeout(executeNobleShakuniTurn, 1000);
    } else {
        CHOWKA.currentTurn = 'PLAYER';
        CHOWKA.isBonusRoll = false;
        document.getElementById('turn-indicator').className = 'badge-player';
        document.getElementById('turn-indicator').innerText = 'YOUR TURN';
        logChronicle('Your turn to cast the Pachikas.');
        setPhase('IDLE');
    }
}

/* ==========================================================
   12. COMBAT & MAYA DISPEL
   ========================================================== */
function executeCombatCheck(activePawn) {
    if (activePawn.inGhar) return;

    const route = (activePawn.owner === 'PLAYER') ? PLAYER_ROUTE : AI_ROUTE;
    const currentCell = route[activePawn.routeStep];

    if (isSafeCell(currentCell.r, currentCell.c)) return;

    const enemies = (activePawn.owner === 'PLAYER') ? AI_PAWNS : PLAYER_PAWNS;

    enemies.forEach(enemy => {
        if (!enemy.inGhar) {
            const eRoute = (enemy.owner === 'PLAYER') ? PLAYER_ROUTE : AI_ROUTE;
            const eCell = eRoute[enemy.routeStep];

            if (eCell.r === currentCell.r && eCell.c === currentCell.c) {
                enemy.routeStep = 0; // Sent back to start
                logChronicle(`<strong>${activePawn.owner === 'PLAYER' ? 'You' : 'Shakuni'}</strong> cut an opposing Goti! Sent back to Home Gadi!`, 'log-gold');

                if (activePawn.owner === 'PLAYER') {
                    CHOWKA.playerKills++;
                    CHOWKA.isBonusRoll = true;
                    triggerShakuniVoice("A keen strike, Kaunteya! You fight with the spirit of Pandu. But the board is shifting—beware my counter-strike!");
                } else {
                    CHOWKA.aiKills++;
                    CHOWKA.satyaBala = Math.min(100, CHOWKA.satyaBala + 30);
                    triggerShakuniVoice("जि तम्! (Jitam!) Another treasure slips away! Did you think the dice had mercy, Dharmaputra?");
                }

                refreshAllPawnWorldPositions(true);
                updateHUD();
            }
        }
    });
}

function dispelMayaToken() {
    if (CHOWKA.satyaBala < 30 || CHOWKA.mayaTokens === 0 || CHOWKA.phase !== 'IDLE') return;

    CHOWKA.satyaBala -= 30;
    CHOWKA.mayaTokens--;
    logChronicle(`Māyābhañjana! A Maya Token is shattered! Shakuni's Pachikas lose weighted bias.`, 'log-gold');
    triggerShakuniVoice('Hraaah! What sorcery is this?! My sacred bones tremble!');
    updateHUD();
}

function highlightPawnMeshes(pawns, enable) {
    pawns.forEach(p => {
        if (!p.inGhar && p.mesh) {
            p.mesh.children.forEach(c => {
                if (c.material && c.material.emissive) {
                    c.material.emissiveIntensity = enable ? 0.8 : 0.35;
                }
            });
        }
    });
}

function updateHUD() {
    document.getElementById('satya-val').innerText = `${CHOWKA.satyaBala} / 100`;
    document.getElementById('satya-progress').style.width = `${CHOWKA.satyaBala}%`;

    const pKillElem = document.getElementById('player-kill-badge');
    pKillElem.innerText = `${CHOWKA.playerKills} ${CHOWKA.playerKills > 0 ? '(UNLOCKED)' : '(LOCKED)'}`;
    pKillElem.className = (CHOWKA.playerKills > 0) ? 'badge-unlocked' : 'badge-locked';

    const aiKillElem = document.getElementById('ai-kill-badge');
    aiKillElem.innerText = `${CHOWKA.aiKills} ${CHOWKA.aiKills > 0 ? '(UNLOCKED)' : '(LOCKED)'}`;
    aiKillElem.className = (CHOWKA.aiKills > 0) ? 'badge-unlocked' : 'badge-locked';

    for (let i = 1; i <= 3; i++) {
        const gem = document.getElementById(`maya-gem-${i}`);
        if (i > CHOWKA.mayaTokens) gem.classList.add('shattered');
        else gem.classList.remove('shattered');
    }

    document.getElementById('btn-break-maya').disabled = (CHOWKA.satyaBala < 30 || CHOWKA.mayaTokens === 0 || CHOWKA.phase !== 'IDLE');
}

/* ==========================================================
   13. ENDGAME SCREEN & CAMERA VIEW PRESETS
   ========================================================== */
function checkVictoryState() {
    const playerWon = PLAYER_PAWNS.every(p => p.inGhar);
    const aiWon = AI_PAWNS.every(p => p.inGhar);

    if (playerWon) {
        setPhase('GAME_OVER');
        displayEndgameCard('AWAKENING OF DHARMA', 'All four Pandava Gotis have securely entered the sacred Ghar! Through calculated patience and courage, you broke through Shakuni\'s illusion. Hastinapura bows to righteousness!');
    } else if (aiWon) {
        setPhase('GAME_OVER');
        displayEndgameCard('HISTORICAL COLLAPSE', 'King Shakuni has successfully escorted all four Kaurava Gotis into the Ghar. The tragic downfall of the Sabha Parva repeats.');
    }
}

function displayEndgameCard(title, msg) {
    document.getElementById('endgame-header').innerText = title;
    document.getElementById('endgame-message').innerText = msg;
    document.getElementById('endgame-screen').classList.add('active');
}

function cameraViewThrone() {
    camera.position.set(0, 11.5, 17.5);
    controls.target.set(0, 0.6, 0);
}

function cameraViewTopDown() {
    camera.position.set(0, 26, 0.1);
    controls.target.set(0, 0, 0);
}

function cameraViewIsometric() {
    camera.position.set(13, 14, 13);
    controls.target.set(0, 0, 0);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ==========================================================
   14. MAIN ANIMATION LOOP
   ========================================================== */
function animate() {
    requestAnimationFrame(animate);
    controls.update();

    // Subtle natural breathing oscillation for Shakuni
    shakuniMesh.position.y = 1.6 + Math.sin(Date.now() * 0.003) * 0.04;

    // Torch flare
    shakuniBackLight.intensity = 1.4 + Math.sin(Date.now() * 0.006) * 0.25;

    renderer.render(scene, camera);
}
animate();