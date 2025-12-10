const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;
const USERS_FILE = path.join(__dirname, 'users.json');

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '.')));

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

const authenticateUser = (req, res, next) => {
    const username = req.headers.authorization; 
    
    if (!username) {
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

app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || username.length < 4 || username.length > 12 || !password || password.length < 6) {
        return res.status(400).json({ success: false, message: '아이디는 4~12자, 비밀번호는 6자 이상이어야 합니다.' });
    }

    const users = getUsers();
    if (users.find(user => user.username === username)) {
        return res.status(409).json({ success: false, message: '이미 존재하는 아이디입니다.' }); 
    }

    const newUser = { username: username, password: password, myPlaylist: [], selectionHistory: [] };
    users.push(newUser);
    saveUsers(users);

    res.status(201).json({ success: true, message: '회원가입 성공. 이제 로그인해주세요.' }); 
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
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

app.post('/api/history', authenticateUser, (req, res) => {
    const { emotion, genre } = req.body;
    const { currentUser, allUsers, userIndex } = req;

    if (!emotion || !genre) {
        return res.status(400).json({ success: false, message: '감정과 장르 정보는 필수입니다.' });
    }

    if (!currentUser.selectionHistory) {
        currentUser.selectionHistory = [];
    }

    const newSelection = {
        emotion,
        genre,
        timestamp: new Date().toISOString()
    };

    currentUser.selectionHistory.push(newSelection);

    allUsers[userIndex] = currentUser;
    saveUsers(allUsers);

    res.json({ success: true, message: '선택 기록이 저장되었습니다.' });
});

app.get('/api/history', authenticateUser, (req, res) => {
    const { currentUser } = req;
    
    const history = currentUser.selectionHistory || [];
    
    res.json({ success: true, history });
});

app.get('/api/playlist', authenticateUser, (req, res) => {
    res.json({ success: true, playlist: req.currentUser.myPlaylist });
});

app.post('/api/playlist/toggle', authenticateUser, (req, res) => {
    const { videoId, title, thumbnail, emojiKey, genreKey, channelTitle } = req.body;
    const { currentUser, allUsers, userIndex } = req;

    if (!videoId || !title) {
        return res.status(400).json({ success: false, message: '영상 ID와 제목은 필수입니다.' });
    }

    const existingIndex = currentUser.myPlaylist.findIndex(item => item.videoId === videoId);
    let message = '';
    let isAdded = false;

    if (existingIndex !== -1) {
        currentUser.myPlaylist.splice(existingIndex, 1);
        message = '플레이리스트에서 영상이 제거되었습니다.';
        isAdded = false;
    } else {
        const newPlaylistItem = {
            videoId,
            title,
            thumbnail,
            emojiKey,
            genreKey,
            channelTitle, 
            addedAt: new Date().toISOString() 
        };
        currentUser.myPlaylist.push(newPlaylistItem);
        message = '플레이리스트에 영상이 추가되었습니다.';
        isAdded = true;
    }

    allUsers[userIndex] = currentUser;
    saveUsers(allUsers);

    res.json({ 
        success: true, 
        message: message, 
        isAdded: isAdded, 
        playlist: currentUser.myPlaylist 
    });
});

app.post('/api/playlist/delete', authenticateUser, (req, res) => {
    const { videoId } = req.body;
    const { currentUser, allUsers, userIndex } = req;

    if (!videoId) {
        return res.status(400).json({ success: false, message: '삭제할 영상 ID는 필수입니다.' });
    }

    const initialPlaylistLength = currentUser.myPlaylist.length;
    currentUser.myPlaylist = currentUser.myPlaylist.filter(item => item.videoId !== videoId);

    if (currentUser.myPlaylist.length < initialPlaylistLength) {
        allUsers[userIndex] = currentUser;
        saveUsers(allUsers);
        res.json({ success: true, message: '플레이리스트에서 영상이 삭제되었습니다.' });
    } else {
        res.status(404).json({ success: false, message: '해당 영상을 플레이리스트에서 찾을 수 없습니다.' });
    }
});

const POSTS_FILE = 'posts.json';
let communityPosts = []; 

function loadCommunityPosts() {
    try {
        const data = fs.readFileSync(POSTS_FILE);
        communityPosts = JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('Community posts file not found. Creating a new one.');
            communityPosts = []; 
            saveCommunityPosts();
        } else {
            console.error('Error loading community posts:', error);
        }
    }
}

function saveCommunityPosts() {
    try {
        fs.writeFileSync(POSTS_FILE, JSON.stringify(communityPosts, null, 2));
    } catch (error) {
        console.error('Error saving community posts:', error);
    }
}

app.post('/api/community/post', (req, res) => {
    if (!req.header('Authorization')) {
        return res.status(401).send({ success: false, message: '로그인 후 이용 가능합니다.' });
    }
    
    const { videoId, title, thumbnail, emojiKey, genreKey, channelTitle, content } = req.body;

    if (!content || !videoId) {
        return res.status(400).send({ success: false, message: '일기 내용과 영상 정보는 필수입니다.' });
    }

    const newPost = {
        id: Date.now(), 
        videoId,
        title,
        thumbnail,
        emojiKey,
        genreKey,
        channelTitle,
        content,
        timestamp: new Date().toISOString(),
        authorId: req.header('Authorization'), 
        anonymousName: `익명${Math.floor(Math.random() * 900) + 100}` 
    };
    
    communityPosts.push(newPost);
    saveCommunityPosts();

    res.send({ 
        success: true, 
        message: '게시글이 성공적으로 작성되었습니다.',
        post: newPost
    });
});

app.get('/api/community/posts', (req, res) => {
    const sortedPosts = communityPosts.slice().sort((a, b) => b.id - a.id);
    
    const sanitizedPosts = sortedPosts.map(post => ({
        ...post,
        authorId: undefined, 
        author: post.anonymousName 
    }));

    res.send({
        success: true,
        posts: sanitizedPosts 
    });
});

loadCommunityPosts();

app.listen(PORT, () => {
    console.log(`🚀 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
    console.log(`Node.js 백엔드와 프론트엔드를 함께 테스트하려면 http://localhost:${PORT}/main.html 로 접속하세요.`);
});