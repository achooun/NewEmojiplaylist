// play.js (전체 코드)

const YouTubeModule = (function() {
    // ⚠️ API 키를 main.js와 동일하게 설정 (보안상 백엔드에서 처리 권장)
    const API_KEY = 'AIzaSyCGDl-2-k-LLr89YGfYDTb15Ed6J5yECJA'; 
    const VIDEO_API_URL = 'https://www.googleapis.com/youtube/v3/videos';
    const SEARCH_API_URL = 'https://www.googleapis.com/youtube/v3/search';

    const API_BASE_URL = 'http://localhost:3000/api';

    // 이모지 및 장르 데이터 (일관성 유지를 위해 재정의)
    const EMOJIS_MAP = { 'happy': { emoji: '😊', name: '행복' }, 'calm': { emoji: '😌', name: '평온' }, 'sad': { emoji: '😢', name: '슬픔' }, 'angry': { emoji: '😡', name: '분노' }, 'excited': { emoji: '🤩', name: '신남' }, 'tired': { emoji: '😴', name: '피곤' } };
    const GENRES_MAP = { 'pop': 'POP', 'hiphop': 'Hip-Hop', 'rnb': 'R&B', 'ballad': '발라드', 'jazz': 'Jazz', 'edm': 'EDM' };

    let currentVideoId = null;
    let currentMood = { emoji: null, genre: null };
    let player = null; // YouTube Iframe Player 객체
    let videoData = null; // 현재 재생 중인 영상 상세 정보

    const elements = {
        title: document.getElementById('video-title'),
        channel: document.getElementById('channel-title'),
        likeBtn: document.getElementById('like-btn'),
        diaryBtn: document.getElementById('diary-btn'),
        hashtagList: document.getElementById('hashtag-list'),
        contextChips: document.getElementById('context-chips'),
        recommendationList: document.getElementById('recommendation-list'),
        navRight: document.querySelector('.nav-right')
    };

    /**
     * @private
     * URL 쿼리 파라미터에서 정보 추출 및 유효성 검사
     */
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

    /**
     * @private
     * 🎯 선택된 감정/장르 칩을 UI에 표시합니다.
     */
    const renderMoodChips = () => {
        const { emoji, genre } = currentMood;
        elements.contextChips.innerHTML = ''; // 초기화

        // 이모지 칩
        if (emoji && EMOJIS_MAP[emoji]) {
            const emojiData = EMOJIS_MAP[emoji];
            elements.contextChips.innerHTML += `
                <div class="chip">
                    <span class="emoji-icon">${emojiData.emoji}</span>
                    <span>${emojiData.name}</span>
                </div>
            `;
        }
        // 장르 칩
        if (genre && GENRES_MAP[genre]) {
            elements.contextChips.innerHTML += `
                <div class="chip">
                    <span class="emoji-icon">🎧</span>
                    <span>${GENRES_MAP[genre]}</span>
                </div>
            `;
        }
    };

    /**
     * @private
     * YouTube Player Iframe을 초기화합니다.
     * 🚀 [수정] YT.Player의 첫 번째 인자를 'player-iframe'에서 'player'로 변경했습니다.
     */
    const initYouTubePlayer = () => {
        // 이 함수는 YouTube API 스크립트가 로드된 후 onYouTubeIframeAPIReady 전역 함수를 통해 호출됩니다.
        window.onYouTubeIframeAPIReady = function() {
            // 🚀 [수정] ID를 'player'로 변경
            player = new YT.Player('player', { 
                videoId: currentVideoId,
                playerVars: {
                    'autoplay': 1,
                    'modestbranding': 1,
                    'rel': 0 // 관련 영상 표시 안 함
                },
                events: {
                    'onReady': onPlayerReady
                }
            });
            // 로딩 플레이스홀더를 숨기기 위해 컨테이너에 스타일 적용 (CSS에서 처리할 수도 있음)
            document.getElementById('player').style.backgroundColor = 'black'; 
        };
    };

    const onPlayerReady = (event) => {
        event.target.playVideo();
    };


    /**
     * @private
     * 영상 상세 정보 (제목, 채널, 태그)를 가져옵니다.
     */
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
                
                // UI 업데이트
                elements.title.textContent = snippet.title;
                elements.channel.textContent = `채널: ${snippet.channelTitle}`;
                
                // 해시태그 렌더링
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
    
    /**
     * @private
     * 영상의 해시태그를 렌더링합니다.
     */
    const renderHashtags = (tags) => {
        elements.hashtagList.innerHTML = '';
        if (tags && tags.length > 0) {
            tags.slice(0, 5).forEach(tag => { // 최대 5개만 표시
                elements.hashtagList.innerHTML += `<span class="hashtag">#${tag}</span>`;
            });
        } else {
            elements.hashtagList.innerHTML = '<span class="hashtag">#태그_정보_없음</span>';
        }
    };

   /**
     * @private
     * 좋아요 버튼 클릭 핸들러: MyList에 영상을 추가/제거하고 서버와 통신합니다.
     */
    const handleLikeButtonClick = async () => { 
        // 1. 사전 검증 및 데이터 준비
        const user = window.AuthModule ? window.AuthModule.getCurrentUser() : null; 
        
        // videoData는 fetchVideoDetails 함수에서 가져온 전역 변수여야 합니다.
        const videoDetails = videoData ? videoData.snippet : {}; 

        if (!user || !currentVideoId || !videoDetails.title) {
            alert('로그인해야 MyList에 추가할 수 있으며, 영상 정보가 필요합니다.');
            if (!user && window.AuthModule) window.AuthModule.openModal();
            return;
        }

        // 로딩 상태 표시
        elements.likeBtn.disabled = true;

        const bodyData = {
            videoId: currentVideoId,
            title: videoDetails.title,
            // 썸네일 정보는 list.html에서 전달된 값이 없다면 high.url을 사용합니다.
            thumbnail: videoDetails.thumbnails?.high?.url, 
            emojiKey: currentMood.emoji, // 현재 선택된 감정/장르 (URL 파라미터에서 가져온 값)
            genreKey: currentMood.genre,
            channelTitle: videoDetails.channelTitle
        };

        // 2. 서버 통신 (MyPlaylist 토글 API)
        try {
            const response = await fetch(`${API_BASE_URL}/playlist/toggle`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': user.username // 📌 [핵심] 인증을 위한 사용자 이름 헤더 전송
                },
                body: JSON.stringify(bodyData)
            });
            const data = await response.json();

            if (!data.success) {
                alert(`MyList 처리 실패: ${data.message}`);
                return;
            }

            // 3. UI 업데이트
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

    /**
     * @private
     * 💡 관련 영상 추천 리스트를 가져와 렌더링합니다. (현재 장르 키워드 사용)
     */
    const fetchRecommendations = async () => {
        // 현재 영상과 같은 장르 + 인기 영상 키워드로 검색
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
            
            // 현재 재생 중인 영상을 추천 리스트에서 제외
            const items = data.items.filter(item => item.id.videoId !== currentVideoId);

            renderRecommendations(items.slice(0, 4)); // 최대 4개만 표시

        } catch (error) {
            console.error('Recommendation Fetch Error:', error);
            elements.recommendationList.innerHTML = '<p class="error-msg">추천 영상을 불러오는 데 실패했습니다.</p>';
        }
    };
    
    /**
     * @private
     * 추천 영상을 렌더링합니다.
     */
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
            const thumbnailUrl = item.snippet.thumbnails.default.url; // 작은 썸네일 사용

            // URL을 play.html로 설정하여 클릭 시 새 영상 재생 페이지로 이동
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
            
            elements.diaryBtn.addEventListener('click', () => {
                alert(`Emotion Diary 페이지에서 현재 감정(${EMOJIS_MAP[currentMood.emoji].name})과 함께 일기를 작성할 수 있습니다. (미구현)`);
            });

            // 1. 선택된 키워드 표시
            renderMoodChips();

            // 2. YouTube 플레이어 준비
            initYouTubePlayer(); // ⚠️ onYouTubeIframeAPIReady는 여기서 설정만 하고, YouTube API 스크립트 로드 완료 시 자동으로 호출됨.

            // 3. 영상 상세 정보 및 해시태그 로드 (플레이어 로드와 병렬 진행)
            await fetchVideoDetails(currentVideoId);
            
            // 4. 추천 영상 리스트 로드
            await fetchRecommendations();
            
            console.log('Play Page Loaded.');
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