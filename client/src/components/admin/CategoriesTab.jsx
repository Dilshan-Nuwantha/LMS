import { useState, useEffect } from 'react';
import { FaPlus, FaTrash } from 'react-icons/fa';
import api from '../../api/axios';
import { showSuccess, showError } from '../../utils/toast';

const CategoriesTab = () => {
    const [categories, setCategories] = useState([]);
    const [name, setName] = useState('');

    const fetchCategories = async () => {
        try {
            const res = await api.get('/categories');
            setCategories(res.data);
        } catch (error) {
            showError(error, 'Failed to load categories');
        }
    };

    useEffect(() => { fetchCategories(); }, []);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        try {
            await api.post('/categories', { name });
            setName('');
            showSuccess('Category added');
            fetchCategories();
        } catch (error) {
            showError(error, 'Failed to add the category');
        }
    };

    const handleDelete = async (category) => {
        if (!window.confirm(`Delete "${category.name}"? Courses using it keep their category.`)) return;

        try {
            await api.delete(`/categories/${category._id}`);
            showSuccess('Category deleted');
            fetchCategories();
        } catch (error) {
            showError(error, 'Failed to delete the category');
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
            <form onSubmit={handleAdd} className="flex gap-2 mb-5 max-w-md">
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={50}
                    placeholder="New category name"
                    className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                />
                <button type="submit" className="px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold inline-flex items-center gap-2">
                    <FaPlus /> Add
                </button>
            </form>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {categories.map(category => (
                    <li key={category._id} className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-sm text-slate-700 dark:text-slate-200">
                        {category.name}
                        <button type="button" onClick={() => handleDelete(category)} title="Delete" className="text-danger">
                            <FaTrash className="text-xs" />
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default CategoriesTab;
