import { Keymap, Menu, parseLinktext } from 'obsidian';
import { KanbanView } from 'src/KanbanView';

const noBreakSpace = /\u00A0/g;

interface NormalizedPath {
  root: string;
  subpath: string;
  alias: string;
}

export function getNormalizedPath(path: string): NormalizedPath {
  const stripped = path.replace(noBreakSpace, ' ').normalize('NFC');

  // split on first occurance of '|'
  // "root#subpath##subsubpath|alias with |# chars"
  //             0            ^        1
  const splitOnAlias = stripped.split(/\|(.*)/);

  // split on first occurance of '#' (in substring)
  // "root#subpath##subsubpath"
  //   0  ^        1
  const splitOnHash = splitOnAlias[0].split(/#(.*)/);

  return {
    root: splitOnHash[0],
    subpath: splitOnHash[1] ? '#' + splitOnHash[1] : '',
    alias: splitOnAlias[1] || '',
  };
}

export function applyCheckboxIndexes(dom: HTMLElement) {
  const checkboxes = dom.querySelectorAll('.task-list-item-checkbox');

  checkboxes.forEach((el, i) => {
    (el as HTMLElement).dataset.checkboxIndex = i.toString();
  });
}

export function bindMarkdownEvents(view: KanbanView) {
  const { contentEl, app } = view;

  const parseLink = (el: HTMLElement) => {
    const href = el.getAttr('data-href') || el.getAttr('href');
    if (!href) return null;

    return {
      href,
      displayText: el.getText().trim(),
    };
  };

  const onLinkClick = (evt: MouseEvent, targetEl: HTMLElement) => {
    if (evt.button !== 0 && evt.button !== 1) return;

    const link = parseLink(targetEl);
    if (!link) return;

    evt.preventDefault();

    const modEvent = Keymap.isModEvent(evt);

    if (modEvent !== false) {
      // Modifier key (split, new window, etc.) — use the standard workspace API
      app.workspace.openLinkText(link.href, view.file.path, modEvent);
      return;
    }

    // Plain click: resolve the file and call openFile on the kanban's own leaf,
    // exactly like the file explorer does. This lets plugins that patch
    // WorkspaceLeaf.prototype.openFile (e.g. "Open in New Tab") intercept correctly.
    const { path, subpath } = parseLinktext(link.href);
    const file = app.metadataCache.getFirstLinkpathDest(path, view.file.path);

    if (file) {
      view.leaf.openFile(file, subpath ? { eState: { subpath } } : undefined);
    } else {
      app.workspace.openLinkText(link.href, view.file.path, false);
    }
  };

  contentEl.on('click', 'a.internal-link', onLinkClick);
  contentEl.on('auxclick', 'a.internal-link', onLinkClick);
  contentEl.on('dragstart', 'a.internal-link', (evt: DragEvent) => {
    evt.preventDefault();
  });
  contentEl.on('contextmenu', 'a.internal-link', (evt: PointerEvent, targetEl: HTMLElement) => {
    const link = parseLink(targetEl);
    if (!link) return;

    const menu = new Menu();
    (menu as any).addSections(['title', 'open', 'action', 'view', 'info', '', 'danger']);
    (app.workspace as any).handleLinkContextMenu(menu, link.href, view.file.path);
    menu.showAtMouseEvent(evt);
  });
  contentEl.on('mouseover', 'a.internal-link', (evt: MouseEvent, targetEl: HTMLElement) => {
    const link = parseLink(targetEl);
    if (!link) return;
    app.workspace.trigger('hover-link', {
      event: evt,
      source: 'preview',
      hoverParent: view,
      targetEl,
      linktext: link.href,
      sourcePath: view.file.path,
    });
  });
  contentEl.on('click', 'a.external-link', (evt: MouseEvent, targetEl: HTMLElement) => {
    const link = parseLink(targetEl);
    if (!link) return;

    evt.preventDefault();

    if (!link.href || link.href.contains(' ')) return;
    try {
      new URL(link.href);
    } catch (e) {
      return;
    }

    const paneType = Keymap.isModEvent(evt);
    const clickTarget = typeof paneType === 'boolean' ? '' : paneType;
    window.open(link.href, clickTarget);
  });
  contentEl.on('contextmenu', 'a.external-link', (evt: PointerEvent, targetEl: HTMLElement) => {
    const link = parseLink(targetEl);
    if (!link) return;

    const menu = new Menu();
    (menu as any).addSections([
      'title',
      'open',
      'selection',
      'clipboard',
      'action',
      'view',
      'info',
      '',
      'danger',
    ]);
    (app.workspace as any).handleExternalLinkContextMenu(menu, link.href);
    menu.showAtMouseEvent(evt);
  });
  contentEl.on('click', 'a.tag', (evt: MouseEvent, targetEl: HTMLElement) => {
    if (evt.button !== 0) return;

    const tag = targetEl.getText();
    const searchPlugin = (app as any).internalPlugins.getPluginById('global-search');
    const stateManager = view.plugin.getStateManager(view.file);
    const tagAction = stateManager.getSetting('tag-action');

    if (tagAction === 'kanban') {
      view.emitter.emit('hotkey', { commandId: 'editor:open-search', data: tag });
    } else if (searchPlugin) {
      searchPlugin.instance.openGlobalSearch(`tag:${tag}`);
    }
  });
}
