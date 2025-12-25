// lib/mockData.ts
export const mockBooks = [
  {
    id: "1",
    title: "The Little Prince (Excerpt)",
    level: "Intermediate",
    content: [
      "Once when I was six years old I saw a magnificent picture in a book, called True Stories from Nature, about the primeval forest.",
      "It was a picture of a boa constrictor in the act of swallowing an animal.",
      "In the book it said: 'Boa constrictors swallow their prey whole, without chewing it.'",
      "After that they are not able to move, and they sleep through the six months that they need for digestion."
    ]
  }
];

export type ExplanationRequest = {
  text: string;
  context: string;
  difficulty: "beginner" | "intermediate" | "advanced";
};