import { MODULE_ID } from './config.js';

export function registerHUD() {
  registerHUDButton('Tile');
  registerHUDButton('Token');
}

function registerHUDButton(type) {
  // Add additional controls for GMs
  Hooks.on(`render${type}HUD`, (hud, form, options) => {
    if (!game.settings.get(MODULE_ID, 'enableHUDButtons') || !game.settings.get(MODULE_ID, `enable${type}Controls`))
      return;

    // Create the controls
    const playerMoveControl = $(`
    <button class="control-icon " data-action="playerMove">
      <div>
        <i title="${game.i18n.format('move-that-for-you.control-title')}" class="fas fa-people-carry"></i>
        <i class="allowRotate fas fa-sync fa-lg"></i>
      </div>
    </button>
    `);
    const rotateControl = playerMoveControl.find('.allowRotate');
    $(form).find('div.col.right').last().append(playerMoveControl);

    const doc = hud.object.document;

    // Pre-active the controls if need be
    if (doc.getFlag(MODULE_ID, 'allowPlayerMove')) {
      playerMoveControl.addClass('active');
    }

    if (doc.getFlag(MODULE_ID, 'allowPlayerRotate')) {
      rotateControl.addClass('active');
    }

    // Register listeners
    playerMoveControl.click(async () => {
      if (playerMoveControl.hasClass('active')) {
        await doc.unsetFlag(MODULE_ID, 'allowPlayerMove');
        playerMoveControl.removeClass('active');
      } else {
        doc.setFlag(MODULE_ID, 'allowPlayerMove', true);
        playerMoveControl.addClass('active');
      }
    });
    playerMoveControl.contextmenu(async () => {
      if (rotateControl.hasClass('active')) {
        await doc.unsetFlag(MODULE_ID, 'allowPlayerRotate');
        rotateControl.removeClass('active');
      } else {
        doc.setFlag(MODULE_ID, 'allowPlayerRotate', true);
        rotateControl.addClass('active');
      }
    });
  });
}
