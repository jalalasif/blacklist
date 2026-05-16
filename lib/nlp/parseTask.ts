import * as chrono from "chrono-node";
import { RRule, Options as RRuleOptions } from "rrule";
import type { ParsedTask, Priority } from "@/types";

type RRuleDay = RRuleOptions["byweekday"];
const DAY_CODES: Record<string, RRuleDay> = {
  mon: RRule.MO,
  tue: RRule.TU,
  wed: RRule.WE,
  thu: RRule.TH,
  fri: RRule.FR,
  sat: RRule.SA,
  sun: RRule.SU,
};

interface RecurrencePattern {
  re: RegExp;
  toRrule: (m: RegExpMatchArray, hour: number, minute: number) => string;
}

const RECURRENCE_PATTERNS: RecurrencePattern[] = [
  {
    re: /every\s+day|daily/i,
    toRrule: (_, h, m) => buildRrule({ freq: RRule.DAILY }, h, m),
  },
  {
    re: /every\s+weekday/i,
    toRrule: (_, h, m) =>
      buildRrule(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { freq: RRule.WEEKLY, byweekday: [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR] as any },
        h,
        m
      ),
  },
  {
    re: /every\s+weekend/i,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toRrule: (_, h, m) =>
      buildRrule({ freq: RRule.WEEKLY, byweekday: [RRule.SA, RRule.SU] as any }, h, m),
  },
  {
    re: /every\s+(mon|tue|wed|thu|fri|sat|sun)\w*/i,
    toRrule: (match, h, m) => {
      const day = DAY_CODES[match[1].toLowerCase().slice(0, 3)];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return buildRrule({ freq: RRule.WEEKLY, byweekday: day as any }, h, m);
    },
  },
  {
    re: /every\s+(\d+)\s+days?/i,
    toRrule: (match, h, m) =>
      buildRrule({ freq: RRule.DAILY, interval: parseInt(match[1]) }, h, m),
  },
  {
    re: /every\s+(\d+)\s+weeks?/i,
    toRrule: (match, h, m) =>
      buildRrule({ freq: RRule.WEEKLY, interval: parseInt(match[1]) }, h, m),
  },
  {
    re: /every\s+week/i,
    toRrule: (_, h, m) => buildRrule({ freq: RRule.WEEKLY }, h, m),
  },
  {
    re: /every\s+month/i,
    toRrule: (_, h, m) => buildRrule({ freq: RRule.MONTHLY }, h, m),
  },
];

function buildRrule(
  opts: Partial<RRuleOptions>,
  hour: number,
  minute: number
): string {
  const rule = new RRule({
    dtstart: new Date(),
    byhour: hour >= 0 ? [hour] : undefined,
    byminute: minute >= 0 ? [minute] : undefined,
    bysecond: [0],
    ...opts,
  });
  return rule.toString().replace(/^DTSTART[^\n]+\n/, "");
}

const PRIORITY_RE = /\b(?:priority:|!)(high|medium|low)\b/i;
const TAG_RE = /#(\w+)/g;

export function parseTask(rawInput: string): ParsedTask {
  let working = rawInput;
  let inlinePriority: Priority | null = null;
  const inlineTags: string[] = [];

  // Extract inline priority
  const priorityMatch = working.match(PRIORITY_RE);
  if (priorityMatch) {
    inlinePriority = priorityMatch[1].toUpperCase() as Priority;
    working = working.replace(PRIORITY_RE, "").trim();
  }

  // Extract inline tags
  let tagMatch: RegExpExecArray | null;
  while ((tagMatch = TAG_RE.exec(working)) !== null) {
    inlineTags.push(tagMatch[1].toLowerCase());
  }
  working = working.replace(TAG_RE, "").trim();

  // Detect recurrence before chrono (recurrence phrases confuse chrono)
  let recurrence: string | null = null;
  let recurrenceText = "";
  for (const pattern of RECURRENCE_PATTERNS) {
    const match = working.match(pattern.re);
    if (match) {
      recurrenceText = match[0];
      // Extract time for the recurrence (e.g., "every Monday at 9am")
      const timeResult = chrono.parse(working, new Date(), { forwardDate: true });
      const hour = timeResult[0]?.start.get("hour") ?? -1;
      const minute = timeResult[0]?.start.get("minute") ?? 0;
      recurrence = pattern.toRrule(match, hour ?? -1, minute ?? 0);
      working = working.replace(match[0], "").trim();
      break;
    }
  }
  void recurrenceText;

  // Extract date/time with chrono
  const now = new Date();
  const chronoResults = chrono.parse(working, now, { forwardDate: true });
  let dueDate: Date | null = null;
  if (chronoResults.length > 0) {
    dueDate = chronoResults[0].start.date();
    working = working.replace(chronoResults[0].text, "").trim();
  }

  // Compute nextOccurrence for recurring tasks
  let nextOccurrence: Date | null = null;
  if (recurrence) {
    try {
      const rule = RRule.fromString(recurrence);
      nextOccurrence = rule.after(now, true);
    } catch {
      nextOccurrence = dueDate;
    }
  }

  // Strip dangling prepositions left behind by date extraction (e.g. "by", "on", "at", "in")
  const cleanTitle = working
    .replace(/\s+/g, " ")
    .replace(/\b(by|on|at|in|from|until|due|before|after)\s*$/i, "")
    .trim() || rawInput.trim();

  return {
    cleanTitle,
    dueDate,
    recurrence,
    nextOccurrence,
    inlineTags,
    inlinePriority,
  };
}
