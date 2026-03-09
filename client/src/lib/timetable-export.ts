import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export interface ExportSlot {
  section_id?: string;
  sectionId?: string;
  subject_id?: string;
  subjectId?: string;
  teacher_id?: string;
  teacherId?: string;
  room_id?: string | null;
  roomId?: string | null;
  day_of_week?: number;
  dayOfWeek?: number;
  period_number?: number;
  periodNumber?: number;
  start_time?: string;
  startTime?: string;
  end_time?: string;
  endTime?: string;
  subject?: { name: string };
  teacher?: { profile?: { firstName?: string; lastName?: string } };
  section?: { name: string; class?: { name: string } };
  room?: { name: string };
}

export interface ExportSection {
  id: string;
  name: string;
  class: { id: string; name: string };
}

export interface ExportTeacher {
  id: string;
  email: string;
  profile?: { firstName?: string; lastName?: string };
}

export interface ExportSubject {
  id: string;
  name: string;
  code: string;
}

export interface ExportRoom {
  id: string;
  name: string;
}

const PERIODS = [
  { number: 1, start: "08:00", end: "08:45" },
  { number: 2, start: "08:50", end: "09:35" },
  { number: 3, start: "09:40", end: "10:25" },
  { number: 4, start: "10:40", end: "11:25" },
  { number: 5, start: "11:30", end: "12:15" },
  { number: 6, start: "13:00", end: "13:45" },
  { number: 7, start: "13:50", end: "14:35" },
  { number: 8, start: "14:40", end: "15:25" },
];

function generateSheet(
  workbook: ExcelJS.Workbook,
  slots: ExportSlot[],
  entityId: string,
  entityName: string,
  mode: "SECTION" | "TEACHER",
  sections: ExportSection[],
  subjects: ExportSubject[],
  teachers: ExportTeacher[],
  rooms: ExportRoom[],
  schoolName: string
) {
  const safeName = entityName.replace(/[\\/?*[\]]/g, "").substring(0, 30);
  const worksheet = workbook.addWorksheet(safeName);

  worksheet.pageSetup = {
    paperSize: 9,
    orientation: "landscape" as const,
    fitToPage: true,
    fitToHeight: 1,
    fitToWidth: 1,
  };

  const titleRow = worksheet.getRow(1);
  titleRow.height = 40;
  const titleCell = titleRow.getCell(1);
  titleCell.value = `${schoolName || "Timetable"} - ${mode === "SECTION" ? "Section" : "Teacher"}: ${entityName}`;
  titleCell.font = { bold: true, size: 16 };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };
  worksheet.mergeCells(1, 1, 1, 9);

  const headerRow = worksheet.getRow(2);
  headerRow.height = 35;
  const firstCell = headerRow.getCell(1);
  firstCell.value = "DAY / PERIOD";
  firstCell.fill = {
    type: "pattern",
    pattern: "solid" as const,
    fgColor: { argb: "FF0F172A" },
  };
  firstCell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  firstCell.alignment = { vertical: "middle", horizontal: "center" as const };

  for (let p = 0; p < PERIODS.length; p++) {
    const cell = headerRow.getCell(p + 2);
    const period = PERIODS[p];
    cell.value = `Period ${period.number}\n${period.start}-${period.end}`;
    cell.alignment = { vertical: "middle", horizontal: "center" as const, wrapText: true };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 9 };
    cell.fill = {
      type: "pattern",
      pattern: "solid" as const,
      fgColor: { argb: "FF334155" },
    };
    worksheet.getColumn(p + 2).width = 22;
  }
  worksheet.getColumn(1).width = 18;

  const getSlotForCell = (day: number, period: number) => {
    return slots.find((s) => {
      const d = s.day_of_week ?? s.dayOfWeek;
      const p = s.period_number ?? s.periodNumber;
      if (mode === "SECTION") {
        const sid = s.section_id ?? s.sectionId;
        return d === day && p === period && sid === entityId;
      }
      const tid = s.teacher_id ?? s.teacherId;
      return d === day && p === period && tid === entityId;
    });
  };

  const getSubjectName = (slot: ExportSlot) => {
    if (slot.subject?.name) return slot.subject.name;
    const id = slot.subject_id ?? slot.subjectId;
    const subj = subjects.find((s) => s.id === id);
    return subj?.name ?? "Unknown";
  };

  const getTeacherName = (slot: ExportSlot) => {
    if (slot.teacher?.profile) {
      const f = slot.teacher.profile.firstName ?? "";
      const l = slot.teacher.profile.lastName ?? "";
      return [f, l].filter(Boolean).join(" ") || "Unknown";
    }
    const id = slot.teacher_id ?? slot.teacherId;
    const t = teachers.find((x) => x.id === id);
    if (t?.profile) {
      const f = t.profile.firstName ?? "";
      const l = t.profile.lastName ?? "";
      return [f, l].filter(Boolean).join(" ") || t.email;
    }
    return "Unknown";
  };

  const getSectionName = (slot: ExportSlot) => {
    if (slot.section?.class && slot.section?.name) {
      return `${slot.section.class.name} - ${slot.section.name}`;
    }
    const id = slot.section_id ?? slot.sectionId;
    const sec = sections.find((s) => s.id === id);
    return sec ? `${sec.class.name} - ${sec.name}` : "Unknown";
  };

  const getRoomName = (slot: ExportSlot) => {
    if (slot.room?.name) return slot.room.name;
    const id = slot.room_id ?? slot.roomId;
    if (!id) return "TBD";
    const r = rooms.find((x) => x.id === id);
    return r?.name ?? "TBD";
  };

  for (let d = 0; d < 5; d++) {
    const row = worksheet.getRow(d + 3);
    row.height = 65;

    const dayCell = row.getCell(1);
    dayCell.value = DAYS[d];
    dayCell.font = { bold: true, size: 11 };
    dayCell.alignment = { vertical: "middle", horizontal: "center" as const };
    dayCell.fill = {
      type: "pattern",
      pattern: "solid" as const,
      fgColor: { argb: "FFF1F5F9" },
    };

    for (let p = 0; p < PERIODS.length; p++) {
      const cell = row.getCell(p + 2);
      const slot = getSlotForCell(d, PERIODS[p].number);

      cell.alignment = { vertical: "middle", horizontal: "center" as const, wrapText: true };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };

      if (slot) {
        if (mode === "SECTION") {
          cell.value = `${getSubjectName(slot)}\n${getTeacherName(slot)}`;
        } else {
          cell.value = `${getSectionName(slot)}\n${getSubjectName(slot)}`;
        }
        cell.fill = {
          type: "pattern",
          pattern: "solid" as const,
          fgColor: { argb: "FFE2E8F0" },
        };
        cell.font = { bold: true, size: 10 };
      }
    }
  }

  return worksheet;
}

export async function exportTimetableToExcel(
  slots: ExportSlot[],
  mode: "SECTION" | "TEACHER",
  sections: ExportSection[],
  subjects: ExportSubject[],
  teachers: ExportTeacher[],
  rooms: ExportRoom[],
  academicYearName: string,
  schoolName = "School"
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "HeckTeck SMS";
  workbook.created = new Date();

  const entities = mode === "SECTION" ? sections : teachers;
  if (entities.length === 0) {
    throw new Error(`No ${mode === "SECTION" ? "sections" : "teachers"} found to export.`);
  }

  for (const entity of entities) {
    const name = mode === "SECTION"
      ? `${(entity as ExportSection).class.name} - ${(entity as ExportSection).name}`
      : `${(entity as ExportTeacher).profile?.firstName ?? ""} ${(entity as ExportTeacher).profile?.lastName ?? ""}`.trim() || (entity as ExportTeacher).email;
    generateSheet(
      workbook,
      slots,
      entity.id,
      name,
      mode,
      sections,
      subjects,
      teachers,
      rooms,
      schoolName
    );
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `Timetable_${academicYearName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`;
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, fileName);
}
