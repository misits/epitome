/**
 * Object utilities
 */
export const objectUtils = {
  /**
   * Deep clone an object
   * @param {Object} obj - Object to clone
   * @returns {Object} Cloned object
   */
  deepClone: <T>(obj: T): T => {
    return JSON.parse(JSON.stringify(obj));
  },
  
  /**
   * Merge objects deeply
   * @param {Object} target - Target object
   * @param {...Object} sources - Source objects
   * @returns {Object} Merged object
   */
  deepMerge: <T extends Record<string, any>, U extends Record<string, any>[]>(
    target: T, 
    ...sources: U
  ): T => {
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
  pick: <T extends Record<string, any>, K extends keyof T>(
    obj: T, 
    keys: K[]
  ): Pick<T, K> => {
    return keys.reduce((acc, key) => {
      if (key in obj) acc[key] = obj[key];
      return acc;
    }, {} as Pick<T, K>);
  },
  
  /**
   * Omit specific properties from an object
   * @param {Object} obj - Source object
   * @param {string[]} keys - Keys to omit
   * @returns {Object} New object without omitted properties
   */
  omit: <T extends Record<string, any>>(
    obj: T, 
    keys: (keyof T)[]
  ): Partial<T> => {
    const result: Partial<T> = {};
    for (const key in obj) {
      if (!keys.includes(key as keyof T)) {
        result[key as keyof T] = obj[key];
      }
    }
    return result;
  }
}; 