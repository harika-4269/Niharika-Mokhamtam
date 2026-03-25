/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, RefreshCw, Terminal, AlertTriangle } from 'lucide-react';

type Point = { x: number; y: number };
const GRID_SIZE = 20;
const CELL_SIZE = 20; // pixels
const INITIAL_SNAKE: Point[] = [{ x: 10, y: 10 }];
const INITIAL_DIRECTION: Point = { x: 0, y: -1 };
const GAME_SPEED = 90; // Faster, more aggressive

const TRACKS = [
  {
    id: 1,
    title: "SYS.ERR_01",
    artist: "UNKNOWN_ENTITY",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    cover: "https://picsum.photos/seed/glitch1/400/400"
  },
  {
    id: 2,
    title: "MEM_LEAK",
    artist: "NULL_PTR",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    cover: "https://picsum.photos/seed/glitch2/400/400"
  },
  {
    id: 3,
    title: "BUFFER_OVERRUN",
    artist: "0xDEADBEEF",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    cover: "https://picsum.photos/seed/glitch3/400/400"
  }
];

const BOOT_SEQUENCE = [
  "INIT_BIOS_V.9.9.4...",
  "MEMORY_CHECK: 640K OK",
  "LOADING_KERNEL_MODULES...",
  "MOUNTING_VFS... OK",
  "STARTING_AUDIO_DAEMON... [CYAN_MAGENTA_PROTOCOL]",
  "WARNING: UNSTABLE_MEMORY_DETECTED",
  "BYPASSING_SAFETY_CHECKS...",
  "EXEC_NEON_SNAKE.BIN"
];

export default function App() {
  const [isBooting, setIsBooting] = useState(true);
  const [bootLogs, setBootLogs] = useState<string[]>([]);
  
  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
  const [direction, setDirection] = useState<Point>(INITIAL_DIRECTION);
  const [food, setFood] = useState<Point>({ x: 15, y: 5 });
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [flash, setFlash] = useState(false);
  
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const gameLoopRef = useRef<number | null>(null);

  // --- Boot Sequence ---
  useEffect(() => {
    if (!isBooting) return;
    
    let currentLog = 0;
    const interval = setInterval(() => {
      if (currentLog < BOOT_SEQUENCE.length) {
        setBootLogs(prev => [...prev, BOOT_SEQUENCE[currentLog]]);
        currentLog++;
      } else {
        clearInterval(interval);
        setTimeout(() => setIsBooting(false), 500);
      }
    }, 300);
    
    return () => clearInterval(interval);
  }, [isBooting]);

  // --- Game Logic ---
  const generateFood = useCallback(() => {
    let newFood: Point;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      // eslint-disable-next-line no-loop-func
      const isOnSnake = snake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
      if (!isOnSnake) break;
    }
    setFood(newFood);
  }, [snake]);

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    setScore(0);
    setGameOver(false);
    setIsPaused(false);
    generateFood();
  };

  const moveSnake = useCallback(() => {
    if (gameOver || isPaused || isBooting) return;

    setSnake(prevSnake => {
      const head = prevSnake[0];
      const newHead = { x: head.x + direction.x, y: head.y + direction.y };

      // Check wall collision
      if (
        newHead.x < 0 ||
        newHead.x >= GRID_SIZE ||
        newHead.y < 0 ||
        newHead.y >= GRID_SIZE
      ) {
        setGameOver(true);
        return prevSnake;
      }

      // Check self collision
      if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
        setGameOver(true);
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      // Check food collision
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore(s => s + 16); // Hex-like score increments
        generateFood();
        
        // Trigger glitch flash
        setFlash(true);
        setTimeout(() => setFlash(false), 100);
      } else {
        newSnake.pop(); // Remove tail if no food eaten
      }

      return newSnake;
    });
  }, [direction, food, gameOver, isPaused, isBooting, generateFood]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isBooting) return;
      
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === ' ' && !gameOver) {
        setIsPaused(p => !p);
        return;
      }

      if (isPaused || gameOver) return;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (direction.y !== 1) setDirection({ x: 0, y: -1 });
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (direction.y !== -1) setDirection({ x: 0, y: 1 });
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (direction.x !== 1) setDirection({ x: -1, y: 0 });
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (direction.x !== -1) setDirection({ x: 1, y: 0 });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [direction, isPaused, gameOver, isBooting]);

  useEffect(() => {
    if (!gameOver && !isPaused && !isBooting) {
      gameLoopRef.current = window.setInterval(moveSnake, GAME_SPEED);
    }
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [moveSnake, gameOver, isPaused, isBooting]);

  // --- Music Logic ---
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Audio play failed:", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTrackIndex]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  
  const nextTrack = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % TRACKS.length);
    setIsPlaying(true);
  };
  
  const prevTrack = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);
    setIsPlaying(true);
  };

  if (isBooting) {
    return (
      <div className="min-h-screen bg-black text-[#00ffff] font-mono p-8 relative overflow-hidden uppercase crt">
        <div className="scanlines" />
        <div className="noise" />
        <div className="z-10 relative flex flex-col gap-2 text-xl md:text-2xl chromatic-text">
          {bootLogs.map((log, i) => (
            <div key={i} className={i === bootLogs.length - 1 ? "animate-pulse text-[#ff00ff]" : ""}>
              &gt; {log}
            </div>
          ))}
          <div className="animate-pulse">&gt; _</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-black text-white font-mono flex flex-col items-center justify-center p-4 relative overflow-hidden uppercase crt ${flash ? 'invert-flash' : ''}`}>
      <div className="scanlines" />
      <div className="noise" />

      <header className="mb-8 text-center z-10 glitch-wrapper screen-tear">
        <h1 className="glitch-text text-5xl md:text-7xl" data-text="NEON_SNAKE.EXE">
          NEON_SNAKE.EXE
        </h1>
        <p className="text-[#00ffff] tracking-[0.3em] text-sm mt-2 chromatic-text">
          &gt; SYSTEM_ONLINE // AWAITING_INPUT
        </p>
      </header>

      <div className="flex flex-col xl:flex-row gap-12 items-start justify-center w-full max-w-6xl z-10 screen-tear">
        
        {/* Game Container */}
        <div className="flex flex-col items-center bg-black p-6 chromatic-border relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-[#ff00ff] animate-pulse" />
          <div className="absolute bottom-0 right-0 w-full h-1 bg-[#00ffff] animate-pulse" />
          
          <div className="flex justify-between w-full mb-4 text-[#00ffff] chromatic-text text-lg border-b border-[#ff00ff] pb-2">
            <div>ADDR: <span className="text-[#ff00ff]">0x{score.toString(16).toUpperCase().padStart(4, '0')}</span></div>
            <div className={isPaused ? "animate-pulse text-[#ff00ff]" : ""}>
              {isPaused ? 'SYS_HALTED' : 'EXEC_ACTIVE'}
            </div>
          </div>

          <div 
            className="relative bg-[#050505] border-2 border-[#00ffff] overflow-hidden"
            style={{ width: GRID_SIZE * CELL_SIZE, height: GRID_SIZE * CELL_SIZE }}
          >
            {/* Grid Lines */}
            <div className="absolute inset-0 opacity-20 pointer-events-none" 
                 style={{ 
                   backgroundImage: 'linear-gradient(#00ffff 1px, transparent 1px), linear-gradient(90deg, #00ffff 1px, transparent 1px)', 
                   backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px` 
                 }} 
            />

            {/* Render Food */}
            <div 
              className="absolute bg-[#ff00ff] shadow-[0_0_10px_#ff00ff] animate-pulse"
              style={{
                width: CELL_SIZE,
                height: CELL_SIZE,
                left: food.x * CELL_SIZE,
                top: food.y * CELL_SIZE,
              }}
            />
            {/* Render Snake */}
            {snake.map((segment, index) => (
              <div
                key={index}
                className={`absolute ${index === 0 ? 'bg-white shadow-[0_0_10px_#ffffff]' : 'bg-[#00ffff] shadow-[0_0_5px_#00ffff]'}`}
                style={{
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  left: segment.x * CELL_SIZE,
                  top: segment.y * CELL_SIZE,
                  opacity: 1 - (index / snake.length) * 0.5 // Fade tail
                }}
              />
            ))}

            {gameOver && (
              <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-20 backdrop-blur-sm">
                <AlertTriangle size={48} className="text-[#ff00ff] mb-4 animate-bounce" />
                <h2 className="text-3xl font-bold text-[#ff00ff] mb-2 chromatic-text glitch-text" data-text="FATAL_EXCEPTION">FATAL_EXCEPTION</h2>
                <p className="text-[#00ffff] mb-6">DUMP_CODE: 0x{score.toString(16).toUpperCase().padStart(4, '0')}</p>
                <button 
                  onClick={resetGame}
                  className="px-6 py-2 bg-black border-2 border-[#00ffff] text-[#00ffff] font-bold hover:bg-[#00ffff] hover:text-black transition-none flex items-center gap-2 cursor-pointer chromatic-text hover:shadow-[0_0_15px_#00ffff]"
                >
                  <RefreshCw size={16} /> REBOOT_SYS
                </button>
              </div>
            )}
          </div>
          
          <div className="mt-4 text-[#ff00ff] text-xs text-center chromatic-text">
            &gt; INPUT: [W,A,S,D] || [ARROWS] | INTERRUPT: [SPACE]
          </div>
        </div>

        {/* Music Player */}
        <div className="w-full max-w-sm bg-black p-6 chromatic-border flex flex-col relative">
          <div className="absolute top-0 right-0 w-1 h-full bg-[#00ffff] animate-pulse" />
          <div className="absolute bottom-0 left-0 w-1 h-full bg-[#ff00ff] animate-pulse" />

          <h3 className="text-[#00ffff] text-sm tracking-widest mb-4 flex items-center gap-2 border-b border-[#ff00ff] pb-2 chromatic-text">
            <Terminal size={16} />
            AUDIO_DAEMON_V2
          </h3>
          
          <div className="relative aspect-square w-full mb-6 border-2 border-[#00ffff] group overflow-hidden">
            <img 
              src={TRACKS[currentTrackIndex].cover} 
              alt="Cover Art" 
              className={`w-full h-full object-cover filter contrast-200 saturate-200 hue-rotate-90 ${isPlaying ? 'animate-pulse' : ''}`}
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-[#ff00ff]/30 mix-blend-color pointer-events-none" />
            <div className="absolute inset-0 bg-[url('https://assets.iceable.com/img/noise-transparent.png')] opacity-50 pointer-events-none mix-blend-overlay" />
            
            {/* Visualizer bars */}
            <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between h-32 gap-1 opacity-90 p-2 pointer-events-none">
              {[...Array(20)].map((_, i) => (
                <div 
                  key={i} 
                  className="w-full bg-[#00ffff] visualizer-bar shadow-[0_0_8px_#00ffff]"
                  style={{ 
                    height: '100%',
                    animation: isPlaying ? `glitch-bar ${0.15 + (i % 5) * 0.08}s infinite alternate steps(4)` : 'none',
                    animationDelay: `${i * 0.03}s`,
                    transform: isPlaying ? 'scaleY(0.1)' : 'scaleY(0.02)'
                  }}
                />
              ))}
            </div>
          </div>

          <div className="text-left mb-6 border-l-4 border-[#ff00ff] pl-4">
            <h4 className="text-xl font-bold text-white truncate chromatic-text uppercase">{TRACKS[currentTrackIndex].title}</h4>
            <p className="text-[#00ffff] text-xs mt-1 truncate uppercase">AUTHOR: {TRACKS[currentTrackIndex].artist}</p>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between mb-6 border-2 border-[#00ffff] p-2 bg-[#050505]">
            <button onClick={prevTrack} className="text-[#ff00ff] hover:text-white transition-none cursor-pointer p-2 hover:drop-shadow-[0_0_5px_#ff00ff]">
              <SkipBack size={24} />
            </button>
            <button 
              onClick={togglePlay} 
              className="w-12 h-12 flex items-center justify-center bg-[#00ffff] text-black hover:bg-white transition-none cursor-pointer shadow-[0_0_10px_#00ffff]"
            >
              {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
            </button>
            <button onClick={nextTrack} className="text-[#ff00ff] hover:text-white transition-none cursor-pointer p-2 hover:drop-shadow-[0_0_5px_#ff00ff]">
              <SkipForward size={24} />
            </button>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-3 text-[#00ffff]">
            <Volume2 size={16} className="animate-pulse" />
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.01" 
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full h-2 bg-black border border-[#ff00ff] appearance-none cursor-pointer accent-[#00ffff]"
            />
          </div>

          <audio
            ref={audioRef}
            src={TRACKS[currentTrackIndex].url}
            onEnded={nextTrack}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        </div>

      </div>
      
      <style>{`
        @keyframes glitch-bar {
          0% { transform: scaleY(0.1); }
          25% { transform: scaleY(0.9); }
          50% { transform: scaleY(0.4); }
          75% { transform: scaleY(1.0); }
          100% { transform: scaleY(0.2); }
        }
        .visualizer-bar {
          transform-origin: bottom;
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 16px;
          width: 8px;
          background: #00ffff;
          cursor: pointer;
          border-radius: 0;
          box-shadow: 0 0 5px #00ffff;
        }
      `}</style>
    </div>
  );
}
