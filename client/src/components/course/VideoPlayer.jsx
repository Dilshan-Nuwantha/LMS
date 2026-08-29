import React from 'react';
import ReactPlayer from 'react-player';
import { FaPlayCircle } from 'react-icons/fa';

const VideoPlayer = ({ url, onProgress, onDuration, onEnded }) => {
    // Helper to determine player type
    const getPlayerType = (url) => {
        if (!url) return 'none';
        if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
        if (url.includes('drive.google.com')) return 'google-drive';
        if (url.includes('t.me')) return 'telegram';
        return 'react-player';
    };

    const type = getPlayerType(url);

    if (type === 'none') {
        return (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900 text-slate-500 flex-col">
                <span className="text-6xl mb-4">📚</span>
                <span className="font-medium">No Video Resource</span>
            </div>
        );
    }

    // Wrapper to add the external link button
    const PlayerWrapper = ({ children }) => (
        <div className="relative w-full h-full group">
            {children}
            <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-black/70 hover:bg-black text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 backdrop-blur-sm transition-all"
                >
                    <FaPlayCircle /> Open Original Link
                </a>
            </div>
        </div>
    );

    if (type === 'telegram') {
        return (
            <PlayerWrapper>
                <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center relative">
                    <div className="text-center p-6 z-10">
                        <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-full flex items-center justify-center text-white text-3xl mx-auto mb-4 shadow-lg shadow-indigo-500/30">
                            <FaPlayCircle />
                        </div>
                        <h3 className="text-white font-bold text-lg mb-2">Telegram Video</h3>
                        <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">
                            This content is hosted on Telegram. If it doesn't play automatically, please open it directly.
                        </p>
                        <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white px-6 py-2.5 rounded-lg font-medium transition-all shadow-lg shadow-indigo-500/30"
                        >
                            View on Telegram
                        </a>
                    </div>
                </div>
            </PlayerWrapper>
        );
    }

    if (type === 'google-drive') {
        // Convert view/sharing link to preview for embedding
        // e.g., https://drive.google.com/file/d/VIDEO_ID/view?usp=sharing
        // to    https://drive.google.com/file/d/VIDEO_ID/preview
        let embedUrl = url;
        if (url.includes('/view')) {
            embedUrl = url.replace('/view', '/preview');
        } else if (!url.includes('/preview')) {
            // If it doesn't have view or preview, it might be a folder or strange link.
            // Try appending preview if it looks like a file link
            embedUrl = `${url}/preview`;
        }

        return (
            <PlayerWrapper>
                <iframe
                    src={embedUrl}
                    className="w-full h-full"
                    frameBorder="0"
                    allowFullScreen
                    title="Google Drive Video"
                ></iframe>
            </PlayerWrapper>
        );
    }

    // YouTube: Use ReactPlayer with clean embed config
    if (type === 'youtube') {
        return (
            <PlayerWrapper>
                <div className="relative w-full h-full bg-black flex items-center justify-center">
                    <ReactPlayer
                        url={url}
                        width="100%"
                        height="100%"
                        controls={true}
                        playing={false}
                        onProgress={onProgress}
                        onDuration={onDuration}
                        onEnded={onEnded}
                        onError={(e) => console.log('ReactPlayer Error:', e)}
                        config={{
                            youtube: {
                                playerVars: {
                                    rel: 0,
                                    modestbranding: 1,
                                    iv_load_policy: 3,
                                    fs: 1,
                                    cc_load_policy: 0,
                                    origin: window.location.origin,
                                },
                            },
                        }}
                    />
                </div>
            </PlayerWrapper>
        );
    }

    // Default: Use ReactPlayer (Handles Direct Files, SoundCloud, Twitch, etc.)
    return (
        <PlayerWrapper>
            <div className="relative w-full h-full bg-black flex items-center justify-center">
                <ReactPlayer
                    url={url}
                    width="100%"
                    height="100%"
                    controls={true}
                    playing={false}
                    onProgress={onProgress}
                    onDuration={onDuration}
                    onEnded={onEnded}
                    onError={(e) => console.log('ReactPlayer Error:', e)}
                />
            </div>
        </PlayerWrapper>
    );
};

export default VideoPlayer;
