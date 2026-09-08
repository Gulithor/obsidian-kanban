import { App, Modal, Setting } from 'obsidian';
import { t } from 'src/lang/helpers';

const RECURRENCE_OPTIONS: Array<{ value: string; label: () => string }> = [
  { value: 'daily', label: () => t('Daily') },
  { value: 'weekly', label: () => t('Weekly') },
  { value: 'biweekly', label: () => t('Every two weeks') },
  { value: 'monthly', label: () => t('Monthly') },
];

export class RecurringModal extends Modal {
  private rule: string;
  private readonly onSubmit: (rule: string) => void;

  constructor(app: App, initialRule: string, onSubmit: (rule: string) => void) {
    super(app);
    this.rule = initialRule || 'weekly';
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: t('Set recurring') });

    const select = contentEl.createEl('select');
    select.style.cssText = 'width:100%;box-sizing:border-box;margin:12px 0;';

    for (const { value, label } of RECURRENCE_OPTIONS) {
      const opt = select.createEl('option', { value, text: label() });
      if (value === this.rule) opt.selected = true;
    }

    select.addEventListener('change', () => { this.rule = select.value; });

    new Setting(contentEl)
      .addButton((btn) =>
        btn
          .setButtonText('Save')
          .setCta()
          .onClick(() => {
            this.close();
            this.onSubmit(this.rule);
          })
      )
      .addButton((btn) => btn.setButtonText('Cancel').onClick(() => this.close()));
  }

  onClose() {
    this.contentEl.empty();
  }
}
