type TitleCase = {
  description: string;
  buildTitle: (maxLength: bigint) => string;
  expectedLength: (maxLength: bigint) => bigint;
};

export const validTitleCases: TitleCase[] = [
  {
    description: "one ASCII byte",
    buildTitle: () => "a",
    expectedLength: () => 1n,
  },
  {
    description: "MAX_TITLE_LENGTH ASCII bytes",
    buildTitle: (maxLength) => "a".repeat(Number(maxLength)),
    expectedLength: (maxLength) => maxLength,
  },
  {
    description: "MAX_TITLE_LENGTH bytes using an accented character",
    buildTitle: (maxLength) => "a".repeat(Number(maxLength - 2n)) + "á",
    expectedLength: (maxLength) => maxLength,
  },
  {
    description: "MAX_TITLE_LENGTH bytes using an emoji",
    buildTitle: (maxLength) => "a".repeat(Number(maxLength - 4n)) + "😎",
    expectedLength: (maxLength) => maxLength,
  },
  {
    description: "MAX_TITLE_LENGTH bytes using spaces",
    buildTitle: (maxLength) => " ".repeat(Number(maxLength)),
    expectedLength: (maxLength) => maxLength,
  },
  {
    description: "MAX_TITLE_LENGTH bytes with a \\n",
    buildTitle: (maxLength) =>
      "a".repeat(Number(maxLength - 5n)) + "\n" + "a".repeat(4),
    expectedLength: (maxLength) => maxLength,
  },
];

export const tooLongTitleCases: TitleCase[] = [
  {
    description: "ASCII",
    buildTitle: (maxLength) => "a".repeat(Number(maxLength + 1n)),
    expectedLength: (maxLength) => maxLength + 1n,
  },
  {
    description: "an accented character",
    buildTitle: (maxLength) => "a".repeat(Number(maxLength - 1n)) + "á",
    expectedLength: (maxLength) => maxLength + 1n,
  },
  {
    description: "an emoji",
    buildTitle: (maxLength) => "a".repeat(Number(maxLength - 3n)) + "😎",
    expectedLength: (maxLength) => maxLength + 1n,
  },
];
