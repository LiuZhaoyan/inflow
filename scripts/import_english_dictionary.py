"""Extract English-to-Chinese sense candidates from a FreeDict/WikDict TEI archive."""
import hashlib
import json
import sys
import tarfile
import zipfile
from pathlib import Path
from xml.etree import ElementTree


def _tei_bytes(archive):
    try:
        with zipfile.ZipFile(archive) as source:
            name = next(name for name in source.namelist() if name.endswith('.tei'))
            return source.read(name)
    except zipfile.BadZipFile:
        with tarfile.open(archive, 'r:*') as source:
            member = next(member for member in source.getmembers() if member.name.endswith('.tei'))
            stream = source.extractfile(member)
            if stream is None:
                raise ValueError('The FreeDict archive has no readable TEI dictionary.')
            return stream.read()


def _local_name(element):
    return element.tag.rsplit('}', 1)[-1]


def _text(element):
    return ''.join(element.itertext()).strip()


def import_dictionary(archive, destination):
    archive = Path(archive)
    document = ElementTree.fromstring(_tei_bytes(archive))
    entries = {}
    for entry in (element for element in document.iter() if _local_name(element) == 'entry'):
        orth = next((element for element in entry.iter() if _local_name(element) == 'orth'), None)
        if orth is None:
            continue
        lemma = _text(orth)
        if not lemma or any(character.isspace() for character in lemma):
            continue
        meanings = entries.setdefault(lemma, [])
        for citation in (element for element in entry.iter() if _local_name(element) == 'cit' and element.attrib.get('type') in {'trans', 'translation'}):
            for quote in (element for element in citation.iter() if element is not citation and _local_name(element) == 'quote'):
                meaning = _text(quote)
                if not meaning or not any('\u3400' <= character <= '\u9fff' for character in meaning):
                    continue
                if meaning not in meanings:
                    meanings.append(meaning)
        if not meanings:
            entries.pop(lemma)

    digest = hashlib.sha512(archive.read_bytes()).hexdigest()
    result = {
        'source': 'WikDict English-Chinese dictionary, distributed by FreeDict as eng-zho',
        'sourceUrl': 'https://download.freedict.org/dictionaries/eng-zho/2025.11.23/freedict-eng-zho-2025.11.23.src.tar.xz',
        'license': 'Creative Commons Attribution-ShareAlike 3.0 Unported (CC BY-SA 3.0)',
        'licenseUrl': 'https://creativecommons.org/licenses/by-sa/3.0/',
        'revision': '2025.11.23',
        'archiveSha512': digest,
        'transformations': ['Keep single-word headwords.', 'Keep Chinese translation quotes.', 'Merge duplicate headwords and sense labels.'],
        'entries': dict(sorted(entries.items())),
    }
    destination = Path(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    return len(entries)


if __name__ == '__main__':
    print(import_dictionary(sys.argv[1], sys.argv[2]))
