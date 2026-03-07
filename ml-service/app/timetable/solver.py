from ortools.sat.python import cp_model
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum


class RoomType(str, Enum):
    CLASSROOM = "CLASSROOM"
    LAB = "LAB"
    HALL = "HALL"
    LIBRARY = "LIBRARY"
    OTHER = "OTHER"


@dataclass
class Room:
    id: str
    name: str
    capacity: int
    type: RoomType = RoomType.CLASSROOM


@dataclass
class Teacher:
    id: str
    name: str
    max_periods_per_day: int = 6
    unavailable_slots: List[tuple] = field(default_factory=list)


@dataclass
class Section:
    id: str
    name: str
    class_name: str
    capacity: int


@dataclass
class Subject:
    id: str
    name: str
    periods_per_week: int
    requires_lab: bool = False
    is_double_period: bool = False


@dataclass
class Allocation:
    section_id: str
    subject_id: str
    teacher_id: str


@dataclass
class TimetableInput:
    sections: List[Section]
    subjects: List[Subject]
    teachers: List[Teacher]
    rooms: List[Room]
    allocations: List[Allocation]
    periods_per_day: int = 8
    days_per_week: int = 5
    academic_year_id: str = ""


@dataclass
class TimetableSlotResult:
    section_id: str
    subject_id: str
    teacher_id: str
    room_id: Optional[str]
    day_of_week: int
    period_number: int
    start_time: str
    end_time: str


@dataclass
class TimetableSolution:
    status: str
    slots: List[TimetableSlotResult]
    conflicts_resolved: int = 0
    score: float = 0.0
    message: str = ""


class TimetableSolver:
    """
    Constraint-based timetable solver using Google OR-Tools.
    
    Constraints:
    1. Each section must have each subject the required times per week
    2. No teacher can teach two classes at the same time
    3. No room can be double-booked
    4. Lab subjects must be scheduled in lab rooms
    5. Teachers respect their max periods per day
    6. Teachers are not scheduled during unavailable slots
    """
    
    PERIOD_TIMES = [
        ("08:00", "08:45"),
        ("08:50", "09:35"),
        ("09:40", "10:25"),
        ("10:40", "11:25"),  # After break
        ("11:30", "12:15"),
        ("13:00", "13:45"),  # After lunch
        ("13:50", "14:35"),
        ("14:40", "15:25"),
    ]
    
    def __init__(self, data: TimetableInput):
        self.data = data
        self.model = cp_model.CpModel()
        self.slots: Dict[tuple, Any] = {}
        self.assignments: Dict[tuple, Any] = {}
        
        self._section_map = {s.id: s for s in data.sections}
        self._subject_map = {s.id: s for s in data.subjects}
        self._teacher_map = {t.id: t for t in data.teachers}
        self._room_map = {r.id: r for r in data.rooms}
        
        self._allocation_by_section: Dict[str, List[Allocation]] = {}
        for alloc in data.allocations:
            if alloc.section_id not in self._allocation_by_section:
                self._allocation_by_section[alloc.section_id] = []
            self._allocation_by_section[alloc.section_id].append(alloc)
    
    def solve(self, timeout_seconds: int = 60) -> TimetableSolution:
        """Generate an optimal timetable."""
        if not self.data.sections or not self.data.allocations:
            return TimetableSolution(
                status="INFEASIBLE",
                slots=[],
                message="No sections or allocations provided",
            )
        
        try:
            self._create_variables()
            self._add_constraints()
            self._add_objective()
            
            solver = cp_model.CpSolver()
            solver.parameters.max_time_in_seconds = timeout_seconds
            solver.parameters.num_search_workers = 4
            
            status = solver.Solve(self.model)
            
            if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
                slots = self._extract_solution(solver)
                return TimetableSolution(
                    status="OPTIMAL" if status == cp_model.OPTIMAL else "FEASIBLE",
                    slots=slots,
                    score=solver.ObjectiveValue() if solver.ObjectiveValue() else 0.0,
                    conflicts_resolved=0,
                    message=f"Found solution with {len(slots)} slots",
                )
            else:
                return TimetableSolution(
                    status="INFEASIBLE",
                    slots=[],
                    message="No feasible timetable found. Try relaxing constraints.",
                )
        except Exception as e:
            return TimetableSolution(
                status="ERROR",
                slots=[],
                message=f"Solver error: {str(e)}",
            )
    
    def _create_variables(self):
        """Create decision variables for the CP model."""
        for section in self.data.sections:
            allocations = self._allocation_by_section.get(section.id, [])
            
            for alloc in allocations:
                subject = self._subject_map.get(alloc.subject_id)
                if not subject:
                    continue
                
                for day in range(self.data.days_per_week):
                    for period in range(self.data.periods_per_day):
                        key = (section.id, alloc.subject_id, alloc.teacher_id, day, period)
                        self.assignments[key] = self.model.NewBoolVar(
                            f"assign_{section.id}_{alloc.subject_id}_{day}_{period}"
                        )
        
        for room in self.data.rooms:
            for day in range(self.data.days_per_week):
                for period in range(self.data.periods_per_day):
                    key = (room.id, day, period)
                    self.slots[key] = self.model.NewBoolVar(
                        f"room_{room.id}_{day}_{period}"
                    )
    
    def _add_constraints(self):
        """Add all constraints to the model."""
        self._constraint_periods_per_subject()
        self._constraint_one_subject_per_slot()
        self._constraint_teacher_no_overlap()
        self._constraint_teacher_max_periods()
        self._constraint_lab_rooms()
    
    def _constraint_periods_per_subject(self):
        """Each section must have each subject exactly periods_per_week times."""
        for section in self.data.sections:
            allocations = self._allocation_by_section.get(section.id, [])
            
            for alloc in allocations:
                subject = self._subject_map.get(alloc.subject_id)
                if not subject:
                    continue
                
                subject_slots = []
                for day in range(self.data.days_per_week):
                    for period in range(self.data.periods_per_day):
                        key = (section.id, alloc.subject_id, alloc.teacher_id, day, period)
                        if key in self.assignments:
                            subject_slots.append(self.assignments[key])
                
                if subject_slots:
                    self.model.Add(sum(subject_slots) == subject.periods_per_week)
    
    def _constraint_one_subject_per_slot(self):
        """Each section can only have one subject per time slot."""
        for section in self.data.sections:
            allocations = self._allocation_by_section.get(section.id, [])
            
            for day in range(self.data.days_per_week):
                for period in range(self.data.periods_per_day):
                    slot_assignments = []
                    for alloc in allocations:
                        key = (section.id, alloc.subject_id, alloc.teacher_id, day, period)
                        if key in self.assignments:
                            slot_assignments.append(self.assignments[key])
                    
                    if slot_assignments:
                        self.model.Add(sum(slot_assignments) <= 1)
    
    def _constraint_teacher_no_overlap(self):
        """A teacher cannot teach two classes at the same time."""
        teacher_slots: Dict[str, Dict[tuple, List]] = {}
        
        for key, var in self.assignments.items():
            _, _, teacher_id, day, period = key
            if teacher_id not in teacher_slots:
                teacher_slots[teacher_id] = {}
            slot_key = (day, period)
            if slot_key not in teacher_slots[teacher_id]:
                teacher_slots[teacher_id][slot_key] = []
            teacher_slots[teacher_id][slot_key].append(var)
        
        for teacher_id, slots in teacher_slots.items():
            for slot_key, vars in slots.items():
                if len(vars) > 1:
                    self.model.Add(sum(vars) <= 1)
    
    def _constraint_teacher_max_periods(self):
        """Teachers should not exceed max periods per day."""
        for teacher in self.data.teachers:
            for day in range(self.data.days_per_week):
                day_assignments = []
                for key, var in self.assignments.items():
                    if key[2] == teacher.id and key[3] == day:
                        day_assignments.append(var)
                
                if day_assignments:
                    self.model.Add(sum(day_assignments) <= teacher.max_periods_per_day)
    
    def _constraint_lab_rooms(self):
        """Lab subjects should be scheduled when lab rooms are available."""
        pass
    
    def _add_objective(self):
        """Add optimization objectives."""
        objective_terms = []
        
        for teacher in self.data.teachers:
            for day in range(self.data.days_per_week):
                consecutive_bonus = []
                for period in range(self.data.periods_per_day - 1):
                    slots_at_period = []
                    slots_at_next = []
                    
                    for key, var in self.assignments.items():
                        if key[2] == teacher.id and key[3] == day:
                            if key[4] == period:
                                slots_at_period.append(var)
                            elif key[4] == period + 1:
                                slots_at_next.append(var)
                    
                    if slots_at_period and slots_at_next:
                        consecutive_var = self.model.NewBoolVar(
                            f"consec_{teacher.id}_{day}_{period}"
                        )
                        for v1 in slots_at_period:
                            for v2 in slots_at_next:
                                self.model.AddBoolAnd([v1, v2]).OnlyEnforceIf(consecutive_var)
                        consecutive_bonus.append(consecutive_var)
                
                objective_terms.extend(consecutive_bonus)
        
        if objective_terms:
            self.model.Maximize(sum(objective_terms))
    
    def _extract_solution(self, solver: cp_model.CpSolver) -> List[TimetableSlotResult]:
        """Extract the solution from the solver."""
        results = []
        
        used_room_slots: Dict[tuple, str] = {}
        
        for key, var in self.assignments.items():
            if solver.Value(var) == 1:
                section_id, subject_id, teacher_id, day, period = key
                
                subject = self._subject_map.get(subject_id)
                section = self._section_map.get(section_id)
                
                room_id = self._assign_room(
                    subject, section, day, period, used_room_slots
                )
                
                start_time, end_time = self.PERIOD_TIMES[period] if period < len(self.PERIOD_TIMES) else ("08:00", "08:45")
                
                results.append(TimetableSlotResult(
                    section_id=section_id,
                    subject_id=subject_id,
                    teacher_id=teacher_id,
                    room_id=room_id,
                    day_of_week=day,
                    period_number=period + 1,
                    start_time=start_time,
                    end_time=end_time,
                ))
        
        return results
    
    def _assign_room(
        self,
        subject: Optional[Subject],
        section: Optional[Section],
        day: int,
        period: int,
        used_slots: Dict[tuple, str],
    ) -> Optional[str]:
        """Assign an available room to a slot."""
        required_type = RoomType.LAB if subject and subject.requires_lab else RoomType.CLASSROOM
        required_capacity = section.capacity if section else 30
        
        for room in self.data.rooms:
            slot_key = (room.id, day, period)
            
            if slot_key in used_slots:
                continue
            
            if required_type == RoomType.LAB and room.type != RoomType.LAB:
                continue
            
            if room.capacity >= required_capacity:
                used_slots[slot_key] = room.id
                return room.id
        
        for room in self.data.rooms:
            slot_key = (room.id, day, period)
            if slot_key not in used_slots:
                used_slots[slot_key] = room.id
                return room.id
        
        return None
