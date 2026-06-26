import { MODULE_ID } from './config.js';
import { RestrictBehavior } from './regions.js';

function libWrapControlMethods(type, layer) {
    // Libwrap tile control methods for players

    libWrapper.register(
        MODULE_ID,
        `foundry.canvas.placeables.${type}.prototype._canDrag`,
        function (wrapped, user, event) {
            let result = wrapped(user, event);
            if (this.document.canUserModify(user, 'update')) {
                return result;
            } else {
                return !game.paused && this.document.allowPlayerMove();
            }
        },
        'WRAPPER',
    );

    libWrapper.register(
        MODULE_ID,
        `foundry.canvas.placeables.${type}.prototype._canControl`,
        function (wrapped, ...args) {
            let result = wrapped(...args);
            if (result) return result;
            return !game.paused && (this.document.allowPlayerMove() || this.document.allowPlayerRotate());
        },
        'WRAPPER',
    );

    if (type === 'Tile') {
        libWrapper.register(
            MODULE_ID,
            `foundry.canvas.placeables.${type}.prototype._canHUD`,
            function () {
                return false;
            },
            'OVERRIDE',
        );

        libWrapper.register(
            MODULE_ID,
            `foundry.canvas.placeables.${type}.prototype._canHover`,
            function (wrapped, ...args) {
                let result = wrapped(...args);
                if (result) return result;
                return this.document.allowPlayerMove() || this.document.allowPlayerRotate();
            },
            'WRAPPER',
        );
    }

    // Need to update MouseInteractionManager to point to the new wrapped methods
    layer.placeables.forEach((p) => {
        p.activateListeners();
    });
}

function registerUpdateHook(type) {
    // Hook onto placeable updates. We want to pass these on to the GM if the players have been
    // given permission to update position and/or rotation
    Hooks.on(`preUpdate${type}`, (doc, data, options, userId) => {
        if (game.user.id === userId && !doc.canUserModify(game.user, 'update')) {
            let update = {};

            if (doc.allowPlayerMove()) {
                if ('x' in data) update.x = data.x;
                if ('y' in data) update.y = data.y;
            }

            if (doc.allowPlayerRotate()) {
                if ('rotation' in data) update.rotation = data.rotation;
            }

            if (foundry.utils.isEmpty(update)) return false;

            update._id = doc.id;

            // If it's a position update we need to check if it's within the defined bounds for this scene
            let boundCheckPassed = false;
            if ('x' in data || 'y' in data || 'rotation' in data) {
                let subjectToRestriction = false;
                let restrictedCheckPassed = false;

                for (const region of doc.parent.regions) {
                    const applicableLevel =
                        !region.levels?.length ||
                        region.levels.some((id) => (doc.level ? id === doc.level : doc.levels.has(id)));
                    if (!applicableLevel) continue;

                    const restrictBehavior = region.behaviors.filter(
                        (b) => !b.disabled && b.type === `${MODULE_ID}.restrict`,
                    );
                    if (!restrictBehavior.length) continue;

                    subjectToRestriction = true;

                    const fullFit = restrictBehavior.some((b) => b.system.fullFit);

                    let shape;
                    if (doc instanceof foundry.documents.TokenDocument) {
                        const { width, height } = doc.getSize();
                        const { x, y } = doc;
                        shape = new foundry.data.RectangleShapeData({ x, y, width, height });
                        shape.updateSource({ x: update.x ?? doc.x, y: update.y ?? doc.y });
                    } else {
                        shape = doc.shape.clone();
                        shape.updateSource({
                            x: update.x ?? doc.x,
                            y: update.y ?? doc.y,
                            rotation: update.rotation ?? doc.rotation,
                        });
                    }

                    if (fullFit) {
                        const points = shape.polygons[0].points;
                        const corners = [];
                        for (let i = 0; i < points.length; i += 2) {
                            corners.push({ x: points[i], y: points[i + 1], elevation: doc.elevation });
                        }

                        if (corners.every((p) => region.testPoint(p))) restrictedCheckPassed = true;
                    } else {
                        if (region.testPoint({ ...shape.center, elevation: doc.elevation }))
                            restrictedCheckPassed = true;
                    }
                }

                if (subjectToRestriction) boundCheckPassed = restrictedCheckPassed;
                else boundCheckPassed = true;
            } else {
                boundCheckPassed = true;
            }

            if (boundCheckPassed) {
                const message = {
                    handlerName: type,
                    args: { doc, data: update, options, sceneId: doc.parent.id },
                    type: 'UPDATE',
                };
                game.socket?.emit(`module.${MODULE_ID}`, message);
            }

            return false;
        }
    });
}

export function setupControls() {
    if (game.settings.get(MODULE_ID, 'enableTileControls')) {
        libWrapControlMethods('Tile', canvas.tiles);
        registerUpdateHook('Tile');
    }

    if (game.settings.get(MODULE_ID, 'enableTokenControls')) {
        libWrapControlMethods('Token', canvas.tokens);
        registerUpdateHook('Token');
    }
}
