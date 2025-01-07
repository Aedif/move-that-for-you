# 2.1.1

- TileDocument/s have been added methods `allowPlayerMove()` and `allowPlayerRotate()` to check player permissions

# 2.1.0

- Added Tile layer controls to allow scene-wide toggling of move and rotate permissions for players

# 2.0.1

- Fixed Tile resize handle being interactable for players

# 2.0.0

- v12 Support

# 1.5.0

- New Setting: `Insert Permission Button to HUD`
  - Enabled by default
  - Inserts a permission control button to Tile/Token HUDs
- Added examples to toggle `move` and `rotate` permissions via macros

# 1.4.1

- ForgeVTT related bug fix

# 1.4.0

- Added support for Tokens
- New Settings: **Tile Controls** and **Token Controls**
  - Allows enabling/disabling of the module per placeable type

# 1.3.2

- Fixing corrupted release

# 1.3.1

- GM is no longer required to be present on the same scene as the player when the tiles are moved

# 1.3.0

- New setting: **Tile Bound Config**
  - Allows to define bounds within which players will be able to move tiles
  - Any number of bounds can be defined for each scene
- New settings: **Tile must fit within bounds**
  - By default only the top-left corner of the tile must sit within bounds
  - When this setting is enabled the whole tile must fit within the bounds
- New key-binding: **Tile Bound Config**
  - Opens Tile Bound Config window without needing to go through module settings
- If **Mass Edit** module is active **Player Move** and **Player Rotate** fields will be added to tile configuration forms
  - Allows for mass granting of permissions to players
- Fixed Token HUD visual bug when additional buttons are added by other modules

# 1.2.0

- Removed the need to libWrap tile functions for GMs
- Move and Rotate permissions can now be given independently for each tile
  - i.e. a tile can be set to be movable by players, rotatable by players, or both
- If permissions are not given instead of throwing errors the module will now simply prevent the move/rotate operation

# 1.1.0

- Replaced 'Allow Rotation' setting with additional control on the Tile HUD
  - The button on the Tile HUD can now be Right-clicked to grant permission for the players to rotate the tile

# 1.0.0

- Initial release
