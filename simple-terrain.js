import {registerSettings} from "./src/settings.js";
import {initApi, registerModule, registerSystem} from "./src/api.js";
import {RuleProvider} from "./src/ruleprovider.js";
import {TerrainLayer} from "./src/terrainlayer.js";

export let i18n = (key) => {
  return game.i18n.localize(key);
};

/**
 * @param {string} key
 * @return {any} value
 */
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
    data: Object.assign(flags, {
      multiple: flags?.multiple ?? 1,
      elevation: flags?.elevation ?? 0,
      depth: flags?.depth ?? 0,
      drawColor:
        flags?.drawColor ??
        setting("environment-color")[flags?.environment] ??
        setting("environment-color")["_default"] ??
        "#FFFFFF"
    }),
    environments: env,
    obstacles: obs,
    useObstacles: setting("use-obstacles")
  };

  if (data.data.multiple !== "" && data.data.multiple != null) {
    data.data.multiple = Math.clamped(parseInt(data.data.multiple), setting("minimum-cost"), setting("maximum-cost"));
  }
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
  app._tabs.forEach((t) => t.bind(html[0]));

  window.setTimeout(() => {
    $(app.element).css({"min-height": ""});
  }, 500);

  app.setPosition();
});

Hooks.on("renderDrawingConfig", async (app, html) => {
  if (!app.object || !app.object.id) return;
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

Hooks.on("refreshDrawing", (drawing) => {
  let flags = drawing?.document?.flags["simple-terrain"];
  if (flags) {
    drawing.children.filter((c) => c.name && c.name.startsWith("simple-terrain")).forEach((c) => c.destroy());
    if (drawing?.document?.text) return;
    let environmentObject = canvas.terrain.getEnvironments().find((e) => e.id === flags.environment);

    let icon = createIcon(drawing, environmentObject, "#FFFFFF");
    let text = createText(drawing, environmentObject, flags?.multiple);
    drawing.addChild(text, icon);
  }
});

Hooks.on("refreshMeasuredTemplate", (drawing) => {
  let flags = drawing?.document?.flags["simple-terrain"];
  if (flags) {
    drawing.children.filter((c) => c.name && c.name.startsWith("simple-terrain")).forEach((c) => c.destroy());
    if (drawing?.document?.text) return;
    let environmentObject = canvas.terrain.getEnvironments().find((e) => e.id === flags.environment);

    let icon = createIcon(drawing, environmentObject, "#FFFFFF");
    let text = createText(drawing, environmentObject, flags?.multiple);
    drawing.addChild(text, icon);
  }
});

function centerDrawing(drawing) {
  const {x, y, shape} = drawing.document;
  if (drawing instanceof MeasuredTemplate) return centerMeasuredTemplate(drawing);
  if (drawing?.type === Drawing.SHAPE_TYPES.POLYGON) return centerPolygon(x, y, shape);
  return new PIXI.Point(x + shape.width / 2, y + shape.height / 2);
}

function centerMeasuredTemplate(drawing) {
  const {x, y} = drawing.document;
  const shape = drawing.shape;
  switch (shape.type) {
    case 0:
      return centerPolygon(x, y, shape);
    case 1:
      return new PIXI.Point(x + shape.width / 2, y + shape.height / 2);
    case 2:
      return new PIXI.Point(x, y);
  }
}

function centerPolygon(x, y, shape) {
  let points = shape.points;
  let tx = 0,
    ty = 0,
    i,
    j,
    f;

  let area = function (points) {
    let area = 0,
      i,
      j;

    for (i = 0, j = points.length - 2; i < points.length - 1; j = i, i += 2) {
      let point1 = {x: points[i], y: points[i + 1]};
      let point2 = {x: points[j], y: points[j + 1]};
      area += point1.x * point2.y;
      area -= point1.y * point2.x;
    }
    area /= 2;

    return area;
  };

  for (i = 0, j = points.length - 2; i < points.length - 1; j = i, i += 2) {
    let point1 = {x: points[i], y: points[i + 1]};
    let point2 = {x: points[j], y: points[j + 1]};
    f = point1.x * point2.y - point2.x * point1.y;
    tx += (point1.x + point2.x) * f;
    ty += (point1.y + point2.y) * f;
  }

  f = area(points) * 6;

  return new PIXI.Point(x + parseInt(tx / f), y + parseInt(ty / f));
}

function getText(multiple) {
  multiple = Math.clamped(multiple, setting("minimum-cost"), setting("maximum-cost"));
  return String.fromCharCode(215) + (multiple === 0.5 ? String.fromCharCode(189) : multiple);
}

function createIcon(drawing, environmentObject, color) {
  let icon = new PIXI.Container();

  if (environmentObject?.icon === undefined) return icon;

  const size = Math.max(Math.round(canvas.dimensions.size / 2.5), 5);
  let sc = Color.from(color);
  const showText = setting("show-text");

  const {x, y} = drawing.document;

  icon.border = icon.addChild(new PIXI.Graphics());
  icon.border
    .clear()
    .lineStyle(3, 0x000000)
    .drawRoundedRect(0, 0, size, size, 4)
    .beginFill(0x000000, 0.5)
    .lineStyle(2, sc)
    .drawRoundedRect(0, 0, size, size, 4)
    .endFill();
  icon.background = icon.addChild(PIXI.Sprite.from(environmentObject?.icon));
  icon.background.x = icon.background.y = 1;
  icon.background.width = icon.background.height = size - 2;
  icon.name = "simple-terrain-icon";
  icon.visible = setting("show-icon");

  const padding = showText ? icon.width : icon.width / 2;
  const center = centerDrawing(drawing);
  icon.position.set(center.x - x - padding, center.y - y - icon.height / 2);
  return icon;
}

function createText(drawing, environmentObject, multiple) {
  const {x, y} = drawing.document;
  let shape = drawing instanceof MeasuredTemplate ? drawing.shape : drawing.document.shape;

  let s = canvas.dimensions.size;
  let fontSize = s / 3;
  const stroke = Math.max(Math.round(fontSize / 32), 2);

  // Define the text style
  const textStyle = PreciseText.getTextStyle({
    fontFamily: "Arial",
    fontSize: fontSize,
    fill: "#FFFFFF",
    stroke: "#111111",
    strokeThickness: stroke,
    dropShadow: true,
    dropShadowColor: "#000000",
    dropShadowBlur: Math.max(Math.round(fontSize / 16), 2),
    dropShadowAngle: 0,
    dropShadowDistance: 0,
    align: "center",
    wordWrap: false,
    wordWrapWidth: shape.width,
    padding: stroke
  });
  let preciseText = new PreciseText(getText(multiple), textStyle);
  preciseText.name = "simple-terrain-text";

  const padding = environmentObject?.icon ? 0 : preciseText.width / 2;
  const center = centerDrawing(drawing);
  preciseText.position.set(center.x - x - padding, center.y - y - preciseText.height / 2);
  return preciseText;
}
