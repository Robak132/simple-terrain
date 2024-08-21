import {TerrainLayer} from "./terrainlayer.js";
import {i18n} from "./utility.js";

export class TerrainHUD extends BasePlaceableHUD {
  _showEnvironments = false;

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "terrain-hud",
      template: "modules/simple-terrain/templates/terrain-hud.html"
    });
  }

  bind(object) {
    this._showEnvironments = false;
    return super.bind(object);
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    let _environments = canvas.terrain.getEnvironments().map((obj) => {
      obj.text = i18n(obj.text);
      obj.active = this.object.document.environment === obj.id;
      return obj;
    });

    const data = super.getData();
    return mergeObject(data, {
      lockedClass: data.locked ? "active" : "",
      visibilityClass: data.hidden ? "active" : "",
      text: TerrainLayer.multipleText(data.multiple),
      environment: this.object.document.environmentObject,
      environments: _environments
    });
  }

  activateListeners(html) {
    super.activateListeners(html);

    $(".inc-multiple", this.element).on("click", this._onHandleClick.bind(this, true));
    $(".dec-multiple", this.element).on("click", this._onHandleClick.bind(this, false));
    html.find(".environments > img").click(this._onClickEnvironments.bind(this));

    html
      .find(".environment-list")
      .on("click", ".environment-container", this._onToggleEnvironment.bind(this))
      .on("contextmenu", ".environment-container", (event) => this._onToggleEnvironment(event));
  }

  _onClickEnvironments(event) {
    event.preventDefault();
    this._toggleEnvironments(!this._showEnvironments);
  }

  /* -------------------------------------------- */

  _toggleEnvironments(active) {
    this._showEnvironments = active;
    const button = this.element.find(".control-icon.environments")[0];
    button.classList.toggle("active", active);
    const palette = button.querySelector(".environment-list");
    palette.classList.toggle("active", active);
  }

  /* -------------------------------------------- */

  _onToggleEnvironment(event) {
    event.preventDefault();
    let ctrl = event.currentTarget;
    let id = ctrl.dataset.environmentId;
    $(".environment-list .environment-container.active", this.element).removeClass("active");
    if (id !== this.object.document.environment)
      $('.environment-list .environment-container[data-environment-id="' + id + '"]', this.element).addClass("active");

    const updates = this.layer.controlled.map((o) => {
      return {_id: o.id, environment: id !== this.object.document.environment ? id : ""};
    });

    return canvas.scene.updateEmbeddedDocuments("Terrain", updates).then(() => {
      $(".environments > img", this.element).attr(
        "src",
        this.object.document.environmentObject?.icon || "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="
      );
    });
  }

  _onHandleClick(increase, event) {
    const updates = this.layer.controlled.map((o) => {
      let mult = TerrainLayer.alterMultiple(o.document.multiple, increase);
      return {_id: o.id, multiple: mult};
    });

    let that = this;
    return canvas.scene.updateEmbeddedDocuments("Terrain", updates).then(() => {
      $(".terrain-cost", that.element).html(`${TerrainLayer.multipleText(that.object.document.multiple)}`);
    });
  }

  async _onToggleVisibility(event) {
    event.preventDefault();

    const isHidden = this.object.document.hidden;

    event.currentTarget.classList.toggle("active", !isHidden);

    // Toggle the visible state
    const updates = this.layer.controlled.map((o) => {
      return {_id: o.id, hidden: !isHidden};
    });
    return canvas.scene.updateEmbeddedDocuments("Terrain", updates);
  }

  async _onToggleLocked(event) {
    event.preventDefault();

    const isLocked = this.object.document.locked;

    event.currentTarget.classList.toggle("active", !isLocked);

    // Toggle the locked state
    const updates = this.layer.controlled.map((o) => {
      return {_id: o.id, locked: !isLocked};
    });
    return canvas.scene.updateEmbeddedDocuments("Terrain", updates);
  }

  /* -------------------------------------------- */

  /** @override */
  setPosition() {
    $("#hud").append(this.element);
    let {x, y, width, height} = this.object.hitArea;
    const c = 70;
    const p = -10;
    const position = {
      width: width + c * 2 + p * 2,
      height: height + p * 2,
      left: x + this.object.document.x - c - p,
      top: y + this.object.document.y - p
    };
    this.element.css(position);
  }
}
