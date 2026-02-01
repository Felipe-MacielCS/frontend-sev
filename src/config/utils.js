export default class Utils {
  // set local storage
  static setStore = (name, content) => {
    if (!name) return;
    if (typeof content !== "string") {
      content = JSON.stringify(content);
    }
    return window.localStorage.setItem(name, content);
  };

  // get local storage
  static getStore = (name) => {
    if (!name) return;
    const item = window.localStorage.getItem(name);
    try {
      return JSON.parse(item);
    } catch {
      return item;
    }
  };

  // remove item
  static removeItem = (name) => {
    if (!name) return;
    return window.localStorage.removeItem(name);
  };

  // validate email
  static isValidEmail = (value) => {
    return value && !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,64}$/i.test(value)
      ? false
      : true;
  };

  // ✅ NEW TOKEN HELPERS BELOW
  static setToken = (token) => {
    if (!token) return;
    window.localStorage.setItem("token", token);
  };

  static getToken = () => {
    return window.localStorage.getItem("token");
  };

  static removeToken = () => {
    window.localStorage.removeItem("token");
  };
}
