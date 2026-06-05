import * as THREE from 'three';
import { GAME_CONFIG, SKINS, ENVIRONMENTS } from '../constants';
import { ObstacleType, CoinType, PowerUpType, ParticleEffect, Skin, GameEnvironment } from '../types';

export class GameEngine {
  private container: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private cameraX: number = 0;

  // Lights
  private ambientLight!: THREE.AmbientLight;
  private dirLight!: THREE.DirectionalLight;

  // Game track & elements
  private trackGroup!: THREE.Group;
  private activeSkin: Skin;
  private activeEnv: GameEnvironment;

  // Mesh lists for collision detection and warping
  private characterGroup!: THREE.Group;
  private headMesh!: THREE.Mesh;
  private currentScaleX: number = 1.0;
  private currentScaleY: number = 1.0;
  private currentScaleZ: number = 1.0;
  private boardGroup!: THREE.Group;
  private boardMesh!: THREE.Mesh;
  private leftLegMesh!: THREE.Mesh;
  private rightLegMesh!: THREE.Mesh;
  private leftArmMesh!: THREE.Mesh;
  private rightArmMesh!: THREE.Mesh;
  private obstacleMeshes: { id: string; mesh: THREE.Group; data: ObstacleType }[] = [];
  private coinMeshes: { id: string; mesh: THREE.Mesh; data: CoinType }[] = [];
  private powerUpMeshes: { id: string; mesh: THREE.Group; data: PowerUpType }[] = [];
  private sceneryMeshes: THREE.Object3D[] = [];
  private particles: ParticleEffect[] = [];
  private rainGroup: THREE.Group | null = null;
  private particleGeometry!: THREE.BufferGeometry;
  private particlePoints!: THREE.Points;
  private coinGeometry!: THREE.CylinderGeometry;
  private coinMaterial!: THREE.MeshStandardMaterial;
  private superCoinGeometry!: THREE.OctahedronGeometry;
  private superCoinMaterial!: THREE.MeshStandardMaterial;
  private sceneryChunkCount: number = 0;

  // Player state
  public playerLane: number = 0; // -1 (left), 0 (middle), 1 (right)
  public playerTargetX: number = 0;
  public playerX: number = 0;
  public playerY: number = 0;
  public playerZ: number = 0;
  public playerVelocityY: number = 0;
  public isJumping: boolean = false;
  public isSliding: boolean = false;
  private isDead: boolean = false;
  private slideTimer: number = 0;

  // Performance / speed logic
  public isPlaying: boolean = false;
  public scrollSpeed: number = GAME_CONFIG.START_SPEED;
  public coinsCollected: number = 0;
  public currentScore: number = 0;
  public scoreMultiplier: number = 1;
  private scoreTicker: number = 0;

  // Active power-ups state
  public activeMagnet: boolean = false;
  public activeMultiplier: boolean = false;
  public activeShield: boolean = false;
  public activeBoost: boolean = false;
  private magnetTimer: number = 0;
  private multiplierTimer: number = 0;
  private shieldTimer: number = 0;
  private boostTimer: number = 0;
  private powerUpsCollected: number = 0;

  // Accessories State
  public activeHeadwear: string = 'none';
  public activeBoardPattern: string = 'solid';

  // Generation offsets
  private nextObstacleZ: number = -60;
  private nextCoinZ: number = -30;
  private nextSceneryZ: number = 0;

  // Curvature offsets
  private targetCurvatureX: number = 0;
  private currentCurvatureX: number = 0;

  // Audio simulation (Web Audio synthesizers for cool retro arcade sound effects!)
  private audioCtx: AudioContext | null = null;
  public soundEnabled: boolean = true;
  public soundVolume: number = 80;

  // New visual mechanics properties
  private coinComboCount: number = 0;
  private shakeIntensity: number = 0;
  private shakeDecay: number = 5.0;

  // --- Subway Surfers Guard and Dog Chase System ---
  private guardGroup!: THREE.Group;
  private dogGroup!: THREE.Group;
  private guardActive: boolean = true; // starts active at beginning of run!
  private guardTimer: number = 7.0;     // runs close behind player for first 7 seconds
  private guardLeftLeg!: THREE.Mesh;
  private guardRightLeg!: THREE.Mesh;
  private guardLeftArm!: THREE.Mesh;
  private guardRightArm!: THREE.Mesh;
  private dogLeftFrontLeg!: THREE.Mesh;
  private dogRightFrontLeg!: THREE.Mesh;
  private dogLeftBackLeg!: THREE.Mesh;
  private dogRightBackLeg!: THREE.Mesh;
  private guardVisualZ: number = 4.8;  // Z offset behind player. Active: ~4.5 - 5.5, Inactive: Z = 15+ (offscreen)

  // Callbacks to React UI hook state
  private callbacks: {
    onCoinCollected: (count: number) => void;
    onScoreUpdated: (score: number) => void;
    onGameOver: (finalScore: number, finalCoins: number, finalPowerUps: number) => void;
    onPowerUpActivated: (type: 'magnet' | 'multiplier' | 'shield' | 'boost', duration: number, active: boolean) => void;
    onComboUpdated: (comboCount: number, showAnim: boolean, bonusScore: number) => void;
    onSpeedUpdated: (speedFactor: number) => void;
  };

  constructor(
    container: HTMLDivElement,
    canvas: HTMLCanvasElement,
    skinId: string,
    envId: string,
    headwearId: string,
    boardPatternId: string,
    callbacks: {
      onCoinCollected: (count: number) => void;
      onScoreUpdated: (score: number) => void;
      onGameOver: (finalScore: number, finalCoins: number, finalPowerUps: number) => void;
      onPowerUpActivated: (type: 'magnet' | 'multiplier' | 'shield' | 'boost', duration: number, active: boolean) => void;
      onComboUpdated: (comboCount: number, showAnim: boolean, bonusScore: number) => void;
      onSpeedUpdated: (speedFactor: number) => void;
    }
  ) {
    this.container = container;
    this.canvas = canvas;
    this.callbacks = callbacks;
    this.activeSkin = SKINS.find(s => s.id === skinId) || SKINS[0];
    this.activeEnv = ENVIRONMENTS.find(e => e.id === envId) || ENVIRONMENTS[0];
    this.activeHeadwear = headwearId || 'none';
    this.activeBoardPattern = boardPatternId || 'solid';
    this.cameraX = 0;

    // Initialize 3D renderer setup
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 500;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.activeEnv.skyColor);
    this.scene.fog = new THREE.Fog(this.activeEnv.skyColor, 170, 500);

    // Camera setup (high elevation and tilt matching classical endless surfers)
    this.camera = new THREE.PerspectiveCamera(60, width / height, 1, 600);
    this.camera.position.set(0, 7, 12);
    this.camera.lookAt(new THREE.Vector3(0, 2, -15));

    this.trackGroup = new THREE.Group();
    this.scene.add(this.trackGroup);

    this.setupLights();
    this.setupCelestialBackground();
    this.setupTrackBase();
    this.setupPlayer();
    this.setupGuardAndDog();
    this.setupParticles();

    // Spawn starting chunks
    this.fillStartingScene();
    this.setupDynamicWeather();

    this.isPlaying = true;
  }

  // Set up lights conforming with the environment
  private setupLights() {
    this.ambientLight = new THREE.AmbientLight('#ffffff', 0.7); // slightly brighter ambient
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight('#ffffff', 1.65); // brighter daylight shine
    this.dirLight.position.set(12, 28, 18);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048; // Ultra HD high-resolution shadow maps
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 100;
    const size = 18; // Focused frustum bounds for ultra crisp shadow cascades centered on player
    this.dirLight.shadow.camera.left = -size;
    this.dirLight.shadow.camera.right = size;
    this.dirLight.shadow.camera.top = size;
    this.dirLight.shadow.camera.bottom = -size;
    this.dirLight.shadow.bias = -0.0005; // minimized shadow grid acne
    this.dirLight.shadow.normalBias = 0.02; // smooth out curved edges
    this.scene.add(this.dirLight);
  }

  // Set up celestial sky objects (gorgeous distant suns, moons, orbital rings)
  private setupCelestialBackground() {
    const env = this.activeEnv;
    const isTemple = env.id === 'temple';
    const isCyber = env.id === 'cyber';
    const isSunset = env.id === 'theme_sunset';
    const isMidnight = env.id === 'theme_midnight';
    const isIndustrial = env.id === 'theme_industrial';

    const celestialGroup = new THREE.Group();
    celestialGroup.name = 'sky_celestial';

    let sunColor = '#facc15';
    let size = 15;

    if (isCyber) {
      sunColor = '#d946ef'; // Neon Magenta-Purple Synthwave Sun
      size = 18;

      // Add multiple secondary glowing digital grid stars
      const starGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
      const starMat = new THREE.MeshBasicMaterial({ color: '#22d3ee' });
      for (let s = 0; s < 15; s++) {
        const star = new THREE.Mesh(starGeo, starMat);
        star.position.set(
          (Math.random() - 0.5) * 200,
          20 + Math.random() * 80,
          -50 + (Math.random() - 0.5) * 100
        );
        celestialGroup.add(star);
      }
    } else if (isSunset) {
      sunColor = '#f97316'; // Sunset Orange Glow
      size = 22;
    } else if (isMidnight) {
      sunColor = '#e2e8f0'; // Lunar White
      size = 12;

      // Starfield particles in background
      const starsCount = 45;
      const starsGeo = new THREE.BufferGeometry();
      const positions = new Float32Array(starsCount * 3);
      for (let i = 0; i < starsCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 350;
        positions[i * 3 + 1] = 10 + Math.random() * 120;
        positions[i * 3 + 2] = -50 + (Math.random() - 0.5) * 120;
      }
      starsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const starsMat = new THREE.PointsMaterial({ color: '#ffffff', size: 0.85, sizeAttenuation: false });
      const starField = new THREE.Points(starsGeo, starsMat);
      celestialGroup.add(starField);
    } else if (isTemple) {
      sunColor = '#fbbf24'; // Jungle Golden morning glare
      size = 14;
    } else if (isIndustrial) {
      sunColor = '#ea580c'; // Low-hanging hazardous orange sky disc
      size = 16;
    }

    // Clean, clear Subway Surfers style sun (small and subtle backdrop element instead of huge blocking shapes)
    const sunGeo = new THREE.SphereGeometry(size * 0.25, 12, 12);
    const sunMat = new THREE.MeshBasicMaterial({ color: sunColor, transparent: true, opacity: 0.8 });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    celestialGroup.add(sunMesh);

    // Position far into backdrop (infinite coordinate)
    celestialGroup.position.set(22, 42, -340);
    this.scene.add(celestialGroup);
  }

  // --- PROCEDURAL TEXTURES FOR THE REAL SUBWAY SURFERS LOOK ---
  private createBallastTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    
    // Gravel texture base
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 128, 128);
    
    // Scatter small gravel stones
    for (let i = 0; i < 300; i++) {
      const x = Math.random() * 128;
      const y = Math.random() * 128;
      const r = 0.5 + Math.random() * 1.5;
      ctx.fillStyle = Math.random() > 0.5 ? '#334155' : '#0f172a';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 200); // Repeat down the lanes
    return texture;
  }

  private createSleeperTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    
    // Creosote treated railroad tie wood brown
    ctx.fillStyle = '#451a03';
    ctx.fillRect(0, 0, 64, 32);
    
    // Wood grain lines
    ctx.strokeStyle = '#270e01';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const y = i * 4 + (Math.random() - 0.5) * 2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(64, y + (Math.random() - 0.5) * 4);
      ctx.stroke();
    }
    
    // Weathered splits/cuts
    ctx.fillStyle = '#1c0a01';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(Math.random() * 40 + 10, Math.random() * 20 + 4, 3 + Math.random() * 12, 1);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  private createWallTexture(side: 'left' | 'right'): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    // Ground dark brick wall tone
    ctx.fillStyle = '#374151';
    ctx.fillRect(0, 0, 512, 256);
    
    // Brick mortar lines
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 1.5;
    const brickW = 32;
    const brickH = 14;
    for (let y = 0; y < 256; y += brickH) {
      const isShifted = (y % (brickH * 2) === 0);
      const shift = isShifted ? 0 : brickW / 2;
      
      // Horizontal mortar lines
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
      
      // Vertical mortar block divisions
      for (let x = -shift; x < 512; x += brickW) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + brickH);
        ctx.stroke();
        
        // Color variants for individual bricks
        if (Math.random() > 0.6) {
          ctx.fillStyle = Math.random() > 0.5 ? 'rgba(31, 41, 55, 0.45)' : 'rgba(55, 65, 81, 0.25)';
          ctx.fillRect(x + 1, y + 1, brickW - 2, brickH - 2);
        }
      }
    }
    
    // Draw colorful dripping graffiti tags & bubble lettering overlays like Subway Surfers!
    const tags = ['SURF', 'RUSH', 'BOOST', 'SUBWAY', 'COINS', 'METRO', 'JAKE', 'TRICKY'];
    for (let j = 0; j < 5; j++) {
      const tx = Math.random() * 380 + 60;
      const ty = Math.random() * 100 + 90;
      const text = tags[Math.floor(Math.random() * tags.length)];
      
      ctx.font = '900 italic 38px Impact, Charcoal, sans-serif';
      ctx.textAlign = 'center';
      
      // Draw spray shadow glow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#0f172a';
      ctx.fillText(text, tx + 4, ty + 4);
      
      // Outer neon spray outline
      ctx.shadowBlur = 0;
      ctx.strokeStyle = Math.random() > 0.5 ? '#ec4899' : '#06b6d4'; // neon pink or vibrant cyan
      ctx.lineWidth = 6;
      ctx.strokeText(text, tx, ty);
      
      // Inner lettering body color
      ctx.fillStyle = Math.random() > 0.5 ? '#facc15' : '#22c55e'; // neon yellow or bright lime green
      ctx.fillText(text, tx, ty);
    }
    
    // Dirt dripping water stains running down the concrete walls
    for (let w = 0; w < 12; w++) {
      const wx = Math.random() * 512;
      const wy = Math.random() * 30;
      const wh = 40 + Math.random() * 120;
      const grad = ctx.createLinearGradient(wx, wy, wx, wy + wh);
      grad.addColorStop(0, 'rgba(17, 24, 39, 0.85)');
      grad.addColorStop(1, 'rgba(17, 24, 39, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(wx - 2, wy, 4 + Math.random() * 6, wh);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 35); // repeat nicely along the subway wall length
    return texture;
  }

  private createPlatformTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    
    // Base concrete grey tile pavement
    ctx.fillStyle = '#4b5563';
    ctx.fillRect(0, 0, 128, 128);
    
    // Tile grids
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 1.5;
    for (let i = 0; i <= 128; i += 32) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(128, i);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 128);
      ctx.stroke();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 40); // Repeat along platforms
    return texture;
  }

  // Add modular tracks
  private setupTrackBase() {
    const laneW = GAME_CONFIG.LANE_WIDTH;

    // Create high-fidelity textures
    const ballastTex = this.createBallastTexture();
    const sleeperTex = this.createSleeperTexture();
    const leftWallTex = this.createWallTexture('left');
    const rightWallTex = this.createWallTexture('right');
    const platformTex = this.createPlatformTexture();

    // Create 3 tracks
    for (let lane = -1; lane <= 1; lane++) {
      // 1. Gravel roadbed / ballast base
      const ballastGeo = new THREE.BoxGeometry(2.3, 0.03, GAME_CONFIG.TRACK_LENGTH);
      const ballastMat = new THREE.MeshStandardMaterial({
        map: ballastTex,
        roughness: 0.95,
        metalness: 0.05
      });
      const ballast = new THREE.Mesh(ballastGeo, ballastMat);
      ballast.position.set(lane * laneW, 0.005, -GAME_CONFIG.TRACK_LENGTH / 2 + 10);
      ballast.receiveShadow = true;
      this.trackGroup.add(ballast);

      // 2. Concrete/Wood Track Base Slab
      const geometry = new THREE.BoxGeometry(2.4, 0.12, GAME_CONFIG.TRACK_LENGTH);
      const material = new THREE.MeshStandardMaterial({
        color: this.activeEnv.trackColor,
        roughness: 0.85,
        metalness: 0.15
      });
      const track = new THREE.Mesh(geometry, material);
      track.position.set(lane * laneW, -0.05, -GAME_CONFIG.TRACK_LENGTH / 2 + 10);
      track.receiveShadow = true;
      this.trackGroup.add(track);

      // 3. Realistic, Densely-spaced Wooden/Slate railroad ties (sleepers) along the track
      const tieGeo = new THREE.BoxGeometry(2.0, 0.05, 0.28);
      const tieMat = new THREE.MeshStandardMaterial({
        map: sleeperTex,
        roughness: 0.9,
        metalness: 0.1
      });

      // Little metallic iron anchor clips grouping
      const clipGeo = new THREE.BoxGeometry(0.15, 0.03, 0.15);
      const clipMat = new THREE.MeshStandardMaterial({
        color: '#334155', // Aged dark iron plates
        roughness: 0.5,
        metalness: 0.85
      });

      // Densely space sleepers at 1.6m intervals (realistic speed rushing lines!)
      const trackStart = 10;
      const trackEnd = -GAME_CONFIG.TRACK_LENGTH + 10;
      for (let zOffset = trackStart; zOffset > trackEnd; zOffset -= 1.6) {
        // Main tie sleeper
        const tie = new THREE.Mesh(tieGeo, tieMat);
        tie.position.set(lane * laneW, 0.02, zOffset);
        tie.receiveShadow = true;
        this.trackGroup.add(tie);

        // Standard tie plates/anchor clips underneath where the rails run
        for (const railOffset of [-0.9, 0.9]) {
          const clip = new THREE.Mesh(clipGeo, clipMat);
          clip.position.set(lane * laneW + railOffset, 0.05, zOffset);
          clip.receiveShadow = true;
          this.trackGroup.add(clip);
        }
      }

      // 4. Realistic 3D standing steel rails (Elevated, polished profiles)
      for (const railOffset of [-0.9, 0.9]) {
        // Box size gives vertical steel profile height of 0.18m
        const railGeo = new THREE.BoxGeometry(0.08, 0.18, GAME_CONFIG.TRACK_LENGTH);
        const railMat = new THREE.MeshStandardMaterial({
          color: '#cbd5e1', // High reflecting silver-steel shine
          roughness: 0.15,
          metalness: 0.95
        });
        const rail = new THREE.Mesh(railGeo, railMat);
        // Positioned standing upright, extending from anchor clips
        rail.position.set(lane * laneW + railOffset, 0.12, -GAME_CONFIG.TRACK_LENGTH / 2 + 10);
        rail.receiveShadow = true;
        this.trackGroup.add(rail);
      }
    }

    // Side platforms
    const sideW = 40;
    const platformGeo = new THREE.BoxGeometry(sideW, 0.5, GAME_CONFIG.TRACK_LENGTH);
    const platformMat = new THREE.MeshStandardMaterial({
      map: platformTex,
      roughness: 0.9,
    });

    // Left platform
    const leftPlatform = new THREE.Mesh(platformGeo, platformMat);
    leftPlatform.position.set(-sideW / 2 - GAME_CONFIG.LANE_WIDTH * 1.5, -0.25, -GAME_CONFIG.TRACK_LENGTH / 2 + 10);
    leftPlatform.receiveShadow = true;
    this.trackGroup.add(leftPlatform);

    // Right platform
    const rightPlatform = new THREE.Mesh(platformGeo, platformMat);
    rightPlatform.position.set(sideW / 2 + GAME_CONFIG.LANE_WIDTH * 1.5, -0.25, -GAME_CONFIG.TRACK_LENGTH / 2 + 10);
    rightPlatform.receiveShadow = true;
    this.trackGroup.add(rightPlatform);

    // Tall concrete flanking subway retaining walls wrapped in realistic brick & graffiti texture!
    const wallGeo = new THREE.BoxGeometry(0.3, 7.5, GAME_CONFIG.TRACK_LENGTH);
    const leftWallMat = new THREE.MeshStandardMaterial({
      map: leftWallTex,
      roughness: 0.95
    });
    const rightWallMat = new THREE.MeshStandardMaterial({
      map: rightWallTex,
      roughness: 0.95
    });

    const leftWall = new THREE.Mesh(wallGeo, leftWallMat);
    leftWall.position.set(-GAME_CONFIG.LANE_WIDTH * 1.6, 3.5, -GAME_CONFIG.TRACK_LENGTH / 2 + 10);
    leftWall.receiveShadow = true;
    this.trackGroup.add(leftWall);

    const rightWall = new THREE.Mesh(wallGeo, rightWallMat);
    rightWall.position.set(GAME_CONFIG.LANE_WIDTH * 1.6, 3.5, -GAME_CONFIG.TRACK_LENGTH / 2 + 10);
    rightWall.receiveShadow = true;
    this.trackGroup.add(rightWall);

    // Real Metal Conduit Utility Pipes running continuously along both walls!
    const pipeGeo = new THREE.CylinderGeometry(0.06, 0.06, GAME_CONFIG.TRACK_LENGTH, 8);
    pipeGeo.rotateX(Math.PI / 2);
    const pipeMat = new THREE.MeshStandardMaterial({
      color: '#475569', // industrial dark iron metal conduit
      roughness: 0.3,
      metalness: 0.8
    });

    for (const height of [2.0, 3.8]) {
      // Left Wall conduits
      const pipeLeft = new THREE.Mesh(pipeGeo, pipeMat);
      pipeLeft.position.set(-GAME_CONFIG.LANE_WIDTH * 1.45, height, -GAME_CONFIG.TRACK_LENGTH / 2 + 10);
      pipeLeft.receiveShadow = true;
      this.trackGroup.add(pipeLeft);

      // Right Wall conduits
      const pipeRight = new THREE.Mesh(pipeGeo, pipeMat);
      pipeRight.position.set(GAME_CONFIG.LANE_WIDTH * 1.45, height, -GAME_CONFIG.TRACK_LENGTH / 2 + 10);
      pipeRight.receiveShadow = true;
      this.trackGroup.add(pipeRight);
    }

    // Overhead high-tension electrical copper wire cables above each lane
    const wireGeo = new THREE.CylinderGeometry(0.015, 0.015, GAME_CONFIG.TRACK_LENGTH, 4);
    wireGeo.rotateX(Math.PI / 2);
    const wireMat = new THREE.MeshBasicMaterial({ color: '#0f172a' }); // thin dark cable lines

    for (const lane of [-1, 0, 1]) {
      const wire = new THREE.Mesh(wireGeo, wireMat);
      wire.position.set(lane * GAME_CONFIG.LANE_WIDTH, 4.5, -GAME_CONFIG.TRACK_LENGTH / 2 + 10);
      this.trackGroup.add(wire);
    }

    // Yellow-and-black hazard warning overpass gantries & signal lights bridging the lanes!
    const hazardCanvas = document.createElement('canvas');
    hazardCanvas.width = 128;
    hazardCanvas.height = 32;
    const hCtx = hazardCanvas.getContext('2d')!;
    hCtx.fillStyle = '#facc15'; // bright yellow caution background
    hCtx.fillRect(0, 0, 128, 32);
    hCtx.fillStyle = '#111827'; // rich dark charcoal stripes
    for (let s = 0; s < 128; s += 16) {
      hCtx.beginPath();
      hCtx.moveTo(s, 0);
      hCtx.lineTo(s + 8, 0);
      hCtx.lineTo(s + 16, 32);
      hCtx.lineTo(s + 8, 32);
      hCtx.fill();
    }
    const hazardTex = new THREE.CanvasTexture(hazardCanvas);
    hazardTex.wrapS = THREE.RepeatWrapping;
    hazardTex.repeat.set(10, 1);

    const hazardMat = new THREE.MeshStandardMaterial({
      map: hazardTex,
      roughness: 0.55
    });

    const pillarMat = new THREE.MeshStandardMaterial({
      color: '#1e293b', // industrial dark iron columns
      roughness: 0.75,
      metalness: 0.65
    });

    const gantryStart = 10;
    const gantryEnd = -GAME_CONFIG.TRACK_LENGTH + 10;

    for (let zOffset = gantryStart - 12; zOffset > gantryEnd; zOffset -= 22.0) {
      // Left vertical pillar column
      const leftPill = new THREE.Mesh(new THREE.BoxGeometry(0.3, 5.5, 0.3), pillarMat);
      leftPill.position.set(-GAME_CONFIG.LANE_WIDTH * 1.45, 2.75, zOffset);
      leftPill.castShadow = true;
      leftPill.receiveShadow = true;
      this.trackGroup.add(leftPill);

      // Right vertical pillar column
      const rightPill = new THREE.Mesh(new THREE.BoxGeometry(0.3, 5.5, 0.3), pillarMat);
      rightPill.position.set(GAME_CONFIG.LANE_WIDTH * 1.45, 2.75, zOffset);
      rightPill.castShadow = true;
      rightPill.receiveShadow = true;
      this.trackGroup.add(rightPill);

      // Overhead caution girder beam spans lanes
      const bridgeBeam = new THREE.Mesh(new THREE.BoxGeometry(GAME_CONFIG.LANE_WIDTH * 3.0, 0.35, 0.35), hazardMat);
      bridgeBeam.position.set(0, 5.2, zOffset);
      bridgeBeam.castShadow = true;
      bridgeBeam.receiveShadow = true;
      this.trackGroup.add(bridgeBeam);

      // Hanging railway signal lantern blocks pointing at tracks
      for (const trackLane of [-1, 0, 1]) {
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.2), new THREE.MeshStandardMaterial({ color: '#090d16' }));
        lamp.position.set(trackLane * GAME_CONFIG.LANE_WIDTH, 4.8, zOffset);
        this.trackGroup.add(lamp);

        // Bright blinking signal LED light (either emerald green or scarlet red)
        const lampColor = (Math.random() > 0.45) ? '#22c55e' : '#ef4444';
        const lens = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), new THREE.MeshBasicMaterial({ color: lampColor }));
        lens.position.set(trackLane * GAME_CONFIG.LANE_WIDTH, 4.65, zOffset + 0.11);
        this.trackGroup.add(lens);
      }
    }

    // Add graffiti tag boards along the walls at regular intervals to simulate urban street tagging
    const tagGeo = new THREE.BoxGeometry(0.04, 2.0, 4.0);
    const tagColors = ['#f43f5e', '#10b981', '#3b82f6', '#eab308', '#a855f7', '#fb923c'];

    const wallStart = 10;
    const wallEnd = -GAME_CONFIG.TRACK_LENGTH + 10;
    for (let zOffset = wallStart - 5; zOffset > wallEnd; zOffset -= 18.0) {
      if (Math.random() > 0.3) {
        const color = tagColors[Math.floor(Math.random() * tagColors.length)];
        const graffitiPanel = new THREE.Mesh(tagGeo, new THREE.MeshStandardMaterial({
          color: color,
          roughness: 0.8,
          emissive: color,
          emissiveIntensity: 0.15
        }));
        graffitiPanel.position.set(-GAME_CONFIG.LANE_WIDTH * 1.44, 2.5 + (Math.random() - 0.5) * 0.4, zOffset);
        
        // Add dual black-stripes to represent street aesthetic typography
        const overlay = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.4, 2.8), new THREE.MeshBasicMaterial({ color: '#111827' }));
        overlay.position.set(-0.03, 0, 0);
        graffitiPanel.add(overlay);

        this.trackGroup.add(graffitiPanel);
      }

      if (Math.random() > 0.3) {
        const color = tagColors[Math.floor(Math.random() * tagColors.length)];
        const graffitiPanel = new THREE.Mesh(tagGeo, new THREE.MeshStandardMaterial({
          color: color,
          roughness: 0.8,
          emissive: color,
          emissiveIntensity: 0.15
        }));
        graffitiPanel.position.set(GAME_CONFIG.LANE_WIDTH * 1.44, 2.5 + (Math.random() - 0.5) * 0.4, zOffset);

        const overlay = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.4, 2.8), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
        overlay.position.set(0.03, 0, 0);
        graffitiPanel.add(overlay);

        this.trackGroup.add(graffitiPanel);
      }
    }
  }

  // High-fidelity low poly player modeling
  private setupPlayer() {
    this.characterGroup = new THREE.Group();
    this.characterGroup.position.set(0, 0, 0);
    this.scene.add(this.characterGroup);

    // 1. Board representation with dedicated group for complete visibility control
    this.boardGroup = new THREE.Group();
    this.boardGroup.position.set(0, 0, 0);
    this.characterGroup.add(this.boardGroup);

    const boardGeo = new THREE.BoxGeometry(1.2, 0.15, 2.4);
    const boardMat = new THREE.MeshStandardMaterial({
      color: this.activeSkin.boardColor,
      roughness: 0.2,
      metalness: 0.7,
      emissive: this.activeSkin.boardColor,
      emissiveIntensity: 0.2
    });
    this.boardMesh = new THREE.Mesh(boardGeo, boardMat);
    this.boardMesh.position.set(0, 0.18, 0);
    this.boardMesh.castShadow = true;
    this.boardGroup.add(this.boardMesh);

    // Adding mechanical skateboard trucks & neon glowing hover wheels to board underside
    const truckGeo = new THREE.BoxGeometry(0.8, 0.1, 0.15);
    const truckMat = new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.9, roughness: 0.25 });
    const wheelGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.16, 12);
    wheelGeo.rotateZ(Math.PI / 2); // orient like skateboard wheels
    const wheelMat = new THREE.MeshStandardMaterial({
      color: this.activeSkin.boardColor,
      roughness: 0.1,
      metalness: 0.5,
      emissive: this.activeSkin.boardColor,
      emissiveIntensity: 1.0
    });

    const frontTruck = new THREE.Mesh(truckGeo, truckMat);
    frontTruck.position.set(0, 0.08, -0.6);
    frontTruck.castShadow = true;
    this.boardGroup.add(frontTruck);

    for (const wX of [-0.45, 0.45]) {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(wX, 0.07, -0.6);
      wheel.castShadow = true;
      this.boardGroup.add(wheel);
    }

    const rearTruck = frontTruck.clone();
    rearTruck.position.set(0, 0.08, 0.6);
    this.boardGroup.add(rearTruck);

    for (const wX of [-0.45, 0.45]) {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(wX, 0.07, 0.6);
      wheel.castShadow = true;
      this.boardGroup.add(wheel);
    }

    // Dynamic Board Patterns Customization
    if (this.activeBoardPattern === 'stripes') {
      const stripeGeo = new THREE.BoxGeometry(0.12, 0.05, 2.3);
      const stripeMat = new THREE.MeshStandardMaterial({ color: '#f43f5e', emissive: '#f43f5e', emissiveIntensity: 1.0 });
      const stripeL = new THREE.Mesh(stripeGeo, stripeMat);
      stripeL.position.set(-0.35, 0.22, 0);
      const stripeR = new THREE.Mesh(stripeGeo, stripeMat);
      stripeR.position.set(0.35, 0.22, 0);
      stripeL.castShadow = true;
      stripeR.castShadow = true;
      this.boardGroup.add(stripeL);
      this.boardGroup.add(stripeR);
    } else if (this.activeBoardPattern === 'flames') {
      const flameGeo = new THREE.BoxGeometry(0.5, 0.05, 0.8);
      const flameMat = new THREE.MeshStandardMaterial({ color: '#f97316', emissive: '#f97316', emissiveIntensity: 0.8 });
      const flameLeft = new THREE.Mesh(flameGeo, flameMat);
      flameLeft.position.set(-0.25, 0.22, -0.6);
      const flameRight = new THREE.Mesh(flameGeo, flameMat);
      flameRight.position.set(0.25, 0.22, -0.6);
      flameLeft.castShadow = true;
      flameRight.castShadow = true;
      this.boardGroup.add(flameLeft);
      this.boardGroup.add(flameRight);
    } else if (this.activeBoardPattern === 'galaxy') {
      const coreGeo = new THREE.BoxGeometry(0.7, 0.08, 1.4);
      const coreMat = new THREE.MeshStandardMaterial({ color: '#a855f7', emissive: '#a855f7', emissiveIntensity: 1.2, transparent: true, opacity: 0.85 });
      const core = new THREE.Mesh(coreGeo, coreMat);
      core.position.set(0, 0.22, 0);
      core.castShadow = true;
      this.boardGroup.add(core);
    }

    // 2. Head/Body (Subway Surfers character designs)
    const skinId = this.activeSkin.id;
    const jacketColor = new THREE.Color(this.activeSkin.color);
    
    // Core structural Materials
    const jakeRedMat = new THREE.MeshStandardMaterial({ color: '#ef4444', roughness: 0.5 }); // Jake red hoodie
    const jeanPantsMat = new THREE.MeshStandardMaterial({ color: '#1d4ed8', roughness: 0.6 }); // Jake blue jeans
    const trickyGrayMat = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.5 }); // Tricky slate tee
    const trickyGreenPants = new THREE.MeshStandardMaterial({ color: '#16a34a', roughness: 0.6 }); // Tricky green pants
    const freshGreenMat = new THREE.MeshStandardMaterial({ color: '#10b981', roughness: 0.4 }); // Fresh color windbreaker
    const freshPurplePants = new THREE.MeshStandardMaterial({ color: '#7c3aed', roughness: 0.6 }); // Fresh purple pants
    const yutaniGreenMat = new THREE.MeshStandardMaterial({ color: '#22c55e', roughness: 0.5 }); // Yutani lime mascot
    const princeGoldenMat = new THREE.MeshStandardMaterial({ color: '#fbbf24', metalness: 0.95, roughness: 0.05, emissive: '#d97706', emissiveIntensity: 0.25 }); // Prince K gold
    
    let bodyMat = jakeRedMat;
    let pantsMat = jeanPantsMat;
    let headColor = '#fbcfe8'; // Default fair flesh
    
    if (skinId === 'neon') {
      bodyMat = trickyGrayMat;
      pantsMat = trickyGreenPants;
    } else if (skinId === 'speedster') {
      bodyMat = freshGreenMat;
      pantsMat = freshPurplePants;
      headColor = '#78350f'; // Cool darker skin tone for Fresh
    } else if (skinId === 'yutani') {
      bodyMat = yutaniGreenMat;
      pantsMat = yutaniGreenMat;
      headColor = '#22c55e'; // Green mascot head
    } else if (skinId === 'golden') {
      bodyMat = princeGoldenMat;
      pantsMat = princeGoldenMat;
      headColor = '#fbbf24'; // Golden head for Prince K
    }

    // A. Character Body (Torso Mesh)
    const bodyGeometry = new THREE.BoxGeometry(0.8, 1.2, 0.6);
    const body = new THREE.Mesh(bodyGeometry, bodyMat);
    body.position.set(0, 1.0, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    this.characterGroup.add(body);

    // High-Fidelity Character Torso graphics & patterns
    if (skinId === 'urchin') {
      // Jake's white chest logo
      const stGeo = new THREE.BoxGeometry(0.35, 0.35, 0.04);
      const stMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
      const stencil = new THREE.Mesh(stGeo, stMat);
      stencil.position.set(0, 0.15, 0.31);
      body.add(stencil);

      const starGeo = new THREE.BoxGeometry(0.16, 0.16, 0.05);
      const starMat = new THREE.MeshBasicMaterial({ color: '#111827' });
      const star = new THREE.Mesh(starGeo, starMat);
      star.position.set(0, 0.15, 0.32);
      body.add(star);

      // Hoodie drawstring loops
      const stringGeo = new THREE.BoxGeometry(0.04, 0.28, 0.04);
      const tipGeo = new THREE.SphereGeometry(0.05, 5, 5);
      const yellowMat = new THREE.MeshStandardMaterial({ color: '#fbbf24', roughness: 0.1 });

      const stringL = new THREE.Mesh(stringGeo, yellowMat);
      stringL.position.set(-0.1, 0.45, 0.32);
      const tipL = new THREE.Mesh(tipGeo, yellowMat);
      tipL.position.set(-0.1, 0.3, 0.32);
      body.add(stringL);
      body.add(tipL);

      const stringR = stringL.clone();
      stringR.position.x = 0.1;
      const tipR = tipL.clone();
      tipR.position.x = 0.1;
      body.add(stringR);
      body.add(tipR);

    } else if (skinId === 'neon') {
      // Tricky's classic white suspenders / straps
      const strapGeo = new THREE.BoxGeometry(0.06, 1.22, 0.04);
      const strapMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7 });
      
      const strapL = new THREE.Mesh(strapGeo, strapMat);
      strapL.position.set(-0.2, 0, 0.31);
      const strapR = strapL.clone();
      strapR.position.x = 0.2;
      body.add(strapL);
      body.add(strapR);

      // Back suspender crossover
      const strapBackL = strapL.clone();
      strapBackL.position.z = -0.31;
      const strapBackR = strapR.clone();
      strapBackR.position.z = -0.31;
      body.add(strapBackL);
      body.add(strapBackR);

    } else if (skinId === 'speedster') {
      // Fresh's cool retro t-shirt paneling and gold necklace
      const panelGeo = new THREE.BoxGeometry(0.5, 0.7, 0.04);
      const pinkMat = new THREE.MeshStandardMaterial({ color: '#ec4899', roughness: 0.4 });
      const panel = new THREE.Mesh(panelGeo, pinkMat);
      panel.position.set(0, 0.05, 0.31);
      body.add(panel);

      const miniYellowGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.04, 8);
      const shinyGold = new THREE.MeshStandardMaterial({ color: '#fbbf24', metalness: 0.95 });
      const goldPendant = new THREE.Mesh(miniYellowGeo, shinyGold);
      goldPendant.position.set(0, 0.45, 0.32);
      body.add(goldPendant);

    } else if (skinId === 'yutani') {
      // Yutani alien cute round yellow target chest mark
      const badgeGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.04, 12);
      badgeGeo.rotateX(Math.PI / 2);
      const badgeMat = new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.6 });
      const circleBadge = new THREE.Mesh(badgeGeo, badgeMat);
      circleBadge.position.set(0, 0.05, 0.31);
      body.add(circleBadge);

      // Pink alien heart details inside center of badge
      const detailsInner = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.06), new THREE.MeshBasicMaterial({ color: '#ec4899' }));
      detailsInner.position.set(0, 0.05, 0.34);
      body.add(detailsInner);

    } else if (skinId === 'golden') {
      // Prince K black diamond tie and vest trim
      const tieGeo = new THREE.BoxGeometry(0.12, 0.5, 0.04);
      const tieMat = new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.2, metalness: 0.8 });
      const tie = new THREE.Mesh(tieGeo, tieMat);
      tie.position.set(0, 0.2, 0.31);
      tie.rotation.z = Math.PI / 4; // rotated like design diamond
      body.add(tie);
    }

    // B. Character Head Base
    const headMat = skinId === 'golden' ? princeGoldenMat : new THREE.MeshStandardMaterial({ color: headColor, roughness: 0.6 });
    const headGeo = new THREE.SphereGeometry(0.35, 12, 12);
    this.headMesh = new THREE.Mesh(headGeo, headMat);
    this.headMesh.position.set(0, 1.8, 0.05);
    this.headMesh.castShadow = true;
    this.headMesh.receiveShadow = true;
    this.characterGroup.add(this.headMesh);

    // Dynamic 3D Facial Outlines (Eyes, Eyebrows, Cute Nose, Smirking Mouth)
    const eyeWhiteGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });

    const pupilGeo = new THREE.SphereGeometry(0.03, 6, 6);
    const pupilMat = new THREE.MeshBasicMaterial({ color: '#111827' });

    const noseGeo = new THREE.ConeGeometry(0.04, 0.08, 5);
    const noseMat = new THREE.MeshStandardMaterial({ color: headColor, roughness: 0.8 });

    const mouthGeo = new THREE.BoxGeometry(0.12, 0.03, 0.03);
    const mouthMat = new THREE.MeshBasicMaterial({ color: '#be123c' }); // Dark pink cheeky smile

    if (skinId === 'urchin' || skinId === 'neon' || skinId === 'speedster') {
      // Left Eyeball
      const leftEyeWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
      leftEyeWhite.position.set(-0.11, 0.06, 0.28);
      leftEyeWhite.scale.set(1, 1.25, 0.5); // classic cartoon tall eyes
      this.headMesh.add(leftEyeWhite);

      // Left Pupil
      const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
      leftPupil.position.set(-0.11, 0.06, 0.315);
      this.headMesh.add(leftPupil);

      // Right Eyeball
      const rightEyeWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
      rightEyeWhite.position.set(0.11, 0.06, 0.28);
      rightEyeWhite.scale.set(1, 1.25, 0.5);
      this.headMesh.add(rightEyeWhite);

      // Right Pupil
      const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
      rightPupil.position.set(0.11, 0.06, 0.315);
      this.headMesh.add(rightPupil);

      // Nose
      const nose = new THREE.Mesh(noseGeo, noseMat);
      nose.position.set(0, -0.01, 0.32);
      nose.rotation.x = Math.PI / 2;
      this.headMesh.add(nose);

      // SMIRK MOUTH!
      const mouth = new THREE.Mesh(mouthGeo, mouthMat);
      mouth.position.set(0, -0.12, 0.29);
      mouth.rotation.z = -0.05; // stylish cheeky asymmetry
      this.headMesh.add(mouth);

      // Eyebrows
      const eyebrowGeo = new THREE.BoxGeometry(0.12, 0.035, 0.04);
      const browColor = skinId === 'neon' ? '#f59e0b' : '#1e293b'; // Blonde brow for Tricky, black for others
      const eyebrowMat = new THREE.MeshBasicMaterial({ color: browColor });

      const leftBrow = new THREE.Mesh(eyebrowGeo, eyebrowMat);
      leftBrow.position.set(-0.12, 0.16, 0.29);
      leftBrow.rotation.z = 0.12;
      this.headMesh.add(leftBrow);

      const rightBrow = new THREE.Mesh(eyebrowGeo, eyebrowMat);
      rightBrow.position.set(0.12, 0.16, 0.29);
      rightBrow.rotation.z = -0.12;
      this.headMesh.add(rightBrow);
    }

    // C. Special Character-Specific Hair, Beanies, Mascot attachments
    if (skinId === 'urchin') {
      // --- JAKE (Red hoodie & backwards blue/green cap) ---
      const hoodieGeo = new THREE.SphereGeometry(0.38, 12, 12);
      const hoodie = new THREE.Mesh(hoodieGeo, jakeRedMat);
      hoodie.position.set(0, 1.83, -0.05);
      hoodie.scale.set(1.05, 1.05, 1.05);
      this.characterGroup.add(hoodie);

      // Jake's spiky brown hair locks peaking out from front cap rim onto the forehead
      const hairLockGeo = new THREE.ConeGeometry(0.06, 0.22, 4);
      const hairLockMat = new THREE.MeshStandardMaterial({ color: '#451a03', roughness: 0.8 }); // Dark wood brown
      
      for (const offset of [-0.14, -0.04, 0.08, 0.15]) {
        const lock = new THREE.Mesh(hairLockGeo, hairLockMat);
        lock.position.set(offset, 0.23, 0.23);
        lock.rotation.x = 0.45;
        lock.rotation.z = (offset + 0.05) * -0.55;
        this.headMesh.add(lock);
      }

      // Backwards Cap
      const capMat = new THREE.MeshStandardMaterial({ color: '#2563eb', roughness: 0.5 });
      const capGeo = new THREE.SphereGeometry(0.36, 10, 10, 0, Math.PI * 2, 0, Math.PI / 2);
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.set(0, 1.88, 0.05);
      cap.rotation.x = -Math.PI / 8; // Tilted backwards
      this.characterGroup.add(cap);

      const brimGeo = new THREE.BoxGeometry(0.5, 0.04, 0.35);
      const brim = new THREE.Mesh(brimGeo, capMat);
      brim.position.set(0, 1.88, -0.32); // Backwards brim!
      brim.rotation.x = Math.PI / 10;
      this.characterGroup.add(brim);

    } else if (skinId === 'neon') {
      // --- TRICKY (Red Beanie, blonde side hair) ---
      const hairMat = new THREE.MeshStandardMaterial({ color: '#fef08a', roughness: 0.7 }); // Blonde

      // Tricky's blonde side-bangs overlay across her forehead
      const bangGeo = new THREE.ConeGeometry(0.07, 0.24, 4);
      for (const offset of [-0.15, -0.06, 0.04, 0.12]) {
        const bang = new THREE.Mesh(bangGeo, hairMat);
        bang.position.set(offset, 0.24, 0.24);
        bang.rotation.x = 0.4;
        bang.rotation.z = offset * -0.75;
        this.headMesh.add(bang);
      }
      
      // Left side hair bunch
      const hairLGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.5, 6);
      const hairL = new THREE.Mesh(hairLGeo, hairMat);
      hairL.position.set(-0.35, 1.7, 0.1);
      hairL.rotation.z = Math.PI / 12;
      this.characterGroup.add(hairL);

      // Right side hair bunch
      const hairR = hairL.clone();
      hairR.position.x = 0.35;
      hairR.rotation.z = -Math.PI / 12;
      this.characterGroup.add(hairR);

      // Trademark Red Beanie
      const beanieMat = new THREE.MeshStandardMaterial({ color: '#ef4444', roughness: 0.6 });
      const beanieGeo = new THREE.CylinderGeometry(0.3, 0.34, 0.3, 10);
      const beanie = new THREE.Mesh(beanieGeo, beanieMat);
      beanie.position.set(0, 2.05, 0.05);
      beanie.rotation.x = -Math.PI / 12;
      this.characterGroup.add(beanie);

      // Beanie top puff
      const puffGeo = new THREE.SphereGeometry(0.1, 8, 8);
      const puff = new THREE.Mesh(puffGeo, beanieMat);
      puff.position.set(0, 2.22, 0.01);
      this.characterGroup.add(puff);

    } else if (skinId === 'speedster') {
      // --- FRESH (Retro high-top tall box fade hair, green tracker body) ---
      const boxHairMat = new THREE.MeshStandardMaterial({ color: '#172554', roughness: 0.9 }); // Dark blue-black hair
      const hairGeo = new THREE.BoxGeometry(0.42, 0.45, 0.42);
      const highTop = new THREE.Mesh(hairGeo, boxHairMat);
      highTop.position.set(0, 2.15, 0.05);
      this.characterGroup.add(highTop);

      // Retro pink collar trim
      const collarGeo = new THREE.BoxGeometry(0.7, 0.12, 0.52);
      const collarMat = new THREE.MeshStandardMaterial({ color: '#ec4899', roughness: 0.4 });
      const collar = new THREE.Mesh(collarGeo, collarMat);
      collar.position.set(0, 1.48, 0.0);
      this.characterGroup.add(collar);

    } else if (skinId === 'yutani') {
      // --- YUTANI (Lime-green 3-Eyed Alien Costume) ---
      // Mascot big hood
      const hoodGeo = new THREE.SphereGeometry(0.45, 12, 12);
      const hood = new THREE.Mesh(hoodGeo, yutaniGreenMat);
      hood.position.set(0, 1.84, 0.05);
      hood.scale.set(1.1, 1.1, 1.1);
      this.characterGroup.add(hood);

      // 3 Custom Alien Eyes (One middle-left, one center, one middle-right)
      const eyeGeo = new THREE.SphereGeometry(0.08, 8, 8);
      const irisGeo = new THREE.SphereGeometry(0.04, 4, 4);
      const eyeMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
      const irisMat = new THREE.MeshBasicMaterial({ color: '#000000' });

      for (let offset of [-0.15, 0, 0.15]) {
        const eyeMesh = new THREE.Mesh(eyeGeo, eyeMat);
        eyeMesh.position.set(offset, 2.05, 0.35 - Math.abs(offset) * 0.1);
        const irisMesh = new THREE.Mesh(irisGeo, irisMat);
        irisMesh.position.set(offset, 2.06, 0.42 - Math.abs(offset) * 0.1);
        this.characterGroup.add(eyeMesh);
        this.characterGroup.add(irisMesh);
      }

      // Wiggle antennas (two tubes with pink sphere tops)
      const antMat = new THREE.MeshStandardMaterial({ color: '#ec4899', roughness: 0.2 }); // Antenna pink
      for (let sideX of [-0.18, 0.18]) {
        const antPoleGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6);
        const antPole = new THREE.Mesh(antPoleGeo, yutaniGreenMat);
        antPole.position.set(sideX, 2.34, 0.05);
        antPole.rotation.z = sideX * -1.2;
        this.characterGroup.add(antPole);

        const antSphereGeo = new THREE.SphereGeometry(0.08, 6, 6);
        const antSphere = new THREE.Mesh(antSphereGeo, antMat);
        antSphere.position.set(sideX * 1.6, 2.52, 0.05);
        this.characterGroup.add(antSphere);
      }

    } else if (skinId === 'golden') {
      // --- PRINCE K (Shiny Imperial Gold + Sunglasses) ---
      // Cool rectangular luxury shades sunglasses
      const glassMat = new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.1, metalness: 0.9 });
      const glassGeo = new THREE.BoxGeometry(0.55, 0.12, 0.12);
      const glasses = new THREE.Mesh(glassGeo, glassMat);
      glasses.position.set(0, 1.88, 0.35);
      this.characterGroup.add(glasses);

      // Gold chain around neck
      const chainGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.08, 12, 1, true);
      const chain = new THREE.Mesh(chainGeo, princeGoldenMat);
      chain.position.set(0, 1.44, 0);
      chain.rotation.x = Math.PI / 10;
      this.characterGroup.add(chain);
    }

    // D. Handles extra Headwear customizations selected via the menu (Adds on top!)
    if (this.activeHeadwear === 'cap' && skinId !== 'urchin') {
      const visorGeo = new THREE.BoxGeometry(0.5, 0.08, 0.4);
      const visorMat = new THREE.MeshStandardMaterial({ color: '#f87171' }); // Street cap color
      const visor = new THREE.Mesh(visorGeo, visorMat);
      visor.position.set(0, 1.95, 0.25);
      visor.castShadow = true;
      this.characterGroup.add(visor);
    } else if (this.activeHeadwear === 'bandana') {
      const bandanaGeo = new THREE.BoxGeometry(0.76, 0.15, 0.76);
      const bandanaMat = new THREE.MeshStandardMaterial({ color: '#a78bfa', roughness: 0.8 });
      const bandana = new THREE.Mesh(bandanaGeo, bandanaMat);
      bandana.position.set(0, 1.88, 0.05);
      bandana.castShadow = true;
      this.characterGroup.add(bandana);
    } else if (this.activeHeadwear === 'headphones' && skinId !== 'golden') {
      const headphoneMat = new THREE.MeshStandardMaterial({ color: '#22d3ee', roughness: 0.2, metalness: 0.4 });
      
      const leftCupGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.12, 8);
      const leftCup = new THREE.Mesh(leftCupGeo, headphoneMat);
      leftCup.rotation.z = Math.PI / 2;
      leftCup.position.set(-0.38, 1.8, 0.05);
      leftCup.castShadow = true;
      this.characterGroup.add(leftCup);

      const rightCupGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.12, 8);
      const rightCup = new THREE.Mesh(rightCupGeo, headphoneMat);
      rightCup.rotation.z = Math.PI / 2;
      rightCup.position.set(0.38, 1.8, 0.05);
      rightCup.castShadow = true;
      this.characterGroup.add(rightCup);

      const archGeo = new THREE.BoxGeometry(0.78, 0.06, 0.15);
      const arch = new THREE.Mesh(archGeo, headphoneMat);
      arch.position.set(0, 2.15, 0.05);
      arch.castShadow = true;
      this.characterGroup.add(arch);
    } else if (this.activeHeadwear === 'crown' && skinId !== 'golden') {
      const crownMat = new THREE.MeshStandardMaterial({ color: '#fbbf24', metalness: 0.9, roughness: 0.1 });
      const ringGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.1, 10);
      const ring = new THREE.Mesh(ringGeo, crownMat);
      ring.position.set(0, 2.18, 0.05);
      ring.castShadow = true;
      this.characterGroup.add(ring);

      for (let angle = 0; angle < Math.PI * 2; angle += (Math.PI * 2 / 5)) {
        const coneGeo = new THREE.ConeGeometry(0.06, 0.18, 5);
        const cone = new THREE.Mesh(coneGeo, crownMat);
        const radius = 0.23;
        cone.position.set(Math.cos(angle) * radius, 2.29, 0.05 + Math.sin(angle) * radius);
        cone.rotation.y = angle;
        cone.castShadow = true;
        this.characterGroup.add(cone);
      }
    }

    // E. Legs with pivots for athletic running animation
    const individualLegGeo = new THREE.CylinderGeometry(0.12, 0.11, 0.7, 8);
    individualLegGeo.translate(0, -0.35, 0); // shift origin of geometry to hip joint

    this.leftLegMesh = new THREE.Mesh(individualLegGeo, pantsMat);
    this.leftLegMesh.position.set(-0.24, 0.8, 0); // hips height
    this.leftLegMesh.castShadow = true;
    this.leftLegMesh.receiveShadow = true;
    this.characterGroup.add(this.leftLegMesh);

    this.rightLegMesh = new THREE.Mesh(individualLegGeo, pantsMat);
    this.rightLegMesh.position.set(0.24, 0.8, 0); // hips height
    this.rightLegMesh.castShadow = true;
    this.rightLegMesh.receiveShadow = true;
    this.characterGroup.add(this.rightLegMesh);

    // Style sneakers and add to lower legs
    let shoeColor = '#ef4444'; // Jake red
    let shoeTrimColor = '#ffffff';
    if (skinId === 'neon') {
      shoeColor = '#06b6d4'; // Tricky cyan
      shoeTrimColor = '#ffffff';
    } else if (skinId === 'speedster') {
      shoeColor = '#eab308'; // Fresh yellow
      shoeTrimColor = '#7c3aed';
    } else if (skinId === 'yutani') {
      shoeColor = '#22c55e'; // Mascot claws
      shoeTrimColor = '#ec4899';
    } else if (skinId === 'golden') {
      shoeColor = '#fbbf24'; // Golden shoes
      shoeTrimColor = '#d97706';
    }

    const sneakerGeo = new THREE.BoxGeometry(0.18, 0.14, 0.35);
    const sneakerMat = new THREE.MeshStandardMaterial({ color: shoeColor, roughness: 0.5 });
    const sneakerSoleGeo = new THREE.BoxGeometry(0.20, 0.05, 0.37);
    const sneakerSoleMat = new THREE.MeshStandardMaterial({ color: shoeTrimColor, roughness: 0.2 });

    const leftShoe = new THREE.Mesh(sneakerGeo, sneakerMat);
    leftShoe.position.set(0, -0.7, 0.08);
    leftShoe.castShadow = true;
    const leftSole = new THREE.Mesh(sneakerSoleGeo, sneakerSoleMat);
    leftSole.position.set(0, -0.77, 0.08);
    leftSole.castShadow = true;
    this.leftLegMesh.add(leftShoe);
    this.leftLegMesh.add(leftSole);

    const rightShoe = new THREE.Mesh(sneakerGeo, sneakerMat);
    rightShoe.position.set(0, -0.7, 0.08);
    rightShoe.castShadow = true;
    const rightSole = new THREE.Mesh(sneakerSoleGeo, sneakerSoleMat);
    rightSole.position.set(0, -0.77, 0.08);
    rightSole.castShadow = true;
    this.rightLegMesh.add(rightShoe);
    this.rightLegMesh.add(rightSole);

    // F. Arms with pivots for athletic runner swing motion (Dual-joint bent elbow configuration)
    const upperArmGeo = new THREE.CylinderGeometry(0.09, 0.085, 0.34, 8);
    upperArmGeo.translate(0, -0.17, 0); // shift origin to shoulder

    const forearmGeo = new THREE.CylinderGeometry(0.085, 0.076, 0.32, 8);
    forearmGeo.translate(0, -0.16, 0); // shift origin to elbow

    const armJacketMat = bodyMat; // Match character's main jacket/outfit material
    const skinColorMat = new THREE.MeshStandardMaterial({ color: headColor, roughness: 0.6 });

    // Left Arm Setup
    this.leftArmMesh = new THREE.Mesh(upperArmGeo, armJacketMat);
    this.leftArmMesh.position.set(-0.48, 1.45, 0); // shoulder placement
    this.leftArmMesh.castShadow = true;
    this.leftArmMesh.receiveShadow = true;

    // Left Forearm joint
    const leftForearm = new THREE.Mesh(forearmGeo, armJacketMat);
    leftForearm.position.set(0, -0.34, 0);
    leftForearm.rotation.x = -Math.PI / 2.2; // 80 degree organic bent elbow
    leftForearm.castShadow = true;
    leftForearm.receiveShadow = true;
    this.leftArmMesh.add(leftForearm);

    // Left hand fist
    const handGeo = new THREE.SphereGeometry(0.09, 6, 6);
    const leftHand = new THREE.Mesh(handGeo, skinColorMat);
    leftHand.position.set(0, -0.32, 0); // attached at the end of forearm
    leftHand.castShadow = true;
    leftForearm.add(leftHand);

    this.characterGroup.add(this.leftArmMesh);

    // Right Arm Setup
    this.rightArmMesh = new THREE.Mesh(upperArmGeo, armJacketMat);
    this.rightArmMesh.position.set(0.48, 1.45, 0); // shoulder placement
    this.rightArmMesh.castShadow = true;
    this.rightArmMesh.receiveShadow = true;

    // Right Forearm joint
    const rightForearm = new THREE.Mesh(forearmGeo, armJacketMat);
    rightForearm.position.set(0, -0.34, 0);
    rightForearm.rotation.x = -Math.PI / 2.2; // 80 degree organic bent elbow
    rightForearm.castShadow = true;
    rightForearm.receiveShadow = true;
    this.rightArmMesh.add(rightForearm);

    // Right hand fist
    const rightHand = new THREE.Mesh(handGeo, skinColorMat);
    rightHand.position.set(0, -0.32, 0); // attached at the end of forearm
    rightHand.castShadow = true;
    rightForearm.add(rightHand);

    this.characterGroup.add(this.rightArmMesh);

    // G. GRAFFITI BACKPACK & SPRAY CAN
    const backpackGroup = new THREE.Group();
    backpackGroup.position.set(0, 1.05, -0.35); // exactly on back of player torso

    let bagColor = '#f97316'; // orange Jake backpack
    let strapsColor = '#1e293b'; // slate straps

    if (skinId === 'neon') {
      bagColor = '#22c55e'; // Green Tricky pack
    } else if (skinId === 'speedster') {
      bagColor = '#ec4899'; // Pink Fresh pack
    } else if (skinId === 'yutani') {
      bagColor = '#a855f7'; // Purple alien backpack
    } else if (skinId === 'golden') {
      bagColor = '#fbbf24'; // Golden imperial treasury backpack
    }

    const backpackGeo = new THREE.BoxGeometry(0.42, 0.6, 0.22);
    const backpackMat = new THREE.MeshStandardMaterial({ color: bagColor, roughness: 0.65 });
    const backpack = new THREE.Mesh(backpackGeo, backpackMat);
    backpack.castShadow = true;
    backpackGroup.add(backpack);

    // Shoulder straps
    const strapGeo = new THREE.BoxGeometry(0.06, 0.65, 0.3);
    const strapMat = new THREE.MeshStandardMaterial({ color: strapsColor, roughness: 0.8 });
    const strapL = new THREE.Mesh(strapGeo, strapMat);
    strapL.position.set(-0.18, 0.05, 0.1);
    const strapR = strapL.clone();
    strapR.position.x = 0.18;
    backpackGroup.add(strapL);
    backpackGroup.add(strapR);

    // Spray paint can
    const canGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.3, 10);
    const canMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', metalness: 0.85, roughness: 0.15 });
    const nozzleMat = new THREE.MeshBasicMaterial({ color: '#f43f5e' }); // glowing red/pink spray cap

    const sprayCan = new THREE.Mesh(canGeo, canMat);
    sprayCan.position.set(0.22, -0.08, 0.05);
    sprayCan.rotation.z = Math.PI / 15;
    sprayCan.castShadow = true;
    backpackGroup.add(sprayCan);

    // Can cap
    const capGeoBox = new THREE.CylinderGeometry(0.045, 0.045, 0.07, 10);
    const sprayCap = new THREE.Mesh(capGeoBox, nozzleMat);
    sprayCap.position.set(0, 0.18, 0);
    sprayCan.add(sprayCap);

    this.characterGroup.add(backpackGroup);
  }

  // Set up the police officer and bulldog chase meshes and textures
  private setupGuardAndDog() {
    this.guardGroup = new THREE.Group();
    this.guardGroup.name = 'guard_group';
    this.scene.add(this.guardGroup);

    // 1. Guard Torso (Big, stocky forest green-coat security guard torso box)
    const gBodyGeo = new THREE.BoxGeometry(0.95, 1.15, 0.75);
    const gBodyMat = new THREE.MeshStandardMaterial({ color: '#115e59', roughness: 0.55 }); // deep teal/green
    const gBody = new THREE.Mesh(gBodyGeo, gBodyMat);
    gBody.position.y = 0.95;
    gBody.castShadow = true;
    gBody.receiveShadow = true;
    this.guardGroup.add(gBody);

    // Gold zippers and badges
    const badgeGeo = new THREE.BoxGeometry(0.12, 0.12, 0.05);
    const goldMat = new THREE.MeshStandardMaterial({ color: '#fbbf24', metalness: 0.9, roughness: 0.1 });
    const badge = new THREE.Mesh(badgeGeo, goldMat);
    badge.position.set(0.22, 0.3, 0.39);
    gBody.add(badge);

    const zipGeo = new THREE.BoxGeometry(0.04, 0.85, 0.04);
    const zipper = new THREE.Mesh(zipGeo, goldMat);
    zipper.position.set(0, 0, 0.39);
    gBody.add(zipper);

    // Red warning accent (Cop warning belt/details)
    const beltGeo = new THREE.BoxGeometry(0.97, 0.12, 0.77);
    const beltMat = new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.5 }); // police red indicator
    const belt = new THREE.Mesh(beltGeo, beltMat);
    belt.position.y = -0.42;
    gBody.add(belt);

    // 2. Guard Head
    const gHeadGeo = new THREE.SphereGeometry(0.35, 12, 12);
    const gHeadMat = new THREE.MeshStandardMaterial({ color: '#fed7aa', roughness: 0.7 }); // tanned skin
    const gHead = new THREE.Mesh(gHeadGeo, gHeadMat);
    gHead.position.set(0, 1.62, 0.04);
    gHead.castShadow = true;
    this.guardGroup.add(gHead);

    // Angry low-poly eyebrows & big mustache (representing the Subway Surfers Cop!)
    const browGeo = new THREE.BoxGeometry(0.14, 0.04, 0.04);
    const hairMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.85 });
    
    const browL = new THREE.Mesh(browGeo, hairMat);
    browL.position.set(-0.14, 0.08, 0.31);
    browL.rotation.z = -0.16;
    gHead.add(browL);

    const browR = browL.clone();
    browR.position.x = 0.14;
    browR.rotation.z = 0.16;
    gHead.add(browR);

    const mustacheGeo = new THREE.BoxGeometry(0.28, 0.08, 0.05);
    const mustache = new THREE.Mesh(mustacheGeo, hairMat);
    mustache.position.set(0, -0.14, 0.32);
    gHead.add(mustache);

    // Police Cap
    const capGeo = new THREE.BoxGeometry(0.5, 0.12, 0.5);
    const capMat = new THREE.MeshStandardMaterial({ color: '#115e59', roughness: 0.5 });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.set(0, 0.32, 0);
    gHead.add(cap);

    const visorGeo = new THREE.BoxGeometry(0.46, 0.04, 0.16);
    const visorMat = new THREE.MeshStandardMaterial({ color: '#090d16', roughness: 0.1 });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 0.25, 0.2);
    visor.rotation.x = 0.12;
    gHead.add(visor);

    const capGoldBadge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.04), goldMat);
    capGoldBadge.position.set(0, 0.32, 0.26);
    gHead.add(capGoldBadge);

    // 3. Guard Legs
    const gLegGeo = new THREE.BoxGeometry(0.22, 0.62, 0.22);
    const gLegMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.8 }); // navy security pants
    
    this.guardLeftLeg = new THREE.Mesh(gLegGeo, gLegMat);
    this.guardLeftLeg.position.set(-0.23, 0.3, 0);
    this.guardLeftLeg.castShadow = true;
    this.guardGroup.add(this.guardLeftLeg);

    this.guardRightLeg = new THREE.Mesh(gLegGeo, gLegMat);
    this.guardRightLeg.position.set(0.23, 0.3, 0);
    this.guardRightLeg.castShadow = true;
    this.guardGroup.add(this.guardRightLeg);

    // Heavy black tactical officer boots
    const bootGeo = new THREE.BoxGeometry(0.24, 0.14, 0.35);
    const bootMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.45 });
    const bootL = new THREE.Mesh(bootGeo, bootMat);
    bootL.position.set(0, -0.28, 0.05);
    this.guardLeftLeg.add(bootL);
    const bootR = bootL.clone();
    this.guardRightLeg.add(bootR);

    // 4. Guard Arms
    const gArmGeo = new THREE.BoxGeometry(0.18, 0.58, 0.18);
    const gArmMat = new THREE.MeshStandardMaterial({ color: '#115e59', roughness: 0.55 });

    this.guardLeftArm = new THREE.Mesh(gArmGeo, gArmMat);
    this.guardLeftArm.position.set(-0.58, 0.85, 0);
    this.guardLeftArm.castShadow = true;
    this.guardGroup.add(this.guardLeftArm);

    this.guardRightArm = new THREE.Mesh(gArmGeo, gArmMat);
    this.guardRightArm.position.set(0.58, 0.85, 0);
    this.guardRightArm.castShadow = true;
    this.guardGroup.add(this.guardRightArm);

    // Glowing Neon Traffic Baton in officer's right hand!
    const batonUnit = new THREE.Group();
    batonUnit.position.set(0, -0.26, 0);
    const handleGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.18, 8);
    const handleMat = new THREE.MeshStandardMaterial({ color: '#090d16', metalness: 0.6 });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    batonUnit.add(handle);

    // Red-orange luminescent warning cylinder
    const neonBatonGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.5, 8);
    const neonBatonMat = new THREE.MeshStandardMaterial({ color: '#ef4444', emissive: '#ef4444', emissiveIntensity: 1.6 });
    const neonBaton = new THREE.Mesh(neonBatonGeo, neonBatonMat);
    neonBaton.position.y = 0.32;
    batonUnit.add(neonBaton);
    this.guardRightArm.add(batonUnit);
    
    this.guardGroup.position.set(0, 0, 15);
    this.guardGroup.rotation.y = Math.PI; // Face forward down the tracks
    this.guardGroup.scale.set(1.15, 1.15, 1.15);


    // --- 5. BULLDOG COMPANION MODEL ---
    this.dogGroup = new THREE.Group();
    this.dogGroup.name = 'dog_group';
    this.scene.add(this.dogGroup);

    // Dog Body
    const dBodyGeo = new THREE.BoxGeometry(0.46, 0.38, 0.7);
    const dBodyMat = new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.8 }); // slate bulldogs coat
    const dTorso = new THREE.Mesh(dBodyGeo, dBodyMat);
    dTorso.position.y = 0.35;
    dTorso.castShadow = true;
    dTorso.receiveShadow = true;
    this.dogGroup.add(dTorso);

    // Dog Head
    const dHeadGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
    const dHead = new THREE.Mesh(dHeadGeo, dBodyMat);
    dHead.position.set(0, 0.56, -0.3);
    dHead.castShadow = true;
    this.dogGroup.add(dHead);

    // Bulldog floppy black ears
    const earGeo = new THREE.BoxGeometry(0.08, 0.18, 0.08);
    const earMat = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.85 });
    const earL = new THREE.Mesh(earGeo, earMat);
    earL.position.set(-0.16, 0.08, 0.05);
    dHead.add(earL);
    const earR = earL.clone();
    earR.position.x = 0.16;
    dHead.add(earR);

    // Muzzle and snout
    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.1), new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.9 }));
    muzzle.position.set(0, -0.06, -0.2);
    dHead.add(muzzle);

    // Red Collar
    const collarGeo = new THREE.BoxGeometry(0.4, 0.06, 0.4);
    const collarMat = new THREE.MeshStandardMaterial({ color: '#ea580c', roughness: 0.5 }); // hazard orange collar
    const collar = new THREE.Mesh(collarGeo, collarMat);
    collar.position.set(0, 0.32, -0.2);
    this.dogGroup.add(collar);

    // Little silver collar tags
    const tag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), goldMat);
    tag.position.set(0, 0.32, -0.32);
    this.dogGroup.add(tag);

    // Four little cylindrical stubby legs
    const dLegGeo = new THREE.BoxGeometry(0.12, 0.22, 0.12);
    const dLegMat = new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.8 });
    
    this.dogLeftFrontLeg = new THREE.Mesh(dLegGeo, dLegMat);
    this.dogLeftFrontLeg.position.set(-0.16, 0.11, -0.2);
    this.dogLeftFrontLeg.castShadow = true;
    this.dogGroup.add(this.dogLeftFrontLeg);

    this.dogRightFrontLeg = new THREE.Mesh(dLegGeo, dLegMat);
    this.dogRightFrontLeg.position.set(0.16, 0.11, -0.2);
    this.dogRightFrontLeg.castShadow = true;
    this.dogGroup.add(this.dogRightFrontLeg);

    this.dogLeftBackLeg = new THREE.Mesh(dLegGeo, dLegMat);
    this.dogLeftBackLeg.position.set(-0.16, 0.11, 0.2);
    this.dogLeftBackLeg.castShadow = true;
    this.dogGroup.add(this.dogLeftBackLeg);

    this.dogRightBackLeg = new THREE.Mesh(dLegGeo, dLegMat);
    this.dogRightBackLeg.position.set(0.16, 0.11, 0.2);
    this.dogRightBackLeg.castShadow = true;
    this.dogGroup.add(this.dogRightBackLeg);

    this.dogGroup.position.set(0, 0, 15);
  }

  // Setup particle geometry for coin pick up bursts
  private setupParticles() {
    this.particleGeometry = new THREE.BufferGeometry();
    const count = 800;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count * 3; i++) {
       positions[i] = 0;
       colors[i] = 1.0;
    }

    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.35,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      sizeAttenuation: true,
      depthWrite: false,
    });

    this.particlePoints = new THREE.Points(this.particleGeometry, material);
    this.scene.add(this.particlePoints);
  }

  // Tripping particle burst explosion (standard coin pick up flares)
  private triggerCoinCelebration(x: number, y: number, z: number, colorHex: string = '#fbbf24') {
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const speed = Math.random() * 4 + 3;
      this.particles.push({
        x,
        y,
        z,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + 3, // slightly upward
        vz: (Math.random() - 0.5) * 3,
        color: colorHex,
        size: Math.random() * 0.4 + 0.15,
        life: 0.8 + Math.random() * 0.4,
        maxLife: 1.2,
        type: 'coin',
        drag: 0.85,
        gravity: 8
      });
    }
  }

  // Debris and heavy smoke explosion when crashing or smashing barriers
  private triggerObstacleExplosion(x: number, y: number, z: number, colorHex: string = '#ef4444') {
    // 1. Heavy physical debris shards (fiery yellow/orange/red)
    const debrisColors = [colorHex, '#f97316', '#ff0000', '#fbbf24'];
    for (let i = 0; i < 25; i++) {
      const col = debrisColors[Math.floor(Math.random() * debrisColors.length)];
      this.particles.push({
        x: x + (Math.random() - 0.5) * 1.5,
        y: y + (Math.random() - 0.5) * 1.0,
        z: z + (Math.random() - 0.5) * 1.5,
        vx: (Math.random() - 0.5) * 20,
        vy: (Math.random() * 14) + 6,
        vz: (Math.random() - 0.5) * 15 - 5, // blast forward/backward
        color: col,
        size: Math.random() * 0.5 + 0.25,
        life: 0.7 + Math.random() * 0.5,
        maxLife: 1.2,
        type: 'spark',
        drag: 0.94,
        gravity: 28
      });
    }

    // 2. Thick expanding grey ash-slomo smoke clouds (rises slowly, floats back)
    for (let i = 0; i < 20; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 1.2,
        y: y + (Math.random() - 0.5) * 0.6,
        z: z + (Math.random() - 0.5) * 1.0,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() * 4) + 2,
        vz: (Math.random() - 0.5) * 4,
        color: '#475569', // Slate-600 grey color, which will fade properly
        size: Math.random() * 0.6 + 0.3,
        life: 1.2 + Math.random() * 0.8,
        maxLife: 2.0,
        type: 'smoke',
        drag: 0.82
      });
    }
  }

  // Beautiful glass-shaking bubble collapse sparks
  private triggerShieldBreakBurst(x: number, y: number, z: number) {
    const bubbleColors = ['#06b6d4', '#22d3ee', '#38bdf8', '#e0f2fe', '#ffffff'];
    for (let i = 0; i < 35; i++) {
      const col = bubbleColors[Math.floor(Math.random() * bubbleColors.length)];
      const velocityScale = 14;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 1.0,
        y: y + 1.0 + (Math.random() - 0.5) * 1.0,
        z: z + (Math.random() - 0.5) * 1.0,
        vx: (Math.random() - 0.5) * velocityScale,
        vy: (Math.random() - 0.5) * velocityScale,
        vz: (Math.random() - 0.5) * velocityScale,
        color: col,
        size: Math.random() * 0.35 + 0.15,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1.0,
        type: 'bubble',
        drag: 0.88,
        gravity: -2 // Slow anti-gravity float
      });
    }
  }

  // Particle emissions representing fiery rocket booster thrusts
  private triggerSuperBoostFireworks(x: number, y: number, z: number) {
    const fireColors = ['#ff4500', '#ff8c00', '#ffd700', '#ffffff'];
    for (let i = 0; i < 4; i++) {
      const col = fireColors[Math.floor(Math.random() * fireColors.length)];
      this.particles.push({
        x: x + (Math.random() - 0.5) * 0.4,
        y: y + 0.1,
        z: z + 0.5,
        vx: (Math.random() - 0.5) * 3,
        vy: -2 - (Math.random() * 5), // rapid downward
        vz: -20 - (Math.random() * 15), // shoot backwards at extremely high speed
        color: col,
        size: Math.random() * 0.4 + 0.15,
        life: 0.3 + Math.random() * 0.3,
        maxLife: 0.6,
        type: 'spark',
        drag: 0.96,
        gravity: 5
      });
    }
  }

  // Pre-fill track chunks
  private fillStartingScene() {
    while (this.sceneryMeshes.length < 15) {
      this.spawnSceneryChunk();
    }
    while (this.obstacleMeshes.length < 5) {
      this.spawnObstacleChunk();
    }
    while (this.coinMeshes.length < 15) {
      this.spawnCoinChunk();
    }
  }

  // Haptic feedback Vibration API (Triggers on critical gameplay events)
  private triggerHaptic(type: 'coin' | 'powerup' | 'crash' | 'jump') {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        switch (type) {
          case 'coin':
            // Subtle, short 25ms pulse for coins
            navigator.vibrate(25);
            break;
          case 'jump':
            // Fast light 15ms pulse
            navigator.vibrate(15);
            break;
          case 'powerup':
            // Energetic dual pulse pattern [30ms on, 40ms off, 30ms on]
            navigator.vibrate([30, 40, 30]);
            break;
          case 'crash':
            // Stronger 200ms explosion vibration
            navigator.vibrate(200);
            break;
        }
      } catch (err) {
        // Suppress errors securely (e.g. if blocked by browser iframe guidelines or security settings)
      }
    }
  }

  // Custom audio generator synthesizer for retro console noises
  private playSynthesizedSound(type: 'coin' | 'powerup' | 'crash' | 'jump' | 'siren' | 'bark' | 'scrape') {
    // 1. Always trigger haptic vibration if supported (even if sound is muted)
    if (type !== 'siren' && type !== 'bark' && type !== 'scrape') {
      this.triggerHaptic(type);
    }

    // 2. Return early if sounds are muted
    if (!this.soundEnabled) {
      return;
    }

    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = this.audioCtx;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      const volumeFactor = Math.max(0, Math.min(1, this.soundVolume / 100));

      if (type === 'siren') {
        // High-low police siren sweep sound
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainSiren = ctx.createGain();

        osc1.type = 'triangle';
        osc2.type = 'sine';

        osc1.frequency.setValueAtTime(650, now);
        osc1.frequency.linearRampToValueAtTime(850, now + 0.25);
        osc1.frequency.linearRampToValueAtTime(650, now + 0.5);

        osc2.frequency.setValueAtTime(650, now);
        osc2.frequency.linearRampToValueAtTime(450, now + 0.25);
        osc2.frequency.linearRampToValueAtTime(650, now + 0.5);

        gainSiren.gain.setValueAtTime(0.06 * volumeFactor, now);
        gainSiren.gain.linearRampToValueAtTime(0.001 * volumeFactor, now + 0.5);

        osc1.connect(gainSiren);
        osc2.connect(gainSiren);
        gainSiren.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.5);
        osc2.stop(now + 0.5);
        return;
      }

      if (type === 'bark') {
        // A bulldog dog brief bark "ruff! ruff!"
        const oscDog = ctx.createOscillator();
        const gainDog = ctx.createGain();

        oscDog.type = 'sawtooth';
        oscDog.frequency.setValueAtTime(120, now);
        oscDog.frequency.exponentialRampToValueAtTime(50, now + 0.12);

        gainDog.gain.setValueAtTime(0.12 * volumeFactor, now);
        gainDog.gain.exponentialRampToValueAtTime(0.001 * volumeFactor, now + 0.12);

        // Second bark slightly delayed
        const oscDog2 = ctx.createOscillator();
        const gainDog2 = ctx.createGain();
        oscDog2.type = 'sawtooth';
        oscDog2.frequency.setValueAtTime(110, now + 0.15);
        oscDog2.frequency.exponentialRampToValueAtTime(50, now + 0.27);
        gainDog2.gain.setValueAtTime(0.1 * volumeFactor, now + 0.15);
        gainDog2.gain.exponentialRampToValueAtTime(0.001 * volumeFactor, now + 0.27);

        oscDog.connect(gainDog);
        gainDog.connect(ctx.destination);
        oscDog2.connect(gainDog2);
        gainDog2.connect(ctx.destination);

        oscDog.start(now);
        oscDog.stop(now + 0.12);
        oscDog2.start(now + 0.15);
        oscDog2.stop(now + 0.27);
        return;
      }

      if (type === 'scrape') {
        const oscScrape = ctx.createOscillator();
        const gainScrape = ctx.createGain();
        oscScrape.type = 'triangle';
        oscScrape.frequency.setValueAtTime(280 + Math.random() * 80, now);
        oscScrape.frequency.linearRampToValueAtTime(80 + Math.random() * 50, now + 0.08);

        gainScrape.gain.setValueAtTime(0.04 * volumeFactor, now);
        gainScrape.gain.linearRampToValueAtTime(0.001 * volumeFactor, now + 0.08);

        oscScrape.connect(gainScrape);
        gainScrape.connect(ctx.destination);
        oscScrape.start(now);
        oscScrape.stop(now + 0.08);
        return;
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'coin') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.1); // D6
        gain.gain.setValueAtTime(0.12 * volumeFactor, now);
        gain.gain.linearRampToValueAtTime(0.01 * volumeFactor, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'jump') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.15);
        gain.gain.setValueAtTime(0.15 * volumeFactor, now);
        gain.gain.linearRampToValueAtTime(0.01 * volumeFactor, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
      } else if (type === 'powerup') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(261.63, now); // C4
        osc.frequency.linearRampToValueAtTime(523.25, now + 0.1); // C5
        osc.frequency.linearRampToValueAtTime(783.99, now + 0.2); // G5
        osc.frequency.linearRampToValueAtTime(1046.5, now + 0.3); // C6
        gain.gain.setValueAtTime(0.15 * volumeFactor, now);
        gain.gain.exponentialRampToValueAtTime(0.01 * volumeFactor, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'crash') {
        // Noise synthesis buffer for explosions
        const bufferSize = ctx.sampleRate * 0.4;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }
        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = buffer;
        const lowpass = ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.setValueAtTime(800, now);
        lowpass.frequency.linearRampToValueAtTime(50, now + 0.4);

        const filterGain = ctx.createGain();
        filterGain.gain.setValueAtTime(0.4 * volumeFactor, now);
        filterGain.gain.linearRampToValueAtTime(0.01 * volumeFactor, now + 0.4);

        whiteNoise.connect(lowpass);
        lowpass.connect(filterGain);
        filterGain.connect(ctx.destination);

        whiteNoise.start(now);
        whiteNoise.stop(now + 0.4);
      }
    } catch (e) {
      // Audio context instantiation fails silently or is blocked by browsers securely
    }
  }

  // Lane adjustments
  public switchLane(direction: 'left' | 'right') {
    if (!this.isPlaying) return;
    let switched = false;
    if (direction === 'left' && this.playerLane > -1) {
      this.playerLane--;
      switched = true;
      this.playSynthesizedSound('jump');
    } else if (direction === 'right' && this.playerLane < 1) {
      this.playerLane++;
      switched = true;
      this.playSynthesizedSound('jump');
    }
    
    if (switched) {
      // Swerve kinetic squash-and-stretch! Squeeze sideways and stretch tall during transition
      this.currentScaleX = 0.75;
      this.currentScaleY = 1.15;
      this.currentScaleZ = 1.05;
    }
    
    this.playerTargetX = this.playerLane * GAME_CONFIG.LANE_WIDTH;
  }

  public jump() {
    if (!this.isPlaying) return;
    if (!this.isJumping && !this.isSliding) {
      this.isJumping = true;
      this.playerVelocityY = GAME_CONFIG.JUMP_FORCE;
      this.playSynthesizedSound('jump');
    }
  }

  public slide() {
    if (!this.isPlaying) return;
    if (!this.isSliding) {
      this.isSliding = true;
      this.isJumping = false;
      this.playerVelocityY = -15; // Drive character down fast
      this.slideTimer = 0.7; // slide for 0.7s
      this.characterGroup.scale.set(1.0, 0.45, 1.0); // Flatten model
      this.playSynthesizedSound('jump');
    }
  }

  // Spawning environmental chunks with deep 3D Multilayer Parallax Scrolling
  private spawnSceneryChunk() {
    this.sceneryChunkCount++;

    // Dynamic environmental spawn spacing based on current score (spawns closer/faster as score increases)
    const scoreFactor = Math.min(0.5, this.currentScore / 20000);
    const scenerySpacing = 30 - (12 * scoreFactor); // reduces scenery spacing interval from 30m to 18m
    this.nextSceneryZ -= scenerySpacing;

    // Periodically spawn Subway Tunnels and Subway Stations for rich arcade gameplay!
    if (this.sceneryChunkCount % 12 === 0) {
      this.spawnSubwayTunnel(this.nextSceneryZ);
      return;
    } else if (this.sceneryChunkCount % 12 === 6) {
      this.spawnSubwayStation(this.nextSceneryZ);
      return;
    }

    const env = this.activeEnv;

    const isTemple = env.id === 'temple';
    const isCyber = env.id === 'cyber';
    const isSunset = env.id === 'theme_sunset';
    const isMidnight = env.id === 'theme_midnight';
    const isIndustrial = env.id === 'theme_industrial';
    const isDowntown = env.id === 'downtown';

    // ----------------------------------------------------
    // LAYER 0.5: HIGH-FIDELITY RAILWAY GANTRY ARCHES (Classic Subway Detail!)
    // ----------------------------------------------------
    if (Math.random() > 0.35) {
      const gantryGroup = new THREE.Group();
      gantryGroup.userData = { parallaxFactor: 1.0 };
      gantryGroup.position.set(0, 0, this.nextSceneryZ);

      const metalMat = new THREE.MeshStandardMaterial({
        color: isCyber ? '#0f172a' : (isTemple ? '#78350f' : '#475569'),
        roughness: 0.15,
        metalness: 0.85
      });

      // Left Pillar Support
      const pillarGeo = new THREE.CylinderGeometry(0.12, 0.15, 6.2, 8);
      const pillarL = new THREE.Mesh(pillarGeo, metalMat);
      pillarL.position.set(-GAME_CONFIG.LANE_WIDTH * 1.6, 3.1, 0);
      pillarL.castShadow = true;
      gantryGroup.add(pillarL);

      // Right Pillar Support
      const pillarR = new THREE.Mesh(pillarGeo, metalMat);
      pillarR.position.set(GAME_CONFIG.LANE_WIDTH * 1.6, 3.1, 0);
      pillarR.castShadow = true;
      gantryGroup.add(pillarR);

      // Horizontal Girder cross-beam
      const crossBeamGeo = new THREE.BoxGeometry(GAME_CONFIG.LANE_WIDTH * 3.2 + 0.3, 0.25, 0.3);
      const crossBeam = new THREE.Mesh(crossBeamGeo, metalMat);
      crossBeam.position.set(0, 6.1, 0);
      crossBeam.castShadow = true;
      gantryGroup.add(crossBeam);

      // Trusses or diagonal brace joints for structural complexity
      const braceGeo = new THREE.BoxGeometry(0.6, 0.1, 0.1);
      const braceL = new THREE.Mesh(braceGeo, metalMat);
      braceL.position.set(-GAME_CONFIG.LANE_WIDTH * 1.4, 5.8, 0);
      braceL.rotation.z = Math.PI / 4;
      gantryGroup.add(braceL);

      const braceR = braceL.clone();
      braceR.position.x = GAME_CONFIG.LANE_WIDTH * 1.4;
      braceR.rotation.z = -Math.PI / 4;
      gantryGroup.add(braceR);

      // 3 Lane Signal Indicators hanging underneath the girder
      const signalHousingGeo = new THREE.BoxGeometry(0.32, 0.32, 0.18);
      const signalHousingMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.9 });
      
      const greenBulbMat = new THREE.MeshBasicMaterial({ color: '#22c55e' });
      const redBulbMat = new THREE.MeshBasicMaterial({ color: '#ef4444' });
      const bulbGeo = new THREE.SphereGeometry(0.08, 6, 6);

      for (let lane = -1; lane <= 1; lane++) {
        const housing = new THREE.Mesh(signalHousingGeo, signalHousingMat);
        housing.position.set(lane * GAME_CONFIG.LANE_WIDTH, 5.7, 0.1);
        gantryGroup.add(housing);

        // Randomly show some green/red signals like the actual transit board
        const isGreen = Math.random() > 0.3;
        const bulb = new THREE.Mesh(bulbGeo, isGreen ? greenBulbMat : redBulbMat);
        bulb.position.set(lane * GAME_CONFIG.LANE_WIDTH, 5.7, 0.2);
        gantryGroup.add(bulb);
      }

      this.scene.add(gantryGroup);
      this.sceneryMeshes.push(gantryGroup);
    }

    // ----------------------------------------------------
    // LAYER 1: NEAR SCENERY (parallaxFactor = 1.0)
    // ----------------------------------------------------
    const laneSeparation = GAME_CONFIG.LANE_WIDTH * 2.5;

    for (const side of [-1, 1]) {
      const width = isTemple ? 3 : 5;
      const height = isTemple ? (Math.random() * 8 + 10) : (Math.random() * 20 + 10);
      const depth = isTemple ? 4 : 5;

      const geo = new THREE.BoxGeometry(width, height, depth);

      // Determine building colors based on the theme
      let buildColor = '#475569';
      let metalVal = 0.1;
      let emissiveColor = '#000000';
      let emissiveIntensity = 0;

      if (isCyber) {
        buildColor = Math.random() > 0.5 ? '#110c24' : '#1e1b4b';
        metalVal = 0.3;
        emissiveColor = '#f43f5e';
        emissiveIntensity = Math.random() > 0.6 ? 0.25 : 0.08;
      } else if (isTemple) {
        buildColor = '#78350f'; // Dark ancient bronze stone
        metalVal = 0.4;
      } else if (isSunset) {
        buildColor = Math.random() > 0.5 ? '#9a3412' : '#c2410c';
        emissiveColor = '#fef08a';
        emissiveIntensity = Math.random() > 0.4 ? 0.3 : 0;
      } else if (isMidnight) {
        buildColor = Math.random() > 0.5 ? '#090d16' : '#111827';
        metalVal = 0.5;
        emissiveColor = '#06b6d4';
        emissiveIntensity = Math.random() > 0.5 ? 0.4 : 0.1;
      } else if (isIndustrial) {
        buildColor = Math.random() > 0.5 ? '#292524' : '#44403c';
        metalVal = 0.7;
        emissiveColor = '#ef4444';
        emissiveIntensity = Math.random() > 0.7 ? 0.5 : 0.05;
      }

      const mat = new THREE.MeshStandardMaterial({
        color: buildColor,
        roughness: isIndustrial ? 0.4 : 0.8,
        metalness: metalVal,
        emissive: emissiveColor,
        emissiveIntensity: emissiveIntensity
      });

      // Construct a unified building group to maintain tidy tree structures
      const buildingGroup = new THREE.Group();
      buildingGroup.userData = { parallaxFactor: 1.0 };
      buildingGroup.position.set(side * (laneSeparation + width / 2), height / 2 - 0.5, this.nextSceneryZ);

      const building = new THREE.Mesh(geo, mat);
      building.castShadow = true;
      building.receiveShadow = true;
      buildingGroup.add(building);

      // 1. SKYSCRAPER CHROME WINDOW GRIDS (Classic Subway Surfers City Detail)
      if (!isTemple) {
        const windowColor = isCyber ? (Math.random() > 0.5 ? '#06b6d4' : '#f43f5e') :
                             isSunset ? '#fed7aa' :
                             isMidnight ? '#67e8f9' :
                             isIndustrial ? '#fcf6bd' : '#fef08a';
        const winMat = new THREE.MeshBasicMaterial({ color: windowColor });
        const winGeo = new THREE.BoxGeometry(0.06, 0.42, 0.55);
        const innerFaceX = side === -1 ? (width / 2 + 0.02) : (-width / 2 - 0.02);

        for (let y = -height / 2 + 1.8; y <= height / 2 - 1.8; y += 1.8) {
          for (let z = -depth / 2 + 0.8; z <= depth / 2 - 0.8; z += 1.3) {
            if (Math.random() > 0.2) {
              const win = new THREE.Mesh(winGeo, winMat);
              win.position.set(innerFaceX, y, z);
              buildingGroup.add(win);
            }
          }
        }
      }

      // 2. ROOFTOP MECHANICAL DECORS
      if (Math.random() > 0.5 && !isTemple) {
        // Water Tower Cylinder
        const waterGeo = new THREE.CylinderGeometry(0.6, 0.6, 1.1, 8);
        const water = new THREE.Mesh(waterGeo, new THREE.MeshStandardMaterial({ color: '#7c2d12', roughness: 0.9 }));
        water.position.set(0, height / 2 + 0.55, 0);
        buildingGroup.add(water);
      }
      if (Math.random() > 0.4) {
        // Air vents (AC Boxes)
        const ac = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), new THREE.MeshStandardMaterial({ color: '#94a3b8' }));
        ac.position.set((Math.random() - 0.5) * (width - 2), height / 2 + 0.35, (Math.random() - 0.5) * (depth - 2));
        buildingGroup.add(ac);
      }
      if (Math.random() > 0.5) {
        // Antenna Mast with Red warning light on tip
        const antenna = new THREE.Group();
        antenna.position.set(width / 4, height / 2, 0);
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 3, 4), new THREE.MeshStandardMaterial({ color: '#64748b', metalness: 0.9 }));
        mast.position.y = 1.5;
        const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), new THREE.MeshBasicMaterial({ color: '#ef4444' }));
        beacon.position.y = 3.0;
        antenna.add(mast, beacon);
        buildingGroup.add(antenna);
      }

      this.scene.add(buildingGroup);
      this.sceneryMeshes.push(buildingGroup);

      // 3. CURVED HIGH-FIDELITY STREETLIGHT CONE PROJECTIONS (PF = 1.0)
      if (Math.random() > 0.58) {
        const streetlight = new THREE.Group();
        streetlight.userData = { parallaxFactor: 1.0 };
        const lampZ = this.nextSceneryZ + Math.random() * 15;
        streetlight.position.set(side * (laneSeparation - 1), 0, lampZ);

        // Slender vertical pole
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 6.5, 8), new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.85 }));
        pole.position.y = 3.25;
        streetlight.add(pole);

        // Arm extend facing rail
        const dir = side === -1 ? 1 : -1;
        const arm = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 0.1), pole.material);
        arm.position.set(dir * 0.65, 6.5, 0);
        streetlight.add(arm);

        // Neon Glow bulb
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), new THREE.MeshBasicMaterial({ color: env.accentColor }));
        bulb.position.set(dir * 1.35, 6.25, 0);
        streetlight.add(bulb);

        // Semi-transparent overlay spotlight cone matching actual game nights/days
        const cone = new THREE.Mesh(new THREE.ConeGeometry(1.2, 5.0, 10, 1, true), new THREE.MeshBasicMaterial({
          color: env.accentColor,
          transparent: true,
          opacity: 0.15,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending
        }));
        cone.geometry.translate(0, -2.5, 0); // shift center pivot to apex Top
        cone.position.set(dir * 1.35, 6.20, 0);
        streetlight.add(cone);

        this.scene.add(streetlight);
        this.sceneryMeshes.push(streetlight);
      }

      // 4. BIOMES & SIDEWALK DECORS (Trees, Crates, Barrels)
      if (Math.random() > 0.62) {
        const sidewalkExtras = new THREE.Group();
        sidewalkExtras.userData = { parallaxFactor: 1.0 };
        sidewalkExtras.position.set(side * (GAME_CONFIG.LANE_WIDTH * 1.5 + 2.0), 0, this.nextSceneryZ + Math.random() * 12);

        if (Math.random() > 0.5) {
          // Low poly organic Tree
          const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.8, 8), new THREE.MeshStandardMaterial({ color: '#5c4033', roughness: 0.9 }));
          trunk.position.y = 0.9;
          const leafMat = new THREE.MeshStandardMaterial({ color: isTemple ? '#047857' : isSunset ? '#b45309' : '#059669', roughness: 0.85 });
          const leaves = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.8, 6), leafMat);
          leaves.position.y = 1.8 + 0.9;
          sidewalkExtras.add(trunk, leaves);
        } else {
          // Stack of warning crates / hazardous barrels
          const box = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), new THREE.MeshStandardMaterial({ color: isIndustrial ? '#ea580c' : '#b45309', roughness: 0.85 }));
          box.position.y = 0.4;
          sidewalkExtras.add(box);
        }
        this.scene.add(sidewalkExtras);
        this.sceneryMeshes.push(sidewalkExtras);
      }
    }

    // 5. OVERHEAD STEEL TRUSS TRANSIT BRIDGES (Stretches across all lines)
    if (Math.random() > 0.84) {
      const bridge = new THREE.Group();
      bridge.userData = { parallaxFactor: 1.0 };
      bridge.position.set(0, 11 + Math.random() * 2, this.nextSceneryZ);

      const spanMat = new THREE.MeshStandardMaterial({ color: isCyber ? '#1e1b4b' : '#334155', metalness: 0.65 });
      const span = new THREE.Mesh(new THREE.BoxGeometry(45, 0.8, 3.5), spanMat);
      bridge.add(span);

      // Alternate hazard safety warning bands (Yellow & Black)
      const matY = new THREE.MeshBasicMaterial({ color: '#fbbf24' });
      const matB = new THREE.MeshBasicMaterial({ color: '#111827' });
      for (let i = 0; i < 8; i++) {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 3.6), (i % 2 === 0) ? matY : matB);
        stripe.position.set(-8.5 + i * 2.5, -0.4, 0);
        bridge.add(stripe);
      }

      // Pillar coordinates supporting the horizontal deck span
      const pillarL = new THREE.Mesh(new THREE.BoxGeometry(1.4, 11, 1.4), spanMat);
      pillarL.position.set(-18, -5.5, 0);
      const pillarR = pillarL.clone();
      pillarR.position.x = 18;
      bridge.add(pillarL, pillarR);

      this.scene.add(bridge);
      this.sceneryMeshes.push(bridge);
    }

    // ----------------------------------------------------
    // LAYER 2: MID-DISTANCE SCENERY (parallaxFactor = 0.55)
    // ----------------------------------------------------
    for (const side of [-1, 1]) {
      if (Math.random() > 0.40) {
        let midMesh: THREE.Mesh | null = null;
        const midZ = this.nextSceneryZ + (Math.random() * 20 - 10);
        const midX = side * (GAME_CONFIG.LANE_WIDTH * 2.5 + 14 + Math.random() * 8);

        if (isCyber) {
          // Cyber Billboard / Advertisement Stand (PF = 0.55)
          const boardGeo = new THREE.BoxGeometry(4, 3, 0.5);
          const boardMat = new THREE.MeshStandardMaterial({
            color: '#111827',
            emissive: Math.random() > 0.5 ? '#f43f5e' : '#06b6d4',
            emissiveIntensity: 0.8,
            roughness: 0.1,
            metalness: 0.9
          });
          midMesh = new THREE.Mesh(boardGeo, boardMat);
          midMesh.position.set(midX, 5, midZ);
        } else if (isTemple) {
          // Ancient Sandstone Pillared Archetypes (PF = 0.55)
          const archGeo = new THREE.CylinderGeometry(0.8, 1.2, 12, 10);
          const archMat = new THREE.MeshStandardMaterial({
            color: '#d97706',
            roughness: 0.9,
            metalness: 0.1
          });
          midMesh = new THREE.Mesh(archGeo, archMat);
          midMesh.position.set(midX, 6, midZ);
        } else if (isSunset) {
          // Brick Water Silos (PF = 0.55)
          const siloGeo = new THREE.CylinderGeometry(1.5, 1.5, 10, 10);
          const siloMat = new THREE.MeshStandardMaterial({
            color: '#7c2d12',
            roughness: 0.9,
            emissive: '#f43f5e',
            emissiveIntensity: 0.15
          });
          midMesh = new THREE.Mesh(siloGeo, siloMat);
          midMesh.position.set(midX, 5, midZ);
        } else if (isMidnight) {
          // Subterranean Pillars (PF = 0.55)
          const pGeo = new THREE.BoxGeometry(2, 14, 2);
          const pMat = new THREE.MeshStandardMaterial({
            color: '#020617',
            emissive: '#22c55e',
            emissiveIntensity: 0.25,
            metalness: 0.8
          });
          midMesh = new THREE.Mesh(pGeo, pMat);
          midMesh.position.set(midX, 7, midZ);
        } else if (isIndustrial) {
          // Slender smokestacks ( chimneys ) (PF = 0.55)
          const chimneyGeo = new THREE.CylinderGeometry(0.7, 1.4, 16, 8);
          const chimneyMat = new THREE.MeshStandardMaterial({
            color: '#44403c',
            metalness: 0.8,
            roughness: 0.5,
            emissive: '#ef4444',
            emissiveIntensity: 0.3
          });
          midMesh = new THREE.Mesh(chimneyGeo, chimneyMat);
          midMesh.position.set(midX, 8, midZ);
        } else {
          // Downtown: Red Brick Warehouses
          const whGeo = new THREE.BoxGeometry(6, 12, 6);
          const whMat = new THREE.MeshStandardMaterial({
            color: '#991b1b',
            roughness: 0.9
          });
          midMesh = new THREE.Mesh(whGeo, whMat);
          midMesh.position.set(midX, 6, midZ);
        }

        if (midMesh) {
          midMesh.userData = { parallaxFactor: 0.55 };
          midMesh.castShadow = true;
          midMesh.receiveShadow = true;
          this.scene.add(midMesh);
          this.sceneryMeshes.push(midMesh);
        }
      }
    }

    // ----------------------------------------------------
    // LAYER 3: COLOSSAL FAR HORIZON BACKDROP (parallaxFactor = 0.18)
    // ----------------------------------------------------
    for (const side of [-1, 1]) {
      if (Math.random() > 0.45) {
        let farMesh: THREE.Mesh | null = null;
        const farZ = this.nextSceneryZ + (Math.random() * 15 - 7.5);
        const farX = side * (100 + Math.random() * 25);

        if (isTemple) {
          // Colossal Ancient Mountain Pyramids (Cone geometry, PF = 0.18)
          const pyramidGeo = new THREE.ConeGeometry(24, 48, 4);
          const pyramidMat = new THREE.MeshStandardMaterial({
            color: '#14532d', // Forest jungle peak
            roughness: 0.95,
            metalness: 0.0
          });
          farMesh = new THREE.Mesh(pyramidGeo, pyramidMat);
          farMesh.position.set(farX, 20, farZ);
          farMesh.rotation.y = Math.PI / 4; // Diamond rotated
        } else if (isCyber) {
          // Giant futuristic hollow megastructure tower (PF = 0.18)
          const towerGeo = new THREE.BoxGeometry(15, 65, 15);
          const towerMat = new THREE.MeshStandardMaterial({
            color: '#090514',
            emissive: '#d946ef',
            emissiveIntensity: 0.15,
            roughness: 0.3,
            metalness: 0.9
          });
          farMesh = new THREE.Mesh(towerGeo, towerMat);
          farMesh.position.set(farX, 30, farZ);
        } else if (isSunset || isDowntown) {
          // Mammoth City Office Tower block outlines (PF = 0.18)
          const scaleHeight = Math.random() * 30 + 55;
          const skyscraperGeo = new THREE.BoxGeometry(18, scaleHeight, 18);
          const skyscraperMat = new THREE.MeshStandardMaterial({
            color: isSunset ? '#2e1065' : '#1e293b',
            roughness: 0.8,
            metalness: 0.3,
            emissive: isSunset ? '#f97316' : '#facc15',
            emissiveIntensity: 0.1
          });
          farMesh = new THREE.Mesh(skyscraperGeo, skyscraperMat);
          farMesh.position.set(farX, scaleHeight / 2 - 5, farZ);
        } else if (isMidnight) {
          // Dark space celestial pylons (PF = 0.18)
          const pylonGeo = new THREE.CylinderGeometry(4, 8, 70, 6);
          const pylonMat = new THREE.MeshStandardMaterial({
            color: '#020617',
            roughness: 0.6,
            emissive: '#06b6d4',
            emissiveIntensity: 0.2
          });
          farMesh = new THREE.Mesh(pylonGeo, pylonMat);
          farMesh.position.set(farX, 30, farZ);
        } else if (isIndustrial) {
          // Massive Industrial Cooling Towers (PF = 0.18)
          const coolingGeo = new THREE.CylinderGeometry(14, 18, 50, 10);
          const coolingMat = new THREE.MeshStandardMaterial({
            color: '#1c1917',
            roughness: 0.9,
            metalness: 0.5
          });
          farMesh = new THREE.Mesh(coolingGeo, coolingMat);
          farMesh.position.set(farX, 22, farZ);
        }

        if (farMesh) {
          farMesh.userData = { parallaxFactor: 0.18 };
          farMesh.castShadow = true;
          farMesh.receiveShadow = true;
          this.scene.add(farMesh);
          this.sceneryMeshes.push(farMesh);
        }
      }
    }

    // ----------------------------------------------------
    // LAYER 4: HIGH SKY OR ATMOSPHERIC CLOUDS (parallaxFactor = 0.04)
    // ----------------------------------------------------
    if (Math.random() > 0.55) {
      const cloudX = Math.random() * 85 - 42.5;
      const cloudY = 32 + Math.random() * 12;
      const cloudZ = this.nextSceneryZ - 12;

      let cloudMesh: THREE.Mesh | null = null;

      if (isCyber) {
        // Neon flying ships or digital data dust rings (PF = 0.04)
        const shipGeo = new THREE.BoxGeometry(8, 0.8, 3.5);
        const shipMat = new THREE.MeshBasicMaterial({
          color: '#22d3ee',
          transparent: true,
          opacity: 0.7
        });
        cloudMesh = new THREE.Mesh(shipGeo, shipMat);
      } else if (isMidnight) {
        // Tiny glowing moons/stars (PF = 0.04)
        const starGeo = new THREE.SphereGeometry(1.2, 8, 8);
        const starMat = new THREE.MeshBasicMaterial({
          color: '#ffffff',
          transparent: true,
          opacity: 0.95
        });
        cloudMesh = new THREE.Mesh(starGeo, starMat);
      } else {
        // Soft elegant puffy clouds (PF = 0.04)
        const cloudGeo = new THREE.BoxGeometry(16, 2, 8);
        const cloudMat = new THREE.MeshStandardMaterial({
          color: isSunset ? '#fca5a5' : isTemple ? '#6ee7b7' : isIndustrial ? '#f97316' : '#f8fafc',
          transparent: true,
          opacity: 0.75,
          roughness: 0.9,
          metalness: 0.0
        });
        cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
      }

      if (cloudMesh) {
        cloudMesh.position.set(cloudX, cloudY, cloudZ);
        cloudMesh.userData = { parallaxFactor: 0.04 };
        this.scene.add(cloudMesh);
        this.sceneryMeshes.push(cloudMesh);
      }
    }

    // ----------------------------------------------------
    // ANIMATED TRAFFIC / STREET CARS (Only for urban zones)
    // ----------------------------------------------------
    if ((isDowntown || isSunset || isCyber || isIndustrial) && Math.random() > 0.60) {
      const isLeft = Math.random() > 0.5;
      const carGroup = new THREE.Group();
      carGroup.userData = { 
        parallaxFactor: 1.0, 
        type: 'car', 
        selfSpeed: isLeft ? 18 : -18 // Cars driving forwards or backwards
      };
      
      const carX = isLeft ? -16.5 : 16.5;
      carGroup.position.set(carX, 0.4, this.nextSceneryZ + Math.random() * 20 - 10);
      
      // Car Body
      const carBodyGeo = new THREE.BoxGeometry(2.0, 1.0, 3.8);
      const isYellowCab = isDowntown && Math.random() > 0.4;
      const carColor = isYellowCab ? '#facc15' : (isCyber ? '#ec4899' : (isIndustrial ? '#ea580c' : '#3b82f6'));
      const carBodyMat = new THREE.MeshStandardMaterial({ 
        color: carColor, 
        roughness: 0.25, 
        metalness: 0.8 
      });
      const carBody = new THREE.Mesh(carBodyGeo, carBodyMat);
      carBody.castShadow = true;
      carGroup.add(carBody);
      
      // Car Cabin
      const cabinGeo = new THREE.BoxGeometry(1.8, 0.7, 2.0);
      const cabin = new THREE.Mesh(cabinGeo, carBodyMat);
      cabin.position.set(0, 0.80, -0.3);
      cabin.castShadow = true;
      carGroup.add(cabin);

      // Glass windows (reflective azure)
      const glassGeo = new THREE.BoxGeometry(1.82, 0.55, 1.8);
      const glassMat = new THREE.MeshStandardMaterial({
        color: '#06b6d4',
        roughness: 0.05,
        metalness: 0.95,
        emissive: '#0891b2',
        emissiveIntensity: 0.2
      });
      const glass = new THREE.Mesh(glassGeo, glassMat);
      glass.position.set(0, 0.80, -0.3);
      carGroup.add(glass);
      
      // Tires
      const tireGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.45, 12);
      tireGeo.rotateZ(Math.PI / 2);
      const tireMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.9 });
      for (const tX of [-1.0, 1.0]) {
        for (const tZ of [-1.1, 1.1]) {
          const tire = new THREE.Mesh(tireGeo, tireMat);
          tire.position.set(tX, -0.15, tZ);
          carGroup.add(tire);
        }
      }

      // Lights configuration
      const lightGeo = new THREE.SphereGeometry(0.15, 8, 8);
      const headMat = new THREE.MeshBasicMaterial({ color: '#fef08a' }); // Glow headlight
      const tailMat = new THREE.MeshBasicMaterial({ color: '#ef4444' }); // Tail lights

      const headL = new THREE.Mesh(lightGeo, headMat);
      const headR = new THREE.Mesh(lightGeo, headMat);
      const tailL = new THREE.Mesh(lightGeo, tailMat);
      const tailR = new THREE.Mesh(lightGeo, tailMat);

      if (isLeft) {
        carGroup.rotation.y = 0;
        headL.position.set(-0.75, 0.1, -1.91);
        headR.position.set(0.75, 0.1, -1.91);
        tailL.position.set(-0.75, 0.1, 1.91);
        tailR.position.set(0.75, 0.1, 1.91);
      } else {
        carGroup.rotation.y = Math.PI;
        headL.position.set(-0.75, 0.1, -1.91);
        headR.position.set(0.75, 0.1, -1.91);
        tailL.position.set(-0.75, 0.1, 1.91);
        tailR.position.set(0.75, 0.1, 1.91);
      }

      carGroup.add(headL);
      carGroup.add(headR);
      carGroup.add(tailL);
      carGroup.add(tailR);

      this.scene.add(carGroup);
      this.sceneryMeshes.push(carGroup);
    }

    // ----------------------------------------------------
    // ANIMATED SIDEWALK PEDESTRIANS
    // ----------------------------------------------------
    if ((isDowntown || isSunset || isCyber || isIndustrial || isTemple) && Math.random() > 0.45) {
      const isLeft = Math.random() > 0.5;
      const pedGroup = new THREE.Group();
      pedGroup.userData = { 
        parallaxFactor: 1.0, 
        type: 'pedestrian', 
        bobOffset: Math.random() * Math.PI * 2,
        bobSpeed: 3.5 + Math.random() * 2.5
      };

      const pedX = isLeft ? (-GAME_CONFIG.LANE_WIDTH * 1.55) : (GAME_CONFIG.LANE_WIDTH * 1.55);
      pedGroup.position.set(pedX + (Math.random() - 0.5) * 1.2, 0.2, this.nextSceneryZ + Math.random() * 20 - 10);
      
      const pedColors = ['#f43f5e', '#a855f7', '#10b981', '#f59e0b', '#06b6d4'];
      const torsoColor = pedColors[Math.floor(Math.random() * pedColors.length)];

      // Torso
      const torsoGeo = new THREE.BoxGeometry(0.5, 0.8, 0.3);
      const torsoMat = new THREE.MeshStandardMaterial({ color: torsoColor, roughness: 0.70 });
      const torso = new THREE.Mesh(torsoGeo, torsoMat);
      torso.position.y = 0.6;
      torso.castShadow = true;
      pedGroup.add(torso);

      // Head
      const headGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
      const headMat = new THREE.MeshStandardMaterial({ color: '#fbcfe8', roughness: 0.65 });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.y = 1.18;
      head.castShadow = true;
      pedGroup.add(head);

      // Cute Beanie/Cap details
      if (Math.random() > 0.4) {
        const beanieGeo = new THREE.BoxGeometry(0.38, 0.12, 0.38);
        const beanieMat = new THREE.MeshStandardMaterial({ color: '#ef4444', roughness: 0.85 });
        const beanie = new THREE.Mesh(beanieGeo, beanieMat);
        beanie.position.y = 1.34;
        pedGroup.add(beanie);
      }

      // Legs
      const legGeo = new THREE.BoxGeometry(0.18, 0.6, 0.18);
      const legMat = new THREE.MeshStandardMaterial({ color: '#1e3a8a', roughness: 0.8 }); // pants
      const leftLeg = new THREE.Mesh(legGeo, legMat);
      leftLeg.position.set(-0.13, 0.3, 0);
      leftLeg.castShadow = true;
      const rightLeg = new THREE.Mesh(legGeo, legMat);
      rightLeg.position.set(0.13, 0.3, 0);
      rightLeg.castShadow = true;
      pedGroup.add(leftLeg);
      pedGroup.add(rightLeg);

      // Arms (for cheering/waving animations)
      const armGeo = new THREE.BoxGeometry(0.14, 0.55, 0.14);
      const armMat = new THREE.MeshStandardMaterial({ color: torsoColor, roughness: 0.7 });
      const leftArm = new THREE.Mesh(armGeo, armMat);
      leftArm.position.set(-0.34, 0.7, 0);
      leftArm.name = 'leftArm';
      leftArm.castShadow = true;
      const rightArm = new THREE.Mesh(armGeo, armMat);
      rightArm.position.set(0.34, 0.7, 0);
      rightArm.name = 'rightArm';
      rightArm.castShadow = true;
      pedGroup.add(leftArm);
      pedGroup.add(rightArm);

      this.scene.add(pedGroup);
      this.sceneryMeshes.push(pedGroup);
    }
  }

  // Spawns a massive industrial Subway Tunnel wrapping all three lanes
  private spawnSubwayTunnel(z: number) {
    const tunnelGroup = new THREE.Group();
    tunnelGroup.name = 'subway_tunnel';
    tunnelGroup.userData = { parallaxFactor: 1.0 };
    tunnelGroup.position.set(0, 0, z);

    const isTemple = this.activeEnv.id === 'temple';
    const isCyber = this.activeEnv.id === 'cyber';

    const wallColor = isCyber ? '#090d16' : (isTemple ? '#451a03' : '#334155');
    const accentColor = isCyber ? '#ec4899' : '#eab308';

    const wallMat = new THREE.MeshStandardMaterial({
      color: wallColor,
      roughness: 0.85,
      metalness: isCyber ? 0.4 : 0.1
    });

    const ribsMat = new THREE.MeshStandardMaterial({
      color: isCyber ? '#1e1b4b' : '#1e293b',
      roughness: 0.4,
      metalness: 0.8
    });

    // 1. Left Tunnel Wall
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.6, 6.8, 22.0), wallMat);
    leftWall.position.set(-GAME_CONFIG.LANE_WIDTH * 1.6 - 0.3, 3.4, 0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    tunnelGroup.add(leftWall);

    // 2. Right Tunnel Wall
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.6, 6.8, 22.0), wallMat);
    rightWall.position.set(GAME_CONFIG.LANE_WIDTH * 1.6 + 0.3, 3.4, 0);
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    tunnelGroup.add(rightWall);

    // 3. Curved Ceiling / Roof Slab
    const ceiling = new THREE.Mesh(new THREE.BoxGeometry(GAME_CONFIG.LANE_WIDTH * 3.2 + 0.8, 0.4, 22.0), wallMat);
    ceiling.position.set(0, 6.8, 0);
    ceiling.castShadow = true;
    ceiling.receiveShadow = true;
    tunnelGroup.add(ceiling);

    // 4. Heavy Metal Rib archway joints inside
    const ribOffsets = [-7.5, 0.0, 7.5];
    ribOffsets.forEach(offset => {
      // Left vertical beam
      const ribL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 6.6, 0.6), ribsMat);
      ribL.position.set(-GAME_CONFIG.LANE_WIDTH * 1.6 + 0.05, 3.3, offset);
      tunnelGroup.add(ribL);

      // Right vertical beam
      const ribR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 6.6, 0.6), ribsMat);
      ribR.position.set(GAME_CONFIG.LANE_WIDTH * 1.6 - 0.05, 3.3, offset);
      tunnelGroup.add(ribR);

      // Horizontal beam
      const ribTop = new THREE.Mesh(new THREE.BoxGeometry(GAME_CONFIG.LANE_WIDTH * 3.2 - 0.1, 0.25, 0.6), ribsMat);
      ribTop.position.set(0, 6.5, offset);
      tunnelGroup.add(ribTop);

      // Safety Hazard striped chevrons (Yellow/Black)
      const strip1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.4, 0.62), new THREE.MeshBasicMaterial({ color: accentColor }));
      strip1.position.set(-GAME_CONFIG.LANE_WIDTH * 0.8, 6.5, offset);
      const strip2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.4, 0.62), new THREE.MeshBasicMaterial({ color: '#111827' }));
      strip2.position.set(GAME_CONFIG.LANE_WIDTH * 0.8, 6.5, offset);
      tunnelGroup.add(strip1, strip2);

      // Overhead Tube Light
      const bulbGeo = new THREE.BoxGeometry(0.15, 0.15, 2.5);
      const bulbMat = new THREE.MeshBasicMaterial({
        color: isCyber ? '#f43f5e' : '#67e8f9',
      });
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.set(0, 6.3, offset);
      tunnelGroup.add(bulb);

      // Volumetric neon cone/glow projecting downwards
      const coneGeo = new THREE.CylinderGeometry(0.1, 2.0, 6.0, 8, 1, true);
      coneGeo.translate(0, -3.0, 0);
      const coneMat = new THREE.MeshBasicMaterial({
        color: isCyber ? '#f43f5e' : '#0ea5e9',
        transparent: true,
        opacity: 0.13,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.set(0, 6.2, offset);
      tunnelGroup.add(cone);
    });

    // 5. Classic subway warning warning graphics at the entry face (+Z edge)
    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.9, 0.2), new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.5 }));
    signBoard.position.set(0, 5.0, 10.9);
    tunnelGroup.add(signBoard);

    // Neon glowing bulb on top of signboard
    const signLight = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshBasicMaterial({ color: '#ef4444' }));
    signLight.position.set(0, 5.6, 10.9);
    signLight.name = 'tunnel_sign_light';
    tunnelGroup.add(signLight);

    const innerBacking = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.6, 0.25), new THREE.MeshBasicMaterial({ color: '#ea580c' }));
    innerBacking.position.set(0, 5.0, 10.9);
    tunnelGroup.add(innerBacking);

    this.scene.add(tunnelGroup);
    this.sceneryMeshes.push(tunnelGroup);
  }

  // Spawns a beautiful glowing Subway Station platform decoration on sides
  private spawnSubwayStation(z: number) {
    const stationGroup = new THREE.Group();
    stationGroup.name = 'subway_station';
    stationGroup.userData = { parallaxFactor: 1.0 };
    stationGroup.position.set(0, 0, z);

    const isTemple = this.activeEnv.id === 'temple';
    const isCyber = this.activeEnv.id === 'cyber';

    const platformColor = '#475569';
    const pillarColor = isCyber ? '#1e1b4b' : (isTemple ? '#78350f' : '#b91c1c');
    const wallColor = isCyber ? '#111827' : '#d1d5db';

    const platformMat = new THREE.MeshStandardMaterial({ color: platformColor, roughness: 0.9 });
    const safetyStripMat = new THREE.MeshStandardMaterial({ color: '#fbbf24', roughness: 0.5, metalness: 0.1 });
    const pillarMat = new THREE.MeshStandardMaterial({ color: pillarColor, roughness: 0.5, metalness: 0.65 });
    const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.8 });
    const benchWoodMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.9 });

    // LEFT & RIGHT Platforms
    for (const side of [-1, 1]) {
      const pX = side * (GAME_CONFIG.LANE_WIDTH * 1.6 + 1.8);
      
      // Concrete platform deck block
      const deck = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.72, 22.0), platformMat);
      deck.position.set(pX, 0.36, 0);
      deck.castShadow = true;
      deck.receiveShadow = true;
      stationGroup.add(deck);

      // Yellow safety tactile edge stripe facing the tracks
      const stripX = pX - side * 1.55;
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.76, 22.0), safetyStripMat);
      strip.position.set(stripX, 0.38, 0);
      stationGroup.add(strip);

      // Station Back Boundary Wall
      const wallX = pX + side * 1.55;
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.1, 5.8, 22.0), wallMat);
      wall.position.set(wallX, 2.9, 0);
      wall.castShadow = true;
      wall.receiveShadow = true;
      stationGroup.add(wall);

      // Station platform roof canopy
      const roof = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.15, 22.0), platformMat);
      roof.position.set(pX, 5.8, 0);
      roof.rotation.z = side * 0.08; // slightly slanted
      stationGroup.add(roof);

      // Vertical Columns holding up roof (spaced along Z)
      const pillarOffsets = [-8.0, 0, 8.0];
      pillarOffsets.forEach(offset => {
        const pillarCol = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 5.2, 8), pillarMat);
        pillarCol.position.set(pX + side * 0.8, 2.6, offset);
        pillarCol.castShadow = true;
        stationGroup.add(pillarCol);
      });

      // Subway Waiting Bench for passengers
      const benchGroup = new THREE.Group();
      benchGroup.position.set(pX + side * 1.0, 0.75, 4.0);
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 2.5), benchWoodMat);
      seat.position.y = 0.35;
      seat.castShadow = true;
      benchGroup.add(seat);

      // Bench legs
      const legGeo = new THREE.BoxGeometry(0.1, 0.35, 0.1);
      const legMat = new THREE.MeshStandardMaterial({ color: '#1e293b' });
      for (const lx of [-0.35, 0.35]) {
        for (const lz of [-1.0, 1.0]) {
          const leg = new THREE.Mesh(legGeo, legMat);
          leg.position.set(lx, 0.175, lz);
          benchGroup.add(leg);
        }
      }
      stationGroup.add(benchGroup);

      // Large Advertisement Posters / Billboards along the back wall
      const posterOffsets = [-5.0, 5.0];
      const posterColors = ['#ec4899', '#3b82f6', '#10b981', '#f59e0b'];
      posterOffsets.forEach((pOffset, idx) => {
        const pColor = posterColors[(idx + (side > 0 ? 2 : 0)) % posterColors.length];
        const adPanel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.8, 3.2), new THREE.MeshStandardMaterial({
          color: pColor,
          roughness: 0.1,
          emissive: pColor,
          emissiveIntensity: 0.25
        }));
        adPanel.position.set(wallX - side * 0.08, 2.5, pOffset);
        stationGroup.add(adPanel);

        // Frame border around ad posters
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.0, 3.4), new THREE.MeshStandardMaterial({ color: '#111827' }));
        frame.position.set(wallX - side * 0.06, 2.5, pOffset);
        stationGroup.add(frame);
      });

      // Metro Station Name Hanging Board
      const signBoard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 1.8), new THREE.MeshStandardMaterial({ color: '#1e293b' }));
      signBoard.position.set(pX, 4.4, -4.0);
      const stripOverlay = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 1.4), new THREE.MeshBasicMaterial({ color: '#eab308' }));
      stripOverlay.position.set(-side * 0.01, 0, 0);
      signBoard.add(stripOverlay);
      stationGroup.add(signBoard);
    }

    // Dynamic LED Amber display hanging directly over middle track
    const ledGroup = new THREE.Group();
    ledGroup.position.set(0, 5.2, 2.0);
    const casing = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 0.35), new THREE.MeshStandardMaterial({ color: '#020617' }));
    ledGroup.add(casing);

    // Glow display faces
    const goldMat = new THREE.MeshBasicMaterial({ color: '#fbbf24' }); // amber LED light glows!
    const faceF = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 0.02), goldMat);
    faceF.position.set(0, 0, 0.185);
    ledGroup.add(faceF);
    
    const faceB = faceF.clone();
    faceB.position.z = -0.185;
    ledGroup.add(faceB);
    stationGroup.add(ledGroup);

    this.scene.add(stationGroup);
    this.sceneryMeshes.push(stationGroup);
  }

  // Spawning obstacles chunk (trains, barrier, ramps)
  private spawnObstacleChunk() {
    // Dynamic obstacle spawn rate (higher spawn frequency / closer spacing as user score increases)
    const scoreFactor = Math.min(0.65, this.currentScore / 25000); // fully scales up at 25,000 points
    const minSpacing = 25 - (15 * scoreFactor); // reduces from 25 to 10
    const varSpacing = 25 - (10 * scoreFactor); // reduces from 25 to 15
    this.nextObstacleZ -= Math.random() * varSpacing + minSpacing;
    const laneIndex = Math.floor(Math.random() * 3) - 1; // -1, 0, 1
    const rand = Math.random();

    let obsType: 'train' | 'barrier_low' | 'barrier_high' | 'ramp' = 'barrier_low';
    let height = 1.0;
    let width = 2.0;

    // --- Dynamic Obstacle Spawn Patterns by Environment ID ---
    const envId = this.activeEnv.id;
    if (envId === 'cyber') {
      // Cyber Daylight has a higher frequency of high-tech sliding barriers (barrier_high)
      if (rand < 0.25) {
        obsType = 'train';
        height = 4.2;
        width = 2.4;
      } else if (rand < 0.65) {
        obsType = 'barrier_high'; // 40% chance of high slider!
        height = 2.5;
      } else if (rand < 0.85) {
        obsType = 'barrier_low';
        height = 0.9;
      } else {
        obsType = 'ramp';
        height = 3.5;
        width = 2.3;
      }
    } else if (envId === 'temple') {
      // Ancient Day Ruins has very high jump hurdle focus (barrier_low jumping over logs/stone slabs)
      if (rand < 0.25) {
        obsType = 'train';
        height = 4.2;
        width = 2.4;
      } else if (rand < 0.45) {
        obsType = 'barrier_high';
        height = 2.5;
      } else if (rand < 0.85) {
        obsType = 'barrier_low'; // 40% chance of low jump hurdle!
        height = 0.9;
      } else {
        obsType = 'ramp';
        height = 3.5;
        width = 2.3;
      }
    } else if (envId === 'theme_industrial') {
      // Industrial Yard is packed with heavy train cars rolling on active tracks!
      if (rand < 0.55) {
        obsType = 'train'; // 55% chance of rolling locomotives!
        height = 4.2;
        width = 2.4;
      } else if (rand < 0.70) {
        obsType = 'barrier_high';
        height = 2.5;
      } else if (rand < 0.85) {
        obsType = 'barrier_low';
        height = 0.9;
      } else {
        obsType = 'ramp';
        height = 3.5;
        width = 2.3;
      }
    } else {
      // Classic balanced street ratio
      if (rand < 0.35) {
        obsType = 'train';
        height = 4.2;
        width = 2.4;
      } else if (rand < 0.6) {
        obsType = 'barrier_high';
        height = 2.5;
      } else if (rand < 0.85) {
        obsType = 'barrier_low';
        height = 0.9;
      } else {
        obsType = 'ramp';
        height = 3.5;
        width = 2.3;
      }
    }

    const obsData: ObstacleType = {
      id: Math.random().toString(),
      x: laneIndex,
      z: this.nextObstacleZ,
      type: obsType,
      height,
      width
    };

    const group = new THREE.Group();
    group.position.set(laneIndex * GAME_CONFIG.LANE_WIDTH, 0, this.nextObstacleZ);

    if (obsType === 'train') {
      // Locomotive body - Deep crimson/navy/orange metals that match the real game
      let trainColor = '#991b1b'; // Classic Red Subway Surfers Train
      let trimColor = '#fbbf24';  // Safety gold/yellow trim stripe
      let trainMetal = 0.85;
      let trainRough = 0.15;

      if (this.activeEnv.id === 'cyber') {
        trainColor = '#0f172a'; // Glowing Cyber Slate
        trimColor = '#06b6d4';  // Neon Cyan trim
      } else if (this.activeEnv.id === 'theme_sunset') {
        trainColor = '#f59e0b'; // Gold metal
        trimColor = '#ef4444';  // Fire crimson trim
        trainMetal = 0.95;
      } else if (this.activeEnv.id === 'theme_midnight') {
        trainColor = '#1e3a8a'; // Deep Metro Blue
        trimColor = '#fbbf24';  // Gold safety trim
        trainMetal = 0.75;
      } else if (this.activeEnv.id === 'theme_industrial') {
        trainColor = '#7c2d12'; // Rust copper/orange metal
        trimColor = '#22c55e';  // Vibrant slime green trim
        trainMetal = 0.9;
      }

      // 1. Train Core Body
      const trainBodyGeo = new THREE.BoxGeometry(2.3, height, 15);
      const trainBodyMat = new THREE.MeshStandardMaterial({
        color: trainColor,
        roughness: trainRough,
        metalness: trainMetal
      });
      const trainBody = new THREE.Mesh(trainBodyGeo, trainBodyMat);
      trainBody.position.set(0, height / 2, 0);
      trainBody.castShadow = true;
      trainBody.receiveShadow = true;
      group.add(trainBody);

      // 2. Continuous Cream/Yellow/Cyan lateral trim stripes on both sides (Classic Surfers detail)
      const stripGeo = new THREE.BoxGeometry(0.04, 0.25, 14.8);
      const stripMat = new THREE.MeshStandardMaterial({
        color: trimColor,
        roughness: 0.3,
        metalness: 0.5,
        emissive: trimColor,
        emissiveIntensity: 0.15
      });
      const leftStripe = new THREE.Mesh(stripGeo, stripMat);
      leftStripe.position.set(-1.16, 2.1, 0);
      const rightStripe = new THREE.Mesh(stripGeo, stripMat);
      rightStripe.position.set(1.16, 2.1, 0);
      group.add(leftStripe);
      group.add(rightStripe);

      // 3. Passenger Side Windows (Black shiny glass with framing)
      const windowGeo = new THREE.BoxGeometry(0.04, 0.85, 1.4);
      const windowMat = new THREE.MeshStandardMaterial({
        color: '#090d16',
        roughness: 0.02,
        metalness: 0.95,
        emissive: '#1e293b',
        emissiveIntensity: 0.1
      });

      // Spawn 5 windows spaced out along the length of each side
      const windowZPositions = [-5.0, -2.5, 0.0, 2.5, 5.0];
      windowZPositions.forEach(zOffset => {
        const leftWindow = new THREE.Mesh(windowGeo, windowMat);
        leftWindow.position.set(-1.16, 3.2, zOffset);
        const rightWindow = new THREE.Mesh(windowGeo, windowMat);
        rightWindow.position.set(1.16, 3.2, zOffset);
        group.add(leftWindow);
        group.add(rightWindow);

        // Sub-frames for the windows to pop out visually
        const frameGeo = new THREE.BoxGeometry(0.06, 0.95, 1.5);
        const frameMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.8 });
        const leftFrame = new THREE.Mesh(frameGeo, frameMat);
        leftFrame.position.set(-1.155, 3.2, zOffset);
        const rightFrame = new THREE.Mesh(frameGeo, frameMat);
        rightFrame.position.set(1.155, 3.2, zOffset);
        group.add(leftFrame);
        group.add(rightFrame);
      });

      // 4. Ribbed Roof Top Corrugation (To make train roof details look exquisite)
      const roofPlateGeo = new THREE.BoxGeometry(2.1, 0.12, 14.8);
      const roofPlateMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.6, metalness: 0.7 });
      const roofPlate = new THREE.Mesh(roofPlateGeo, roofPlateMat);
      roofPlate.position.set(0, height + 0.05, 0);
      group.add(roofPlate);

      // Spawns 11 ventilation metal ribs on train roof
      for (let ribZ = -6.5; ribZ <= 6.5; ribZ += 1.3) {
        const ribGeo = new THREE.BoxGeometry(2.0, 0.06, 0.2);
        const ribMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.9 });
        const rib = new THREE.Mesh(ribGeo, ribMat);
        rib.position.set(0, height + 0.11, ribZ);
        group.add(rib);
      }

      // 5. High-Definition Front Windshield / Driver's window (facing +Z)
      const screenGeo = new THREE.BoxGeometry(2.1, 1.3, 0.3);
      const screenMat = new THREE.MeshStandardMaterial({
        color: '#0ea5e9', // Glass Aqua Blue
        roughness: 0.01,
        metalness: 0.95,
        emissive: '#0369a1',
        emissiveIntensity: 0.35
      });
      const screen = new THREE.Mesh(screenGeo, screenMat);
      screen.position.set(0, height - 0.9, 7.36);
      group.add(screen);

      // Windshield divide pillar central bar
      const pillarGeo = new THREE.BoxGeometry(0.12, 1.4, 0.35);
      const pillarMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.7 });
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(0, height - 0.9, 7.38);
      group.add(pillar);

      // 6. Glowing Circular Headlights (Yellow glowing bulbs at the front)
      const headlightGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.2, 16);
      headlightGeo.rotateX(Math.PI / 2);
      const lightBulbMat = new THREE.MeshBasicMaterial({ color: '#fef08a' }); // Extreme glowing yellow core
      const lightBezelMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', metalness: 0.9, roughness: 0.1 });

      // Volumetric headlight beam projecting forward
      const beamGeo = new THREE.CylinderGeometry(0.18, 1.8, 12.0, 10, 1, true);
      beamGeo.rotateX(Math.PI / 2); // align along Z axis
      beamGeo.translate(0, 0, 6.0); // shift center so the beam extends forward from local anchor
      const beamMat = new THREE.MeshBasicMaterial({
        color: '#fef08a',
        transparent: true,
        opacity: 0.14,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
      });

      for (const headlightX of [-0.65, 0.65]) {
        // glowing bulb core
        const bulb = new THREE.Mesh(headlightGeo, lightBulbMat);
        bulb.position.set(headlightX, 1.0, 7.52);
        bulb.name = "train_headlight";
        // silver bezel around the headlight
        const bezelGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.18, 16);
        bezelGeo.rotateX(Math.PI / 2);
        const bezel = new THREE.Mesh(bezelGeo, lightBezelMat);
        bezel.position.set(headlightX, 1.0, 7.48);

        // glowing beam
        const beam = new THREE.Mesh(beamGeo, beamMat);
        beam.position.set(headlightX, 1.0, 7.52);
        beam.name = "train_headlight_beam";

        group.add(bezel);
        group.add(bulb);
        group.add(beam);
      }

      // 7. Beautiful graffiti spray-paint overlay (Classic Subway Surfers Street Art)
      // Layer modular colorful flat graphics boards against both train side panels
      const grafColors = ['#f43f5e', '#a855f7', '#10b981', '#f59e0b', '#06b6d4']; // pink, purple, green, orange, cyan
      for (const sideX of [-1.155, 1.155]) {
        // Left & right tags
        const grafGroup = new THREE.Group();
        grafGroup.position.set(sideX, 1.0, 0);

        // Mix 4 overlapping colored block layers to resemble tag lettering graffiti elements
        for (let i = 0; i < 4; i++) {
          const blockGeo = new THREE.BoxGeometry(0.02, 0.35 + Math.random() * 0.45, 1.2 + Math.random() * 1.8);
          const blockColor = grafColors[(i + (sideX > 0 ? 2 : 0)) % grafColors.length];
          const blockMat = new THREE.MeshStandardMaterial({
            color: blockColor,
            roughness: 0.9,
            metalness: 0.0,
            emissive: blockColor,
            emissiveIntensity: 0.08
          });
          const block = new THREE.Mesh(blockGeo, blockMat);
          // offset slightly to overlap and avoid z-fighting
          block.position.set(
            (sideX > 0 ? 0.002 * i : -0.002 * i),
            0.15 * (i - 1.5),
            (i - 1.5) * 1.1
          );
          block.rotation.z = (Math.random() - 0.5) * 0.15;
          grafGroup.add(block);
        }
        group.add(grafGroup);
      }

      // 8. Train wheels
      for (let wheelZ = -6; wheelZ <= 6; wheelZ += 4) {
        for (const wheelX of [-1.15, 1.15]) {
          const wheelGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.35, 12);
          const wheelMat = new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.8, roughness: 0.3 });
          const wheel = new THREE.Mesh(wheelGeo, wheelMat);
          wheel.rotation.z = Math.PI / 2;
          wheel.position.set(wheelX, 0.4, wheelZ);
          wheel.castShadow = true;
          group.add(wheel);
        }
      }

      // 9. Front bumper guard plate with yellow chevrons
      const bumperGeo = new THREE.BoxGeometry(2.4, 0.5, 0.5);
      const bumperMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.7, metalness: 0.5 });
      const bumper = new THREE.Mesh(bumperGeo, bumperMat);
      bumper.position.set(0, 0.3, 7.6);
      bumper.castShadow = true;
      group.add(bumper);

      // Safety yellow warnings chevrons plates on bumper
      const chevGeo = new THREE.BoxGeometry(0.35, 0.4, 0.08);
      const chevMat = new THREE.MeshStandardMaterial({ color: '#fbbf24', roughness: 0.9 });
      for (const chevX of [-0.9, -0.45, 0, 0.45, 0.9]) {
        const chev = new THREE.Mesh(chevGeo, chevMat);
        chev.position.set(chevX, 0.3, 7.82);
        chev.rotation.z = Math.PI / 4; // Angle chevron stripe
        group.add(chev);
      }

    } else if (obsType === 'barrier_low') {
      if (envId === 'cyber') {
        // Futuristic floating laser gate
        const laserPostGeo = new THREE.BoxGeometry(0.18, height, 0.18);
        const postMat = new THREE.MeshStandardMaterial({ color: '#06b6d4', roughness: 0.1, metalness: 0.9, emissive: '#0891b2', emissiveIntensity: 0.3 });
        const leftPost = new THREE.Mesh(laserPostGeo, postMat);
        leftPost.position.set(-0.9, height / 2, 0);
        leftPost.castShadow = true;
        group.add(leftPost);

        const rightPost = new THREE.Mesh(laserPostGeo, postMat);
        rightPost.position.set(0.9, height / 2, 0);
        rightPost.castShadow = true;
        group.add(rightPost);

        // Pulsing Neon Pink Laser stream bar!
        const beamGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.0, 8);
        beamGeo.rotateZ(Math.PI / 2);
        const beamMat = new THREE.MeshBasicMaterial({ color: '#f43f5e' });
        const laser = new THREE.Mesh(beamGeo, beamMat);
        laser.position.set(0, height - 0.25, 0);
        group.add(laser);

        // Add small neon spark sphere on left/right connections
        const nodeGeo = new THREE.SphereGeometry(0.1, 8, 8);
        const nodeMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
        const nL = new THREE.Mesh(nodeGeo, nodeMat); nL.position.set(-0.9, height - 0.25, 0);
        const nR = new THREE.Mesh(nodeGeo, nodeMat); nR.position.set(0.9, height - 0.25, 0);
        group.add(nL); group.add(nR);

      } else if (envId === 'temple') {
        // Weathered mossy jungle logs
        const stonePostGeo = new THREE.CylinderGeometry(0.16, 0.18, height, 8);
        const woodMat = new THREE.MeshStandardMaterial({ color: '#3f220f', roughness: 0.95 }); // rich dark brown wood
        const mossMat = new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.9 });  // moss green

        const leftPost = new THREE.Mesh(stonePostGeo, woodMat);
        leftPost.position.set(-0.9, height / 2, 0);
        leftPost.castShadow = true;
        leftPost.rotation.y = Math.PI / 4;
        group.add(leftPost);

        // Moss tufts on top of post
        const mossLeft = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 6), mossMat);
        mossLeft.position.set(-0.9, height - 0.05, 0);
        group.add(mossLeft);

        const rightPost = new THREE.Mesh(stonePostGeo, woodMat);
        rightPost.position.set(0.9, height / 2, 0);
        rightPost.castShadow = true;
        rightPost.rotation.y = -Math.PI / 4;
        group.add(rightPost);

        const mossRight = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 6), mossMat);
        mossRight.position.set(0.9, height - 0.05, 0);
        group.add(mossRight);

        // Fallen mossy ancient tree trunk bar
        const logGeo = new THREE.CylinderGeometry(0.12, 0.12, 2.0, 8);
        logGeo.rotateZ(Math.PI / 2);
        const log = new THREE.Mesh(logGeo, woodMat);
        log.position.set(0, height - 0.3, 0);
        log.castShadow = true;
        group.add(log);

        const mossLog = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.8, 8), mossMat);
        mossLog.rotateZ(Math.PI / 2);
        mossLog.position.set(0.2, height - 0.3, 0.02);
        group.add(mossLog);

      } else if (envId === 'theme_industrial') {
        // Warning yellow hazard barricade with flashing siren light
        const steelPostGeo = new THREE.BoxGeometry(0.15, height, 0.15);
        const postMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.7, metalness: 0.8 });
        
        const leftPost = new THREE.Mesh(steelPostGeo, postMat);
        leftPost.position.set(-0.9, height / 2, 0);
        leftPost.castShadow = true;
        group.add(leftPost);

        const rightPost = new THREE.Mesh(steelPostGeo, postMat);
        rightPost.position.set(0.9, height / 2, 0);
        rightPost.castShadow = true;
        group.add(rightPost);

        // Barricade rail with striped chevron pattern
        const barGeo = new THREE.BoxGeometry(2.1, 0.3, 0.12);
        const barMat = new THREE.MeshStandardMaterial({ color: '#fbbf24', roughness: 0.4 });
        const mainBar = new THREE.Mesh(barGeo, barMat);
        mainBar.position.set(0, height - 0.25, 0);
        mainBar.castShadow = true;
        group.add(mainBar);

        // Warning dark metal stripes on the rail
        const stripeGeo = new THREE.BoxGeometry(0.25, 0.31, 0.13);
        const stripeMat = new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.8 });
        for (const stripeX of [-0.7, -0.35, 0, 0.35, 0.7]) {
          const stripe = new THREE.Mesh(stripeGeo, stripeMat);
          stripe.position.set(stripeX, height - 0.25, 0);
          stripe.rotation.z = Math.PI / 4;
          group.add(stripe);
        }

        // Blinking amber dome siren on top of barricade!
        const glassGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.12, 8);
        const beaconMat = new THREE.MeshBasicMaterial({ color: '#ea580c' });
        const siren = new THREE.Mesh(glassGeo, beaconMat);
        siren.position.set(0, height - 0.05, 0);
        siren.name = 'siren_beacon_low';
        group.add(siren);

      } else {
        // Classic yellow/orange street marker stripe barrier
        const barrierMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.6 });
        const standGeo = new THREE.BoxGeometry(0.15, height, 0.15);
        const leftStand = new THREE.Mesh(standGeo, barrierMat);
        leftStand.position.set(-0.9, height / 2, 0);
        leftStand.castShadow = true;
        group.add(leftStand);

        const rightStand = new THREE.Mesh(standGeo, barrierMat);
        rightStand.position.set(0.9, height / 2, 0);
        rightStand.castShadow = true;
        group.add(rightStand);

        const barGeo = new THREE.BoxGeometry(2.1, 0.3, 0.1);
        const barMat = new THREE.MeshStandardMaterial({ color: '#ef4444', roughness: 0.5 });
        const bar = new THREE.Mesh(barGeo, barMat);
        bar.position.set(0, height - 0.2, 0);
        bar.castShadow = true;
        group.add(bar);
      }

    } else if (obsType === 'barrier_high') {
      if (envId === 'cyber') {
        // Holographic cyber gate with descending energy beam mesh lines
        const postMat = new THREE.MeshStandardMaterial({ color: '#1e1b4b', metalness: 0.9, roughness: 0.1 });
        const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.15, height, 0.15), postMat);
        leftLeg.position.set(-1.0, height / 2, 0);
        leftLeg.castShadow = true;
        group.add(leftLeg);

        const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.15, height, 0.15), postMat);
        rightLeg.position.set(1.0, height / 2, 0);
        rightLeg.castShadow = true;
        group.add(rightLeg);

        // Cyber top casing bar
        const caseGeo = new THREE.BoxGeometry(2.3, 0.5, 0.4);
        const caseMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.4, metalness: 0.8 });
        const topCase = new THREE.Mesh(caseGeo, caseMat);
        topCase.position.set(0, height - 0.25, 0);
        group.add(topCase);

        // Glowing digital message screen board
        const textGeo = new THREE.BoxGeometry(1.6, 0.3, 0.05);
        const textMat = new THREE.MeshStandardMaterial({ color: '#0284c7', emissive: '#06b6d4', emissiveIntensity: 1.2 });
        const screen = new THREE.Mesh(textGeo, textMat);
        screen.position.set(0, height - 0.25, 0.21);
        group.add(screen);

        // Interactive neon light strip on the edge
        const neonGeo = new THREE.BoxGeometry(2.2, 0.06, 0.42);
        const neonMat = new THREE.MeshBasicMaterial({ color: '#ec4899' }); // neon pink indicator
        const neonLine = new THREE.Mesh(neonGeo, neonMat);
        neonLine.position.set(0, height - 0.48, 0);
        group.add(neonLine);

      } else if (envId === 'temple') {
        // Ancient weathered ruins structural pillar archway
        const pillarMat = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.95 }); // Slate grey stone
        const goldMat = new THREE.MeshStandardMaterial({ color: '#eab308', metalness: 0.9, roughness: 0.2, emissive: '#fbbf24', emissiveIntensity: 0.25 });
        
        const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, height, 6), pillarMat);
        leftLeg.position.set(-1.0, height / 2, 0);
        leftLeg.castShadow = true;
        group.add(leftLeg);

        const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, height, 6), pillarMat);
        rightLeg.position.set(1.0, height / 2, 0);
        rightLeg.castShadow = true;
        group.add(rightLeg);

        // Heavily detailed stone slab top arch
        const overhang = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.55, 0.55), pillarMat);
        overhang.position.set(0, height - 0.28, 0);
        overhang.castShadow = true;
        group.add(overhang);

        // Gold carved mystical sun emblem inside the center of the archway
        const medalGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.06, 12);
        medalGeo.rotateX(Math.PI / 2);
        const emblem = new THREE.Mesh(medalGeo, goldMat);
        emblem.position.set(0, height - 0.28, 0.29);
        group.add(emblem);

      } else if (envId === 'theme_industrial') {
        // Steel construction crane scaffolding archway
        const scaffoldMat = new THREE.MeshStandardMaterial({ color: '#ea580c', roughness: 0.5 }); // Hazard orange paint

        const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.15, height, 0.15), scaffoldMat);
        leftLeg.position.set(-1.0, height / 2, 0);
        leftLeg.castShadow = true;
        group.add(leftLeg);

        const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.15, height, 0.15), scaffoldMat);
        rightLeg.position.set(1.0, height / 2, 0);
        rightLeg.castShadow = true;
        group.add(rightLeg);

        // Double overhead lattice steel beams
        const topBeam1 = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.15, 0.15), scaffoldMat);
        topBeam1.position.set(0, height - 0.15, 0);
        topBeam1.castShadow = true;
        group.add(topBeam1);

        const topBeam2 = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.15, 0.15), scaffoldMat);
        topBeam2.position.set(0, height - 0.45, 0);
        topBeam2.castShadow = true;
        group.add(topBeam2);

        // Caution board inside beams
        const cautionPlat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.22, 0.04), new THREE.MeshStandardMaterial({ color: '#fbbf24', roughness: 0.6 }));
        cautionPlat.position.set(0, height - 0.3, 0.09);
        group.add(cautionPlat);

        // Little hanging caution stripes
        const stripeGeo = new THREE.BoxGeometry(0.18, 0.21, 0.05);
        const blackMat = new THREE.MeshStandardMaterial({ color: '#111827' });
        for (const sx of [-0.5, 0, 0.5]) {
          const str = new THREE.Mesh(stripeGeo, blackMat);
          str.position.set(sx, height - 0.3, 0.1);
          str.rotation.z = Math.PI / 4;
          group.add(str);
        }

      } else {
        // Classic municipal road construction tall barrier
        const barrierMat = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.7 });
        
        const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.15, height, 0.15), barrierMat);
        leftLeg.position.set(-1.0, height / 2, 0);
        leftLeg.castShadow = true;
        group.add(leftLeg);

        const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.15, height, 0.15), barrierMat);
        rightLeg.position.set(1.0, height / 2, 0);
        rightLeg.castShadow = true;
        group.add(rightLeg);

        const overhang = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.6, 0.3), barrierMat);
        overhang.position.set(0, height - 0.3, 0);
        overhang.castShadow = true;
        group.add(overhang);

        // CAUTION striped placard sign board
        const sign = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 0.05), new THREE.MeshStandardMaterial({ color: '#eab308' }));
        sign.position.set(0, height - 0.3, 0.18);
        group.add(sign);
      }

    } else if (obsType === 'ramp') {
      if (envId === 'cyber') {
        // Glowing futuristic hover glide deck
        const rampGeo = new THREE.BoxGeometry(2.0, 0.2, 8.0);
        const rampMat = new THREE.MeshStandardMaterial({ color: '#090d16', roughness: 0.05, metalness: 0.95 });
        const rampMesh = new THREE.Mesh(rampGeo, rampMat);
        rampMesh.rotation.x = -0.3;
        rampMesh.position.set(0, 0.8, -1.5);
        rampMesh.castShadow = true;
        rampMesh.receiveShadow = true;
        group.add(rampMesh);

        // Hot glowing neon cyan runway side guides!
        const guideGeo = new THREE.BoxGeometry(0.08, 0.25, 7.95);
        const guideMat = new THREE.MeshBasicMaterial({ color: '#00f0ff' });
        const lG = new THREE.Mesh(guideGeo, guideMat); lG.position.set(-1.01, 0.2, 0);
        const rG = new THREE.Mesh(guideGeo, guideMat); rG.position.set(1.01, 0.2, 0);
        rampMesh.add(lG); rampMesh.add(rG);

        // Neon deck chevrons indicating upward velocity
        const arrowGeo = new THREE.BoxGeometry(0.4, 0.015, 0.12);
        const arrowMat = new THREE.MeshBasicMaterial({ color: '#ff007f' });
        for (let i = -3; i <= 3; i++) {
          const arrow = new THREE.Mesh(arrowGeo, arrowMat);
          arrow.position.set(0, 0.12, i * 1.0);
          arrow.rotation.y = Math.PI / 4; // slant arrows
          rampMesh.add(arrow);
        }

        // Support container under ramp (futuristic digital storage cell)
        const cellGeo = new THREE.BoxGeometry(2.0, 1.8, 1.8);
        const cellMat = new THREE.MeshStandardMaterial({ color: '#001a33', roughness: 0.2, metalness: 0.9, emissive: '#004c80', emissiveIntensity: 0.3 });
        const cell = new THREE.Mesh(cellGeo, cellMat);
        cell.position.set(0, 0.9, -4.5);
        cell.castShadow = true;
        group.add(cell);

      } else if (envId === 'temple') {
        // Ancient ruins stone/masonry staircase ramp
        const stoneMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.95 }); // aged cracked stone
        const goldMat = new THREE.MeshStandardMaterial({ color: '#eab308', metalness: 0.9, roughness: 0.1, emissive: '#facc15', emissiveIntensity: 0.2 });
        
        const rampMesh = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.2, 8.0), stoneMat);
        rampMesh.rotation.x = -0.3;
        rampMesh.position.set(0, 0.8, -1.5);
        rampMesh.castShadow = true;
        rampMesh.receiveShadow = true;
        group.add(rampMesh);

        // Ancient golden decorative trims on ramp edges
        const rTrimL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, 7.95), goldMat); rTrimL.position.set(-0.95, 0.12, 0);
        const rTrimR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, 7.95), goldMat); rTrimR.position.set(0.95, 0.12, 0);
        rampMesh.add(rTrimL); rampMesh.add(rTrimR);

        // Ancient block support pedestal
        const petMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.98 });
        const pedestal = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.8, 1.8), petMat);
        pedestal.position.set(0, 0.9, -4.5);
        pedestal.castShadow = true;
        group.add(pedestal);

        // Gold ancient glyph plates on pedestal
        const plate = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 0.08), goldMat);
        plate.position.set(0, 0.9, -3.55); // front face
        group.add(plate);

      } else if (envId === 'theme_industrial') {
        // Metal corrugated shipping container slope
        const ironMat = new THREE.MeshStandardMaterial({ color: '#7c2d12', metalness: 0.85, roughness: 0.3 }); // Rust copper iron
        
        const rampMesh = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.2, 8.0), ironMat);
        rampMesh.rotation.x = -0.3;
        rampMesh.position.set(0, 0.8, -1.5);
        rampMesh.castShadow = true;
        rampMesh.receiveShadow = true;
        group.add(rampMesh);

        // Warning striped edges
        const stripeGeo = new THREE.BoxGeometry(0.1, 0.15, 7.95);
        const stripeMat = new THREE.MeshStandardMaterial({ color: '#fbbf24', roughness: 0.5 }); // yellow hazard lines
        const lStripe = new THREE.Mesh(stripeGeo, stripeMat); lStripe.position.set(-0.98, 0.12, 0);
        const rStripe = new THREE.Mesh(stripeGeo, stripeMat); rStripe.position.set(0.98, 0.12, 0);
        rampMesh.add(lStripe); rampMesh.add(rStripe);

        // Supporting Cargo box
        const containerMat = new THREE.MeshStandardMaterial({ color: '#0f172a', metalness: 0.9, roughness: 0.1 });
        const helperBox = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.8, 1.8), containerMat);
        helperBox.position.set(0, 0.9, -4.5);
        helperBox.castShadow = true;
        group.add(helperBox);

        // Glowing cargo shipping labels
        const labels = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 1.82), new THREE.MeshBasicMaterial({ color: '#22c55e' }));
        labels.position.set(0, 0.9, -4.5);
        group.add(labels);

      } else {
        // Classic wood ramp
        const rampGeo = new THREE.BoxGeometry(2.0, 0.2, 8.0);
        const rampMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.9 });
        const rampMesh = new THREE.Mesh(rampGeo, rampMat);
        // Slope ramp
        rampMesh.rotation.x = -0.3; // Tilt slanting back
        rampMesh.position.set(0, 0.8, -1.5);
        rampMesh.castShadow = true;
        rampMesh.receiveShadow = true;
        group.add(rampMesh);

        // Support boxes
        const supGeo = new THREE.BoxGeometry(2.0, 1.8, 1.8);
        const sup = new THREE.Mesh(supGeo, rampMat);
        sup.position.set(0, 0.9, -4.5);
        sup.castShadow = true;
        group.add(sup);
      }
    }

    this.scene.add(group);
    this.obstacleMeshes.push({
      id: obsData.id,
      mesh: group,
      data: obsData
    });

    // Spawn aligned coin strings for specific obstacle setups with Super Coin bonuses!
    if (obsType === 'train') {
      // Spawn 5 coins on top of the train roof (height = 4.4); make the middle one a Super Coin!
      for (let i = -2; i <= 2; i++) {
        this.spawnCoinAt(laneIndex, 4.4, this.nextObstacleZ + i * 2.8, i === 0);
      }
    } else if (obsType === 'ramp') {
      // Spawn 4 coins smoothly climbing up the ramp; make the top one a Super Coin!
      const heights = [1.2, 2.0, 2.8, 3.6];
      for (let i = 0; i < 4; i++) {
        const cZ = this.nextObstacleZ + 2.0 - (i * 2.2);
        this.spawnCoinAt(laneIndex, heights[i], cZ, i === 3);
      }
    } else if (obsType === 'barrier_low') {
      // Spawn a beautiful jump arch over the low barrier; make the peak one a Super Coin!
      const heights = [1.1, 2.2, 3.1, 2.2, 1.1];
      for (let i = 0; i < 5; i++) {
        const cZ = this.nextObstacleZ + 6.0 - (i * 3.0);
        this.spawnCoinAt(laneIndex, heights[i], cZ, i === 2);
      }
    } else if (obsType === 'barrier_high') {
      // Slide indicator coins: extremely low leading into/out of barrier (sliding underneath awards a peak Super Coin!)
      this.spawnCoinAt(laneIndex, 0.6, this.nextObstacleZ + 4.5);
      this.spawnCoinAt(laneIndex, 0.6, this.nextObstacleZ + 2.0, true);
      this.spawnCoinAt(laneIndex, 0.6, this.nextObstacleZ - 2.0);
      this.spawnCoinAt(laneIndex, 0.6, this.nextObstacleZ - 4.5);
    }

    // Also spawn a random power-up if lucky
    if (Math.random() > 0.88 && obsType !== 'ramp') {
      this.spawnPowerUp(laneIndex, this.nextObstacleZ - 8);
    }
  }

  // Handy direct coin spawning helper (Supports regular gold coins or advanced high-tier amethyst Super Coins)
  private spawnCoinAt(x: number, y: number, z: number, isSuper: boolean = false) {
    if (!this.coinGeometry) {
      this.coinGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.08, 12);
      this.coinGeometry.rotateX(Math.PI / 2);
    }
    if (!this.coinMaterial) {
      this.coinMaterial = new THREE.MeshStandardMaterial({
        color: '#fbbf24', // Rich gold metal
        metalness: 0.95,
        roughness: 0.15,
        emissive: '#d97706', // Amber metallic core glow
        emissiveIntensity: 0.25
      });
    }
    if (!this.superCoinGeometry) {
      this.superCoinGeometry = new THREE.OctahedronGeometry(0.38, 0);
    }
    if (!this.superCoinMaterial) {
      this.superCoinMaterial = new THREE.MeshStandardMaterial({
        color: '#d8b4fe', // neon purple
        metalness: 0.9,
        roughness: 0.1,
        emissive: '#a855f7', // intense amethyst glow
        emissiveIntensity: 0.85
      });
    }

    const data: CoinType = {
      id: Math.random().toString(),
      x,
      z,
      y,
      isSuperCoin: isSuper,
      superCoinValue: isSuper ? 5 : 1
    };

    const mesh = new THREE.Mesh(isSuper ? this.superCoinGeometry : this.coinGeometry, isSuper ? this.superCoinMaterial : this.coinMaterial);
    mesh.position.set(x * GAME_CONFIG.LANE_WIDTH, y, z);
    mesh.receiveShadow = true;
    mesh.castShadow = true;

    this.scene.add(mesh);
    this.coinMeshes.push({
      id: data.id,
      mesh,
      data
    });
  }

  // Spawning power ups
  private spawnPowerUp(laneIdx: number, zCoord: number) {
    const types: ('magnet' | 'multiplier' | 'shield' | 'boost')[] = ['magnet', 'multiplier', 'shield', 'boost'];
    const selectedType = types[Math.floor(Math.random() * types.length)];

    const data: PowerUpType = {
      id: Math.random().toString(),
      x: laneIdx,
      z: zCoord,
      type: selectedType
    };

    const group = new THREE.Group();
    group.position.set(laneIdx * GAME_CONFIG.LANE_WIDTH, 1.4, zCoord);

    // Dynamic modeling
    if (selectedType === 'magnet') {
      // Shoe shaped magnet
      const shoeGeo = new THREE.TorusGeometry(0.35, 0.12, 8, 16, Math.PI);
      const shoeMat = new THREE.MeshStandardMaterial({ color: '#ef4444', roughness: 0.2, metalness: 0.7 });
      const shoe = new THREE.Mesh(shoeGeo, shoeMat);
      shoe.rotation.x = Math.PI / 2;
      group.add(shoe);

      const tipsGeo = new THREE.BoxGeometry(0.12, 0.12, 0.2);
      const tipsMat = new THREE.MeshStandardMaterial({ color: '#f8fafc' });
      for (const tipsX of [-0.35, 0.35]) {
        const tip = new THREE.Mesh(tipsGeo, tipsMat);
        tip.position.set(tipsX, 0, 0.1);
        group.add(tip);
      }
    } else if (selectedType === 'multiplier') {
      // Star representation
      const starGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.15, 5);
      const starMat = new THREE.MeshStandardMaterial({
        color: '#facc15',
        emissive: '#facc15',
        emissiveIntensity: 0.4,
        roughness: 0.2
      });
      const star = new THREE.Mesh(starGeo, starMat);
      star.rotation.x = Math.PI / 2;
      group.add(star);
    } else if (selectedType === 'shield') {
      // Glow shield disk
      const shieldGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.08, 16);
      const shieldMat = new THREE.MeshStandardMaterial({
        color: '#3b82f6',
        emissive: '#3b82f6',
        opacity: 0.7,
        transparent: true
      });
      const shield = new THREE.Mesh(shieldGeo, shieldMat);
      shield.rotation.x = Math.PI / 2;
      group.add(shield);
    } else if (selectedType === 'boost') {
      // Sleek orange rocket booster with yellow emission nozzle!
      const thrusterMat = new THREE.MeshStandardMaterial({ color: '#f97316', metalness: 0.8, roughness: 0.2 });
      const nozzleMat = new THREE.MeshStandardMaterial({ color: '#eab308', emissive: '#eab308', emissiveIntensity: 2 });
      
      const barrelGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.5, 8);
      const barrel = new THREE.Mesh(barrelGeo, thrusterMat);
      barrel.rotation.x = Math.PI / 4;
      barrel.position.set(0, 0, 0);
      group.add(barrel);

      const nozzleGeo = new THREE.CylinderGeometry(0.1, 0.15, 0.15, 8);
      const nozzle = new THREE.Mesh(nozzleGeo, nozzleMat);
      nozzle.rotation.x = Math.PI / 4;
      nozzle.position.set(0, -0.28, -0.15);
      group.add(nozzle);
    }

    this.scene.add(group);
    this.powerUpMeshes.push({
      id: data.id,
      mesh: group,
      data
    });
  }

  // Spawning coins in continuous, authentic Subway Surfer patterns!
  private spawnCoinChunk() {
    // Dynamic coin spacing based on score: decreases spacing slightly as score increases
    const scoreFactor = Math.min(0.5, this.currentScore / 20000);
    const coinSpacing = 10 - (4 * scoreFactor); // scales spacing down from 10 to 6
    this.nextCoinZ -= coinSpacing; // Space out the start of pattern chains

    // Determine target pattern
    let patternType: 'ground_straight' | 'parabolic_arch' | 'train_riding' | 'zig_zag' | 'jetpack_booster_flight' = 'ground_straight';
    
    if (this.activeBoost) {
      patternType = 'jetpack_booster_flight';
    } else {
      const rolled = Math.random();
      if (rolled < 0.35) {
        patternType = 'ground_straight';
      } else if (rolled < 0.65) {
        patternType = 'parabolic_arch';
      } else if (rolled < 0.85) {
        patternType = 'train_riding';
      } else {
        patternType = 'zig_zag';
      }
    }

    const laneIndex = Math.floor(Math.random() * 3) - 1; // Base reference lane (-1, 0, or 1)
    
    // Construct pattern coordinates
    const coinsToSpawn: { x: number; y: number; z: number }[] = [];

    if (patternType === 'jetpack_booster_flight') {
      // 8 coins in high-altitude wavy curves
      const count = 8;
      for (let i = 0; i < count; i++) {
        const offsetZ = this.nextCoinZ - (i * 3.5);
        const cycleX = Math.sin((offsetZ) * 0.1) * 1.5; // Smooth sweeping curve
        const waveY = 7.5 + Math.sin((offsetZ) * 0.25) * 0.75;
        coinsToSpawn.push({
          x: cycleX, // Decimal lane coordinates are fine for drawing & collision detection
          y: waveY,
          z: offsetZ
        });
      }
      this.nextCoinZ -= (count * 3.5) + 12; // Advance generator position
    } 
    else if (patternType === 'ground_straight') {
      // 5 consecutive coins on a single lane at ground height
      const count = 5;
      for (let i = 0; i < count; i++) {
        const offsetZ = this.nextCoinZ - (i * 3.2);
        coinsToSpawn.push({
          x: laneIndex,
          y: 1.1,
          z: offsetZ
        });
      }
      this.nextCoinZ -= (count * 3.2) + 12;
    } 
    else if (patternType === 'parabolic_arch') {
      // 5 coins forming a jump curve arch
      const heights = [1.1, 2.3, 3.2, 2.3, 1.1];
      for (let i = 0; i < heights.length; i++) {
        const offsetZ = this.nextCoinZ - (i * 3.0);
        coinsToSpawn.push({
          x: laneIndex,
          y: heights[i],
          z: offsetZ
        });
      }
      this.nextCoinZ -= (heights.length * 3.0) + 12;
    } 
    else if (patternType === 'train_riding') {
      // 6 coins placed high up aligning with train roofs
      const count = 6;
      for (let i = 0; i < count; i++) {
        const offsetZ = this.nextCoinZ - (i * 3.0);
        coinsToSpawn.push({
          x: laneIndex,
          y: 4.4, // Match train roof height coordinates (4.2 + offset)
          z: offsetZ
        });
      }
      this.nextCoinZ -= (count * 3.0) + 12;
    } 
    else if (patternType === 'zig_zag') {
      // 5 coins zig-zagging between lanes to test rapid steering reflex
      const sequence = [
        { lane: -1, zOffset: 0 },
        { lane: 0, zOffset: 4 },
        { lane: 1, zOffset: 8 },
        { lane: 0, zOffset: 12 },
        { lane: -1, zOffset: 16 }
      ];
      sequence.forEach(s => {
        coinsToSpawn.push({
          x: s.lane,
          y: 1.1,
          z: this.nextCoinZ - s.zOffset
        });
      });
      this.nextCoinZ -= 16 + 12;
    }

    // Allocate cylinder geometry and standard material if not already instantiated
    if (!this.coinGeometry) {
      this.coinGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.08, 12);
      this.coinGeometry.rotateX(Math.PI / 2); // Rotate coin face upright
    }
    if (!this.coinMaterial) {
      this.coinMaterial = new THREE.MeshStandardMaterial({
        color: '#fbbf24', // Rich gold metal
        metalness: 0.95,
        roughness: 0.15,
        emissive: '#d97706', // Amber metallic core glow
        emissiveIntensity: 0.25
      });
    }
    if (!this.superCoinGeometry) {
      this.superCoinGeometry = new THREE.OctahedronGeometry(0.38, 0);
    }
    if (!this.superCoinMaterial) {
      this.superCoinMaterial = new THREE.MeshStandardMaterial({
        color: '#d8b4fe', // neon purple
        metalness: 0.9,
        roughness: 0.1,
        emissive: '#a855f7', // intense amethyst glow
        emissiveIntensity: 0.85
      });
    }

    // Spawn each coin in the generated pattern
    coinsToSpawn.forEach(coin => {
      // Find what height a coin should actually be at if there's an obstacle underneath
      let finalY = coin.y;
      const roundedX = Math.round(coin.x);
      
      const underlyingObs = this.obstacleMeshes.find(o => 
        o.data.x === roundedX && 
        Math.abs(o.mesh.position.z - coin.z) < 8.0
      );

      if (underlyingObs) {
        if (underlyingObs.data.type === 'train') {
          finalY = 4.4; // ride train roof
        } else if (underlyingObs.data.type === 'ramp') {
          // slope height climb
          const distZ = Math.max(0, Math.min(8.0, (underlyingObs.mesh.position.z + 4.0) - coin.z));
          const progress = distZ / 8.0;
          finalY = 1.1 + progress * 2.8;
        } else if (underlyingObs.data.type === 'barrier_low') {
          finalY = 3.2; // jump arch
        } else if (underlyingObs.data.type === 'barrier_high') {
          finalY = 0.6; // slide helper
        }
      }

      // 12% probability of a Super Coin (glow amethyst shape with 5x value!)
      const isSuper = Math.random() > 0.88;

      const data: CoinType = {
        id: Math.random().toString(),
        x: coin.x,
        z: coin.z,
        y: finalY,
        isSuperCoin: isSuper,
        superCoinValue: isSuper ? 5 : 1
      };

      const mesh = new THREE.Mesh(isSuper ? this.superCoinGeometry : this.coinGeometry, isSuper ? this.superCoinMaterial : this.coinMaterial);
      mesh.position.set(coin.x * GAME_CONFIG.LANE_WIDTH, finalY, coin.z);
      mesh.receiveShadow = true;
      mesh.castShadow = true;

      this.scene.add(mesh);
      this.coinMeshes.push({
        id: data.id,
        mesh,
        data
      });
    });
  }

  // Clean-up and recycle objects past user coordinates
  private recycleElements() {
    // 1. Recycle coins
    for (let i = this.coinMeshes.length - 1; i >= 0; i--) {
      const coin = this.coinMeshes[i];
      if (coin.mesh.position.z > 20 || coin.data.collected) {
        this.scene.remove(coin.mesh);
        this.coinMeshes.splice(i, 1);
      }
    }

    // Spawning new coins if count is low
    if (this.coinMeshes.length < 25) {
      this.spawnCoinChunk();
    }

    // 2. Recycle Obstacles
    for (let i = this.obstacleMeshes.length - 1; i >= 0; i--) {
      const obstacle = this.obstacleMeshes[i];
      if (obstacle.mesh.position.z > 20) {
        this.scene.remove(obstacle.mesh);
        this.obstacleMeshes.splice(i, 1);
      }
    }

    // Refresh obstacles
    if (this.obstacleMeshes.length < 7) {
      this.spawnObstacleChunk();
    }

    // 3. Recycle Power-ups
    for (let i = this.powerUpMeshes.length - 1; i >= 0; i--) {
      const powerup = this.powerUpMeshes[i];
      if (powerup.mesh.position.z > 20 || powerup.data.collected) {
        this.scene.remove(powerup.mesh);
        this.powerUpMeshes.splice(i, 1);
      }
    }

    // 4. Recycle buildings scenery
    for (let i = this.sceneryMeshes.length - 1; i >= 0; i--) {
      const scMesh = this.sceneryMeshes[i];
      if (scMesh.position.z > 30) {
        this.scene.remove(scMesh);
        this.sceneryMeshes.splice(i, 1);
      }
    }

    if (this.sceneryMeshes.length < 20) {
      this.spawnSceneryChunk();
    }
  }

  // The Curvature Warping Engine
  private applyCurvatureWarp() {
    // Offset scenery, coins, obstacles along Y based on quadratic equations of endless horizon
    const cameraZ = this.camera.position.z;
    
    // Smoothly transition track curvature
    this.currentCurvatureX += (this.targetCurvatureX - this.currentCurvatureX) * 0.05;

    const warpY = GAME_CONFIG.TRACK_CURVATURE_Y;
    const warpX = this.currentCurvatureX;

    const itemsToWarp = [
      ...this.coinMeshes.map(c => c.mesh),
      ...this.obstacleMeshes.map(o => o.mesh),
      ...this.sceneryMeshes,
      ...this.powerUpMeshes.map(p => p.mesh)
    ];

    for (const mesh of itemsToWarp) {
      const distZ = mesh.position.z - cameraZ;
      if (distZ < 0) {
        const offsetZSquare = distZ * distZ;
        
        // Offset Y
        mesh.translateY(offsetZSquare * warpY * 0.003); // Quick adjustments
        // Offset X
        mesh.translateX(offsetZSquare * warpX * 0.003);
      }
    }

    // Warp the track mesh representations
    this.trackGroup.children.forEach((trackPart) => {
      // Simply slope entire tracks or individual vertices (sloping rails looks cooler)
    });
  }

  // Core Game loop updates
  public update(deltaTime: number) {
    if (!this.isPlaying) {
      // Just update idle sway/breathing animations so the home screen character feels alive!
      const time = Date.now() * 0.0055;
      if (this.leftArmMesh && this.rightArmMesh && this.leftLegMesh && this.rightLegMesh && this.characterGroup && this.boardMesh) {
        // Aesthetic breathing and gentle idle arm shifts
        this.leftArmMesh.rotation.set(0, 0, -0.15 + Math.sin(time * 2.2) * 0.04);
        this.rightArmMesh.rotation.set(0, 0, 0.15 - Math.sin(time * 2.2) * 0.04);
        this.leftLegMesh.rotation.set(0, 0, 0);
        this.rightLegMesh.rotation.set(0, 0, 0);
        
        // Smoothly rotate the character model over time
        const targetMenuY = this.isDead ? Math.PI : 0;
        this.characterGroup.rotation.x += (0 - this.characterGroup.rotation.x) * 10 * deltaTime;
        this.characterGroup.rotation.y += (targetMenuY - this.characterGroup.rotation.y) * 10 * deltaTime;
        this.characterGroup.rotation.z += (0 - this.characterGroup.rotation.z) * 10 * deltaTime;
        
        this.boardMesh.rotation.set(0, Math.cos(time * 0.5) * 0.08, Math.sin(time) * 0.12);
        
        // Soft up-down breathing bobbing
        this.characterGroup.position.set(this.playerX, this.playerY + Math.sin(time * 2.5) * 0.035, this.playerZ);
      }
      
      // Return gaze straight back home during idle breathing
      if (this.headMesh) {
        this.headMesh.rotation.set(0, 0, 0);
      }

      // Smoothly recover scales on menu
      this.currentScaleX += (1.0 - this.currentScaleX) * 10 * deltaTime;
      this.currentScaleY += (1.0 - this.currentScaleY) * 10 * deltaTime;
      this.currentScaleZ += (1.0 - this.currentScaleZ) * 10 * deltaTime;
      if (this.characterGroup) {
        this.characterGroup.scale.set(this.currentScaleX, this.currentScaleY, this.currentScaleZ);
      }
      
      // Update board visible based on shield/boost status
      if (this.boardGroup) {
        this.boardGroup.visible = this.activeShield || this.activeBoost;
      }
      
      // Update weather at gentle menu wind speed
      this.updateDynamicWeather(deltaTime, 3);
      return;
    }

    // 1. Slow rate accelerate maximum surfs
    if (this.scrollSpeed < GAME_CONFIG.MAX_SPEED) {
      this.scrollSpeed += GAME_CONFIG.SPEED_INCREMENT * deltaTime;
    }

    // Dynamic speed increase tied to score:
    // Gradually increase the scroll velocity as the player's score increases.
    // For every 1,000 score points, we add 0.4 to the scroll speed, up to a maximum boost of +35 speed.
    const scoreSpeedBoost = Math.min(35, (this.currentScore / 1000) * 0.4);
    const scoreBasedSpeed = this.scrollSpeed + scoreSpeedBoost;

    // Boost speed additions
    const activeSpeed = this.activeBoost ? (scoreBasedSpeed + 30) : scoreBasedSpeed;

    // Convey the dynamic speed back to React UI for Tunnel Vision / Motion Blur post-processing
    const speedFactor = Math.max(0, Math.min(1.0, (activeSpeed - 20) / 60));
    this.callbacks.onSpeedUpdated(speedFactor);

    // Continuous trailing particle spark stream emitted relative to current character skins
    this.emitTrailParticles(deltaTime, activeSpeed);

    // Score ticker uses active speed
    this.scoreTicker += deltaTime * 12 * activeSpeed * 0.1 * this.scoreMultiplier;
    const pointsToAdd = Math.floor(this.scoreTicker);
    if (pointsToAdd > 0) {
      this.currentScore += pointsToAdd;
      this.scoreTicker = 0;
      this.callbacks.onScoreUpdated(this.currentScore);
    }

    // Dynamic track curves timing
    if (Math.random() > 0.99) {
      this.targetCurvatureX = (Math.random() - 0.5) * 0.0004;
    }

    // 2. Adjust character position with smooth lateral lerping
    this.playerX += (this.playerTargetX - this.playerX) * 16 * deltaTime;

    // JUMP Gravity calculations
    if (this.activeBoost) {
      // Jetpack flight: Fly above all obstacles with smooth ascending interpolation
      this.playerY += (7.5 - this.playerY) * 6 * deltaTime;
      this.playerVelocityY = 0;
      this.isJumping = false;
    } else if (this.isJumping) {
      this.playerVelocityY += GAME_CONFIG.GRAVITY * deltaTime;
      this.playerY += this.playerVelocityY * deltaTime;

      // Stretch vertically in mid-air based on velocity
      const velFactor = Math.min(0.2, Math.max(-0.2, this.playerVelocityY / GAME_CONFIG.JUMP_FORCE));
      this.currentScaleY = 1.18 + velFactor * 0.45;
      this.currentScaleX = 0.88 - velFactor * 0.22;
      this.currentScaleZ = 0.88 - velFactor * 0.22;

      if (this.playerY <= 0) {
        this.playerY = 0;
        this.playerVelocityY = 0;
        this.isJumping = false;
        
        // Intense landing squash impact to express speed!
        this.currentScaleY = 0.62;
        this.currentScaleX = 1.28;
        this.currentScaleZ = 1.28;
        this.playSynthesizedSound('scrape'); // landing feedback thud sound
      }
    }

    // SLIDE Timing calculations
    if (this.isSliding) {
      this.slideTimer -= deltaTime;
      if (this.slideTimer <= 0) {
        this.isSliding = false;
      }
    }

    // Set complete position
    this.characterGroup.position.set(this.playerX, this.playerY, this.playerZ);

    // Boost styling particle trail sparks
    if (this.activeBoost && Math.random() > 0.4) {
      this.triggerCoinCelebration(this.playerX + (Math.random() - 0.5) * 0.6, this.playerY + 0.2, this.playerZ + 1.2, '#f97316');
    }

    // Hoverboard spark trails under player feet
    if (this.activeShield && Math.random() > 0.5) {
      this.triggerCoinCelebration(this.playerX + (Math.random() - 0.5) * 0.4, this.playerY + 0.1, this.playerZ + 0.8, '#22d3ee');
    }

    // Dynamic warp fov field of view transitions
    const targetFov = this.activeBoost ? 75 : 60;
    if (Math.abs(this.camera.fov - targetFov) > 0.1) {
      this.camera.fov += (targetFov - this.camera.fov) * 5 * deltaTime;
      this.camera.updateProjectionMatrix();
    }

    // Toggle board visibility based on active shield/boost or menu presentation
    if (this.boardGroup) {
      this.boardGroup.visible = this.activeShield || this.activeBoost || !this.isPlaying;
    }

    // Procedural running, jumping, and sliding limbs sway!
    const time = Date.now() * 0.005;

    // Running speed calculation for biomechanics timing:
    const swingFactor = this.isPlaying ? this.scrollSpeed : 0.0;
    const limbFreq = Date.now() * 0.016 * (1.0 + swingFactor * 0.06);

    // Advanced Subway Surfers physical reactive yaw and roll:
    // As the player switches lanes, they lean their body side-to-side (roll) and turn slightly into the direction (yaw).
    const lateralGap = this.playerTargetX - this.playerX;
    const rollAngle = lateralGap * -0.15; // deeper physical roll banking
    const yawAngle = lateralGap * 0.18;  // active athletic yaw turning in direction of lane switch

    // Let's determine target rotations for the characterGroup
    let targetRotX = 0;
    let targetRotY = Math.PI + yawAngle;
    let targetRotZ = rollAngle;

    if (this.isPlaying && !this.isJumping && !this.isSliding && !this.activeBoost) {
      if (this.activeShield) {
        // SKATING STATE: Board is active! Stop running leg strides, stand in an athletic skater/surf pose
        const bounce = Math.sin(time * 3) * 0.03;
        
        // Plant legs firmly on the board, knees slightly bent for balance
        this.leftLegMesh.rotation.set(0.18, 0, -0.05);
        this.rightLegMesh.rotation.set(-0.15, 0, 0.05);

        // Spread arms out wide for style and balance
        this.leftArmMesh.rotation.set(0.1, 0, -0.55 + bounce);
        this.rightArmMesh.rotation.set(-0.1, 0, 0.55 - bounce);

        // Turn character body/hips slightly sideways (classic board surfing stance) with dynamic banking roll and yaw
        targetRotY = Math.PI - Math.PI / 4.5 + yawAngle;
        targetRotX = 0;

        // Smoothly wobbling board underneath feet
        this.boardMesh.rotation.set(Math.sin(time * 2.5) * 0.04, Math.cos(time * 1.5) * 0.06, Math.sin(time) * 0.08);

        // Low frequency floating bobbing for smooth surfing feel
        this.characterGroup.position.y = this.playerY + Math.sin(time * 3) * 0.05;
      } else {
        // RUNNING STATE: Running on foot (surfboard is hidden!). High-knee workout strides!
        const legAngle = Math.sin(limbFreq) * 0.72; // deep high knee lift
        this.leftLegMesh.rotation.x = legAngle;
        this.rightLegMesh.rotation.x = -legAngle;

        // Arms swing cross-body pattern (out of phase with legs)
        this.leftArmMesh.rotation.x = -legAngle * 0.85;
        this.rightArmMesh.rotation.x = legAngle * 0.85;

        // Flaunting bounce with running steps
        this.leftArmMesh.rotation.z = -0.15 + Math.cos(limbFreq * 2) * 0.06;
        this.rightArmMesh.rotation.z = 0.15 - Math.cos(limbFreq * 2) * 0.06;

        this.leftLegMesh.rotation.z = 0;
        this.rightLegMesh.rotation.z = 0;

        // Face straight ahead while running with dynamic banking roll and turn yaw
        targetRotY = Math.PI + yawAngle;
        targetRotX = 0;

        // Run step body bobbing
        this.characterGroup.position.y = this.playerY + Math.abs(Math.sin(limbFreq)) * 0.14;
      }
    } else if (this.isJumping) {
      // Jump state: Arms flared up in high velocity pose, legs bent
      const lerpSpeed = 12 * deltaTime;
      this.leftArmMesh.rotation.x += (-Math.PI * 0.85 - this.leftArmMesh.rotation.x) * lerpSpeed;
      this.rightArmMesh.rotation.x += (-Math.PI * 0.85 - this.rightArmMesh.rotation.x) * lerpSpeed;
      this.leftArmMesh.rotation.z += (-0.4 - this.leftArmMesh.rotation.z) * lerpSpeed;
      this.rightArmMesh.rotation.z += (0.4 - this.rightArmMesh.rotation.z) * lerpSpeed;

      this.leftLegMesh.rotation.x += (Math.PI * 0.3 - this.leftLegMesh.rotation.x) * lerpSpeed;
      this.rightLegMesh.rotation.x += (-Math.PI * 0.1 - this.rightLegMesh.rotation.x) * lerpSpeed;

      // Spin whole body around the board for a wicked ninja flip with lateral trace lean!
      const jumpProgress = Math.max(-1.0, Math.min(1.0, this.playerVelocityY / GAME_CONFIG.JUMP_FORCE));
      this.characterGroup.rotation.x = (1.0 - jumpProgress) * -Math.PI; // Full backflip spin!
      targetRotY = this.activeShield ? Math.PI - Math.PI / 4.5 + yawAngle : Math.PI + yawAngle; // maintain side stance if skating
      targetRotZ = rollAngle;
      this.boardMesh.rotation.set(0, 0, 0);
    } else if (this.isSliding) {
      // Slide state: character curls up tightly, arms pulled in
      const lerpSpeed = 15 * deltaTime;
      this.leftArmMesh.rotation.x += (Math.PI * 0.5 - this.leftArmMesh.rotation.x) * lerpSpeed;
      this.rightArmMesh.rotation.x += (Math.PI * 0.5 - this.rightArmMesh.rotation.x) * lerpSpeed;
      this.leftArmMesh.rotation.z += (-0.1 - this.leftArmMesh.rotation.z) * lerpSpeed;
      this.rightArmMesh.rotation.z += (0.1 - this.rightArmMesh.rotation.z) * lerpSpeed;

      this.leftLegMesh.rotation.x += (-Math.PI * 0.5 - this.leftLegMesh.rotation.x) * lerpSpeed;
      this.rightLegMesh.rotation.x += (-Math.PI * 0.5 - this.rightLegMesh.rotation.x) * lerpSpeed;

      // Rotate body forward to slide underneath obstacles with lateral roll
      targetRotX = 0.35;
      targetRotY = Math.PI + yawAngle;
      targetRotZ = rollAngle;
      this.boardMesh.rotation.set(0, 0, 0);
    } else if (this.activeBoost) {
      // Rocket fly state: trailing limbs dangling, rocket thruster shaking with banking roll
      const lerpSpeed = 10 * deltaTime;
      this.leftArmMesh.rotation.x += (Math.PI * 0.45 - this.leftArmMesh.rotation.x) * lerpSpeed;
      this.rightArmMesh.rotation.x += (Math.PI * 0.45 - this.rightArmMesh.rotation.x) * lerpSpeed;
      this.leftLegMesh.rotation.x += (Math.PI * 0.25 - this.leftLegMesh.rotation.x) * lerpSpeed;
      this.rightLegMesh.rotation.x += (Math.PI * 0.25 - this.rightLegMesh.rotation.x) * lerpSpeed;

      targetRotX = 0;
      targetRotY = Math.PI + yawAngle + (Math.floor(time * 30) % 2) * 0.05;
      targetRotZ = rollAngle;
      this.boardMesh.rotation.set(0, 0, 0);
    }

    // Solve body rotations with buttery-smooth transition lerping!
    const rotSpeed = 14 * deltaTime;
    this.characterGroup.rotation.y += (targetRotY - this.characterGroup.rotation.y) * rotSpeed;
    this.characterGroup.rotation.z += (targetRotZ - this.characterGroup.rotation.z) * rotSpeed;
    if (!this.isJumping) {
      this.characterGroup.rotation.x += (targetRotX - this.characterGroup.rotation.x) * rotSpeed;
    }

    // Solve responsive character Squash and Stretch
    const targetScaleX = this.isSliding ? 1.22 : (this.activeBoost ? 0.94 : 1.0);
    const targetScaleY = this.isSliding ? 0.45 : (this.activeBoost ? 1.12 : 1.0);
    const targetScaleZ = this.isSliding ? 1.28 : (this.activeBoost ? 0.94 : 1.0);

    const scaleSpeed = 12 * deltaTime;
    this.currentScaleX += (targetScaleX - this.currentScaleX) * scaleSpeed;
    this.currentScaleY += (targetScaleY - this.currentScaleY) * scaleSpeed;
    this.currentScaleZ += (targetScaleZ - this.currentScaleZ) * scaleSpeed;
    this.characterGroup.scale.set(this.currentScaleX, this.currentScaleY, this.currentScaleZ);

    // Solve Intelligent Look-at Gaze tracking
    if (this.headMesh) {
      let closestX = 0;
      let closestY = 1.8; // head level standard
      let closestZ = -15; // default lookahead focus
      let minDistance = 22;

      // Query nearest active coin in lookahead zone
      for (const coin of this.coinMeshes) {
        if (!coin.data.collected) {
          const cz = coin.mesh.position.z;
          if (cz < 0 && cz > -18) {
            const dist = Math.abs(cz);
            if (dist < minDistance) {
              minDistance = dist;
              closestX = coin.mesh.position.x;
              closestY = coin.mesh.position.y;
              closestZ = cz;
            }
          }
        }
      }

      // Query nearest active obstacle (train/barrier) in lookahead zone
      for (const obs of this.obstacleMeshes) {
        const oz = obs.mesh.position.z;
        if (oz < 0 && oz > -15) {
          const dist = Math.abs(oz);
          if (dist < minDistance) {
            minDistance = dist;
            closestX = obs.mesh.position.x;
            closestY = obs.mesh.position.y + 0.5; // focus on top of obstacle
            closestZ = oz;
          }
        }
      }

      // Gaze calculations relative to player head
      const dx = closestX - this.playerX;
      const dy = closestY - (this.playerY + 1.8);

      const targetHeadYaw = Math.max(-0.45, Math.min(0.45, dx * 0.28));
      const targetHeadPitch = Math.max(-0.25, Math.min(0.25, dy * 0.16));

      this.headMesh.rotation.y += (targetHeadYaw - this.headMesh.rotation.y) * 8 * deltaTime;
      this.headMesh.rotation.x += (targetHeadPitch - this.headMesh.rotation.x) * 8 * deltaTime;
    }

    // --- Subway Surfers Guard and Dog Chase System AI ---
    if (this.guardActive) {
      this.guardTimer -= deltaTime;
      if (this.guardTimer <= 0 && this.guardVisualZ < 15.0) {
        // Safe run: Retreat the guard nicely offscreen
        this.guardVisualZ += 3.8 * deltaTime;
      } else if (this.guardTimer > 0) {
        // Actively chasing right behind player! Smoothly seek players lane and altitude
        this.guardVisualZ += (4.8 - this.guardVisualZ) * 6.0 * deltaTime;
      }
    } else {
      // Inactive: Stay offscreen
      this.guardVisualZ += (20.0 - this.guardVisualZ) * 4.0 * deltaTime;
    }

    // Positions of Guard and Dog
    const targetGuardX = this.playerX;
    const targetGuardY = this.playerY;
    const guardZ = this.playerZ + this.guardVisualZ;

    // Linearly interpolate the Guard toward the target track coordinates
    const guardX = THREE.MathUtils.lerp(this.guardGroup.position.x, targetGuardX, 10.0 * deltaTime);
    const guardY = THREE.MathUtils.lerp(this.guardGroup.position.y, targetGuardY, 10.0 * deltaTime);
    this.guardGroup.position.set(guardX, guardY, guardZ);

    // Dog runs on left/right flank of officer (with dynamic side bounds oscillation!)
    const dogSideOffset = Math.sin(Date.now() * 0.005) > 0 ? -0.48 : 0.48;
    const targetDogX = this.playerX + dogSideOffset;
    const targetDogY = this.playerY;
    const dogZ = guardZ - 1.1; // Chomp at the board!

    const dogX = THREE.MathUtils.lerp(this.dogGroup.position.x, targetDogX, 9.0 * deltaTime);
    const dogY = THREE.MathUtils.lerp(this.dogGroup.position.y, targetDogY, 9.0 * deltaTime);
    this.dogGroup.position.set(dogX, dogY, dogZ);

    // Animations of Guard legs:
    const swingFreq = Date.now() * 0.024;
    const gLegAngle = Math.sin(swingFreq) * 0.85;
    this.guardLeftLeg.rotation.x = gLegAngle;
    this.guardRightLeg.rotation.x = -gLegAngle;
    this.guardLeftArm.rotation.x = -gLegAngle * 0.75;
    // Right arm wields traffic baton/flashlight: points it forward and shakes angrily!
    this.guardRightArm.rotation.set(-Math.PI * 0.45 + Math.sin(swingFreq * 2) * 0.1, 0, -Math.PI * 0.12);

    // Animations of Dog (Sprinting quadruped):
    const dogLegAngle = Math.sin(swingFreq * 1.5) * 0.9;
    this.dogLeftFrontLeg.rotation.x = dogLegAngle;
    this.dogRightFrontLeg.rotation.x = -dogLegAngle;
    this.dogLeftBackLeg.rotation.x = -dogLegAngle;
    this.dogRightBackLeg.rotation.x = dogLegAngle;

    // Sirens and barks synthesis
    if (this.guardVisualZ < 6.8) {
      if (Math.random() > 0.991) {
        this.playSynthesizedSound('siren');
      }
      if (Math.random() > 0.984) {
        this.playSynthesizedSound('bark');
      }
    }

    // 3. Move items backwards (Simulating forward scroll physics using activeSpeed!)
    const moveZ = activeSpeed * deltaTime;

    this.coinMeshes.forEach(coin => {
      coin.mesh.position.z += moveZ;
      // Spin the custom coins
      coin.mesh.rotation.y += deltaTime * 3.5;
    });

    this.obstacleMeshes.forEach(obs => {
      obs.mesh.position.z += moveZ;

      // Make trains physically move towards the player if they are active
      if (obs.data.type === 'train') {
        obs.mesh.position.z += 8 * deltaTime; // Head-on speed additions
        
        // Train headlights blink/strobe dynamically
        obs.mesh.traverse(node => {
          if (node.name === 'train_headlight' || node.name === 'train_headlight_beam') {
            node.visible = (Math.floor(Date.now() / 150) % 2 === 0);
          }
        });
      }
    });

    this.sceneryMeshes.forEach(sc => {
      const scale = (sc.userData && typeof sc.userData.parallaxFactor === 'number') 
        ? sc.userData.parallaxFactor 
        : 1.0;
      
      const selfSpeed = (sc.userData && typeof sc.userData.selfSpeed === 'number')
        ? sc.userData.selfSpeed
        : 0;

      sc.position.z += moveZ * scale + selfSpeed * deltaTime;

      // Animate sidewalk pedestrians (bobbing and arm waving)
      if (sc.userData && sc.userData.type === 'pedestrian') {
        const pedsTime = Date.now() * 0.001;
        const bounce = Math.sin(pedsTime * sc.userData.bobSpeed + sc.userData.bobOffset);
        
        // Bobbing vertical offset
        sc.position.y = 0.2 + Math.abs(bounce) * 0.15;

        // Limbs swaying
        const leftArm = sc.getObjectByName('leftArm');
        const rightArm = sc.getObjectByName('rightArm');
        if (leftArm) {
          leftArm.rotation.z = -0.15 + bounce * 0.6;
          leftArm.rotation.x = Math.cos(pedsTime * 3) * 0.15;
        }
        if (rightArm) {
          rightArm.rotation.z = 0.15 - bounce * 0.6;
          rightArm.rotation.x = -Math.cos(pedsTime * 3) * 0.15;
        }
      }

      // Animated neon blink hazard tags on subway tunnels
      if (sc.name === 'subway_tunnel') {
        sc.traverse(node => {
          if (node.name === 'tunnel_sign_light') {
            node.visible = (Math.floor(Date.now() / 250) % 2 === 0);
          }
        });
      }
    });

    this.powerUpMeshes.forEach(pw => {
      pw.mesh.position.z += moveZ;
      pw.mesh.rotation.y += deltaTime * 2;
    });

    // 4. Handle coin collection and power-ups timers
    this.handlePowerUpsTimers(deltaTime);
    this.detectCollisions();

    // Recycle elements past our line
    this.recycleElements();

    // Warped curve geometry visual projection
    // this.applyCurvatureWarp();

    // 5. Update particle splatters with activeSpeed scrolling drift
    this.updateParticles(deltaTime, activeSpeed);

    // 6. Update dynamic weather rain/fog drifting
    this.updateDynamicWeather(deltaTime, activeSpeed);

    // Decay core camera shake intensity
    if (this.shakeIntensity > 0) {
      this.shakeIntensity -= deltaTime * this.shakeDecay;
      if (this.shakeIntensity < 0) this.shakeIntensity = 0;
    }

    // Dynamic camera rattling/continuous speed shaking during rocket boost segments
    let finalCameraShake = this.shakeIntensity;
    if (this.activeBoost) {
      finalCameraShake = Math.max(finalCameraShake, 0.07 + Math.sin(Date.now() * 0.04) * 0.02);
    }

    // Offset camera coordinates dynamically
    let shakeX = 0;
    let shakeY = 0;
    let shakeZ = 0;
    if (finalCameraShake > 0) {
      shakeX = (Math.random() - 0.5) * finalCameraShake;
      shakeY = (Math.random() - 0.5) * finalCameraShake;
      shakeZ = (Math.random() - 0.5) * finalCameraShake;
    }

    // Smooth camera X trailing with elegant spring-damper/exponential lerp feel
    const cameraSpeed = 8.5; 
    this.cameraX += (this.playerX - this.cameraX) * cameraSpeed * deltaTime;

    this.camera.position.set(this.cameraX + shakeX, 7 + shakeY, 12 + shakeZ);
    this.camera.lookAt(new THREE.Vector3(this.cameraX + shakeX, 2 + Math.min(3.5, this.playerY * 0.45) + shakeY, -15 + shakeZ));

    // JUICY ADVANCED ANIMATION: Immersive camera banking roll tilt during fast lane changes
    const laneOffsetGap = this.playerTargetX - this.playerX;
    this.camera.rotation.z += laneOffsetGap * 0.016; // Add smooth banking lean in direction of turn

    this.renderer.render(this.scene, this.camera);
  }

  // Power Up progress bars
  private handlePowerUpsTimers(deltaTime: number) {
    if (this.activeMagnet) {
      this.magnetTimer -= deltaTime * 1000;
      if (this.magnetTimer <= 0) {
        this.activeMagnet = false;
        this.callbacks.onPowerUpActivated('magnet', 0, false);
        const pMagnet = this.characterGroup.getObjectByName('magnet_aura');
        if (pMagnet) this.characterGroup.remove(pMagnet);
      } else {
        this.callbacks.onPowerUpActivated('magnet', this.magnetTimer, true);
        
        const magnetAura = this.characterGroup.getObjectByName('magnet_aura');
        if (magnetAura) {
          magnetAura.rotation.z += deltaTime * 5;
          const scale = 1 + Math.sin(Date.now() / 100) * 0.15;
          magnetAura.scale.set(scale, scale, 1);
        }
        
        // PULL COINS MAGNET
        this.coinMeshes.forEach(coin => {
          const coinZ = coin.mesh.position.z;
          // Magnet scans coins up to 45m ahead
          if (coinZ < 5 && coinZ > -45) {
            const coinX = coin.mesh.position.x;
            const coinY = coin.mesh.position.y;
            
            // Vector trajectory pulling them in
            coin.mesh.position.x += (this.playerX - coinX) * 10 * deltaTime;
            coin.mesh.position.y += (this.playerY + 1.0 - coinY) * 10 * deltaTime;
            coin.mesh.position.z += (this.playerZ - coinZ) * 10 * deltaTime;
          }
        });
      }
    }

    if (this.activeMultiplier) {
      this.multiplierTimer -= deltaTime * 1000;
      if (this.multiplierTimer <= 0) {
        this.activeMultiplier = false;
        this.scoreMultiplier = 1;
        this.callbacks.onPowerUpActivated('multiplier', 0, false);
      } else {
        this.scoreMultiplier = 2;
        this.callbacks.onPowerUpActivated('multiplier', this.multiplierTimer, true);
      }
    }

    if (this.activeShield) {
      this.shieldTimer -= deltaTime * 1000;
      if (this.shieldTimer <= 0) {
        this.activeShield = false;
        this.callbacks.onPowerUpActivated('shield', 0, false);
        // Visual cue removal
        const pShield = this.characterGroup.getObjectByName('shield_bubble');
        if (pShield) this.characterGroup.remove(pShield);
      } else {
        this.callbacks.onPowerUpActivated('shield', this.shieldTimer, true);
      }
    }

    if (this.activeBoost) {
      this.boostTimer -= deltaTime * 1000;
      if (this.boostTimer <= 0) {
        this.activeBoost = false;
        this.callbacks.onPowerUpActivated('boost', 0, false);
        const pJetpack = this.characterGroup.getObjectByName('jetpack_visual');
        if (pJetpack) this.characterGroup.remove(pJetpack);
      } else {
        this.callbacks.onPowerUpActivated('boost', this.boostTimer, true);
        const jetpack = this.characterGroup.getObjectByName('jetpack_visual');
        if (jetpack) {
          jetpack.position.y = Math.sin(Date.now() / 80) * 0.05;
          if (Math.random() > 0.3) {
            this.triggerSuperBoostFireworks(this.playerX - 0.25, this.playerY + 0.3, this.playerZ - 0.32);
            this.triggerSuperBoostFireworks(this.playerX + 0.25, this.playerY + 0.3, this.playerZ - 0.32);
          }
        }
      }
    }
  }

  // Splattering particle points dynamics
  private updateParticles(deltaTime: number, activeSpeed: number) {
    const positionsAttr = this.particleGeometry.getAttribute('position') as THREE.BufferAttribute;
    const colorsAttr = this.particleGeometry.getAttribute('color') as THREE.BufferAttribute;
    const positions = positionsAttr.array as Float32Array;
    const colors = colorsAttr.array as Float32Array;

    const moveZ = activeSpeed * deltaTime;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      // Slightly variable fade scaling per particle type for organic feel
      const decaySpeed = p.type === 'smoke' ? 0.8 : p.type === 'bubble' ? 1.2 : p.type === 'trail' ? 1.8 : 1.5;
      p.life -= deltaTime * decaySpeed;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        i--;
        continue;
      }

      // 1. Air drag/friction dampener
      const dragFactor = p.drag !== undefined ? p.drag : 1.0;
      if (dragFactor < 1.0) {
        const decayCoeff = Math.exp(- (1.0 - dragFactor) * deltaTime * 12.0);
        p.vx *= decayCoeff;
        p.vy *= decayCoeff;
        p.vz *= decayCoeff;
      }

      // 2. Custom behavior physics
      if (p.type === 'smoke') {
        // Smoke billows upwards and slows down rapidly
        p.vy += (2.2 + Math.random() * 1.5) * deltaTime;
        // Float back slightly from air flow of the running player
        p.vz -= 3.5 * deltaTime;
      } else if (p.type === 'bubble') {
        // Floating bubbly wobble sinewave oscillation
        p.vx += Math.sin((p.life * 8.0) + p.y) * 1.8 * deltaTime;
        // Float upward slowly (anti-gravity representation)
        p.vy += 1.2 * deltaTime;
        p.vz -= 1.0 * deltaTime;
      } else if (p.type === 'trail') {
        // Surfboard kicks up trail behind that drifts and falls
        p.vy -= 10.0 * deltaTime;
      } else {
        // Standard gravity calculations for coins, sparks, fireworks, and crashes
        const gravity = p.gravity !== undefined ? p.gravity : 18.0;
        p.vy -= gravity * deltaTime;
      }

      // Physics translation + scroll speed drift back and down
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.z += (p.vz * deltaTime) + moveZ;

      const idx = i * 3;
      if (idx < positions.length) {
        positions[idx] = p.x;
        positions[idx + 1] = p.y;
        positions[idx + 2] = p.z;

        const splashColor = new THREE.Color(p.color);
        const opacity = Math.max(0, Math.min(1.0, p.life / p.maxLife));

        if (p.type === 'smoke') {
          // Smoke transitions from hot-burning orange/brown/grey down to charcoal ash!
          const r = THREE.MathUtils.lerp(0.18, splashColor.r, opacity);
          const g = THREE.MathUtils.lerp(0.18, splashColor.g, opacity);
          const b = THREE.MathUtils.lerp(0.18, splashColor.b, opacity);
          colors[idx] = r * opacity;
          colors[idx + 1] = g * opacity;
          colors[idx + 2] = b * opacity;
        } else if (p.type === 'bubble') {
          // Shaking iridescent bubble colors that shimmer inside blue/magenta ranges!
          const r = THREE.MathUtils.lerp(0.9, splashColor.r, opacity);
          const g = THREE.MathUtils.lerp(0.4, splashColor.g, opacity);
          const b = THREE.MathUtils.lerp(1.0, splashColor.b, opacity);
          colors[idx] = r * opacity;
          colors[idx + 1] = g * opacity;
          colors[idx + 2] = b * opacity;
        } else {
          colors[idx] = splashColor.r * opacity;
          colors[idx + 1] = splashColor.g * opacity;
          colors[idx + 2] = splashColor.b * opacity;
        }
      }
    }

    // Fill rest with far invisible indices
    for (let i = this.particles.length; i < 800; i++) {
      const idx = i * 3;
      positions[idx] = 9999;
      positions[idx + 1] = 9999;
      positions[idx + 2] = 9999;
    }

    positionsAttr.needsUpdate = true;
    colorsAttr.needsUpdate = true;
  }

  // Visual particle trail effect behind character's feet/board
  private emitTrailParticles(deltaTime: number, activeSpeed: number) {
    if (!this.isPlaying) return;

    // --- Train/Ramp grinding friction sparks ---
    if (this.isOnAnyTrainOrRamp() && !this.activeBoost) {
      if (Math.random() > 0.45) {
        // Trigger a soft metallic scraping friction sweep sound
        if (Math.random() > 0.88) {
          this.playSynthesizedSound('scrape');
        }
        for (let j = 0; j < 3; j++) {
          this.particles.push({
            x: this.playerX + (Math.random() - 0.5) * 0.38,
            y: this.playerY + 0.05,
            z: this.playerZ + 0.3 + (Math.random() * 0.3),
            vx: (Math.random() - 0.5) * 4.5,
            vy: Math.random() * 3.8 + 2.0,
            vz: -3.0 - (Math.random() * 6.0), // Shoot backwards violently
            color: '#f97316', // Glowing hot iron orange
            size: Math.random() * 0.15 + 0.05,
            life: 0.38,
            maxLife: 0.38,
            type: 'spark'
          });
        }
      }
    }

    // Adjust rate based on whether booster is active
    const spawnChance = this.activeBoost ? 0.95 : 0.45;
    if (Math.random() > spawnChance) return;

    // Use current skin's theme colors
    const trailColor = this.activeSkin.color || '#ef4444';
    const boardColor = this.activeSkin.boardColor || '#facc15';

    // Alternate emissions or create pairs for both feet/sides of surfboard
    const count = this.activeBoost ? 4 : 2;
    for (let i = 0; i < count; i++) {
      // Offset trails slightly so they project from the tail-end of the board
      const lateralOffset = (i % 2 === 0 ? -0.22 : 0.22);
      this.particles.push({
        x: this.playerX + lateralOffset,
        y: this.playerY + 0.1,
        z: this.playerZ + 0.5 + (Math.random() * 0.4),
        vx: (Math.random() - 0.5) * 2.0,
        vy: (Math.random() * 2) + 0.5,
        vz: -1.0 - (Math.random() * 2.0), // Shoot backwards!
        color: Math.random() > 0.4 ? trailColor : boardColor,
        size: Math.random() * 0.28 + 0.1,
        life: 0.6,
        maxLife: 0.6,
        type: 'trail'
      });
    }
  }

  // Crash event
  private triggerCrash() {
    this.isPlaying = false;
    this.isDead = true;
    this.playSynthesizedSound('crash');
    this.shakeIntensity = 1.1; // Explosion-grade screen shake!
    
    // Position guard and dog right directly next to the crash site (Busted!)
    if (this.guardGroup && this.dogGroup) {
      this.guardGroup.position.set(this.playerX, this.playerY, this.playerZ + 1.2);
      this.dogGroup.position.set(this.playerX - 0.45, this.playerY, this.playerZ + 0.6);
      this.guardRightArm.rotation.set(-Math.PI * 0.4, 0, 0); // Point traffic baton forward accusingly!
    }

    // Death blast splatters with realistic red explosive smoke and debris
    this.triggerObstacleExplosion(this.playerX, this.playerY + 0.8, this.playerZ, '#ef4444');
    
    setTimeout(() => {
      this.callbacks.onGameOver(this.currentScore, this.coinsCollected, this.powerUpsCollected);
    }, 700);
  }

  // Bounding box collision evaluations
  private detectCollisions() {
    const pX = this.playerX;
    const pY = this.playerY;
    const pZ = this.playerZ;

    // Player box height & width
    const pRadius = 0.6; // Lane tolerance
    const pHeight = this.isSliding ? 0.65 : 2.0;

    // 1. Evaluate Coins Collection & Misses
    for (let i = 0; i < this.coinMeshes.length; i++) {
      const coin = this.coinMeshes[i];
      const cMesh = coin.mesh;
      const cData = coin.data as any; // Cast as any to read/write optional fields like missed

      // Check if player missed the coin (it flew past behind Z = 3.0)
      if (cMesh.position.z > 3.0 && !cData.collected && !cData.missed) {
        cData.missed = true;
        if (this.coinComboCount > 0) {
          this.coinComboCount = 0;
          this.callbacks.onComboUpdated(0, false, 0);
        }
      }

      // Distance checking for collection
      const distZ = Math.abs(cMesh.position.z - pZ);
      const distX = Math.abs(cMesh.position.x - pX);
      const distY = Math.abs(cMesh.position.y - pY);

      if (distZ < 1.1 && distX < 1.0 && distY < pHeight && !cData.collected) {
        cData.collected = true;
        
        const multiplierFactor = this.activeMultiplier ? 2 : 1;
        const addCount = (cData.isSuperCoin ? (cData.superCoinValue || 5) : 1) * multiplierFactor;
        
        this.coinsCollected += addCount;
        this.coinComboCount += addCount;

        // Add bonus score for continuous streak combo progression!
        // At high speed-combos, every coin gets a substantial scaling bonus!
        const bonusScore = Math.floor(this.coinComboCount * 12 * this.scoreMultiplier);
        this.currentScore += bonusScore;

        this.callbacks.onCoinCollected(this.coinsCollected);
        this.callbacks.onComboUpdated(this.coinComboCount, true, bonusScore);
        this.callbacks.onScoreUpdated(this.currentScore);

        if (cData.isSuperCoin) {
          this.triggerCoinCelebration(cMesh.position.x, cMesh.position.y, cMesh.position.z, '#a855f7'); // neon purple glow celebration
          this.playSynthesizedSound('powerup');
        } else {
          this.triggerCoinCelebration(cMesh.position.x, cMesh.position.y, cMesh.position.z, '#fbbf24'); // golden coin burst celebration
          this.playSynthesizedSound('coin');
        }
      }
    }

    // 2. Evaluate Power-ups Collection
    for (let i = 0; i < this.powerUpMeshes.length; i++) {
      const pw = this.powerUpMeshes[i];
      const pMesh = pw.mesh;
      const pData = pw.data;

      const distZ = Math.abs(pMesh.position.z - pZ);
      const distX = Math.abs(pMesh.position.x - pX);
      const distY = Math.abs(pMesh.position.y - pY);

      if (distZ < 1.2 && distX < 1.0 && distY < pHeight) {
        pData.collected = true;
        this.applyPowerUp(pData.type);
      }
    }

    // 3. Evaluate Obstacles Collision gates
    for (let i = 0; i < this.obstacleMeshes.length; i++) {
      const obs = this.obstacleMeshes[i];
      const oMesh = obs.mesh;
      const oData = obs.data;

      // Real lane separation calculations
      const obsX = oData.x * GAME_CONFIG.LANE_WIDTH;
      // Adjust Z coordinate for trains length
      const obsZ = oMesh.position.z;
      const isTrain = oData.type === 'train';
      const isRamp = oData.type === 'ramp';

      const lengthZ = isTrain ? 15 : isRamp ? 8 : 0.6;
      const heightY = oData.height;

      const relativeZ = Math.abs(obsZ - pZ);
      const relativeX = Math.abs(obsX - pX);

      // Check aligned tracks intersection
      if (relativeX < 1.6 && relativeZ < (lengthZ / 2 + 0.8)) {
        
        if (isRamp) {
          // Special Ramp Surf: Climbs the player onto the roof!
          // Distance from the ramp's front edge
          const distFromStart = (obsZ - pZ) + (lengthZ / 2);
          if (distFromStart > 0 && distFromStart < lengthZ && pY <= 3.8) {
            // Procedurally increase heights smoothly
            const progress = distFromStart / lengthZ;
            const targetHeight = progress * heightY;
            if (this.playerVelocityY <= 0) {
              this.playerY = targetHeight;
              this.isJumping = false;
              // Ride active hoverboard
              this.playerVelocityY = 0;
            }
          }
          continue;
        }

        // Standard crash boxes
        if (this.activeBoost) {
          if (isTrain && pY >= heightY - 0.2) {
            if (this.playerVelocityY <= 0) {
              this.playerY = heightY;
              this.isJumping = false;
            }
          }
          continue; // Immune to collision crash under active rocket boost!
        }

        const minHeightToCollide = pY;
        
        if (oData.type === 'barrier_high') {
          // Slide underneath barrier: Must slide or hit!
          if (!this.isSliding) {
            this.handleCollisionCrash();
            return;
          }
        } else if (oData.type === 'barrier_low') {
          // Jump over barrier: Must jump or hit!
          if (pY < heightY) {
            this.handleCollisionCrash();
            return;
          }
        } else if (isTrain) {
          // Train: Hit headlights frontal collision directly!
          // If player is on top of train, they can ride it safely
          if (pY < heightY - 0.2) {
            this.handleCollisionCrash();
            return;
          } else {
            // Ride on top of train
            if (this.playerVelocityY <= 0) {
              this.playerY = heightY;
              this.isJumping = false;
            }
          }
        }
      }
    }

    // Keep falling if rode off a train and not jumped
    if (!this.isJumping && pY > 0 && !this.isOnAnyTrainOrRamp()) {
      this.isJumping = true;
      this.playerVelocityY = 0; // Natural fallback gravity drop
    }
  }

  // Crash control checking
  private handleCollisionCrash() {
    if (this.activeShield) {
      // Consume shield powerup safely
      this.activeShield = false;
      this.shieldTimer = 0;
      this.callbacks.onPowerUpActivated('shield', 0, false);
      const shieldBubble = this.characterGroup.getObjectByName('shield_bubble');
      if (shieldBubble) this.characterGroup.remove(shieldBubble);

      // Shatter bubble glass sparkles
      this.triggerShieldBreakBurst(this.playerX, this.playerY + 0.2, this.playerZ);
      
      // Knockback obstacles backward 50m
      this.obstacleMeshes.forEach(o => {
        if (Math.abs(o.mesh.position.z - this.playerZ) < 25) {
          o.mesh.position.z -= 45; // Relocate forward as warning
        }
      });
      this.playSynthesizedSound('crash'); // feedback rumble
      this.shakeIntensity = 0.55; // Screen shake when hit with active shield!

      // Subway Surfers Stumble: Chaser starts running right behind you!
      this.guardActive = true;
      this.guardTimer = 6.0;   // 6 seconds of extreme threat countdown
      this.guardVisualZ = 4.3; // Chaser is extremely close, snapping barks and flashing siren warning!
      this.playSynthesizedSound('siren');
      this.playSynthesizedSound('bark');
    } else {
      this.triggerCrash();
    }
  }

  // Falling down checkers
  private isOnAnyTrainOrRamp(): boolean {
    const pX = this.playerX;
    const pY = this.playerY;
    const pZ = this.playerZ;

    for (const obs of this.obstacleMeshes) {
      const oData = obs.data;
      const oMesh = obs.mesh;
      const obsX = oData.x * GAME_CONFIG.LANE_WIDTH;
      const obsZ = oMesh.position.z;
      const isTrain = oData.type === 'train';
      const isRamp = oData.type === 'ramp';
      
      const length = isTrain ? 15 : isRamp ? 8 : 0;
      if (Math.abs(pX - obsX) < 1.6 && Math.abs(pZ - obsZ) < (length / 2 + 0.5)) {
        if (pY >= oData.height - 0.2) return true;
      }
    }
    return false;
  }

  // Activates magnet multiplier shield powerups
  private applyPowerUp(type: 'magnet' | 'multiplier' | 'shield' | 'boost') {
    this.playSynthesizedSound('powerup');
    this.powerUpsCollected++;
    
    if (type === 'magnet') {
      this.activeMagnet = true;
      this.magnetTimer = GAME_CONFIG.POWERUP_DURATION;
      this.triggerCoinCelebration(this.playerX, this.playerY + 1, this.playerZ, '#ef4444');

      let magnetAura = this.characterGroup.getObjectByName('magnet_aura');
      if (!magnetAura) {
        const torusGeo = new THREE.TorusGeometry(1.2, 0.08, 8, 24);
        const torusMat = new THREE.MeshBasicMaterial({
          color: '#ef4444',
          transparent: true,
          opacity: 0.6,
          wireframe: true
        });
        const aura = new THREE.Mesh(torusGeo, torusMat);
        aura.name = 'magnet_aura';
        aura.rotation.x = Math.PI / 2; // Lie flat horizontal
        aura.position.set(0, 0.8, 0);
        this.characterGroup.add(aura);
      }
    } else if (type === 'multiplier') {
      this.activeMultiplier = true;
      this.multiplierTimer = GAME_CONFIG.POWERUP_DURATION;
      this.scoreMultiplier = 2;
      this.triggerCoinCelebration(this.playerX, this.playerY + 1, this.playerZ, '#facc15');
    } else if (type === 'boost') {
      this.activeBoost = true;
      this.boostTimer = GAME_CONFIG.POWERUP_DURATION;
      this.triggerCoinCelebration(this.playerX, this.playerY + 1, this.playerZ, '#f97316');

      let jetpack = this.characterGroup.getObjectByName('jetpack_visual');
      if (!jetpack) {
        const jetpackGroup = new THREE.Group();
        jetpackGroup.name = 'jetpack_visual';
        
        const tankGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.8, 8);
        const tankMat = new THREE.MeshStandardMaterial({ color: '#64748b', metalness: 0.9, roughness: 0.1 });
        
        const leftTank = new THREE.Mesh(tankGeo, tankMat);
        leftTank.position.set(-0.25, 0.8, -0.32);
        
        const rightTank = new THREE.Mesh(tankGeo, tankMat);
        rightTank.position.set(0.25, 0.8, -0.32);
        
        jetpackGroup.add(leftTank);
        jetpackGroup.add(rightTank);
        
        const nozzleGeo = new THREE.ConeGeometry(0.1, 0.25, 6);
        const nozzleMat = new THREE.MeshBasicMaterial({ color: '#f97316' });
        
        const leftNozzle = new THREE.Mesh(nozzleGeo, nozzleMat);
        leftNozzle.position.set(-0.25, 0.3, -0.32);
        leftNozzle.rotation.x = Math.PI;
        
        const rightNozzle = new THREE.Mesh(nozzleGeo, nozzleMat);
        rightNozzle.position.set(0.25, 0.3, -0.32);
        rightNozzle.rotation.x = Math.PI;
        
        jetpackGroup.add(leftNozzle);
        jetpackGroup.add(rightNozzle);
        
        this.characterGroup.add(jetpackGroup);
      }
    } else {
      this.activeShield = true;
      this.shieldTimer = GAME_CONFIG.POWERUP_DURATION;
      this.triggerCoinCelebration(this.playerX, this.playerY + 1, this.playerZ, '#3b82f6');

      // Visual shield mesh bubble
      let shieldBubble = this.characterGroup.getObjectByName('shield_bubble');
      if (!shieldBubble) {
        const shieldGeo = new THREE.SphereGeometry(1.6, 16, 16);
        const shieldMat = new THREE.MeshBasicMaterial({
          color: '#3b82f6',
          transparent: true,
          opacity: 0.35,
          wireframe: true
        });
        const mesh = new THREE.Mesh(shieldGeo, shieldMat);
        mesh.name = 'shield_bubble';
        mesh.position.set(0, 1.0, 0);
        this.characterGroup.add(mesh);
      }
    }
  }

  // Public method to activate hoverboard shield protection
  public activateHoverboard() {
    if (!this.isPlaying || this.activeShield || this.activeBoost) return;
    this.applyPowerUp('shield');
    // Retro synthesizer summon sound
    this.playSynthesizedSound('jump');
    // Summon celebration particle burst
    this.triggerCoinCelebration(this.playerX, 0.2, this.playerZ, '#22d3ee');
  }

  // Handle container size modifications
  public handleResize() {
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 500;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  // Real-time Dynamic Weather Setup tied to Hour of Day
  private setupDynamicWeather() {
    const envId = this.activeEnv.id;
    this.scene.fog = new THREE.Fog(this.activeEnv.skyColor, 170, 500);
    
    this.rainGroup = new THREE.Group();
    this.scene.add(this.rainGroup);

    if (envId === 'cyber') {
      // Spawn beautiful trailing glowing binary rain blocks / lines
      const dataCount = 180;
      const dataColors = ['#00f0ff', '#ff007f'];
      const dataGeo = new THREE.BufferGeometry();
      const pts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.6, 0)];
      dataGeo.setFromPoints(pts);

      for (let i = 0; i < dataCount; i++) {
        const color = dataColors[Math.floor(Math.random() * dataColors.length)];
        const dataLine = new THREE.Line(dataGeo, new THREE.LineBasicMaterial({
          color: color,
          transparent: true,
          opacity: 0.75
        }));
        dataLine.position.set(
          (Math.random() - 0.5) * 35,
          Math.random() * 20,
          -Math.random() * 120
        );
        dataLine.userData = { animType: 'cyber_stream', speedMult: 0.8 + Math.random() * 0.5 };
        this.rainGroup.add(dataLine);
      }
    } else if (envId === 'temple') {
      // Spawn falling warm forest pollen and green ivy leaf particles
      const leafCount = 140;
      const leafColors = ['#22c55e', '#15803d', '#a3e635', '#fef08a']; // green, lime, golden-yellow
      for (let i = 0; i < leafCount; i++) {
        const leafGeo = new THREE.BoxGeometry(0.18, 0.18, 0.03);
        const color = leafColors[Math.floor(Math.random() * leafColors.length)];
        const leaf = new THREE.Mesh(leafGeo, new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: 0.65
        }));
        leaf.position.set(
          (Math.random() - 0.5) * 35,
          Math.random() * 18,
          -Math.random() * 120
        );
        leaf.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        leaf.userData = { animType: 'temple_leaves', speedMult: 0.3 + Math.random() * 0.4, rotSpeed: (Math.random() - 0.5) * 2.0 };
        this.rainGroup.add(leaf);
      }
    } else if (envId === 'theme_industrial') {
      // Spawn floating orange/amber burning embers and hazard dust
      const emberCount = 130;
      const emberColors = ['#f97316', '#ea580c', '#fb923c', '#7c2d12'];
      const emberGeo = new THREE.SphereGeometry(0.08, 4, 4);
      for (let i = 0; i < emberCount; i++) {
        const color = emberColors[Math.floor(Math.random() * emberColors.length)];
        const emberMat = new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: 0.85
        });
        const ember = new THREE.Mesh(emberGeo, emberMat);
        ember.position.set(
          (Math.random() - 0.5) * 35,
          Math.random() * 18,
          -Math.random() * 120
        );
        ember.userData = { animType: 'ember_spark', speedMult: 0.4 + Math.random() * 0.5 };
        this.rainGroup.add(ember);
      }
    } else {
      // Normal weather system synced to hour
      const hour = new Date().getHours();
      const isNightOrMorning = hour < 6 || hour > 18;
      if (!isNightOrMorning) {
        // Daytime: Falls rain
        const rainCount = 180;
        const rainMaterial = new THREE.LineBasicMaterial({
          color: '#a5f3fc',
          transparent: true,
          opacity: 0.45
        });
        
        const geometry = new THREE.BufferGeometry();
        const points = [
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, -0.8, 0)
        ];
        geometry.setFromPoints(points);
        
        for (let i = 0; i < rainCount; i++) {
          const line = new THREE.Line(geometry, rainMaterial);
          line.position.set(
            (Math.random() - 0.5) * 35,
            Math.random() * 20,
            -Math.random() * 120
          );
          line.userData = { animType: 'rain_drop', speedMult: 1.0 };
          this.rainGroup.add(line);
        }
      } else {
        // Evening / Morning: Fog drifts
        const cloudCount = 12;
        const cloudGeo = new THREE.SphereGeometry(3.5, 8, 8);
        const cloudMat = new THREE.MeshBasicMaterial({
          color: '#e2e8f0',
          transparent: true,
          opacity: 0.05
        });
        
        for (let i = 0; i < cloudCount; i++) {
          const cloud = new THREE.Mesh(cloudGeo, cloudMat);
          cloud.position.set(
            (Math.random() - 0.5) * 40,
            0.5 + Math.random() * 2,
            -Math.random() * 140
          );
          cloud.userData = { animType: 'fog_cloud', speedMult: 1.0 };
          this.rainGroup.add(cloud);
        }
      }
    }
  }

  // Real-time Dynamic Weather Updates scrolling and wrapping around loop
  private updateDynamicWeather(deltaTime: number, speed: number) {
    if (!this.rainGroup) return;
    
    this.rainGroup.children.forEach(particle => {
      const type = particle.userData.animType || 'rain_drop';
      const mult = particle.userData.speedMult || 1.0;

      if (type === 'cyber_stream') {
        particle.position.y -= deltaTime * 16 * mult;
        particle.position.z += deltaTime * speed * 2.0;
        if (particle.position.y < 0) {
          particle.position.y = 15 + Math.random() * 5;
        }
        if (particle.position.z > 10) {
          particle.position.z = -120 - Math.random() * 20;
          particle.position.x = (Math.random() - 0.5) * 35;
        }
      } else if (type === 'temple_leaves') {
        // Slow falling and spinning down leaves
        particle.position.y -= deltaTime * 4.5 * mult;
        particle.position.z += deltaTime * speed * 1.8;
        particle.rotation.x += (particle.userData.rotSpeed || 1.0) * deltaTime;
        particle.rotation.y += (particle.userData.rotSpeed || 1.0) * 0.5 * deltaTime;

        if (particle.position.y < 0) {
          particle.position.y = 15 + Math.random() * 5;
        }
        if (particle.position.z > 10) {
          particle.position.z = -120 - Math.random() * 20;
          particle.position.x = (Math.random() - 0.5) * 35;
        }
      } else if (type === 'ember_spark') {
        // Shifting slightly sideways with speed
        particle.position.y -= deltaTime * 3.0 * mult;
        particle.position.x += Math.sin(particle.position.y * 0.8) * deltaTime * 1.5;
        particle.position.z += deltaTime * speed * 2.0;

        if (particle.position.y < 0) {
          particle.position.y = 15 + Math.random() * 5;
        }
        if (particle.position.z > 10) {
          particle.position.z = -120 - Math.random() * 20;
          particle.position.x = (Math.random() - 0.5) * 35;
        }
      } else if (type === 'rain_drop') {
        particle.position.y -= deltaTime * 12 * mult;
        particle.position.z += deltaTime * speed * 2.0;
        
        if (particle.position.y < 0) {
          particle.position.y = 15 + Math.random() * 5;
        }
        if (particle.position.z > 10) {
          particle.position.z = -120 - Math.random() * 20;
          particle.position.x = (Math.random() - 0.5) * 35;
        }
      } else if (type === 'fog_cloud') {
        particle.position.x += deltaTime * 0.5 * mult;
        particle.position.z += deltaTime * speed * 2.0;
        
        if (particle.position.x > 25) {
          particle.position.x = -25;
        }
        if (particle.position.z > 10) {
          particle.position.z = -140 - Math.random() * 20;
        }
      }
    });
  }

  // Destructor: Clean scene references and context
  public destroy() {
    this.isPlaying = false;
    this.coinMeshes.forEach(c => this.scene.remove(c.mesh));
    this.obstacleMeshes.forEach(o => this.scene.remove(o.mesh));
    this.sceneryMeshes.forEach(s => this.scene.remove(s));
    this.powerUpMeshes.forEach(p => this.scene.remove(p.mesh));
    if (this.rainGroup) {
      this.scene.remove(this.rainGroup);
    }
    this.scene.remove(this.characterGroup);
    this.scene.remove(this.trackGroup);
    this.scene.remove(this.particlePoints);
    this.renderer.dispose();
    
    if (this.audioCtx) {
      this.audioCtx.close();
    }
  }
}
