// Token management utility
export const getToken = () => {
    return localStorage.getItem('token');
};

export const setToken = (token) => {
    localStorage.setItem('token', token);
    
    // Set expiration time (24 hours from now)
    const now = new Date();
    localStorage.setItem('token_expires_at', new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString());
};

export const isTokenExpired = () => {
    const expiresAt = localStorage.getItem('token_expires_at');
    if (!expiresAt) return true;
    
    const now = new Date();
    const tokenExpiration = new Date(expiresAt);
    return now >= tokenExpiration;
};

export const clearToken = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('token_expires_at');
};
