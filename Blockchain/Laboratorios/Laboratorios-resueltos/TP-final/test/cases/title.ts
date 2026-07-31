import { getUtf8ByteLength } from "../helpers/utils.js";

function buildValueWithSuffix(totalByteLength: bigint, suffix: string): string {
  const suffixByteLength = getUtf8ByteLength(suffix);

  if (suffixByteLength > totalByteLength) {
    throw new Error(
      `El sufijo requiere ${suffixByteLength} bytes pero solo hay ${totalByteLength} disponibles`,
    );
  }

  return "a".repeat(Number(totalByteLength - suffixByteLength)) + suffix;
}

type StringCase = {
  description: string;
  buildValue: (maxLength: bigint) => string;
  expectedLength: (maxLength: bigint) => bigint;
};

export const validStringCases: StringCase[] = [
  {
    description: "one ASCII byte",
    buildValue: () => "a",
    expectedLength: () => 1n,
  },
  {
    description: "the maximum length using ASCII",
    buildValue: (maxLength) => "a".repeat(Number(maxLength)),
    expectedLength: (maxLength) => maxLength,
  },
  {
    description: "the maximum length using an accented character",
    buildValue: (maxLength) => buildValueWithSuffix(maxLength, "á"),
    expectedLength: (maxLength) => maxLength,
  },
  {
    description: "the maximum length using an emoji",
    buildValue: (maxLength) => buildValueWithSuffix(maxLength, "😎"),
    expectedLength: (maxLength) => maxLength,
  },
  {
    description: "the maximum length using spaces",
    buildValue: (maxLength) => " ".repeat(Number(maxLength)),
    expectedLength: (maxLength) => maxLength,
  },
  {
    description: "the maximum length containing a newline",
    buildValue: (maxLength) => buildValueWithSuffix(maxLength, "\n"),
    expectedLength: (maxLength) => maxLength,
  },
];

export const tooLongStringCases: StringCase[] = [
  {
    description: "ASCII",
    buildValue: (maxLength) => "a".repeat(Number(maxLength + 1n)),
    expectedLength: (maxLength) => maxLength + 1n,
  },
  {
    description: "an accented character",
    buildValue: (maxLength) => buildValueWithSuffix(maxLength + 1n, "á"),
    expectedLength: (maxLength) => maxLength + 1n,
  },
  {
    description: "an emoji",
    buildValue: (maxLength) => buildValueWithSuffix(maxLength + 1n, "😎"),
    expectedLength: (maxLength) => maxLength + 1n,
  },
];
