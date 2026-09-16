export type PlayType = "TRIPLETA" | "DIRECTO" | "BOUL PÈ" | "REVÈ" | "PALÉ" |
  "CASH 3 STRAIGHT" | "CASH 3 BOX" | "PLAY 4 STRAIGHT" | "PLAY 4 BOX" |
  "PICK 5 STRAIGHT" | "PICK 5 BOX";
type Entry = { number: string; type: PlayType };
const reverse = (value: string) => value[1] + value[0];
const sides = (value: string) => [...new Set([value, reverse(value)])];

export function parsePlayEntry(raw: string): Entry[] {
  const value = raw.replace(/\s+/g, "").toUpperCase();
  if (/^\d{3}Q$/.test(value)) {
    const digits = value.slice(0, 3);
    const permutations = new Set<string>();
    for (const order of [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]]) {
      permutations.add(order.map(index => digits[index]).join(""));
    }
    return [...permutations].map(number => ({ number, type: "CASH 3 STRAIGHT" }));
  }
  if (value === "00D99") return Array.from({ length: 10 }, (_, i) => ({ number: `${i}${i}`, type: "BOUL PÈ" }));
  if (/^\d{2}\.$/.test(value)) return sides(value.slice(0, 2)).map(number => ({ number, type: "REVÈ" }));
  if (/^\d{4}\.$/.test(value)) {
    const first = sides(value.slice(0, 2)), second = sides(value.slice(2, 4));
    if (first.length === 1 && second.length === 1) throw new Error("De boul pè pa valab pou maryaj ak revè.");
    return first.flatMap(left => second.map(right => ({ number: `${left}-${right}`, type: "PALÉ" as const })));
  }
  if (/^\d{6}$/.test(value)) return [{number:value.match(/.{2}/g)!.join("-"),type:"TRIPLETA"}];
  if (/^\d{2}$/.test(value)) return [{ number: value, type: "DIRECTO" }];
  if (/^\d{4}$/.test(value)) return [{ number: value.slice(0, 2) + "-" + value.slice(2), type: "PALÉ" }];
  if (/^\d{3}$/.test(value)) return [{ number: value, type: "CASH 3 STRAIGHT" }];
  const match = /^(\d{3,5})([+-])$/.exec(value);
  if (match) {
    const [, number, sign] = match;
    if (number.length === 3 && sign === "-") throw new Error("Fòma boul la pa valab.");
    const game = number.length === 3 ? "CASH 3" : number.length === 4 ? "PLAY 4" : "PICK 5";
    // Box is one wager, not multiple full-price straight wagers.
    return [{ number, type: `${game} ${sign === "+" ? "BOX" : "STRAIGHT"}` as PlayType }];
  }
  throw new Error("Fòma boul la pa valab.");
}
