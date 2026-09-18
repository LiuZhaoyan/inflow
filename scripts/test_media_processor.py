import unittest
from types import SimpleNamespace
from media_processor import meaning_groups, sentences

class ProcessingTests(unittest.TestCase):
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

if __name__ == '__main__': unittest.main()
