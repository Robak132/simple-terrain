export let i18n = (key) => {
  return game.i18n.localize(key);
};

/**
 * @param {string|number} key
 * @returns {any}
 */
export let setting = (key) => {
  if (canvas.terrain._setting[key] !== undefined) return canvas.terrain._setting[key];
  else return game.settings.get("simple-terrain", key);
};

export let getFlag = (obj, key) => {
  return getProperty(obj, `flags.simple-terrain.${key}`);
};

export let environments = () => canvas.terrain.getEnvironments();

export function makeID() {
  let result = "";
  let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let charactersLength = characters.length;
  for (let i = 0; i < 16; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

export async function addTerrainConfig(app, html, tab) {
  //add the environment
  let env = canvas.terrain.getEnvironments().reduce(function (map, obj) {
    map[obj.id] = i18n(obj.text);
    return map;
  }, {});

  let flags = duplicate(app.object.flags["simple-terrain"] || {});
  let defaults = {};

  let data = {
    data: flags,
    defaults: defaults,
    environments: env
  };
  data.data.cost = data.data.cost === "" || data.data.cost === undefined ? 1 : parseInt(data.data.cost);

  let temp = await renderTemplate("modules/simple-terrain/templates/terrain-config.html", data);

  tab.append(temp);

  html.find('button[type="submit"]').click(async () => {
    if (!app.object) {
      return;
    }
    let active = html.find("form.enhanced-terrain-config").find('[name="active"]').is(":checked");
    let magical = html.find("form.enhanced-terrain-config").find('[name="magical"]').is(":checked");
    let cost = Number(html.find("form.enhanced-terrain-config").find('[name="cost"]').val()) || 1;
    let elevation = Number(html.find("form.enhanced-terrain-config").find('[name="elevation"]').val()) || 1;
    let depth = Number(html.find("form.enhanced-terrain-config").find('[name="depth"]').val()) || 1;
    let environment = html.find("form.enhanced-terrain-config").find('[name="environment"]').val() || undefined;

    let newFlags = {active, cost, environment, elevation, depth, magical};
    if (deepEqual(newFlags, app.object.flags["simple-terrain"])) {
      return;
    }

    let env = environments().find((a) => a.id === environment);

    let data = {
      "flags.simple-terrain": newFlags
    };
    if (active) {
      data["texture"] = env?.icon;
      data["text"] = env ? `${i18n(env.text)} (x${cost})` : `x${cost}`;
    }
    await app.object.update({"flags.-=simple-terrain": null});
    await app.object.update(data);
  });
}

export async function addControlsv9(app, dest, {full = false, insert = false} = {}) {
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

export async function setupScene(scene) {
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
          //let's correct any changes
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

          // Add this to the terrain collection
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
