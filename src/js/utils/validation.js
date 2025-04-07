/**
 * Validation utilities
 */
export const validation = {
  /**
   * Check if string is a valid email
   * @param {string} email - Email to validate
   * @returns {boolean} True if valid email
   */
  isEmail: (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },
  
  /**
   * Check if string is a valid URL
   * @param {string} url - URL to validate
   * @returns {boolean} True if valid URL
   */
  isURL: (url) => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  },
  
  /**
   * Check if string is a valid phone number
   * @param {string} phone - Phone number to validate
   * @returns {boolean} True if valid phone number
   */
  isPhoneNumber: (phone) => {
    return /^\+?[\d\s()-]{10,}$/.test(phone);
  },
  
  /**
   * Check if string is a strong password
   * @param {string} password - Password to validate
   * @returns {boolean} True if strong password
   */
  isStrongPassword: (password) => {
    // At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{8,}$/.test(password);
  }
}; 