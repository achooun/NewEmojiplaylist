const AuthModule = (function() {
    const elements = {
        modal: document.getElementById('auth-modal'),
        closeBtn: document.querySelector('.close-btn'),
        loginContainer: document.getElementById('login-form-container'),
        registerContainer: document.getElementById('register-form-container'),
        loginForm: document.getElementById('login-form'),
        registerForm: document.getElementById('register-form'),
        showRegisterLink: document.getElementById('show-register'),
        showLoginLink: document.getElementById('show-login'),
        messageDisplay: document.getElementById('auth-message'),
        mainGreeting: document.getElementById('main-greeting'),
        authButtons: document.getElementById('auth-buttons-container')
    };

    let currentUser = null; 

    const displayMessage = (msg, isError = true) => {
        elements.messageDisplay.textContent = msg;
        elements.messageDisplay.style.color = isError ? '#EF4444' : 'var(--primary-color)';
        setTimeout(() => {
            elements.messageDisplay.textContent = '';
        }, 3000);
    };

    const updateUI = () => {
        if (!elements.authButtons) return;
        elements.authButtons.innerHTML = '';
        
        if (currentUser) {
            if (elements.mainGreeting) {
                elements.mainGreeting.textContent = `${currentUser.username}님, 오늘의 감정과 장르를 선택해 플레이리스트를 생성해 보세요.`;
            }

            const commonBtnClass = 'nav-button';
            elements.authButtons.innerHTML = `
                <button id="logout-btn" class="${commonBtnClass} primary">로그아웃</button>
            `;

            document.getElementById('logout-btn').addEventListener('click', publicApi.logout);
            
            if (window.SelectionModule) SelectionModule.enableSelection();

        } else {
            if (elements.mainGreeting) {
                elements.mainGreeting.textContent = '로그인하고 이모지를 선택해 나만의 플레이리스트를 만드세요.';
            }
            
            
            if (window.location.pathname.endsWith('main.html') || window.location.pathname.endsWith('/')) {
                elements.authButtons.innerHTML = `<button id="auth-btn" class="nav-button primary">로그인</button>`;
                document.getElementById('auth-btn').addEventListener('click', () => publicApi.openModal('login'));
            }

            if (window.SelectionModule) SelectionModule.disableSelection();
        }
    };

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
            const response = await fetch(`/api/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();
            if (data.success) {
                displayMessage(data.message, false);
                showForm('login');
            } else {
                displayMessage(data.message);
            }
        } catch (error) {
            displayMessage('서버 오류: 회원가입에 실패했습니다.');
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        const username = elements.loginForm.elements['login-username'].value.trim();
        const password = elements.loginForm.elements['login-password'].value;

        try {
            const response = await fetch(`/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();
            if (data.success) {
                currentUser = data.user;
                sessionStorage.setItem('currentMoodUser', JSON.stringify({ username: data.user.username }));
                publicApi.closeModal();
                updateUI();
            } else {
                displayMessage(data.message);
            }
        } catch (error) {
            displayMessage('서버 오류: 로그인에 실패했습니다.');
        }
    };

    const showForm = (formType) => {
        elements.loginContainer.style.display = formType === 'login' ? 'block' : 'none';
        elements.registerContainer.style.display = formType === 'register' ? 'block' : 'none';
        elements.messageDisplay.textContent = ''; 
    };

    const setupEventListeners = () => {
        if (elements.modal) {
            elements.closeBtn.addEventListener('click', publicApi.closeModal);
            window.addEventListener('click', (e) => {
                if (e.target === elements.modal) publicApi.closeModal();
            });
        }
        
        if (elements.registerForm && elements.loginForm) {
            elements.showRegisterLink.addEventListener('click', (e) => { e.preventDefault(); showForm('register'); });
            elements.showLoginLink.addEventListener('click', (e) => { e.preventDefault(); showForm('login'); });
            elements.registerForm.addEventListener('submit', handleRegister);
            elements.loginForm.addEventListener('submit', handleLogin);
        }

        document.getElementById('emotion-diary-link')?.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentUser || sessionStorage.getItem('currentMoodUser')) {
                window.location.href = 'EmotionDiary.html'; 
            } else {
                alert('로그인이 필요합니다.');
                publicApi.openModal('login');
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
            if (elements.modal) publicApi.closeModal(); 
            setupEventListeners();
            checkSession();
        },
        openModal: (formType = 'login') => {
            if (elements.modal) {
                showForm(formType);
                elements.modal.style.display = 'flex';
            }
        },
        closeModal: () => {
            if (elements.modal) elements.modal.style.display = 'none';
        },
        logout: () => {
            currentUser = null;
            sessionStorage.removeItem('currentMoodUser');
            updateUI();
        },
        getCurrentUser: () => currentUser
    };

    return publicApi;
})();

const VisualPanelModule = (function() {
    const elements = {
        emojiDisplay: document.querySelector('.emoji-display'),
        genreDisplay: document.querySelector('.genre-display'),
        visualText: document.querySelector('.visual-text'),
    };

    const state = {
        mood: { emoji: '✨', name: null },
        genre: { icon: '🎧', name: null }
    };

    const defaultText = '오늘의 감정을 선택해 주세요';

    const _render = () => {
        if (!elements.emojiDisplay || !elements.visualText || !elements.genreDisplay) return;

        const allElements = [elements.emojiDisplay, elements.visualText, elements.genreDisplay];
        allElements.forEach(el => el.style.opacity = '0');

        setTimeout(() => {
            elements.emojiDisplay.textContent = state.mood.emoji;

            if (state.genre.name) {
                elements.genreDisplay.textContent = state.genre.icon;
                elements.genreDisplay.classList.add('visible');
            } else {
                elements.genreDisplay.classList.remove('visible');
            }

            let newText = defaultText;
            const moodName = state.mood.name;
            const genreName = state.genre.name;

            if (moodName && genreName) {
                newText = `${moodName} & ${genreName}`;
            } else if (moodName) {
                newText = moodName;
            } else if (genreName) {
                newText = genreName;
            }
            elements.visualText.textContent = newText;
            
            allElements.forEach(el => el.style.opacity = '1');
            if(!state.genre.name) elements.genreDisplay.style.opacity = '0';

        }, 200);
    };

    const setMood = (emoji, name) => {
        state.mood.emoji = emoji || '✨';
        state.mood.name = name;
        _render();
    };

    const setGenre = (name, icon) => {
        state.genre.name = name;
        state.genre.icon = icon || '🎧';
        _render();
    };

    return {
        setMood,
        setGenre
    };
})();


const SelectionModule = (function() {
    const EMOJIS = [
        { key: 'happy', emoji: '😊', name: '행복' }, { key: 'calm', emoji: '😌', name: '평온' },
        { key: 'sad', emoji: '😢', name: '슬픔' }, { key: 'angry', emoji: '😡', name: '분노' },
        { key: 'excited', emoji: '🤩', name: '신남' }, { key: 'tired', emoji: '😴', name: '피곤' },
    ];
    const GENRES = [
        { key: 'pop', name: 'POP', icon: '🎤' }, 
        { key: 'hiphop', name: 'Hip-Hop', icon: '🎶' }, 
        { key: 'rnb', name: 'R&B', icon: '🎵' },
        { key: 'ballad', name: '발라드', icon: '🎼' }, 
        { key: 'jazz', name: 'Jazz', icon: '🎷' }, 
        { key: 'edm', name: 'EDM', icon: '🎧' },
    ];
    
    let selectedEmoji = null;
    let selectedGenre = null;

    const elements = {
        emojiGrid: document.getElementById('emoji-grid'),
        genreGrid: document.getElementById('genre-grid'),
        createBtn: document.getElementById('create-playlist-btn'),
        selectedEmojiMsg: document.getElementById('selected-emoji-message'),
        selectedGenreMsg: document.getElementById('selected-genre-message'),
        emojiSection: document.getElementById('emoji-selection-section'),
        genreSection: document.getElementById('genre-selection-section')
    };
    
    const renderCards = (data, container, type) => {
        if (!container) return; 
        container.innerHTML = data.map(item => `
            <div class="selection-card" 
                data-key="${item.key}" 
                data-name="${item.name}" 
                data-type="${type}"
                data-icon="${item.icon || item.emoji}">
                <span class="emoji">${item.emoji || item.icon}</span>
                <p>${item.name}</p>
            </div>`).join('');
        container.querySelectorAll('.selection-card').forEach(card => card.addEventListener('click', handleCardClick));
    };
    
    const handleCardClick = (e) => {
        if (elements.createBtn.disabled && !AuthModule.getCurrentUser()) {
            AuthModule.openModal();
            return;
        }

        const card = e.currentTarget;
        const { type, key, name, icon } = card.dataset;

        let currentSelection, grid, msgElement;
        
        if (type === 'emoji') {
            currentSelection = selectedEmoji;
            grid = elements.emojiGrid;
            msgElement = elements.selectedEmojiMsg;
        } else {
            currentSelection = selectedGenre;
            grid = elements.genreGrid;
            msgElement = elements.selectedGenreMsg;
        }

        const isDeselecting = currentSelection === key;
        const newSelection = isDeselecting ? null : key;
        const newName = isDeselecting ? null : name;
        const newIcon = isDeselecting ? null : icon;

        grid.querySelector('.selected')?.classList.remove('selected');
        if (!isDeselecting) {
            card.classList.add('selected');
        }

        if (type === 'emoji') {
            selectedEmoji = newSelection;
            VisualPanelModule.setMood(newIcon, newName);
        } else {
            selectedGenre = newSelection;
            VisualPanelModule.setGenre(newName, newIcon);
        }
        
        msgElement.textContent = `선택된 ${type === 'emoji' ? '감정' : '장르'}: ${newName || '없음'}`; 
        updateCreateButton();
    };

    const updateCreateButton = () => {
        if (!elements.createBtn) return;
        const isLoggedIn = AuthModule.getCurrentUser() !== null;
        const canCreate = selectedEmoji && selectedGenre && isLoggedIn;
        
        elements.createBtn.disabled = !canCreate;
        if (!isLoggedIn) {
            elements.createBtn.textContent = '로그인 후 플레이리스트를 생성할 수 있습니다';
        } else {
            elements.createBtn.textContent = '🚀 이모지 + 장르 플레이리스트 생성하기';
        }
    };
    
    const handleCreatePlaylist = () => { 
        if (!selectedEmoji || !selectedGenre) return;
        
        const currentUser = AuthModule.getCurrentUser();
        if (currentUser && currentUser.username) {
            fetch('/api/history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': currentUser.username },
                body: JSON.stringify({ emotion: selectedEmoji, genre: selectedGenre })
            }).catch(error => console.error('기록 저장 실패:', error));
        }

        const searchKeyword = `${EMOJIS.find(e=>e.key === selectedEmoji).name} ${GENRES.find(g=>g.key===selectedGenre).name} 노래`; 
        window.location.href = `list.html?keyword=${encodeURIComponent(searchKeyword)}&emoji=${selectedEmoji}&genre=${selectedGenre}`;
    };

    const publicApi = {
        init: () => {
            if (elements.emojiGrid && elements.genreGrid) {
                renderCards(EMOJIS, elements.emojiGrid, 'emoji');
                renderCards(GENRES, elements.genreGrid, 'genre');
            }
            if (elements.createBtn) {
                elements.createBtn.addEventListener('click', handleCreatePlaylist);
            }
            publicApi.disableSelection();
        },
        disableSelection: () => {
            if (elements.emojiSection) {
                elements.emojiSection.style.opacity = '0.5';
                elements.genreSection.style.opacity = '0.5';
            }
            updateCreateButton();
        },
        enableSelection: () => {
            if (elements.emojiSection) {
                elements.emojiSection.style.opacity = '1';
                elements.genreSection.style.opacity = '1';
            }
            updateCreateButton();
        }
    };

    return publicApi;
})();


document.addEventListener('DOMContentLoaded', () => {
    AuthModule.init();
    SelectionModule.init();
});