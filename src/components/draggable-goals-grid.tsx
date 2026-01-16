"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  defaultDropAnimationSideEffects,
  type DropAnimation,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable"
import { restrictToParentElement } from "@dnd-kit/modifiers"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"
import { toast } from "sonner"
import { updateGoalOrderAction } from "@/app/actions/goals"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CheckInButton } from "@/components/check-in-button"

interface GoalGridData {
  goal: {
    id: string
    name: string
    cadenceType: "DAILY" | "WEEKLY"
    weeklyTarget: number | null
  }
  todayDone: boolean
  todayPartial: boolean
  todayCount: number
  dailyTarget: number
  weekCheckIns: number
  weekTarget: number
  weekProgress: number
  consistency: number
  gracefulStreak: {
    currentStreak: number
    isAtRisk: boolean
  }
}

// Custom drop animation
const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: "0.5",
      },
    },
  }),
}

// Static card content - shared between sortable and overlay
function GoalCardContent({ 
  data, 
  isDragging = false,
  isOverlay = false,
}: { 
  data: GoalGridData
  isDragging?: boolean
  isOverlay?: boolean
}) {
  const { goal, todayDone, todayPartial, todayCount, dailyTarget, weekCheckIns, weekTarget, weekProgress, consistency, gracefulStreak } = data

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-5 transition-shadow h-full",
        todayDone && !todayPartial ? "border-emerald-500/30 bg-emerald-500/5" : "",
        isDragging && "opacity-50",
        isOverlay && "shadow-2xl ring-2 ring-primary/20 cursor-grabbing"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className={cn(
              "cursor-grab active:cursor-grabbing touch-none shrink-0",
              isOverlay ? "cursor-grabbing" : ""
            )}>
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                todayDone 
                  ? todayPartial 
                    ? "bg-amber-500" 
                    : "bg-emerald-500" 
                  : "border-2 border-muted-foreground/30"
              }`}
            />
            <Link
              href={`/goals/${goal.id}`}
              className="font-semibold truncate hover:underline"
              onClick={(e) => isOverlay && e.preventDefault()}
            >
              {goal.name}
            </Link>
            <Badge variant="secondary" className="shrink-0 text-[10px] px-1.5 py-0">
              {consistency}%
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground pl-6">
            <span>
              {goal.cadenceType === "DAILY"
                ? "Daily"
                : `${goal.weeklyTarget}x/week`}
            </span>
            <span>•</span>
            <span>{gracefulStreak.currentStreak}d streak</span>
            {gracefulStreak.isAtRisk && (
              <span className="text-amber-500">• At risk</span>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>This week</span>
          <span className="font-medium">{weekCheckIns}/{weekTarget}</span>
        </div>
        <Progress value={weekProgress} className="h-1.5" />
      </div>

      {!isOverlay && (
        <div className="mt-4">
          <CheckInButton
            goalId={goal.id}
            completed={todayDone}
            todayCount={todayCount}
            dailyTarget={dailyTarget}
          />
        </div>
      )}
    </div>
  )
}

function SortableGoalCard({ data }: { data: GoalGridData }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: data.goal.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? "transform 200ms cubic-bezier(0.25, 1, 0.5, 1)",
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="touch-none h-full"
    >
      <GoalCardContent data={data} isDragging={isDragging} />
    </div>
  )
}

interface DraggableGoalsGridProps {
  goals: GoalGridData[]
}

export function DraggableGoalsGrid({ goals }: DraggableGoalsGridProps) {
  const [items, setItems] = useState(goals)
  const [activeId, setActiveId] = useState<string | null>(null)

  // Sync state when props change (e.g., after server revalidation)
  useEffect(() => {
    setItems(goals)
  }, [goals])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex(item => item.goal.id === active.id)
      const newIndex = items.findIndex(item => item.goal.id === over.id)
      const newItems = arrayMove(items, oldIndex, newIndex)
      
      setItems(newItems)
      
      const result = await updateGoalOrderAction(newItems.map(item => item.goal.id))
      
      if (!result.ok) {
        setItems(items)
        toast.error(result.error ?? "Could not save order")
      }
    }
  }

  const handleDragCancel = () => {
    setActiveId(null)
  }

  const activeItem = activeId ? items.find(item => item.goal.id === activeId) : null

  if (items.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed bg-muted/30 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No goals yet. Create one above to start tracking.
        </p>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      modifiers={[restrictToParentElement]}
    >
      <SortableContext 
        items={items.map(item => item.goal.id)} 
        strategy={rectSortingStrategy}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((data) => (
            <SortableGoalCard key={data.goal.id} data={data} />
          ))}
        </div>
      </SortableContext>
      
      <DragOverlay dropAnimation={dropAnimation}>
        {activeItem ? (
          <div className="w-full max-w-md">
            <GoalCardContent data={activeItem} isOverlay />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
