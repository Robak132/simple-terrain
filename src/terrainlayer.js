import {calculateCombinedCost} from "./api.js";
import {setting} from "../simple-terrain.js";

export class TerrainLayer extends PlaceablesLayer {
  constructor() {
    super();
    this._setting = {};
  }

  //Compatibility
  refreshVisibility() {}

  static get defaults() {
    const sceneFlags = canvas.scene.flags["simple-terrain"];
    let sceneMult = sceneFlags?.multiple;
    let sceneElev = sceneFlags?.elevation;
    let sceneDepth = sceneFlags?.depth;
    let sceneEnv = sceneFlags?.environment;
    return {
      locked: false,
      hidden: false,
      multiple:
        sceneMult == null || sceneMult === ""
          ? 1
          : Math.clamped(parseInt(sceneMult), setting("minimum-cost"), setting("maximum-cost")),
      elevation: sceneElev == null || sceneElev === "" ? 0 : sceneElev,
      depth: sceneDepth == null || sceneDepth === "" ? 0 : sceneDepth,
      environment: sceneEnv || null,
      obstacle: null,
      shape: {},
      bezierFactor: 0
    };
  }

  get gridPrecision() {
    let size = canvas.dimensions.size;
    if (size >= 128) return 16;
    else if (size >= 64) return 8;
    else if (size >= 32) return 4;
    else if (size >= 16) return 2;
  }

  getEnvironments() {
    let environments = [
      {
        id: "arctic",
        text: "SimpleTerrain.environment.arctic",
        icon: "modules/simple-terrain/img/environment/arctic.png"
      },
      {
        id: "coast",
        text: "SimpleTerrain.environment.coast",
        icon: "modules/simple-terrain/img/environment/coast.png"
      },
      {
        id: "desert",
        text: "SimpleTerrain.environment.desert",
        icon: "modules/simple-terrain/img/environment/desert.png"
      },
      {
        id: "forest",
        text: "SimpleTerrain.environment.forest",
        icon: "modules/simple-terrain/img/environment/forest.png"
      },
      {
        id: "grassland",
        text: "SimpleTerrain.environment.grassland",
        icon: "modules/simple-terrain/img/environment/grassland.png"
      },
      {
        id: "jungle",
        text: "SimpleTerrain.environment.jungle",
        icon: "modules/simple-terrain/img/environment/jungle.png"
      },
      {
        id: "mountain",
        text: "SimpleTerrain.environment.mountain",
        icon: "modules/simple-terrain/img/environment/mountain.png"
      },
      {
        id: "swamp",
        text: "SimpleTerrain.environment.swamp",
        icon: "modules/simple-terrain/img/environment/swamp.png"
      },
      {
        id: "underdark",
        text: "SimpleTerrain.environment.underdark",
        icon: "modules/simple-terrain/img/environment/underdark.png"
      },
      {
        id: "urban",
        text: "SimpleTerrain.environment.urban",
        icon: "modules/simple-terrain/img/environment/urban.png"
      },
      {
        id: "water",
        text: "SimpleTerrain.environment.water",
        icon: "modules/simple-terrain/img/environment/water.png"
      },

      {
        id: "crowd",
        text: "SimpleTerrain.obstacle.crowd",
        icon: "modules/simple-terrain/img/environment/crowd.png",
        obstacle: true
      },
      {
        id: "current",
        text: "SimpleTerrain.obstacle.current",
        icon: "modules/simple-terrain/img/environment/current.png",
        obstacle: true
      },
      {
        id: "furniture",
        text: "SimpleTerrain.obstacle.furniture",
        icon: "modules/simple-terrain/img/environment/furniture.png",
        obstacle: true
      },
      {
        id: "magic",
        text: "SimpleTerrain.obstacle.magic",
        icon: "modules/simple-terrain/img/environment/magic.png",
        obstacle: true
      },
      {
        id: "plants",
        text: "SimpleTerrain.obstacle.plants",
        icon: "modules/simple-terrain/img/environment/plants.png",
        obstacle: true
      },
      {
        id: "rubble",
        text: "SimpleTerrain.obstacle.rubble",
        icon: "modules/simple-terrain/img/environment/rubble.png",
        obstacle: true
      },
      {
        id: "webbing",
        text: "SimpleTerrain.obstacle.webbing",
        icon: "modules/simple-terrain/img/environment/spiderweb.png",
        obstacle: true
      }
    ];

    Hooks.call(`getTerrainEnvironments`, this, environments);

    return environments;
  }

  elevation(pts, options = {}) {
    pts = pts instanceof Array ? pts : [pts];

    let results = [];
    const hx =
      canvas.grid.type === CONST.GRID_TYPES.GRIDLESS || options.ignoreGrid === true ? 0 : canvas.dimensions.size / 2;
    const hy =
      canvas.grid.type === CONST.GRID_TYPES.GRIDLESS || options.ignoreGrid === true ? 0 : canvas.dimensions.size / 2;

    for (let pt of pts) {
      let [gx, gy] =
        canvas.grid.type === CONST.GRID_TYPES.GRIDLESS || options.ignoreGrid === true
          ? [pt.x, pt.y]
          : canvas.grid.grid.getPixelsFromGridPosition(pt.x, pt.y);

      let tx = gx + hx;
      let ty = gy + hy;

      //get the cost for the terrain layer
      for (let terrain of this.placeables) {
        const testX = tx - terrain.document.x;
        const testY = ty - terrain.document.y;
        if (terrain?.document?.shape?.contains(testX, testY)) {
          results.push({top: terrain.document.top, bottom: terrain.document.bottom, terrain: terrain});
        }
      }
    }

    return results;
  }

  calcElevationFromOptions(options) {
    return options.elevation === false
      ? null
      : options.elevation !== undefined
        ? options.elevation
        : options?.token?.document?.elevation;
  }

  listTerrain(options = {}) {
    const useObstacles = setting("use-obstacles");
    const elevation = this.calcElevationFromOptions(options);

    const terrainInfos = options.list || [];
    for (const terrain of [...canvas.drawings.placeables, ...canvas.templates.placeables]) {
      const terrainFlag = getProperty(terrain.document, "flags.simple-terrain");
      if (!terrainFlag) continue;

      const terrainCost = terrainFlag.multiple ?? 1;
      let terrainBottom = terrainFlag.elevation ?? TerrainLayer.defaults.elevation;
      let terrainTop = terrainBottom + (terrainFlag.depth ?? TerrainLayer.defaults.depth);
      if (terrainTop < terrainBottom) [terrainBottom, terrainTop] = [terrainTop, terrainBottom];

      const environment = terrainFlag.environment || "";
      if (elevation < terrainBottom || elevation > terrainTop) continue;
      if (terrainCost === 1) continue;
      if (options.ignore?.includes(environment)) continue;
      let reducers = options.reduce?.filter(
        (e) => e.id === terrain.document.environment || (useObstacles && e.id === terrain.document.obstacle)
      );
      terrainInfos.push({object: terrain.document, reducers});
    }
    return terrainInfos;
  }

  listTokenTerrain(options = {}) {
    const terrainInfos = [];

    let isDead =
      options.isDead ||
      function (token) {
        return !!token.actor?.effects?.find((e) => {
          const core = e.flags["core"];
          return core && core["statusId"] === CONFIG.specialStatusEffects.DEFEATED;
        });
      };

    let tokenDifficult = setting("tokens-cause-difficult");
    let tokenDead = setting("dead-cause-difficult");

    if (
      (tokenDifficult !== "false" || tokenDead !== "false") &&
      canvas.grid.type !== CONST.GRID_TYPES.GRIDLESS &&
      !options.ignore?.includes("tokens")
    ) {
      const elevation = this.calcElevationFromOptions(options);
      const tokenId = options.tokenId || options?.token?.id;
      for (const token of canvas.tokens.placeables) {
        if (token.id === tokenId) continue;
        if (token.hidden) continue;
        if (elevation !== undefined && token.document.elevation !== undefined && token.document.elevation !== elevation)
          continue;
        let dead = isDead(token);
        let checkValue = dead ? tokenDead : tokenDifficult;
        if (
          checkValue === "true" ||
          (token.document.disposition === CONST.TOKEN_DISPOSITIONS.FRIENDLY && checkValue === "friendly") ||
          (token.document.disposition !== CONST.TOKEN_DISPOSITIONS.FRIENDLY && checkValue === "hostile")
        ) {
          let reducers = options.reduce?.filter((e) => e.id === "token");
          terrainInfos.push({object: token.document, reducers});
        }
      }
    }

    return terrainInfos;
  }

  getCost(terrain) {
    let terrainCost = terrain instanceof TokenDocument ? 2 : terrain.flags["simple-terrain"].multiple;
    if (!terrain.reducers) return terrainCost;
    for (const reduce of terrain.reducers) {
      let value = parseFloat(reduce.value);

      if (typeof reduce.value === "string" && (reduce.value.startsWith("+") || reduce.value.startsWith("-"))) {
        value = terrainCost + value;
        if (reduce.stop) {
          if (reduce.value.startsWith("+")) value = Math.min(value, reduce.stop);
          else value = Math.max(value, reduce.stop);
        }
      }
      terrainCost = value;
    }
    return terrainCost;
  }

  listAllTerrain(options = {}) {
    let terrainList = [...this.listTokenTerrain(options), ...this.listTerrain(options)].map((a) => {
      return {
        reducers: a.reducers,
        shape: this.getShapeFromDoc(a.object),
        object: a.object
      };
    });
    console.log("Terrain: ", terrainList);
    return terrainList;
  }

  getShapeFromDoc(document) {
    if (document instanceof MeasuredTemplateDocument) {
      return document.object.shape;
    } else if (document instanceof TokenDocument) {
      if (canvas.grid.type === CONST.GRID_TYPES.GRIDLESS) {
        const hw = (document.width * canvas.dimensions.size) / 2;
        const hh = (document.height * canvas.dimensions.size) / 2;

        return new PIXI.Circle(hw, hh, Math.max(hw, hh));
      } else {
        const left = 0;
        const top = 0;
        const width = document.width * canvas.dimensions.size;
        const height = document.height * canvas.dimensions.size;

        return new PIXI.Rectangle(left, top, width, height);
      }
    }

    let {shape} = document;
    switch (shape.type) {
      case Drawing.SHAPE_TYPES.RECTANGLE:
        return new PIXI.Rectangle(0, 0, shape.width, shape.height);
      case Drawing.SHAPE_TYPES.ELLIPSE:
        return new PIXI.Ellipse(
          shape.width / 2,
          shape.height / 2,
          Math.max(Math.abs(shape.width / 2), 0),
          Math.max(Math.abs(shape.height / 2), 0)
        );
      case Drawing.SHAPE_TYPES.POLYGON:
        return new PIXI.Polygon(shape.points);
    }
  }

  costWithTerrain(pts, terrain, options = {}) {
    const multipleResults = pts instanceof Array;
    pts = multipleResults ? pts : [pts];

    const hx =
      canvas.grid.type === CONST.GRID_TYPES.GRIDLESS || options.ignoreGrid === true ? 0 : canvas.dimensions.size / 2;
    const hy =
      canvas.grid.type === CONST.GRID_TYPES.GRIDLESS || options.ignoreGrid === true ? 0 : canvas.dimensions.size / 2;

    const costs = [];
    for (const pt of pts) {
      const [gx, gy] =
        canvas.grid.type === CONST.GRID_TYPES.GRIDLESS || options.ignoreGrid === true
          ? [pt.x, pt.y]
          : canvas.grid.grid.getPixelsFromGridPosition(pt.x, pt.y);

      const tx = gx + hx;
      const ty = gy + hy;

      let result = [];
      for (let t of terrain.filter((t2) => t2.shape.contains(tx - t2.object.x, ty - t2.object.y))) {
        let doc = t.object;
        doc.setFlag("simple-terrain", "cost", this.getCost(doc));
        result.push(doc);
      }
      const cost = calculateCombinedCost(result, options);
      costs.push(cost);
    }

    if (multipleResults) return costs;
    else return costs[0];
  }

  cost(pts, options = {}) {
    const terrain = this.listAllTerrain(options);
    return this.costWithTerrain(pts, terrain, options);
  }

  terrainFromGrid(x, y, options = {}) {
    let [gx, gy] = canvas.grid.grid.getPixelsFromGridPosition(x, y);
    return this.terrainFromPixels(gx, gy, options);
  }

  terrainFromPixels(x, y, options = {}) {
    const hx = x + canvas.dimensions.size / 2;
    const hy = y + canvas.dimensions.size / 2;

    let terrains = this.listAllTerrain().filter((t) => {
      const testX = hx - t.x;
      const testY = hy - t.y;
      return t.shape.contains(testX, testY);
    });

    const elevation = this.calcElevationFromOptions(options);
    if (elevation !== null) {
      terrains = terrains.filter((t) => (elevation) => t.bottom && elevation <= t.top);
    }

    return terrains;
  }
}
