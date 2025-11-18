document.addEventListener('DOMContentLoaded', () => {
    const currentUser = JSON.parse(sessionStorage.getItem('currentMoodUser'));

    if (!currentUser || !currentUser.username) {
        alert('로그인이 필요합니다.');
        window.location.href = 'main.html';
        return;
    }

    const EMOJI_MAP = {
        'happy': { name: '행복', emoji: '😊', color: ['#FFD700', '#FFA500'] },
        'calm': { name: '평온', emoji: '😌', color: ['#87CEEB', '#4682B4'] },
        'sad': { name: '슬픔', emoji: '😢', color: ['#ADD8E6', '#1E90FF'] },
        'angry': { name: '분노', emoji: '😡', color: ['#FF6347', '#DC143C'] },
        'excited': { name: '신남', emoji: '🤩', color: ['#FF4500', '#FF8C00'] },
        'tired': { name: '피곤', emoji: '😴', color: ['#9370DB', '#8A2BE2'] },
    };

    const GENRE_MAP = {
        'pop': { name: 'POP', color: ['#FF69B4', '#FF1493'] },
        'hiphop': { name: 'Hip-Hop', color: ['#1E90FF', '#4169E1'] },
        'rnb': { name: 'R&B', color: ['#FFD700', '#FFA500'] },
        'ballad': { name: '발라드', color: ['#3CB371', '#2E8B57'] },
        'jazz': { name: 'Jazz', color: ['#BA55D3', '#9932CC'] },
        'edm': { name: 'EDM', color: ['#00FFFF', '#008B8B'] },
    };

    const recommendationText = document.getElementById('recommendation-text');

    // 메인으로 돌아가기 버튼 이벤트 리스너
    const goToMainBtn = document.getElementById('go-to-main-btn');
    if (goToMainBtn) {
        goToMainBtn.addEventListener('click', () => {
            window.location.href = 'main.html';
        });
    }

    // 1. 서버에서 데이터 가져오기
    fetch('/api/history', {
        headers: { 'Authorization': currentUser.username }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.history.length > 0) {
            const history = data.history;
            
            const emotionCounts = countOccurrences(history, 'emotion');
            const genreCounts = countOccurrences(history, 'genre');

            createChart('emotionChart', '감정', emotionCounts, EMOJI_MAP, true); // isEmotionChart = true
            createChart('genreChart', '장르', genreCounts, GENRE_MAP, false); // isEmotionChart = false

            const mostFrequentEmotion = getMostFrequent(emotionCounts);
            const mostFrequentGenre = getMostFrequent(genreCounts);

            if (mostFrequentEmotion && mostFrequentGenre) {
                recommendationText.textContent = `회원님은 '${EMOJI_MAP[mostFrequentEmotion].name}' 감정일 때 '${GENRE_MAP[mostFrequentGenre].name}' 장르를 즐겨 들으셨네요! 이와 비슷한 플레이리스트를 추천해 드릴게요.`;
                fetchRecommendedPlaylist(mostFrequentEmotion, mostFrequentGenre);
            } else {
                recommendationText.textContent = '아직 분석할 데이터가 충분하지 않아요. 플레이리스트를 더 만들어 보세요!';
            }
        } else {
            document.querySelector('.charts-wrapper').innerHTML = '<p>아직 분석할 데이터가 없습니다. 플레이리스트를 생성해 보세요!</p>';
            recommendationText.textContent = '데이터가 없어 플레이리스트를 추천할 수 없습니다.';
        }
    })
    .catch(error => {
        console.error('Error fetching history:', error);
        document.querySelector('.charts-wrapper').innerHTML = '<p>데이터를 불러오는 중 오류가 발생했습니다.</p>';
    });

    function countOccurrences(arr, key) {
        return arr.reduce((acc, current) => {
            const item = current[key];
            acc[item] = (acc[item] || 0) + 1;
            return acc;
        }, {});
    }

    function getMostFrequent(counts) {
        return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, null);
    }

    function createChart(canvasId, label, counts, map, isEmotionChart = false) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        const labels = Object.keys(counts).map(key => isEmotionChart ? map[key]?.emoji : map[key]?.name || key);
        const data = Object.values(counts);
        
        const backgroundColors = Object.keys(counts).map(key => {
            const colors = map[key]?.color;
            if (colors && colors.length > 1) {
                const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                gradient.addColorStop(0, colors[0]);
                gradient.addColorStop(1, colors[1]);
                return gradient;
            }
            return colors ? colors[0] : 'rgba(201, 203, 207, 0.7)';
        });

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: `${label} 선택 횟수`,
                    data: data,
                    backgroundColor: backgroundColors,
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    borderWidth: 1,
                    borderRadius: 5,
                }]
            },
            options: {
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart',
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            color: '#888'
                        },
                        grid: {
                            color: '#eee'
                        }
                    },
                    x: {
                        ticks: {
                            font: {
                                size: isEmotionChart ? 24 : 14 // 이모지 폰트 크기 키우기
                            },
                            color: '#555'
                        },
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        titleFont: { size: 16 },
                        bodyFont: { size: 14 },
                        callbacks: {
                            title: function(context) {
                                const key = Object.keys(counts)[context[0].dataIndex];
                                return map[key]?.name || '';
                            }
                        }
                    }
                },
                onHover: (event, chartElement) => {
                    event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
                }
            }
        });
    }

    function fetchRecommendedPlaylist(emotionKey, genreKey) {
        const emotionName = EMOJI_MAP[emotionKey].name;
        const genreName = GENRE_MAP[genreKey].name;
        const query = `${emotionName} ${genreName} 플레이리스트`;
        
        const playlistContainer = document.getElementById('recommended-playlist');
        const searchUrl = `list.html?keyword=${encodeURIComponent(query)}&emoji=${emotionKey}&genre=${genreKey}`;

        playlistContainer.innerHTML = `
            <a href="${searchUrl}" class="recommendation-card">
                <div class="recommendation-content">
                    <h3>'${emotionName} + ${genreName}' 조합의 새로운 음악 찾아보기</h3>
                    <p>클릭해서 추천 플레이리스트를 확인해 보세요!</p>
                </div>
            </a>
        `;
    }
});
