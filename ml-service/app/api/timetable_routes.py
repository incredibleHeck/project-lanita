from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum

from app.timetable.solver import (
    TimetableSolver,
    TimetableInput,
    Section,
    Subject,
    Teacher,
    Room,
    Allocation,
    RoomType,
)

router = APIRouter()


class RoomTypeEnum(str, Enum):
    CLASSROOM = "CLASSROOM"
    LAB = "LAB"
    HALL = "HALL"
    LIBRARY = "LIBRARY"
    OTHER = "OTHER"


class RoomInput(BaseModel):
    id: str
    name: str
    capacity: int
    type: RoomTypeEnum = RoomTypeEnum.CLASSROOM


class TeacherInput(BaseModel):
    id: str
    name: str
    max_periods_per_day: int = 6
    unavailable_slots: List[tuple] = []


class SectionInput(BaseModel):
    id: str
    name: str
    class_name: str
    capacity: int


class SubjectInput(BaseModel):
    id: str
    name: str
    periods_per_week: int = Field(..., ge=1, le=10)
    requires_lab: bool = False
    is_double_period: bool = False


class AllocationInput(BaseModel):
    section_id: str
    subject_id: str
    teacher_id: str


class TimetableGenerateRequest(BaseModel):
    sections: List[SectionInput]
    subjects: List[SubjectInput]
    teachers: List[TeacherInput]
    rooms: List[RoomInput]
    allocations: List[AllocationInput]
    periods_per_day: int = Field(default=8, ge=4, le=12)
    days_per_week: int = Field(default=5, ge=1, le=7)
    academic_year_id: str = ""
    timeout_seconds: int = Field(default=60, ge=10, le=300)


class TimetableSlotResponse(BaseModel):
    section_id: str
    subject_id: str
    teacher_id: str
    room_id: Optional[str]
    day_of_week: int
    period_number: int
    start_time: str
    end_time: str


class TimetableGenerateResponse(BaseModel):
    status: str
    slots: List[TimetableSlotResponse]
    conflicts_resolved: int
    optimization_score: float
    message: str


class TimetableValidateRequest(BaseModel):
    slots: List[TimetableSlotResponse]
    teachers: List[TeacherInput]
    rooms: List[RoomInput]


class ValidationResult(BaseModel):
    is_valid: bool
    conflicts: List[str]
    warnings: List[str]


@router.post("/generate", response_model=TimetableGenerateResponse)
async def generate_timetable(request: TimetableGenerateRequest):
    """
    Generate an optimized timetable using constraint satisfaction.
    
    This endpoint uses Google OR-Tools to find an optimal assignment of
    subjects to time slots while respecting constraints like:
    - Each subject must have the required number of periods per week
    - No teacher can teach two classes simultaneously
    - No room can be double-booked
    - Lab subjects must be in lab rooms
    """
    try:
        input_data = TimetableInput(
            sections=[
                Section(
                    id=s.id,
                    name=s.name,
                    class_name=s.class_name,
                    capacity=s.capacity,
                )
                for s in request.sections
            ],
            subjects=[
                Subject(
                    id=s.id,
                    name=s.name,
                    periods_per_week=s.periods_per_week,
                    requires_lab=s.requires_lab,
                    is_double_period=s.is_double_period,
                )
                for s in request.subjects
            ],
            teachers=[
                Teacher(
                    id=t.id,
                    name=t.name,
                    max_periods_per_day=t.max_periods_per_day,
                    unavailable_slots=t.unavailable_slots,
                )
                for t in request.teachers
            ],
            rooms=[
                Room(
                    id=r.id,
                    name=r.name,
                    capacity=r.capacity,
                    type=RoomType(r.type.value),
                )
                for r in request.rooms
            ],
            allocations=[
                Allocation(
                    section_id=a.section_id,
                    subject_id=a.subject_id,
                    teacher_id=a.teacher_id,
                )
                for a in request.allocations
            ],
            periods_per_day=request.periods_per_day,
            days_per_week=request.days_per_week,
            academic_year_id=request.academic_year_id,
        )
        
        solver = TimetableSolver(input_data)
        solution = solver.solve(timeout_seconds=request.timeout_seconds)
        
        if solution.status == "ERROR":
            raise HTTPException(status_code=500, detail=solution.message)
        
        return TimetableGenerateResponse(
            status=solution.status,
            slots=[
                TimetableSlotResponse(
                    section_id=s.section_id,
                    subject_id=s.subject_id,
                    teacher_id=s.teacher_id,
                    room_id=s.room_id,
                    day_of_week=s.day_of_week,
                    period_number=s.period_number,
                    start_time=s.start_time,
                    end_time=s.end_time,
                )
                for s in solution.slots
            ],
            conflicts_resolved=solution.conflicts_resolved,
            optimization_score=solution.score,
            message=solution.message,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/validate", response_model=ValidationResult)
async def validate_timetable(request: TimetableValidateRequest):
    """
    Validate a timetable for conflicts.
    
    Checks for:
    - Teacher double-booking
    - Room double-booking
    - Missing required periods
    """
    conflicts = []
    warnings = []
    
    teacher_slots: dict = {}
    room_slots: dict = {}
    
    for slot in request.slots:
        slot_key = (slot.day_of_week, slot.period_number)
        
        teacher_key = (slot.teacher_id, slot_key)
        if teacher_key in teacher_slots:
            conflicts.append(
                f"Teacher {slot.teacher_id} double-booked on day {slot.day_of_week}, period {slot.period_number}"
            )
        else:
            teacher_slots[teacher_key] = slot
        
        if slot.room_id:
            room_key = (slot.room_id, slot_key)
            if room_key in room_slots:
                conflicts.append(
                    f"Room {slot.room_id} double-booked on day {slot.day_of_week}, period {slot.period_number}"
                )
            else:
                room_slots[room_key] = slot
    
    for teacher in request.teachers:
        for day in range(5):
            day_periods = sum(
                1 for s in request.slots
                if s.teacher_id == teacher.id and s.day_of_week == day
            )
            if day_periods > teacher.max_periods_per_day:
                warnings.append(
                    f"Teacher {teacher.name} has {day_periods} periods on day {day}, exceeding max of {teacher.max_periods_per_day}"
                )
    
    return ValidationResult(
        is_valid=len(conflicts) == 0,
        conflicts=conflicts,
        warnings=warnings,
    )


@router.get("/period-times")
async def get_period_times():
    """Get the default period time slots."""
    return {
        "periods": [
            {"number": i + 1, "start": start, "end": end}
            for i, (start, end) in enumerate(TimetableSolver.PERIOD_TIMES)
        ]
    }
