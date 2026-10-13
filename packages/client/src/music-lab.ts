const tracks = [
  { id: 'infinite-darkness', title: 'Infinite Darkness', artist: 'HydroGene', url: new URL('../../../assets/music/infinite-darkness.mp3', import.meta.url).href, source: 'https://opengameart.org/content/8-bit-infinite-darkness' },
  { id: 'foreboding-pixels', title: 'Foreboding Pixels', artist: 'Sorth', url: new URL('../../../assets/music/foreboding-pixels.mp3', import.meta.url).href, source: 'https://opengameart.org/content/foreboding-pixels' },
  { id: 'hallow-quest', title: 'Hallow Quest · 8-bit', artist: 'Zane Little Music', url: new URL('../../../assets/music/hallow-quest.mp3', import.meta.url).href, source: 'https://opengameart.org/content/spooky-action-loop-hallow-quest' },
  { id: "chip-bit-danger", title: "Chip Bit Danger", artist: "Sudocolon", url: new URL('../../../assets/music/chip-bit-danger.mp3', import.meta.url).href, source: "https://opengameart.org/content/chip-bit-danger" },
  { id: "8-bit-cave-loop", title: "8-Bit Cave Loop", artist: "Wolfgang_", url: new URL('../../../assets/music/8-bit-cave-loop.mp3', import.meta.url).href, source: "https://opengameart.org/content/8-bit-cave-loop" },
  { id: "8-bit-perilous-dungeon", title: "Perilous Dungeon", artist: "HydroGene", url: new URL('../../../assets/music/8-bit-perilous-dungeon.mp3', import.meta.url).href, source: "https://opengameart.org/content/8-bit-perilous-dungeon" },
  { id: "8-bit-jester-battle", title: "Jester Battle", artist: "HydroGene", url: new URL('../../../assets/music/8-bit-jester-battle.mp3', import.meta.url).href, source: "https://opengameart.org/content/8-bit-jester-battle" },
  { id: "8-bit-battle-loop", title: "8-Bit Battle Loop", artist: "Wolfgang_", url: new URL('../../../assets/music/8-bit-battle-loop.mp3', import.meta.url).href, source: "https://opengameart.org/content/8-bit-battle-loop" },
  { id: "dark-shrine-loop", title: "Dark Shrine \u00b7 ambient", artist: "qubodup / yd", url: new URL('../../../assets/music/dark-shrine-loop.mp3', import.meta.url).href, source: "https://opengameart.org/content/dark-shrine-loop" },
  { id: "insistent-background-loop", title: "Insistent \u00b7 ambient", artist: "yd", url: new URL('../../../assets/music/insistent-background-loop.mp3', import.meta.url).href, source: "https://opengameart.org/content/insistent-background-loop" },
] as const;
const defaultTrackId = '8-bit-battle-loop';
const defaultTrackIndex = tracks.findIndex(track => track.id === defaultTrackId);
export const musicSettings = { track: defaultTrackId as string, volume: 0.08, playing: false, enabled: true };
const preferenceKey = 'boot-loop-music-v1';
/** Shared playback; developer controls choose the track used on this browser's player route. */
export function setupMusicLab(developerView = false) {
  const get = <T extends HTMLElement>(id: string) => document.querySelector<T>(id)!;
  const select = get<HTMLSelectElement>('#music-track'), play = get<HTMLButtonElement>('#music-play');
  const volume = get<HTMLInputElement>('#music-volume'), status = get('#music-status');
  const credit = get<HTMLAnchorElement>('#music-credit'), toggle = get<HTMLButtonElement>('#toggle-music');
  const audio = new Audio(); audio.loop = true; audio.preload = 'none';
  audio.muted = get('#mute-audio').getAttribute('aria-pressed') === 'true';
  for (const track of tracks) { const option = document.createElement('option'); option.value = track.id; option.textContent = `${track.title} — ${track.artist}`; select.append(option); }
  let selected = 0, generation = 0, unlocked = false;
  const save = () => { try { localStorage.setItem(preferenceKey, JSON.stringify({ track: musicSettings.track, volume: musicSettings.volume, enabled: musicSettings.enabled, mixVersion: 2 })); } catch { /* Playback works when storage is unavailable. */ } };
  const mutedNote = () => audio.muted ? ' · Sound is off' : '';
  const update = () => {
    musicSettings.playing = !audio.paused;
    play.textContent = audio.paused ? 'Play music' : 'Pause music';
    toggle.textContent = `Music: ${!musicSettings.enabled ? 'off' : audio.paused ? 'ready' : 'on'}`;
    toggle.setAttribute('aria-pressed', String(musicSettings.enabled));
    toggle.title = `${tracks[selected]!.title}${mutedNote()}`;
  };
  const choose = (index: number) => {
    generation++; audio.pause(); selected = (index + tracks.length) % tracks.length;
    const track = tracks[selected]!; audio.src = track.url; select.value = track.id;
    musicSettings.track = track.id; credit.href = track.source; credit.textContent = `${track.artist} · CC0 · source`;
    status.textContent = `Ready: ${track.title}${mutedNote()}`; update();
  };
  const setVolume = (value: number) => {
    musicSettings.volume = Math.max(0, Math.min(1, value)); audio.volume = musicSettings.volume;
    volume.value = String(Math.round(value * 100)); get('#music-volume-value').textContent = `${volume.value}%`;
  };
  const start = async () => {
    const current = generation; status.textContent = `Loading: ${tracks[selected]!.title}${mutedNote()}`;
    try { await audio.play(); if (current === generation) { update(); status.textContent = `Playing: ${tracks[selected]!.title}${mutedNote()}`; } }
    catch { if (current === generation) { update(); toggle.textContent = 'Music: retry'; status.textContent = 'Could not play this track. Press Play to retry or choose another.'; } }
  };
  const pause = () => { generation++; audio.pause(); update(); status.textContent = `Paused: ${tracks[selected]!.title}${mutedNote()}`; };
  const readPreferences = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(preferenceKey) ?? '{}') as Record<string, unknown>;
      const index = tracks.findIndex(t => t.id === saved.track);
      if (index >= 0 && index !== selected) choose(index);
      if (typeof saved.volume === 'number' && Number.isFinite(saved.volume)) {
        // Apply the quieter mix once to preferences saved before this balance change.
        setVolume(saved.mixVersion === 2 ? saved.volume : Math.round(saved.volume * (8 / 18) * 100) / 100);
      }
      if (typeof saved.enabled === 'boolean') musicSettings.enabled = saved.enabled;
    } catch { /* Ignore invalid or unavailable saved preferences. */ }
    update();
  };
  choose(defaultTrackIndex); setVolume(musicSettings.volume); readPreferences(); save();
  const enableAndStart = () => { unlocked = true; musicSettings.enabled = true; save(); void start(); };
  select.addEventListener('change', () => { choose(tracks.findIndex(t => t.id === select.value)); enableAndStart(); });
  for (const [id, direction] of [['#music-previous', -1], ['#music-next', 1]] as const) get(id).addEventListener('click', () => { choose(selected + direction); enableAndStart(); });
  const togglePlayback = () => {
    if (audio.paused) enableAndStart();
    else { musicSettings.enabled = false; pause(); save(); }
  };
  play.addEventListener('click', togglePlayback);
  toggle.addEventListener('click', togglePlayback);
  get('#music-restart').addEventListener('click', () => { audio.currentTime = 0; enableAndStart(); });
  volume.addEventListener('input', () => { setVolume(Number(volume.value) / 100); save(); });
  document.addEventListener('audio-mute', event => {
    audio.muted = (event as CustomEvent<boolean>).detail; update();
    status.textContent = `${audio.paused ? 'Paused' : 'Playing'}: ${tracks[selected]!.title}${mutedNote()}`;
  });
  // Player pages begin on the first interaction, without blocking the game on autoplay policy.
  const unlock = (event: Event) => {
    if ((event.target as Element | null)?.closest('#toggle-music, #mute-audio, .music-lab')) return;
    if (unlocked) return;
    unlocked = true;
    if (!developerView && musicSettings.enabled) void start();
  };
  document.addEventListener('pointerdown', unlock);
  document.addEventListener('keydown', unlock);
  window.addEventListener('storage', event => {
    if (event.key !== preferenceKey) return;
    readPreferences();
    if (!musicSettings.enabled) pause();
    else if (unlocked && !developerView) void start();
  });
  audio.addEventListener('error', () => { update(); toggle.textContent = 'Music: retry'; status.textContent = 'Track unavailable. Choose another or retry.'; });
  audio.addEventListener('playing', update); audio.addEventListener('pause', update);
  window.addEventListener('pagehide', () => { generation++; audio.pause(); });
}
