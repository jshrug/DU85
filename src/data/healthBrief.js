// Cohort 85 — Health & Safety brief. Cross-city reference (not tied to one country).
// Source: Cohort 85 · City Pairs · Health & Vaccination reference (AC, 6.3.26).
// Single source of truth: rendered in Porter's Briefs tab AND injected into Porter's
// system prompt (see api/porter.js) so Porter can reference it for any city.

export const HEALTH_BRIEF_META = {
  title: "Health & Vaccination Reference",
  scope: "All candidate cities",
  source: "Cohort 85 · City Pairs (AC, 6.3.26)",
  intro:
    "Cross-city health and vaccination reference for every City A / City B option on the ballot. " +
    "This is directional guidance for planning, not medical advice. Requirements change: confirm current " +
    "vaccine, malaria, and yellow-fever entry rules with a travel clinic and the CDC/embassy closer to travel.",
};

// city, yellowFever, malaria, vaccines, notes
export const HEALTH_ROWS = [
  { city: "Ulaanbaatar, Mongolia", yellowFever: "None", malaria: "None", vaccines: "Hepatitis A", notes: "Dry climate; stay hydrated" },
  { city: "Bangkok, Thailand", yellowFever: "None", malaria: "Very low in city", vaccines: "Hepatitis A, Typhoid", notes: "Dengue is more common than malaria" },
  { city: "Kuala Lumpur, Malaysia", yellowFever: "None", malaria: "Very low in city", vaccines: "Hepatitis A, Typhoid", notes: "Dengue precautions recommended" },
  { city: "Ho Chi Minh City, Vietnam", yellowFever: "None", malaria: "Very low in city", vaccines: "Hepatitis A, Typhoid", notes: "Food and water precautions" },
  { city: "Hanoi, Vietnam", yellowFever: "None", malaria: "Very low in city", vaccines: "Hepatitis A, Typhoid", notes: "Dengue possible" },
  { city: "Delhi, India", yellowFever: "None", malaria: "Low in city", vaccines: "Hepatitis A, Typhoid", notes: "Poor air quality seasonally; consider N95 mask" },
  { city: "Bangalore, India", yellowFever: "None", malaria: "Low", vaccines: "Hepatitis A", notes: "Lower malaria risk than rural India" },
  { city: "Mumbai, India", yellowFever: "None", malaria: "Low", vaccines: "Hepatitis A, Typhoid", notes: "Food and water precautions" },
  { city: "Nairobi, Kenya", yellowFever: "Generally recommended (exceptions include travel limited to the city of Nairobi)", malaria: "Low in city", vaccines: "Hepatitis A, Typhoid", notes: "Safari travel may require malaria medication" },
  { city: "Budapest, Hungary", yellowFever: "None", malaria: "None", vaccines: "Routine vaccines", notes: "Standard European precautions" },
  { city: "Belgrade, Serbia", yellowFever: "None", malaria: "None", vaccines: "Routine vaccines", notes: "No special concerns" },
  { city: "Tunis, Tunisia", yellowFever: "None", malaria: "None", vaccines: "Hepatitis A", notes: "Food and water precautions" },
  { city: "Krakow, Poland", yellowFever: "None", malaria: "None", vaccines: "Routine vaccines", notes: "No special concerns" },
  { city: "Casablanca, Morocco", yellowFever: "None", malaria: "None", vaccines: "Hepatitis A", notes: "Food and water precautions" },
  { city: "Dakar, Senegal", yellowFever: "Recommended", malaria: "Yes", vaccines: "Hepatitis A, Typhoid", notes: "Malaria prevention recommended" },
  { city: "Windhoek, Namibia", yellowFever: "None", malaria: "Very low in city", vaccines: "Hepatitis A", notes: "Malaria risk mainly in northern Namibia" },
  { city: "Lusaka, Zambia", yellowFever: "Certificate required if arriving from a yellow fever country", malaria: "Moderate", vaccines: "Hepatitis A, Typhoid", notes: "Malaria medication often recommended" },
  { city: "Maputo, Mozambique", yellowFever: "Certificate required if arriving from a yellow fever country", malaria: "Moderate", vaccines: "Hepatitis A, Typhoid", notes: "Malaria prevention recommended" },
  { city: "Gaborone, Botswana", yellowFever: "None", malaria: "Low", vaccines: "Hepatitis A", notes: "Malaria mainly in northern Botswana" },
  { city: "Istanbul, Turkey", yellowFever: "None", malaria: "None", vaccines: "Hepatitis A", notes: "Food and water precautions" },
  { city: "Kigali, Rwanda", yellowFever: "Certificate required if arriving from a yellow fever country", malaria: "Low in city", vaccines: "Hepatitis A, Typhoid", notes: "Gorilla trekking or parks may increase malaria exposure" },
  { city: "Cape Town, South Africa", yellowFever: "Certificate required if arriving from a yellow fever country", malaria: "None", vaccines: "Routine vaccines", notes: "No malaria in Cape Town" },
  { city: "Kampala, Uganda", yellowFever: "Recommended", malaria: "Moderate", vaccines: "Hepatitis A, Typhoid", notes: "Malaria medication recommended" },
];

// Markdown table for Porter's system prompt.
export const HEALTH_BRIEF_MARKDOWN = [
  "| City | Yellow Fever | Malaria Risk | Recommended Vaccines / Health | Special Notes |",
  "| --- | --- | --- | --- | --- |",
  ...HEALTH_ROWS.map(
    (r) => `| ${r.city} | ${r.yellowFever} | ${r.malaria} | ${r.vaccines} | ${r.notes} |`
  ),
].join("\n");
