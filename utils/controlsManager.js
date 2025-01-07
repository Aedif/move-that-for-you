import { MODULE_ID } from './config.js';

function libWrapControlMethods(type, layer) {
  // Libwrap tile control methods for players

  libWrapper.register(
    MODULE_ID,
    `${type}.prototype._canDrag`,
    function (wrapped, user, event) {
      let result = wrapped(user, event);
      if (this.document.canUserModify(user, 'update')) {
        return result;
      } else {
        return !game.paused && this.document.allowPlayerMove();
      }
    },
    'WRAPPER'
  );

  libWrapper.register(
    MODULE_ID,
    `${type}.prototype._canControl`,
    function (wrapped, ...args) {
      let result = wrapped(...args);
      if (result) return result;
      return !game.paused && (this.document.allowPlayerMove() || this.document.allowPlayerRotate());
    },
    'WRAPPER'
  );

  if (type === 'Tile') {
    libWrapper.register(
      MODULE_ID,
      `${type}.prototype._canHUD`,
      function () {
        return false;
      },
      'OVERRIDE'
    );

    libWrapper.register(
      MODULE_ID,
      `${type}.prototype._canHover`,
      function (wrapped, ...args) {
        let result = wrapped(...args);
        if (result) return result;
        return !game.paused && (this.document.allowPlayerMove() || this.document.allowPlayerRotate());
      },
      'WRAPPER'
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
      if ('x' in data || 'y' in data) {
        const canvasBounds = doc.parent.getFlag(MODULE_ID, 'bounds') || [];
        if (canvasBounds.length) {
          const x = 'x' in data ? data.x : doc.x;
          const y = 'y' in data ? data.y : doc.y;
          const width = doc.width;
          const height = doc.height;

          const fitInBounds = game.settings.get(MODULE_ID, 'fitInBounds');

          canvasBounds.forEach((b) => {
            if (fitInBounds) {
              if (x >= b.x1 && x <= b.x2 && y >= b.y1 && y <= b.y2 && x + width <= b.x2 && y + height <= b.y2) {
                boundCheckPassed = true;
              }
            } else {
              if (x >= b.x1 && x <= b.x2 && y >= b.y1 && y <= b.y2) {
                boundCheckPassed = true;
              }
            }
          });
        } else {
          boundCheckPassed = true;
        }
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
