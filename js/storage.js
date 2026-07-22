const USERS_KEY = 'emre-users';
const PRODUCTS_KEY = 'emre-products';
const SESSION_KEY = 'emre-session';

function getUsers() {
  return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getProducts(defaultProducts) {
  return JSON.parse(localStorage.getItem(PRODUCTS_KEY) || 'null') || defaultProducts;
}

function saveProducts(products) {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
}

function getSession() {
  return sessionStorage.getItem(SESSION_KEY);
}

function setSession(username) {
  sessionStorage.setItem(SESSION_KEY, username);
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

window.AppStorage = {
  getUsers,
  saveUsers,
  getProducts,
  saveProducts,
  getSession,
  setSession,
  clearSession
};
