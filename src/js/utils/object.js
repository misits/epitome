/**
 * Object utilities
 */
export const objectUtils = {
  /**
   * Deep clone an object
   * @param {Object} obj - Object to clone
   * @returns {Object} Cloned object
   */
  deepClone: (obj) => {
    return JSON.parse(JSON.stringify(obj));
  },
  
  /**
   * Merge objects deeply
   * @param {Object} target - Target object
   * @param {...Object} sources - Source objects
   * @returns {Object} Merged object
   */
  deepMerge: (target, ...sources) => {
    if (!sources.length) return target;
    
    const source = sources.shift();
    
    if (source === undefined) return target;
    
    if (typeof target === 'object' && typeof source === 'object') {
      for (const key in source) {
        if (source[key] instanceof Object && key in target) {
          objectUtils.deepMerge(target[key], source[key]);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
    }
    
    return objectUtils.deepMerge(target, ...sources);
  },
  
  /**
   * Pick specific properties from an object
   * @param {Object} obj - Source object
   * @param {string[]} keys - Keys to pick
   * @returns {Object} New object with picked properties
   */
  pick: (obj, keys) => {
    return keys.reduce((acc, key) => {
      if (key in obj) acc[key] = obj[key];
      return acc;
    }, {});
  },
  
  /**
   * Omit specific properties from an object
   * @param {Object} obj - Source object
   * @param {string[]} keys - Keys to omit
   * @returns {Object} New object without omitted properties
   */
  omit: (obj, keys) => {
    return Object.keys(obj)
      .filter(key => !keys.includes(key))
      .reduce((acc, key) => {
        acc[key] = obj[key];
        return acc;
      }, {});
  }
}; 