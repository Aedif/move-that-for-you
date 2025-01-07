import TileBoundConfig from './app/boundConfiguration.js';
import { MODULE_ID } from './utils/config.js';
import { setupControls } from './utils/controlsManager.js';
import { registerHUD } from './utils/hud.js';

Hooks.once('init', () => {
  // Register socket to forward player updates to GMs
  game.socket?.on(`module.${MODULE_ID}`, (message) => {
    if (game.user.isGM && message.type === 'UPDATE') {
      const isResponsibleGM = game.users
        .filter((u) => u.active && u.isGM)
        .sort((a, b) => b.role - a.role || a.id.compare(b.id))[0]?.isSelf;
      if (!isResponsibleGM) return;
      const scene = game.collections.get('Scene').get(message.args.sceneId);
      scene.updateEmbeddedDocuments(message.handlerName, [message.args.data], message.args.options);
    }
  });

  // Register settings
  game.settings.registerMenu(MODULE_ID, 'configureBounds', {
    name: game.i18n.format(`${MODULE_ID}.settings.configure-bounds.name`),
    hint: game.i18n.format(`${MODULE_ID}.settings.configure-bounds.hint`),
    label: '',
    scope: 'world',
    icon: 'fas fa-cog',
    type: TileBoundConfig,
    restricted: true,
  });

  game.settings.register(MODULE_ID, 'fitInBounds', {
    name: game.i18n.localize(`${MODULE_ID}.settings.fit-in-bounds.name`),
    hint: game.i18n.localize(`${MODULE_ID}.settings.fit-in-bounds.hint`),
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register(MODULE_ID, 'enableTileControls', {
    name: game.i18n.localize(`${MODULE_ID}.settings.enable-tile-controls.name`),
    hint: game.i18n.localize(`${MODULE_ID}.settings.enable-tile-controls.hint`),
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(MODULE_ID, 'enableTokenControls', {
    name: game.i18n.localize(`${MODULE_ID}.settings.enable-token-controls.name`),
    hint: game.i18n.localize(`${MODULE_ID}.settings.enable-token-controls.hint`),
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register(MODULE_ID, 'enableHUDButtons', {
    name: game.i18n.localize(`${MODULE_ID}.settings.enable-hud-buttons.name`),
    hint: game.i18n.localize(`${MODULE_ID}.settings.enable-hud-buttons.hint`),
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
  });

  // Register keybindings
  game.keybindings.register(MODULE_ID, 'configureBoundsKey', {
    name: game.i18n.localize(`${MODULE_ID}.settings.configure-bounds-key.name`),
    hint: game.i18n.localize(`${MODULE_ID}.settings.configure-bounds-key.hint`),
    editable: [
      {
        key: 'KeyB',
        modifiers: ['Shift'],
      },
    ],
    onDown: () => {
      new TileBoundConfig().render(true);
    },
    restricted: true,
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
  });

  // Patch helper functions to check if Tiles/Tokens can be moved or rotated by players
  const allowPlayerMove = function () {
    return this.getFlag(MODULE_ID, 'allowPlayerMove') || this.parent.getFlag(MODULE_ID, 'allowPlayerMove');
  };

  const allowPlayerRotate = function () {
    return this.getFlag(MODULE_ID, 'allowPlayerRotate') || this.parent.getFlag(MODULE_ID, 'allowPlayerRotate');
  };

  TileDocument.prototype.allowPlayerMove = allowPlayerMove;
  TileDocument.prototype.allowPlayerRotate = allowPlayerRotate;
  TokenDocument.prototype.allowPlayerMove = allowPlayerMove;
  TokenDocument.prototype.allowPlayerRotate = allowPlayerRotate;

  // Disable Tile resize handle for user who don't have Tile update permissions
  libWrapper.register(
    MODULE_ID,
    `Tile.prototype._draw`,
    async function (wrapped, ...args) {
      let result = await wrapped(...args);
      if (!this.document.canUserModify(game.user, 'update')) {
        this.frame.handle.eventMode = 'none';
        this.frame.handle.alpha = 0;
      }
      return result;
    },
    'WRAPPER'
  );
});

/*
 * Since game.user is not initialized on init Hook we cannot libWrap permission functions just for players
 * before references to them are stored in MouseInteractionManager
 * As a workaround let the canvas load, modify permission functions for existing tiles, and then libWrap them
 */

Hooks.once('canvasReady', () => {
  // Add additional controls to the Tile HUD for GMs
  if (game.user.isGM) {
    registerHUD();
    return;
  }

  // Register controls for Players
  setupControls();
});

Hooks.on('getSceneControlButtons', (controls) => {
  // Add scene-wide toggles for the GM
  for (const control of controls) {
    if (control.name === 'tiles') {
      control.tools.push({
        name: 'mtfyMove',
        title: game.i18n.localize(`${MODULE_ID}.scene.move`),
        icon: 'fas fa-people-carry',
        visible: game.user.isGM,
        active: canvas.scene?.getFlag(MODULE_ID, 'allowPlayerMove'),
        toggle: true,
        onClick: () => {
          canvas.scene?.setFlag(MODULE_ID, 'allowPlayerMove', !canvas.scene.getFlag(MODULE_ID, 'allowPlayerMove'));
        },
      });
      control.tools.push({
        name: 'mtfyRotate',
        title: game.i18n.localize(`${MODULE_ID}.scene.rotate`),
        icon: 'fas fa-sync fa-lg',
        visible: game.user.isGM,
        active: canvas.scene?.getFlag(MODULE_ID, 'allowPlayerRotate'),
        toggle: true,
        onClick: () => {
          canvas.scene?.setFlag(MODULE_ID, 'allowPlayerRotate', !canvas.scene.getFlag(MODULE_ID, 'allowPlayerRotate'));
        },
      });
      break;
    }
  }

  // Hide core tile tools for players, only keeping "select";
  if (game.user.isGM || !game.settings.get(MODULE_ID, 'enableTileControls')) return;

  for (let i = 0; i < controls.length; i++) {
    if (controls[i].name === 'tiles') {
      controls[i].visible = true;

      const coreTools = ['tile', 'browse', 'foreground'];
      controls[i].tools.forEach((t) => {
        if (coreTools.includes(t.name)) {
          t.visible = false;
        }
      });

      return;
    }
  }
});

/*
 * If Mass Edit is active, add checkboxes to the config forms
 */

Hooks.once('ready', () => {
  if (!game.user.isGM || !game.modules.get('multi-token-edit')?.active) return;

  const forms = [];
  if (game.settings.get(MODULE_ID, 'enableTileControls')) forms.push('Tile');
  if (game.settings.get(MODULE_ID, 'enableTokenControls')) forms.push('Token');

  forms.forEach((type) => {
    Hooks.on(`render${type}Config`, (app, html, data) => {
      const isInjected = html.find(`input[name="flags.${MODULE_ID}.allowPlayerMove"]`).length > 0;
      if (isInjected) return;

      const allowMove = app.object.getFlag(MODULE_ID, 'allowPlayerMove');
      const allowRotate = app.object.getFlag(MODULE_ID, 'allowPlayerRotate');

      const newHtml = `
    <div class="form-group">
      <label>${game.i18n.localize(`${MODULE_ID}.tile-config.move.label`)}</label>
      <div class="form-fields">
          <input type="checkbox" name="flags.${MODULE_ID}.allowPlayerMove" ${allowMove ? 'checked' : ''}>
      </div>
      <p class="notes">${game.i18n.localize(`${MODULE_ID}.tile-config.move.note`)}</p>
    </div>
  
    <div class="form-group">
      <label>${game.i18n.localize(`${MODULE_ID}.tile-config.rotate.label`)}</label>
      <div class="form-fields">
          <input type="checkbox" name="flags.${MODULE_ID}.allowPlayerRotate" ${allowRotate ? 'checked' : ''}>
      </div>
      <p class="notes">${game.i18n.localize(`${MODULE_ID}.tile-config.rotate.note`)}</p>
    </div>
  `;

      if (type === 'Token') {
        html.find(`select[name="disposition"]`).closest('.form-group').after(newHtml);
      } else {
        html.find(`input[name="texture.tint"]`).closest('.form-group').after(newHtml);
      }
      app.setPosition({ height: 'auto' });
    });
  });
});
