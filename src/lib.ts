export const DEFAULT_FIXTURE = 399;
export const DEFAULT_RACES = 6;

// All races of a fixture: .../fixtures/<fixture>/R1 ... R<races>
export const fixtureUrls = (fixture = DEFAULT_FIXTURE, races = DEFAULT_RACES) =>
  Array.from(
    { length: races },
    (_, i) => `https://www.mtcjockeyclub.com/form-guide/fixtures/${fixture}/R${i + 1}`,
  );

