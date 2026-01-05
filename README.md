# Inflow

**Acquire language, don't memorize it.**

Inflow is an immersive language learning application built with Next.js. It leverages the philosophy of **Comprehensible Input** to help users master new languages naturally by reading stories slightly above their current level.

## 📖 Philosophy

Inflow is designed around the idea that language acquisition happens when we understand messages (input) that contain aspects of the language we are ready to acquire. Instead of rote memorization of vocabulary lists, Inflow provides:

- **Contextual Learning**: Learn words within the flow of a story.
- **AI-Powered Assistance**: Instant explanations and visual depictions to bridge the gap between your current level and the text.
- **Distraction-Free Reading**: A clean interface focused on the content.

## ✨ Features

- **📚 EPUB Reader**: Upload and read your favorite EPUB books directly in the browser.
- **🤖 AI Explanations**: Click on any sentence to get an instant, context-aware explanation tailored to your proficiency level (Beginner, Intermediate, Advanced).
- **🎨 AI Depiction**: Visualize the scene with AI-generated images based on the text context to aid memory and understanding.
- **🌍 Multi-language Support**: Auto-detection and support for multiple languages including English, Chinese, Japanese, Spanish, French, German, and Russian.
- **📂 Library Management**: Easily upload, manage, and organize your reading collection.

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **UI Components**: [Lucide React](https://lucide.dev/), [Framer Motion](https://www.framer.com/motion/)
- **AI Integration**: 
  - OpenAI API (Text Explanation)
  - PPInfra / Seedream (Image Generation)
- **File Processing**: `epub2`, `cheerio`
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
   Create a `.env.local` file in the root directory and add your API keys:

   ```env
   # OpenAI Configuration (for AI Explanations)
   API_KEY=your_openai_api_key
   BASE_URL=https://api.openai.com/v1 # or your custom endpoint

   # Image Generation Configuration (if different from above)
   # Ensure your backend logic in app/api/ai-depict/route.ts matches your provider
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open the application**
   Visit [http://localhost:3000](http://localhost:3000) in your browser.

## 📂 Project Structure

```
inflow/
├── app/                 # Next.js App Router pages and API routes
│   ├── api/             # Backend API endpoints (ai-explain, ai-depict, upload, etc.)
│   ├── about/           # About page
│   ├── docs/            # Documentation page
│   ├── read/            # Reader interface
│   └── user/            # User library page
├── components/          # React components (BooksManager, ReaderInterface, etc.)
├── data/                # Local JSON database and book metadata
├── lib/                 # Utility functions (db, language, textProcessor)
├── public/              # Static assets and uploads
└── uploads/             # Raw uploaded EPUB files
```

## 📚 Contributing Materials

We are actively looking for high-quality, **Public Domain** language learning resources to expand our default library.

If you have EPUB books that are suitable for language learners (e.g., graded readers, classic literature in various languages):

1. **Verify Copyright**: Ensure the content is in the Public Domain or has a compatible open license (e.g., CC BY).
2. **Submit via Issue**: Open a [GitHub Issue](https://github.com/yourusername/inflow/issues) with the label `content` and attach the file or a download link.
3. **Submit via Pull Request**: Add your EPUB files to the `materials/` directory and submit a PR.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

