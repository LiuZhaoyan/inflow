import unittest
from media_processor import ProcessingError, analyze_vocabulary


class VocabularyLookupTests(unittest.TestCase):
    def test_contextual_dictionary_forms(self):
        for surface, sentence, lemma in [
            ('갔어요', '어제 친구하고 학교에 갔어요.', '가다'),
            ('먹었어요', '어제 밥을 먹었어요.', '먹다'),
            ('예뻐요', '꽃이 예뻐요.', '예쁘다'),
            ('학생이에요', '저는 학생이에요.', '학생'),
            ('공부했어요', '한국어를 공부했어요.', '공부하다'),
            ('걸었어요', '공원을 걸었어요.', '걷다'),
            ('학교에서', '학교에서 공부해요.', '학교'),
        ]:
            with self.subTest(surface=surface):
                self.assertEqual(analyze_vocabulary({'surface': surface, 'sentence': sentence,
                    'start': sentence.index(surface), 'language': 'ko'}),
                    {'surface': surface, 'lemma': lemma, 'language': 'ko'})

    def test_offsets_and_invalid_selections(self):
        sentence = '😀 학교에 갔다가 학교에 왔어요.'
        start = sentence.rindex('학교에')
        offset = len(sentence[:start].encode('utf-16-le')) // 2
        self.assertEqual(analyze_vocabulary({'surface': '학교에', 'sentence': sentence, 'start': offset, 'language': 'ko'})['lemma'], '학교')
        for invalid in [
            {'surface': '학교에 갔어요', 'sentence': '학교에 갔어요.', 'start': 0, 'language': 'ko'},
            {'surface': '갔어요', 'sentence': '학교에 갔어요.', 'start': 0, 'language': 'ko'},
            {'surface': '가', 'sentence': '😀 가요.', 'start': 1, 'language': 'ko'},
            {'surface': '갔어요', 'sentence': '갔어요.', 'start': 0, 'language': 'en'},
        ]:
            with self.subTest(input=invalid), self.assertRaises(ProcessingError):
                analyze_vocabulary(invalid)


if __name__ == '__main__':
    unittest.main()
