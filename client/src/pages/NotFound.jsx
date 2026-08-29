import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
    const [eyePosition, setEyePosition] = useState({ x: 0, y: 0 });
    const containerRef = useRef(null);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;

                // Calculate angle and distance from center
                const deltaX = e.clientX - centerX;
                const deltaY = e.clientY - centerY;

                // Limit the movement of the pupil (max 30px)
                const maxMove = 30;
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                const clampedDistance = Math.min(distance, maxMove * 3);
                const angle = Math.atan2(deltaY, deltaX);

                const moveX = (clampedDistance / 3) * Math.cos(angle);
                const moveY = (clampedDistance / 3) * Math.sin(angle);

                setEyePosition({ x: moveX, y: moveY });
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <div
            ref={containerRef}
            className="min-h-screen bg-rose-50 dark:bg-slate-950 flex flex-col items-center justify-center px-4 transition-colors duration-300"
        >
            {/* Eyes Container */}
            <div className="flex items-center gap-6 sm:gap-10 mb-12 sm:mb-16">
                {/* Left Eye */}
                <div className="w-32 h-32 sm:w-48 sm:h-48 lg:w-56 lg:h-56 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-xl relative overflow-hidden">
                    <div
                        className="w-14 h-14 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-slate-900 dark:bg-white rounded-full transition-transform duration-75 ease-out"
                        style={{
                            transform: `translate(${eyePosition.x}px, ${eyePosition.y}px)`
                        }}
                    />
                </div>

                {/* Right Eye */}
                <div className="w-32 h-32 sm:w-48 sm:h-48 lg:w-56 lg:h-56 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-xl relative overflow-hidden">
                    <div
                        className="w-14 h-14 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-slate-900 dark:bg-white rounded-full transition-transform duration-75 ease-out"
                        style={{
                            transform: `translate(${eyePosition.x}px, ${eyePosition.y}px)`
                        }}
                    />
                </div>
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light text-slate-900 dark:text-white mb-8 text-center tracking-tight">
                404, Page Not Found.
            </h1>

            {/* Action Button */}
            <Link
                to="/"
                className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-3.5 rounded-full font-medium hover:opacity-90 transition-all text-sm sm:text-base"
            >
                Please Take Me Home
            </Link>
        </div>
    );
};

export default NotFound;
