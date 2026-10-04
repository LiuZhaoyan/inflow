import os
from pathlib import Path
import shutil
import tempfile
import unittest
from unittest.mock import patch
import zipfile

import spacy
from setup_models import install_english_parser


class EnglishPreparationTest(unittest.TestCase):
    def test_preparation_repairs_an_incomplete_pipeline_and_reuses_a_loadable_one(self):
        root = Path(__file__).resolve().parents[1]
        resources = Path(os.environ.get('INFLOW_MODELS_DIR', root / '.models'))
        wheel = resources / 'downloads/en_core_web_sm-3.8.0-py3-none-any.whl'
        samples = root / '.scratch/desktop-learning/generated-samples'
        samples.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(prefix='english-setup-', dir=samples) as directory:
            destination = Path(directory)
            model = destination / 'english-parser/en_core_web_sm/en_core_web_sm-3.8.0'
            model.mkdir(parents=True)
            with zipfile.ZipFile(wheel) as archive:
                for name in ['config.cfg', 'meta.json']:
                    (model / name).write_bytes(archive.read('en_core_web_sm/en_core_web_sm-3.8.0/' + name))
            with patch('urllib.request.urlretrieve', side_effect=lambda _url, target: shutil.copyfile(wheel, target)):
                install_english_parser(destination)
            pipeline = spacy.load(str(model))
            self.assertEqual([token.lemma_ for token in pipeline('The children ran.') if token.text == 'children'], ['child'])
            with patch('urllib.request.urlretrieve', side_effect=AssertionError('A loadable pipeline must not download again')):
                install_english_parser(destination)


if __name__ == '__main__':
    unittest.main()
