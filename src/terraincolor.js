import {i18n, setting} from "./utility.js";

export class TerrainColor extends FormApplication {
  constructor(object, options) {
    super(object, options);
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "terraincolor",
      title: i18n("SimpleTerrain.TerrainColor"),
      template: "./modules/simple-terrain/templates/terrain-color.html",
      width: 400,
      height: 400,
      popOut: true
    });
  }

  getData(options) {
    let colors = setting("environment-color");

    let obstacleColor = [];
    let environmentColor = canvas.terrain.getEnvironments().reduce(function (map, obj) {
      if (colors[obj.id] !== undefined) obj.color = colors[obj.id];

      if (obj.obstacle === true) {
        obstacleColor.push(obj);
      } else map.push(obj);
      return map;
    }, []);

    return {
      main: {id: "_default", color: colors["_default"] || "#FFFFFF"},
      environment: environmentColor,
      obstacle: obstacleColor
    };
  }

  saveChanges(ev) {
    let colors = setting("environment-color");
    let updateColor = function (id, value) {
      if (value === "") {
        delete colors[id];
      } else {
        colors[id] = value;
      }
    };

    updateColor("_default", $("#_default", this.element).val());

    for (let env of canvas.terrain.getEnvironments()) {
      updateColor(env.id, $("#" + env.id, this.element).val());
    }
    /*
        for (let obs of canvas.terrain.getObstacles()) {
            updateColor(obs.id, $('#' + obs.id, this.element).val());
        }*/

    game.settings.set("simple-terrain", "environment-color", colors).then(() => {
      canvas.terrain.refresh(true);
    });

    this.close();
  }

  resetSetting() {
    game.settings.set("simple-terrain", "environment-color", {_default: "#FFFFFF"});
    this.render(true);
  }

  activateListeners(html) {
    super.activateListeners(html);

    $('button[name="reset"]', html).click(this.resetSetting.bind(this));
    $('button[name="submit"]', html).click(this.saveChanges.bind(this));
  }
}
