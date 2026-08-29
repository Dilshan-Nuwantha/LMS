import axios from 'axios';
import { showError } from '../utils/toast';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to inject the token
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

// Add a response interceptor to handle common errors globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;

        if (status === 429) {
            showError('Too many requests. Please slow down.');
            error.handled = true;
        } else if (status === 401) {
            const msg = error.response?.data?.message || '';
            if (msg.includes('expired') || msg.includes('Not authorized')) {
                showError('Your session has expired. Please log in again.');
                error.handled = true;
            }
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