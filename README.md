# Inflow

**Acquire language, don't memorize it.**

Inflow is an immersive language learning application built with Next.js. It leverages the philosophy of **Comprehensible Input** to help users master new languages naturally by reading stories slightly above their current level.

## 📖 Philosophy

Inflow is designed around the idea that language acquisition happens when we understand messages (input) that contain aspects of the language we are ready to acquire. Instead of rote memorization of vocabulary lists, Inflow provides:

- **Contextual Learning**: Learn words within the flow of a story.
- **AI-Powered Assistance**: Instant explanations and visual depictions to bridge the gap between your current level and the text.
- **Distraction-Free Reading**: A clean interface focused on the content.

## ✨ Features

- **📚 Multi-format Reader**: Upload and read EPUBfiles directly in the browser.
- **🤖 AI Explanations (i+1)**: Click any sentence for a concise, context-aware explanation tailored to your level.
- **🎨 AI Depiction (Optional)**: Generate scene images asynchronously to aid comprehension.
- **📝 AI Story Builder**: Create short stories from your vocabulary list.
- **🧑‍🏫 Guided Practice Chat**: One-sentence-at-a-time tutoring with explanations and translations.
- **🔊 Text-to-Speech**: Generate audio for sentences and mastered items.
- **🌍 Multi-language Support**: Auto-detection across major languages.
- **📂 Library & Progress Tracking**: Manage books, vocabulary, and mastered sentences.

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: TypeScript + React 19
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **UI Components**: [Lucide React](https://lucide.dev/), [Framer Motion](https://www.framer.com/motion/)
- **AI Integration**: OpenAI-compatible chat + image APIs
- **TTS**: PPInfra / MiniMax Speech (server-side)
- **File Processing**: `epub2`, `cheerio`, `pdf-parse`
- **Data Storage**: Local JSON-based database

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm, pnpm, or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/inflow.git
   cd inflow
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Configure Environment Variables**
   Create a `.env.local` file in the root directory:

   ```env
   # OpenAI-compatible API key (used for explanations, stories, and optional image generation)
   API_KEY=your_openai_api_key
   BASE_URL=https://api.openai.com/v1

   # Optional: enable AI depiction
   ENABLE_AI_DEPICT=true
   AI_DEPICT_API_URL=https://api.openai.com/v1/images/generations
   # Only support sync image generation  URL
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open the application**
   Visit [http://localhost:3000](http://localhost:3000) in your browser.

## 📦 Scripts

- `npm run dev` – start dev server
- `npm run build` – build for production
- `npm run start` – run production server
- `npm run lint` – lint codebase

## 📂 Project Structure

```
inflow/
├── app/                 # Next.js App Router pages and API routes
│   ├── api/             # Backend API endpoints
│   ├── about/
│   ├── docs/
│   ├── learn/
│   ├── read/
│   │   └── [id]/
│   ├── user/
│   └── vocabulary/
├── components/
├── data/                # Local JSON database and book metadata
│   ├── books/
│   ├── books.json
│   ├── learn_progress.json
│   ├── user_profile.json
│   └── vocabulary.json
├── lib/
│   ├── db/
├── materials/            # Sample public-domain books
├── public/
│   └── uploads/          # Images and audio outputs
├── scripts/
└── uploads/              # Raw uploaded files
```

## ✅ Supported Uploads

- EPUB (`.epub`)
- Plain text (`.txt`)

##   Format to be supported

- Subtitles (`.srt`, `.vtt`)
- PDF (`.pdf`)

## 💾 Storage Notes

- Processed books and user data live under [data/](data/).
- Uploaded files are saved in [uploads/](uploads/) and extracted media in [public/uploads/](public/uploads/).

## 📚 Contributing Materials

We are actively looking for high-quality, **Public Domain** language learning resources to expand our default library.

If you have EPUB books that are suitable for language learners (e.g., graded readers, classic literature in various languages):

1. **Verify Copyright**: Ensure the content is in the Public Domain or has a compatible open license (e.g., CC BY).
2. **Submit via Issue**: Open a [GitHub Issue](https://github.com/yourusername/inflow/issues) with the label `content` and attach the file or a download link.
3. **Submit via Pull Request**: Add your EPUB files to the `materials/` directory and submit a PR.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

