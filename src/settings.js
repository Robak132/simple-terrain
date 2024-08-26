import {TerrainColor} from "./terraincolor.js";
import {updateRuleProviderVariable} from "./api.js";

export const registerSettings = function () {
  let moduleName = "simple-terrain";

  const debouncedRefresh = foundry.utils.debounce(function () {}, 100);

  let imageOptions = {
    solid: "Solid",
    diagonal: "Diagonal",
    oldschool: "Old School",
    triangle: "Triangle",
    horizontal: "Horizontal",
    vertical: "Vertical",
    clear: "Clear"
  };

  let tokenOptions = {
    false: "None",
    friendly: "Friendly",
    hostile: "Hostile",
    true: "Any"
  };

  game.settings.registerMenu(moduleName, "edit-colors", {
    name: "Edit Colors",
    label: "Edit Colors",
    hint: "Edit default color, environment colors, and obstacle colors",
    icon: "fas fa-palette",
    restricted: true,
    type: TerrainColor,
    onClick: () => {}
  });
  game.settings.register(moduleName, "draw-border", {
    name: "SimpleTerrain.draw-border.name",
    hint: "SimpleTerrain.draw-border.hint",
    scope: "world",
    config: true,
    default: true,
    type: Boolean,
    onChange: debouncedRefresh
  });
  game.settings.register(moduleName, "terrain-image", {
    name: "SimpleTerrain.terrain-image.name",
    hint: "SimpleTerrain.terrain-image.hint",
    scope: "world",
    config: true,
    default: "diagonal",
    type: String,
    choices: imageOptions,
    requiresReload: true
  });
  game.settings.register(moduleName, "show-text", {
    name: "SimpleTerrain.show-text.name",
    hint: "SimpleTerrain.show-text.hint",
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
    onChange: debouncedRefresh
  });
  game.settings.register(moduleName, "show-icon", {
    name: "SimpleTerrain.show-icon.name",
    hint: "SimpleTerrain.show-icon.hint",
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
    onChange: debouncedRefresh
  });
  game.settings.register(moduleName, "tokens-cause-difficult", {
    name: "SimpleTerrain.tokens-cause-difficult.name",
    hint: "SimpleTerrain.tokens-cause-difficult.hint",
    scope: "world",
    config: true,
    choices: tokenOptions,
    default: "false",
    type: String
  });
  game.settings.register(moduleName, "dead-cause-difficult", {
    name: "SimpleTerrain.dead-cause-difficult.name",
    hint: "SimpleTerrain.dead-cause-difficult.hint",
    scope: "world",
    config: true,
    choices: tokenOptions,
    default: "false",
    type: String
  });
  game.settings.register(moduleName, "use-obstacles", {
    name: "SimpleTerrain.use-obstacles.name",
    hint: "SimpleTerrain.use-obstacles.hint",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });
  game.settings.register(moduleName, "minimum-cost", {
    name: "SimpleTerrain.minimum-cost.name",
    hint: "SimpleTerrain.minimum-cost.hint",
    scope: "world",
    config: true,
    default: 0.5,
    type: Number
  });
  game.settings.register(moduleName, "maximum-cost", {
    name: "SimpleTerrain.maximum-cost.name",
    hint: "SimpleTerrain.maximum-cost.hint",
    scope: "world",
    config: true,
    default: 4,
    type: Number
  });
  game.settings.register(moduleName, "rule-provider", {
    name: "SimpleTerrain.rule-provider.name",
    hint: "SimpleTerrain.rule-provider.hint",
    scope: "world",
    config: false,
    default: "bulitin",
    type: String,
    choices: {},
    onChange: updateRuleProviderVariable
  });
  game.settings.register(moduleName, "environment-color", {
    scope: "world",
    config: false,
    default: {},
    type: Object
  });
};
