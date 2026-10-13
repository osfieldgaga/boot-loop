export function setupOnboarding() {
  const guide = document.querySelector<HTMLDialogElement>('#how-to-play')!;
  const focusGame = () => {
    const game = document.querySelector<HTMLElement>('#game')!; game.scrollIntoView({ block: 'center' }); game.focus();
  };
  document.querySelector('#open-instructions')!.addEventListener('click', () => guide.showModal());
  document.querySelector('#close-instructions')!.addEventListener('click', () => guide.close());
  document.querySelector('#practice-now')!.addEventListener('click', focusGame);
  document.querySelector('#splash-practice')!.addEventListener('click', () => { guide.close(); focusGame(); });
  document.querySelector('#splash-online')!.addEventListener('click', () => { guide.close(); document.querySelector<HTMLElement>('.party-panel')!.scrollIntoView({ block: 'center' }); document.querySelector<HTMLButtonElement>('#create-room')!.focus(); });
  // Invite links go straight to the room. Returning visitors can always reopen help.
  try {
    if (!sessionStorage.getItem('boot-loop-welcome') && !new URLSearchParams(location.search).has('room')) guide.showModal();
    sessionStorage.setItem('boot-loop-welcome', 'seen');
  } catch { /* Instructions remain available when storage is blocked. */ }
}
