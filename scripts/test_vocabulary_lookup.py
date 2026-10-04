import json
import tempfile
import unittest
import zipfile
from pathlib import Path

from import_english_dictionary import import_dictionary
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
            {'surface': '갔어요', 'sentence': '갔어요.', 'start': 0, 'language': 'ja'},
        ]:
            with self.subTest(input=invalid), self.assertRaises(ProcessingError):
                analyze_vocabulary(invalid)

    def test_english_dictionary_forms_retain_complete_words_and_contextual_lemmas(self):
        for surface, sentence, lemma in [
            ('Running', 'Running every day feels good.', 'run'),
            ('children', 'The children are playing.', 'child'),
            ('London', 'I visited London yesterday.', 'London'),
            ("don't", "They don't know the answer.", "don't"),
            ("Don't", "Don't forget your keys.", "don't"),
            ("I'm", "I'm ready to go.", "I'm"),
            ("teacher’s", "The teacher’s book is here.", 'teacher'),
            ("mom's", "My mom's home.", "mom's"),
            ("dog's", "The dog's barking.", "dog's"),
            ("teacher's", "My teacher's book.", 'teacher'),
            ("teachers'", "The teachers' new book is here.", 'teacher'),
            ("teachers’", "The teachers’ new book is here.", 'teacher'),
            ('teachers', "They call them 'the teachers'.", 'teacher'),
            ('well-known', 'It is a well-known story.', 'well-known'),
            ('very-well-known', 'It is a very-well-known story.', 'very-well-known'),
            ('José', 'José enjoys the music.', 'José'),
            ('children', "They call them 'children'.", 'child'),
        ]:
            with self.subTest(surface=surface):
                self.assertEqual(analyze_vocabulary({
                    'surface': surface,
                    'sentence': sentence,
                    'start': len(sentence[:sentence.index(surface)].encode('utf-16-le')) // 2,
                    'language': 'en',
                }), {'surface': surface, 'lemma': lemma, 'language': 'en'})

    def test_english_selection_must_be_one_complete_original_word(self):
        sentence = "😀 They don't know this well-known story."
        invalid = [
            ('don', sentence, sentence.index("don't")),
            ('t', sentence, sentence.index("don't") + 4),
            ('well', sentence, sentence.index('well-known')),
            ('well-known story', sentence, sentence.index('well-known')),
            ('well-known', 'very-well-known story', 'very-well-known story'.index('well-known')),
        ]
        for surface, source_sentence, character_offset in invalid:
            with self.subTest(surface=surface), self.assertRaises(ProcessingError):
                analyze_vocabulary({
                    'surface': surface,
                    'sentence': source_sentence,
                    'start': len(source_sentence[:character_offset].encode('utf-16-le')) // 2,
                    'language': 'en',
                })

    def test_english_dictionary_importer_extracts_realistic_senses(self):
        with tempfile.TemporaryDirectory() as directory:
            archive = Path(directory) / 'freedict.zip'
            destination = Path(directory) / 'english.json'
            tei = '''<?xml version="1.0" encoding="UTF-8"?>
            <TEI xmlns="http://www.tei-c.org/ns/1.0"><text><body>
              <entry><form><orth>book</orth></form><sense><cit type="trans"><quote>书</quote></cit><cit type="trans"><quote>预订</quote></cit></sense></entry>
              <entry><form><orth>run</orth></form><sense><cit type="trans"><quote>跑</quote></cit><cit type="trans"><quote>经营</quote></cit></sense></entry>
              <entry><form><orth>well-known</orth></form><sense><cit type="trans"><quote>著名的</quote></cit></sense></entry>
            </body></text></TEI>'''
            with zipfile.ZipFile(archive, 'w') as source:
                source.writestr('eng-zho.tei', tei)

            self.assertEqual(import_dictionary(archive, destination), 3)
            result = json.loads(destination.read_text(encoding='utf-8'))
            self.assertEqual(result['entries']['book'], ['书', '预订'])
            self.assertEqual(result['entries']['run'], ['跑', '经营'])
            self.assertEqual(result['entries']['well-known'], ['著名的'])


if __name__ == '__main__':
    unittest.main()
