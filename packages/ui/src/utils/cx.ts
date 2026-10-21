/** Verbindet CSS-Klassen und lässt leere Werte weg. */
export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
