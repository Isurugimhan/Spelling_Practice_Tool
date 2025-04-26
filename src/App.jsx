import React, { useState, useEffect, useRef, useCallback } from 'react';
import { stories } from './stories'; // Import the stories
// Consider adding an icon library like react-icons later for Sun/Moon
// import { SunIcon, MoonIcon } from '@heroicons/react/24/solid'; // Example

// Define accent color theme based on new palette
const colorThemes = {
  commandPurple: { name: 'Command Purple', light: '124 58 237', dark: '107 33 168' }, // Matches CSS vars
  // Remove or comment out other themes if only this one is desired
  // green: { name: 'Green', light: '80 176 28', dark: '66 156 20' },
  // ... other themes ...
};

// Switch Component - Updated Styles
const SwitchToggle = ({ enabled, setEnabled }) => {
  return (
    <button
      type="button"
      className={`${
        enabled ? 'bg-accent dark:bg-accent dark:shadow-[0_0_10px_theme(colors.accent/40%)]' : 'bg-gray-300 dark:bg-gray-600'
      } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent dark:focus:ring-accent focus:ring-offset-2 focus:ring-offset-cream-bg dark:focus:ring-offset-dark-bg`}
      role="switch"
      aria-checked={enabled}
      onClick={() => setEnabled(!enabled)}
    >
      <span className="sr-only">Use setting</span>
      <span
        aria-hidden="true"
        className={`${
          enabled ? 'translate-x-5' : 'translate-x-0'
        } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
      />
    </button>
  );
};

// Helper to format time (MM:SS)
const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

function App() {
  // --- State ---
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode !== null) {
      return savedMode === 'true';
    }
    return true; // Force dark mode as default appearance unless toggled
  });
  const [optionsCollapsed, setOptionsCollapsed] = useState(true); // Default to collapsed
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [checkPunctuation, setCheckPunctuation] = useState(false);
  const [translateLanguage, setTranslateLanguage] = useState('Spanish');
  const [readNextWord, setReadNextWord] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState('');
  const [availableStories, setAvailableStories] = useState([]);
  const [selectedStoryTitle, setSelectedStoryTitle] = useState('');
  const [storyText, setStoryText] = useState('Please select a level and story, or choose Custom Text.');
  const [customText, setCustomText] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [originalWords, setOriginalWords] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [checkResults, setCheckResults] = useState(null);
  const [misspelledWords, setMisspelledWords] = useState([]);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [wpm, setWpm] = useState(0);
  const timerIntervalRef = useRef(null);
  const [selectedWordForDetails, setSelectedWordForDetails] = useState(null);
  const [definitionData, setDefinitionData] = useState(null);
  const [definitionLoading, setDefinitionLoading] = useState(false);
  const [definitionError, setDefinitionError] = useState(null);
  const [speechAvailable, setSpeechAvailable] = useState(false);
  const [voices, setVoices] = useState([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState(null);
  const synthRef = useRef(null);
  const audioContextRef = useRef(null);
  const [accentThemeKey, setAccentThemeKey] = useState(() => {
    return localStorage.getItem('accentTheme') || 'commandPurple';
  });

  // --- Effects ---
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  }, [isDarkMode]);

  // Effect to update CSS variables when accent theme changes
  useEffect(() => {
    const theme = colorThemes[accentThemeKey];
    if (theme) {
      document.documentElement.style.setProperty('--color-accent', theme.light);
      document.documentElement.style.setProperty('--color-accent-dark', theme.dark);
      localStorage.setItem('accentTheme', accentThemeKey); // Save preference
    }
  }, [accentThemeKey]);

  useEffect(() => {
    if (timerActive) {
      if (startTime === null) {
        setStartTime(Date.now());
      }
      timerIntervalRef.current = setInterval(() => {
        setElapsedTime((Date.now() - (startTime ?? Date.now())) / 1000);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [timerActive, startTime]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setSpeechAvailable(true);
      synthRef.current = window.speechSynthesis;

      const loadVoices = () => {
        const availableVoices = synthRef.current.getVoices();
        if (availableVoices.length > 0) {
          const enVoices = availableVoices.filter(v => v.lang.startsWith('en'));
          setVoices(enVoices.length > 0 ? enVoices : availableVoices);
          if (!selectedVoiceURI && availableVoices.length > 0) {
            const defaultVoice = availableVoices.find(v => v.default) || availableVoices[0];
            if (defaultVoice) {
              setSelectedVoiceURI(defaultVoice.voiceURI);
            }
          }
        } else {
          console.log("Waiting for voices to load...");
        }
      };

      loadVoices();
      if (synthRef.current.onvoiceschanged !== undefined) {
        synthRef.current.onvoiceschanged = loadVoices;
      }

      return () => {
        if (synthRef.current && synthRef.current.onvoiceschanged !== undefined) {
          synthRef.current.onvoiceschanged = null;
        }
        if(synthRef.current?.speaking) {
          synthRef.current.cancel();
        }
      };
    } else {
      setSpeechAvailable(false);
      console.warn("Speech Synthesis not supported by this browser.");
    }
  }, [selectedVoiceURI]);

  const splitWords = useCallback((text) => {
    if (!text) return [];
    if (checkPunctuation) {
      return text.trim().split(/\s+/);
    } else {
      return text.trim().split(/\s+/).map(word =>
        word.replace(/^[.,!?;:\"\'\(\)]+|[.,!?;:\"\'\(\)]+$/g, '')
      ).filter(word => word.length > 0);
    }
  }, [checkPunctuation]);

  useEffect(() => {
    setCheckResults(null);
    setMisspelledWords([]);
    setUserInput('');
    setCurrentWordIndex(0);
    setElapsedTime(0);
    setWpm(0);
    setStartTime(null);
    setTimerActive(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setSelectedWordForDetails(null);
    setDefinitionData(null);
    setDefinitionError(null);
    if (selectedLevel && selectedLevel !== 'custom') {
      const storiesForLevel = stories[selectedLevel] || [];
      setAvailableStories(storiesForLevel);
      setSelectedStoryTitle('');
      setStoryText('Please select a story.');
      setOriginalWords([]);
      setIsCustomMode(false);
    } else if (selectedLevel === 'custom') {
      setAvailableStories([]);
      setSelectedStoryTitle('');
      setStoryText('');
      setOriginalWords(splitWords(customText));
      setIsCustomMode(true);
    } else {
      setAvailableStories([]);
      setSelectedStoryTitle('');
      setStoryText('Please select a level and story, or choose Custom Text.');
      setOriginalWords([]);
      setIsCustomMode(false);
    }
  }, [selectedLevel, customText, splitWords, checkPunctuation]);

  useEffect(() => {
    setCheckResults(null);
    setMisspelledWords([]);
    setCurrentWordIndex(0);
    setUserInput('');
    setSelectedWordForDetails(null);
    setDefinitionData(null);
    setDefinitionError(null);
    if (selectedStoryTitle && !isCustomMode) {
      const story = availableStories.find(s => s.title === selectedStoryTitle);
      const text = story ? story.text : 'Error: Story not found.';
      setStoryText(text);
      setOriginalWords(splitWords(text));
    } else if (!isCustomMode && selectedLevel && selectedLevel !== 'custom') {
      setStoryText('Please select a story.');
      setOriginalWords([]);
    }
  }, [selectedStoryTitle, availableStories, isCustomMode, selectedLevel, splitWords, checkPunctuation]);

  useEffect(() => {
    if (isCustomMode) {
      setOriginalWords(splitWords(customText));
      setCheckResults(null);
      setMisspelledWords([]);
      setCurrentWordIndex(0);
      setSelectedWordForDetails(null);
      setDefinitionData(null);
      setDefinitionError(null);
    }
  }, [isCustomMode, customText, splitWords, checkPunctuation]);

  // --- Handlers ---
  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);
  const toggleOptions = () => setOptionsCollapsed(!optionsCollapsed);
  const handleLevelChange = (e) => setSelectedLevel(e.target.value);
  const handleStoryChange = (e) => setSelectedStoryTitle(e.target.value);
  const handleCustomTextChange = (e) => setCustomText(e.target.value);

  const playBeep = () => {
    if (typeof window === 'undefined') return;
    if (!audioContextRef.current) {
       try {
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
       } catch (e) {
          console.error("Web Audio API is not supported by this browser.", e);
          return; // Cannot play beep
       }
    }
    const audioContext = audioContextRef.current;
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'triangle'; // Less harsh than square
    oscillator.frequency.setValueAtTime(660, audioContext.currentTime); // Frequency in Hz (E5 note)
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime); // Volume (0 to 1)

    oscillator.start(audioContext.currentTime);
    // Ramp down gain quickly for a short beep
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.15); // Beep duration 150ms
    oscillator.stop(audioContext.currentTime + 0.15);
  };

  const handleUserInputChange = (e) => {
    const previousValue = userInput;
    const newValue = e.target.value;
    setUserInput(newValue);

    if (!timerActive && newValue.length > 0 && originalWords.length > 0) {
      setStartTime(Date.now());
      setElapsedTime(0);
      setTimerActive(true);
    }
    if (timerActive && newValue.length === 0) {
        setTimerActive(false);
        setStartTime(null);
        setElapsedTime(0);
        setWpm(0);
         if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    const typedWordsArray = splitWords(newValue);
    let currentIdx = typedWordsArray.length;
    if (newValue.endsWith(' ') && newValue.trim().length > 0) {} else if (typedWordsArray.length > 0 && !newValue.endsWith(' ')) {
        currentIdx = Math.max(0, typedWordsArray.length - 1);
    }
    setCurrentWordIndex(currentIdx);

    if (readNextWord && speechAvailable && synthRef.current && newValue.endsWith(' ') && newValue.length > previousValue.length) {
      console.log("[Debug] Space detected, checking last word...");
      const lastTypedWordIndex = typedWordsArray.length - 1;
      const lastTypedWord = typedWordsArray[lastTypedWordIndex];
      const originalWordToCompare = originalWords[lastTypedWordIndex];

      if (lastTypedWord && originalWordToCompare) {
        const isLastWordCorrect = caseSensitive
          ? lastTypedWord === originalWordToCompare
          : lastTypedWord.toLowerCase() === originalWordToCompare.toLowerCase();

        console.log(`[Debug] Last Typed: "${lastTypedWord}", Original: "${originalWordToCompare}", Correct: ${isLastWordCorrect}`);

        if (isLastWordCorrect) {
          const nextWordToReadIndex = typedWordsArray.length;
          const nextWordToRead = originalWords[nextWordToReadIndex];
          if (nextWordToRead) {
            console.log(`[Debug] Attempting to speak next word: "${nextWordToRead}"`);
            speakWord(nextWordToRead);
          } else {
            console.log("[Debug] No next word to speak.");
          }
        } else {
          console.log("[Debug] Last word incorrect, playing beep.");
          playBeep();
        }
      }
    }
  };

  const handleReset = () => {
    setUserInput('');
    setCheckResults(null);
    setMisspelledWords([]);
    setCurrentWordIndex(0);
    setTimerActive(false);
    setStartTime(null);
    setElapsedTime(0);
    setWpm(0);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setSelectedWordForDetails(null);
    setDefinitionData(null);
    setDefinitionError(null);

    if (synthRef.current?.speaking) {
        synthRef.current.cancel();
    }

    if (isCustomMode) {
      // Optional: Clear custom text on reset?
      // setCustomText('');
      // setOriginalWords([]);
    }
  };

  const handleCheckSpelling = () => {
    setTimerActive(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    const textToCompare = isCustomMode ? customText : storyText;
    if (!textToCompare || !userInput) {
      console.error("Missing text or input for checking.");
      setCheckResults(null);
      setMisspelledWords([]);
      setWpm(0);
      return;
    }

    const currentOriginalWords = splitWords(textToCompare);
    const typedWords = splitWords(userInput);
    const feedback = [];
    const errors = [];
    let correctWordCount = 0;

    const maxLength = Math.max(currentOriginalWords.length, typedWords.length);

    for (let i = 0; i < maxLength; i++) {
      const originalWord = currentOriginalWords[i] || "";
      const typedWord = typedWords[i] || "";
      let isCorrect = false;

      if (originalWord && typedWord) {
        const comparisonOriginal = caseSensitive ? originalWord : originalWord.toLowerCase();
        const comparisonTyped = caseSensitive ? typedWord : typedWord.toLowerCase();
        isCorrect = comparisonOriginal === comparisonTyped;
      }

      feedback.push({
        typed: typedWord,
        correct: originalWord,
        isCorrect: isCorrect,
      });

      if (isCorrect) {
        correctWordCount++;
      }

      if (!isCorrect && typedWord && originalWord) {
        errors.push({
          typed: typedWord,
          correct: originalWord,
        });
      }
    }

    setCheckResults(feedback);
    setMisspelledWords(errors);

    const durationMinutes = elapsedTime / 60;
    const wordsForWPM = typedWords.length;
    if (durationMinutes > 0 && wordsForWPM > 0) {
      const calculatedWpm = Math.round(wordsForWPM / durationMinutes);
      setWpm(calculatedWpm);
    } else {
      setWpm(0);
    }
  };

  const fetchDefinition = async (word) => {
    const cleanedWordForAPI = word.replace(/^[.,!?;:\"\'\(\)]+|[.,!?;:\"\'\(\)]+$/g, '').toLowerCase();
    if (!cleanedWordForAPI) return;

    setSelectedWordForDetails(word);
    setDefinitionLoading(true);
    setDefinitionData(null);
    setDefinitionError(null);

    try {
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${cleanedWordForAPI}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`No definition found for '${cleanedWordForAPI}'.`);
        } else {
          throw new Error(`API error: ${response.statusText}`);
        }
      }
      const data = await response.json();
      if (data && data.length > 0 && data[0].meanings && data[0].meanings.length > 0) {
         const firstMeaning = data[0].meanings[0];
         const definitionInfo = {
             word: data[0].word,
             phonetic: data[0].phonetic || (data[0].phonetics && data[0].phonetics.find(p=>p.text)?.text),
             partOfSpeech: firstMeaning.partOfSpeech,
             definition: firstMeaning.definitions[0]?.definition,
             example: firstMeaning.definitions[0]?.example,
             audio: data[0].phonetics?.find(p => p.audio)?.audio
         };
         setDefinitionData(definitionInfo);
      } else {
         throw new Error(`No definition found for '${cleanedWordForAPI}'.`);
      }
    } catch (error) {
      console.error("Definition fetch error:", error);
      setDefinitionError(error.message);
    } finally {
      setDefinitionLoading(false);
    }
  };

  const speakWord = (wordToSpeak) => {
    const cleanedWordToSpeak = checkPunctuation ? wordToSpeak.replace(/[.,!?;:\"\'\(\)]+$/, '').toLowerCase() : wordToSpeak;
    if (!speechAvailable || !synthRef.current || !cleanedWordToSpeak) {
      return;
    }
    try {
        if(synthRef.current.speaking) {
            synthRef.current.cancel();
        }
    } catch (e) { console.error("Error cancelling speech:", e); }
    const utterance = new SpeechSynthesisUtterance(cleanedWordToSpeak);
    const selectedVoice = voices.find(voice => voice.voiceURI === selectedVoiceURI);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    } else {
        console.warn("Selected voice not found, using default.");
    }
    utterance.onerror = (event) => {
        console.error("SpeechSynthesisUtterance.onerror - Error:", event.error, event);
    };
    try {
        synthRef.current.speak(utterance);
    } catch (e) {
        console.error("Error calling synth.speak():", e);
    }
  };

  // Panel styles: white opaque (light mode) vs dark transparent glass (dark mode)
  const glassPanelStyles = `border backdrop-blur-lg shadow-soft-xl rounded-2xl transition-colors duration-300 ${
    isDarkMode ? 'border-dark-border-soft/50 bg-dark-panel/70' : 'border-border-soft bg-white' // Opaque white in light mode, remove blur? Maybe keep blur?
  }`;

  // --- Render ---
  return (
    // Force dark background always, apply text color based on mode only for direct children if needed
    // The glow effect class only applies if 'dark' class is present on html/parent
    <div className={`\
      min-h-screen flex flex-col \
      bg-dark-bg \
      ${isDarkMode ? 'text-dark-text-main' : 'text-text-main'} /* Text for direct children? */ \
      transition-colors duration-300 \
      relative overflow-hidden \
      dark:before:absolute dark:before:inset-0 dark:before:-z-10 \
      dark:before:bg-[radial-gradient(circle_at_50%_30%,_theme(colors.glow-color)_0%,_transparent_70%)] \
    `}>

      {/* Header - Force dark panel style always */}
      <header className="bg-dark-panel shadow-soft-lg p-3 lg:p-4 flex justify-between items-center sticky top-0 z-20">
        {/* Wrap title and icon */}
        <div className="flex items-center gap-2 lg:gap-3">
          {/* Simple Speech Bubble SVG Icon - Use accent color */}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 lg:h-7 lg:w-7 text-accent flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-2.688a1.125 1.125 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
          {/* Apply gradient animation classes to H1 */}
          <h1 className="
            text-xl lg:text-2xl font-bold 
            bg-gradient-to-r from-accent via-dark-text-main to-accent 
            bg-clip-text text-transparent 
            bg-[length:200%_auto] 
            animate-text-gradient
          ">
            Spelling Practice Tool
          </h1>
        </div>
        {/* Toggle button */}
        <button onClick={toggleDarkMode} className="p-2 rounded-full bg-dark-border-soft text-dark-text-secondary hover:opacity-80 transition">
            <span className={`transform inline-block transition-transform duration-300 ease-in-out ${isDarkMode ? 'rotate-180' : 'rotate-0'}`}>
              {isDarkMode ? '☀️' : '🌙'}
            </span>
        </button>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 container mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 relative z-10">

        <main className={`lg:col-span-2 p-4 lg:p-6 space-y-4 lg:space-y-6 ${glassPanelStyles}`}>
             {/* Adjust select backgrounds for new themes */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <label htmlFor="levelSelect" className={`block text-xs lg:text-sm font-medium mb-1 ${isDarkMode ? 'text-dark-text-secondary' : 'text-text-secondary'}`}>Level</label>
                      <select
                          id="levelSelect"
                          value={selectedLevel}
                          onChange={handleLevelChange}
                          className={`w-full p-2 lg:p-2.5 border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent transition text-sm lg:text-base ${isDarkMode ? 'border-dark-border-soft bg-dark-bg text-dark-text-main' : 'border-border-soft bg-white text-text-main'}`}
                      >
                          <option value="">Select Level</option>
                          <option value="custom">-- Custom Text --</option>
                          <option value="beginner">Beginner</option>
                          <option value="medium">Medium</option>
                          <option value="advanced">Advanced</option>
                      </select>
                  </div>
                   <div>
                      <label htmlFor="storySelect" className={`block text-xs lg:text-sm font-medium mb-1 ${isDarkMode ? 'text-dark-text-secondary' : 'text-text-secondary'}`}>Story</label>
                      <select
                          id="storySelect"
                          value={selectedStoryTitle}
                          onChange={handleStoryChange}
                          disabled={!selectedLevel || selectedLevel === 'custom'}
                          className={`w-full p-2 lg:p-2.5 border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent transition disabled:opacity-50 disabled:cursor-not-allowed text-sm lg:text-base ${isDarkMode ? 'border-dark-border-soft bg-dark-bg text-dark-text-main' : 'border-border-soft bg-white text-text-main'}`}
                      >
                          <option value="">Select Story</option>
                          {availableStories.map((story) => (
                            <option key={story.title} value={story.title}>{story.title}</option>
                          ))}
                      </select>
                  </div>
              </div>

             {/* Adjust text display area background */}
             {!isCustomMode && storyText && originalWords.length > 0 && (
               <div className={`border rounded-xl p-4 pt-10 lg:pt-10 min-h-[150px] relative transition ${isDarkMode ? 'border-dark-border-soft/30 bg-dark-bg/50' : 'border-border-soft bg-cream-panel/50'}`}>
                    {/* Read Next Word Toggle */}
                    {speechAvailable && (
                       <div className="absolute top-2 right-2 flex items-center space-x-2 z-10">
                           <label htmlFor="readNextWordToggleInline" className={`text-xs ${isDarkMode ? 'text-dark-text-secondary' : 'text-text-secondary'}`}>Read Next</label>
                           <SwitchToggle enabled={readNextWord} setEnabled={setReadNextWord} />
                       </div>
                     )}
                     {!speechAvailable && readNextWord && (
                         <div className="absolute top-2 right-2"><p className="text-xs text-red-500">(Speech N/A)</p></div> )
                     }
                 {/* Text Content */}
                 <p className={`whitespace-pre-wrap leading-relaxed break-words font-serif text-base lg:text-lg ${isDarkMode ? 'text-dark-text-main' : 'text-text-main'}`}>
                   {originalWords.map((word, index) => (
                     <React.Fragment key={index}>
                       <span
                         onClick={() => fetchDefinition(word)}
                         className={`p-0.5 rounded transition-colors duration-150 cursor-pointer hover:bg-accent/20 dark:hover:bg-accent/20 ${index === currentWordIndex ? 'bg-accent/40 dark:bg-accent/40 dark:drop-shadow-[0_0_3px_theme(colors.accent/70%)]' : 'bg-transparent'} ${selectedWordForDetails === word ? 'ring-1 ring-accent dark:ring-accent' : ''}`}
                       >
                         {word}
                       </span>
                       {' '}
                     </React.Fragment>
                   ))}
                 </p>
               </div>
             )}
             {/* Adjust placeholder display background */}
             {!isCustomMode && originalWords.length === 0 && (<div className={`border rounded-xl p-4 min-h-[150px] relative flex items-center justify-center transition ${isDarkMode ? 'border-dark-border-soft/30 bg-dark-bg/50' : 'border-border-soft bg-cream-panel/50'}`}><p className={`italic text-sm lg:text-base ${isDarkMode ? 'text-dark-text-secondary' : 'text-text-secondary'}`}>{storyText}</p></div>)}

             {/* Adjust custom text input background */}
             {isCustomMode && ( <div><label htmlFor="customTextInput" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-dark-text-secondary' : 'text-text-secondary'}`}>Enter Custom Text</label><textarea id="customTextInput" value={customText} onChange={handleCustomTextChange} placeholder="Paste or type your custom text here..." className={`w-full h-40 p-3 border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent transition resize-y text-base lg:text-lg ${isDarkMode ? 'border-dark-border-soft bg-dark-bg text-dark-text-main' : 'border-border-soft bg-white text-text-main'}`}/></div>)}

             {/* Adjust user input area background */}
             <div className={`border rounded-xl p-4 transition ${isDarkMode ? 'border-dark-border-soft/30 bg-dark-bg/50' : 'border-border-soft bg-cream-panel/50'}`}>
               <div className="flex justify-between items-center mb-2">
                 <h3 className={`text-base lg:text-lg font-semibold ${isDarkMode ? 'text-dark-text-main' : 'text-text-main'}`}>Type the text</h3>
                 <div className={`flex items-center space-x-2 font-mono text-xs lg:text-sm ${isDarkMode ? 'text-dark-text-secondary' : 'text-text-secondary'}`}>
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                   <span>{formatTime(elapsedTime)}</span>{wpm > 0 && <span className="text-xs font-sans">(WPM: {wpm})</span>}
                 </div>
               </div>
               <textarea
                 value={userInput}
                 onChange={handleUserInputChange}
                 placeholder={isCustomMode ? "Start typing..." : "Start typing the text above..."}
                 disabled={originalWords.length === 0}
                 className={`w-full h-32 p-3 border rounded-lg font-serif text-base lg:text-lg focus:ring-2 focus:ring-accent focus:border-transparent transition resize-none disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode ? 'border-dark-border-soft bg-dark-panel text-dark-text-main' : 'border-border-soft bg-white text-text-main'}`}
               />
               {/* Buttons (Check Spelling already uses accent) */}
               <div className="mt-4 flex justify-between items-center">
                 <button
                   onClick={handleReset}
                   className={`text-xs lg:text-sm flex items-center space-x-1 transition disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode ? 'text-dark-text-secondary hover:text-red-400' : 'text-text-secondary hover:text-red-600'}`}
                   disabled={!userInput && !customText && elapsedTime === 0}
                 >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9M4 12v5h.582m15.356 2A8.001 8.001 0 004.582 17M4 20v-5h.582m15.356-2a8.001 8.001 0 00-14.774 0"></path></svg>
                    <span>Reset</span>
                 </button>
                 <button
                   onClick={handleCheckSpelling}
                   disabled={!userInput}
                   className="bg-accent hover:bg-accent-dark dark:shadow-[0_0_15px_theme(colors.accent/50%)] text-white font-bold py-2 px-4 lg:px-5 rounded-lg flex items-center space-x-2 transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent dark:focus:ring-offset-dark-bg text-sm lg:text-base"
                 >
                    <span>Check Spelling</span>
                    <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                 </button>
               </div>
             </div>

             {/* Adjust feedback display background */}
             {checkResults && (
                <div className={`mt-6 border rounded-xl p-4 transition ${isDarkMode ? 'border-dark-border-soft/30 bg-dark-bg/50' : 'border-border-soft bg-cream-panel/50'}`}>
                   <h3 className={`text-base lg:text-lg font-semibold mb-3 ${isDarkMode ? 'text-dark-text-main' : 'text-text-main'}`}>Results <span className='text-xs lg:text-sm font-normal text-text-secondary'> (WPM: {wpm})</span></h3>
                   <div className="whitespace-pre-wrap leading-relaxed font-serif text-base lg:text-lg break-words">
                       {checkResults.map((result, index) => {
                           const correctColor = isDarkMode ? 'text-green-400' : 'text-green-600';
                           const incorrectColor = isDarkMode ? 'text-red-400' : 'text-red-600';
                           const suggestionColor = isDarkMode ? 'text-blue-400' : 'text-blue-600';
                           return (
                               <span key={index} className={`mr-1 ${result.isCorrect ? correctColor : incorrectColor}`}>
                                   <span className={result.isCorrect ? '' : 'line-through decoration-red-500 decoration-2'}>{result.typed || ''}</span>
                                   {!result.isCorrect && result.typed && result.correct && (
                                       <span className={`${suggestionColor} no-underline ml-1 decoration-transparent font-sans text-sm lg:text-base`}>({result.correct})</span>
                                   )}
                               </span>
                           );
                       })}
                   </div>
                </div>
             )}

             {/* Adjust misspelled words list background */}
             {misspelledWords.length > 0 && (
                <div className="mt-4 border border-accent/50 dark:border-accent/50 rounded-xl p-4 bg-accent/5 dark:bg-accent/10"><h3 className="text-md font-semibold mb-2 text-accent-dark dark:text-accent">Words to Review</h3><ul className="list-disc list-inside text-sm text-accent-dark/90 dark:text-accent/90 space-y-1">{misspelledWords.map((error, index) => (<li key={index}><span className='font-medium'>{error.typed}</span> (should be: <span className='font-medium'>{error.correct}</span>)</li>))}</ul></div>)}

        </main>

        {/* Right Column Container */}
        <div className="lg:col-span-1 flex flex-col gap-6 lg:gap-8">

          {/* Options Panel */}
          <aside className={`p-4 lg:p-6 h-fit transition lg:sticky lg:top-[calc(80px)] ${glassPanelStyles}`}>
              <div className="flex justify-between items-center mb-4 cursor-pointer" onClick={toggleOptions}>
                 <h2 className={`text-lg lg:text-xl font-semibold ${isDarkMode ? 'text-dark-text-main' : 'text-text-main'}`}>Options</h2>
                 <svg className={`w-5 h-5 transform transition-transform duration-200 ${optionsCollapsed ? 'rotate-0' : 'rotate-180'} ${isDarkMode ? 'text-dark-text-secondary' : 'text-text-secondary'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
              <div className={`transition-all duration-300 ease-in-out overflow-hidden ${optionsCollapsed ? 'max-h-0 opacity-0' : 'max-h-screen opacity-100'}`}>
                 <div className="space-y-4 lg:space-y-6 pt-2">
                   {/* Spelling Check (Switch uses accent) */}
                   <div> <h3 className={`text-xs lg:text-sm font-medium mb-2 ${isDarkMode ? 'text-dark-text-secondary' : 'text-text-secondary'}`}>Spelling Check</h3> <div className="space-y-2 lg:space-y-3"> <div className="flex items-center justify-between"> <label htmlFor="caseSensitiveToggle" className={`text-sm ${isDarkMode ? 'text-dark-text-main' : 'text-text-main'}`}>Case Sensitive</label> <SwitchToggle enabled={caseSensitive} setEnabled={setCaseSensitive} /> </div> <div className="flex items-center justify-between"> <label htmlFor="checkPunctuationToggle" className={`text-sm ${isDarkMode ? 'text-dark-text-main' : 'text-text-main'}`}>Check Punctuation</label> <SwitchToggle enabled={checkPunctuation} setEnabled={setCheckPunctuation} /> </div> </div> </div>
                   {/* Word Translation (Adjust select bg) */}
                   <div>
                       <h3 className={`text-xs lg:text-sm font-medium mb-2 ${isDarkMode ? 'text-dark-text-secondary' : 'text-text-secondary'}`}>Word Translation</h3>
                       <label htmlFor="translateTo" className="sr-only">Translate to</label>
                       <select
                           id="translateTo"
                           value={translateLanguage}
                           onChange={(e) => setTranslateLanguage(e.target.value)}
                           className={`w-full p-2 lg:p-2.5 border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent transition text-sm lg:text-base ${isDarkMode ? 'border-dark-border-soft bg-dark-bg text-dark-text-main' : 'border-border-soft bg-white text-text-main'}`}
                       >
                          <option>Spanish</option>
                          <option>French</option>
                          <option>German</option>
                          <option>Japanese</option>
                          <option>Sinhala</option>
                       </select>
                   </div>
                 </div>
               </div>
          </aside>

          {/* Word Details Panel */}
          <aside className={`p-4 lg:p-6 h-fit overflow-y-auto lg:sticky lg:top-[calc(80px+2rem)] ${glassPanelStyles}`}>
             <h2 className={`text-lg lg:text-xl font-semibold mb-4 ${isDarkMode ? 'text-dark-text-main' : 'text-text-main'}`}>Word Details</h2>
             <div className="min-h-[150px] lg:min-h-[200px] space-y-4">
                 {!selectedWordForDetails && (<p className={`italic text-xs lg:text-sm ${isDarkMode ? 'text-dark-text-secondary' : 'text-text-secondary'}`}>Click word in text for details.</p>)}
                 {definitionLoading && (<p className={`text-xs lg:text-sm ${isDarkMode ? 'text-dark-text-secondary' : 'text-text-secondary'}`}>Loading "{selectedWordForDetails}"...</p>)}
                 {definitionError && (<p className="text-red-500 dark:text-red-400 text-xs lg:text-sm">Error: {definitionError}</p>)}
                 {definitionData && (
                     <div className="space-y-3">
                         <h3 className="text-base lg:text-lg font-bold text-accent dark:text-accent dark:drop-shadow-[0_0_4px_theme(colors.accent/60%)]">{definitionData.word}</h3>
                         {definitionData.phonetic && <p className={`text-sm lg:text-md ${isDarkMode ? 'text-dark-text-secondary' : 'text-text-secondary'}`}>{definitionData.phonetic}</p>}
                         <p className={`text-xs uppercase tracking-wider font-semibold ${isDarkMode ? 'text-dark-text-secondary' : 'text-text-secondary'}`}>{definitionData.partOfSpeech}</p>
                         <p className={`text-sm lg:text-base ${isDarkMode ? 'text-dark-text-main' : 'text-text-main'}`}>{definitionData.definition}</p>
                         {definitionData.example && <p className={`text-xs lg:text-sm italic ${isDarkMode ? 'text-dark-text-secondary' : 'text-text-secondary'}`}><span className='font-medium text-gray-500'>e.g.</span> "{definitionData.example}"</p>}
                         <a href={`https://translate.google.com/?sl=en&tl=${translateLanguage.toLowerCase().substring(0,2)}&text=${encodeURIComponent(definitionData.word)}&op=translate`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-accent hover:bg-accent-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent mt-3 transition">
                             Translate <svg className="ml-1.5 -mr-0.5 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                         </a>
                     </div>
                 )}
             </div>
          </aside>
        </div>

      </div>

      {/* Footer - Force dark panel style always */}
      <footer className="bg-dark-panel shadow-inner mt-auto p-3 lg:p-4 text-center text-xs text-dark-text-secondary">
          Spelling Practice Tool &copy; {new Date().getFullYear()}
      </footer>

    </div>
  );
}

export default App;
