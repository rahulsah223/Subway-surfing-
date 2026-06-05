export type Language = 'en' | 'es' | 'fr';

export interface TranslationDictionary {
  wipedOut: string;
  inspectorsCaught: string;
  surfAgain: string;
  returnToDepot: string;
  personalRecord: string;
  finalScore: string;
  coinsSaved: string;
  tapToStart: string;
  play: string;
  store: string;
  characters: string;
  boards: string;
  me: string;
  leaders: string;
  level: string;
  profile: string;
  credentials: string;
  configuration: string;
  audioPreferences: string;
  language: string;
  syncProfile: string;
  streetRules: string;
  xpProgress: string;
  nextUnlock: string;
  soundOn: string;
  muted: string;
  googleConnected: string;
  offlineSync: string;
  disconnectUser: string;
  linkGoogle: string;
  ruleXP: string;
  ruleMilestones: string;
  ruleFullscreen: string;
  trackAchievements: string;
  runsPlayed: string;
  coinsSnatched: string;
  lifetimePowerups: string;
  leagueRank: string;
  crewUsernameTag: string;
}

export const translations: Record<Language, TranslationDictionary> = {
  en: {
    wipedOut: 'Wiped Out!',
    inspectorsCaught: 'The inspectors caught you!',
    surfAgain: 'Surf Again',
    returnToDepot: 'Return to Depot',
    personalRecord: 'NEW PERSONAL HIGH RECORD!',
    finalScore: 'Final Score',
    coinsSaved: 'Coins Saved',
    tapToStart: 'Tap To Start',
    play: 'PLAY',
    store: 'Store',
    characters: 'Characters',
    boards: 'Boards',
    me: 'Me',
    leaders: 'Leaders',
    level: 'Level',
    profile: 'Profile',
    credentials: 'Surfer Credentials',
    configuration: 'Surf Configuration',
    audioPreferences: 'AUDIO PREFERENCES',
    language: 'LANGUAGE / IDIOMA / LANGUE',
    syncProfile: 'SYNC PROFILE SAVE',
    streetRules: 'Subway Street Rules',
    xpProgress: 'EXPERIENCE PROGRESS BAR',
    nextUnlock: 'Next lock',
    soundOn: 'Sound ON',
    muted: 'Muted',
    googleConnected: 'Google Profile Connected',
    offlineSync: 'Offline metrics are synchronized to cloud',
    disconnectUser: 'Disconnect',
    linkGoogle: 'Link Google Profile',
    ruleXP: 'XP Rules: Earn 1 XP per score point. Earn 10 XP per coin collected. Bonus 100 XP per magnet/shield, and 250 XP bonus for completion.',
    ruleMilestones: 'Unlock Milestones: Level 2 unlocks Tricky Neon outfit cosmetics; Level 4 unlocks Cyber Zone and Laser board paint works; Level 6 unlocks Temple zone domain and custom crown customs.',
    ruleFullscreen: 'Full-Screen Mode: Clicking the central Play button automatically triggers full-screen mode directly. Escape at any time.',
    trackAchievements: '🏆 Track My Achievements',
    runsPlayed: 'Runs Played',
    coinsSnatched: 'Coins Snatched',
    lifetimePowerups: 'Lifetime Powerups',
    leagueRank: 'League Rank Tier',
    crewUsernameTag: 'CREW USERNAME TAG',
  },
  es: {
    wipedOut: '¡Chocaste!',
    inspectorsCaught: '¡Los inspectores te atraparon!',
    surfAgain: 'Surfear de nuevo',
    returnToDepot: 'Volver al depósito',
    personalRecord: '¡NUEVO RÉCORD PERSONAL!',
    finalScore: 'Puntuación final',
    coinsSaved: 'Monedas salvadas',
    tapToStart: 'Presiona para comenzar',
    play: 'JUGAR',
    store: 'Tienda',
    characters: 'Personajes',
    boards: 'Tablas',
    me: 'Yo',
    leaders: 'Líderes',
    level: 'Nivel',
    profile: 'Perfil',
    credentials: 'Credenciales del Surfer',
    configuration: 'Configuración de Surf',
    audioPreferences: 'PREFERENCIAS DE AUDIO',
    language: 'IDIOMA / LANGUAGE / LANGUE',
    syncProfile: 'SINCRONIZAR PERFIL',
    streetRules: 'Reglas de las Vías',
    xpProgress: 'BARRA DE PROGRESO DE EXPERIENCIA',
    nextUnlock: 'Siguiente desbloqueo',
    soundOn: 'Sonido ACTIVADO',
    muted: 'Silenciado',
    googleConnected: 'Perfil de Google Conectado',
    offlineSync: 'Las métricas locales se sincronizan con la nube',
    disconnectUser: 'Desconectar',
    linkGoogle: 'Vincular Perfil de Google',
    ruleXP: 'Reglas de XP: Gana 1 XP por punto de puntuación. Gana 10 XP por moneda recolectada. Bonificación de 100 XP por imán o escudo, y 250 XP de bonificación por completado.',
    ruleMilestones: 'Hitos desbloqueables: El nivel 2 desbloquea cosméticos de Tricky Neon; El nivel 4 desbloquea Cyber Zone y diseños de tabla láser; El nivel 6 desbloquea el Templo y customizaciones de corona.',
    ruleFullscreen: 'Modo pantalla completa: Al hacer clic en el botón principal Jugar se iniciará automáticamente el modo de pantalla completa. Escapa en cualquier momento.',
    trackAchievements: '🏆 Mis Logros',
    runsPlayed: 'Carreras Jugadas',
    coinsSnatched: 'Monedas Obtenidas',
    lifetimePowerups: 'Potenciadores Históricos',
    leagueRank: 'Rango de la Liga',
    crewUsernameTag: 'ETIQUETA DE TRIPULACIÓN',
  },
  fr: {
    wipedOut: 'Éliminé !',
    inspectorsCaught: 'Les inspecteurs t\'ont attrapé !',
    surfAgain: 'Surfer à nouveau',
    returnToDepot: 'Retour au dépôt',
    personalRecord: 'NOUVEAU RECORD PERSONNEL !',
    finalScore: 'Score final',
    coinsSaved: 'Pièces sauvées',
    tapToStart: 'Tapoter pour démarrer',
    play: 'JOUER',
    store: 'Boutique',
    characters: 'Personnages',
    boards: 'Planches',
    me: 'Moi',
    leaders: 'Leaders',
    level: 'Niveau',
    profile: 'Profil',
    credentials: 'Identifiants de Surfeur',
    configuration: 'Configuration Surf',
    audioPreferences: 'PRÉFÉRENCES AUDIO',
    language: 'LANGUE / LANGUAGE / IDIOMA',
    syncProfile: 'SYNCHRONISER LE PROFIL',
    streetRules: 'Règles du Métro',
    xpProgress: 'BARRE DE PROGRESSION D\'EXPÉRIENCE',
    nextUnlock: 'Prochain déverrouillage',
    soundOn: 'Son ACTIVER',
    muted: 'Muet',
    googleConnected: 'Profil Google Connecté',
    offlineSync: 'Les statistiques locales sont synchronisées sur le cloud',
    disconnectUser: 'Déconnecter',
    linkGoogle: 'Lier le Profil Google',
    ruleXP: 'Règles d\'XP : Gagnez 1 XP par point de score. Gagnez 10 XP par pièce collectée. Bonus de 100 XP par aimant/bouclier, et 250 XP pour la complétion.',
    ruleMilestones: 'Jalons de déblocage : Le niveau 2 débloque les cosmétiques Tricky Neon ; Le niveau 4 débloque Cyber Zone et la planche Laser ; Le niveau 6 débloque le Temple et les couronnes personnalisées.',
    ruleFullscreen: 'Mode Plein Écran : Cliquer sur le bouton principal Jouer lance automatiquement le mode plein écran. Quittez à tout moment.',
    trackAchievements: '🏆 Suivre mes réalisations',
    runsPlayed: 'Courses Jouées',
    coinsSnatched: 'Pièces Récupérées',
    lifetimePowerups: 'Bonus Collectés',
    leagueRank: 'Rang de la Ligue',
    crewUsernameTag: 'PSEUDO DU GROUPE',
  },
};
