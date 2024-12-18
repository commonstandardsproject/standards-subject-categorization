import OpenAI from "openai";
import { createReadStream, writeFileSync } from "fs";
import csv from "csv-parser";

// Set up OpenAI configuration
const configuration = {
  apiKey: "", // Replace with your OpenAI API key
}
const openai = new OpenAI(configuration);

// Categories for classification
const categories = ["MATH", "ELA", "SCI", "HIST", "CTE", "ART", "OTHER"];

// Categories and their corresponding keywords
const categoryKeywords = {
  MATH: ["mathematics", "math", "algebra", "geometry", "calculus"],
  ELA: ["ela", "english", "language arts", "reading", "writing", "literature"],
  SCI: ["science", "biology", "chemistry", "physics", "astronomy", "stem"],
  HIST: ["history", "social studies", "geography", "civics", "government", "economics"],
  CTE: ["cte", "career", "technical", "vocational", "technology", "business", "computer science"],
  ART: ["art", "visual & performing art", "dance", "music", "choral"],
  LANG: ["world language", "modern languages", "foreign language"],
  HEALTH: ["health"],
  PE: ["physical education"],
  REL: ["religion"],
  LIB: ["library"],
  SEL: ["social emotional", "social and emotional"],
  EL: ["early learning"],
  SPED: ["special education"]
};

/**
 * Categorize a subject using keyword matching.
 * @param {string} subject - The subject description to classify.
 * @returns {string|null} - The matched category or null if no match.
 */
function categorizeByKeyword(subject) {
  const lowerSubject = subject.toLowerCase();
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((keyword) => lowerSubject.includes(keyword))) {
      return category;
    }
  }
  return null; // No match found
}

/**
 * Classify a single subject description using the OpenAI API.
 * @param {string} subject - The subject description to classify.
 * @returns {Promise<string>} - The predicted category.
 */
async function classifyWithAPI(subject) {
  const prompt = `
I want you to categorize the following subject into one of these categories:
- MATH: Mathematics, algebra, geometry, calculus
- ELA: English language arts, reading, writing, literacy, literature (but not ESL/foreign language)
- SCI: Science, biology, chemistry, physics, astronomy, etc.
- HIST: History, social studies, geography, civics, economics, government
- CTE: Career/technical education, vocational, technology, business, computer science
- ART: Visual arts, theater, etc
- OTHER: Everything else (arts, PE, foreign languages, health, etc.)

Subject: "${subject}"
Category:`;

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {role: "developer", content: [
        {text: prompt, type: "text"}
      ]}
    ],
    max_tokens: 10,
  });

  return response.choices[0].message.content;
}

/**
 * Process the CSV file, classify each subject, and save the results.
 * @param {string} inputFile - Path to the input CSV file.
 * @param {string} outputFile - Path to save the output CSV file.
 */
async function processCSV(inputFile, outputFile) {
  const results = [];

  // Read and parse the CSV file
  createReadStream(inputFile)
    .pipe(csv())
    .on("data", (row) => {
      if (row.status !== "Deprecated") results.push(row)
    })
    .on("end", async () => {
      for (let row of results) {
        let category = categorizeByKeyword(row.subject);
        if (!category) {
          // Use OpenAI API if no category was matched
          // category = await classifyWithAPI(row.subject);
          console.log(row.subject)
        }
        row["normalized_subject"] = category;
        // console.log(`Classified: ${row.subject} -> ${row["normalized_subject"]}`);
      }
      saveToCSV(results, outputFile);
    });
}

/**
 * Save the processed data to a new CSV file.
 * @param {Array<Object>} data - The processed data to save.
 * @param {string} outputFile - Path to save the output file.
 */
function saveToCSV(data, outputFile) {
  const headers = Object.keys(data[0]);
  const rows = data.map((row) => headers.map((header) => row[header]).join(",")).join("\n");
  const csvContent = `${headers.join(",")}\n${rows}`;
  writeFileSync(outputFile, csvContent);
  console.log(`Saved results to ${outputFile}`);
}

// Paths to the input and output files
const inputFile = "subjects.csv"; // Input CSV file
const outputFile = "subjects_normalized.csv"; // Output CSV file

// Execute the script
processCSV(inputFile, outputFile);
