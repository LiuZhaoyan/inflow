# KRDict Chinese Text Data

Author: National Institute of Korean Language, Republic of Korea.
Original work: [Korean Basic Dictionary](https://krdict.korean.go.kr/).
License: [CC BY-SA 2.0 KR](https://creativecommons.org/licenses/by-sa/2.0/kr/); see the included `LICENSE.txt` and the [official copyright policy](https://krdict.korean.go.kr/kor/kboardPolicy/copyRightTermsInfo).

The source text archive is the `KRDICT ZH` conversion distributed by [Yomichan Korean](https://github.com/samuelbuenofran/yomichan-korean), linked from its README to the [public dictionary folder](https://drive.google.com/drive/folders/1YRw_FPSyGqKd8B0ubs8I36AAfbduWZnJ). File ID: `1qCt1fspjFxNbrxFsaJ16wgMvb4ULL2MV`; archive revision: `krdict_ko-zh_0923`. Downloaded on 2026-10-02. The archive SHA-256 is recorded in `krdict-zh.json`.

Inflow modifies this text data by extracting Chinese sense labels, excluding whitespace-containing headwords and missing translations, and merging duplicate labels by headword. These modified dictionary data remain under CC BY-SA 2.0 KR. This notice applies to the dictionary data, independently of Inflow's code license. No images, recordings or other multimedia are included.

Reproduce the data with `python scripts/import_krdict.py <source-archive.zip> resources/dictionaries/krdict-zh.json`. The archive itself is not committed. This is a fixed snapshot with incomplete coverage; an absent entry leaves manual and user-requested cloud lookup available.

## English-Chinese Dictionary

Source: WikDict English-Chinese data distributed by FreeDict as `eng-zho`, revision `2025.11.23`. WikDict states that its data comes from Wiktionary via DBnary. The FreeDict source archive is available at <https://download.freedict.org/dictionaries/eng-zho/2025.11.23/freedict-eng-zho-2025.11.23.src.tar.xz> and contains 26,660 headwords. Its SHA-512 is `25aed0f1d7de68919aa9da1ba92d67f566ae4ea81660f42071c81fc21e56d4b210d61df379315678648c45ca7e52c4a0ba2eec009fbaab7c72e7472489e1fc4c`.

The dictionary data is licensed under the [Creative Commons Attribution-ShareAlike 3.0 Unported License](https://creativecommons.org/licenses/by-sa/3.0/); a copy is included as `LICENSE-WIKDICT-CC-BY-SA-3.0.txt`. Inflow's code license is separate from this data license.

Inflow extracts Chinese translation quotes, excludes headwords containing whitespace and entries without Chinese translations, and merges duplicate headwords and sense labels. The resulting `english-zh.json` contains 19,745 headwords. This transformed snapshot is incomplete; missing entries permit manual vocabulary entry or explicit cloud lookup.

Reproduce the data with `python scripts/import_english_dictionary.py <freedict-eng-zho-2025.11.23.src.tar.xz> resources/dictionaries/english-zh.json`. The source archive is not committed. The JSON records its source revision, license and SHA-512.
