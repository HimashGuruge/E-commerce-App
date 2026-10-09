import { formatError } from "../utils/errorUtils.js";

describe("formatError", () => {
  test("combines Mongoose ValidationError messages", () => {
    const err = {
      name: "ValidationError",
      errors: {
        email: { message: "Path `email` is required." },
        name: { message: "Name cannot be blank" },
      },
    };
    const out = formatError(err);
    expect(out.message).toBe(
      "Validation Error: Path `email` is required., Name cannot be blank"
    );
  });

  test("maps CastError to friendly message", () => {
    const err = { name: "CastError", value: "not-an-id" };
    expect(formatError(err).message).toBe("Invalid ID format");
  });

  test("maps duplicate key (11000) to field name", () => {
    const err = { code: 11000, keyPattern: { email: 1 } };
    expect(formatError(err).message).toBe("Duplicate value for email");
  });

  test("passes through plain errors unchanged", () => {
    const err = new Error("boom");
    expect(formatError(err)).toBe(err);
  });
});
