const TOKEN_KEY = 'ecommerce-token';
const USER_KEY = 'ecommerce-user';

window.AppStorage = {
  getToken: () => sessionStorage.getItem(TOKEN_KEY),
  getUser: () => JSON.parse(sessionStorage.getItem(USER_KEY) || 'null'),
  setSession(token, user) {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clearSession() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  }
};
