# Inflow

Inflow supports intensive listening with user-provided media and learning passages generated from the learner's collected vocabulary.

## Language

**Source media**:
An audio or video recording selected by the learner for study.

**Source language**:
The one learner-confirmed language of the material being studied, distinct from the Chinese used for contextual meanings. The product supports Korean and English as intended source languages; current runtime availability is recorded in [Project Status](docs/PROJECT_STATUS.md).

**Playback segment**:
A timestamped portion of media that can be studied and replayed individually, normally corresponding to a sentence.

**Learning transcript**:
The source-language text studied alongside source media, organized into playback segments and meaning groups.

**Embedded subtitle track**:
Timed subtitles stored separately from the picture within source media. A track may contain text or subtitle images.
_Avoid_: Burned-in subtitles

**Burned-in subtitles**:
Subtitle lettering that is already part of the video picture rather than a separately selectable subtitle track.
_Avoid_: Embedded subtitle track

**Subtitle cue**:
One timed subtitle display item, which may contain part of a sentence or several sentences. A cue is not necessarily a playback segment.

**Audio-text alignment**:
The assignment of positions in source audio to supplied text. A resulting timing does not establish that the supplied text faithfully or completely represents the speech.

**Subtitle-region mask**:
A learner-controlled covering over a chosen region of the video picture that conceals burned-in subtitles during listening.
_Avoid_: Meaning-group mask

**Subtitle-region mask appearance**:
The visual treatment shared by subtitle-region masks across videos, independent of each video's chosen region and enabled state.

**Meaning-group mask**:
The learner's choice to hide a complete meaning group in the source text of a playback segment.
_Avoid_: Subtitle-region mask

**Vocabulary notebook**:
The learner's collection of unfamiliar words, collected from source media or learning artifacts, or added manually.
_Avoid_: Dictionary

**Vocabulary entry**:
An individual word's dictionary form in its source language with its contextual Chinese meaning, original sentence and source. The learner can correct these details.

**Target vocabulary**:
Words selected from the vocabulary notebook that must all be used in a generated passage with their recorded contextual meanings. One generation uses exactly one source language; normal inflection in that language is allowed.

**Generated passage**:
A short learning text in the target vocabulary's shared source language, composed around those words and optionally guided by a learner-supplied topic. Other vocabulary should be common and everyday, rather than chosen to meet a formal difficulty level.
_Avoid_: Generated video

**Learning artifact**:
A saved generated passage that is also a source from which the learner can collect further unfamiliar words. Spoken audio is not required.
