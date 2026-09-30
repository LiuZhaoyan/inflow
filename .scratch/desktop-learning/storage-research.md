# Local storage investigation

Investigated: 2026-09-30. Official documentation and current-source inspection only; no database, Electron runtime, installer or crash-recovery test was executed.

## Recommendation

Use **SQLite for learning records and ordinary files for imported media and model weights**. The desktop main process owns database access. Start with direct SQL, one connection and transactions; this single-user application does not need a database server, ORM or database worker pool. SQLite explicitly targets device-local applications and application file formats. [SQLite appropriate uses](https://www.sqlite.org/whentouse.html)

| Candidate | Fit for the confirmed learning loop | Decision |
| --- | --- | --- |
| SQLite plus files | Transactions and queries can connect media, vocabulary, source occurrences and saved passages. Large videos remain ordinary files. | Recommended. |
| JSON files | Easy initially, but saving related records consistently requires custom update/recovery conventions. | Keep for API payloads and suitable nested fields, not the primary record store. |
| IndexedDB/browser storage | Could implement the loop, but couples durable records to the renderer origin/profile and still needs native operations for media and API credentials. | Adds less value than main-process SQLite for this desktop-only target. |

The comparison is a design inference from this app's confirmed relationships, not a storage benchmark.

## Driver choice

Prefer Electron main-process **`node:sqlite`** over adding a native SQLite package. On the investigation date, Electron's stable release index lists 44.5.1 with Node 24.21.0. Electron's own 36.7.3 release notes document a fix to `require('node:sqlite')`, establishing builtin integration rather than assuming that every Node module automatically works in Electron. Node 24 documents `DatabaseSync` and its SQLite operations. [Electron release index](https://releases.electronjs.org/), [SQLite integration fix](https://releases.electronjs.org/release/v36.7.3), [Node 24 SQLite](https://nodejs.org/docs/latest-v24.x/api/sqlite.html)

This is documented feasibility, not a successful packaged-app test. Pin the supported Electron release used by the implementation and verify SQLite import, save/close/reopen and packaged Windows behavior. Current Node 24 documentation marks the module Stability 1.2, release candidate, rather than fully stable. If its packaged behavior fails the gate, reconsider a driver; do not introduce two drivers now. Small synchronous queries suit the proposed single-user records; media processing stays in the Python child process.

## Proposed records

These are a small schema outline, not implemented tables or a commitment to every column.

| Record | Necessary information |
| --- | --- |
| Media | Stable ID, managed file location, original filename, identity information, processing metadata and learning position. |
| Playback segment | Stable ID, media ID, start/end, transcript and meaning groups. |
| Vocabulary entry | Stable ID, Korean dictionary form and contextual Chinese meaning; different meanings need not collapse into one entry just because the lemma matches. |
| Source occurrence | Entry ID, media segment or artifact source, original sentence and encountered surface form. Manual entries can lack a source. |
| Learning artifact | Stable ID, Korean text, Chinese translation, optional topic, generation model and saved highlight data. |
| Artifact target | Artifact/entry relationship with a snapshot of the lemma and contextual meaning supplied for that generation. |

Several source occurrences may point to one vocabulary entry. Updating a word's meaning should not rewrite the target meaning used to create an older artifact. Saving an artifact and its target records should be one transaction. Enable foreign-key checks explicitly and use stable IDs rather than sentence-array indices as long-term references. [SQLite foreign keys](https://www.sqlite.org/foreignkeys.html)

## Media ownership and directories

Recommend importing a **managed copy** of each source video into the local library. This consumes additional disk space, but prevents moving/deleting the original download from breaking normal reopening. Complete the copy before recording a successful import; preserve the original location as provenance rather than the playback dependency. Media is not stored as a database BLOB. If the managed file itself is missing, preserve the transcript and vocabulary and offer re-association; do not silently discard learning records.

Place the small database in an application-specific user-data subdirectory, separate from the installation and repository. Large media/model directories should use Windows local application-data storage. Electron discourages large files in its default user-data directory because some environments back it up to cloud storage. Development in WSL and production on Windows use separate databases; do not share a live database file across the environments. [Electron paths](https://www.electronjs.org/docs/latest/api/app)

## Persistence and credentials

Keep the default rollback journal initially: one database connection provides no demonstrated need for WAL. If WAL is introduced later, include its persistent state in the durability design and check the embedded SQLite version against the documented WAL-reset fix. A live backup must use a consistent SQLite snapshot, such as its backup API or `VACUUM INTO`, rather than copying an actively changing database file. This is an operational constraint, not a new first-release backup interface. [SQLite WAL](https://www.sqlite.org/wal.html), [SQLite backup](https://www.sqlite.org/backup.html)

Store API credentials separately from the learning database, encrypted through Electron `safeStorage` on Windows. Its DPAPI protection is tied to the Windows user's credentials and does not isolate secrets from other applications running as that same user. Keep provider calls and decrypted keys in the main process. Credentials are not included in learning-data backups. [Electron safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage)

## Evidence needed before delivery

- Save and reopen media metadata, vocabulary, occurrences and artifacts in the packaged Windows runtime.
- Confirm that a vocabulary meaning edit leaves previous artifact targets unchanged.
- Confirm that collecting a word from an artifact preserves its sentence and source link.
- Interrupt an import/save and verify that no successful-looking partial record appears.
- Move the original video and confirm that the managed copy still plays; verify recovery when the managed copy is missing.

None of these acceptance checks has been run during this investigation.
