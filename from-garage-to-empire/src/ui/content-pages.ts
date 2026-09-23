type Labels = { previous: string; next: string };
type Paging = { nodes: Node[]; hidden: boolean[]; restore: (() => void)[]; page: number };
const states = new WeakMap<HTMLElement, Paging>();

/** Reflow real content into pages, keeping the original controls and their listeners. */
export function resetContentPages(host: HTMLElement): number {
  const state = states.get(host);
  if (!state) return 0;
  state.restore.forEach((restore) => restore());
  host.replaceChildren(...state.nodes);
  Array.from(host.children).forEach((child, index) => {
    (child as HTMLElement).hidden = state.hidden[index] ?? false;
  });
  host.classList.remove('content-paged');
  states.delete(host);
  return state.page;
}

export function paginateContent(host: HTMLElement, maxHeight: number, labels: Labels): void {
  const previousPage = resetContentPages(host);
  if (maxHeight < 100 || !host.getClientRects().length) return;
  if (host.getBoundingClientRect().height <= maxHeight + 1 && host.scrollHeight <= maxHeight + 1)
    return;
  const state: Paging = {
    nodes: Array.from(host.childNodes),
    hidden: Array.from(host.children).map((child) => (child as HTMLElement).hidden),
    restore: [],
    page: previousPage,
  };
  states.set(host, state);
  host.classList.add('content-paged');
  const css = getComputedStyle(host);
  const gap = parseFloat(css.rowGap) || 8;
  const padding = (parseFloat(css.paddingTop) || 0) + (parseFloat(css.paddingBottom) || 0);
  // Reserve room for navigation; do not scale text to make an oversized card fit.
  const budget = maxHeight - padding - 56 - gap;
  for (const block of Array.from(host.children) as HTMLElement[]) {
    if (block.hidden || block.getBoundingClientRect().height <= budget) continue;
    if (!block.matches('dl, ul, .settings, .requirements, .finance-metrics, .finance-breakdown'))
      continue;
    const nodes = Array.from(block.childNodes);
    state.restore.push(() => block.replaceChildren(...nodes));
    const rows = Array.from(block.children);
    const group = block.matches('.finance-breakdown') ? 2 : 1;
    for (let index = 0; index < rows.length; index += group) {
      const section = block.cloneNode(false) as HTMLElement;
      section.removeAttribute('id');
      section.append(...rows.slice(index, index + group));
      if (block.matches('.finance-metrics')) section.style.gridTemplateColumns = '1fr';
      block.before(section);
    }
    block.remove();
  }
  const blocks = (Array.from(host.children) as HTMLElement[]).filter(
    (block) => !block.hidden && getComputedStyle(block).display !== 'none',
  );
  const pages: HTMLElement[][] = [[]];
  let height = 0;
  for (const block of blocks) {
    const style = getComputedStyle(block);
    const outer =
      block.getBoundingClientRect().height +
      (parseFloat(style.marginTop) || 0) +
      (parseFloat(style.marginBottom) || 0);
    if (height && height + gap + outer > budget) {
      pages.push([]);
      height = 0;
    }
    pages[pages.length - 1]!.push(block);
    height += outer + (height ? gap : 0);
  }
  const nav = document.createElement('div');
  nav.className = 'content-pager';
  const prev = document.createElement('button');
  const next = document.createElement('button');
  const status = document.createElement('span');
  status.setAttribute('aria-live', 'polite');
  prev.type = next.type = 'button';
  prev.textContent = labels.previous;
  next.textContent = labels.next;
  nav.append(prev, status, next);
  host.append(nav);
  const show = () => {
    state.page = Math.max(0, Math.min(state.page, pages.length - 1));
    pages.forEach((page, index) =>
      page.forEach((block) => {
        block.hidden = index !== state.page;
      }),
    );
    prev.disabled = state.page === 0;
    next.disabled = state.page === pages.length - 1;
    status.textContent = `${state.page + 1} / ${pages.length}`;
  };
  prev.addEventListener('click', () => {
    state.page--;
    show();
  });
  next.addEventListener('click', () => {
    state.page++;
    show();
  });
  show();
}
