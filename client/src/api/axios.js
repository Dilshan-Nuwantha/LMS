
import axios from 'axios';
import { showError } from '../utils/toast';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// Prevent multiple expiration redirects
let isRedirecting = false;

// Response interceptor
api.interceptors.response.use(
    (response) => {
        // An HTML page here means VITE_API_URL points at the website instead of the API
        const type = String(response.headers?.['content-type'] || '');
        if (type.includes('text/html')) {
            showError('Unable to reach the server. Please try again later.');
            const error = new Error(`Expected JSON from ${response.config?.url} but received an HTML page. Check VITE_API_URL.`);
            error.response = response;
            error.handled = true;
            return Promise.reject(error);
        }
        return response;
    },

    (error) => {
        const status = error.response?.status;
        const errorCode = error.response?.data?.code;

        if (status === 429) {
            showError('Too many requests. Please slow down.');
            error.handled = true;

        } else if (status === 401 && errorCode === 'TokenExpired') {

            if (
                !isRedirecting &&
                window.location.pathname !== '/login'
            ) {
                isRedirecting = true;

                showError('Your session has expired. Please log in again.');

                // Notify AuthContext to clear user and token
                window.dispatchEvent(
                    new Event('auth:session-expired')
                );

                // Redirect to login
                window.location.replace('/login');
            }

            error.handled = true;

        } else if (status === 401) {
            // Other authentication errors
            // Do not automatically log out for every 401 response.
            error.handled = false;

        } else if (status >= 500) {
            showError('Something went wrong on our end. Please try again.');
            error.handled = true;

        } else if (!error.response && error.message === 'Network Error') {
            showError('Unable to reach the server. Check your internet connection.');
            error.handled = true;
        }

        return Promise.reject(error);
    }
);

export default api;
