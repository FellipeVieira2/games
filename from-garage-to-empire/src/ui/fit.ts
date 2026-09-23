/** Fit a complete content surface inside its allocated space without clipping controls. */
export function fitSurface(content: HTMLElement, maxHeight?: number): void {
  let stage = content.parentElement!;
  // Do not take content out of flow until its container has measurable space.
  if (!stage.clientWidth || !content.getClientRects().length) return;
  if (!stage.classList.contains('fit-stage')) {
    stage = document.createElement('div');
    stage.className = 'fit-stage';
    content.before(stage);
    stage.append(content);
    content.classList.add('fit-content');
  }
  if (!stage.clientWidth || !content.getClientRects().length) return;
  content.style.transform = 'none';
  const width = stage.clientWidth;
  content.style.width = `${width}px`;
  if (maxHeight !== undefined)
    stage.style.height = `${Math.min(maxHeight, content.scrollHeight)}px`;
  const height = stage.clientHeight;
  if (height <= 0) return;
  // Reflow to the scaled width before measuring again. Keep the smallest safe scale.
  let scale = 1;
  for (let attempt = 0; attempt < 3; attempt++) {
    content.style.width = `${width / scale}px`;
    const required = Math.max(content.scrollHeight, content.offsetHeight);
    scale = Math.min(
      scale,
      height / Math.max(1, required),
      width / Math.max(1, content.scrollWidth),
      1,
    );
  }
  content.style.width = `${width / scale}px`;
  content.style.transform = `scale(${scale})`;
}
