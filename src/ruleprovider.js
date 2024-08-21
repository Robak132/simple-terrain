export class RuleProvider {
  calculateCombinedCost(terrain, options) {
    let calculate = options.calculate || "maximum";
    let calculateFn;
    if (typeof calculate == "function") {
      calculateFn = calculate;
    } else {
      switch (calculate) {
        case "maximum":
          calculateFn = function (cost, total) {
            return Math.max(cost, total);
          };
          break;
        case "additive":
          calculateFn = function (cost, total) {
            return cost + total;
          };
        case "multiple":
          calculateFn = function (cost, total) {
            return cost * (total ?? 1);
          };
          break;
        default:
          throw new Error(i18n("SimpleTerrain.ErrorCalculate"));
      }
    }

    let total = null;
    for (const t of terrain) {
      if (typeof calculateFn == "function") {
        total = calculateFn(t?.getFlag("simple-terrain", "cost") ?? 2, total);
      }
    }
    if (
      Number.isNumeric(canvas.scene.getFlag("simple-terrain", "cost")) &&
      Number(canvas.scene.getFlag("simple-terrain", "cost"))
    ) {
      total = calculateFn(canvas.scene.getFlag("simple-terrain", "cost"), total);
    }
    return total ?? 1;
  }

  constructor(id) {
    this.id = id;
  }
}
