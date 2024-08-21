import {TerrainHUD} from "./classes/terrainhud.js";
import {Terrain} from "./classes/terrain.js";
import {TerrainDocument} from "./classes/terraindocument.js";
import {TerrainShape} from "./classes/terrainshape.js";
import {registerSettings} from "./js/settings.js";
import {initApi, registerModule} from "./js/api.js";
import {RuleProvider} from "./classes/ruleprovider.js";

let debugEnabled = 2;
export let debug = (...args) => {
  if (debugEnabled > 1) console.log("DEBUG: Simple Terrain | ", ...args);
};
export let log = (...args) => console.log("Simple Terrain | ", ...args);
export let error = (...args) => console.error("Simple Terrain | ", ...args);

export let i18n = (key) => {
  return game.i18n.localize(key);
};

export let setting = (key) => {
  if (canvas.terrain._setting[key] !== undefined) return canvas.terrain._setting[key];
  else return game.settings.get("simple-terrain", key);
};

export let getflag = (obj, key) => {
  return getProperty(obj, `flags.simple-terrain.${key}`);
};

function registerKeybindings() {
  game.keybindings.register("simple-terrain", "toggle-view", {
    name: "SimpleTerrain.ToggleView",
    restricted: true,
    editable: [{key: "KeyT", modifiers: [KeyboardManager.MODIFIER_KEYS?.ALT]}],
    onDown: () => {
      if (game.user.isGM) {
        canvas.terrain.toggle(null, true);
      }
    }
  });
}

export function makeid() {
  let result = "";
  let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let charactersLength = characters.length;
  for (let i = 0; i < 16; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

async function addControlsv9(app, dest, {full = false, insert = false} = {}) {
  //add the environment
  let obs = {};
  let env = canvas.terrain.getEnvironments().reduce(function (map, obj) {
    (obj.obstacle === true ? obs : map)[obj.id] = i18n(obj.text);
    return map;
  }, {});

  let template = "modules/simple-terrain/templates/terrain-form.html";
  let flags = duplicate(app.object.flags["simple-terrain"] || {});
  let defaults = {};
  if (full) {
    defaults = {
      opacity: setting("opacity") ?? 1,
      multiple: canvas.terrain.defaultmultiple,
      elevation: 0,
      depth: 0,
      drawcolor:
        setting("environment-color")[flags?.environment] || setting("environment-color")["_default"] || "#FFFFFF"
    };
  }

  let data = {
    data: flags,
    defaults: defaults,
    rangeOpacity: flags.opacity === "" ? defaults.opacity : (flags.opacity ?? defaults.opacity),
    environments: env,
    obstacles: obs,
    full: full
  };
  data.data.multiple =
    data.data.multiple === "" || data.data.multiple === undefined
      ? ""
      : Math.clamped(parseInt(data.data.multiple), setting("minimum-cost"), setting("maximum-cost"));

  let html = await renderTemplate(template, data);
  if (insert) dest.after(html);
  else dest.append(html);
  $('input[name="flags.simple-terrain.opacity"] + .range-value', dest).on("change", () => {
    let newval = $('[name="flags.simple-terrain.opacity"] + .range-value', dest).val();
    if (newval === "") newval = -1;
    $('[name="flags.simple-terrain.opacity"]', dest).val(newval);
  });
  $('input[name="flags.simple-terrain.drawcolor"]', dest).attr("placeholder", defaults.drawcolor);
}

async function setupScene(scene) {
  scene.terrain = new foundry.abstract.EmbeddedCollection(scene, [], Terrain);
  let etl = scene.flags["simple-terrain"];
  if (etl) {
    for (let [k, v] of Object.entries(etl)) {
      if (k.startsWith("terrain")) {
        if (
          k !== "terrainundefined" &&
          v !== undefined &&
          v.x !== undefined &&
          v.y !== undefined &&
          v._id !== undefined
        ) {
          //lets correct any changes
          let change = false;
          if (v.environment === "" && v.obstacle !== "") {
            v.environment = v.obstacle;
            v.obstacle = "";
            change = true;
          }
          if (v.elevation === undefined || v.depth === undefined) {
            if (v.terrainheight !== undefined && typeof v.terrainheight === "string")
              v.terrainheight = JSON.parse(v.terrainheight);
            v.elevation =
              v.min || (v.terrainheight !== undefined ? v.terrainheight.min : v.terraintype === "air" ? 5 : 0) || 0;
            let max =
              v.max ||
              (v.terrainheight !== undefined
                ? v.terrainheight.max
                : v.terraintype === "air" || v.terraintype === "both"
                  ? 100
                  : 0) ||
              0;
            v.depth = max - v.elevation;
            change = true;
          }

          change = !!TerrainDocument.migrateData(v);

          if (change) {
            if (game.user.isGM) await scene.setFlag("simple-terrain", k, v);
            setProperty(scene, `flags.simple-terrain.${k}`, v);
          }

          // Add this the the terrain collection
          try {
            let document = new TerrainDocument(v, {parent: scene});
            scene.terrain.set(v._id, document);
          } catch (err) {
            error(err);
          }
        } else {
          if (game.user.isGM) await scene.unsetFlag("simple-terrain", k);
          delete scene.flags["simple-terrain"][k];
        }
      }
    }
  }
}

Hooks.on("canvasInit", () => {
  canvas.hud.terrain = new TerrainHUD();
});

Hooks.on("init", async () => {
  game.socket.on("module.simple-terrain", async (data) => {
    canvas.terrain[data.action].apply(canvas.terrain, data.arguments);
  });

  PrimaryCanvasGroup.prototype.addTerrain = function (terrain) {
    let shape = this.terrain.get(terrain.objectId);
    if (!shape) shape = this.addChild(new TerrainShape(terrain));
    else shape.object = terrain;
    shape.texture = terrain.texture ?? null;
    this.terrain.set(terrain.objectId, shape);
    return shape;
  };

  PrimaryCanvasGroup.prototype.removeTerrain = function (terrain) {
    const shape = this.terrain.get(terrain.objectId);
    if (shape) {
      this.removeChild(shape);
      this.terrain.delete(terrain.objectId);
    }
  };

  let oldTearDown = PrimaryCanvasGroup.prototype.tearDown;
  PrimaryCanvasGroup.prototype.tearDown = async function () {
    oldTearDown.call(this);
    this.terrain.clear();
  };

  let oldDraw = PrimaryCanvasGroup.prototype.draw;
  PrimaryCanvasGroup.prototype.draw = async function () {
    if (!this.terrain) this.terrain = new foundry.utils.Collection();
    oldDraw.call(this);
  };

  registerSettings();
  registerKeybindings();

  let initializeDocuments = async function (wrapped, ...args) {
    wrapped(...args);
    for (let scene of game.scenes) {
      setupScene(scene);
    }
  };

  if (game.modules.get("lib-wrapper")?.active) {
    libWrapper.register("simple-terrain", "Game.prototype.initializeDocuments", initializeDocuments, "WRAPPER");
  } else {
    const oldInitializeDocuments = Game.prototype.initializeDocuments;
    Game.prototype.initializeDocuments = function (event) {
      return initializeDocuments.call(this, oldInitializeDocuments.bind(this), ...arguments);
    };
  }

  //remove old layer's controls
  let getControlButtons = function (wrapped, ...args) {
    let controls = wrapped.call(this, ...args);
    controls.findSplice((c) => c.name === "terrain" && c.flags === undefined);
    return controls;
  };

  if (game.modules.get("lib-wrapper")?.active) {
    libWrapper.register("simple-terrain", "SceneControls.prototype._getControlButtons", getControlButtons, "WRAPPER");
  } else {
    const oldGetControlButtons = SceneControls.prototype._getControlButtons;
    SceneControls.prototype._getControlButtons = function (event) {
      return getControlButtons.call(this, oldGetControlButtons.bind(this), ...arguments);
    };
  }

  let onDragLeftStart = async function (wrapped, ...args) {
    wrapped(...args);
    if (canvas !== null) {
      canvas.terrain._tokenDrag = true;
      log("drag start", canvas.terrain._tokenDrag);
      canvas.terrain.refreshVisibility();

      const isVisible =
        canvas.terrain.showterrain || ui.controls.activeControl === "terrain" || canvas.terrain.showOnDrag;
      canvas.terrain.visible = canvas.terrain.objects.visible = isVisible;
    }
  };

  if (game.modules.get("lib-wrapper")?.active) {
    libWrapper.register("simple-terrain", "Token.prototype._onDragLeftStart", onDragLeftStart, "WRAPPER");
  } else {
    const oldOnDragLeftStart = Token.prototype._onDragLeftStart;
    Token.prototype._onDragLeftStart = function (event) {
      return onDragLeftStart.call(this, oldOnDragLeftStart.bind(this), ...arguments);
    };
  }

  let onDragLeftDrop = async function (wrapped, ...args) {
    wrapped(...args);
    if (canvas !== null) {
      canvas.terrain._tokenDrag = false;
      log("left drop", canvas.terrain._tokenDrag);
      canvas.terrain.refreshVisibility();

      const isVisible =
        canvas.terrain.showterrain || ui.controls.activeControl === "terrain" || canvas.terrain.showOnDrag;
      canvas.terrain.visible = canvas.terrain.objects.visible = isVisible;
    }
  };

  if (game.modules.get("lib-wrapper")?.active) {
    libWrapper.register("simple-terrain", "Token.prototype._onDragLeftDrop", onDragLeftDrop, "WRAPPER");
  } else {
    const oldOnDragLeftDrop = Token.prototype._onDragLeftDrop;
    Token.prototype._onDragLeftDrop = function (event) {
      return onDragLeftDrop.call(this, oldOnDragLeftDrop.bind(this), ...arguments);
    };
  }

  let onDragLeftCancel = async function (wrapped, ...args) {
    const ruler = canvas.controls.ruler;

    if (ruler._state !== Ruler.STATES.MEASURING) {
      canvas.terrain._tokenDrag = false;
      log("left cancel", canvas.terrain._tokenDrag);
      canvas.terrain.refreshVisibility();

      let isVisible = canvas.terrain.showterrain || ui.controls.activeControl === "terrain";
      canvas.terrain.visible = canvas.terrain.objects.visible = isVisible;
    }

    wrapped(...args);
  };

  if (game.modules.get("lib-wrapper")?.active) {
    libWrapper.register("simple-terrain", "Token.prototype._onDragLeftCancel", onDragLeftCancel, "WRAPPER");
  } else {
    const oldOnDragLeftCancel = Token.prototype._onDragLeftCancel;
    Token.prototype._onDragLeftCancel = function (event) {
      return onDragLeftCancel.call(this, oldOnDragLeftCancel.bind(this), ...arguments);
    };
  }

  initApi();

  window.SimpleTerrain = {registerModule};
});

Hooks.on("ready", () => {
  if (canvas.terrain) {
    canvas.terrain._setting["opacity"] = setting("opacity");
    canvas.terrain._setting["draw-border"] = setting("draw-border");
    canvas.terrain._setting["terrain-image"] = setting("terrain-image");
    canvas.terrain._setting["show-text"] = setting("show-text");
    canvas.terrain._setting["show-icon"] = setting("show-icon");
    canvas.terrain._setting["show-on-drag"] = setting("show-on-drag");
    canvas.terrain._setting["only-show-active"] = setting("only-show-active");
    canvas.terrain._setting["tokens-cause-difficult"] = setting("tokens-cause-difficult");
    canvas.terrain._setting["dead-cause-difficult"] = setting("dead-cause-difficult");
    canvas.terrain._setting["use-obstacles"] = setting("use-obstacles");
    canvas.terrain._setting["minimum-cost"] = setting("minimum-cost");
    canvas.terrain._setting["maximum-cost"] = setting("maximum-cost");
  }

  Hooks.callAll("SimpleTerrain.ready", RuleProvider);
});

Hooks.on("renderMeasuredTemplateConfig", (app, html) => {
  let tab;
  if ($(".sheet-tabs", html).length) {
    $(".sheet-tabs", html).append(
      $("<a>").addClass("item").attr("data-tab", "terrain").html('<i class="fas fa-mountiain"></i> Terrain')
    );
    tab = $("<div>").addClass("tab action-sheet").attr("data-tab", "terrain").insertAfter($(".tab:last", html));
  } else {
    let root = $("form", html);
    if (root.length === 0) root = html;
    let basictab = $("<div>").addClass("tab").attr("data-tab", "basic");
    $("> *:not(button)", root).each(function () {
      basictab.append(this);
    });

    tab = $("<div>").addClass("tab action-sheet").attr("data-tab", "terrain");
    $(root)
      .prepend(tab)
      .prepend(basictab)
      .prepend(
        $("<nav>")
          .addClass("sheet-tabs tabs")
          .append(
            $("<a>").addClass("item active").attr("data-tab", "basic").html('<i class="fas fa-university"></i> Basic')
          )
          .append($("<a>").addClass("item").attr("data-tab", "terrain").html('<i class="fas fa-mountain"></i> Terrain'))
      );
  }
  addControlsv9(app, tab);
  app.options.tabs = [
    {
      navSelector: ".tabs",
      contentSelector: "form",
      initial: "basic"
    }
  ];
  app.options.height = "auto";
  app._tabs = app._createTabHandlers();
  const el = html[0];
  app._tabs.forEach((t) => t.bind(el));
  window.setTimeout(() => {
    $(app.element).css({"min-height": ""});
  }, 500);
  app.setPosition();
});

Hooks.on("renderSceneConfig", async (app, html) => {
  $(".sheet-tabs", html).append(
    $("<a>").addClass("item").attr("data-tab", "terrain").html('<i class="fas fa-mountain"></i> Terrain')
  );
  let tab = $("<div>").addClass("tab").attr("data-tab", "terrain").insertAfter($('div[data-tab="ambience"]', html));
  await addControlsv9(app, tab, {full: true});
});

Hooks.on("updateScene", (scene, data) => {
  if (getProperty(data, "flags.simple-terrain.opacity") || getProperty(data, "flags.simple-terrain.drawcolor")) {
    canvas.terrain.refresh(true); //refresh the terrain to respond to default terrain color
  }
  if (canvas.terrain?.toolbar) canvas.terrain.toolbar.render(true);
});

Hooks.on("renderItemSheet", (app, html) => {
  if (app.object.hasAreaTarget) {
    let details = $('.tab[data-tab="details"]', html);
    let title = $("<h3>").addClass("form-header").html("Terrain Effects").appendTo(details);
    addControlsv9(app, title, {insert: true}).then(() => {
      const selectors = app.options.scrollY || [];
      const positions = app._scrollPositions || {};
      app.setPosition({height: "auto"});
      for (let sel of selectors) {
        const el = html.find(sel);
        el.each((i, el) => (el.scrollTop = positions[sel]?.[i] || 0));
      }
    });
  }
});

Hooks.on("controlToken", () => canvas.terrain.refresh());

Hooks.on("updateSetting", (setting, data) => {
  if (setting.key.startsWith("simple-terrain")) {
    const key = setting.key.replace("simple-terrain.", "");
    canvas.terrain._setting[key] = key === "terrain-image" ? data.value : JSON.parse(data.value);
  }
});

Hooks.on("sightRefresh", () => {
  for (let t of canvas.terrain.placeables) {
    t.visible = t.isVisible;
  }
});
