import { objectSpread2 as _objectSpread2, defineProperty as _defineProperty } from '../../_virtual/_rollupPluginBabelHelpers.mjs';
import { cos } from '../util/misc/cos.mjs';
import { sin } from '../util/misc/sin.mjs';
import { colorMatrixDefaultValues, ColorMatrix } from './ColorMatrix.mjs';
import { classRegistry } from '../ClassRegistry.mjs';

const hueRotationDefaultValues = _objectSpread2(_objectSpread2({}, colorMatrixDefaultValues), {}, {
  rotation: 0
});

/**
 * HueRotation filter class
 * @example
 * const filter = new HueRotation({
 *   rotation: -0.5
 * });
 * object.filters.push(filter);
 * object.applyFilters();
 */
class HueRotation extends ColorMatrix {
  calculateMatrix() {
    const rad = this.rotation * Math.PI,
      cosine = cos(rad),
      sine = sin(rad),
      aThird = 1 / 3,
      aThirdSqtSin = Math.sqrt(aThird) * sine,
      OneMinusCos = 1 - cosine;
    this.matrix = [cosine + OneMinusCos / 3, aThird * OneMinusCos - aThirdSqtSin, aThird * OneMinusCos + aThirdSqtSin, 0, 0, aThird * OneMinusCos + aThirdSqtSin, cosine + aThird * OneMinusCos, aThird * OneMinusCos - aThirdSqtSin, 0, 0, aThird * OneMinusCos - aThirdSqtSin, aThird * OneMinusCos + aThirdSqtSin, cosine + aThird * OneMinusCos, 0, 0, 0, 0, 0, 1, 0];
  }
  isNeutralState() {
    return this.rotation === 0;
  }
  applyTo(options) {
    this.calculateMatrix();
    super.applyTo(options);
  }
  toObject() {
    return {
      type: this.type,
      rotation: this.rotation
    };
  }
}
/**
 * HueRotation value, from -1 to 1.
 */
_defineProperty(HueRotation, "type", 'HueRotation');
_defineProperty(HueRotation, "defaults", hueRotationDefaultValues);
classRegistry.setClass(HueRotation);

export { HueRotation, hueRotationDefaultValues };
//# sourceMappingURL=HueRotation.mjs.map
