const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;
const MAX_SESSION_CODE_LENGTH = 80;

export type ValidationResult =
  | {
      ok: true;
      value: string;
    }
  | {
      ok: false;
      message: string;
    };

export function validateResponseId(id: string): ValidationResult {
  const trimmedId = id.trim();

  if (!trimmedId) {
    return {
      ok: false,
      message: "Response id is required.",
    };
  }

  if (!UUID_PATTERN.test(trimmedId)) {
    return {
      ok: false,
      message: "Response id must be a valid UUID.",
    };
  }

  return {
    ok: true,
    value: trimmedId,
  };
}

export function validateSessionCode(sessionCode: string): ValidationResult {
  const trimmedSessionCode = sessionCode.trim();

  if (!trimmedSessionCode) {
    return {
      ok: false,
      message: "sessionCode is required.",
    };
  }

  if (trimmedSessionCode.length > MAX_SESSION_CODE_LENGTH) {
    return {
      ok: false,
      message: `sessionCode must be ${MAX_SESSION_CODE_LENGTH} characters or fewer.`,
    };
  }

  if (CONTROL_CHARACTER_PATTERN.test(trimmedSessionCode)) {
    return {
      ok: false,
      message: "sessionCode contains invalid characters.",
    };
  }

  return {
    ok: true,
    value: trimmedSessionCode,
  };
}
