// myplaylist.js

const MyPlaylistModule = (function() {
    const API_BASE_URL = 'http://localhost:3000/api';

    // 이모지 및 장르 데이터 (표시용)
    const EMOJIS_MAP = { 'happy': '😊 행복', 'calm': '😌 평온', 'sad': '😢 슬픔', 'angry': '😡 분노', 'excited': '🤩 신남', 'tired': '😴 피곤' };
    const GENRES_MAP = { 'pop': 'POP', 'hiphop': 'Hip-Hop', 'rnb': 'R&B', 'ballad': '발라드', 'jazz': 'Jazz', 'edm': 'EDM' };

    const elements = {
        greeting: document.getElementById('user-greeting'),
        container: document.getElementById('playlist-container'),
        loadingMsg: document.getElementById('loading-message')
    };
    
    // (main.js의 AuthModule이 window.AuthModule로 로드되어 있다고 가정)
    const getAuthHeader = () => {
        const user = window.AuthModule && window.AuthModule.getCurrentUser();
        // 헤더에 사용자 이름을 담아 보냅니다. (서버의 authenticateUser 미들웨어와 연동)
        return user ? user.username : null; 
    };

    /**
     * @private
     * 플레이리스트 데이터를 백엔드에서 가져옵니다.
     */
    const fetchPlaylist = async () => {
        const username = getAuthHeader();
        
        if (!username) {
            elements.loadingMsg.textContent = '로그인이 필요합니다. 메인 페이지로 이동하여 로그인해주세요.';
            // TODO: AuthModule과 연동하여 로그인 모달 띄우기
            return [];
        }
        
        elements.greeting.textContent = `${username}님의 My Playlist`;

        try {
            const response = await fetch(`${API_BASE_URL}/playlist`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': username // 사용자 이름 헤더 전송
                }
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || '플레이리스트 로딩 실패');
            }

            return data.playlist;

        } catch (error) {
            elements.loadingMsg.textContent = `플레이리스트를 불러오는 데 실패했습니다: ${error.message}`;
            console.error('MyPlaylist Fetch Error:', error);
            return [];
        }
    };

    /**
     * @private
     * 플레이리스트 리스트를 렌더링합니다.
     */
    const renderPlaylist = (playlist) => {
        elements.container.innerHTML = ''; // 기존 로딩 메시지 제거

        if (playlist.length === 0) {
            elements.container.innerHTML = '<p class="loading-message">아직 좋아요를 누른 영상이 없습니다. 메인 페이지에서 찾아보세요!</p>';
            return;
        }

        playlist.reverse().forEach(item => { // 최신 추가 영상이 위에 오도록 역순 정렬
            const emojiTag = EMOJIS_MAP[item.emojiKey] || '감정 없음';
            const genreTag = GENRES_MAP[item.genreKey] || '장르 없음';
            
            // 영상 재생 URL (play.html로 이동)
            const playUrl = `play.html?videoId=${item.videoId}&emoji=${item.emojiKey}&genre=${item.genreKey}`;

            const cardHTML = `
                <div class="playlist-card-wrapper">
                    <a href="${playUrl}" class="playlist-card">
                        <div class="card-thumbnail">
                            <img src="${item.thumbnail}" alt="${item.title} 썸네일">
                        </div>
                        <div class="card-info">
                            <div class="info-text">
                                <h3>${item.title}</h3>
                                <p>채널: ${item.channelTitle || '정보 없음'}</p>
                                <div class="mood-tags">
                                    <span class="mood-tag">${emojiTag}</span>
                                    <span class="mood-tag">${genreTag}</span>
                                </div>
                            </div>
                        </div>
                    </a>
                    <button class="share-button" data-video-id="${item.videoId}" data-emoji="${item.emojiKey}" data-genre="${item.genreKey}">
                        감정 공유하기
                    </button>
                </div>
            `;
            elements.container.innerHTML += cardHTML;
        });

        // 감정 공유하기 버튼 이벤트 리스너 추가
        document.querySelectorAll('.share-button').forEach(button => {
            button.addEventListener('click', handleShareButtonClick);
        });
    };
    
    /**
     * @private
     * 감정 공유하기 버튼 클릭 핸들러 (4번 커뮤니티 기능 연동)
     */
    const handleShareButtonClick = (e) => {
        const button = e.currentTarget;
        const videoId = button.dataset.videoId;
        const emoji = button.dataset.emoji;
        const genre = button.dataset.genre;
        
        // TODO: 4번 기능 구현 시 커뮤니티 페이지로 이동 및 데이터 전달
        alert(`커뮤니티(Emotion Diary)로 이동합니다.\n공유할 영상 ID: ${videoId}, 감정: ${emoji}, 장르: ${genre} (미구현)`);
    };

    const publicApi = {
        init: async () => {
            // MyPlaylist 페이지 진입 시 로그인 체크
            if (!window.AuthModule || !window.AuthModule.getCurrentUser()) {
                alert('My Playlist에 접근하려면 로그인이 필요합니다.');
                window.location.href = 'main.html';
                return;
            }

            const playlist = await fetchPlaylist();
            renderPlaylist(playlist);
        }
    };

    return publicApi;
})();

// DOMContentLoaded는 main.js에서 AuthModule 초기화 후 실행되는 것을 기대합니다.
// myplaylist.html의 <script> 태그 순서를 확인하세요.
document.addEventListener('DOMContentLoaded', () => {
    // main.js의 AuthModule이 초기화된 후에 MyPlaylistModule을 초기화
    setTimeout(() => { 
        MyPlaylistModule.init(); 
    }, 100); // 아주 짧은 딜레이로 AuthModule 로드를 확보
    console.log('MyPlaylist Page Loaded.');
});