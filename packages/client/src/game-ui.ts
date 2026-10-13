let initialized = false;
let panelOpen = true;
let lastPhase = '';
let panel: HTMLElement;
let toggle: HTMLButtonElement;
let notice: HTMLElement;
let noticeText: HTMLElement;
let noticeUntil = 0;
function refreshNotice() { if (notice) notice.hidden = panelOpen || performance.now() >= noticeUntil; }


function displayPanel(open: boolean) {
  if (!initialized) return;
  panelOpen = open;
  panel.hidden = !open;
  toggle.setAttribute('aria-expanded', String(open));
  refreshNotice();
}

/** Reuse the existing room controls and result renderer inside the game component. */
export function setupGameUI() {
  if (initialized || document.documentElement.dataset.view !== 'play') return;
  const arena = document.querySelector<HTMLElement>('.arena-card')!;
  const toolbar = document.createElement('div'); toolbar.className = 'game-toolbar';
  const actions = document.querySelector<HTMLElement>('.shell > .onboarding-actions')!;
  toolbar.append(document.querySelector<HTMLElement>('.masthead')!, actions);
  arena.prepend(toolbar);
  toggle = document.createElement('button'); toggle.type = 'button'; toggle.textContent = 'Room / menu';
  toggle.id = 'game-menu'; toggle.setAttribute('aria-controls', 'game-room-panel');
  actions.prepend(toggle);

  const layer = document.createElement('div'); layer.className = 'game-ui-layer';
  document.querySelector('#arena-viewport')!.append(layer);
  panel = document.querySelector<HTMLElement>('.party-panel')!;
  panel.id = 'game-room-panel'; layer.append(panel);
  const result = document.querySelector<HTMLElement>('#match-result')!;
  panel.insertBefore(result, panel.children[1]!);
  const footer = document.createElement('div'); footer.className = 'game-panel-actions';
  footer.append(document.querySelector('#start-match')!);
  const close = document.createElement('button'); close.type = 'button'; close.textContent = 'Back to game';
  close.id = 'close-game-menu'; footer.append(close); panel.append(footer);

  const settings = document.createElement('details'); settings.className = 'game-match-settings';
  const summary = document.createElement('summary'); summary.textContent = 'Arena / match settings'; settings.append(summary);
  const fields = document.createElement('div'); fields.className = 'game-match-settings-fields'; settings.append(fields);
  for (const id of ['match-arena', 'match-mode', 'starting-stocks', 'match-duration']) {
    const select = document.querySelector<HTMLSelectElement>(`#${id}`)!;
    const label = document.querySelector<HTMLLabelElement>(`label[for="${id}"]`) ?? select.closest('label');
    if (label) fields.append(label);
    if (!label?.contains(select)) fields.append(select);
  }
  fields.append(document.querySelector('#arena-description')!);
  panel.insertBefore(settings, footer);
  notice = document.createElement('div'); notice.className = 'game-notice'; notice.id = 'game-notice'; notice.hidden = true;
  noticeText = document.createElement('p'); noticeText.setAttribute('role', 'status'); notice.append(noticeText);
  const dismiss = document.createElement('button'); dismiss.type = 'button'; dismiss.textContent = '×'; dismiss.setAttribute('aria-label', 'Dismiss room message'); notice.append(dismiss);
  dismiss.addEventListener('click', () => { noticeUntil = 0; refreshNotice(); document.querySelector<HTMLElement>('#game')!.focus(); });
  layer.append(notice);
  const feedback = document.querySelector<HTMLElement>('#party-feedback')!;
  let lastMessage = ''; let noticeTimer: ReturnType<typeof setTimeout> | undefined;
  new MutationObserver(() => {
    const message = feedback.textContent?.trim() ?? '';
    if (!message || message === lastMessage) return;
    lastMessage = message; noticeText.textContent = message;
    const error = /could not|connection|interrupted|cancelled|unavailable|stalled|expired/i.test(message);
    notice.dataset.kind = error ? 'error' : 'info';
    clearTimeout(noticeTimer); noticeUntil = error ? Infinity : performance.now() + 7000;
    if (!error) noticeTimer = setTimeout(refreshNotice, 7000);
    refreshNotice();
  }).observe(feedback, { childList: true, characterData: true, subtree: true });
  initialized = true;
  toggle.addEventListener('click', () => displayPanel(!panelOpen));
  close.addEventListener('click', () => { displayPanel(false); document.querySelector<HTMLElement>('#game')!.focus(); });
  for (const id of ['practice-now', 'splash-practice']) document.querySelector(`#${id}`)!.addEventListener('click', () => displayPanel(false));
  document.querySelector('#splash-online')!.addEventListener('click', () => displayPanel(true));
  displayPanel(true);
}

export function updateGameUI(phase: string, inRoom: boolean) {
  if (!initialized) return;
  if (phase !== lastPhase) {
    lastPhase = phase;
    displayPanel(!['running', 'countdown'].includes(phase));
  }
  toggle.textContent = inRoom ? 'Room' : 'Play / menu';
  document.querySelector<HTMLElement>('.game-match-settings summary')!.textContent = inRoom ? 'Arena / match settings' : 'Practice arena';
  for (const id of ['match-mode', 'match-duration']) {
    const field = document.querySelector<HTMLSelectElement>(`#${id}`)!;
    field.hidden = !inRoom;
    for (const label of field.labels ?? []) label.hidden = !inRoom;
  }
}
