import {Terrain} from "./terrain.js";
import {TerrainConfig} from "./terrainconfig.js";
import {TerrainHUD} from "./terrainhud.js";
import {TerrainDocument} from "./terraindocument.js";
import {PolygonTerrainInfo, TemplateTerrainInfo, TokenTerrainInfo} from "./terraininfo.js";
import {setting} from "./utility.js";
import {calculateCombinedCost} from "./api.js";

export class TerrainLayer extends PlaceablesLayer {
  constructor() {
    super();
    this.defaultmultiple = 2;
    this._setting = {};
  }

  static documentName = "Terrain";

  /** @override */
  static get layerOptions() {
    return mergeObject(super.layerOptions, {
      name: "terrain",
      zIndex: 5,
      canDragCreate: game.user.isGM,
      canDelete: game.user.isGM,
      controllableObjects: game.user.isGM,
      rotatableObjects: false,
      objectClass: Terrain,
      sortActiveTop: true,
      sheetClasses: {
        base: {
          "simple-terrain.TerrainSheet": {
            id: "simple-terrain.TerrainSheet",
            label: "Enhanced Terrain Sheet",
            default: true,
            cls: TerrainConfig
          }
        }
      }
    });
  }

  getDocuments() {
    return canvas.scene.terrain || null;
  }

  get(objectId) {
    return canvas.scene.terrain?.get(objectId)?.object || undefined;
  }

  get gridPrecision() {
    let size = canvas.dimensions.size;
    if (size >= 128) return 16;
    else if (size >= 64) return 8;
    else if (size >= 32) return 4;
    else if (size >= 16) return 2;
  }

  static get multipleOptions() {
    return [0.5, 1, 2, 3, 4];
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

  static multipleText(multiple) {
    return parseFloat(multiple) === 0.5 ? "&frac12;" : multiple;
  }

  static alterMultiple(multiple, increase = true) {
    let step = 1;
    if (multiple < 1 || (multiple === 1 && !increase)) step = 0.5;

    let newmult = multiple + step * (increase ? 1 : -1);
    if (newmult >= 1) newmult = parseInt(newmult);
    else newmult = Math.round(newmult * 2) / 2;

    newmult = Math.clamped(newmult, setting("minimum-cost"), setting("maximum-cost"));

    return newmult;
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
          : canvas.grid.grid.getPixelsFromGridPosition(pt.y, pt.x);

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
    for (const terrain of this.placeables) {
      if (elevation < terrain.document.bottom || elevation > terrain.document.top) continue;
      if (terrain.document.multiple === 1) continue;
      if (options.ignore?.includes(terrain.document.environment)) continue;
      let reducers = options.reduce?.filter(
        (e) => e.id === terrain.document.environment || (useObstacles && e.id === terrain.document.obstacle)
      );
      terrainInfos.push(new PolygonTerrainInfo(terrain, reducers));
    }
    return terrainInfos;
  }

  listMeasuredTerrain(options = {}) {
    const useObstacles = setting("use-obstacles");
    const elevation = this.calcElevationFromOptions(options);

    const terrainInfos = options.list || [];
    for (const template of canvas.templates.placeables) {
      const terrainFlag = getProperty(template.document, "flags.simple-terrain");
      if (!terrainFlag) continue;
      const terraincost = terrainFlag.multiple ?? 1;
      let terrainbottom = terrainFlag.elevation ?? Terrain.defaults.elevation;
      let terraintop = terrainbottom + (terrainFlag.depth ?? Terrain.defaults.depth);
      if (terraintop < terrainbottom) {
        let temp = terrainbottom;
        terrainbottom = terraintop;
        terraintop = temp;
      }

      const environment = terrainFlag.environment || "";
      const obstacle = terrainFlag.obstacle || "";
      if (elevation < terrainbottom || elevation > terraintop) continue;
      if (terraincost === 1) continue;
      if (options.ignore?.includes(environment)) continue;
      let reducers = options.reduce?.filter((e) => e.id === environment || (useObstacles && e.id === obstacle));
      terrainInfos.push(new TemplateTerrainInfo(template, reducers));
    }
    return terrainInfos;
  }

  listTokenTerrain(options = {}) {
    const terrainInfos = options.list || [];

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
          terrainInfos.push(new TokenTerrainInfo(token, reducers));
        }
      }
    }

    return terrainInfos;
  }

  listAllTerrain(options = {}) {
    return this.listTokenTerrain({
      list: this.listMeasuredTerrain({list: this.listTerrain(options), ...options}),
      ...options
    });
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
          : canvas.grid.grid.getPixelsFromGridPosition(pt.y, pt.x);

      const tx = gx + hx;
      const ty = gy + hy;

      terrain = terrain.filter((t) => t.shape.contains(tx - t.object.x, ty - t.object.y));
      const cost = calculateCombinedCost(terrain, options);
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
    let [gx, gy] = canvas.grid.grid.getPixelsFromGridPosition(y, x);
    return this.terrainFromPixels(gx, gy, options);
  }

  terrainFromPixels(x, y, options = {}) {
    const hx = x + canvas.dimensions.size / 2;
    const hy = y + canvas.dimensions.size / 2;

    let terrains = this.placeables.filter((t) => {
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

  /**
   * Tile objects on this layer utilize the TileHUD
   * @type {TerrainHUD}
   */
  get hud() {
    return canvas.hud.terrain;
  }

  async draw() {
    const d = canvas.dimensions;
    this.width = d.width;
    this.height = d.height;
    this.hitArea = d.rect;
    this.zIndex = this.constructor.layerOptions.zIndex;

    // Create objects container which can be sorted
    this.objects = this.addChild(new PIXI.Container());
    this.objects.sortableChildren = true;
    this.objects.visible = false;

    // Create preview container which is always above objects
    this.preview = this.addChild(new PIXI.Container());

    const documents = this.getDocuments() || [];
    const promises = documents.map((doc) => {
      doc._destroyed = false;
      return doc.object?.draw();
    });

    // Wait for all objects to draw
    this.visible = true;
    await Promise.all(promises);
    return this;
  }

  async toggle(show, emit = false) {
    if (show === undefined) show = !this.showterrain;
    this.showterrain = show;
    if (game.user.isGM && emit)
      game.socket.emit("module.simple-terrain", {action: "toggle", arguments: [this._showterrain]});
  }

  _getNewTerrainData(origin) {
    const tool = game.activeTool;

    const data = mergeObject(Terrain.defaults, {
      x: origin.x,
      y: origin.y,
      author: game.user.id
    });

    // Mandatory additions
    delete data._id;
    if (tool !== "freehand") {
      origin = canvas.grid.getSnappedPosition(origin.x, origin.y, this.gridPrecision);
      data.x = origin.x;
      data.y = origin.y;
    }

    switch (tool) {
      case "rect":
        data.shape.type = Drawing.SHAPE_TYPES.RECTANGLE;
        data.shape.width = 1;
        data.shape.height = 1;
        break;
      case "ellipse":
        data.shape.type = Drawing.SHAPE_TYPES.ELLIPSE;
        data.shape.width = 1;
        data.shape.height = 1;
        break;
      case "freehand":
        data.shape.type = Drawing.SHAPE_TYPES.POLYGON;
        data.shape.points = [0, 0];
        data.bezierFactor = data.bezierFactor ?? 0.5;
        break;
      case "polygon":
        data.shape.type = Drawing.SHAPE_TYPES.POLYGON;
        data.shape.points = [0, 0];
        data.bezierFactor = 0;
        break;
    }

    return TerrainDocument.cleanData(data);
  }

  /** @override */
  _onClickLeft(event) {
    const {preview, createState, originalEvent} = event.data;

    // Continue polygon point placement
    if (createState >= 1 && preview.isPolygon) {
      let point = event.data.destination;
      const snap = !originalEvent.shiftKey;
      preview._addPoint(point, {snap, round: true});
      preview._chain = true; // Note that we are now in chain mode
      return preview.refresh();
    }

    // Standard left-click handling
    super._onClickLeft(event);
  }

  /** @override */
  _onClickLeft2(event) {
    const {createState, preview} = event.data;

    // Conclude polygon placement with double-click
    if (createState >= 1 && preview.isPolygon) {
      event.data.createState = 2;
      return this._onDragLeftDrop(event);
    } else if (createState === 0 || createState === undefined) {
      //add a default square
      let gW = canvas.grid.grid.w;
      let gH = canvas.grid.grid.h;

      //let pos = canvas.grid.getSnappedPosition(event.data.origin.x, event.data.origin.y, 1);
      let [tX, tY] = canvas.grid.grid.getGridPositionFromPixels(event.data.origin.x, event.data.origin.y);
      let [gX, gY] = canvas.grid.grid.getPixelsFromGridPosition(tX, tY);

      let points = [];
      if (canvas.grid.type === CONST.GRID_TYPES.GRIDLESS || canvas.grid.type === CONST.GRID_TYPES.SQUARE)
        points = [0, 0, gW, 0, gW, gH, 0, gH, 0, 0];
      else if (canvas.grid.type === CONST.GRID_TYPES.HEXEVENR || canvas.grid.type === CONST.GRID_TYPES.HEXODDR)
        points = [gW / 2, 0, gW, gH * 0.25, gW, gH * 0.75, gW / 2, gH, 0, gH * 0.75, 0, gH * 0.25, gW / 2, 0];
      else if (canvas.grid.type === CONST.GRID_TYPES.HEXEVENQ || canvas.grid.type === CONST.GRID_TYPES.HEXODDQ)
        points = [0, gH / 2, gW * 0.25, 0, gW * 0.75, 0, gW, gH / 2, gW * 0.75, gH, gW * 0.25, gH, 0, gH / 2];

      const data = mergeObject(Terrain.defaults, {
        x: gX - (canvas.grid.type === CONST.GRID_TYPES.GRIDLESS ? gW / 2 : 0),
        y: gY - (canvas.grid.type === CONST.GRID_TYPES.GRIDLESS ? gH / 2 : 0),
        shape: {
          points: points,
          width: gW,
          height: gH
        }
      });

      //const document = new TerrainDocument(data, { parent: canvas.scene });

      this.createTerrain(data);
    }

    // Standard double-click handling
    super._onClickLeft2(event);
  }

  /** @override */
  async _onDragLeftStart(event) {
    await super._onDragLeftStart(event);
    const data = this._getNewTerrainData(event.data.origin);

    const document = new TerrainDocument(data, {parent: canvas.scene});
    const terrain = new Terrain(document);
    event.data.preview = this.preview.addChild(terrain);
    return terrain.draw();
  }

  /** @override */
  _onDragLeftMove(event) {
    const {preview, createState} = event.data;
    if (!preview || preview._destroyed) return;
    if (preview.parent === null) {
      // In theory this should never happen, but rarely does
      this.preview.addChild(preview);
    }
    if (createState >= 1) {
      preview._onMouseDraw(event);
      const isFreehand = game.activeTool === "freehand";
      if (!preview.isPolygon || isFreehand) event.data.createState = 2;
    }
  }

  /**
   * Handling of mouse-up events which conclude a new object creation after dragging
   * @private
   */
  async _onDragLeftDrop(event) {
    const {createState, preview} = event.data;

    // Successful drawing completion
    if (createState === 2) {
      const distance = Math.hypot(preview.shape.width, preview.shape.height);
      const minDistance = distance >= canvas.dimensions.size / this.gridPrecision;
      const completePolygon = preview.isPolygon && preview.document.shape.points.length > 4;

      // Create a completed terrain
      if (minDistance || completePolygon) {
        event.data.createState = 0;
        const data = preview.document.toObject(false);

        // Adjust the final data
        preview._chain = false;
        //const createData = this.constructor.placeableClass.normalizeShape(data);
        let terrain = await this.createTerrain(data);

        const o = terrain.object;
        o._creating = true;
        if (game.activeTool !== "freehand") o.control({isNew: true});
      }

      // Cancel the preview
      return this._onDragLeftCancel(event);
    }

    // In-progress polygon
    if (createState === 1) {
      event.data.originalEvent.preventDefault();
      if (preview._chain) return;
      return this._onClickLeft(event);
    }

    // Incomplete drawing
    return this._onDragLeftCancel(event);
  }

  /** @override */
  _onDragLeftCancel(event) {
    const preview = this.preview.children?.[0] || null;
    if (preview?._chain) {
      preview._removePoint();
      preview.refresh();
      if (preview.document.shape.points.length) return event.preventDefault();
    }
    super._onDragLeftCancel(event);
  }

  /** @override */
  _onClickRight(event) {
    const preview = this.preview.children?.[0] || null;
    if (preview) return (canvas.mouseInteractionManager._dragRight = false);
    super._onClickRight(event);
  }

  async pasteObjects(position, {hidden = false, snap = true} = {}) {
    if (!this._copy.length) return [];
    const cls = this.constructor.placeableClass;
    const d = canvas.dimensions;

    // Adjust the pasted position for half a grid space
    if (snap) {
      position.x -= canvas.dimensions.size / 2;
      position.y -= canvas.dimensions.size / 2;
    }

    // Get the left-most object in the set
    this._copy.sort((a, b) => a.data.x - b.data.x);
    let {x, y} = this._copy[0].data;

    // Iterate over objects
    const toCreate = [];
    for (let c of this._copy) {
      let data = c.document.toObject(false);
      delete data._id;

      // Constrain the destination position
      let dest = {x: position.x + (data.x - x), y: position.y + (data.y - y)};
      dest.x = Math.clamped(dest.x, 0, d.width - 1);
      dest.y = Math.clamped(dest.y, 0, d.height - 1);
      if (snap) dest = canvas.grid.getSnappedPosition(dest.x, dest.y);

      let document = new TerrainDocument(
        Terrain.normalizeShape(
          mergeObject(data, {
            x: dest.x,
            y: dest.y,
            hidden: data.hidden || hidden
          })
        ),
        {parent: canvas.scene}
      );
      toCreate.push(document.data);
    }

    // Call paste hooks
    Hooks.call(`paste${cls.name}`, this._copy, toCreate);

    let created = await canvas.scene.createEmbeddedDocuments(this.constructor.documentName, toCreate);
    ui.notifications.info(`Pasted data for ${toCreate.length} ${this.constructor.documentName} objects.`);

    /*
        for (let terrain of created) {
            if (terrain.document._object === undefined) {
                terrain.document._object = new Terrain(terrain.document);
                canvas.terrain.objects.addChild(terrain.document._object);
                terrain.document._object.draw();
            }
        }*/

    return created;
  }

  createTerrain(data) {
    //data = mergeObject(Terrain.defaults, data);
    const cls = getDocumentClass("Terrain");
    const createData = this.constructor.placeableClass.normalizeShape(data);

    // Create the object
    return cls.create(createData, {parent: canvas.scene}); /*.then(d => {
            d._creating = true;
            if (d.document._object === undefined) {
                d.document._object = new Terrain(d.document);
                canvas.terrain.objects.addChild(d.document._object);
                d.document._object.draw();
            }
            return d;
        });*/
  }

  _createTerrain(data) {
    //let toCreate = data.map(d => new TerrainData(d));
    TerrainDocument.createDocuments(data, {parent: canvas.scene});

    /*
        let toCreate = data.map(d => {
            const document = new TerrainDocument(d, { parent: canvas.scene });
            return document.data;
        });

        TerrainDocument.createDocuments();

        let userId = game.user._id;
        let object = canvas.terrain.createObject(data);
        object._onCreate(options, userId);
        canvas["#scene"].terrain.push(data);*/
  }

  _updateTerrain(data) {
    TerrainDocument.updateDocuments(data, {parent: canvas.scene});
  }

  _deleteTerrain(ids) {
    TerrainDocument.deleteDocuments(ids, {parent: canvas.scene});
  }

  refresh() {
    for (let terrain of this.placeables) {
      terrain.refresh();
    }
  }

  redraw() {
    for (let terrain of this.placeables) {
      terrain.draw();
    }
  }
}
