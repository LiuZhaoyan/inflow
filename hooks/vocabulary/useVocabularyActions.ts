'use client';

import { useState } from 'react';
import type { Dispatch, FormEvent, SetStateAction } from 'react';
import type { VocabularyWord } from '@/lib/types/vocabulary';

interface VocabularyActionsOptions {
  words: VocabularyWord[];
  setWords: Dispatch<SetStateAction<VocabularyWord[]>>;
}

export default function useVocabularyActions({ words, setWords }: VocabularyActionsOptions) {
  const [generating, setGenerating] = useState<Record<string, { img?: boolean; audio?: boolean }>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [newDefinition, setNewDefinition] = useState('');
  const [addingStatus, setAddingStatus] = useState<'idle' | 'saving'>('idle');

  const handleAddWord = async (e: FormEvent) => {
    e.preventDefault();
    if (!newWord.trim()) return;

    setAddingStatus('saving');

    try {
      const saveRes = await fetch('/api/vocabulary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: newWord,
          definition: newDefinition,
        }),
      });

      if (saveRes.ok) {
        const created = await saveRes.json();
        setWords(prev => [created, ...prev]);
        setNewWord('');
        setNewDefinition('');
        setIsAdding(false);

        if (created?.id && !created?.imagePath) {
          void generateImageForWord(created);
        }
      } else {
        throw new Error('Failed to create card');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to create card. Please check your API keys and try again.');
    } finally {
      setAddingStatus('idle');
    }
  };

  const pollForImage = async (taskId: string): Promise<string> => {
    return new Promise((resolve) => {
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/ai-depict?taskId=${taskId}`);
          const data = await res.json();
          if (data.status === 'completed') {
            clearInterval(interval);
            resolve(data.imageUrl);
          } else if (data.status === 'failed') {
            clearInterval(interval);
            resolve('');
          }
        } catch {
          clearInterval(interval);
          resolve('');
        }
      }, 2000);
    });
  };

  const setGeneratingState = (id: string, key: 'img' | 'audio', value: boolean) => {
    setGenerating(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [key]: value } }));
  };

  const generateImageForWord = async (word: VocabularyWord) => {
    setGeneratingState(word.id, 'img', true);
    try {
      const res = await fetch('/api/ai-depict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Create a single-panel, flat illustration that unambiguously shows the meaning of the word "${word.word}" using a human action or clear object interaction. Avoid symbolic or indirect cues (e.g., for "hot" show a person holding a steaming cup and fanning their mouth or a hand near a steaming pan, NOT the sun). For function/abstract words (e.g., "say", "no", "thank you", "sorry") show a clear face-to-face interaction with expressive gestures (speaking mouth for "say", head shake/hand stop for "no", slight bow and thankful gesture for "thank you", apologetic posture for "sorry"). Flashcard-friendly, white background, single focal action, 1–3 contextual props, no text/letters, high contrast, kid-friendly, universal symbols.`
        })
      });
      if (!res.ok) throw new Error('Image task start failed');
      const data = await res.json();
      let imagePath = '';
      if (data.taskId) {
        const remoteUrl = await pollForImage(data.taskId);
        if (remoteUrl) {
          try {
            const saveRes = await fetch('/api/save-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: remoteUrl })
            });
            const saveData = await saveRes.json();
            imagePath = saveData.url || '';
          } catch {
            imagePath = remoteUrl;
          }
        }
      }
      if (imagePath) {
        const putRes = await fetch('/api/vocabulary', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: word.id, imagePath })
        });
        if (putRes.ok) {
          setWords(prev => prev.map(w => w.id === word.id ? { ...w, imagePath } : w));
        }
      }
    } catch (err) {
      console.error('Generate image failed', err);
      alert('Failed to generate image');
    } finally {
      setGeneratingState(word.id, 'img', false);
    }
  };

  const generateAudioForWord = async (word: VocabularyWord) => {
    setGeneratingState(word.id, 'audio', true);
    try {
      const res = await fetch('/api/ai-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: word.word })
      });
      if (!res.ok) throw new Error('TTS failed');
      const data = await res.json();
      const audioPath = data.url || '';
      if (audioPath) {
        const putRes = await fetch('/api/vocabulary', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: word.id, audioPath })
        });
        if (putRes.ok) {
          setWords(prev => prev.map(w => w.id === word.id ? { ...w, audioPath } : w));
        }
      }
    } catch (err) {
      console.error('Generate audio failed', err);
      alert('Failed to generate pronunciation');
    } finally {
      setGeneratingState(word.id, 'audio', false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this card?')) return;
    await fetch(`/api/vocabulary?id=${id}`, { method: 'DELETE' });
    setWords(prev => prev.filter(w => w.id !== id));
  };

  const playAudio = (path: string) => {
    try {
      const audio = new Audio(path);
      audio.play();
    } catch (e) {
      console.error('Failed to play audio', e);
    }
  };

  return {
    generating,
    isAdding,
    newWord,
    newDefinition,
    addingStatus,
    setIsAdding,
    setNewWord,
    setNewDefinition,
    handleAddWord,
    handleDelete,
    generateImageForWord,
    generateAudioForWord,
    playAudio,
  };
}
