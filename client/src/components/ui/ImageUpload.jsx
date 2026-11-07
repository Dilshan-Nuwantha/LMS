import { useState } from 'react';
import { FaImage } from 'react-icons/fa';
import api from '../../api/axios';
import { showError } from '../../utils/toast';

const MAX_SIZE = 2 * 1024 * 1024;

const ImageUpload = ({ value, onChange, label = 'Choose an image' }) => {
    const [uploading, setUploading] = useState(false);

    const handleFile = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;

        if (file.size > MAX_SIZE) {
            showError('The image must be 2 MB or smaller');
            return;
        }

        const form = new FormData();
        form.append('image', file);

        setUploading(true);
        try {
            const res = await api.post('/uploads/image', form, { headers: { 'Content-Type': 'multipart/form-data' } });
            onChange(res.data.url);
        } catch (error) {
            showError(error, 'Failed to upload the image');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="flex items-center gap-4">
            {value && <img src={value} alt="" className="h-20 w-32 rounded-lg object-cover border border-slate-200 dark:border-slate-700" />}
            <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                <FaImage />
                {uploading ? 'Uploading...' : label}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={uploading} onChange={handleFile} />
            </label>
        </div>
    );
};

export default ImageUpload;
