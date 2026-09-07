import { App, Modal, TFile } from 'obsidian';
import { t } from 'src/lang/helpers';

export class DeleteCardModal extends Modal {
  private file: TFile;
  private onDeleteCard: () => void;
  private onDeleteCardAndNote: () => Promise<void>;

  constructor(
    app: App,
    file: TFile,
    onDeleteCard: () => void,
    onDeleteCardAndNote: () => Promise<void>
  ) {
    super(app);
    this.file = file;
    this.onDeleteCard = onDeleteCard;
    this.onDeleteCardAndNote = onDeleteCardAndNote;
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl('h3', { text: t('Delete card') });
    contentEl.createEl('p', {
      text: t('This card is linked to the note "{{noteName}}". What would you like to do?').replace(
        '{{noteName}}',
        this.file.basename
      ),
    });

    const buttons = contentEl.createDiv({ cls: 'modal-button-container' });

    buttons.createEl('button', { text: t('Cancel') }).addEventListener('click', () => {
      this.close();
    });

    buttons
      .createEl('button', { text: t('Delete card only') })
      .addEventListener('click', () => {
        this.close();
        this.onDeleteCard();
      });

    const deleteAllBtn = buttons.createEl('button', {
      text: t('Delete card and note'),
      cls: 'mod-warning',
    });
    deleteAllBtn.addEventListener('click', async () => {
      this.close();
      await this.onDeleteCardAndNote();
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}
