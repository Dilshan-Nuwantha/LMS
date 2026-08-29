import { createContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

// Cache expiry time from env (default 7 days) - should match JWT token expiry
const CACHE_EXPIRY_DAYS = parseInt(import.meta.env.VITE_SESSION_EXPIRY_DAYS) || 7;
const CACHE_EXPIRY_MS = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

// Helper to get cached user from localStorage (with expiry check)
const getCachedUser = () => {
    try {
        const cached = localStorage.getItem('userCache');
        if (!cached) return null;

        const { user, timestamp } = JSON.parse(cached);

        // Check if cache has expired (7 days)
        if (Date.now() - timestamp > CACHE_EXPIRY_MS) {
            localStorage.removeItem('userCache');
            localStorage.removeItem('token');
            return null;
        }

        return user;
    } catch {
        return null;
    }
};

// Helper to cache user in localStorage (with timestamp)
const cacheUser = (userData) => {
    if (userData) {
        localStorage.setItem('userCache', JSON.stringify({
            user: userData,
            timestamp: Date.now()
        }));
    } else {
        localStorage.removeItem('userCache');
    }
};

export const AuthProvider = ({ children }) => {
    // Initialize user from cache immediately (no flash!)
    const [user, setUser] = useState(() => getCachedUser());
    // If we have cached user, don't show loading state
    const [loading, setLoading] = useState(() => !getCachedUser());

    useEffect(() => {
        const checkUserLoggedIn = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const res = await api.get('/auth/me');
                    setUser(res.data);
                    cacheUser(res.data);
                } catch (error) {
                    // Token invalid, clear everything
                    localStorage.removeItem('token');
                    cacheUser(null);
                    setUser(null);
                }
            } else {
                // No token, clear cached user
                cacheUser(null);
                setUser(null);
            }
            setLoading(false);
        };

        checkUserLoggedIn();
    }, []);

    const getRolePath = (role) => {
        if (role === 'admin') return 'admin';
        if (role === 'instructor') return 'teacher';
        return 'student';
    };

    const login = async (email, password, role) => {
        const rolePath = getRolePath(role);
        const res = await api.post(`/auth/${rolePath}/login`, { email, password });
        localStorage.setItem('token', res.data.token);
        cacheUser(res.data);
        setUser(res.data);
        return res.data;
    };

    const register = async (name, email, password, role = 'student') => {
        const rolePath = getRolePath(role);
        const res = await api.post(`/auth/${rolePath}/register`, { name, email, password });
        localStorage.setItem('token', res.data.token);
        cacheUser(res.data);
        setUser(res.data);
        return res.data;
    };

    const googleLogin = async (code) => {
        const res = await api.post('/auth/google', { code });
        localStorage.setItem('token', res.data.token);
        cacheUser(res.data);
        setUser(res.data);
        return res.data;
    };

    const updateProfile = async (data) => {
        const res = await api.put('/auth/profile', data);
        cacheUser(res.data);
        setUser(res.data);
        return res.data;
    };

    const logout = () => {
        localStorage.removeItem('token');
        cacheUser(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, googleLogin, logout, updateProfile }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
