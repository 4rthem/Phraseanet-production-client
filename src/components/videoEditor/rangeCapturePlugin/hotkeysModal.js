import videojs from 'video.js';
/**
 * VideoJs Hotkeys Modal
 */

const ModalDialog = videojs.getComponent('ModalDialog');



class HotkeyModal extends ModalDialog {


    constructor(player, settings) {
        super(player, settings);
    }

    modalTemplate = () => {
        return `<div class="vjs-hotkeys-modal"><h1>${this.player_.localize('Keyboard shortcuts')}</h1>
            <dl class="dl-horizontal">
            <dt>${this.player_.localize('Play')}</dt><dd><span class="shortcut-label">${this.player_.localize('Space bar')}</span> ${this.player_.localize('or')} <span class="shortcut-label">L</span></dd>
            <dt>${this.player_.localize('Pause')}</dt><dd><span class="shortcut-label">${this.player_.localize('Space bar')}</span> ${this.player_.localize('or')} <span class="shortcut-label">K</span></dd>
            <dt>${this.player_.localize('One frame forward')}</dt><dd><span class="shortcut-label">&gt;</span></dd>
            <dt>${this.player_.localize('One frame backward')}</dt><dd><span class="shortcut-label">&lt;</span></dd>
            <dt>${this.player_.localize('Add an entry point')}</dt><dd><span class="shortcut-label">I</span></dd>
            <dt>${this.player_.localize('Add an end point')}</dt><dd><span class="shortcut-label">O</span></dd>
            <dt>${this.player_.localize('Previous cuepoint')}</dt><dd><span class="shortcut-label">${this.player_.localize('Shift')}</span> + <span class="shortcut-label">I</span></dd>
            <dt>${this.player_.localize('Next cuepoint')}</dt><dd><span class="shortcut-label">${this.player_.localize('Shift')}</span> + <span class="shortcut-label">O</span></dd>
            <dt>${this.player_.localize('Delete current')}</dt><dd><span class="shortcut-label">${this.player_.localize('Shift')}</span> + <span class="shortcut-label">${this.player_.localize('Suppr')}</span></dd>
            <dt>${this.player_.localize('Toggle loop')}</dt><dd><span class="shortcut-label">${this.player_.localize('Ctrl')}</span> + <span class="shortcut-label">${this.player_.localize('L')}</span></dd>
            </dl>
            </div>`;
    }

    initialize() {
        let domTpl = document.createElement('div');
        domTpl.innerHTML = this.modalTemplate();
        this.fillWith(domTpl)

    }
}

videojs.registerComponent('HotkeyModal', HotkeyModal);

export default HotkeyModal;
