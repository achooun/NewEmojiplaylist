/**
 * =======================================================
 * 1. 인증(로그인/회원가입) 모듈: AuthModule
 * (이전 코드와 동일, 생략)
 * =======================================================
 */
const AuthModule = (function() {
    const API_BASE_URL = 'http://localhost:3000/api';
    
    // DOM 요소 캐시 (AuthModule)
    const elements = {
        modal: document.getElementById('auth-modal'),
        authBtn: document.getElementById('auth-btn'), 
        closeBtn: document.querySelector('.close-btn'),
        loginContainer: document.getElementById('login-form-container'),
        registerContainer: document.getElementById('register-form-container'),
        loginForm: document.getElementById('login-form'),
        registerForm: document.getElementById('register-form'),
        showRegisterLink: document.getElementById('show-register'),
        showLoginLink: document.getElementById('show-login'),
        messageDisplay: document.getElementById('auth-message'),
        mainGreeting: document.getElementById('main-greeting'),
        navRight: document.querySelector('.nav-right')
    };

    let currentUser = null; 

    const displayMessage = (msg, isError = true) => {
        elements.messageDisplay.textContent = msg;
        elements.messageDisplay.style.color = isError ? 'crimson' : 'var(--primary-color)';
        setTimeout(() => {
            elements.messageDisplay.textContent = '';
        }, 3000);
    };

    /**
     * @private
     * UI를 현재 인증 상태에 맞게 업데이트합니다. (내비게이션 바 수정)
     */
    // main.js - AuthModule 내부의 updateUI 함수 (수정된 코드)

    const updateUI = () => {
        elements.navRight.innerHTML = '';
        
        // 🚀 [수정 핵심] elements.mainGreeting이 null인지 확인하는 조건문을 추가했습니다.
        if (currentUser) {
            
            // elements.mainGreeting이 존재할 때만 텍스트를 업데이트합니다.
            if (elements.mainGreeting) {
                elements.mainGreeting.textContent = `${currentUser.username}님, 오늘의 감정과 장르를 선택해 플레이리스트를 생성해 보세요.`;
            }

            // MyList 버튼 생성
            const myListBtn = document.createElement('button');
            myListBtn.id = 'my-list-btn';
            myListBtn.className = 'nav-button';
            myListBtn.textContent = 'MyList';
            myListBtn.addEventListener('click', () => { 
                // TODO: MyPlaylist 페이지로 이동 로직으로 변경
                window.location.href = 'myplaylist.html'; 
            });
            elements.navRight.appendChild(myListBtn);

            // 로그아웃 버튼 생성
            const logoutBtn = document.createElement('button');
            logoutBtn.id = 'logout-btn';
            logoutBtn.className = 'nav-button primary';
            logoutBtn.textContent = '로그아웃';
            logoutBtn.onclick = publicApi.logout;
            elements.navRight.appendChild(logoutBtn);
            
            if (window.SelectionModule) {
                SelectionModule.enableSelection();
            }

        } else {
            
            // elements.mainGreeting이 존재할 때만 텍스트를 업데이트합니다.
            if (elements.mainGreeting) {
                elements.mainGreeting.textContent = '로그인하고 이모지를 선택해 나만의 플레이리스트를 만드세요.';
            }
            
            // 로그인 버튼 생성
            const loginBtn = document.createElement('button');
            loginBtn.id = 'auth-btn';
            loginBtn.className = 'nav-button primary';
            loginBtn.textContent = '로그인';
            loginBtn.onclick = () => publicApi.openModal('login');
            elements.navRight.appendChild(loginBtn);

            if (window.SelectionModule) {
                SelectionModule.disableSelection();
            }
        }
    };
    
    // (handleRegister, handleLogin, showForm, setupEventListeners, checkSession 함수는 이전 코드와 동일)

    const handleRegister = async (e) => {
        e.preventDefault();
        const username = elements.registerForm.elements['register-username'].value.trim();
        const password = elements.registerForm.elements['register-password'].value;
        const confirmPassword = elements.registerForm.elements['register-confirm-password'].value;

        if (password !== confirmPassword) {
            displayMessage('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success) {
                elements.registerForm.reset();
                displayMessage(data.message, false);
                showForm('login');
            } else {
                displayMessage(data.message);
            }
        } catch (error) {
            console.error('회원가입 요청 실패:', error);
            displayMessage('서버 오류: 회원가입에 실패했습니다.');
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        const username = elements.loginForm.elements['login-username'].value.trim();
        const password = elements.loginForm.elements['login-password'].value;

        try {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success) {
                currentUser = data.user;
                sessionStorage.setItem('currentMoodUser', JSON.stringify({ username: data.user.username }));
                
                elements.loginForm.reset();
                publicApi.closeModal();
                updateUI();
            } else {
                displayMessage(data.message);
            }
        } catch (error) {
            console.error('로그인 요청 실패:', error);
            displayMessage('서버 오류: 로그인에 실패했습니다.');
        }
    };

    const showForm = (formType) => {
        if (formType === 'login') {
            elements.loginContainer.style.display = 'block';
            elements.registerContainer.style.display = 'none';
        } else {
            elements.loginContainer.style.display = 'none';
            elements.registerContainer.style.display = 'block';
        }
        elements.messageDisplay.textContent = ''; 
    };

    // main.js - AuthModule 내부

    /**
     * @private
     * 이벤트 리스너를 설정합니다. (Nav 버튼 이벤트는 updateUI가 전담)
     */
    const setupEventListeners = () => {
        
        // 닫기 버튼, 배경 클릭 리스너 (모달이 있는 페이지에서만 유효)
        if (elements.closeBtn) {
            elements.closeBtn.addEventListener('click', publicApi.closeModal);
        }
        if (elements.modal) {
            window.addEventListener('click', (e) => {
                if (e.target === elements.modal) {
                    publicApi.closeModal();
                }
            });
        }
        
        // 폼 관련 요소는 main.html의 모달에만 있으므로, 요소가 존재할 때만 리스너 등록
        if (elements.registerForm && elements.loginForm) {
            // 폼 전환 링크
            elements.showRegisterLink.addEventListener('click', (e) => { e.preventDefault(); showForm('register'); });
            elements.showLoginLink.addEventListener('click', (e) => { e.preventDefault(); showForm('login'); });

            // 폼 제출 핸들러
            elements.registerForm.addEventListener('submit', handleRegister);
            elements.loginForm.addEventListener('submit', handleLogin);
        }

        // Emotion diary 링크 (Nav 바에 항상 있으므로 유지)
        document.getElementById('emotion-diary-link').addEventListener('click', (e) => {
             e.preventDefault();
             // Nav 바가 모든 페이지에 있다고 가정
             if (currentUser || sessionStorage.getItem('currentMoodUser')) {
                 // TODO: emotion_diary.html로 이동
                window.location.href = 'EmotionDiary.html'; 
             } else {
                 alert('로그인이 필요합니다.');
                 // 로그인 버튼을 눌러 모달 열기 시도
                 if (publicApi.openModal) publicApi.openModal('login');
             }
        });
    };

    const checkSession = () => {
        const sessionUser = sessionStorage.getItem('currentMoodUser');
        if (sessionUser) {
            currentUser = JSON.parse(sessionUser);
        }
        updateUI();
    };

    const publicApi = {
        init: () => {
            publicApi.closeModal(); 
            setupEventListeners();
            checkSession();
        },
        openModal: (formType = 'login') => {
            showForm(formType);
            elements.modal.style.display = 'flex';
        },
        closeModal: () => {
        // [안정성 강화] elements.modal이 존재할 때만 style을 조작
        if (elements.modal) { 
            elements.modal.style.display = 'none';
        }
    },
        logout: () => {
            currentUser = null;
            sessionStorage.removeItem('currentMoodUser');
            updateUI();
            displayMessage('로그아웃되었습니다.', false);
        },
        getCurrentUser: () => currentUser
    };

    window.AuthModule = publicApi; 
    return publicApi;
})();


/**
 * =======================================================
 * 2. 이모지 및 장르 선택 모듈: SelectionModule
 * - 카드형 UI 선택 기능 구현
 * =======================================================
 */
const SelectionModule = (function() {
    const EMOJIS = [
        { key: 'happy', emoji: '😊', name: '행복' },
        { key: 'calm', emoji: '😌', name: '평온' },
        { key: 'sad', emoji: '😢', name: '슬픔' },
        { key: 'angry', emoji: '😡', name: '분노' },
        { key: 'excited', emoji: '🤩', name: '신남' },
        { key: 'tired', emoji: '😴', name: '피곤' },
    ];

    const GENRES = [
        { key: 'pop', name: 'POP' },
        { key: 'hiphop', name: 'Hip-Hop' },
        { key: 'rnb', name: 'R&B' },
        { key: 'ballad', name: '발라드' },
        { key: 'jazz', name: 'Jazz' },
        { key: 'edm', name: 'EDM' },
    ];
    
    let selectedEmoji = null;
    let selectedGenre = null;

    // 🚀 [수정 유지] DOM 요소 캐시 (main.html에서만 null이 아님)
    const elements = {
        emojiGrid: document.getElementById('emoji-grid'),
        genreGrid: document.getElementById('genre-grid'),
        createBtn: document.getElementById('create-playlist-btn'),
        selectedEmojiMsg: document.getElementById('selected-emoji-message'),
        selectedGenreMsg: document.getElementById('selected-genre-message'),
        emojiSection: document.getElementById('emoji-selection-section'),
        genreSection: document.getElementById('genre-selection-section')
    };
    
    /**
     * @private
     * 이모지/장르 카드를 생성하여 DOM에 추가합니다.
     */
    const renderCards = (data, container, type) => {
        // [안정성 강화] container가 null이 아닐 때만 렌더링
        if (!container) return; 
        
        container.innerHTML = data.map(item => `
            <div class="selection-card" data-key="${item.key}" data-name="${item.name}" data-type="${type}">
                <span class="emoji">${item.emoji || '🎧'}</span>
                <p>${item.name}</p>
            </div>
        `).join('');

        // 이벤트 리스너 추가
        container.querySelectorAll('.selection-card').forEach(card => {
            card.addEventListener('click', handleCardClick);
        });
    };
    
    // (handleCardClick, updateCreateButton, handleCreatePlaylist 함수는 이전과 동일하게 요소 접근 시 null 체크가 없어도
    //  renderCards와 init에서 container/createBtn이 null일 경우 실행되지 않도록 설정)
    
    /**
     * @private
     * 카드 클릭 이벤트 핸들러 (이전에 제공된 안정화 코드)
     */
    const handleCardClick = (e) => {
        // ... (기존 로직 유지)
        if (elements.createBtn.disabled && !AuthModule.getCurrentUser()) {
            AuthModule.openModal();
            return;
        }

        const card = e.currentTarget;
        const type = card.dataset.type;
        const key = card.dataset.key;
        const name = card.dataset.name; 

        let currentSelectionKey, grid, msgElement, dataArray;

        if (type === 'emoji') {
            currentSelectionKey = selectedEmoji;
            grid = elements.emojiGrid;
            msgElement = elements.selectedEmojiMsg;
            dataArray = EMOJIS;
        } else { // type === 'genre'
            currentSelectionKey = selectedGenre;
            grid = elements.genreGrid;
            msgElement = elements.selectedGenreMsg;
            dataArray = GENRES;
        }

        // 1. 선택 상태 업데이트
        if (currentSelectionKey === key) {
            currentSelectionKey = null;
        } else {
            currentSelectionKey = key;
        }
        
        // 2. DOM 클래스 업데이트 (UI)
        grid.querySelector('.selected')?.classList.remove('selected');
        if (currentSelectionKey !== null) {
            card.classList.add('selected');
        }

        // 3. 상태 저장 및 메시지 업데이트
        if (type === 'emoji') {
            selectedEmoji = currentSelectionKey;
        } else {
            selectedGenre = currentSelectionKey;
        }

        const selectedItemName = currentSelectionKey ? name : '없음';
        msgElement.textContent = `선택된 ${type === 'emoji' ? '감정' : '장르'}: ${selectedItemName}`;
        
        // 4. 생성 버튼 상태 업데이트
        updateCreateButton();
    };

    /**
     * @private
     * 플레이리스트 생성 버튼 상태를 업데이트합니다.
     */
    const updateCreateButton = () => {
        // [안정성 강화] elements.createBtn이 존재할 때만 실행
        if (!elements.createBtn) return;
        
        const isLoggedIn = AuthModule.getCurrentUser() !== null;
        
        if (selectedEmoji && selectedGenre && isLoggedIn) {
            elements.createBtn.disabled = false;
            elements.createBtn.textContent = '🚀 이모지 + 장르 플레이리스트 생성하기';
        } else {
            elements.createBtn.disabled = true;
            if (!isLoggedIn) {
                elements.createBtn.textContent = '로그인 후 플레이리스트를 생성할 수 있습니다';
            } else {
                 elements.createBtn.textContent = '🚀 이모지 + 장르 플레이리스트 생성하기';
            }
        }
    };
    
    const handleCreatePlaylist = () => { /* ... (이전 코드 유지) ... */ 
        if (!selectedEmoji || !selectedGenre) {
            alert('이모지와 장르를 모두 선택해주세요.');
            return;
        }
        
        const emojiData = EMOJIS.find(e => e.key === selectedEmoji);
        const genreData = GENRES.find(g => g.key === selectedGenre);

        const emojiName = emojiData ? emojiData.name : selectedEmoji;
        const genreName = genreData ? genreData.name : selectedGenre;
        
        const searchKeyword = `${emojiName} ${genreName} 노래`; 
        
        window.location.href = `list.html?keyword=${encodeURIComponent(searchKeyword)}&emoji=${selectedEmoji}&genre=${selectedGenre}`;
    };


    // 선택 기능 비활성화 (로그아웃 시)
    const disableSelection = () => {
        // 🚀 [수정 핵심] 요소가 모두 존재할 때만 style을 조작합니다.
        if (elements.createBtn && elements.emojiSection && elements.genreSection) {
            elements.createBtn.disabled = true;
            elements.emojiSection.style.opacity = '0.5';
            elements.genreSection.style.opacity = '0.5';
            elements.createBtn.textContent = '로그인 후 플레이리스트를 생성할 수 있습니다';
        }
    };

    // 선택 기능 활성화 (로그인 시)
    const enableSelection = () => {
        // 🚀 [수정 핵심] 요소가 모두 존재할 때만 style을 조작합니다.
        if (elements.createBtn && elements.emojiSection && elements.genreSection) {
            elements.emojiSection.style.opacity = '1';
            elements.genreSection.style.opacity = '1';
            elements.createBtn.textContent = '🚀 이모지 + 장르 플레이리스트 생성하기'; 
            updateCreateButton(); 
        }
    };


    const publicApi = {
        init: () => {
            // [안정성 강화] 요소가 존재할 때만 renderCards 호출
            if (elements.emojiGrid && elements.genreGrid && elements.createBtn) {
                renderCards(EMOJIS, elements.emojiGrid, 'emoji');
                renderCards(GENRES, elements.genreGrid, 'genre');
                elements.createBtn.addEventListener('click', handleCreatePlaylist);
            }
            
            // 로그인 상태에 따라 활성화/비활성화 로직 실행 (enable/disable 내부에서 null 체크)
            if (!AuthModule.getCurrentUser()) {
                disableSelection();
            }
        },
        disableSelection: disableSelection,
        enableSelection: enableSelection
    };

    window.SelectionModule = publicApi; 
    return publicApi;

})();


// 전체 애플리케이션 초기화
document.addEventListener('DOMContentLoaded', () => {
    AuthModule.init();
    SelectionModule.init();
    console.log('App Loaded. All modules initialized.');
});