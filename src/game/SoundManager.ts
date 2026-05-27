import { Howl } from 'howler';

export class SoundManager {
  private static instance: SoundManager;
  private audioPool: Record<string, Howl> = {};
  private masterVolume: number = 1.0;
  private bgmVolume: number = 0.1;
  private sfxVolume: number = 0.85;
  private bgmAudio: HTMLAudioElement | null = null;
  private bgmList: string[] = [];

  private constructor() {
    this.preloadAudio();
  }

  public static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  private preloadAudio() {
    const files = ['shoot', 'hit', 'pickup', 'drink', 'death', 'kill', 'spawn', 'open_inventory', 'close_inventory', 'reload', 'level_up', 'knife_swing', 'sword_swing', 'mg_shoot', 'shotgun_blast', 'empty_click', 'room_clear', 'brute_slam', 'shaman_cast', 'elemental_explode', 'wraith_teleport', 'golem_stomp', 'artifact_ping', 'artifact_pickup', 'shrine_awaken', 'portal_boss_spawn', 'walk', 'sprint', 'roll', 'door_creak'];
    files.forEach(f => {
      this.audioPool[f] = new Howl({
        src: [`/assets/audio/${f}.wav`],
        volume: this.masterVolume * this.sfxVolume,
        preload: true
      });
    });
  }

  public async fetchBGM() {
    try {
      const res = await fetch('/api/bgm');
      const data = await res.json();
      if (data.files && data.files.length > 0) {
        this.bgmList = data.files;
        this.playNextBGM();
      }
    } catch (e) { console.error("Failed to fetch BGM:", e); }
  }

  private playNextBGM() {
    if (this.bgmList.length === 0) return;
    const file = this.bgmList[Math.floor(Math.random() * this.bgmList.length)];
    if (this.bgmAudio) {
       this.bgmAudio.pause();
       this.bgmAudio = null;
    }
    this.bgmAudio = new Audio(`/assets/bgm/${file}`);
    this.bgmAudio.volume = this.bgmVolume * this.masterVolume;
    this.bgmAudio.loop = false;
    this.bgmAudio.addEventListener('ended', () => this.playNextBGM());
    this.bgmAudio.play().catch(e => console.log("BGM Autoplay prevented until interaction"));
  }

  public playSound(type: string, sourceX?: number, sourceY?: number, playerX?: number, playerY?: number) {
    if (!this.audioPool[type]) return;
    const howl = this.audioPool[type];
    
    let vol = 1.0;
    let pan = 0;
    
    if (sourceX !== undefined && sourceY !== undefined && playerX !== undefined && playerY !== undefined) {
       const dx = sourceX - playerX;
       const dy = sourceY - playerY;
       const dist = Math.hypot(dx, dy);
       
       const maxDist = 1200;
       vol = Math.max(0, 1 - (dist / maxDist));
       pan = Math.max(-1, Math.min(1, dx / 400));
    }
    
    const finalVol = vol * this.masterVolume * this.sfxVolume;
    if (finalVol <= 0) return; 
    
    const id = howl.play();
    howl.volume(finalVol, id);
    howl.stereo(pan, id);
  }

  public applyVolumes() {
    const finalSfx = Math.max(0, Math.min(1, (this.masterVolume || 0) * (this.sfxVolume || 0)));
    for (const key in this.audioPool) {
      this.audioPool[key].volume(finalSfx);
    }
    if (this.bgmAudio) {
      const finalBgm = Math.max(0, Math.min(1, (this.masterVolume || 0) * (this.bgmVolume || 0)));
      this.bgmAudio.volume = finalBgm;
    }
  }

  public handleVolumeChange(detail: any) {
    if (detail) {
       if (typeof detail.master === 'number') this.masterVolume = detail.master;
       if (typeof detail.bgm === 'number') this.bgmVolume = detail.bgm;
       if (typeof detail.sfx === 'number') this.sfxVolume = detail.sfx;
    }
    this.applyVolumes();
    
    if (this.bgmAudio && this.bgmAudio.paused) {
       this.bgmAudio.play().catch(()=>{});
    }
  }
}