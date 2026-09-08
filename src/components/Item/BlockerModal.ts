import { App, Modal, Setting } from 'obsidian';
import { t } from 'src/lang/helpers';

export class BlockerModal extends Modal {
  private description: string;
  private readonly onSubmit: (description: string) => void;

  constructor(app: App, initialDescription: string, onSubmit: (description: string) => void) {
    super(app);
    this.description = initialDescription;
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: t('Blocker description') });

    const ta = contentEl.createEl('textarea', {
      attr: { rows: '3', placeholder: t('Describe the blocker…') },
    });
    ta.value = this.description;
    ta.style.cssText = 'width:100%;box-sizing:border-box;margin:12px 0;resize:vertical;';
    ta.addEventListener('input', () => { this.description = ta.value; });

    new Setting(contentEl)
      .addButton((btn) =>
        btn
          .setButtonText('Save')
          .setCta()
          .onClick(() => {
            this.close();
            this.onSubmit(this.description.trim());
          })
      )
      .addButton((btn) =>
        btn.setButtonText('Cancel').onClick(() => this.close())
      );

    setTimeout(() => ta.focus(), 50);

    contentEl.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        this.close();
        this.onSubmit(this.description.trim());
      }
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}
