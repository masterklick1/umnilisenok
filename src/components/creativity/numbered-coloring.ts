import type { ColoringImage } from "./coloring-scenes";

type Region = { path: string; x: number; y: number; number: number };
export type NumberedColoring = ColoringImage & { labels: Omit<Region, "path">[]; palette: string[] };

function picture(id: string, name: string, palette: string[], regions: Region[]): NumberedColoring {
  return { id, name, palette, paths: regions.map(({ path }) => path), labels: regions };
}

export const NUMBERED_COLORINGS = [
  picture("numbered-fox", "Лисёнок у домика", ["#F58A32", "#F5CF78", "#80C66A", "#8F5943"], [
    { path: "M12 160 Q75 143 151 158 Q222 144 288 160 V189 H12 Z", x: 127, y: 175, number: 3 },
    { path: "M153 86 H265 V158 H153 Z", x: 246, y: 136, number: 2 },
    { path: "M141 86 L209 35 L277 86 Z", x: 209, y: 69, number: 4 },
    { path: "M182 158 V117 Q198 98 214 117 V158 Z", x: 198, y: 132, number: 4 },
    { path: "M232 100 H252 V121 H232 Z", x: 242, y: 110, number: 3 },
    { path: "M49 145 Q12 145 21 108 Q36 124 64 130 L70 151 Z", x: 37, y: 132, number: 1 },
    { path: "M55 132 Q83 102 105 130 L108 157 H49 Z", x: 79, y: 145, number: 1 },
    { path: "M48 99 L47 60 L71 82 Q82 78 93 82 L117 60 L116 99 Q110 119 82 130 Q55 119 48 99 Z", x: 82, y: 91, number: 1 },
    { path: "M51 106 Q65 99 82 114 Q99 99 113 106 Q102 123 82 130 Q62 123 51 106 Z", x: 82, y: 121, number: 2 },
  ]),
  picture("numbered-reef", "Коралловый риф", ["#79C9E9", "#F3CA66", "#EA755E", "#73BD86", "#9B83D2", "#ED92B3"], [
    { path: "M10 11 H290 V191 H10 Z", x: 29, y: 34, number: 1 },
    { path: "M10 166 Q73 144 126 166 Q213 144 290 167 V191 H10 Z", x: 130, y: 178, number: 2 },
    { path: "M28 165 Q18 125 28 106 Q40 125 43 152 Q45 132 59 119 Q61 143 53 161 Z", x: 36, y: 143, number: 4 },
    { path: "M242 159 V130 L225 111 L226 94 L235 98 L244 113 V80 H252 V115 L271 98 V85 H279 V103 L256 131 V161 Z", x: 249, y: 129, number: 3 },
    { path: "M93 88 L64 70 L64 112 Z", x: 72, y: 91, number: 5 },
    { path: "M87 90 Q123 50 171 62 Q199 69 213 90 Q196 114 162 121 Q125 123 87 90 Z", x: 152, y: 91, number: 6 },
    { path: "M116 70 Q103 92 119 112 L134 117 Q118 94 133 64 Z", x: 117, y: 88, number: 5 },
    { path: "M185 81 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0 Z", x: 192, y: 81, number: 2 },
    { path: "M147 119 Q159 140 177 130 L178 116 Z", x: 166, y: 125, number: 5 },
    { path: "M212 46 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0 Z", x: 222, y: 46, number: 1 },
    { path: "M242 33 a12 12 0 1 0 24 0 a12 12 0 1 0 -24 0 Z", x: 254, y: 33, number: 1 },
  ]),
];
