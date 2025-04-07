/**
 * Array utilities
 */
export const arrayUtils = {
  /**
   * Chunk array into smaller arrays of specified size
   * @param {Array} array - Array to chunk
   * @param {number} size - Size of each chunk
   * @returns {Array} Array of chunks
   */
  chunk: (array, size = 1) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  },
  
  /**
   * Shuffle array using Fisher-Yates algorithm
   * @param {Array} array - Array to shuffle
   * @returns {Array} Shuffled array
   */
  shuffle: (array) => {
    const result = [...array];
    let currentIndex = result.length;
    let temporaryValue, randomIndex;
    
    while (currentIndex !== 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;
      
      temporaryValue = result[currentIndex];
      result[currentIndex] = result[randomIndex];
      result[randomIndex] = temporaryValue;
    }
    
    return result;
  },
  
  /**
   * Get random item from array
   * @param {Array} array - Source array
   * @returns {*} Random item from array
   */
  randomItem: (array) => {
    return array[Math.floor(Math.random() * array.length)];
  },
  
  /**
   * Remove duplicates from array
   * @param {Array} array - Array with possible duplicates
   * @returns {Array} Array with unique items
   */
  unique: (array) => {
    return [...new Set(array)];
  }
}; 