const YouTubeModule = (function() {
    const API_KEY = 'AIzaSyCGDl-2-k-LLr89YGfYDTb15Ed6J5yECJA'; 
    const API_URL = 'https://www.googleapis.com/youtube/v3/search';

    const RANDOM_REGIONS = ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'JP', 'BR', 'KR'];
    
    const EMOJIS_MAP = {
        'happy': { emoji: '😊', name: '행복' },
        'calm': { emoji: '😌', name: '평온' },
        'sad': { emoji: '😢', name: '슬픔' },
        'angry': { emoji: '😡', name: '분노' },
        'excited': { emoji: '🤩', name: '신남' },
        'tired': { emoji: '😴', name: '피곤' },
    };

    const GENRES_MAP = {
        'pop': 'POP', 'hiphop': 'Hip-Hop', 'rnb': 'R&B', 
        'ballad': '발라드', 'jazz': 'Jazz', 'edm': 'EDM'
    };


    const elements = {
        keywordChips: document.querySelector('.keyword-chips'),
        listHeader: document.getElementById('list-header'),
        videoListContainer: document.getElementById('video-list-container'),
        loadingIndicator: document.getElementById('loading-indicator'),
        errorMessage: document.getElementById('error-message'),
        navRight: document.querySelector('.nav-right')
    };

    let selectedMood = {
        keyword: '',
        emojiKey: '',
        genreKey: ''
    };

    const getQueryParameters = () => {
        const params = new URLSearchParams(window.location.search);
        selectedMood.keyword = params.get('keyword') || '';
        selectedMood.emojiKey = params.get('emoji') || '';
        selectedMood.genreKey = params.get('genre') || '';

        if (!selectedMood.keyword) {
             window.location.href = 'main.html';
             return false;
        }
        return true;
    };

    const renderMoodChips = () => {
        const { emojiKey, genreKey } = selectedMood;
        
        if (emojiKey && EMOJIS_MAP[emojiKey]) {
            const emojiData = EMOJIS_MAP[emojiKey];
            elements.keywordChips.innerHTML += `
                <div class="chip">
                    <span class="emoji-icon">${emojiData.emoji}</span>
                    <span>${emojiData.name}</span>
                </div>
            `;
        }

        if (genreKey && GENRES_MAP[genreKey]) {
            elements.keywordChips.innerHTML += `
                <div class="chip">
                    <span class="emoji-icon">🎧</span>
                    <span>${GENRES_MAP[genreKey]}</span>
                </div>
            `;
        }
    };

    const getRandomRegion = () => {
        const randomIndex = Math.floor(Math.random() * RANDOM_REGIONS.length);
        return RANDOM_REGIONS[randomIndex];
    };
    
    const getRandomOrder = () => {
        const orders = ['relevance', 'rating', 'viewCount', 'date'];
        const randomIndex = Math.floor(Math.random() * orders.length);
        return orders[randomIndex];
    };

    const fetchVideos = async (query) => {
        elements.loadingIndicator.style.display = 'block';
        elements.videoListContainer.innerHTML = '';
        elements.errorMessage.style.display = 'none';

        if (!API_KEY || API_KEY === 'YOUR_YOUTUBE_API_KEY') {
            elements.loadingIndicator.style.display = 'none';
            elements.errorMessage.textContent = 'API 키가 설정되지 않았습니다. list.js 파일의 API_KEY를 수정해주세요.';
            elements.errorMessage.style.display = 'block';
            return [];
        }

        const randomRegion = getRandomRegion();
        const randomOrder = getRandomOrder();
        console.log(`[YouTube API] Searching with region: ${randomRegion}, order: ${randomOrder}`);

        const params = new URLSearchParams({
            part: 'snippet',
            q: query,
            type: 'video',
            videoDimension: '2d', 
            maxResults: 12,      
            videoCategoryId: '10', 
            key: API_KEY,
            order: randomOrder,
            regionCode: randomRegion
        });

        try {
            const response = await fetch(`${API_URL}?${params.toString()}`);
            const data = await response.json();

            elements.loadingIndicator.style.display = 'none';

            if (data.error) {
                throw new Error(data.error.message || 'YouTube API 오류 발생');
            }
            
            return data.items;

        } catch (error) {
            elements.loadingIndicator.style.display = 'none';
            elements.errorMessage.textContent = `영상을 불러오는 데 실패했습니다: ${error.message}`;
            elements.errorMessage.style.display = 'block';
            console.error('YouTube API Fetch Error:', error);
            return [];
        }
    };

const renderVideoList = (items) => {
        elements.listHeader.textContent = `"${selectedMood.keyword}" 플레이리스트 결과 (${items.length}개)`;

        if (items.length === 0) {
            elements.videoListContainer.innerHTML = '<p class="loading">검색 결과가 없습니다. 다른 키워드를 선택해 보세요.</p>';
            return;
        }

        items.forEach(item => {
            const videoId = item.id.videoId;
            const title = item.snippet.title;
            const channelTitle = item.snippet.channelTitle;
            const thumbnailUrl = item.snippet.thumbnails.high.url;
            const playUrl = `play.html?videoId=${videoId}&emoji=${selectedMood.emojiKey}&genre=${selectedMood.genreKey}`;

            const cardHTML = `
                <div class="video-card" data-video-id="${videoId}">
                    <a href="${playUrl}" title="${title} 재생하기"> 
                        <div class="thumbnail-area">
                            <img src="${thumbnailUrl}" alt="${title} 썸네일">
                        </div>
                        <div class="video-info">
                            <h3>${title}</h3>
                            <p>${channelTitle}</p>
                        </div>
                    </a>
                </div>
            `;
            elements.videoListContainer.innerHTML += cardHTML;
        });

    };
    

    const publicApi = {
        init: async () => {
            
            if (!getQueryParameters()) return; 

            renderMoodChips();

            const videoItems = await fetchVideos(selectedMood.keyword);
            renderVideoList(videoItems);
        }
    };

    return publicApi;

})();

document.addEventListener('DOMContentLoaded', () => {
    YouTubeModule.init();
});