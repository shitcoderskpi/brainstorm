import { defineProperty as _defineProperty } from '../../_virtual/_rollupPluginBabelHelpers.mjs';
import { BaseFilter } from './BaseFilter.mjs';
import { classRegistry } from '../ClassRegistry.mjs';
import { fragmentSource } from './shaders/grayscale.mjs';

const grayscaleDefaultValues = {
  mode: 'average'
};

/**
 * Grayscale image filter class
 * @example
 * const filter = new Grayscale();
 * object.filters.push(filter);
 * object.applyFilters();
 */
class Grayscale extends BaseFilter {
  /**
   * Apply the Grayscale operation to a Uint8Array representing the pixels of an image.
   *
   * @param {Object} options
   * @param {ImageData} options.imageData The Uint8Array to be filtered.
   */
  applyTo2d(_ref) {
    let {
      imageData: {
        data
      }
    } = _ref;
    for (let i = 0, value; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      switch (this.mode) {
        case 'average':
          value = (r + g + b) / 3;
          break;
        case 'lightness':
          value = (Math.min(r, g, b) + Math.max(r, g, b)) / 2;
          break;
        case 'luminosity':
          value = 0.21 * r + 0.72 * g + 0.07 * b;
          break;
      }
      data[i + 2] = data[i + 1] = data[i] = value;
    }
  }
  getCacheKey() {
    return "".concat(this.type, "_").concat(this.mode);
  }
  getFragmentSource() {
    return fragmentSource[this.mode];
  }

  /**
   * Send data from this filter to its shader program's uniforms.
   *
   * @param {WebGLRenderingContext} gl The GL canvas context used to compile this filter's shader.
   * @param {Object} uniformLocations A map of string uniform names to WebGLUniformLocation objects
   */
  sendUniformData(gl, uniformLocations) {
    const mode = 1;
    gl.uniform1i(uniformLocations.uMode, mode);
  }

  /**
   * Grayscale filter isNeutralState implementation
   * The filter is never neutral
   * on the image
   **/
  isNeutralState() {
    return false;
  }
}
_defineProperty(Grayscale, "type", 'Grayscale');
_defineProperty(Grayscale, "defaults", grayscaleDefaultValues);
_defineProperty(Grayscale, "uniformLocations", ['uMode']);
classRegistry.setClass(Grayscale);

export { Grayscale, grayscaleDefaultValues };
//# sourceMappingURL=Grayscale.mjs.map
