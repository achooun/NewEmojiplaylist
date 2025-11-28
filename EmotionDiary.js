// emotion_diary.js

document.addEventListener('DOMContentLoaded', () => {
    
    // 공유할 영상 정보
    let sharedVideo = {
        videoId: null, title: null, thumbnail: null, emojiKey: null, genreKey: null, channelTitle: null
    };

    // DOM 요소 캐시
    const elements = {
        postForm: document.getElementById('post-form'),
        videoCard: document.getElementById('shared-video-card'),
        diaryContent: document.getElementById('diary-content'),
        submitBtn: document.getElementById('submit-post-btn'),
        postsContainer: document.getElementById('posts-container'),
        creationArea: document.querySelector('.post-creation-area'),
        loadingMsg: document.getElementById('loading-posts'),
        main: document.querySelector('main')
    };

    // 이모지 맵 (표시용)
    const EMOJIS_MAP = { 'happy': '😊 행복', 'calm': '😌 평온', 'sad': '😢 슬픔', 'angry': '😡 분노', 'excited': '🤩 신남', 'tired': '😴 피곤' };

    /**
     * @private
     * 인증 모듈에서 현재 사용자 가져오기 (헬퍼 함수)
     */
    const getCurrentUser = () => {
        if (window.AuthModule && typeof window.AuthModule.getCurrentUser === 'function') {
            return window.AuthModule.getCurrentUser();
        }
        // AuthModule이 아직 로드되지 않았거나 세션 스토리지를 직접 확인해야 할 경우
        const sessionUser = sessionStorage.getItem('currentMoodUser');
        return sessionUser ? JSON.parse(sessionUser) : null;
    };

    /**
     * @private
     * URL 파라미터에서 공유할 영상 정보를 가져옵니다.
     */
    const loadSharedVideoInfo = () => {
        const urlParams = new URLSearchParams(window.location.search);
        
        sharedVideo.videoId = urlParams.get('videoId');
        sharedVideo.title = urlParams.get('title');
        sharedVideo.thumbnail = urlParams.get('thumbnail');
        sharedVideo.emojiKey = urlParams.get('emoji');
        sharedVideo.genreKey = urlParams.get('genre');
        sharedVideo.channelTitle = urlParams.get('channelTitle');

        if (!sharedVideo.videoId) {
            if (elements.creationArea) {
                elements.creationArea.style.display = 'none'; 
            }
            const header = document.querySelector('.community-header h1');
            if (header) {
                header.textContent = '익명 커뮤니티 게시판';
            }
            return;
        }
        
        renderSharedVideoCard();
    };

    /**
     * @private
     * 공유할 영상 정보 카드를 렌더링합니다.
     */
    const renderSharedVideoCard = () => {
        if (!sharedVideo.videoId) {
            elements.videoCard.innerHTML = `<p id="video-info-message">공유할 영상 정보가 없습니다.</p>`;
            return;
        }

        const emojiName = EMOJIS_MAP[sharedVideo.emojiKey] || sharedVideo.emojiKey;
        const genreName = sharedVideo.genreKey || '장르';

        elements.videoCard.innerHTML = `
            <div class="card-thumbnail">
                <img src="${sharedVideo.thumbnail || 'https://placehold.co/150x84/cccccc/333333?text=No+Thumb'}" alt="${sharedVideo.title} 썸네일">
            </div>
            <div class="card-details">
                <h3>${sharedVideo.title || '제목 없음'}</h3>
                <p>채널: ${sharedVideo.channelTitle || '미확인'}</p>
                <div class="card-tags">
                    <span class="tag-chip tag-emoji">${emojiName}</span>
                    <span class="tag-chip tag-genre">${genreName}</span>
                </div>
            </div>
        `;
        elements.diaryContent.disabled = false;
        elements.submitBtn.disabled = false;
    };
    
    /**
     * @private
     * 게시글 리스트를 렌더링합니다.
     */
    const renderPosts = (posts) => {
        elements.postsContainer.innerHTML = '';
        if (!posts || posts.length === 0) {
            elements.postsContainer.innerHTML = `<p id="loading-posts">아직 작성된 감정 공유 글이 없습니다.</p>`;
            return;
        }

        posts.forEach(post => {
            const date = new Date(post.timestamp).toLocaleDateString('ko-KR');
            const emojiTag = EMOJIS_MAP[post.emojiKey] || post.emojiKey;
            
            const postHTML = `
                <div class="post-history-card">
                    <div class="post-video-summary">
                        <div class="card-thumbnail">
                            <img src="${post.thumbnail}" alt="공유 영상 썸네일">
                        </div>
                        <div class="post-video-details">
                            <h4>${post.title}</h4>
                            <p>채널: ${post.channelTitle || '정보 없음'}</p>
                            <div class="card-tags">
                                <span class="tag-chip tag-emoji">${emojiTag}</span>
                                <span class="tag-chip tag-genre">${post.genreKey}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="post-content-area">
                        <p>${post.content}</p>
                    </div>
                    
                    <div class="post-meta-footer">
                        <span>작성자: ${post.author || '익명'}</span>
                        <span>기록 시점: ${date}</span>
                    </div>
                </div>
            `;
            elements.postsContainer.innerHTML += postHTML;
        });
    };

    /**
     * @private
     * 서버에서 게시글 목록을 불러옵니다. (✨ 수정됨: 인증 헤더 추가)
     */
    const fetchPosts = async () => {
        elements.loadingMsg.textContent = '게시글을 불러오는 중...';
        elements.loadingMsg.style.display = 'block';
        
        // 현재 로그인한 사용자 정보 가져오기
        const currentUser = getCurrentUser();
        
        // 헤더 설정: 로그인했다면 Authorization 헤더 추가
        const headers = { 'Content-Type': 'application/json' };
        if (currentUser && currentUser.username) {
            headers['Authorization'] = currentUser.username;
        }

        try {
            const response = await fetch(`/api/community/posts`, {
                method: 'GET',
                headers: headers // ✨ 중요: 헤더 전달
            });
            
            if (response.status === 403 || response.status === 401) {
                throw new Error('권한이 없습니다. 로그인해주세요.');
            }

            const data = await response.json();

            if (data.success) {
                renderPosts(data.posts);
            } else {
                elements.postsContainer.innerHTML = `<p>게시글 로드 실패: ${data.message}</p>`;
            }
        } catch (error) {
            console.error('게시글 로드 오류:', error);
            elements.postsContainer.innerHTML = `<p>${error.message || '서버와 통신하는 데 문제가 발생했습니다.'}</p>`;
        } finally {
            elements.loadingMsg.style.display = 'none';
        }
    };
    
    /**
     * @private
     * 새 게시글을 서버에 제출합니다.
     */
    const handleSubmitPost = async (e) => {
        e.preventDefault();
        
        const currentUser = getCurrentUser();

        if (!currentUser) {
            alert('로그인 후 감상을 공유할 수 있습니다.');
            if (window.AuthModule) window.AuthModule.openModal();
            return;
        }
        if (!sharedVideo.videoId) {
            alert('공유할 영상 정보가 없습니다.');
            return;
        }

        const content = elements.diaryContent.value.trim();
        if (content.length < 5) {
            alert('감상을 5자 이상 작성해주세요.');
            return;
        }

        elements.submitBtn.disabled = true;
        elements.submitBtn.textContent = '공유 중...';

        const postData = {
            ...sharedVideo,
            content: content
        };

        try {
            const response = await fetch(`/api/community/post`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': currentUser.username // 사용자 이름 전송
                },
                body: JSON.stringify(postData)
            });

            const data = await response.json();

            if (data.success) {
                alert(`감상이 성공적으로 공유되었습니다!`);
                elements.diaryContent.value = ''; 
                fetchPosts(); 
            } else {
                alert(`공유 실패: ${data.message}`);
            }
        } catch (error) {
            console.error('게시글 작성 오류:', error);
            alert('서버 오류: 감상 공유에 실패했습니다.');
        } finally {
            elements.submitBtn.disabled = false;
            elements.submitBtn.textContent = '감상 기록 및 공유';
        }
    };
    
    // 초기화 및 이벤트 리스너 설정
    if (elements.postForm) {
        elements.postForm.addEventListener('submit', handleSubmitPost);
    }

    // 1. 공유할 영상 정보 로드
    loadSharedVideoInfo();
    
    // 2. 게시글 목록 불러오기
    fetchPosts();
});