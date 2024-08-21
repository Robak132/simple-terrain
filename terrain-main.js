import {registerSettings} from "./src/settings.js";
import {initApi, registerModule} from "./src/api.js";
import {RuleProvider} from "./src/ruleprovider.js";
import {addControlsv9, addTerrainConfig, log, registerKeybindings, setting, setupScene} from "./src/utility.js";

Hooks.on("canvasInit", () => {
  canvas.terrain = new TerrainLayer();
});

Hooks.on("init", async () => {
  game.socket.on("module.simple-terrain", async (data) => {
    canvas.terrain[data.action].apply(canvas.terrain, data.arguments);
  });

  registerSettings();
  registerKeybindings();

  window.enhancedTerrainLayer = {registerModule, registerSystem};

  let cp = CONFIG.MeasuredTemplate.objectClass.prototype._computeShape;
  CONFIG.MeasuredTemplate.objectClass.prototype._computeShape = function () {
    let res = cp.call(this);
    if (res?.points && Array.isArray(res.points)) {
      res.points = res.points.map((a) => {
        return a === 3.1228493378257506e-15 ? 0 : a;
      });
    }
    return res;
  };

  let initializeDocuments = async function (wrapped, ...args) {
    wrapped(...args);
    for (let scene of game.scenes) {
      await setupScene(scene);
    }
  };

  libWrapper.register("simple-terrain", "Game.prototype.initializeDocuments", initializeDocuments, "WRAPPER");

  let getControlButtons = function (wrapped, ...args) {
    let controls = wrapped.call(this, ...args);
    controls.findSplice((c) => c.name === "terrain" && c.flags === undefined);
    return controls;
  };

  libWrapper.register("simple-terrain", "SceneControls.prototype._getControlButtons", getControlButtons, "WRAPPER");

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

  libWrapper.register("simple-terrain", "Token.prototype._onDragLeftStart", onDragLeftStart, "WRAPPER");

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

  libWrapper.register("simple-terrain", "Token.prototype._onDragLeftDrop", onDragLeftDrop, "WRAPPER");

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

  libWrapper.register("simple-terrain", "Token.prototype._onDragLeftCancel", onDragLeftCancel, "WRAPPER");

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

Hooks.on("renderMeasuredTemplateConfig", async (app, html) => {
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
  await addControlsv9(app, tab);
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

Hooks.on("renderDrawingConfig", async (app, html) => {
  if (!app.object || !app.object.id) {
    return;
  }
  html
    .find(".sheet-tabs")
    .append($("<a>").addClass("item").attr("data-tab", "terrain").html('<i class="fas fa-mountain"></i> Terrain'));
  let tab = $("<div>").addClass("tab").attr("data-tab", "terrain").insertAfter($('div[data-tab="text"]', html));

  await addTerrainConfig(app, html, tab);
});

Hooks.on("renderSceneConfig", async (app, html) => {
  $(".sheet-tabs", html).append(
    $("<a>").addClass("item").attr("data-tab", "terrain").html('<i class="fas fa-mountain"></i> Terrain')
  );
  let tab = $("<div>").addClass("tab").attr("data-tab", "terrain").insertAfter($('div[data-tab="ambience"]', html));
  await addTerrainConfig(app, html, tab);
});
