import {registerSettings} from "./src/settings.js";
import {initApi, registerModule, registerSystem} from "./src/api.js";
import {RuleProvider} from "./src/ruleprovider.js";
import {TerrainLayer} from "./src/terrainlayer.js";

export let i18n = (key) => {
  return game.i18n.localize(key);
};

export let setting = (key) => {
  if (canvas.terrain._setting[key] !== undefined) return canvas.terrain._setting[key];
  else return game.settings.get("simple-terrain", key);
};

async function addControls(app, dest) {
  let obs = {};
  let env = canvas.terrain.getEnvironments().reduce(function (map, obj) {
    (obj.obstacle === true ? obs : map)[obj.id] = i18n(obj.text);
    return map;
  }, {});

  let flags = duplicate(app.object.flags["simple-terrain"] || {});
  let data = {
    data: flags,
    defaults: {
      multiple: 1,
      elevation: 0,
      depth: 0,
      drawColor:
        setting("environment-color")[flags?.environment] || setting("environment-color")["_default"] || "#FFFFFF"
    },
    environments: env,
    obstacles: obs,
    full: full,
    useObstacles: setting("use-obstacles")
  };
  if (data.data.multiple !== "" && data.data.multiple != null) {
    data.data.multiple = Math.clamped(parseInt(data.data.multiple), setting("minimum-cost"), setting("maximum-cost"));
  }
  console.log(data);
  dest.append(await renderTemplate("modules/simple-terrain/templates/terrain-config.hbs", data));
  $('select[name="flags.simple-terrain.environment"], select[name="flags.simple-terrain.obstacle"]', dest).on(
    "change",
    () => {
      let env = $("select[name='flags.simple-terrain.environment']");
      let envSel = $("select[name='flags.simple-terrain.environment'] option:selected");
      let obs = $("select[name='flags.simple-terrain.obstacle']");

      if (env.val() === "" && obs.val() !== "") {
        env.val(obs.val());
        obs.val("");
      }
      if (envSel.parent().attr("data-type") === "obstacle" && obs.val() !== "") {
        if ($(this).attr("name") === "obstacle") env.val(obs.val());
        obs.val("");
      }
    }
  );
}

Hooks.on("init", async () => {
  game.socket.on("module.simple-terrain", async (data) => {
    canvas.terrain[data.action].apply(canvas.terrain, data.arguments);
  });

  registerSettings();

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

  libWrapper.register(
    "simple-terrain",
    "SceneControls.prototype._getControlButtons",
    (wrapped, ...args) => {
      let controls = wrapped.call(this, ...args);
      controls.findSplice((c) => c.name === "terrain" && c.flags == null);
      return controls;
    },
    "WRAPPER"
  );

  initApi();

  window.SimpleTerrain = {registerModule, registerSystem};
});

Hooks.on("ready", () => {
  if (canvas.terrain) {
    canvas.terrain._setting["draw-border"] = setting("draw-border");
    canvas.terrain._setting["terrain-image"] = setting("terrain-image");
    canvas.terrain._setting["show-text"] = setting("show-text");
    canvas.terrain._setting["show-icon"] = setting("show-icon");
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

  await addControls(app, tab);

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

  await addControls(app, tab);
});

Hooks.on("renderSceneConfig", async (app, html) => {
  $(".sheet-tabs", html).append(
    $("<a>").addClass("item").attr("data-tab", "terrain").html('<i class="fas fa-mountain"></i> Terrain')
  );
  let tab = $("<div>").addClass("tab").attr("data-tab", "terrain").insertAfter($('div[data-tab="ambience"]', html));
  await addControls(app, tab);
});

Hooks.on("canvasInit", () => {
  canvas.terrain = new TerrainLayer();
});
