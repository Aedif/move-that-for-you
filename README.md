![GitHub Latest Version](https://img.shields.io/github/v/release/Aedif/move-that-for-you?sort=semver)
![GitHub Latest Release](https://img.shields.io/github/downloads/Aedif/move-that-for-you/latest/move-that-for-you.zip)
![GitHub All Releases](https://img.shields.io/github/downloads/Aedif/move-that-for-you/move-that-for-you.zip)

# Move That for you

Foundry VTT module for granting players permissions to move/rotate tiles and tokens.

## Usage

Once the module is activated for tiles and/or tokens via **Tile Controls** and **Token Controls** settings a new button will be added to their HUDs:

![Control Butoon](https://user-images.githubusercontent.com/7693704/199137202-0fe5e7ae-380d-4e11-b800-8f0bda38b1f6.png)

Toggle it to enable/disable the ability for players to move the tile or token they normally shouldn't be able to:

![HUD](https://user-images.githubusercontent.com/7693704/200051048-a23da814-f853-45aa-9521-078d7e009caf.png)

Right-clicking the button will grant the players permission to rotate them:

![HUD Rotate](https://user-images.githubusercontent.com/7693704/200051114-4c5caae8-1d73-4354-9582-71bd0c898601.png)

Movement/Rotation can be restricted to regions using **Restrict: Move That For You** behavior:

<img width="1374" height="761" alt="image" src="https://github.com/user-attachments/assets/5c089545-1e36-4927-be09-2e2e80150c50" />

## Tile Layer Controls

Move and Rotate permissions can also be toggled scene-wide using Tile Layer controls:

![image](https://github.com/user-attachments/assets/99ff1e22-bba3-4350-bdc9-8fa02ebd56f9)

## Insert Permission Button to HUD

This setting which is enabled by default will insert the above mentioned button to Tile/Token HUDs. However you may choose to disable this and control `move` and `rotate` permissions via flags instead:

Toggle `move` permissions for currently selected Tile/Tokens:

```js
const controlled = canvas.tiles.controlled.length ? canvas.tiles.controlled : canvas.tokens.controlled;

for (const placeable of controlled) {
  const allowMove = Boolean(placeable.document.getFlag('move-that-for-you', 'allowPlayerMove'));
  if (allowMove) placeable.document.unsetFlag('move-that-for-you', 'allowPlayerMove');
  else placeable.document.setFlag('move-that-for-you', 'allowPlayerMove', true);
}
```

Toggle `rotate` permissions for currently selected Tile/Tokens:

```js
const controlled = canvas.tiles.controlled.length ? canvas.tiles.controlled : canvas.tokens.controlled;

for (const placeable of controlled) {
  const allowRotate = Boolean(placeable.document.getFlag('move-that-for-you', 'allowPlayerRotate'));
  if (allowRotate) placeable.document.unsetFlag('move-that-for-you', 'allowPlayerRotate');
  else placeable.document.setFlag('move-that-for-you', 'allowPlayerRotate', true);
}
```
