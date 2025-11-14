// list.js

/**
 * =======================================================
 * YouTube API 모듈
 * =======================================================
 */
const YouTubeModule = (function() {
    // ⚠️ 사용자님의 YouTube Data API 키를 여기에 입력해주세요!
    const API_KEY = 'AIzaSyCGDl-2-k-LLr89YGfYDTb15Ed6J5yECJA'; 
    const API_URL = 'https://www.googleapis.com/youtube/v3/search';
    
    // 이모지 및 장르 데이터 (main.js와 일관성 유지를 위해 list.js에도 정의)
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


    // DOM 요소 캐시
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

    /**
     * @private
     * URL 쿼리 파라미터에서 선택된 키워드를 추출합니다.
     */
    const getQueryParameters = () => {
        const params = new URLSearchParams(window.location.search);
        selectedMood.keyword = params.get('keyword') || '';
        selectedMood.emojiKey = params.get('emoji') || '';
        selectedMood.genreKey = params.get('genre') || '';

        // 키워드 없이 접근한 경우 메인 페이지로 리디렉션
        if (!selectedMood.keyword) {
             window.location.href = 'main.html';
             return false;
        }
        return true;
    };

    /**
     * @private
     * 선택된 키워드를 동그란 칩 형태로 UI에 표시합니다.
     */
    const renderMoodChips = () => {
        const { emojiKey, genreKey } = selectedMood;
        
        // 이모지 칩 생성
        if (emojiKey && EMOJIS_MAP[emojiKey]) {
            const emojiData = EMOJIS_MAP[emojiKey];
            elements.keywordChips.innerHTML += `
                <div class="chip">
                    <span class="emoji-icon">${emojiData.emoji}</span>
                    <span>${emojiData.name}</span>
                </div>
            `;
        }

        // 장르 칩 생성
        if (genreKey && GENRES_MAP[genreKey]) {
            elements.keywordChips.innerHTML += `
                <div class="chip">
                    <span class="emoji-icon">🎧</span>
                    <span>${GENRES_MAP[genreKey]}</span>
                </div>
            `;
        }
    };

    /**
     * @private
     * YouTube API를 호출하여 영상을 검색합니다. (키워드 필터링 알고리즘)
     */
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

        // YouTube 검색 API 파라미터 구성
        const params = new URLSearchParams({
            part: 'snippet',
            q: query,
            type: 'video',
            videoDimension: '2d', // 2D 영상만
            maxResults: 12,      // 최대 12개 결과
            videoCategoryId: '10', // 음악 (Music) 카테고리 필터링
            key: API_KEY
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

    /**
     * @private
     * 검색 결과를 DOM에 렌더링합니다.
     */
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
            
            // 🚀 [핵심 수정 부분] 'play.html'로 이동하는 URL 생성
            // 선택된 영상 ID와 현재 감정/장르 키를 쿼리 파라미터로 전달합니다.
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
                    <button class="like-btn" data-video-id="${videoId}" data-title="${title}" data-thumbnail="${thumbnailUrl}">
                        <span class="material-icons">favorite_border</span>
                    </button>
                </div>
            `;
            elements.videoListContainer.innerHTML += cardHTML;
        });

        // 좋아요 버튼 이벤트 리스너 추가 (추후 구현)
        document.querySelectorAll('.like-btn').forEach(button => {
            button.addEventListener('click', handleLikeButtonClick);
        });
    };
    
    /**
     * @private
     * 좋아요 버튼 클릭 핸들러 (3번 기능 MyPlaylist 구현 시 연동)
     */
    const handleLikeButtonClick = (e) => {
        const button = e.currentTarget;
        const videoId = button.dataset.videoId;
        const title = button.dataset.title;
        const thumbnail = button.dataset.thumbnail;

        // 임시 로그인 체크 (실제로는 세션 확인 로직 필요)
        if (!sessionStorage.getItem('currentMoodUser')) {
            alert('로그인해야 MyList에 추가할 수 있습니다.');
            // window.location.href = 'main.html'; // 로그인 페이지로 이동
            return;
        }

        if (button.classList.contains('liked')) {
            button.classList.remove('liked');
            button.querySelector('.material-icons').textContent = 'favorite_border';
            console.log(`[MyList] ${title} (ID: ${videoId}) 좋아요 해제`);
            // TODO: 서버 API 호출: MyPlaylist에서 해당 영상 제거
        } else {
            button.classList.add('liked');
            button.querySelector('.material-icons').textContent = 'favorite';
            console.log(`[MyList] ${title} (ID: ${videoId}) 좋아요 추가`);
            // TODO: 서버 API 호출: MyPlaylist에 해당 영상 추가 (이모지, 장르 키도 함께)
        }
    };


    // 외부로 노출할 Public API
    const publicApi = {
        init: async () => {
            // 네비게이션 버튼을 '메인으로' 고정
            elements.navRight.innerHTML = `<button id="back-to-main" class="nav-button primary">메인으로</button>`;
            document.getElementById('back-to-main').addEventListener('click', () => {
                window.location.href = 'main.html';
            });
            
            // 쿼리 파라미터 추출 및 유효성 검사
            if (!getQueryParameters()) return; 

            // 선택된 키워드 UI 렌더링
            renderMoodChips();

            // 유튜브 영상 검색 및 리스트 렌더링
            const videoItems = await fetchVideos(selectedMood.keyword);
            renderVideoList(videoItems);
        }
    };

    return publicApi;

})();

// 애플리케이션 초기화
document.addEventListener('DOMContentLoaded', () => {
    YouTubeModule.init();
    console.log('List Page Loaded.');
});