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
const BlockBlastGame = ({ user }) => {
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

  // Function to read score from screen (for future integration with actual game)
  const readScoreFromScreen = () => {
    // This function will be called when "No Space Left" appears
    const scoreElement = document.querySelector('.score-value');
    if (scoreElement) {
      const currentScore = parseInt(scoreElement.textContent.replace(/,/g, '')) || 0;
      return currentScore;
    }
    return 0;
  };

  // Monitor for "No Space Left" text (for future integration)
  useEffect(() => {
    const interval = setInterval(() => {
      if (isPlaying) {
        // Check if "No Space Left" appears anywhere on screen
        const bodyText = document.body.textContent;
        if (bodyText.includes('No Space Left')) {
          const currentScore = readScoreFromScreen();
          setScore(currentScore);
          simulateGameOver();
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isPlaying, gameStartTime]);

  return (
    <div className="block-blast-game">
      <div className="game-header">
        <div className="score-display">
          <span className="score-label">Счёт</span>
          <span className="score-value">{score.toLocaleString()}</span>
        </div>
      </div>
      
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
          <div className="game-playing">
            <div className="game-grid">
              {/* Demo game grid */}
              {Array.from({length: 100}).map((_, i) => (
                <div key={i} className="grid-cell"></div>
              ))}
            </div>
            <button onClick={simulateGameOver} className="end-game-button">
              Симулировать окончание игры
            </button>
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
          { user_id: '1', username: 'ProGamer', best_score: 15420, rank: 1 },
          { user_id: '2', username: 'BlockMaster', best_score: 12890, rank: 2 },
          { user_id: '3', username: 'PuzzleKing', best_score: 11230, rank: 3 },
          { user_id: '4', username: 'GameHero', best_score: 9870, rank: 4 },
          { user_id: '5', username: 'BlastExpert', best_score: 8450, rank: 5 }
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
        {leaders.map((leader) => (
          <div key={leader.id} className={`leader-item ${leader.rank <= 3 ? 'top-three' : ''}`}>
            <div className="leader-rank">
              {leader.rank === 1 && <Trophy size={20} className="gold" />}
              {leader.rank === 2 && <Trophy size={20} className="silver" />}
              {leader.rank === 3 && <Trophy size={20} className="bronze" />}
              {leader.rank > 3 && <span className="rank-number">{leader.rank}</span>}
            </div>
            <div className="leader-info">
              <div className="leader-username">{leader.username}</div>
              <div className="leader-score">{leader.score.toLocaleString()} очков</div>
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
const ProfileTab = () => {
  const [userStats, setUserStats] = useState({
    username: 'Player',
    avatar: null,
    bestScore: 8450,
    gamesPlayed: 127,
    totalScore: 45890,
    rank: 15
  });

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

// Main App Component
function App() {
  const [activeTab, setActiveTab] = useState('game');
  const [isLoading, setIsLoading] = useState(true);

  const tabs = [
    { id: 'duels', name: 'Дуэли', icon: Users, component: DuelsTab },
    { id: 'leaders', name: 'Лидеры', icon: Trophy, component: LeadersTab },
    { id: 'game', name: 'Игра', icon: GamepadIcon, component: BlockBlastGame },
    { id: 'shop', name: 'Магазин', icon: ShoppingCart, component: ShopTab },
    { id: 'profile', name: 'Профиль', icon: User, component: ProfileTab }
  ];

  useEffect(() => {
    // Simulate initial loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || BlockBlastGame;

  return (
    <div className="App">
      <div className="app-container">
        <main className="main-content">
          <ActiveComponent />
        </main>
        
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