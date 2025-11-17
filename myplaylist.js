// myplaylist.js (수정된 전체 코드)

const MyPlaylistModule = (function() {
    //const API_BASE_URL = 'http://localhost:3000/api';

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
        const sessionUser = sessionStorage.getItem('currentMoodUser');
        if (sessionUser) {
            const user = JSON.parse(sessionUser);
            // 헤더에 사용자 이름을 담아 보냅니다. (서버의 authenticateUser 미들웨어와 연동)
            return user.username; 
        }
        return null;
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
            const response = await fetch(`/api/playlist`, {
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
            
            // 🚀 [수정 핵심 1] 버튼에 필요한 모든 데이터를 인코딩하여 data 속성으로 추가
            const encodedTitle = encodeURIComponent(item.title);
            const encodedThumbnail = encodeURIComponent(item.thumbnail);
            const encodedChannelTitle = encodeURIComponent(item.channelTitle || '미확인');


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
                    <button class="share-button" 
                            data-video-id="${item.videoId}" 
                            data-emoji="${item.emojiKey}" 
                            data-genre="${item.genreKey}"
                            data-title="${encodedTitle}"
                            data-thumbnail="${encodedThumbnail}"
                            data-channel-title="${encodedChannelTitle}">
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
     * 감정 공유하기 버튼 클릭 핸들러 (emotion_diary.html로 이동)
     */
    const handleShareButtonClick = (e) => {
        const button = e.currentTarget;
        
        const videoId = button.dataset.videoId;
        const emoji = button.dataset.emoji;
        const genre = button.dataset.genre;
        
        // 🚀 [수정 핵심 2] 인코딩된 제목, 썸네일, 채널명 데이터를 가져와 디코딩합니다.
        const title = decodeURIComponent(button.dataset.title);
        const thumbnail = decodeURIComponent(button.dataset.thumbnail);
        const channelTitle = decodeURIComponent(button.dataset.channelTitle);
        
        // 쿼리 파라미터에 모든 정보를 담아 emotion_diary.html로 이동
        const url = `EmotionDiary.html?videoId=${videoId}` +
                    `&emoji=${emoji}` +
                    `&genre=${genre}` +
                    `&title=${encodeURIComponent(title)}` +
                    `&thumbnail=${encodeURIComponent(thumbnail)}` +
                    `&channelTitle=${encodeURIComponent(channelTitle)}`;
        
        window.location.href = url;
    };

    const publicApi = {
        init: async () => {
            // 💡 [수정] 바로 사용자 이름 확인을 시도합니다.
            const username = getAuthHeader(); // 수정된 함수 호출

            if (!username) {
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


document.addEventListener('DOMContentLoaded', () => {
    MyPlaylistModule.init(); 
    console.log('MyPlaylist Page Loaded.');
});