const YouTubeModule = (function() {
    const API_KEY = 'AIzaSyCGDl-2-k-LLr89YGfYDTb15Ed6J5yECJA'; 
    const VIDEO_API_URL = 'https://www.googleapis.com/youtube/v3/videos';
    const SEARCH_API_URL = 'https://www.googleapis.com/youtube/v3/search';


    const EMOJIS_MAP = { 'happy': { emoji: '😊', name: '행복' }, 'calm': { emoji: '😌', name: '평온' }, 'sad': { emoji: '😢', name: '슬픔' }, 'angry': { emoji: '😡', name: '분노' }, 'excited': { emoji: '🤩', name: '신남' }, 'tired': { emoji: '😴', name: '피곤' } };
    const GENRES_MAP = { 'pop': 'POP', 'hiphop': 'Hip-Hop', 'rnb': 'R&B', 'ballad': '발라드', 'jazz': 'Jazz', 'edm': 'EDM' };

    let currentVideoId = null;
    let currentMood = { emoji: null, genre: null };
    let player = null; 
    let videoData = null; 

    const elements = {
        title: document.getElementById('video-title'),
        channel: document.getElementById('channel-title'),
        likeBtn: document.getElementById('like-btn'),

        hashtagList: document.getElementById('hashtag-list'),
        contextChips: document.getElementById('context-chips'),
        recommendationList: document.getElementById('recommendation-list'),
        navRight: document.querySelector('.nav-right')
    };

    const getQueryParameters = () => {
        const params = new URLSearchParams(window.location.search);
        currentVideoId = params.get('videoId');
        currentMood.emoji = params.get('emoji');
        currentMood.genre = params.get('genre');

        if (!currentVideoId) {
            alert('재생할 영상 정보가 없습니다. 메인 페이지로 돌아갑니다.');
            window.location.href = 'main.html';
            return false;
        }
        return true;
    };

    const renderMoodChips = () => {
        const { emoji, genre } = currentMood;
        elements.contextChips.innerHTML = ''; 

        if (emoji && EMOJIS_MAP[emoji]) {
            const emojiData = EMOJIS_MAP[emoji];
            elements.contextChips.innerHTML += `
                <div class="chip">
                    <span class="emoji-icon">${emojiData.emoji}</span>
                    <span>${emojiData.name}</span>
                </div>
            `;
        }
        if (genre && GENRES_MAP[genre]) {
            elements.contextChips.innerHTML += `
                <div class="chip">
                    <span class="emoji-icon">🎧</span>
                    <span>${GENRES_MAP[genre]}</span>
                </div>
            `;
        }
    };

    const initYouTubePlayer = () => {
        window.onYouTubeIframeAPIReady = function() {
            player = new YT.Player('player', { 
                videoId: currentVideoId,
                playerVars: {
                    'autoplay': 1,
                    'modestbranding': 1,
                    'rel': 0 
                },
                events: {
                    'onReady': onPlayerReady
                }
            });
            document.getElementById('player').style.backgroundColor = 'black'; 
        };
    };

    const onPlayerReady = (event) => {
        event.target.playVideo();
    };


    const fetchVideoDetails = async (videoId) => {
        try {
            const params = new URLSearchParams({
                part: 'snippet,statistics',
                id: videoId,
                key: API_KEY
            });
            const response = await fetch(`${VIDEO_API_URL}?${params.toString()}`);
            const data = await response.json();

            if (data.items && data.items.length > 0) {
                videoData = data.items[0];
                const snippet = videoData.snippet;
                
                elements.title.textContent = snippet.title;
                elements.channel.textContent = `채널: ${snippet.channelTitle}`;
                
                renderHashtags(snippet.tags || []); 

                return videoData;
            }
            throw new Error('영상을 찾을 수 없습니다.');
        } catch (error) {
            elements.title.textContent = '영상을 불러오는 데 실패했습니다.';
            console.error('Video Details Fetch Error:', error);
            return null;
        }
    };
    
    const renderHashtags = (tags) => {
        elements.hashtagList.innerHTML = '';
        if (tags && tags.length > 0) {
            tags.slice(0, 5).forEach(tag => { 
                elements.hashtagList.innerHTML += `<span class="hashtag">#${tag}</span>`;
            });
        } else {
            elements.hashtagList.innerHTML = '<span class="hashtag">#태그_정보_없음</span>';
        }
    };

    const handleLikeButtonClick = async () => { 
        let user = window.AuthModule ? window.AuthModule.getCurrentUser() : null;
        if (!user) {
            const sessionUser = sessionStorage.getItem('currentMoodUser');
            if (sessionUser) {
                user = JSON.parse(sessionUser);
            }
        }
        
        const videoDetails = videoData ? videoData.snippet : {}; 

        if (!user || !currentVideoId || !videoDetails.title) {
            alert('로그인해야 MyList에 추가할 수 있습니다.');
            return;
        }

        elements.likeBtn.disabled = true;

        const bodyData = {
            videoId: currentVideoId,
            title: videoDetails.title,
            thumbnail: videoDetails.thumbnails?.high?.url, 
            emojiKey: currentMood.emoji, 
            genreKey: currentMood.genre,
            channelTitle: videoDetails.channelTitle
        };

        try {
            const response = await fetch(`/api/playlist/toggle`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': user.username 
                },
                body: JSON.stringify(bodyData)
            });
            const data = await response.json();

            if (!data.success) {
                alert(`MyList 처리 실패: ${data.message}`);
                return;
            }

            const icon = elements.likeBtn.querySelector('.material-icons');
            const text = elements.likeBtn.querySelector('span:last-child');
            
            if (data.isAdded) {
                elements.likeBtn.classList.add('liked');
                icon.textContent = 'favorite';
                text.textContent = 'MyList에 저장됨';
                alert('MyList에 영상이 추가되었습니다! 💖');
            } else {
                elements.likeBtn.classList.remove('liked');
                icon.textContent = 'favorite_border';
                text.textContent = 'MyList에 추가';
                alert('MyList에서 영상이 제거되었습니다.');
            }

        } catch (error) {
            console.error('MyList API 통신 오류:', error);
            alert('서버와 통신하는 데 문제가 발생했습니다.');
        } finally {
            elements.likeBtn.disabled = false;
        }
    };

    const fetchRecommendations = async () => {
        const query = `${GENRES_MAP[currentMood.genre]} 인기곡`;
        
        try {
            const params = new URLSearchParams({
                part: 'snippet',
                q: query,
                type: 'video',
                maxResults: 5,
                videoCategoryId: '10',
                key: API_KEY
            });
            const response = await fetch(`${SEARCH_API_URL}?${params.toString()}`);
            const data = await response.json();
            
            const items = data.items.filter(item => item.id.videoId !== currentVideoId);

            renderRecommendations(items.slice(0, 4)); 

        } catch (error) {
            console.error('Recommendation Fetch Error:', error);
            elements.recommendationList.innerHTML = '<p class="error-msg">추천 영상을 불러오는 데 실패했습니다.</p>';
        }
    };
    
    const renderRecommendations = (items) => {
        elements.recommendationList.innerHTML = '';
        if (items.length === 0) {
            elements.recommendationList.innerHTML = '<p>관련 추천 영상이 없습니다.</p>';
            return;
        }

        items.forEach(item => {
            const videoId = item.id.videoId;
            const title = item.snippet.title;
            const channelTitle = item.snippet.channelTitle;
            const thumbnailUrl = item.snippet.thumbnails.default.url; 

            const url = `play.html?videoId=${videoId}&emoji=${currentMood.emoji}&genre=${currentMood.genre}`;

            elements.recommendationList.innerHTML += `
                <a href="${url}" class="recommendation-item">
                    <div class="rec-thumb">
                        <img src="${thumbnailUrl}" alt="${title} 썸네일">
                    </div>
                    <div class="rec-info">
                        <h4>${title}</h4>
                        <p>${channelTitle}</p>
                    </div>
                </a>
            `;
        });
    };




    const publicApi = {
        init: async () => {
            if (!getQueryParameters()) return;
            
            elements.likeBtn.addEventListener('click', handleLikeButtonClick);
            
            renderMoodChips();

            initYouTubePlayer();

            await fetchVideoDetails(currentVideoId);
            
            const myPlaylist = await fetchMyPlaylist();
            if (myPlaylist) {
                updateLikeButtonStatus(myPlaylist, currentVideoId);
            }

            await fetchRecommendations();
        }
    };

    const fetchMyPlaylist = async () => {
        const sessionUser = sessionStorage.getItem('currentMoodUser');
        if (!sessionUser) return null;
        
        const user = JSON.parse(sessionUser);
        const username = user.username;

        try {
            const response = await fetch(`/api/playlist`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': username
                }
            });
            const data = await response.json();
            return data.success ? data.playlist : null;
        } catch (error) {
            console.error('MyPlaylist Fetch Error:', error);
            return null;
        }
    };

    const updateLikeButtonStatus = (playlist, videoId) => {
        const isLiked = playlist.some(item => item.videoId === videoId);
        if (isLiked) {
            elements.likeBtn.classList.add('liked');
            elements.likeBtn.querySelector('.material-icons').textContent = 'favorite';
            elements.likeBtn.querySelector('span:last-child').textContent = 'MyList에 저장됨';
        }
    };

    return publicApi;

})();

document.addEventListener('DOMContentLoaded', () => {
    if (window.AuthModule) {
        window.AuthModule.init(); 
    }
    YouTubeModule.init();
});