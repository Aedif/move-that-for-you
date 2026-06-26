import { MODULE_ID } from './utils/config.js';
import { setupControls } from './utils/controlsManager.js';
import { registerHUD } from './utils/hud.js';
import { RestrictBehavior } from './utils/regions.js';

Hooks.once('init', () => {
    Object.assign(CONFIG.RegionBehavior.dataModels, {
        [`${MODULE_ID}.restrict`]: RestrictBehavior,
    });

    Object.assign(CONFIG.RegionBehavior.typeIcons, {
        [`${MODULE_ID}.restrict`]: 'fas fa-people-carry',
    });

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
    // // Add scene-wide toggles for the GM
    controls.tiles.tools.mtfyMove = {
        name: 'mtfyMove',
        title: game.i18n.localize(`${MODULE_ID}.scene.move`),
        icon: 'fas fa-people-carry',
        visible: game.user.isGM,
        active: canvas.scene?.getFlag(MODULE_ID, 'allowPlayerMove'),
        toggle: true,
        onChange: () => {
            canvas.scene?.setFlag(MODULE_ID, 'allowPlayerMove', !canvas.scene.getFlag(MODULE_ID, 'allowPlayerMove'));
        },
    };

    controls.tiles.tools.mtfyRotate = {
        name: 'mtfyRotate',
        title: game.i18n.localize(`${MODULE_ID}.scene.rotate`),
        icon: 'fas fa-sync fa-lg',
        visible: game.user.isGM,
        active: canvas.scene?.getFlag(MODULE_ID, 'allowPlayerRotate'),
        toggle: true,
        onChange: () => {
            canvas.scene?.setFlag(
                MODULE_ID,
                'allowPlayerRotate',
                !canvas.scene.getFlag(MODULE_ID, 'allowPlayerRotate'),
            );
        },
    };

    // Hide core tile tools for players, only keeping "select";
    if (game.user.isGM || !game.settings.get(MODULE_ID, 'enableTileControls')) return;

    controls.tiles.visible = true;
    // 'foreground'
    ['tile', 'browse'].forEach((tool) => {
        controls.tiles.tools[tool].visible = false;
    });
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
        Hooks.on(`render${type}Config`, async (app, html, data) => {
            const isInjected = html.find(`input[name="flags.${MODULE_ID}.allowPlayerMove"]`).length > 0;
            if (isInjected) return;

            const allowMove = app.object.getFlag(MODULE_ID, 'allowPlayerMove');
            const allowRotate = app.object.getFlag(MODULE_ID, 'allowPlayerRotate');

            const flagHtml = await renderTemplate(`modules/${MODULE_ID}/templates/flagConfig.html`, {
                allowMove,
                allowRotate,
                MODULE_ID,
            });

            if (type === 'Token') html.find(`[name="disposition"]`).closest('.form-group').after(flagHtml);
            else html.find(`[name="texture.tint"]`).closest('.form-group').after(flagHtml);

            app.setPosition({ height: 'auto' });
        });
    });

    // Mass Edit Bag support
    Hooks.on('renderBagConfig', async (bagConfig, html, options) => {
        const isInjected = html.find(`input[name="flags.${MODULE_ID}.allowPlayerMove"]`).length > 0;
        if (isInjected) return;

        const allowMove = foundry.utils.getProperty(bagConfig.preset.data[0], `flags.${MODULE_ID}.allowPlayerMove`);
        const allowRotate = foundry.utils.getProperty(bagConfig.preset.data[0], `flags.${MODULE_ID}.allowPlayerRotate`);

        const flagHtml = await renderTemplate(`modules/${MODULE_ID}/templates/flagConfig.html`, {
            allowMove,
            allowRotate,
            MODULE_ID,
            spawnNote: true,
        });

        html.find('[name="searchBar"]').closest('.form-group').after(flagHtml);
        bagConfig.setPosition({ height: 'auto' });
    });
});

/**
 * Register custom behaviors
 */
export function registerBehaviors() {
    Object.assign(CONFIG.RegionBehavior.dataModels, {
        [`${MODULE_ID}.linkToken`]: LinkTokenRegionBehaviorType,
        [`${MODULE_ID}.spawnPreset`]: SpawnPresetBehaviorType,
        [`${MODULE_ID}.deSpawnPreset`]: DeSpawnPresetBehaviorType,
    });

    Object.assign(CONFIG.RegionBehavior.typeIcons, {
        [`${MODULE_ID}.linkToken`]: 'fas fa-link',
        [`${MODULE_ID}.spawnPreset`]: 'fa-solid fa-books',
        [`${MODULE_ID}.deSpawnPreset`]: 'fa-duotone fa-books',
    });
}
