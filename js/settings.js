import {TerrainColor} from "../classes/terraincolor.js";
import {updateRuleProviderVariable} from "./api.js";

export const registerSettings = function () {
  let modulename = "simple-terrain";

  const debouncedRefresh = foundry.utils.debounce(function () {
    canvas.terrain.refresh();
  }, 100);

  let imageoptions = {
    solid: "Solid",
    diagonal: "Diagonal",
    oldschool: "Old School",
    triangle: "Triangle",
    horizontal: "Horizontal",
    vertical: "Vertical",
    clear: "Clear"
  };

  let tokenoptions = {
    false: "None",
    friendly: "Friendly",
    hostile: "Hostile",
    true: "Any"
  };

  game.settings.registerMenu(modulename, "edit-colors", {
    name: "Edit Colors",
    label: "Edit Colors",
    hint: "Edit default color, environment colrs, and obstacle colors",
    icon: "fas fa-palette",
    restricted: true,
    type: TerrainColor,
    onClick: () => {}
  });

  game.settings.register(modulename, "opacity", {
    name: "SimpleTerrain.opacity.name",
    hint: "SimpleTerrain.opacity.hint",
    scope: "world",
    config: true,
    default: 1,
    type: Number,
    range: {
      min: 0,
      max: 1,
      step: 0.1
    },
    onChange: debouncedRefresh
  });
  game.settings.register(modulename, "draw-border", {
    name: "SimpleTerrain.draw-border.name",
    hint: "SimpleTerrain.draw-border.hint",
    scope: "world",
    config: true,
    default: true,
    type: Boolean,
    onChange: debouncedRefresh
  });
  game.settings.register(modulename, "terrain-image", {
    name: "SimpleTerrain.terrain-image.name",
    hint: "SimpleTerrain.terrain-image.hint",
    scope: "world",
    config: true,
    default: "diagonal",
    type: String,
    choices: imageoptions,
    requiresReload: true
  });
  game.settings.register(modulename, "show-text", {
    name: "SimpleTerrain.show-text.name",
    hint: "SimpleTerrain.show-text.hint",
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
    onChange: debouncedRefresh
  });
  game.settings.register(modulename, "show-icon", {
    name: "SimpleTerrain.show-icon.name",
    hint: "SimpleTerrain.show-icon.hint",
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
    onChange: debouncedRefresh
  });
  game.settings.register(modulename, "show-on-drag", {
    name: "SimpleTerrain.show-on-drag.name",
    hint: "SimpleTerrain.show-on-drag.hint",
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  });
  game.settings.register(modulename, "only-show-active", {
    name: "SimpleTerrain.only-show-active.name",
    hint: "SimpleTerrain.only-show-active.hint",
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
    onChange: debouncedRefresh
  });
  game.settings.register(modulename, "tokens-cause-difficult", {
    name: "SimpleTerrain.tokens-cause-difficult.name",
    hint: "SimpleTerrain.tokens-cause-difficult.hint",
    scope: "world",
    config: true,
    choices: tokenoptions,
    default: "false",
    type: String
  });
  game.settings.register(modulename, "dead-cause-difficult", {
    name: "SimpleTerrain.dead-cause-difficult.name",
    hint: "SimpleTerrain.dead-cause-difficult.hint",
    scope: "world",
    config: true,
    choices: tokenoptions,
    default: "false",
    type: String
  });
  game.settings.register(modulename, "use-obstacles", {
    name: "SimpleTerrain.use-obstacles.name",
    hint: "SimpleTerrain.use-obstacles.hint",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });
  game.settings.register(modulename, "transfer-color", {
    name: "SimpleTerrain.transfer-color.name",
    hint: "SimpleTerrain.transfer-color.hint",
    scope: "world",
    config: game.system.id === "dnd5e",
    default: false,
    type: Boolean
  });
  game.settings.register(modulename, "minimum-cost", {
    name: "SimpleTerrain.minimum-cost.name",
    hint: "SimpleTerrain.minimum-cost.hint",
    scope: "world",
    config: true,
    default: 0.5,
    type: Number
  });
  game.settings.register(modulename, "maximum-cost", {
    name: "SimpleTerrain.maximum-cost.name",
    hint: "SimpleTerrain.maximum-cost.hint",
    scope: "world",
    config: true,
    default: 4,
    type: Number
  });

  game.settings.register(modulename, "rule-provider", {
    name: "SimpleTerrain.rule-provider.name",
    hint: "SimpleTerrain.rule-provider.hint",
    scope: "world",
    config: false,
    default: "bulitin",
    type: String,
    choices: {},
    onChange: updateRuleProviderVariable
  });

  game.settings.register(modulename, "showterrain", {
    scope: "world",
    config: false,
    default: false,
    type: Boolean
  });

  game.settings.register(modulename, "conversion", {
    scope: "world",
    config: false,
    default: false,
    type: Boolean
  });

  game.settings.register(modulename, "environment-color", {
    scope: "world",
    config: false,
    default: {},
    type: Object
  });
};
