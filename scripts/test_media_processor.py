import unittest
import os
import wave
from tempfile import TemporaryDirectory
from types import SimpleNamespace
from unittest.mock import patch
from media_processor import ProcessingError, meaning_groups, probe, sentences, translate
from faster_whisper.audio import decode_audio

class ProcessingTests(unittest.TestCase):
    def test_audio_decoder_accepts_installed_dependencies(self):
        with TemporaryDirectory() as directory:
            filename = os.path.join(directory, 'sample.wav')
            with wave.open(filename, 'wb') as audio:
                audio.setparams((1, 2, 16000, 0, 'NONE', 'not compressed'))
                audio.writeframes(b'\x00' * 640)
            self.assertEqual(decode_audio(filename).size, 320)

    def test_probe_reads_media_duration_without_loading_asr(self):
        with TemporaryDirectory() as directory:
            filename = os.path.join(directory, 'sample.wav')
            with wave.open(filename, 'wb') as audio:
                audio.setparams((1, 2, 16000, 0, 'NONE', 'not compressed'))
                audio.writeframes(b'\x00' * 32000)
            self.assertAlmostEqual(probe(filename)['duration'], 1)

    def test_groups_preserve_text_and_complete_phrases(self):
        text = '저는 오늘 학교에서 한국어를 배워요.'
        groups = meaning_groups(text)
        self.assertEqual(''.join(groups).replace(' ', ''), text.replace(' ', ''))
        self.assertIn('저는', groups)
        self.assertIn('오늘 학교에서', groups)
        self.assertEqual(meaning_groups('안녕하세요.'), ['안녕하세요.'])
        self.assertEqual(meaning_groups('좋은 날씨를 좋아해요.'), ['좋은 날씨를', '좋아해요.'])

    def test_sentences_follow_real_word_times(self):
        words = [SimpleNamespace(word=t,start=s,end=e) for t,s,e in [(' 안녕하세요.',0.2,1),(' 저는',1.2,1.5),(' 학생입니다.',1.5,3)]]
        result = sentences(words)
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0]['start'],0.2)
        self.assertEqual(result[1]['text'],'저는 학생입니다.')
        self.assertEqual(result[1]['end'],3)
        self.assertEqual(sentences([]),[])

        unpunctuated = [SimpleNamespace(word=t,start=s,end=e) for t,s,e in [(' 안녕하세요',0.2,1),(' 저는',1.1,1.3),(' 학생입니다',1.3,2),(' 한국어를',2.1,2.5),(' 공부해요',2.5,3)]]
        self.assertEqual([(s['text'], s['start'], s['end']) for s in sentences(unpunctuated)], [('안녕하세요',0.2,1),('저는 학생입니다',1.1,2),('한국어를 공부해요',2.1,3)])

        paused_clause = [SimpleNamespace(word=t,start=s,end=e) for t,s,e in [(' 교환학생으로',0.2,0.8),(' 대만에',1,1.5),(' 왔을 때',1.5,2.2),(' 많이',3.4,3.7),(' 배웠어요.',3.7,4.5)]]
        self.assertEqual([s['text'] for s in sentences(paused_clause)], ['교환학생으로 대만에 왔을 때 많이 배웠어요.'])

    def test_translation_uses_configured_models_directory(self):
        with TemporaryDirectory() as directory, patch.dict(os.environ, {'INFLOW_MODELS_DIR': directory}):
            with self.assertRaisesRegex(ProcessingError, '翻译模型尚未安装'):
                translate('안녕하세요.')

if __name__ == '__main__': unittest.main()
