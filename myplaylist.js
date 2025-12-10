const MyPlaylistModule = (function() {

    const EMOJIS_MAP = { 'happy': '😊 행복', 'calm': '😌 평온', 'sad': '😢 슬픔', 'angry': '😡 분노', 'excited': '🤩 신남', 'tired': '😴 피곤' };
    const GENRES_MAP = { 'pop': 'POP', 'hiphop': 'Hip-Hop', 'rnb': 'R&B', 'ballad': '발라드', 'jazz': 'Jazz', 'edm': 'EDM' };

    const elements = {
        greeting: document.getElementById('user-greeting'),
        container: document.getElementById('playlist-container'),
        loadingMsg: document.getElementById('loading-message')
    };
    
    const getAuthHeader = () => {
        const sessionUser = sessionStorage.getItem('currentMoodUser');
        if (sessionUser) {
            const user = JSON.parse(sessionUser);
            return user.username; 
        }
        return null;
    };

    const fetchPlaylist = async () => {
        const username = getAuthHeader();
        
        if (!username) {
            elements.loadingMsg.textContent = '로그인이 필요합니다. 메인 페이지로 이동하여 로그인해주세요.';
            return [];
        }
        
        elements.greeting.textContent = `${username}님의 My Playlist`;

        try {
            const response = await fetch(`/api/playlist`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': username 
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

    const renderPlaylist = (playlist) => {
        elements.container.innerHTML = ''; 

        if (playlist.length === 0) {
            elements.container.innerHTML = '<p class="loading-message">아직 좋아요를 누른 영상이 없습니다. 메인 페이지에서 찾아보세요!</p>';
            return;
        }

        playlist.reverse().forEach(item => { 
            const emojiTag = EMOJIS_MAP[item.emojiKey] || '감정 없음';
            const genreTag = GENRES_MAP[item.genreKey] || '장르 없음';
            
            const playUrl = `play.html?videoId=${item.videoId}&emoji=${item.emojiKey}&genre=${item.genreKey}`;
            
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
                    <div class="playlist-actions">
                        <button class="share-button" 
                                data-video-id="${item.videoId}" 
                                data-emoji="${item.emojiKey}" 
                                data-genre="${item.genreKey}"
                                data-title="${encodedTitle}"
                                data-thumbnail="${encodedThumbnail}"
                                data-channel-title="${encodedChannelTitle}">
                            감정 공유하기
                        </button>
                        <button class="delete-button" data-video-id="${item.videoId}">삭제</button>
                    </div>
                </div>
            `;
            elements.container.innerHTML += cardHTML;
        });

        document.querySelectorAll('.share-button').forEach(button => {
            button.addEventListener('click', handleShareButtonClick);
        });

        document.querySelectorAll('.delete-button').forEach(button => {
            button.addEventListener('click', handleDeleteButtonClick);
        });
    };
    
    const handleShareButtonClick = (e) => {
        const button = e.currentTarget;
        
        const videoId = button.dataset.videoId;
        const emoji = button.dataset.emoji;
        const genre = button.dataset.genre;
        
        const title = decodeURIComponent(button.dataset.title);
        const thumbnail = decodeURIComponent(button.dataset.thumbnail);
        const channelTitle = decodeURIComponent(button.dataset.channelTitle);
        
        const url = `EmotionDiary.html?videoId=${videoId}` +
                    `&emoji=${emoji}` +
                    `&genre=${genre}` +
                    `&title=${encodeURIComponent(title)}` +
                    `&thumbnail=${encodeURIComponent(thumbnail)}` +
                    `&channelTitle=${encodeURIComponent(channelTitle)}`;
        
        window.location.href = url;
    };

    const handleDeleteButtonClick = async (e) => {
        const button = e.currentTarget;
        const videoIdToDelete = button.dataset.videoId;

        if (!confirm('정말로 이 영상을 플레이리스트에서 삭제하시겠습니까?')) {
            return;
        }

        const username = getAuthHeader();
        if (!username) {
            alert('로그인이 필요합니다.');
            window.location.href = 'main.html';
            return;
        }

        try {
            const response = await fetch(`/api/playlist/delete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': username
                },
                body: JSON.stringify({ videoId: videoIdToDelete })
            });

            const data = await response.json();

            if (data.success) {
                alert('영상이 플레이리스트에서 삭제되었습니다.');
                
                const updatedPlaylist = await fetchPlaylist();
                renderPlaylist(updatedPlaylist);
            } else {
                alert(`삭제 실패: ${data.message}`);
            }
        } catch (error) {
            console.error('플레이리스트 삭제 API 통신 오류:', error);
            alert('서버와 통신하는 데 문제가 발생했습니다.');
        }
    };

    const publicApi = {
        init: async () => {
            
            const username = getAuthHeader(); 

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
});