"""Verify the public dictionary importer using an isolated text archive."""
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

from import_krdict import import_dictionary


class DictionaryImportTest(unittest.TestCase):
    def test_extracts_senses_without_phrases_or_missing_translations(self):
        with tempfile.TemporaryDirectory() as directory:
            archive = Path(directory) / 'dictionary.zip'
            destination = Path(directory) / 'dictionary.json'
            with zipfile.ZipFile(archive, 'w') as source:
                source.writestr('index.json', json.dumps({'revision': 'test'}))
                source.writestr('term_bank_1.json', json.dumps([
                    ['가다', '', '', '', '', ['가다\n1. 去\nDefinition\n2. 前往']],
                    ['가다', '', '', '', '', ['가다\n1. 去']],
                    ['학생', '', '', '', '', ['학생\n学生\n学校에서 공부하는 사람.\n在学校学习的人。']],
                    ['긴 표현', '', '', '', '', ['长短语']],
                    ['없다', '', '', '', '', ['(无对应词汇)']],
                ]))
            self.assertEqual(import_dictionary(archive, destination), 2)
            result = json.loads(destination.read_text(encoding='utf-8'))
            self.assertEqual(result['entries'], {'가다': ['去', '前往'], '학생': ['学生']})
            self.assertEqual(result['revision'], 'test')
            self.assertEqual(len(result['archiveSha256']), 64)


if __name__ == '__main__':
    unittest.main()
