import React, { useState, useEffect } from 'react';
import './App.css';
import axios from 'axios';
import { Users, Trophy, GamepadIcon, ShoppingCart, User, Loader2 } from 'lucide-react';

// Telegram Web App API helper
const tg = window.Telegram?.WebApp;

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Loading Screen Component
const LoadingScreen = () => (
  <div className="loading-screen">
    <div className="loading-content">
      <div className="game-logo">
        <GamepadIcon size={48} className="logo-icon" />
        <h1>Block Blast</h1>
      </div>
      <div className="loading-spinner">
        <Loader2 className="animate-spin" size={32} />
      </div>
      <p>Загрузка игры...</p>
    </div>
  </div>
);

// Demo Block Blast Game Component
const BlockBlastGame = ({ user, activeTab }) => {
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameStartTime, setGameStartTime] = useState(null);

  const startGame = () => {
    setIsPlaying(true);
    setGameOver(false);
    setScore(0);
    setGameStartTime(Date.now());
  };

  const simulateGameOver = async () => {
    setGameOver(true);
    setIsPlaying(false);
    
    // Simulate score increase during game
    const finalScore = Math.floor(Math.random() * 10000) + 1000;
    setScore(finalScore);
    
    // Calculate game duration
    const gameDuration = gameStartTime ? Math.floor((Date.now() - gameStartTime) / 1000) : 0;
    
    // Submit score to backend if user is available
    if (user && user.id) {
      try {
        await axios.post(`${API}/scores`, {
          user_id: user.id,
          score: finalScore,
          game_duration: gameDuration
        });
        console.log('Score submitted successfully');
      } catch (error) {
        console.error('Failed to submit score:', error);
      }
    }
  };

  return (
    <div className="block-blast-game">
      
      <div className="game-area">
        {!isPlaying && !gameOver && (
          <div className="game-start">
            <h2>Block Blast</h2>
            <p>Демо версия игры</p>
            <button onClick={startGame} className="start-button">
              Начать игру
            </button>
          </div>
        )}
        
        {isPlaying && (
          <div className={`game-playing ${activeTab === 'game' ? 'fullscreen' : ''}`}>
            <iframe 
              src="/game.html" 
              title="Block Blast Game" 
              className="game-iframe"
              style={{ width: '100%', height: '100%', border: 'none' }}
            ></iframe>
          </div>
        )}
        
        {gameOver && (
          <div className="game-over">
            <h2>No Space Left</h2>
            <div className="final-score">
              <span>Финальный счёт:</span>
              <span className="final-score-value">{score.toLocaleString()}</span>
            </div>
            <button onClick={startGame} className="restart-button">
              Играть снова
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Duels Tab Component
const DuelsTab = () => (
  <div className="tab-content">
    <div className="coming-soon">
      <Users size={64} className="coming-soon-icon" />
      <h2>Дуэли</h2>
      <p>Скоро будет доступно!</p>
      <p className="description">Соревнуйтесь с другими игроками в захватывающих дуэлях</p>
    </div>
  </div>
);

// Leaders Tab Component
const LeadersTab = () => {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaders = async () => {
      try {
        const response = await axios.get(`${API}/leaderboard`);
        setLeaders(response.data);
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
        // Fallback to mock data
        setLeaders([
          { user_id: '1', username: 'ProGamer', best_score: 15420, rank: 1, photo_url: 'https://via.placeholder.com/40/FFD700/FFFFFF?text=P' },
          { user_id: '2', username: 'BlockMaster', best_score: 12890, rank: 2, photo_url: 'https://via.placeholder.com/40/C0C0C0/FFFFFF?text=B' },
          { user_id: '3', username: 'PuzzleKing', best_score: 11230, rank: 3, photo_url: 'https://via.placeholder.com/40/CD7F32/FFFFFF?text=P' },
          { user_id: '4', username: 'GameHero', best_score: 9870, rank: 4, photo_url: 'https://via.placeholder.com/40/AAAAAA/FFFFFF?text=G' },
          { user_id: '5', username: 'BlastExpert', best_score: 8450, rank: 5, photo_url: 'https://via.placeholder.com/40/DDDDDD/FFFFFF?text=B' }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaders();
  }, []);

  if (loading) {
    return (
      <div className="tab-content">
        <div className="loading-content">
          <Loader2 className="animate-spin" size={32} />
          <p>Загрузка лидеров...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-content">
      <div className="leaders-header">
        <Trophy size={32} className="trophy-icon" />
        <h2>Таблица лидеров</h2>
      </div>
      <div className="leaders-list">
        {leaders.slice(0, 50).map((leader) => (
          <div key={leader.user_id} className={`leader-item ${leader.rank <= 3 ? 'top-three' : ''}`}>
            <div className="leader-left">
              <div className="leader-rank">
                {leader.rank === 1 && <Trophy size={20} className="gold" />}
                {leader.rank === 2 && <Trophy size={20} className="silver" />}
                {leader.rank === 3 && <Trophy size={20} className="bronze" />}
                {leader.rank > 3 && <span className="rank-number">{leader.rank}</span>}
              </div>
              <div className="leader-avatar">
                {leader.photo_url ? (
                  <img src={leader.photo_url} alt="Profile" />
                ) : (
                  <User size={24} />
                )}
              </div>
            </div>
            <div className="leader-info">
              <div className="leader-username">{leader.username}</div>
              <div className="leader-score">{leader.best_score.toLocaleString()} очков</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Shop Tab Component
const ShopTab = () => (
  <div className="tab-content">
    <div className="coming-soon">
      <ShoppingCart size={64} className="coming-soon-icon" />
      <h2>Магазин</h2>
      <p>Скоро будет доступно!</p>
      <p className="description">Покупайте улучшения и бонусы для игры</p>
    </div>
  </div>
);

// Profile Tab Component
const ProfileTab = ({ user }) => {
  const [userStats, setUserStats] = useState({
    username: 'Player',
    avatar: null,
    bestScore: 0,
    gamesPlayed: 0,
    totalScore: 0,
    rank: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserStats = async () => {
      if (user && user.id) {
        try {
          const response = await axios.get(`${API}/stats/user/${user.id}`);
          setUserStats({
            username: user.username || user.first_name || `ID: ${user.telegram_id}`,
            avatar: user.photo_url,
            bestScore: user.best_score,
            gamesPlayed: user.games_played,
            totalScore: user.total_score,
            rank: response.data.rank
          });
        } catch (error) {
          console.error('Failed to fetch user stats:', error);
          setUserStats({
            username: user.username || user.first_name || `ID: ${user.telegram_id}`,
            avatar: user.photo_url,
            bestScore: user.best_score || 0,
            gamesPlayed: user.games_played || 0,
            totalScore: user.total_score || 0,
            rank: 0
          });
        }
      }
      setLoading(false);
    };

    fetchUserStats();
  }, [user]);

  if (loading) {
    return (
      <div className="tab-content">
        <div className="loading-content">
          <Loader2 className="animate-spin" size={32} />
          <p>Загрузка профиля...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-content">
      <div className="profile-header">
        <div className="profile-avatar">
          {userStats.avatar ? (
            <img src={userStats.avatar} alt="Profile" />
          ) : (
            <User size={48} />
          )}
        </div>
        <div className="profile-info">
          <h2>{userStats.username}</h2>
          <p className="user-rank">Ранг: #{userStats.rank}</p>
          <p className="telegram-id">Telegram ID: {user.telegram_id}</p>
        </div>
      </div>
      
      <div className="stats-grid">
        <div className="stat-item">
          <div className="stat-value">{userStats.bestScore.toLocaleString()}</div>
          <div className="stat-label">Лучший счёт</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{userStats.gamesPlayed}</div>
          <div className="stat-label">Игр сыграно</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{userStats.totalScore.toLocaleString()}</div>
          <div className="stat-label">Общий счёт</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">#{userStats.rank}</div>
          <div className="stat-label">Текущий ранг</div>
        </div>
      </div>
    </div>
  );
};

// Player Rank Overlay Component
const PlayerRankOverlay = ({ user, userStats, activeTab }) => {
  // Only show overlay on game, duels, leaders, and shop tabs
  const showOverlay = activeTab !== 'profile';

  if (!user || !userStats || userStats.rank === 0 || !showOverlay) {
    return null;
  }

  return (
    <div className="player-rank-overlay">
      <div className="player-rank-content">
        <div className="player-avatar">
          {userStats.avatar ? (
            <img src={userStats.avatar} alt="Profile" />
          ) : (
            <User size={24} />
          )}
        </div>
        <div className="player-info">
          <span className="player-username">{userStats.username}</span>
          <span className="player-rank-text">Ранг: #{userStats.rank}</span>
        </div>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  const [activeTab, setActiveTab] = useState('game');
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [userStats, setUserStats] = useState({
    username: 'Player',
    avatar: null,
    bestScore: 0,
    gamesPlayed: 0,
    totalScore: 0,
    rank: 0
  });
  // const [showTelegramWarning, setShowTelegramWarning] = useState(false); // Удаляем это состояние

  const tabs = [
    { id: 'duels', name: 'Дуэли', icon: Users, component: DuelsTab },
    { id: 'leaders', name: 'Лидеры', icon: Trophy, component: LeadersTab },
    { id: 'game', name: 'Игра', icon: GamepadIcon, component: BlockBlastGame },
    { id: 'shop', name: 'Магазин', icon: ShoppingCart, component: ShopTab },
    { id: 'profile', name: 'Профиль', icon: User, component: ProfileTab }
  ];

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize Telegram Web App
        if (tg && tg.initDataUnsafe?.user) {
          tg.ready();
          tg.expand();
          
          // Get Telegram user data
          const telegramUser = tg.initDataUnsafe.user;
          // Create or get user from backend
          const userData = {
            telegram_id: telegramUser.id,
            username: telegramUser.username || `${telegramUser.first_name}_${telegramUser.id}`,
            first_name: telegramUser.first_name,
            last_name: telegramUser.last_name,
            photo_url: telegramUser.photo_url
          };
          console.log('Sending userData to backend:', userData);

          try {
            const response = await axios.post(`${API}/users`, userData, {
              headers: {
                'X-Telegram-Init-Data': tg.initData || ''
              }
            });
            setUser(response.data);
            // Fetch user stats immediately after user is set
            const statsResponse = await axios.get(`${API}/stats/user/${response.data.id}`);
            setUserStats({
              username: response.data.username || response.data.first_name || `ID: ${response.data.telegram_id}`,
              avatar: response.data.photo_url,
              bestScore: response.data.best_score,
              gamesPlayed: response.data.games_played,
              totalScore: response.data.total_score,
              rank: statsResponse.data.rank
            });
            console.log('User initialized with backend response:', response.data);
          } catch (error) {
            console.error('Failed to initialize Telegram user:', error);
            // Fallback to demo user if Telegram user init fails
            await createDemoUser();
          }
        } else {
          // Fallback for non-Telegram environment or if telegramUser is not available
          console.warn('Telegram WebApp is not available or user data is missing. Initializing demo user.');
          await createDemoUser();
        }
      } catch (error) {
        console.error('App initialization error:', error);
        await createDemoUser(); // Ensure demo user is created even if there's an app-level error
      } finally {
        // Simulate loading time
        setTimeout(() => {
          setIsLoading(false);
        }, 2000);
      }
    };

    const createDemoUser = async () => {
      const demoUser = {
        username: 'DemoPlayer',
        first_name: 'Demo',
        last_name: 'Player',
        telegram_id: Math.floor(Math.random() * 1000000000) // Уникальный telegram_id для демо-пользователя
      };
      try {
        const response = await axios.post(`${API}/users`, demoUser);
        setUser(response.data);
        // Fetch demo user stats
        const statsResponse = await axios.get(`${API}/stats/user/${response.data.id}`);
        setUserStats({
          username: response.data.username || response.data.first_name || `ID: ${response.data.telegram_id}`,
          avatar: response.data.photo_url,
          bestScore: response.data.best_score,
          gamesPlayed: response.data.games_played,
          totalScore: response.data.total_score,
          rank: statsResponse.data.rank
        });
        console.log('Demo user initialized:', response.data);
      } catch (error) {
        console.error('Failed to initialize demo user:', error);
        setUser({
          id: 'demo-user',
          username: 'DemoPlayer',
          best_score: 0,
          total_score: 0,
          games_played: 0
        });
        // Fallback userStats if API fails
        setUserStats({
          username: 'DemoPlayer',
          avatar: null,
          bestScore: 0,
          gamesPlayed: 0,
          totalScore: 0,
          rank: 0
        });
      }
    };

    initializeApp();
  }, []);

  // Update userStats when user changes (e.g., after score submission)
  useEffect(() => {
    if (user && user.id) {
      const fetchUserStats = async () => {
        try {
          const response = await axios.get(`${API}/stats/user/${user.id}`);
          setUserStats({
            username: user.username || user.first_name || `ID: ${user.telegram_id}`,
            avatar: user.photo_url,
            bestScore: user.best_score,
            gamesPlayed: user.games_played,
            totalScore: user.total_score,
            rank: response.data.rank
          });
        } catch (error) {
          console.error('Failed to refresh user stats:', error);
        }
      };
      fetchUserStats();
    }
  }, [user]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  // if (showTelegramWarning) {
  //   return <TelegramWarning />;
  // }

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || BlockBlastGame;

  return (
    <div className="App">
      <div className="app-container">
        <main className="main-content">
         <ActiveComponent user={user} activeTab={activeTab} />
        </main>
        
        <PlayerRankOverlay user={user} userStats={userStats} activeTab={activeTab} />

        <nav className="bottom-nav">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={24} />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export default App;