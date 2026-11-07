
import { createContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

// Cache expiry time from env (default 1 hour, matching the token)
const CACHE_EXPIRY_HOURS =
    parseInt(import.meta.env.VITE_SESSION_EXPIRY_HOURS) || 1;

const CACHE_EXPIRY_MS =
    CACHE_EXPIRY_HOURS * 60 * 60 * 1000;

// Get cached user from localStorage
const getCachedUser = () => {
    try {
        const cached = localStorage.getItem('userCache');

        if (!cached) return null;

        const { user, timestamp } = JSON.parse(cached);

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

// Cache user in localStorage
const cacheUser = (userData) => {
    if (userData) {
        localStorage.setItem(
            'userCache',
            JSON.stringify({
                user: userData,
                timestamp: Date.now()
            })
        );
    } else {
        localStorage.removeItem('userCache');
    }
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => getCachedUser());
    const [loading, setLoading] = useState(() => !getCachedUser());

    // Logout function
    const logout = useCallback(() => {
        localStorage.removeItem('token');
        cacheUser(null);
        setUser(null);
    }, []);

    // Listen for expired JWT event from Axios interceptor
    useEffect(() => {
        const handleSessionExpired = () => {
            logout();
        };

        window.addEventListener(
            'auth:session-expired',
            handleSessionExpired
        );

        return () => {
            window.removeEventListener(
                'auth:session-expired',
                handleSessionExpired
            );
        };
    }, [logout]);

    // Check logged-in user
    useEffect(() => {
        const checkUserLoggedIn = async () => {
            const token = localStorage.getItem('token');

            if (token) {
                try {
                    const res = await api.get('/auth/me');

                    setUser(res.data);
                    cacheUser(res.data);

                } catch (error) {
                    // Clear authentication only for authentication failures
                    if (error.response?.status === 401) {
                        logout();
                    }
                    // Keep cached session if network/server error occurs
                }
            } else {
                cacheUser(null);
                setUser(null);
            }

            setLoading(false);
        };

        checkUserLoggedIn();
    }, [logout]);

    const getRolePath = (role) => {
        if (role === 'admin') return 'admin';
        if (role === 'instructor') return 'instructor';
        return 'student';
    };

    const login = async (email, password, role) => {
        const rolePath = getRolePath(role);

        const res = await api.post(
            `/auth/${rolePath}/login`,
            { email, password }
        );

        localStorage.setItem('token', res.data.token);
        cacheUser(res.data);
        setUser(res.data);

        return res.data;
    };

    const register = async (name, email, password, role = 'student') => {
        const rolePath = getRolePath(role);

        const res = await api.post(
            `/auth/${rolePath}/register`,
            { name, email, password }
        );

        localStorage.setItem('token', res.data.token);
        cacheUser(res.data);
        setUser(res.data);

        return res.data;
    };

    const googleLogin = async (code, role) => {
        const rolePath = getRolePath(role);

        const res = await api.post(
            `/auth/${rolePath}/google`,
            { code }
        );

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

    return (
        <AuthContext.Provider
            value={{
                user,
                setUser,
                loading,
                login,
                register,
                googleLogin,
                logout,
                updateProfile
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
