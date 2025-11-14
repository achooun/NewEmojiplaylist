// server.js (수정된 전체 코드)

const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const USERS_FILE = path.join(__dirname, 'users.json');

// 미들웨어 설정
app.use(bodyParser.json());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});
app.use(express.static(path.join(__dirname, '.')));


/**
 * =======================================================
 * 사용자 데이터 관리 함수
 * =======================================================
 */

const getUsers = () => {
    try {
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error("사용자 파일 읽기 실패:", error.message);
        return [];
    }
};

const saveUsers = (users) => {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
    } catch (error) {
        console.error("사용자 파일 쓰기 실패:", error.message);
    }
};

/**
 * @middleware
 * 로그인 상태 확인 및 사용자 객체 추가 (인증 미들웨어 역할)
 * - 실제 구현에서는 JWT 토큰 검증 로직이 들어가야 하지만, 
 * - 현재는 세션 스토리지에서 넘어온 username으로 사용자 존재 유무만 확인합니다.
 */
const authenticateUser = (req, res, next) => {
    // 프론트엔드에서 헤더에 'Authorization: <username>' 형식으로 보냈다고 가정
    const username = req.headers.authorization; 
    
    if (!username) {
        // 401 Unauthorized 대신, 권한 부족 403을 명확히 사용
        return res.status(403).json({ success: false, message: '로그인이 필요합니다.' }); 
    }
    
    const users = getUsers();
    const userIndex = users.findIndex(u => u.username === username);
    
    if (userIndex === -1) {
        return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }

    req.userIndex = userIndex;
    req.currentUser = users[userIndex];
    req.allUsers = users;
    next();
};

/**
 * =======================================================
 * 인증 API 엔드포인트 (기존 유지)
 * =======================================================
 */
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    // ... (기존 회원가입 로직 유지)
    if (!username || username.length < 4 || username.length > 12 || !password || password.length < 6) {
        return res.status(400).json({ success: false, message: '아이디는 4~12자, 비밀번호는 6자 이상이어야 합니다.' });
    }

    const users = getUsers();
    if (users.find(user => user.username === username)) {
        return res.status(409).json({ success: false, message: '이미 존재하는 아이디입니다.' }); 
    }

    const newUser = { username: username, password: password, myPlaylist: [] };
    users.push(newUser);
    saveUsers(users);

    res.status(201).json({ success: true, message: '회원가입 성공. 이제 로그인해주세요.' }); 
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    // ... (기존 로그인 로직 유지)
    if (!username || !password) {
        return res.status(400).json({ success: false, message: '아이디와 비밀번호를 입력해주세요.' });
    }

    const users = getUsers();
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
        res.json({ success: true, message: '로그인 성공', user: { username: user.username } });
    } else {
        res.status(401).json({ success: false, message: '아이디 또는 비밀번호가 일치하지 않습니다.' }); 
    }
});


/**
 * =======================================================
 * 3. MyPlaylist API 엔드포인트 (새로 추가)
 * =======================================================
 */

// 1. MyPlaylist 조회
app.get('/api/playlist', authenticateUser, (req, res) => {
    // authenticateUser 미들웨어를 통과하면 req.currentUser에 사용자 정보가 있습니다.
    res.json({ success: true, playlist: req.currentUser.myPlaylist });
});

// 2. MyPlaylist에 영상 추가/제거
app.post('/api/playlist/toggle', authenticateUser, (req, res) => {
    const { videoId, title, thumbnail, emojiKey, genreKey } = req.body;
    const { currentUser, allUsers, userIndex } = req;

    if (!videoId || !title) {
        return res.status(400).json({ success: false, message: '영상 ID와 제목은 필수입니다.' });
    }

    const existingIndex = currentUser.myPlaylist.findIndex(item => item.videoId === videoId);
    let message = '';
    let isAdded = false;

    if (existingIndex !== -1) {
        // 이미 존재하면 삭제 (토글 기능)
        currentUser.myPlaylist.splice(existingIndex, 1);
        message = '플레이리스트에서 영상이 제거되었습니다.';
        isAdded = false;
    } else {
        // 없으면 추가
        const newPlaylistItem = {
            videoId,
            title,
            thumbnail,
            emojiKey,
            genreKey,
            addedAt: new Date().toISOString() // 추가된 시각 기록
        };
        currentUser.myPlaylist.push(newPlaylistItem);
        message = '플레이리스트에 영상이 추가되었습니다.';
        isAdded = true;
    }

    // 변경된 사용자 정보를 전체 users 배열에 반영하고 저장
    allUsers[userIndex] = currentUser;
    saveUsers(allUsers);

    res.json({ 
        success: true, 
        message: message, 
        isAdded: isAdded, 
        playlist: currentUser.myPlaylist 
    });
});


// 서버 시작
app.listen(PORT, () => {
    console.log(`🚀 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
    console.log(`Node.js 백엔드와 프론트엔드를 함께 테스트하려면 http://localhost:${PORT}/main.html 로 접속하세요.`);
});